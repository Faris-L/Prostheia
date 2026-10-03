import { MODEL_IMPORT_LIMITS } from "./config";
import type { ImportErrorCode, ImportWorkerResponse, ModelFormat } from "./types";

export class ModelImportError extends Error {
  constructor(readonly code: ImportErrorCode, message: string) { super(message); this.name = "ModelImportError"; }
}

const formats: Record<string, ModelFormat> = { stl: "stl", obj: "obj", ply: "ply", glb: "glb", gltf: "gltf" };

export function detectModelFormat(fileName: string): ModelFormat {
  const extension = fileName.split(".").at(-1)?.toLowerCase();
  const format = extension ? formats[extension] : undefined;
  if (!format) throw new ModelImportError("unsupported_format", `Could not import “${fileName}”: choose an STL, OBJ, PLY, GLB, or glTF file.`);
  return format;
}

export function validateImportFile(file: Pick<File, "name" | "size">): ModelFormat {
  const format = detectModelFormat(file.name);
  if (file.size === 0) throw new ModelImportError("empty_file", `Could not import “${file.name}”: the file is empty.`);
  if (file.size > MODEL_IMPORT_LIMITS.maxFileBytes) throw new ModelImportError("file_too_large", `Could not import “${file.name}”: files must be 128 MB or smaller.`);
  return format;
}

export function isImportErrorCode(value: unknown): value is ImportErrorCode {
  return typeof value === "string" && ["unsupported_format", "empty_file", "file_too_large", "format_mismatch", "parse_failed", "invalid_geometry", "geometry_too_large", "invalid_coordinates"].includes(value);
}

export function isImportWorkerMessage(value: unknown, jobId: string): value is ImportWorkerResponse {
  if (!value || typeof value !== "object" || !("jobId" in value) || value.jobId !== jobId || !("type" in value)) return false;
  const message = value as Record<string, unknown>;
  if (message.type === "IMPORT_PROGRESS") return message.stage === "reading" || message.stage === "parsing" || message.stage === "normalizing";
  if (message.type === "IMPORT_ERROR") return isImportErrorCode(message.code) && typeof message.message === "string";
  if (message.type !== "IMPORT_SUCCESS" || !message.payload || typeof message.payload !== "object") return false;
  const payload = message.payload as Record<string, unknown>;
  const meshesValid = Array.isArray(payload.meshes) && payload.meshes.length > 0 && payload.meshes.every((mesh) => {
    if (!mesh || typeof mesh !== "object") return false;
    const item = mesh as Record<string, unknown>;
    if (!(item.positions instanceof ArrayBuffer) || item.positions.byteLength < 36 || item.positions.byteLength % 12 !== 0) return false;
    const positions = new Float32Array(item.positions);
    if (!positions.every(Number.isFinite)) return false;
    const vertexCount = positions.length / 3;
    if (item.normals !== null && (!(item.normals instanceof ArrayBuffer) || item.normals.byteLength !== positions.byteLength || !new Float32Array(item.normals).every(Number.isFinite))) return false;
    if (item.colors !== null && (!(item.colors instanceof ArrayBuffer) || !Number.isInteger(item.colorItemSize) || (item.colorItemSize as number) < 3 || item.colors.byteLength / 4 / (item.colorItemSize as number) !== vertexCount || !new Float32Array(item.colors).every(Number.isFinite))) return false;
    if (item.indices !== null) {
      if (!(item.indices instanceof ArrayBuffer) || (item.indexType !== "uint16" && item.indexType !== "uint32")) return false;
      const indices = item.indexType === "uint16" ? new Uint16Array(item.indices) : new Uint32Array(item.indices);
      if (indices.length === 0 || indices.length % 3 !== 0 || !indices.every((index) => index < vertexCount)) return false;
    } else if (vertexCount % 3 !== 0) return false;
    return Array.isArray(item.matrix) && item.matrix.length === 16 && item.matrix.every(Number.isFinite) && typeof item.materialColor === "string" && Number(item.vertexCount) === vertexCount && Number(item.triangleCount) > 0;
  });
  const isPoint = (point: unknown): point is number[] => Array.isArray(point) && point.length === 3 && point.every(Number.isFinite);
  const sourceBounds = payload.sourceBounds as Record<string, unknown> | null;
  const validBounds = Boolean(sourceBounds && isPoint(sourceBounds.min) && isPoint(sourceBounds.max));
  return meshesValid && Number.isFinite(payload.vertexCount) && Number(payload.vertexCount) > 0 && Number.isFinite(payload.triangleCount) && Number(payload.triangleCount) > 0 && Array.isArray(payload.dimensionsMm) && payload.dimensionsMm.length === 3 && payload.dimensionsMm.every((dimension) => Number.isFinite(dimension) && Number(dimension) >= 0) && validBounds && isPoint(payload.sourceOrigin) && Array.isArray(payload.originalToCanonical) && payload.originalToCanonical.length === 16 && payload.originalToCanonical.every(Number.isFinite) && Number.isFinite(payload.unitScale) && Number(payload.unitScale) > 0 && ["mm", "cm", "m", "unknown"].includes(String(payload.sourceUnit)) && Array.isArray(payload.warnings);
}
