import * as THREE from "three";
import type { CadObjectId, CadObjectRole } from "../types";
import { acceleratedRaycast, computeBoundsTree, disposeBoundsTree } from "three-mesh-bvh";

type BvhGeometry = THREE.BufferGeometry & { computeBoundsTree: typeof computeBoundsTree; disposeBoundsTree: typeof disposeBoundsTree; boundsTree?: unknown };
THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

export type CadRuntimeObject = {
  id: CadObjectId;
  role: CadObjectRole;
  name: string;
  object: THREE.Object3D;
  geometryRevision: number;
  dirty: boolean;
  createdAt: number;
  ownsResources: boolean;
  revisions: Map<number, Map<string, THREE.BufferGeometry>>;
  revisionPins: Map<number, number>;
  originalRevision: number;
};

export const MAX_MESH_HISTORY_BYTES = 128 * 1024 * 1024;
const disposedGeometries = new WeakSet<THREE.BufferGeometry>();

/** Runtime Three.js objects live here, outside React and Zustand state. Set ownsResources only when this registry is their exclusive resource owner. */
export class GeometryRegistry {
  private readonly objects = new Map<CadObjectId, CadRuntimeObject>();
  private readonly detachedObjects = new Map<CadObjectId, CadRuntimeObject>();

  get(id: CadObjectId) { return this.objects.get(id); }
  getAll() { return [...this.objects.values()]; }

  getMeshes(id: CadObjectId) {
    const runtime = this.objects.get(id);
    if (!runtime) return [];
    const result: { key: string; mesh: THREE.Mesh; geometry: THREE.BufferGeometry }[] = [];
    let index = 0;
    runtime.object.traverse((child) => {
      if (!(child instanceof THREE.Mesh) || child.userData.prostheiaSelectionOverlay) return;
      const key = String(child.userData.prostheiaMeshId ?? `mesh-${index++}`);
      child.userData.prostheiaMeshId = key;
      const geometry = runtime.revisions.get(runtime.geometryRevision)?.get(key) ?? child.geometry;
      result.push({ key, mesh: child, geometry });
    });
    return result;
  }

  installRevision(id: CadObjectId, key: string, geometry: THREE.BufferGeometry) {
    const runtime = this.objects.get(id);
    if (!runtime) throw new Error("The selected CAD object is no longer available.");
    const current = runtime.revisions.get(runtime.geometryRevision);
    if (!current?.has(key)) throw new Error("The selected mesh child is no longer available.");
    const nextRevision = Math.max(...runtime.revisions.keys()) + 1;
    const next = new Map(current);
    next.set(key, geometry);
    runtime.revisions.set(nextRevision, next);
    runtime.geometryRevision = nextRevision;
    runtime.dirty = true;
    for (const entry of this.getMeshes(id)) entry.mesh.geometry = next.get(entry.key)!;
    scheduleBoundsTree(geometry);
    runtime.object.updateMatrixWorld(true);
    return nextRevision;
  }

  setRevision(id: CadObjectId, revision: number) {
    const runtime = this.objects.get(id);
    const geometries = runtime?.revisions.get(revision);
    if (!runtime || !geometries) throw new Error("This mesh history revision is no longer available.");
    runtime.geometryRevision = revision;
    for (const entry of this.getMeshes(id)) { const geometry = geometries.get(entry.key); if (geometry) entry.mesh.geometry = geometry; }
    runtime.dirty = revision !== runtime.originalRevision;
    runtime.object.updateMatrixWorld(true);
  }

  pinRevision(id: CadObjectId, revision: number) { const runtime = this.objects.get(id); if (runtime?.revisions.has(revision)) runtime.revisionPins.set(revision, (runtime.revisionPins.get(revision) ?? 0) + 1); }
  unpinRevision(id: CadObjectId, revision: number) {
    const runtime = this.objects.get(id); if (!runtime || revision === runtime.originalRevision || revision === runtime.geometryRevision) return;
    const count = (runtime.revisionPins.get(revision) ?? 0) - 1;
    if (count > 0) { runtime.revisionPins.set(revision, count); return; }
    runtime.revisionPins.delete(revision);
    const removed = runtime.revisions.get(revision); runtime.revisions.delete(revision);
    if (removed) this.disposeUnreferenced(runtime, removed);
  }

  revisionBytes(id: CadObjectId, revision: number) {
    const runtime = this.objects.get(id); const geometries = runtime?.revisions.get(revision); if (!geometries) return 0;
    return [...geometries.values()].reduce((total, geometry) => total + geometryByteSize(geometry), 0);
  }

  stats(id: CadObjectId) {
    const meshes = this.getMeshes(id);
    let vertexCount = 0, triangleCount = 0;
    const bounds = new THREE.Box3(); const root = this.objects.get(id)?.object; root?.updateWorldMatrix(true, true);
    const rootInverse = root ? new THREE.Matrix4().copy(root.matrixWorld).invert() : new THREE.Matrix4();
    for (const { mesh, geometry } of meshes) { const position = geometry.getAttribute("position"); vertexCount += position?.count ?? 0; triangleCount += geometry.index ? Math.floor(geometry.index.count / 3) : Math.floor((position?.count ?? 0) / 3); if (!geometry.boundingBox) geometry.computeBoundingBox(); if (geometry.boundingBox) { const relative = new THREE.Matrix4().multiplyMatrices(rootInverse, mesh.matrixWorld); bounds.union(geometry.boundingBox.clone().applyMatrix4(relative)); } }
    const size = bounds.getSize(new THREE.Vector3());
    const runtime = this.objects.get(id);
    return { vertexCount, triangleCount, boundsMm: [size.x, size.y, size.z] as [number, number, number], revision: runtime?.geometryRevision ?? 0, dirty: runtime?.dirty ?? false };
  }

  register(runtime: Omit<CadRuntimeObject, "geometryRevision" | "dirty" | "createdAt" | "revisions" | "revisionPins" | "originalRevision"> & Partial<Pick<CadRuntimeObject, "geometryRevision" | "dirty" | "createdAt">>) {
    const previous = this.objects.get(runtime.id) ?? this.detachedObjects.get(runtime.id);
    if (previous && previous.object !== runtime.object && previous.ownsResources) disposeRuntimeResources(previous.object, previous.revisions);
    this.detachedObjects.delete(runtime.id);
    this.objects.set(runtime.id, this.createRuntimeEntry(runtime, previous));
  }

  /** Swaps a prepared case into the registry and disposes the old case after workspace commit. */
  replaceAllAtomically(
    runtimes: Array<Omit<CadRuntimeObject, "geometryRevision" | "dirty" | "createdAt" | "revisions" | "revisionPins" | "originalRevision"> & Partial<Pick<CadRuntimeObject, "geometryRevision" | "dirty" | "createdAt">>>,
    commitWorkspace: () => void,
  ) {
    const ids = new Set<CadObjectId>();
    for (const runtime of runtimes) {
      if (ids.has(runtime.id)) throw new Error(`The staged case contains duplicate runtime object id "${runtime.id}".`);
      ids.add(runtime.id);
    }
    const stagedEntries = new Map<CadObjectId, CadRuntimeObject>();
    try {
      for (const runtime of runtimes) stagedEntries.set(runtime.id, this.createRuntimeEntry(runtime));
    } catch (error) {
      for (const runtime of stagedEntries.values()) if (runtime.ownsResources) disposeRuntimeResources(runtime.object, runtime.revisions);
      throw error;
    }
    const previousObjects = new Map(this.objects);
    const previousDetached = new Map(this.detachedObjects);
    this.objects.clear();
    this.detachedObjects.clear();
    for (const [id, runtime] of stagedEntries) this.objects.set(id, runtime);
    try {
      commitWorkspace();
    } catch (error) {
      this.objects.clear();
      for (const [id, runtime] of previousObjects) this.objects.set(id, runtime);
      this.detachedObjects.clear();
      for (const [id, runtime] of previousDetached) this.detachedObjects.set(id, runtime);
      for (const runtime of stagedEntries.values()) if (runtime.ownsResources) disposeRuntimeResources(runtime.object, runtime.revisions);
      throw error;
    }
    for (const runtime of previousObjects.values()) if (runtime.ownsResources) safelyDisposeRuntime(runtime);
    for (const runtime of previousDetached.values()) if (runtime.ownsResources) safelyDisposeRuntime(runtime);
  }

  private createRuntimeEntry(
    runtime: Omit<CadRuntimeObject, "geometryRevision" | "dirty" | "createdAt" | "revisions" | "revisionPins" | "originalRevision"> & Partial<Pick<CadRuntimeObject, "geometryRevision" | "dirty" | "createdAt">>,
    previous?: CadRuntimeObject,
  ): CadRuntimeObject {
    const revisions = previous?.revisions ?? new Map<number, Map<string, THREE.BufferGeometry>>();
    const revision = runtime.geometryRevision ?? previous?.geometryRevision ?? 0;
    if (!revisions.has(revision)) {
      const geometries = new Map<string, THREE.BufferGeometry>(); let index = 0;
      runtime.object.traverse((child) => { if (child instanceof THREE.Mesh && !child.userData.prostheiaSelectionOverlay) { const key = String(child.userData.prostheiaMeshId ?? `mesh-${index++}`); child.userData.prostheiaMeshId = key; geometries.set(key, child.geometry); scheduleBoundsTree(child.geometry); } });
      revisions.set(revision, geometries);
    }
    return {
      ...runtime,
      geometryRevision: revision,
      dirty: runtime.dirty ?? previous?.dirty ?? false,
      createdAt: runtime.createdAt ?? previous?.createdAt ?? Date.now(),
      revisions,
      revisionPins: previous?.revisionPins ?? new Map(),
      originalRevision: previous?.originalRevision ?? revision,
    };
  }

  markDirty(id: CadObjectId) {
    const runtime = this.objects.get(id);
    if (!runtime) return;
    runtime.dirty = true;
    runtime.geometryRevision += 1;
    runtime.dirty = true;
  }

  markCloudSaved(id: CadObjectId) {
    const runtime = this.objects.get(id);
    if (runtime) runtime.dirty = false;
  }

  remove(id: CadObjectId, dispose = true) {
    const runtime = this.objects.get(id);
    if (!runtime) return;
    this.objects.delete(id);
    if (dispose) { this.detachedObjects.delete(id); if (runtime.ownsResources) disposeRuntimeResources(runtime.object, runtime.revisions); }
    else this.detachedObjects.set(id, runtime);
  }

  clear() { for (const id of this.objects.keys()) this.remove(id); for (const runtime of this.detachedObjects.values()) if (runtime.ownsResources) disposeRuntimeResources(runtime.object, runtime.revisions); this.detachedObjects.clear(); }

  disposeObject(object: THREE.Object3D) { disposeOwnedResources(object); }
  disposeDetached(id: CadObjectId) { const runtime = this.detachedObjects.get(id); if (!runtime) return; this.detachedObjects.delete(id); if (runtime.ownsResources) disposeRuntimeResources(runtime.object, runtime.revisions); }

  private disposeUnreferenced(runtime: CadRuntimeObject, removed: Map<string, THREE.BufferGeometry>) {
    const inUse = new Set([...runtime.revisions.values()].flatMap((map) => [...map.values()]));
    for (const geometry of new Set(removed.values())) if (!inUse.has(geometry)) disposeGeometry(geometry);
  }
}

function geometryByteSize(geometry: THREE.BufferGeometry) {
  let total = geometry.index?.array.byteLength ?? 0;
  for (const key of Object.keys(geometry.attributes)) total += geometry.getAttribute(key).array.byteLength;
  const tree = (geometry as BvhGeometry).boundsTree as { _roots?: ArrayBuffer[]; _indirectBuffer?: ArrayBufferView | null } | undefined;
  const builtTreeBytes = (tree?._roots?.reduce((sum, root) => sum + root.byteLength, 0) ?? 0) + (tree?._indirectBuffer?.byteLength ?? 0);
  return total + Math.max(builtTreeBytes, Math.ceil(total * 0.25));
}

function scheduleBoundsTree(geometry: THREE.BufferGeometry) {
  if (disposedGeometries.has(geometry)) return;
  if ((geometry as BvhGeometry).boundsTree) return;
  const build = () => { if (!disposedGeometries.has(geometry) && !(geometry as BvhGeometry).boundsTree && geometry.getAttribute("position")?.count) (geometry as BvhGeometry).computeBoundsTree({ maxLeafSize: 12 }); };
  if (typeof window !== "undefined" && "requestIdleCallback" in window) window.requestIdleCallback(build, { timeout: 1500 });
  else setTimeout(build, 0);
}
function disposeGeometry(geometry: THREE.BufferGeometry) { disposedGeometries.add(geometry); (geometry as BvhGeometry).disposeBoundsTree?.(); geometry.dispose(); }

function disposeOwnedResources(object: THREE.Object3D) {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || child.userData.prostheiaSelectionOverlay) return;
    geometries.add(child.geometry);
    for (const material of (Array.isArray(child.material) ? child.material : [child.material])) {
      materials.add(material);
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value);
    }
  });
  for (const texture of textures) texture.dispose();
  for (const material of materials) material.dispose();
  for (const geometry of geometries) disposeGeometry(geometry);
}

function disposeRuntimeResources(object: THREE.Object3D, revisions: Map<number, Map<string, THREE.BufferGeometry>>) {
  const geometries = new Set([...revisions.values()].flatMap((map) => [...map.values()]));
  object.traverse((child) => { if (child instanceof THREE.Mesh) geometries.add(child.geometry); });
  for (const geometry of geometries) disposeGeometry(geometry);
  const materials = new Set<THREE.Material>(); const textures = new Set<THREE.Texture>();
  object.traverse((child) => { if (!(child instanceof THREE.Mesh)) return; for (const material of (Array.isArray(child.material) ? child.material : [child.material])) { materials.add(material); for (const value of Object.values(material)) if (value instanceof THREE.Texture) textures.add(value); } });
  for (const texture of textures) texture.dispose(); for (const material of materials) material.dispose();
}

function safelyDisposeRuntime(runtime: CadRuntimeObject) {
  try { disposeRuntimeResources(runtime.object, runtime.revisions); }
  catch (error) { console.warn("A replaced CAD case resource could not be fully disposed.", error); }
}

export const geometryRegistry = new GeometryRegistry();
