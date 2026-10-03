import * as THREE from "three";
import { cadObjectId } from "../types";
import { isImportWorkerMessage, ModelImportError, validateImportFile } from "./model-importer";
import type { ImportRequest, ImportSourceMetadata, ImportStage, ImportWorkerRequest, ImportWorkerResponse, ModelUnit } from "./types";

export type ImportStageHandler = (stage: ImportStage) => void;

export async function importModel(request: ImportRequest, onStage: ImportStageHandler = () => {}, signal?: AbortSignal) {
  const format = validateImportFile(request.file);
  onStage("reading");
  const jobId = crypto.randomUUID();
  const worker = new Worker(new URL("./model-import.worker.ts", import.meta.url), { type: "module", name: `prostheia-import-${jobId}` });
  let settled = false;
  let root: THREE.Group | null = null;
  try {
    const payload = await new Promise<Extract<ImportWorkerResponse, { type: "IMPORT_SUCCESS" }>["payload"]>((resolve, reject) => {
      const cleanup = () => {
        worker.removeEventListener("message", onMessage);
        worker.removeEventListener("error", onError);
        signal?.removeEventListener("abort", onAbort);
      };
      const finish = (callback: () => void) => { if (settled) return; settled = true; cleanup(); callback(); };
      const onMessage = (event: MessageEvent<ImportWorkerResponse>) => {
        const message = event.data;
        if (!message || typeof message !== "object" || !("jobId" in message) || message.jobId !== jobId) return;
        if (!isImportWorkerMessage(message, jobId)) { finish(() => reject(new ModelImportError("parse_failed", `Could not import “${request.file.name}”: the import worker returned invalid data.`))); return; }
        if (message.type === "IMPORT_PROGRESS") { onStage(message.stage); return; }
        if (message.type === "IMPORT_ERROR") { finish(() => reject(new ModelImportError(message.code, `Could not import “${request.file.name}”: ${message.message}`))); return; }
        if (message.type === "IMPORT_SUCCESS") finish(() => resolve(message.payload));
      };
      const onError = () => finish(() => reject(new ModelImportError("parse_failed", `Could not import “${request.file.name}”: the import worker stopped unexpectedly.`)));
      const onAbort = () => finish(() => reject(new DOMException("Import cancelled.", "AbortError")));
      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", onError);
      signal?.addEventListener("abort", onAbort, { once: true });
      if (signal?.aborted) { onAbort(); return; }
      worker.postMessage({ type: "IMPORT_MODEL", jobId, file: request.file, format, unit: request.unit } satisfies ImportWorkerRequest);
    });

    root = createRuntimeObject(payload.meshes, payload.originalToCanonical);
    onStage("registering");
    const id = cadObjectId(`cad-${crypto.randomUUID()}`);
    const importedAt = Date.now();
    const metadata: ImportSourceMetadata = {
      sourceFileName: request.file.name,
      format,
      byteSize: request.file.size,
      importedAt,
      vertexCount: payload.vertexCount,
      triangleCount: payload.triangleCount,
      boundingDimensionsMm: payload.dimensionsMm,
      sourceBounds: payload.sourceBounds,
      sourceOrigin: payload.sourceOrigin,
      sourceUnit: payload.sourceUnit,
      unitScale: payload.unitScale,
      originalToCanonical: payload.originalToCanonical,
      warnings: payload.warnings,
      orientation: "source_preserved_unconfirmed",
      recovery: "geometry_session_only",
    };
    return { id, name: makeDisplayName(request.file.name), role: request.role, object: root, metadata };
  } catch (error) {
    if (root) disposeObject(root);
    throw error;
  } finally {
    worker.terminate();
    root = null;
  }
}

function createRuntimeObject(meshes: Extract<ImportWorkerResponse, { type: "IMPORT_SUCCESS" }>["payload"]["meshes"], transform: number[]) {
  const root = new THREE.Group();
  const normalized = new THREE.Group();
  normalized.matrixAutoUpdate = false;
  normalized.matrix.fromArray(transform);
  for (const payload of meshes) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(payload.positions), 3));
    if (payload.normals) geometry.setAttribute("normal", new THREE.BufferAttribute(new Float32Array(payload.normals), 3));
    if (payload.colors) geometry.setAttribute("color", new THREE.BufferAttribute(new Float32Array(payload.colors), payload.colorItemSize ?? 3));
    if (payload.indices) geometry.setIndex(new THREE.BufferAttribute(payload.indexType === "uint16" ? new Uint16Array(payload.indices) : new Uint32Array(payload.indices), 1));
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    const material = new THREE.MeshStandardMaterial({ color: payload.materialColor, vertexColors: Boolean(payload.colors), roughness: 0.72, metalness: 0.04, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.matrixAutoUpdate = false;
    mesh.matrix.fromArray(payload.matrix);
    normalized.add(mesh);
  }
  root.add(normalized);
  root.updateMatrixWorld(true);
  root.userData.importRenderRoot = true;
  return root;
}

export function makeDisplayName(fileName: string) {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "");
  const cleaned = withoutExtension.replace(/[._-]+/g, " ").replace(/\s+/g, " ").trim();
  return cleaned ? cleaned.replace(/\b\p{L}/gu, (character) => character.toUpperCase()) : "Imported Model";
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) material.dispose();
  });
}

export function defaultUnitFor(format: string): ModelUnit { return format === "glb" || format === "gltf" ? "m" : "mm"; }
