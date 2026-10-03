"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdminUser } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";

const id = z.string().uuid();
const difficulty = z.enum(["foundation", "beginner", "intermediate", "advanced"]);
const localized = z.object({ en: z.string().trim().min(1), sr: z.string().trim().min(1) });
const toolIds = z.enum(["select", "move", "rotate", "scale", "sculpt", "mesh_edit", "analysis", "camera", "scene"]);
const transformValidator = z.object({
  type: z.literal("transform_range"), objectId: z.string().min(1),
  field: z.enum(["position", "rotation", "scale"]).optional(),
  position: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]),
  axes: z.array(z.enum(["x", "y", "z"])).min(1), toleranceMm: z.number().positive().max(100),
});
const validator = z.discriminatedUnion("type", [
  transformValidator,
  z.object({ type: z.literal("required_object"), objectId: z.string().min(1), visible: z.boolean().optional(), selected: z.boolean().optional(), minOpacity: z.number().min(0.15).max(1).optional(), maxOpacity: z.number().min(0.15).max(1).optional(), minGeometryRevision: z.number().int().nonnegative().optional() }),
  z.object({ type: z.literal("required_step"), message: localized.optional() }),
  z.object({ type: z.literal("margin_complete"), objectId: z.string().min(1) }),
  z.object({ type: z.literal("denture_setup"), check: z.enum(["model_analysis", "tooth_setup", "chain_mode", "boundary", "base", "complete_case"]), arch: z.enum(["upper", "lower"]).optional(), segment: z.enum(["anterior", "posterior"]).optional() }),
  z.object({ type: z.literal("restorative_setup"), check: z.enum(["bridge_design", "single_unit_design", "veneer_position"]), restorationType: z.enum(["crown", "bridge", "inlay", "onlay", "veneer"]).optional() }),
  z.object({ type: z.literal("analysis_target"), kind: z.enum(["contact", "thickness", "undercut", "deviation"]), objectIds: z.array(z.string().min(1)).min(1).max(2), minValue: z.number().positive().optional(), maxValue: z.number().positive().optional() }),
  z.object({ type: z.literal("implant_check"), check: z.enum(["fixture", "depth", "axis", "distance", "relationships"]), objectId: z.string().min(1).optional(), targetMm: z.number().nonnegative().optional(), tolerance: z.number().nonnegative().optional() }),
]);
const hint = z.object({ id: z.string().uuid(), slug: z.string().regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/), title: localized, body: localized });
const step = z.object({
  id: z.string().uuid(), slug: z.string().regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/), title: localized,
  instructions: localized, theory: localized, targets: z.array(z.string().min(1)).min(1),
  tools: z.array(toolIds).min(1), referenceModes: z.array(z.enum(["off", "outline", "transparent", "full"])).min(1),
  referenceObjectId: z.string().optional(), referencePosition: z.tuple([z.number(), z.number(), z.number()]),
  exampleMode: z.enum(["off", "outline", "transparent", "full"]), exampleLabel: localized,
  required: z.boolean(), hints: z.array(hint), validator: validator.nullable(),
});
const lessonAsset = z.object({ assetId: id, role: z.string(), isReference: z.boolean() });
const lessonPayload = z.object({
  id: id.optional(), updatedAt: z.string().optional(), moduleId: id.optional(), moduleSlug: z.string().regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/),
  moduleTitle: localized, moduleSummary: localized, title: localized, summary: localized, goal: localized,
  caseSetup: z.object({ source: z.enum(["shared-demo-workspace", "lesson-assets", "crown-case", "denture-case", "restorative-case", "partial-denture-case", "bite-splint-case", "digital-model-case", "articulator-case", "implant-case"]), restorationType: z.enum(["crown", "bridge", "inlay", "onlay", "veneer"]).optional(), objectMappings: z.array(z.object({ runtimeObjectId: z.string(), semanticRole: z.string(), editable: z.boolean() })) }),
  assets: z.array(lessonAsset),
  slug: z.string().regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/), difficulty, minutes: z.number().int().min(1).max(600), steps: z.array(step),
});
const scenarioPayload = z.object({
  id: id.optional(), updatedAt: z.string().optional(), domainId: id, slug: z.string().regex(/^[a-z0-9]+(?:_[a-z0-9]+)*$/),
  caseInitializer: z.enum(["implant", "articulator"]).optional(),
  restorationType: z.enum(["crown", "bridge", "inlay", "onlay", "veneer"]).optional(),
  title: localized, description: localized, difficulty, patientCode: z.string(), age: z.number().int().min(0).max(120).nullable(),
  indication: localized, toothNumbers: z.array(z.number().int().min(1).max(99)), material: localized,
  requirements: z.object({ en: z.array(z.string().min(1)), sr: z.array(z.string().min(1)) }), notes: localized,
  supplied: z.object({ en: z.array(z.string()), sr: z.array(z.string()) }), randomEligible: z.boolean(), assets: z.array(z.object({ assetId: id, role: z.string(), required: z.boolean() })),
});

function decode<T>(formData: FormData, key: string, schema: z.ZodType<T>): T {
  const raw = formData.get(key);
  if (typeof raw !== "string") throw new Error("The submitted editor data is missing.");
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error("The submitted editor data is invalid."); }
  const result = schema.safeParse(parsed);
  if (!result.success) throw new Error(result.error.issues[0]?.message ?? "Check the content fields and try again.");
  return result.data;
}

async function audit(supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>, action: "create" | "update", type: "practice_lesson" | "scenario", entityId: string) {
  const { error } = await supabase.rpc("record_admin_content_audit", { p_action: action, p_entity_type: type, p_entity_id: entityId, p_metadata: {} });
  if (error) console.error("Admin content audit write failed.", error.message);
}

export async function saveLessonContent(_previous: { error?: string; id?: string; savedAt?: number }, formData: FormData) {
  await requireAdminUser();
  const value = decode(formData, "content", lessonPayload);
  const supabase = await createServerSupabaseClient();
  const { data: lessonId, error } = await supabase.rpc("save_admin_lesson", { p_payload: value });
  if (error) return { error: error.code === "40001" ? "This lesson changed after you opened it. Reload the editor before saving." : "Unable to save this content." };
  await audit(supabase, value.id ? "update" : "create", "practice_lesson", lessonId);
  revalidatePath("/admin"); revalidatePath("/admin/lessons"); revalidatePath(`/admin/lessons/${lessonId}`); revalidatePath("/practice");
  return { id: lessonId, savedAt: Date.now() };
}

export async function publishLesson(_previous: { error?: string }, formData: FormData) {
  await requireAdminUser();
  const lessonId = z.string().uuid().parse(formData.get("id"));
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("publish_practice_lesson", { p_lesson_id: lessonId });
  if (error) return { error: "Unable to publish this content." };
  revalidatePath("/practice"); revalidatePath("/admin"); revalidatePath("/admin/lessons"); revalidatePath(`/admin/lessons/${lessonId}`);
  return {};
}

export async function unpublishLesson(_previous: { error?: string }, formData: FormData) {
  await requireAdminUser();
  const lessonId = z.string().uuid().parse(formData.get("id"));
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("practice_lessons").update({ status: "draft" }).eq("id", lessonId);
  if (error) return { error: "Unable to update publication status." };
  await audit(supabase, "update", "practice_lesson", lessonId);
  revalidatePath("/practice"); revalidatePath("/admin/lessons"); revalidatePath(`/admin/lessons/${lessonId}`);
  return {};
}

export async function saveScenarioContent(_previous: { error?: string; id?: string; savedAt?: number }, formData: FormData) {
  await requireAdminUser();
  const value = decode(formData, "content", scenarioPayload);
  const supabase = await createServerSupabaseClient();
  const { data: scenarioId, error } = await supabase.rpc("save_admin_scenario", { p_payload: value });
  if (error) return { error: error.code === "40001" ? "This scenario changed after you opened it. Reload the editor before saving." : "Unable to save this content." };
  await audit(supabase, value.id ? "update" : "create", "scenario", scenarioId);
  revalidatePath("/admin"); revalidatePath("/admin/scenarios"); revalidatePath(`/admin/scenarios/${scenarioId}`); revalidatePath("/free-lab");
  return { id: scenarioId, savedAt: Date.now() };
}

export async function publishScenario(_previous: { error?: string }, formData: FormData) {
  await requireAdminUser();
  const scenarioId = z.string().uuid().parse(formData.get("id"));
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.rpc("publish_scenario", { p_scenario_id: scenarioId });
  if (error) return { error: "Unable to publish this content." };
  revalidatePath("/free-lab"); revalidatePath("/admin"); revalidatePath("/admin/scenarios"); revalidatePath(`/admin/scenarios/${scenarioId}`);
  return {};
}

export async function unpublishScenario(_previous: { error?: string }, formData: FormData) {
  await requireAdminUser();
  const scenarioId = z.string().uuid().parse(formData.get("id"));
  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("scenarios").update({ status: "draft", published_at: null }).eq("id", scenarioId);
  if (error) return { error: "Unable to update publication status." };
  await audit(supabase, "update", "scenario", scenarioId);
  revalidatePath("/free-lab"); revalidatePath("/admin/scenarios"); revalidatePath(`/admin/scenarios/${scenarioId}`);
  return {};
}
