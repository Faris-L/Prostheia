import type { CadObjectId, CadObjectRole } from "../types";
import type { Bounds3, Point3 } from "./normalization";

export type ModelFormat = "stl" | "obj" | "ply" | "glb" | "gltf";
export type ModelUnit = "mm" | "cm" | "m" | "unknown";
export type ImportStage = "idle" | "reading" | "parsing" | "normalizing" | "uploading" | "registering" | "ready" | "failed";
export type ImportErrorCode = "unsupported_format" | "empty_file" | "file_too_large" | "format_mismatch" | "parse_failed" | "invalid_geometry" | "geometry_too_large" | "invalid_coordinates";
export type ImportWarningCode = "unit_assumed" | "scale_suspicious" | "dense_mesh" | "orientation_unconfirmed" | "source_colors_preserved" | "raw_asset_upload_failed";
export type RawAssetReference = { assetId: string; bucket: "user-imports"; objectPath: string };

export type ImportSourceMetadata = {
  sourceFileName: string;
  format: ModelFormat;
  byteSize: number;
  importedAt: number;
  vertexCount: number;
  triangleCount: number;
  boundingDimensionsMm: [number, number, number];
  sourceBounds: Bounds3;
  sourceOrigin: Point3;
  sourceUnit: ModelUnit;
  unitScale: number;
  originalToCanonical: number[];
  warnings: ImportWarningCode[];
  orientation: "source_preserved_unconfirmed" | "private_training_display_frame";
  recovery: "geometry_session_only";
  rawAsset?: RawAssetReference;
};

export type ImportRequest = { file: File; role: CadObjectRole; unit: ModelUnit };
export type ImportResult = { id: CadObjectId; name: string; role: CadObjectRole; metadata: ImportSourceMetadata };
export type ImportFailure = { fileName: string; code: ImportErrorCode; message: string };
export type ImportFileResult = { fileName: string; ok: true; value: ImportResult } | { fileName: string; ok: false; error: ImportFailure };

export type SerializedMesh = {
  positions: ArrayBuffer;
  indices: ArrayBuffer | null;
  indexType: "uint16" | "uint32" | null;
  normals: ArrayBuffer | null;
  colors: ArrayBuffer | null;
  colorItemSize: number | null;
  matrix: number[];
  materialColor: string;
  vertexCount: number;
  triangleCount: number;
};

export type ImportWorkerRequest = { type: "IMPORT_MODEL"; jobId: string; file: File; format: ModelFormat; unit: ModelUnit };
export type ImportWorkerResponse =
  | { type: "IMPORT_PROGRESS"; jobId: string; stage: "reading" | "parsing" | "normalizing" }
  | { type: "IMPORT_SUCCESS"; jobId: string; payload: { meshes: SerializedMesh[]; sourceUnit: ModelUnit; unitScale: number; dimensionsMm: [number, number, number]; sourceBounds: Bounds3; sourceOrigin: Point3; vertexCount: number; triangleCount: number; warnings: ImportWarningCode[]; originalToCanonical: number[] } }
  | { type: "IMPORT_ERROR"; jobId: string; code: ImportErrorCode; message: string };
