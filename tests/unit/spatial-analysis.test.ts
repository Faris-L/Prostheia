import * as THREE from "three";
import { afterEach, describe, expect, it } from "vitest";
import { computeSurfaceDistances, computeSurfaceIntersection } from "@/cad/analysis/analysis.worker";
import { pointDistanceMm, snapshotMesh, targetIsCurrent } from "@/cad/analysis/geometry";
import { geometryRegistry } from "@/cad/scene/geometry-registry";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import { cadObjectId } from "@/cad/types";

function triangle(offset: [number, number, number] = [0, 0, 0]) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0].map((v, i) => v + offset[i % 3]), 3));
  geometry.setIndex([0, 1, 2]); geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}
function register(name: string, offset: [number, number, number] = [0, 0, 0]) {
  const id = cadObjectId(`analysis-${name}-${crypto.randomUUID()}`); const root = new THREE.Group(); root.add(new THREE.Mesh(triangle(offset), new THREE.MeshStandardMaterial())); root.updateMatrixWorld(true);
  geometryRegistry.register({ id, role: "scan", name, object: root, ownsResources: true });
  useWorkspaceStore.getState().addImportedObject({ id, name, role: "scan", editable: true, transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }, visible: true, opacity: 1 });
  return { id, root };
}

afterEach(() => { for (const object of [...geometryRegistry.getAll()]) if (object.name.startsWith("analysis-")) { geometryRegistry.remove(object.id); useWorkspaceStore.getState().removeObject(object.id); } });

describe("Phase 10 spatial analysis", () => {
  it("measures point-to-point distance in workspace millimeters", () => { expect(pointDistanceMm([0, 0, 0], [3, 4, 0])).toBe(5); });

  it("computes known unsigned surface deviation with BVH closest-point queries", () => {
    const a = register("reference"); const b = register("target", [0, 0, 1]);
    const result = computeSurfaceDistances("deviation", snapshotMesh(a.id), snapshotMesh(b.id), 2);
    expect(result.sampleCount).toBe(3); expect(Array.from(result.values)).toEqual([1, 1, 1]); expect(result.minMm).toBe(1); expect(result.maxMm).toBe(1);
  });

  it("detects intersecting surface triangles and leaves separated triangles clear", () => {
    const a = register("intersect-a"); const crossing = register("intersect-b");
    crossing.root.rotation.y = Math.PI / 2; crossing.root.updateMatrixWorld(true);
    expect(computeSurfaceIntersection(snapshotMesh(a.id), snapshotMesh(crossing.id))).toBe(true);
    crossing.root.rotation.y = 0; crossing.root.position.z = 2; crossing.root.updateMatrixWorld(true);
    useWorkspaceStore.getState().applyTransform(crossing.id, { position: [0, 0, 2], rotation: [0, 0, 0], scale: [1, 1, 1] });
    expect(computeSurfaceIntersection(snapshotMesh(a.id), snapshotMesh(crossing.id))).toBe(false);
  });

  it("uses world transforms and makes a previous revision stale", () => {
    const a = register("transform"); const snapshot = snapshotMesh(a.id);
    expect(targetIsCurrent(snapshot)).toBe(true);
    useWorkspaceStore.getState().applyTransform(a.id, { position: [2, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] });
    a.root.position.x = 2; a.root.updateMatrixWorld(true);
    expect(targetIsCurrent(snapshot)).toBe(false);
    const moved = snapshotMesh(a.id); expect(moved.positions[0]).toBe(2);
    geometryRegistry.installRevision(a.id, "mesh-0", triangle([0, 0, 1]));
    expect(targetIsCurrent(moved)).toBe(false);
  });

  it("rejects invalid analysis thresholds rather than inventing values", () => {
    const a = register("invalid-a"); const b = register("invalid-b", [0, 0, 1]);
    expect(() => computeSurfaceDistances("contact", snapshotMesh(a.id), snapshotMesh(b.id), 0)).toThrow("greater than 0 mm");
  });

  it("rejects non-finite geometry before building a worker BVH", () => {
    const a = register("nan-a"); const b = register("nan-b"); const malformed = snapshotMesh(a.id); malformed.positions[0] = Number.NaN;
    expect(() => computeSurfaceDistances("deviation", malformed, snapshotMesh(b.id), 1)).toThrow("invalid or empty triangle geometry");
  });
});
