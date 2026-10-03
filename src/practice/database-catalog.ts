import { createServerSupabaseClient } from "@/lib/supabase/server";
import { lessonSchema, type PracticeLesson, type PracticeLocale } from "./types";
import { COMPLETE_DENTURE_R4_LESSONS } from "./complete-denture-r4-lessons";
import { PARTIAL_DENTURE_R5_LESSONS } from "./partial-denture-r5-lessons";
import { DENTAL_REALISM_R6_LESSONS } from "./dental-realism-r6-lessons";
import { IMPLANT_R7_LESSONS } from "./implant-r7-lessons";
import { mapSerbianFields, normalizeR3SerbianCopy } from "@/lib/dental-language";

type CatalogOptions = { includeDrafts?: boolean };

export function normalizeR3PracticeLessonCopy(lesson: PracticeLesson): PracticeLesson {
  if (!lesson.caseSetup.casePackageId?.startsWith("r3-")) return lesson;
  const localized = mapSerbianFields(lesson, normalizeR3SerbianCopy);
  if (localized.id === "full_crown_case") {
    localized.caseSetup = { ...localized.caseSetup, checkpointId: "insertion_path" };
  }
  if (localized.id === "bridge_full_case") {
    localized.title = { en: "Complete Bridge Case · teeth 24–26", sr: "Kompletan slučaj mosta · zubi 24–26" };
  }
  return localized;
}

export function mergeLocalPracticeLessons(databaseLessons: readonly PracticeLesson[]): PracticeLesson[] {
  const lessonsById = new Map(databaseLessons.filter((lesson) => lesson.caseSetup.source !== "partial-denture-case" && lesson.caseSetup.source !== "implant-case").map((lesson) => [lesson.id, lesson]));
  for (const lesson of COMPLETE_DENTURE_R4_LESSONS) lessonsById.set(lesson.id, lessonSchema.parse(lesson));
  for (const lesson of PARTIAL_DENTURE_R5_LESSONS) lessonsById.set(lesson.id, lessonSchema.parse(lesson));
  for (const lesson of DENTAL_REALISM_R6_LESSONS) lessonsById.set(lesson.id, lessonSchema.parse(lesson));
  for (const lesson of IMPLANT_R7_LESSONS) lessonsById.set(lesson.id, lessonSchema.parse(lesson));
  return [...lessonsById.values()];
}

function localizedPrerequisites(value: unknown): { en: string; sr: string }[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const item = entry as Record<string, unknown>;
    return typeof item.en === "string" && typeof item.sr === "string" ? [{ en: item.en, sr: item.sr }] : [];
  });
}

export async function loadPracticeCatalog({ includeDrafts = false }: CatalogOptions = {}) {
  const supabase = await createServerSupabaseClient();
  let query = supabase.from("practice_lessons").select("*").order("sort_order");
  if (!includeDrafts) query = query.eq("status", "published");
  const { data: rows, error } = await query;
  if (error) throw new Error(`Practice catalog could not be loaded: ${error.message}`);
  const lessonRows = rows ?? [];
  if (lessonRows.length === 0) return mergeLocalPracticeLessons([]);

  // Load each relationship in batches. The former per-lesson and per-step
  // queries made the page wait on hundreds of sequential network round trips.
  const lessonIds = lessonRows.map((row) => row.id);
  const moduleIds = [...new Set(lessonRows.map((row) => row.module_id))];
  const [moduleResult, stepResult, assetResult] = await Promise.all([
    supabase.from("practice_modules").select("*").in("id", moduleIds),
    supabase.from("practice_steps").select("*").in("lesson_id", lessonIds).order("sort_order"),
    supabase.from("practice_lesson_assets").select("asset_id, lesson_id, object_role, is_reference, sort_order, assets(id, original_filename, bucket_id, object_path, status, model_assets(source_unit))").in("lesson_id", lessonIds).order("sort_order"),
  ]);
  if (stepResult.error) throw new Error(`Practice lesson steps could not be loaded: ${stepResult.error.message}`);

  const stepRows = stepResult.data ?? [];
  const stepIds = stepRows.map((step) => step.id);
  const [hintResult, toolResult, validationResult] = stepIds.length > 0 ? await Promise.all([
    supabase.from("practice_hints").select("*").in("step_id", stepIds).order("sort_order"),
    supabase.from("practice_step_tools").select("step_id, tool_id").in("step_id", stepIds),
    supabase.from("practice_step_validations").select("step_id, validation_config_id, sort_order").in("step_id", stepIds).order("sort_order"),
  ]) : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }];
  const configIds = [...new Set((validationResult.data ?? []).map((link) => link.validation_config_id))];
  const configResult = configIds.length > 0
    ? await supabase.from("validation_configs").select("id, config").in("id", configIds)
    : { data: [], error: null };

  const modulesById = new Map((moduleResult.data ?? []).map((module) => [module.id, module]));
  const stepsByLesson = new Map<string, typeof stepRows>();
  for (const step of stepRows) stepsByLesson.set(step.lesson_id, [...(stepsByLesson.get(step.lesson_id) ?? []), step]);
  const assetsByLesson = new Map<string, NonNullable<typeof assetResult.data>>();
  for (const asset of assetResult.data ?? []) assetsByLesson.set(asset.lesson_id, [...(assetsByLesson.get(asset.lesson_id) ?? []), asset]);
  const hintsByStep = new Map<string, NonNullable<typeof hintResult.data>>();
  for (const hint of hintResult.data ?? []) hintsByStep.set(hint.step_id, [...(hintsByStep.get(hint.step_id) ?? []), hint]);
  const toolsByStep = new Map<string, NonNullable<typeof toolResult.data>>();
  for (const tool of toolResult.data ?? []) toolsByStep.set(tool.step_id, [...(toolsByStep.get(tool.step_id) ?? []), tool]);
  const validationsByStep = new Map<string, NonNullable<typeof validationResult.data>>();
  for (const validation of validationResult.data ?? []) validationsByStep.set(validation.step_id, [...(validationsByStep.get(validation.step_id) ?? []), validation]);
  const configsById = new Map((configResult.data ?? []).map((config) => [config.id, config.config]));
  const relationshipError = hintResult.error || toolResult.error || validationResult.error;
  const lessons: PracticeLesson[] = [];

  for (const row of lessonRows) {
    const steps = [];
    for (const step of stepsByLesson.get(row.id) ?? []) {
      if (relationshipError) continue;
      const validations = (validationsByStep.get(step.id) ?? []).flatMap((linked) => {
        const config = configsById.get(linked.validation_config_id);
        return config && typeof config === "object" ? [config] : [];
      });
      const modes = step.reference_modes.filter((mode): mode is "off" | "outline" | "transparent" | "full" => ["off", "outline", "transparent", "full"].includes(mode));
      const reference = step.reference_config && typeof step.reference_config === "object" ? step.reference_config as Record<string, unknown> : null;
      const example = step.example_config && typeof step.example_config === "object" ? step.example_config as Record<string, unknown> : null;
      steps.push({
        id: step.slug, order: step.sort_order,
        title: { en: step.title_en, sr: step.title_sr },
        instructions: { en: step.instructions_en, sr: step.instructions_sr },
        theory: step.theory_en || step.theory_sr ? { en: step.theory_en ?? "", sr: step.theory_sr ?? "" } : undefined,
        allowedTools: (toolsByStep.get(step.id) ?? []).map(({ tool_id }) => tool_id === "mesh_edit" ? "mesh-edit" : tool_id).filter((tool): tool is "select" | "move" | "rotate" | "scale" | "sculpt" | "mesh-edit" | "analysis" | "articulator" | "camera" | "scene" => ["select", "move", "rotate", "scale", "sculpt", "mesh-edit", "analysis", "articulator", "camera", "scene"].includes(tool)),
        targetObjectIds: step.target_object_ids,
        hints: (hintsByStep.get(step.id) ?? []).map((hint) => ({ id: hint.slug, title: { en: hint.title_en, sr: hint.title_sr }, body: { en: hint.body_en, sr: hint.body_sr } })),
        referenceModes: modes,
        reference: reference && typeof reference.objectId === "string" && Array.isArray(reference.position) && reference.position.length === 3 ? { objectId: reference.objectId, position: reference.position as [number, number, number] } : undefined,
        example: example && typeof example.label_en === "string" && typeof example.label_sr === "string" && ["outline", "transparent", "full"].includes(String(example.mode)) ? { label: { en: example.label_en, sr: example.label_sr }, mode: example.mode as "outline" | "transparent" | "full" } : undefined,
        validators: validations,
        required: step.required,
      });
    }
    const caseSetup = row.case_setup && typeof row.case_setup === "object" && !Array.isArray(row.case_setup) ? row.case_setup : { source: "shared-demo-workspace", objectMappings: [] };
    const assets = (assetsByLesson.get(row.id) ?? []).flatMap((link) => {
      const asset = Array.isArray(link.assets) ? link.assets[0] : link.assets;
      const nestedModels = asset && "model_assets" in asset ? asset.model_assets : null;
      const model = Array.isArray(nestedModels) ? nestedModels[0] : nestedModels;
      if (!asset || asset.status !== "ready") return [];
      return [{ assetId: link.asset_id, runtimeObjectId: link.asset_id, semanticRole: link.object_role, required: true, isReference: link.is_reference, name: asset.original_filename ?? link.asset_id, bucket: asset.bucket_id, path: asset.object_path, unit: model?.source_unit ?? "unknown" }];
    });
    const candidate = {
      id: row.slug,
      databaseId: row.id,
      moduleId: modulesById.get(row.module_id)?.slug ?? row.module_id,
      title: { en: row.title_en, sr: row.title_sr },
      summary: { en: row.summary_en, sr: row.summary_sr },
      goal: { en: row.goal_en, sr: row.goal_sr },
      difficulty: row.difficulty,
      recommendedPrerequisites: localizedPrerequisites(row.recommended_prerequisites),
      estimatedMinutes: row.estimated_minutes,
      assets,
      caseSetup: assets.length && !caseSetup.casePackageId && !caseSetup.packageManifest ? { source: "lesson-assets", objectMappings: assets.map((asset) => ({ runtimeObjectId: asset.runtimeObjectId, semanticRole: asset.semanticRole, editable: !asset.isReference })) } : caseSetup,
      steps,
    };
    const parsed = lessonSchema.safeParse(candidate);
    if (parsed.success) {
      lessons.push(normalizeR3PracticeLessonCopy(parsed.data));
    }
  }
  return mergeLocalPracticeLessons(lessons);
}

export async function loadPracticeLessonBySlug(slug: string, locale: PracticeLocale = "en", includeDrafts = false) {
  void locale;
  const lessons = await loadPracticeCatalog({ includeDrafts });
  return lessons.find((lesson) => lesson.id === slug) ?? null;
}
