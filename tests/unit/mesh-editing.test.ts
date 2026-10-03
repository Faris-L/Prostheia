import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cadObjectId } from "@/cad/types";
import { DuplicateObjectCommand, MeshOperationCommand } from "@/cad/engine/commands";
import { useHistoryStore } from "@/cad/engine/history-store";
import { geometryRegistry } from "@/cad/scene/geometry-registry";
import { fromMeshData, toMeshData, validateMeshData } from "@/cad/mesh/geometry";
import { applyMeshOperation } from "@/cad/mesh/mesh-operation.worker";
import { duplicateImportedObject, runMeshOperation } from "@/cad/mesh/run-operation";
import { useMeshSelectionStore } from "@/cad/mesh/selection-store";
import type { MeshData } from "@/cad/mesh/types";

const triangle: MeshData = { positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0]), indices: new Uint32Array([0, 1, 2, 1, 3, 2]) };
const tetraOpen: MeshData = { positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]), indices: new Uint32Array([0, 1, 3, 1, 2, 3, 2, 0, 3]) };

function registerFixture() {
  const id = cadObjectId(`mesh-test-${crypto.randomUUID()}`); const root = new THREE.Group(); root.add(new THREE.Mesh(fromMeshData(triangle), new THREE.MeshStandardMaterial()));
  geometryRegistry.register({ id, role: "scan", name: "Mesh test", object: root, ownsResources: true }); return id;
}

afterEach(() => { useHistoryStore.getState().clear(); useMeshSelectionStore.getState().clearSelection(); useMeshSelectionStore.getState().setMode("object"); });

class DeferredWorker {
  static latest: DeferredWorker;
  private listeners = new Map<string, Set<(event: MessageEvent) => void>>();
  jobId = "";
  terminated = false;
  constructor() { DeferredWorker.latest = this; }
  addEventListener(type: string, listener: (event: MessageEvent) => void) { const entries = this.listeners.get(type) ?? new Set(); entries.add(listener); this.listeners.set(type, entries); }
  removeEventListener(type: string, listener: (event: MessageEvent) => void) { this.listeners.get(type)?.delete(listener); }
  postMessage(message: { jobId: string }) { this.jobId = message.jobId; }
  terminate() { this.terminated = true; }
  respond(data: unknown) { for (const listener of this.listeners.get("message") ?? []) listener({ data } as MessageEvent); }
}

describe("mesh editing geometry core", () => {
  it("handles indexed and non-indexed geometry and computes bounds without recentering", () => {
    const indexed = fromMeshData(triangle); const indexedData = toMeshData(indexed);
    expect(indexedData.indices).toEqual(triangle.indices);
    const source = new THREE.BufferGeometry(); source.setAttribute("position", new THREE.Float32BufferAttribute([5, 7, 9, 6, 7, 9, 5, 8, 9], 3));
    const data = toMeshData(source); expect(data.indices).toEqual(new Uint32Array([0, 1, 2]));
    const bounds = new THREE.Box3().setFromBufferAttribute(source.getAttribute("position") as THREE.BufferAttribute);
    expect(bounds.min.toArray()).toEqual([5, 7, 9]); expect(data.positions[0]).toBe(5);
  });

  it("creates geometry revisions and restores exact content through command undo and redo", () => {
    const id = registerFixture(); const runtime = geometryRegistry.get(id)!; const mesh = geometryRegistry.getMeshes(id)[0];
    const before = runtime.geometryRevision; const changed = fromMeshData(applyMeshOperation({ kind: "delete", mesh: toMeshData(mesh.geometry), selectedFaces: [0] }));
    const after = geometryRegistry.installRevision(id, mesh.key, changed);
    const command = new MeshOperationCommand(id, before, after, "Delete Selected", () => undefined);
    useHistoryStore.getState().recordApplied(command);
    expect(geometryRegistry.get(id)?.geometryRevision).toBe(after); expect(mesh.mesh.geometry.index?.count).toBe(3);
    useHistoryStore.getState().undo();
    expect(geometryRegistry.get(id)?.geometryRevision).toBe(before); expect(mesh.mesh.geometry.index?.count).toBe(6);
    useHistoryStore.getState().redo();
    expect(geometryRegistry.get(id)?.geometryRevision).toBe(after); expect(mesh.mesh.geometry.index?.count).toBe(3);
    geometryRegistry.remove(id);
  });

  it("clears redo history on a new edit and releases unreachable revision geometry", () => {
    const id = registerFixture(); const mesh = geometryRegistry.getMeshes(id)[0]; const initial = geometryRegistry.get(id)!.geometryRevision;
    const one = geometryRegistry.installRevision(id, mesh.key, fromMeshData(applyMeshOperation({ kind: "delete", mesh: toMeshData(mesh.geometry), selectedFaces: [0] })));
    const abandonedGeometry = mesh.mesh.geometry; const dispose = vi.spyOn(abandonedGeometry, "dispose");
    useHistoryStore.getState().recordApplied(new MeshOperationCommand(id, initial, one, "Delete Selected", () => undefined));
    useHistoryStore.getState().undo();
    const two = geometryRegistry.installRevision(id, mesh.key, fromMeshData(applyMeshOperation({ kind: "smooth", mesh: toMeshData(mesh.mesh.geometry), parameters: { iterations: 1 } })));
    useHistoryStore.getState().recordApplied(new MeshOperationCommand(id, initial, two, "Smooth Mesh", () => undefined));
    expect(useHistoryStore.getState().redoStack).toHaveLength(0); expect(dispose).toHaveBeenCalled();
    geometryRegistry.remove(id);
  });

  it("stores face selection as lightweight mesh and face indices", () => {
    const store = useMeshSelectionStore.getState(); store.setMode("face"); store.selectFace("mesh-0", 4, false); store.selectFace("mesh-0", 7, true);
    expect(useMeshSelectionStore.getState().faceIndices).toEqual([4, 7]);
  });

  it("deletes selected faces and rejects a delete with no selection", () => {
    const result = applyMeshOperation({ kind: "delete", mesh: triangle, selectedFaces: [1] });
    expect(result.indices).toEqual(new Uint32Array([0, 1, 2])); expect(result.indices.length / 3).toBe(1);
    expect(() => applyMeshOperation({ kind: "delete", mesh: triangle })).toThrow("Select at least one");
  });

  it("trims geometry at a plane while retaining connected indexed output", () => {
    const mesh: MeshData = { positions: new Float32Array([0, 0, -1, 1, 0, 1, 0, 1, 1, 1, 1, -1]), indices: new Uint32Array([0, 1, 2, 0, 2, 3]) };
    const trimmed = applyMeshOperation({ kind: "trim", mesh, parameters: { nx: 0, ny: 0, nz: 1, offset: 0 } });
    expect(trimmed.indices.length).toBeGreaterThan(0); expect(trimmed.positions.some((_, i) => i % 3 === 2 && Math.abs(trimmed.positions[i]) < 1e-6)).toBe(true);
    expect(validateMeshData(trimmed)).toBeNull();
  });

  it("fills a simple boundary and rejects branching boundaries", () => {
    const filled = applyMeshOperation({ kind: "fill-hole", mesh: tetraOpen });
    expect(filled.indices.length / 3).toBe(4); expect(validateMeshData(filled)).toBeNull();
    const edgeCounts = new Map<string, number>();
    for (let i = 0; i < filled.indices.length; i += 3) for (const [a, b] of [[filled.indices[i], filled.indices[i + 1]], [filled.indices[i + 1], filled.indices[i + 2]], [filled.indices[i + 2], filled.indices[i]]] as const) { const key = a < b ? `${a}:${b}` : `${b}:${a}`; edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1); }
    expect([...edgeCounts.values()].every((count) => count === 2)).toBe(true);
    const branching: MeshData = { positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, -1, 0, 0, 0, -1, 0]), indices: new Uint32Array([0, 1, 2, 0, 3, 4]) };
    expect(() => applyMeshOperation({ kind: "fill-hole", mesh: branching })).toThrow(/branching|non-manifold/i);
  });

  it("smooths and cleans topology then returns renderable normals", () => {
    const smoothed = applyMeshOperation({ kind: "smooth", mesh: triangle, parameters: { iterations: 1 } });
    const geometry = fromMeshData(smoothed); expect(geometry.getAttribute("normal").array.every(Number.isFinite)).toBe(true);
    const dirty: MeshData = { positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 2, 0, 0]), indices: new Uint32Array([0, 0, 1, 0, 1, 2]) };
    const cleaned = applyMeshOperation({ kind: "cleanup", mesh: dirty }); expect(cleaned.indices.length / 3).toBe(1); expect(cleaned.positions.length / 3).toBe(3);
  });

  it("mirrors coordinates with corrected winding and rejects invalid output", () => {
    const result = applyMeshOperation({ kind: "mirror", mesh: triangle, parameters: { axis: "x" } });
    expect(result.positions[3]).toBe(-1); expect(result.indices.slice(0, 3)).toEqual(new Uint32Array([0, 2, 1])); expect(validateMeshData(result)).toBeNull();
    expect(validateMeshData({ positions: new Float32Array([0, 0, 0]), indices: new Uint32Array([9, 0, 0]) })).toContain("malformed");
  });

  it("leaves the installed revision untouched when operation validation fails", () => {
    const id = registerFixture(); const revision = geometryRegistry.get(id)!.geometryRevision; const original = geometryRegistry.getMeshes(id)[0].geometry;
    expect(() => applyMeshOperation({ kind: "delete", mesh: toMeshData(original), selectedFaces: [] })).toThrow();
    expect(geometryRegistry.get(id)!.geometryRevision).toBe(revision); expect(geometryRegistry.getMeshes(id)[0].geometry).toBe(original);
    geometryRegistry.remove(id);
  });

  it("discards a mesh worker result after the workspace replaces the object", async () => {
    vi.stubGlobal("Worker", DeferredWorker);
    const id = cadObjectId(`mesh-race-${crypto.randomUUID()}`);
    const createObject = () => { const root = new THREE.Group(); root.add(new THREE.Mesh(fromMeshData(triangle), new THREE.MeshStandardMaterial())); return root; };
    geometryRegistry.register({ id, role: "scan", name: "Original", object: createObject(), ownsResources: false });
    const pending = runMeshOperation({ objectId: id, meshKey: "mesh-0", kind: "smooth" });
    const worker = DeferredWorker.latest;
    geometryRegistry.clear();
    const replacement = createObject();
    geometryRegistry.register({ id, role: "scan", name: "Replacement", object: replacement, ownsResources: false });
    const replacementGeometry = geometryRegistry.getMeshes(id)[0].geometry;
    worker.respond({ jobId: worker.jobId, result: { ok: true, mesh: applyMeshOperation({ kind: "smooth", mesh: triangle }) } });
    await expect(pending).rejects.toThrow(/object changed while the operation was running/i);
    expect(geometryRegistry.getMeshes(id)[0].geometry).toBe(replacementGeometry);
    expect(worker.terminated).toBe(true);
    geometryRegistry.clear();
  });

  it("updates counts and bounds after a geometry revision", () => {
    const id = registerFixture(); const entry = geometryRegistry.getMeshes(id)[0];
    const moved: MeshData = { ...triangle, positions: new Float32Array([5, 7, 9, 6, 7, 9, 5, 8, 9, 6, 8, 9]) };
    geometryRegistry.installRevision(id, entry.key, fromMeshData(moved));
    const stats = geometryRegistry.stats(id);
    expect(stats).toMatchObject({ vertexCount: 4, triangleCount: 2, revision: 1, dirty: true }); expect(stats.boundsMm).toEqual([1, 1, 0]);
    expect(entry.mesh.geometry.getAttribute("position").getX(0)).toBe(5);
    geometryRegistry.remove(id);
  });

  it("duplicates an imported object with independent resources and undoable identity", () => {
    const sourceId = registerFixture(); const id = cadObjectId(`duplicate-test-${crypto.randomUUID()}`);
    const duplicate = duplicateImportedObject(sourceId);
    const sourceMesh = geometryRegistry.getMeshes(sourceId)[0].mesh; let duplicateMesh: THREE.Mesh | null = null; duplicate.traverse((child) => { if (child instanceof THREE.Mesh) duplicateMesh = child; });
    expect(duplicateMesh).toBeInstanceOf(THREE.Mesh);
    expect(duplicateMesh!.geometry).not.toBe(sourceMesh.geometry);
    const metadata = { id, name: "Mesh test copy", role: "scan" as const, editable: true, transform: { position: [0, 0, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], scale: [1, 1, 1] as [number, number, number] }, visible: true, opacity: 1 };
    useHistoryStore.getState().execute(new DuplicateObjectCommand(metadata, duplicate));
    expect(geometryRegistry.get(id)).toBeDefined(); useHistoryStore.getState().undo(); expect(geometryRegistry.get(id)).toBeUndefined();
    useHistoryStore.getState().redo(); expect(geometryRegistry.get(id)?.id).toBe(id);
    geometryRegistry.remove(sourceId); geometryRegistry.remove(id);
  });
});
