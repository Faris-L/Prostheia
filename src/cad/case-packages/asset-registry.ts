import { cadObjectId, type CadObjectMetadata, type CadObjectRole } from "@/cad/types";
import { importModel } from "@/cad/import/import-model";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { caseAssetMetadataSchema, type CaseAssetMetadata, type CaseAssetReference } from "./contract";
import { originalToCanonicalFromRegistry } from "./asset-normalization";
import { getPrivateTrainingAsset, PRIVATE_FIXED_ASSET_SCOPE, type PrivateTrainingAsset } from "./private-asset-catalog";

type AssetLicenseRow = {
  license_name: string | null;
  license_url: string | null;
  source_url: string | null;
  attribution_text: string | null;
  commercial_use_allowed: boolean | null;
  modification_allowed: boolean | null;
  redistribution_allowed: boolean | null;
  verified_at: string | null;
};

type AssetRow = {
  id: string;
  bucket_id: string;
  object_path: string;
  original_filename: string | null;
  mime_type: string | null;
  byte_size: number | null;
  sha256: string | null;
  status: string;
  kind: string;
  model_assets: {
    format: "glb" | "obj" | "ply" | "stl";
    default_role: CadObjectRole | null;
    source_unit: "mm" | "cm" | "m" | "unknown";
    vertex_count: number | null;
    triangle_count: number | null;
    bbox_min: number[] | null;
    bbox_max: number[] | null;
    original_to_canonical: unknown;
    technical_metadata: unknown;
  } | Array<{
    format: "glb" | "obj" | "ply" | "stl";
    default_role: CadObjectRole | null;
    source_unit: "mm" | "cm" | "m" | "unknown";
    vertex_count: number | null;
    triangle_count: number | null;
    bbox_min: number[] | null;
    bbox_max: number[] | null;
    original_to_canonical: unknown;
    technical_metadata: unknown;
  }> | null;
  asset_licenses: AssetLicenseRow | AssetLicenseRow[] | null;
};

export type ResolvedCaseAsset = {
  /** Parsed geometry is in original source coordinates until the package loader normalizes it. */
  object: import("three").Object3D;
  importSource: NonNullable<CadObjectMetadata["importSource"]>;
  metadata: CaseAssetMetadata;
  masterAssetId: string | null;
  runtimeAssetId: string;
  originalToCanonical?: number[];
  normalizationState?: "source" | "canonical";
};

export type CaseAssetResolver = (reference: CaseAssetReference, role: CadObjectRole) => Promise<ResolvedCaseAsset>;

const assetSelect = "id,bucket_id,object_path,original_filename,mime_type,byte_size,sha256,status,kind,model_assets(format,default_role,source_unit,vertex_count,triangle_count,bbox_min,bbox_max,original_to_canonical,technical_metadata),asset_licenses(license_name,license_url,source_url,attribution_text,commercial_use_allowed,modification_allowed,redistribution_allowed,verified_at)";

export const resolveRegisteredCaseAsset: CaseAssetResolver = async (reference, role) => {
  const selectedId = caseRuntimeAssetRecordId(reference);
  const privateTrainingAsset = getPrivateTrainingAsset(selectedId);
  if (privateTrainingAsset) return resolvePrivateTrainingAsset(privateTrainingAsset, role);
  const requestedIds = [...new Set([reference.runtimeAssetId, reference.masterAssetId, reference.assetId].filter((id): id is string => Boolean(id)))];
  const client = createBrowserSupabaseClient();
  const { data, error } = await client.from("assets").select(assetSelect).in("id", requestedIds);
  if (error) throw new Error(`Asset reference "${reference.id}" could not be resolved: ${error.message}`);
  const rows = (data ?? []) as unknown as AssetRow[];
  const rowsById = new Map(rows.map((row) => [row.id, row]));
  if (!selectedId) throw new Error(`Asset reference "${reference.id}" does not name a registered asset.`);
  const selected = rowsById.get(selectedId);
  if (!selected) throw new Error(`Asset reference "${reference.id}" points to missing registry asset "${selectedId}".`);
  if (selected.status !== "ready") throw new Error(`Asset reference "${reference.id}" points to asset "${selectedId}" with status "${selected.status}"; only ready assets can be loaded.`);
  if (selected.kind !== "model" && selected.kind !== "reference_model" && selected.kind !== "tool_demo") throw new Error(`Asset reference "${reference.id}" points to a non-model asset record.`);
  const model = first(selected.model_assets);
  if (!model) throw new Error(`Asset registry record "${selectedId}" has no model_assets metadata.`);
  if (model.source_unit === "unknown") throw new Error(`Asset reference "${reference.id}" has unknown source units; verify the source scale before loading it into a millimeter workspace.`);
  const originalToCanonical = originalToCanonicalFromRegistry(model.original_to_canonical, model.source_unit);
  const license = first(selected.asset_licenses);
  const technical = asRecord(model.technical_metadata);
  const metadata = caseAssetMetadataSchema.parse({
    assetId: selected.id,
    bucketId: selected.bucket_id,
    objectPath: selected.object_path,
    format: model.format,
    sourceUnit: model.source_unit,
    canonicalUnit: "mm",
    unitScaleToMm: unitScaleToMm(model.source_unit),
    coordinateSystem: normalizeCoordinateSystem(technical.coordinateSystem),
    bounds: normalizeBounds(model.bbox_min, model.bbox_max, model.source_unit),
    statistics: { vertexCount: model.vertex_count, triangleCount: model.triangle_count },
    provenance: normalizeProvenance(technical.provenance, license),
    license: {
      status: !license ? "unknown" : license.verified_at ? "reviewed" : "unreviewed",
      name: license?.license_name ?? null,
      url: validUrlOrNull(license?.license_url),
      commercialUseAllowed: license?.commercial_use_allowed ?? null,
      modificationAllowed: license?.modification_allowed ?? null,
      redistributionAllowed: license?.redistribution_allowed ?? null,
    },
    expertReview: normalizeExpertReview(technical.expertReviewStatus),
    segmentation: normalizeSegmentation(technical.segmentation),
    technicalMetadata: { ...technical, originalToCanonical: { matrix: originalToCanonical } },
  });
  const { data: fileData, error: downloadError } = await client.storage.from(selected.bucket_id).download(selected.object_path);
  if (downloadError || !fileData) throw new Error(`Asset reference "${reference.id}" could not download "${selected.object_path}": ${downloadError?.message ?? "no file was returned"}.`);
  const fileName = selected.original_filename && fileExtension(selected.original_filename) === model.format
    ? selected.original_filename
    : `${selected.original_filename?.replace(/\.[^.]+$/, "") || selected.id}.${model.format}`;
  const file = new File([fileData], fileName, { type: selected.mime_type || fileData.type || "application/octet-stream" });
  // Parse source coordinates unchanged here; the package loader applies the complete
  // source-to-canonical matrix once, so a matrix that includes unit scale is not doubled.
  const imported = await importModel({ file, role, unit: "mm" });
  imported.metadata.sourceUnit = model.source_unit;
  imported.metadata.unitScale = unitScaleToMm(model.source_unit) ?? 1;
  imported.metadata.originalToCanonical = originalToCanonical;
  imported.id = cadObjectId(selected.id);
  return {
    object: imported.object,
    importSource: imported.metadata,
    metadata,
    masterAssetId: reference.masterAssetId ?? reference.assetId ?? null,
    runtimeAssetId: selected.id,
    originalToCanonical,
    normalizationState: "source",
  };
};

async function resolvePrivateTrainingAsset(asset: PrivateTrainingAsset, role: CadObjectRole): Promise<ResolvedCaseAsset> {
  const response = await fetch(`/api/private-training-assets/${asset.id}`, { credentials: "same-origin", cache: "no-store" });
  if (!response.ok) throw new Error(`Private training asset "${asset.id}" could not be loaded (HTTP ${response.status}).`);
  const file = new File([await response.blob()], asset.runtimeFile, { type: "model/gltf-binary" });
  const imported = await importModel({ file, role, unit: "mm" });
  imported.metadata.sourceUnit = "unknown";
  imported.metadata.unitScale = 1;
  imported.metadata.sourceBounds = {
    min: asset.rawSourceBounds.min as [number, number, number],
    max: asset.rawSourceBounds.max as [number, number, number],
  };
  imported.metadata.boundingDimensionsMm = asset.runtimeBoundsMm.spans as [number, number, number];
  imported.metadata.originalToCanonical = asset.originalToCanonicalTrainingMatrix;
  imported.metadata.warnings = ["orientation_unconfirmed"];
  imported.metadata.orientation = "private_training_display_frame";

  const metadata = caseAssetMetadataSchema.parse({
    assetId: asset.id,
    bucketId: "private-training-assets",
    objectPath: asset.runtimeFile,
    format: "glb",
    sourceUnit: "unknown",
    canonicalUnit: "mm",
    unitScaleToMm: null,
    coordinateSystem: { id: "unknown_source_frame_private_training_display", handedness: "unknown", upAxis: "unknown" },
    bounds: { min: asset.runtimeBoundsMm.min, max: asset.runtimeBoundsMm.max, unit: "mm" },
    statistics: { vertexCount: asset.runtimeVertexCount, triangleCount: asset.runtimeTriangleCount },
    provenance: {
      status: "recorded",
      source: "University of Dundee, School of Dentistry",
      sourceUrl: asset.originalUrl,
      attribution: asset.attribution,
    },
    license: {
      status: "reviewed",
      name: asset.licenseName,
      url: asset.licenseUrl,
      commercialUseAllowed: true,
      modificationAllowed: true,
      redistributionAllowed: true,
    },
    expertReview: "not_reviewed",
    segmentation: [{ id: `tooth-${asset.proposedFdi}`, label: { en: `Tooth ${asset.proposedFdi}`, sr: `Zub ${asset.proposedFdi}` }, fdi: asset.proposedFdi }],
    technicalMetadata: {
      privateTrainingApproval: asset.assetState,
      privateAssetScope: PRIVATE_FIXED_ASSET_SCOPE,
      sourceTitle: asset.title,
      sourceUid: asset.uid,
      sourceArchiveChecksum: asset.sourceArchiveChecksum,
      sourceObjChecksum: asset.sourceObjChecksum,
      sourceObjPath: asset.sourceObjPath,
      proposedFdi: asset.proposedFdi,
      originalOrDerived: asset.originalOrDerived,
      derivedFromAssetId: asset.derivedFromAssetId,
      sourceUnitStatus: asset.sourceUnitStatus,
      unitScaleToMm: asset.unitScaleToMm,
      coordinateStatus: asset.coordinateStatus,
      normalizationNotes: asset.normalizationNotes,
      originalToCanonicalTrainingMatrix: asset.originalToCanonicalTrainingMatrix,
      morphologyQaStatus: asset.morphologyQaStatus,
      reviewStatus: asset.reviewStatus,
      patientProvenanceStatus: asset.patientProvenanceStatus,
      runtimeFile: asset.runtimeFile,
      runtimeChecksum: asset.runtimeChecksum,
      runtimeByteSize: asset.runtimeByteSize,
      sourceBoundsUnknownUnit: asset.rawSourceBounds,
      runtimeBoundsMm: asset.runtimeBoundsMm,
    },
  });

  return {
    object: imported.object,
    importSource: imported.metadata,
    metadata,
    masterAssetId: asset.derivedFromAssetId ?? asset.id,
    runtimeAssetId: asset.id,
    originalToCanonical: asset.originalToCanonicalTrainingMatrix,
    normalizationState: "canonical",
  };
}

export function unitScaleToMm(unit: CaseAssetMetadata["sourceUnit"]) {
  if (unit === "mm") return 1;
  if (unit === "cm") return 10;
  if (unit === "m") return 1000;
  return null;
}

/** Runtime geometry falls back to the master asset, then to the legacy single asset row. */
export function caseRuntimeAssetRecordId(reference: CaseAssetReference) {
  const id = reference.runtimeAssetId ?? reference.masterAssetId ?? reference.assetId;
  if (!id) throw new Error(`Asset reference "${reference.id}" does not name a registry asset.`);
  return id;
}

function asRecord(value: unknown): Record<string, unknown> { return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function fileExtension(path: string) { return path.split(".").at(-1)?.toLowerCase() ?? ""; }
function validUrlOrNull(value: string | null | undefined) { if (!value) return null; try { return new URL(value).toString(); } catch { return null; } }

function normalizeCoordinateSystem(value: unknown) {
  const raw = asRecord(value);
  const axes = ["x", "y", "z", "unknown"];
  const hands = ["right", "left", "unknown"];
  return {
    id: typeof raw.id === "string" && raw.id.length ? raw.id : "unknown",
    handedness: hands.includes(String(raw.handedness)) ? raw.handedness : "unknown",
    upAxis: axes.includes(String(raw.upAxis)) ? raw.upAxis : "unknown",
    ...(axes.includes(String(raw.forwardAxis)) ? { forwardAxis: raw.forwardAxis } : {}),
  };
}

function normalizeBounds(min: number[] | null, max: number[] | null, unit: CaseAssetMetadata["sourceUnit"]) {
  const finiteVector = (value: number[] | null): value is [number, number, number] => Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
  if (!finiteVector(min) || !finiteVector(max)) return undefined;
  return { min, max, unit };
}

function first<T>(relation: T | T[] | null | undefined): T | undefined { return Array.isArray(relation) ? relation[0] : relation ?? undefined; }
function normalizeProvenance(value: unknown, license?: AssetLicenseRow) {
  const raw = asRecord(value);
  const source = typeof raw.source === "string" ? raw.source : null;
  const sourceUrl = validUrlOrNull(typeof raw.sourceUrl === "string" ? raw.sourceUrl : license?.source_url);
  const attribution = typeof raw.attribution === "string" ? raw.attribution : license?.attribution_text ?? null;
  const status = raw.status === "reviewed" ? "reviewed" : source || sourceUrl || attribution ? "recorded" : "unknown";
  return { status, source, sourceUrl, attribution };
}

function normalizeExpertReview(value: unknown): CaseAssetMetadata["expertReview"] {
  return ["unknown", "not_reviewed", "reviewed", "expert_verified"].includes(String(value)) ? value as CaseAssetMetadata["expertReview"] : "unknown";
}

function normalizeSegmentation(value: unknown): CaseAssetMetadata["segmentation"] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new Error("Asset technical_metadata.segmentation must be an array when provided.");
  return value.map((entry, index) => {
    const raw = asRecord(entry);
    if (typeof raw.id !== "string" || !raw.id || typeof raw.nameEn !== "string" || typeof raw.nameSr !== "string") throw new Error(`Asset segmentation entry ${index} must contain id, nameEn, and nameSr.`);
    return {
      id: raw.id,
      label: { en: raw.nameEn, sr: raw.nameSr },
      ...(typeof raw.sourceComponent === "string" ? { sourceComponent: raw.sourceComponent } : {}),
      ...(Number.isInteger(raw.fdi) ? { fdi: Number(raw.fdi) } : {}),
    };
  });
}
