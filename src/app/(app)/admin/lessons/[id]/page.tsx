import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireAdminUser } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AdminHeading, AdminNav } from "../../admin-nav";
import { LessonEditor } from "../lesson-editor";

export default async function AdminLessonEditorPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminUser();
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: lesson, error } = await supabase.from("practice_lessons").select("*").eq("id", id).maybeSingle();
  if (error || !lesson) notFound();
  const [moduleRow, stepRows, modules, toolRows, assetLinks, platformAssets, modelRows] = await Promise.all([
    supabase.from("practice_modules").select("*").eq("id", lesson.module_id).maybeSingle(),
    supabase.from("practice_steps").select("*").eq("lesson_id", lesson.id).order("sort_order"),
    supabase.from("practice_modules").select("id, slug, title_en, title_sr").order("sort_order"),
    supabase.from("tool_definitions").select("id, label_en, label_sr").eq("status", "published").order("category"),
    supabase.from("practice_lesson_assets").select("asset_id, object_role, is_reference").eq("lesson_id", lesson.id),
    supabase.from("assets").select("id, original_filename, status").eq("scope", "platform").eq("kind", "model").eq("status", "ready"),
    supabase.from("model_assets").select("asset_id, default_role, technical_metadata"),
  ]);
  const steps = [];
  for (const row of stepRows.data ?? []) {
    const [hints, allowedTools, links] = await Promise.all([
      supabase.from("practice_hints").select("*").eq("step_id", row.id).order("sort_order"),
      supabase.from("practice_step_tools").select("tool_id").eq("step_id", row.id),
      supabase.from("practice_step_validations").select("validation_config_id").eq("step_id", row.id).order("sort_order"),
    ]);
    let validator = null;
    if (links.data?.[0]) {
      const { data: config } = await supabase.from("validation_configs").select("config").eq("id", links.data[0].validation_config_id).maybeSingle();
      if (config?.config && typeof config.config === "object" && "type" in config.config && ["transform_range", "required_object", "required_step", "margin_complete", "analysis_target", "denture_setup", "restorative_setup", "implant_check"].includes(String(config.config.type))) validator = config.config as never;
    }
    const reference = row.reference_config && typeof row.reference_config === "object" ? row.reference_config as Record<string, unknown> : {};
    const example = row.example_config && typeof row.example_config === "object" ? row.example_config as Record<string, unknown> : {};
    steps.push({ id: row.id, slug: row.slug, title: { en: row.title_en, sr: row.title_sr }, instructions: { en: row.instructions_en, sr: row.instructions_sr }, theory: { en: row.theory_en ?? "", sr: row.theory_sr ?? "" }, targets: row.target_object_ids, tools: (allowedTools.data ?? []).map((item) => item.tool_id), referenceModes: row.reference_modes, referenceObjectId: typeof reference.objectId === "string" ? reference.objectId : "", referencePosition: Array.isArray(reference.position) && reference.position.length === 3 ? reference.position as [number, number, number] : [0, 0, 0] as [number, number, number], exampleMode: typeof example.mode === "string" ? example.mode : "off", exampleLabel: { en: typeof example.label_en === "string" ? example.label_en : "", sr: typeof example.label_sr === "string" ? example.label_sr : "" }, required: row.required, hints: (hints.data ?? []).map((item) => ({ id: item.id, slug: item.slug, title: { en: item.title_en, sr: item.title_sr }, body: { en: item.body_en, sr: item.body_sr } })), validator });
  }
  const caseSetup = lesson.case_setup && typeof lesson.case_setup === "object" ? lesson.case_setup as { source?: string; restorationType?: string; objectMappings?: { runtimeObjectId: string; semanticRole: string; editable: boolean }[] } : {};
  const setupSources = ["shared-demo-workspace", "lesson-assets", "crown-case", "denture-case", "restorative-case", "partial-denture-case", "bite-splint-case", "digital-model-case", "articulator-case", "implant-case"] as const;
  const source = setupSources.find((entry) => entry === caseSetup.source) ?? "shared-demo-workspace";
  const initial = { id: lesson.id, updatedAt: lesson.updated_at, moduleId: lesson.module_id, moduleSlug: moduleRow.data?.slug ?? "module", moduleTitle: { en: moduleRow.data?.title_en ?? "", sr: moduleRow.data?.title_sr ?? "" }, moduleSummary: { en: moduleRow.data?.summary_en ?? "", sr: moduleRow.data?.summary_sr ?? "" }, slug: lesson.slug, difficulty: lesson.difficulty, title: { en: lesson.title_en, sr: lesson.title_sr }, summary: { en: lesson.summary_en, sr: lesson.summary_sr }, goal: { en: lesson.goal_en, sr: lesson.goal_sr }, minutes: lesson.estimated_minutes, caseSetup: { source: source as typeof setupSources[number], restorationType: ["crown", "bridge", "inlay", "onlay", "veneer"].includes(String(caseSetup.restorationType)) ? caseSetup.restorationType as "crown" | "bridge" | "inlay" | "onlay" | "veneer" : undefined, objectMappings: caseSetup.objectMappings ?? [] }, assets: (assetLinks.data ?? []).map((link) => ({ assetId: link.asset_id, role: link.object_role, isReference: link.is_reference })), steps };
  const modelMap = new Map((modelRows.data ?? []).map((row) => [row.asset_id, row]));
  const assets = (platformAssets.data ?? []).map((asset) => { const model = modelMap.get(asset.id); const metadata = model?.technical_metadata && typeof model.technical_metadata === "object" ? model.technical_metadata as Record<string, unknown> : {}; return { id: asset.id, name: typeof metadata.displayName === "string" ? metadata.displayName : asset.original_filename ?? asset.id, role: model?.default_role ?? "other" }; });
  return <AppShell active="Admin"><AdminHeading eyebrow="PRACTICE CONTENT" title={lesson.title_en || "Untitled lesson"} description={`Edit ${lesson.slug} · updated ${new Date(lesson.updated_at).toLocaleString()}`} /><AdminNav/><LessonEditor initial={initial} modules={modules.data ?? []} tools={toolRows.data ?? []} assets={assets} status={lesson.status}/></AppShell>;
}
