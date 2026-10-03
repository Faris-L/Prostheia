import { z } from "zod";
import { RESTORATION_TYPES } from "@/cad/restorative/types";
import { KENNEDY_CLASSES } from "@/cad/partial-denture/types";
import { casePackageManifestSchema } from "@/cad/case-packages/contract";

export type PracticeDifficulty = "foundation" | "beginner" | "intermediate" | "advanced";
export type PracticeLocale = "en" | "sr";
export const PRACTICE_TOOL_IDS = ["select", "move", "rotate", "scale", "sculpt", "mesh-edit", "analysis", "articulator", "camera", "scene"] as const;
export type PracticeToolId = (typeof PRACTICE_TOOL_IDS)[number];
export type ReferenceMode = "off" | "outline" | "transparent" | "full";
export type LocalizedText = { en: string; sr: string };

const localizedTextSchema = z.object({ en: z.string().min(1), sr: z.string().min(1) });
export const validatorConfigSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("transform_range"), objectId: z.string().min(1), field: z.enum(["position", "rotation", "scale"]).optional(), position: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]), toleranceMm: z.number().positive().max(100), axes: z.array(z.enum(["x", "y", "z"])).min(1) }),
  z.object({ type: z.literal("required_object"), objectId: z.string().min(1), visible: z.boolean().optional(), selected: z.boolean().optional(), minOpacity: z.number().min(0.15).max(1).optional(), maxOpacity: z.number().min(0.15).max(1).optional(), minGeometryRevision: z.number().int().nonnegative().optional() }),
  z.object({ type: z.literal("required_step"), message: localizedTextSchema.optional() }),
  z.object({ type: z.literal("geometry_statistics"), objectId: z.string().min(1), minVertices: z.number().int().positive().optional(), minTriangles: z.number().int().positive().optional() }),
  z.object({ type: z.literal("margin_complete"), objectId: z.string().min(1) }),
  z.object({ type: z.literal("curve_closed"), objectId: z.string().min(1), curveId: z.string().min(1), curveKind: z.enum(["margin", "boundary", "splint_boundary", "model_trim_boundary"]) }),
  z.object({ type: z.literal("denture_setup"), check: z.enum(["model_analysis", "tooth_setup", "chain_mode", "boundary", "base", "complete_case"]), arch: z.enum(["upper", "lower"]).optional(), segment: z.enum(["anterior", "posterior"]).optional() }),
  z.object({ type: z.literal("restorative_setup"), check: z.enum(["bridge_design", "single_unit_design", "veneer_position"]), restorationType: z.enum(RESTORATION_TYPES).optional() }),
  z.object({ type: z.literal("partial_denture_setup"), check: z.enum(["survey", "insertion_path", "contours", "undercuts", "blockout", "rests", "major_connector", "minor_connectors", "clasps", "saddle_mesh", "finish_lines", "framework", "complete_case"]), kennedyClass: z.enum(KENNEDY_CLASSES).optional() }),
  z.object({ type: z.literal("analysis_target"), kind: z.enum(["contact", "thickness", "undercut", "deviation", "dynamic_contact"]), objectIds: z.array(z.string().min(1)).min(1).max(2), minValue: z.number().positive().optional(), maxValue: z.number().positive().optional() }),
  z.object({ type: z.literal("implant_check"), check: z.enum(["fixture", "depth", "axis", "distance", "relationships"]), objectId: z.string().min(1).optional(), targetMm: z.number().nonnegative().optional(), tolerance: z.number().nonnegative().optional() }),
  z.object({ type: z.literal("r7_workflow"), check: z.enum(["inspect", "scan_body", "implant_axis", "emergence", "abutment", "crown_proposal", "crown_position", "contacts", "occlusion", "screw_access", "final"]) }),
  z.object({ type: z.literal("r6_workflow"), workflow: z.enum(["bite_splint", "digital_model", "articulator"]), check: z.enum(["boundary", "splint", "thickness", "contacts", "occlusion", "final", "working_copy", "source_preserved", "trim", "cleanup", "hole_fill", "orientation", "base", "mesh_check", "relation", "motion", "dynamic_contacts", "reset"]), motion: z.enum(["open_close", "protrusive", "left_lateral", "right_lateral"]).optional() }),
]);
export type ValidatorConfig = z.infer<typeof validatorConfigSchema>;

export const hintSchema = z.object({ id: z.string().min(1), title: localizedTextSchema, body: localizedTextSchema });
export const stepSchema = z.object({
  id: z.string().min(1), order: z.number().int().positive(), title: localizedTextSchema, instructions: localizedTextSchema,
  theory: localizedTextSchema.optional(), allowedTools: z.array(z.enum(PRACTICE_TOOL_IDS)).min(1),
  targetObjectIds: z.array(z.string().min(1)), hints: z.array(hintSchema), referenceModes: z.array(z.enum(["off", "outline", "transparent", "full"])),
  reference: z.object({ objectId: z.string().min(1), position: z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]) }).optional(),
  example: z.object({ label: localizedTextSchema, mode: z.enum(["outline", "transparent", "full"]) }).optional(),
  validators: z.array(validatorConfigSchema), required: z.boolean().default(true),
});
export const lessonSchema = z.object({
  id: z.string().min(1), databaseId: z.string().uuid(), moduleId: z.string().min(1), title: localizedTextSchema, summary: localizedTextSchema, goal: localizedTextSchema,
  difficulty: z.enum(["foundation", "beginner", "intermediate", "advanced"]), recommendedPrerequisites: z.array(localizedTextSchema), estimatedMinutes: z.number().positive(),
  assets: z.array(z.object({ assetId: z.string().min(1), runtimeObjectId: z.string().min(1), semanticRole: z.string().min(1), required: z.boolean(), isReference: z.boolean().optional(), name: z.string().optional(), bucket: z.string().optional(), path: z.string().optional(), unit: z.enum(["mm", "cm", "m", "unknown"]).optional() })),
  caseSetup: z.object({ source: z.enum(["shared-demo-workspace", "lesson-assets", "crown-case", "denture-case", "restorative-case", "partial-denture-case", "bite-splint-case", "digital-model-case", "articulator-case", "implant-case"]), restorationType: z.enum(RESTORATION_TYPES).optional(), kennedyClass: z.enum(KENNEDY_CLASSES).optional(), casePackageId: z.string().min(1).optional(), packageManifest: casePackageManifestSchema.optional(), checkpointId: z.string().min(1).optional(), objectMappings: z.array(z.object({ runtimeObjectId: z.string().min(1), semanticRole: z.string().min(1), editable: z.boolean() })) }),
  steps: z.array(stepSchema).min(1),
});
export type PracticeLesson = z.infer<typeof lessonSchema>;
export type PracticeStep = PracticeLesson["steps"][number];
export type PracticeHint = PracticeStep["hints"][number];
export type ValidationOutcome = "pass" | "warning" | "fail";
export type ValidationResult = { id: string; validatorType: string; outcome: ValidationOutcome; title: LocalizedText; message: LocalizedText; measured?: number; target?: number; objectId?: string };

export const localized = (value: LocalizedText | string, locale: PracticeLocale) => typeof value === "string" ? value : (value[locale] || value.en);
