import { z } from "zod";
import type { CadObjectRole } from "@/cad/types";

export const CASE_PACKAGE_SCHEMA_VERSION = 1 as const;
export const CASE_SEMANTIC_ROLES = ["SOURCE", "DESIGN", "GUIDE", "REFERENCE"] as const;
export type CaseSemanticRole = (typeof CASE_SEMANTIC_ROLES)[number];

// These values mirror the existing database CAD role enum. caseRole is a separate axis.
export const CASE_PACKAGE_CAD_ROLES = [
  "maxilla", "mandible", "antagonist", "preop", "prepared_tooth", "tooth", "crown", "bridge",
  "pontic", "denture_tooth", "denture_base", "framework", "splint", "implant", "abutment",
  "model_base", "reference", "scan", "other",
] as const satisfies readonly CadObjectRole[];

export const CASE_WORKFLOW_TYPES = [
  "tool_drill", "crown", "bridge", "inlay", "onlay", "veneer", "complete_denture", "partial_denture",
  "bite_splint", "digital_model", "virtual_articulator", "implant",
] as const;

const localizedTextSchema = z.object({ en: z.string().min(1), sr: z.string().min(1) });
const stringListByLocaleSchema = z.object({ en: z.array(z.string()), sr: z.array(z.string()) });
const vector3Schema = z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]);
const transformSchema = z.object({ position: vector3Schema, rotation: vector3Schema, scale: vector3Schema });
const localIdSchema = z.string().min(1).max(96).regex(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/);
const uuidSchema = z.uuid();

export const caseAssetReferenceSchema = z.object({
  id: localIdSchema,
  /** Existing public.assets row. Kept for current lesson/scenario links. */
  assetId: uuidSchema.optional(),
  /** Optional high-detail source asset in public.assets. */
  masterAssetId: uuidSchema.optional(),
  /** Optional browser/runtime asset in public.assets. Falls back to masterAssetId, then assetId. */
  runtimeAssetId: uuidSchema.optional(),
  required: z.boolean().default(true),
}).refine((reference) => Boolean(reference.assetId || reference.masterAssetId || reference.runtimeAssetId), {
  message: "An asset reference must name assetId, masterAssetId, or runtimeAssetId.",
});

export const caseObjectSourceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("asset"), assetRefId: localIdSchema }),
  z.object({ kind: z.literal("procedural"), factoryId: z.string().min(1).max(120), parameters: z.record(z.string(), z.unknown()).default({}) }),
]);

export const caseObjectDescriptorSchema = z.object({
  id: localIdSchema,
  name: localizedTextSchema,
  caseRole: z.enum(CASE_SEMANTIC_ROLES),
  cadRole: z.enum(CASE_PACKAGE_CAD_ROLES),
  source: caseObjectSourceSchema,
  required: z.boolean().default(true),
  editable: z.boolean(),
  visible: z.boolean(),
  opacity: z.number().finite().min(0).max(1),
  transform: transformSchema,
  parentId: localIdSchema.optional(),
  dental: z.object({
    fdi: z.number().int().refine(isFdiToothNumber, "FDI tooth number must identify a permanent or primary tooth." ).optional(),
    arch: z.enum(["maxilla", "mandible", "upper", "lower"]).optional(),
    surface: localizedTextSchema.optional(),
  }).optional(),
  workflowMetadata: z.record(z.string(), z.unknown()).default({}),
  referenceState: z.object({
    isExample: z.boolean().default(false),
    visibility: z.enum(["hidden", "visible", "available_on_request"]).default("hidden"),
    access: z.enum(["always", "after_attempt", "after_submission", "never"]).default("always"),
  }).optional(),
  segmentation: z.array(z.object({
    id: localIdSchema,
    name: localizedTextSchema,
    fdi: z.number().int().refine(isFdiToothNumber).optional(),
    sourceComponent: z.string().min(1).optional(),
  })).default([]),
});

const checkpointSourceSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("package_baseline") }),
  z.object({ kind: z.literal("case_revision"), caseId: uuidSchema, revisionId: uuidSchema }),
  z.object({
    kind: z.literal("asset_snapshot"),
    objects: z.array(z.object({
      objectId: localIdSchema,
      /** A package checkpoint may switch a procedural object to a deterministic prepared stage. */
      source: caseObjectSourceSchema.optional(),
      /** When omitted, preserve the descriptor's original asset or procedural source. */
      assetRefId: localIdSchema.optional(),
      transform: transformSchema.optional(),
      visible: z.boolean().optional(),
      opacity: z.number().finite().min(0).max(1).optional(),
    })).min(1),
  }),
  z.object({
    kind: z.literal("derived_state"),
    parentCheckpointId: localIdSchema,
    derivationId: z.string().min(1),
    parameters: z.record(z.string(), z.unknown()).default({}),
  }),
]);

export const caseCheckpointSchema = z.object({ id: localIdSchema, label: localizedTextSchema, source: checkpointSourceSchema, workflowState: z.record(z.string(), z.unknown()).default({}) });

export const caseValidationBindingSchema = z.object({
  id: localIdSchema,
  objectIds: z.array(localIdSchema).min(1),
  binding: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("practice_config"), validationConfigId: uuidSchema }),
    z.object({ kind: z.literal("inline"), validatorType: z.string().min(1), config: z.record(z.string(), z.unknown()) }),
  ]),
});

export const caseAssetMetadataSchema = z.object({
  assetId: uuidSchema,
  bucketId: z.string().min(1),
  objectPath: z.string().min(1),
  format: z.enum(["glb", "gltf", "stl", "obj", "ply"]),
  sourceUnit: z.enum(["mm", "cm", "m", "unknown"]),
  canonicalUnit: z.literal("mm"),
  unitScaleToMm: z.number().positive().nullable(),
  coordinateSystem: z.object({
    id: z.string().min(1),
    handedness: z.enum(["right", "left", "unknown"]),
    upAxis: z.enum(["x", "y", "z", "unknown"]),
    forwardAxis: z.enum(["x", "y", "z", "unknown"]).optional(),
  }),
  bounds: z.object({ min: vector3Schema, max: vector3Schema, unit: z.enum(["mm", "cm", "m", "unknown"]) }).optional(),
  statistics: z.object({ vertexCount: z.number().int().nonnegative().nullable(), triangleCount: z.number().int().nonnegative().nullable() }).optional(),
  provenance: z.object({
    status: z.enum(["unknown", "recorded", "reviewed"]),
    source: z.string().nullable(),
    sourceUrl: z.string().url().nullable(),
    attribution: z.string().nullable(),
  }),
  license: z.object({
    status: z.enum(["unknown", "unreviewed", "reviewed"]),
    name: z.string().nullable(),
    url: z.string().url().nullable(),
    commercialUseAllowed: z.boolean().nullable(),
    modificationAllowed: z.boolean().nullable(),
    redistributionAllowed: z.boolean().nullable(),
  }),
  expertReview: z.enum(["unknown", "not_reviewed", "reviewed", "expert_verified"]),
  segmentation: z.array(z.object({ id: localIdSchema, label: localizedTextSchema, sourceComponent: z.string().optional(), fdi: z.number().int().refine(isFdiToothNumber).optional() })).default([]),
  technicalMetadata: z.record(z.string(), z.unknown()).default({}),
});

export const casePackageManifestSchema = z.object({
  schemaVersion: z.literal(CASE_PACKAGE_SCHEMA_VERSION),
  packageId: z.string().min(1).max(120).regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/),
  /** Compact, globally unique namespace used to derive Geometry Registry IDs. */
  caseId: z.string().min(1).max(48).regex(/^[a-z0-9]+$/),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  workflowType: z.enum(CASE_WORKFLOW_TYPES),
  difficulty: z.enum(["foundation", "beginner", "intermediate", "advanced"]),
  metadata: z.object({
    title: localizedTextSchema,
    description: localizedTextSchema,
    indication: localizedTextSchema.optional(),
  }),
  labOrder: z.object({
    caseCode: z.string().min(1).optional(),
    workflowType: z.enum(CASE_WORKFLOW_TYPES).optional(),
    restorationType: z.enum(["crown", "bridge", "inlay", "onlay", "veneer"]).optional(),
    targetTeeth: z.array(z.number().int().positive()).default([]),
    targetArch: z.enum(["maxilla", "mandible", "both", "unknown"]).optional(),
    indication: localizedTextSchema.optional(),
    providedRecords: stringListByLocaleSchema.default({ en: [], sr: [] }),
    requiredOutput: stringListByLocaleSchema.default({ en: [], sr: [] }),
    materialPreset: localizedTextSchema.optional(),
    notes: localizedTextSchema.optional(),
    educationalDisclaimer: localizedTextSchema,
  }),
  assetRefs: z.array(caseAssetReferenceSchema).default([]),
  objects: z.array(caseObjectDescriptorSchema).min(1),
  initialWorkflowState: z.record(z.string(), z.unknown()).default({}),
  checkpoints: z.array(caseCheckpointSchema).min(1),
  startingCheckpointId: localIdSchema,
  validationBindings: z.array(caseValidationBindingSchema).default([]),
  expectedOutput: z.object({
    objectIds: z.array(localIdSchema).min(1),
    description: localizedTextSchema,
    format: z.string().optional(),
  }),
  trainingNotes: z.array(localizedTextSchema).default([]),
  review: z.object({
    status: z.enum(["unreviewed", "source_reviewed", "expert_verified"]),
    reviewedBy: z.string().nullable().optional(),
    reviewedAt: z.string().datetime().nullable().optional(),
  }).default({ status: "unreviewed" }),
  compatibility: z.object({
    practiceSources: z.array(z.object({ source: z.string().min(1), restorationType: z.string().optional() })).default([]),
    scenarioSlugs: z.array(z.string().min(1)).default([]),
  }).default({ practiceSources: [], scenarioSlugs: [] }),
});

export type CasePackageManifest = z.infer<typeof casePackageManifestSchema>;
export type CaseObjectDescriptor = z.infer<typeof caseObjectDescriptorSchema>;
export type CaseAssetReference = z.infer<typeof caseAssetReferenceSchema>;
export type CaseAssetMetadata = z.infer<typeof caseAssetMetadataSchema>;
export type CaseCheckpoint = z.infer<typeof caseCheckpointSchema>;

export class CasePackageValidationError extends Error {
  constructor(message: string) { super(message); this.name = "CasePackageValidationError"; }
}

export function validateCasePackage(input: unknown): CasePackageManifest {
  const parsed = casePackageManifestSchema.safeParse(input);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((issue) => `${issue.path.join(".") || "manifest"}: ${issue.message}`).join("; ");
    throw new CasePackageValidationError(`Invalid Case Package: ${detail}`);
  }
  const manifest = parsed.data;
  const objectIds = new Set<string>();
  for (const object of manifest.objects) {
    if (objectIds.has(object.id)) throw new CasePackageValidationError(`Invalid Case Package: duplicate object id "${object.id}".`);
    objectIds.add(object.id);
  }
  const assetIds = new Set<string>();
  for (const asset of manifest.assetRefs) {
    if (assetIds.has(asset.id)) throw new CasePackageValidationError(`Invalid Case Package: duplicate asset reference id "${asset.id}".`);
    assetIds.add(asset.id);
  }
  const checkpointIds = new Set(manifest.checkpoints.map((checkpoint) => checkpoint.id));
  if (checkpointIds.size !== manifest.checkpoints.length) throw new CasePackageValidationError("Invalid Case Package: checkpoint ids must be unique.");
  if (!checkpointIds.has(manifest.startingCheckpointId)) throw new CasePackageValidationError(`Invalid Case Package: starting checkpoint "${manifest.startingCheckpointId}" does not exist.`);

  for (const object of manifest.objects) {
    if (object.parentId && !objectIds.has(object.parentId)) throw new CasePackageValidationError(`Invalid Case Package: object "${object.id}" refers to missing parent "${object.parentId}".`);
    if (object.parentId === object.id) throw new CasePackageValidationError(`Invalid Case Package: object "${object.id}" cannot parent itself.`);
    if (object.source.kind === "asset" && !assetIds.has(object.source.assetRefId)) throw new CasePackageValidationError(`Invalid Case Package: object "${object.id}" refers to missing asset reference "${object.source.assetRefId}".`);
  }
  assertAcyclicParents(manifest.objects);
  const assertObjectReferences = (owner: string, ids: string[]) => {
    for (const id of ids) if (!objectIds.has(id)) throw new CasePackageValidationError(`Invalid Case Package: ${owner} refers to missing object "${id}".`);
  };
  for (const binding of manifest.validationBindings) assertObjectReferences(`validation binding "${binding.id}"`, binding.objectIds);
  assertObjectReferences("expectedOutput", manifest.expectedOutput.objectIds);
  for (const checkpoint of manifest.checkpoints) {
    if (checkpoint.source.kind === "derived_state" && !checkpointIds.has(checkpoint.source.parentCheckpointId)) throw new CasePackageValidationError(`Invalid Case Package: checkpoint "${checkpoint.id}" refers to missing parent checkpoint "${checkpoint.source.parentCheckpointId}".`);
    if (checkpoint.source.kind === "asset_snapshot") {
      for (const item of checkpoint.source.objects) {
        if (!objectIds.has(item.objectId)) throw new CasePackageValidationError(`Invalid Case Package: checkpoint "${checkpoint.id}" refers to missing object "${item.objectId}".`);
        if (item.assetRefId && !assetIds.has(item.assetRefId)) throw new CasePackageValidationError(`Invalid Case Package: checkpoint "${checkpoint.id}" refers to missing asset reference "${item.assetRefId}".`);
      }
    }
  }
  assertAcyclicCheckpoints(manifest.checkpoints);
  return manifest;
}

function assertAcyclicParents(objects: CaseObjectDescriptor[]) {
  const parents = new Map(objects.map((object) => [object.id, object.parentId]));
  for (const object of objects) {
    const visited = new Set<string>([object.id]);
    let parent = object.parentId;
    while (parent) {
      if (visited.has(parent)) throw new CasePackageValidationError(`Invalid Case Package: parent relationship for "${object.id}" contains a cycle.`);
      visited.add(parent);
      parent = parents.get(parent);
    }
  }
}

function assertAcyclicCheckpoints(checkpoints: CaseCheckpoint[]) {
  const parents = new Map(checkpoints.map((checkpoint) => [checkpoint.id, checkpoint.source.kind === "derived_state" ? checkpoint.source.parentCheckpointId : undefined]));
  for (const checkpoint of checkpoints) {
    const visited = new Set<string>([checkpoint.id]);
    let parent = parents.get(checkpoint.id);
    while (parent) {
      if (visited.has(parent)) throw new CasePackageValidationError(`Invalid Case Package: checkpoint relationship for "${checkpoint.id}" contains a cycle.`);
      visited.add(parent);
      parent = parents.get(parent);
    }
  }
}

export function isFdiToothNumber(value: number) {
  if (!Number.isInteger(value)) return false;
  const quadrant = Math.floor(value / 10);
  const position = value % 10;
  return [1, 2, 3, 4, 5, 6, 7, 8].includes(quadrant) && position >= 1 && position <= (quadrant >= 5 ? 5 : 8);
}
