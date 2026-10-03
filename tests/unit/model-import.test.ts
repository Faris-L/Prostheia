import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import { GeometryRegistry } from "@/cad/scene/geometry-registry";
import { defaultUnitFor, importModel, makeDisplayName } from "@/cad/import/import-model";
import { detectModelFormat, isImportWorkerMessage, ModelImportError, validateImportFile } from "@/cad/import/model-importer";
import { convertPointToMillimeters, createUnitNormalization } from "@/cad/import/normalization";
import type { ImportWorkerRequest, ImportWorkerResponse } from "@/cad/import/types";

const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const payload = {
  meshes: [{ positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]).buffer, indices: null, indexType: null, normals: null, colors: null, colorItemSize: null, matrix: identity, materialColor: "#d8d6ce", vertexCount: 3, triangleCount: 1 }],
  sourceUnit: "mm" as const, unitScale: 1, dimensionsMm: [1, 1, 0] as [number, number, number], sourceBounds: { min: [0, 0, 0] as [number, number, number], max: [1, 1, 0] as [number, number, number] }, sourceOrigin: [0, 0, 0] as [number, number, number], vertexCount: 3, triangleCount: 1, warnings: ["orientation_unconfirmed" as const], originalToCanonical: identity,
};

class WorkerMock extends EventTarget {
  static instances: WorkerMock[] = [];
  terminated = false;
  constructor() { super(); WorkerMock.instances.push(this); }
  postMessage(request: ImportWorkerRequest) {
    queueMicrotask(() => this.dispatchEvent(new MessageEvent("message", { data: { type: "IMPORT_SUCCESS", jobId: request.jobId, payload } satisfies ImportWorkerResponse })));
  }
  terminate() { this.terminated = true; }
}

afterEach(() => {
  vi.unstubAllGlobals();
  WorkerMock.instances = [];
  useWorkspaceStore.getState().resetDemo();
});

describe("Phase 7 model import", () => {
  it("detects the supported formats and rejects unsupported, empty, and oversized files", () => {
    expect(["scan.stl", "scan.obj", "scan.ply", "scan.glb", "scan.gltf"].map(detectModelFormat)).toEqual(["stl", "obj", "ply", "glb", "gltf"]);
    expect(() => detectModelFormat("scan.exe")).toThrowError(ModelImportError);
    expect(() => validateImportFile({ name: "empty.stl", size: 0 })).toThrow(/empty/);
    expect(() => validateImportFile({ name: "huge.stl", size: 129 * 1024 * 1024 })).toThrow(/128 MB/);
    expect(defaultUnitFor("stl")).toBe("mm");
    expect(defaultUnitFor("glb")).toBe("m");
    expect(makeDisplayName("upper_scan-02.stl")).toBe("Upper Scan 02");
  });

  it("unit-normalizes coordinates without adding any origin translation", () => {
    const transform = createUnitNormalization(1);
    expect(transform[12]).toBe(0);
    expect(transform[13]).toBe(0);
    expect(transform[14]).toBe(0);
    expect(convertPointToMillimeters([100, 0, 0], 1)).toEqual([100, 0, 0]);
    expect(convertPointToMillimeters([120, 0, 0], 1)).toEqual([120, 0, 0]);
    expect(convertPointToMillimeters([12, 0, 0], 10)).toEqual([120, 0, 0]);
  });

  it("validates typed worker messages and rejects malformed geometry payloads", () => {
    const valid = { type: "IMPORT_SUCCESS", jobId: "job", payload } satisfies ImportWorkerResponse;
    expect(isImportWorkerMessage(valid, "job")).toBe(true);
    expect(isImportWorkerMessage({ ...valid, payload: { ...payload, originalToCanonical: [1, 2] } }, "job")).toBe(false);
    const invalidCoordinates = { ...payload, meshes: [{ ...payload.meshes[0], positions: new Float32Array([0, 0, 0, Number.NaN, 0, 0, 0, 1, 0]).buffer }] };
    expect(isImportWorkerMessage({ ...valid, payload: invalidCoordinates }, "job")).toBe(false);
    expect(isImportWorkerMessage({ ...valid, payload: { ...payload, dimensionsMm: [1, Number.POSITIVE_INFINITY, 0] } }, "job")).toBe(false);
    expect(isImportWorkerMessage({ type: "IMPORT_PROGRESS", jobId: "job", stage: "90-percent" }, "job")).toBe(false);
    expect(isImportWorkerMessage({ type: "IMPORT_ERROR", jobId: "job", code: "unknown", message: "bad" }, "job")).toBe(false);
  });

  it("registers same-name imports as independent runtime objects without putting geometry in Zustand", async () => {
    vi.stubGlobal("Worker", WorkerMock);
    const registry = new GeometryRegistry();
    const first = await importModel({ file: new File(["fixture"], "upper_scan.stl"), role: "maxilla", unit: "mm" });
    const second = await importModel({ file: new File(["fixture"], "upper_scan.stl"), role: "reference", unit: "mm" });
    expect(first.name).toBe("Upper Scan");
    expect(first.id).not.toBe(second.id);
    expect(first.metadata).toMatchObject({ sourceFileName: "upper_scan.stl", format: "stl", sourceUnit: "mm", unitScale: 1, vertexCount: 3, triangleCount: 1, recovery: "geometry_session_only" });
    expect(first.metadata.originalToCanonical).toHaveLength(16);
    expect(first.metadata.originalToCanonical.slice(12, 15)).toEqual([0, 0, 0]);
    expect(first.metadata.sourceBounds).toEqual({ min: [0, 0, 0], max: [1, 1, 0] });
    expect(first.object).toBeInstanceOf(THREE.Group);
    for (const imported of [first, second]) {
      registry.register({ id: imported.id, name: imported.name, role: imported.role, object: imported.object, ownsResources: true });
      useWorkspaceStore.getState().addImportedObject({ id: imported.id, name: imported.name, role: imported.role, editable: true, transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }, visible: true, opacity: 1, importSource: imported.metadata });
    }
    expect(registry.getAll()).toHaveLength(2);
    const stateObject = useWorkspaceStore.getState().objects.find((object) => object.id === first.id)!;
    expect(stateObject.importSource?.sourceFileName).toBe("upper_scan.stl");
    expect(stateObject).not.toHaveProperty("geometry");
    expect(stateObject).not.toHaveProperty("object");
    expect(WorkerMock.instances.every((worker) => worker.terminated)).toBe(true);
    registry.clear();
  });

  it("keeps 20 mm separation between models imported from the same source coordinate frame", async () => {
    class PositionedWorker extends WorkerMock {
      override postMessage(request: ImportWorkerRequest) {
        const x = request.file.name === "lower_scan.stl" ? 120 : 100;
        const positions = new Float32Array([x, 0, 0, x + 1, 0, 0, x, 1, 0]);
        const positionedPayload = {
          ...payload,
          meshes: [{ ...payload.meshes[0], positions: positions.buffer }],
          sourceBounds: { min: [x, 0, 0] as [number, number, number], max: [x + 1, 1, 0] as [number, number, number] },
          originalToCanonical: createUnitNormalization(1),
        };
        queueMicrotask(() => this.dispatchEvent(new MessageEvent("message", { data: { type: "IMPORT_SUCCESS", jobId: request.jobId, payload: positionedPayload } satisfies ImportWorkerResponse })));
      }
    }
    vi.stubGlobal("Worker", PositionedWorker);
    const upper = await importModel({ file: new File(["upper"], "upper_scan.stl"), role: "maxilla", unit: "mm" });
    const lower = await importModel({ file: new File(["lower"], "lower_scan.stl"), role: "mandible", unit: "mm" });
    const registry = new GeometryRegistry();
    for (const item of [upper, lower]) {
      registry.register({ id: item.id, name: item.name, role: item.role, object: item.object, ownsResources: true });
      useWorkspaceStore.getState().addImportedObject({ id: item.id, name: item.name, role: item.role, editable: true, transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }, visible: true, opacity: 1, importSource: item.metadata });
      item.object.updateMatrixWorld(true);
    }
    const firstVertexX = (object: THREE.Group) => {
      const renderRoot = object.children[0] as THREE.Group;
      const mesh = renderRoot.children[0] as THREE.Mesh;
      const point = new THREE.Vector3().fromBufferAttribute(mesh.geometry.getAttribute("position"), 0);
      return point.applyMatrix4(mesh.matrixWorld).x;
    };
    expect(firstVertexX(upper.object)).toBe(100);
    expect(firstVertexX(lower.object)).toBe(120);
    expect(firstVertexX(lower.object) - firstVertexX(upper.object)).toBe(20);
    expect(upper.object.position.toArray()).toEqual([0, 0, 0]);
    expect(lower.object.position.toArray()).toEqual([0, 0, 0]);
    expect(useWorkspaceStore.getState().objects.filter((object) => object.id === upper.id || object.id === lower.id).map((object) => object.transform.position)).toEqual([[0, 0, 0], [0, 0, 0]]);
    registry.clear();
  });

  it("terminates the worker after parser failure", async () => {
    class FailureWorker extends WorkerMock {
      override postMessage(request: ImportWorkerRequest) {
        queueMicrotask(() => this.dispatchEvent(new MessageEvent("message", { data: { type: "IMPORT_ERROR", jobId: request.jobId, code: "parse_failed", message: "bad mesh" } satisfies ImportWorkerResponse })));
      }
    }
    vi.stubGlobal("Worker", FailureWorker);
    await expect(importModel({ file: new File(["broken"], "broken.obj"), role: "scan", unit: "mm" })).rejects.toThrow(/Could not import/);
    expect(FailureWorker.instances[0].terminated).toBe(true);
  });
});
