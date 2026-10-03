import * as THREE from "three";
import type { CadObjectId } from "../types";
import { geometryRegistry } from "../scene/geometry-registry";
import { fromMeshData, toMeshData } from "./geometry";
import type { MeshOperationKind, MeshOperationResult } from "./types";
import { useWorkspaceStore } from "../engine/workspace-store";
import { useDigitalModelStore } from "../digital-model/types";

export type MeshOperationOptions = { objectId: CadObjectId; meshKey: string; kind: MeshOperationKind; selectedFaces?: number[]; parameters?: Record<string, number | string>; signal?: AbortSignal };

export async function runMeshOperation(options: MeshOperationOptions): Promise<{ beforeRevision: number; afterRevision: number }> {
  const metadata = useWorkspaceStore.getState().objects.find((object) => object.id === options.objectId);
  if (metadata && (!metadata.editable || metadata.caseRole === "SOURCE" || metadata.caseWorkflowMetadata?.immutableSource === true)) throw new Error("Mesh editing is available only on an editable DESIGN or working object. The raw SOURCE is immutable.");
  const runtime = geometryRegistry.get(options.objectId);
  if (!runtime) throw new Error("Select an imported mesh object before editing.");
  const beforeRevision = runtime.geometryRevision;
  const entry = geometryRegistry.getMeshes(options.objectId).find(({ key }) => key === options.meshKey);
  if (!entry) throw new Error("Choose an editable mesh child in the Scene Tree.");
  const jobId = crypto.randomUUID();
  const worker = new Worker(new URL("./mesh-operation.worker.ts", import.meta.url), { type: "module", name: `prostheia-mesh-${jobId}` });
  try {
    const result = await new Promise<MeshOperationResult>((resolve, reject) => {
      const cleanup = () => { worker.removeEventListener("message", onMessage); worker.removeEventListener("error", onError); options.signal?.removeEventListener("abort", onAbort); };
      const finish = (callback: () => void) => { cleanup(); callback(); };
      const onMessage = (event: MessageEvent<{ jobId: string; result: MeshOperationResult }>) => { if (event.data?.jobId !== jobId) return; finish(() => resolve(event.data.result)); };
      const onError = () => finish(() => reject(new Error(`${label(options.kind)} failed because the mesh worker stopped unexpectedly.`)));
      const onAbort = () => finish(() => reject(new DOMException(`${label(options.kind)} cancelled.`, "AbortError")));
      worker.addEventListener("message", onMessage); worker.addEventListener("error", onError); options.signal?.addEventListener("abort", onAbort, { once: true });
      if (options.signal?.aborted) { onAbort(); return; }
      const mesh = toMeshData(entry.geometry);
      const transfer: Transferable[] = [mesh.positions.buffer, mesh.indices.buffer];
      if (mesh.normals) transfer.push(mesh.normals.buffer);
      if (mesh.colors) transfer.push(mesh.colors.buffer);
      worker.postMessage({ jobId, kind: options.kind, mesh, selectedFaces: options.selectedFaces, parameters: options.parameters }, transfer);
    });
    if (!result.ok) throw new Error(`${label(options.kind)} could not complete: ${result.message}`);
    if (geometryRegistry.get(options.objectId) !== runtime || runtime.geometryRevision !== beforeRevision) throw new Error(`${label(options.kind)} was discarded because the CAD object changed while the operation was running.`);
    if (!(result.mesh.positions instanceof Float32Array) || !(result.mesh.indices instanceof Uint32Array) || !result.mesh.normals || result.mesh.normals.length !== result.mesh.positions.length || !result.mesh.bounds || ![...result.mesh.bounds.min, ...result.mesh.bounds.max, ...result.mesh.bounds.center, result.mesh.bounds.radius].every(Number.isFinite)) throw new Error(`${label(options.kind)} cancelled because the worker returned invalid geometry data.`);
    const next = fromMeshData(result.mesh);
    if (!next.boundingBox || ![...next.boundingBox.min.toArray(), ...next.boundingBox.max.toArray(), next.boundingSphere?.radius ?? Number.NaN].every(Number.isFinite)) { next.dispose(); throw new Error(`${label(options.kind)} cancelled because bounds were invalid.`); }
    let afterRevision: number;
    try { afterRevision = geometryRegistry.installRevision(options.objectId, options.meshKey, next); }
    catch (error) { next.dispose(); throw error; }
    const model = useDigitalModelStore.getState();
    if (model.workingModelId === options.objectId) {
      const nextStage = options.kind === "trim" ? "trim" : options.kind === "fill-hole" ? "hole_fill" : ["cleanup", "delete", "smooth"].includes(options.kind) ? "cleanup" : null;
      const stageOrder = ["raw_scan", "trim", "cleanup", "hole_fill", "orientation", "base", "final"] as const;
      if (nextStage && stageOrder.indexOf(nextStage) > stageOrder.indexOf(model.stage)) useDigitalModelStore.setState({ stage: nextStage });
    }
    return { beforeRevision, afterRevision };
  } finally { worker.terminate(); }
}

function label(kind: MeshOperationKind) { return kind === "fill-hole" ? "Fill Hole" : kind === "delete" ? "Delete Selected" : kind[0].toUpperCase() + kind.slice(1); }

export function duplicateImportedObject(sourceId: CadObjectId) {
  const source = geometryRegistry.get(sourceId);
  if (!source) throw new Error("The selected imported object is no longer available.");
  const clone = source.object.clone(true);
  const overlays: THREE.Object3D[] = [];
  clone.traverse((child) => { if (child.userData.prostheiaSelectionOverlay) overlays.push(child); });
  for (const overlay of overlays) { overlay.parent?.remove(overlay); if (overlay instanceof THREE.Mesh) { overlay.geometry.dispose(); for (const material of Array.isArray(overlay.material) ? overlay.material : [overlay.material]) material.dispose(); } }
  clone.traverse((child) => { if (child instanceof THREE.Mesh) { child.geometry = child.geometry.clone(); child.material = cloneMaterials(child.material); } });
  return clone;
}

function cloneMaterials(material: THREE.Material | THREE.Material[]) {
  const clone = (source: THREE.Material) => { const result = source.clone(); for (const [key, value] of Object.entries(result)) if (value instanceof THREE.Texture) (result as unknown as Record<string, unknown>)[key] = value.clone(); return result; };
  return Array.isArray(material) ? material.map(clone) : clone(material);
}
