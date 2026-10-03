import * as THREE from "three";
import { afterEach, describe, expect, it } from "vitest";
import { useHistoryStore } from "@/cad/engine/history-store";
import { geometryRegistry } from "@/cad/scene/geometry-registry";
import { applyBrushSample, findBrushNeighborhood, type SculptTool } from "@/cad/sculpt/brush";
import { applySculptPoint, beginSculptStroke, cancelSculptStroke, commitSculptStroke } from "@/cad/sculpt/stroke";
import { cadObjectId } from "@/cad/types";

const square = () => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0], 3));
  geometry.setIndex([0, 1, 2, 1, 3, 2]);
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
  geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
};

function brush(geometry: THREE.BufferGeometry, tool: SculptTool, center = new THREE.Vector3(0.5, 0.5, 0), radius = 1, strength = 1, normal = new THREE.Vector3(0, 0, 1), displacement = new THREE.Vector3()) {
  const neighborhood = findBrushNeighborhood(geometry, center, radius);
  applyBrushSample(geometry, neighborhood, center, normal, { radiusMm: radius, strength }, tool, displacement);
  return neighborhood;
}

function register() {
  const id = cadObjectId(`sculpt-${crypto.randomUUID()}`);
  const root = new THREE.Group(); const mesh = new THREE.Mesh(square(), new THREE.MeshStandardMaterial()); root.add(mesh); root.updateMatrixWorld(true);
  geometryRegistry.register({ id, role: "scan", name: "Sculpt test", object: root, ownsResources: true });
  return { id, root, mesh };
}

afterEach(() => { useHistoryStore.getState().clear(); for (const entry of geometryRegistry.getAll()) if (entry.name === "Sculpt test") geometryRegistry.remove(entry.id); });

describe("sculpt brush math", () => {
  it("adds outward with smooth radial falloff and leaves vertices outside radius unchanged", () => {
    const geometry = square(); const before = Float32Array.from(geometry.getAttribute("position").array);
    const neighborhood = brush(geometry, "add", new THREE.Vector3(0, 0, 0), 1.5);
    const positions = geometry.getAttribute("position");
    expect(positions.getZ(0)).toBeGreaterThan(before[2]);
    expect(positions.getZ(0)).toBeGreaterThan(positions.getZ(3));
    expect(neighborhood.vertices).toContain(0);
    const outsideGeometry = square(); const outsideBefore = outsideGeometry.getAttribute("position").getZ(3);
    brush(outsideGeometry, "add", new THREE.Vector3(0, 0, 0), 1.01);
    expect(outsideGeometry.getAttribute("position").getZ(3)).toBe(outsideBefore);
  });

  it("removes in the direction inverse to Add", () => {
    const add = square(), remove = square();
    brush(add, "add"); brush(remove, "remove");
    expect(add.getAttribute("position").getZ(0)).toBeGreaterThan(0);
    expect(remove.getAttribute("position").getZ(0)).toBeLessThan(0);
  });

  it("smooths local irregularity while leaving outside vertices untouched", () => {
    const geometry = square(); const position = geometry.getAttribute("position"); position.setZ(0, 0.7); position.needsUpdate = true;
    const outsideBefore = [position.getX(3), position.getY(3), position.getZ(3)];
    const beforeVariation = Math.abs(position.getZ(0) - position.getZ(1)) + Math.abs(position.getZ(0) - position.getZ(2));
    brush(geometry, "smooth", new THREE.Vector3(0, 0, 0.7), 1.01, 1);
    const after = geometry.getAttribute("position");
    const afterVariation = Math.abs(after.getZ(0) - after.getZ(1)) + Math.abs(after.getZ(0) - after.getZ(2));
    expect(afterVariation).toBeLessThan(beforeVariation);
    expect([after.getX(3), after.getY(3), after.getZ(3)]).toEqual(outsideBefore);
  });

  it("flattens toward a local plane and applies morph drag with radial falloff", () => {
    const flattened = square(); const position = flattened.getAttribute("position");
    for (let i = 0; i < position.count; i++) position.setZ(i, i + 1);
    position.needsUpdate = true;
    brush(flattened, "flatten", new THREE.Vector3(0.5, 0.5, 0), 2, 1);
    expect(Math.abs(flattened.getAttribute("position").getZ(0))).toBeLessThan(1);
    const morphed = square();
    const beforeMorph = Float32Array.from(morphed.getAttribute("position").array);
    brush(morphed, "morph", new THREE.Vector3(0, 0, 0), 1.5, 1, new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0));
    const result = morphed.getAttribute("position");
    expect(result.getX(0)).toBeGreaterThan(beforeMorph[0]); expect(result.getX(0) - beforeMorph[0]).toBeGreaterThan(result.getX(3) - beforeMorph[9]);
  });
});

describe("sculpt stroke transactions", () => {
  it("keeps sparse pointer paths close to the same path with denser pointer events", () => {
    const sparse = register(), dense = register();
    const sparseStroke = beginSculptStroke(sparse.id, "mesh-0", "add", { radiusMm: 1.5, strength: 0.7 });
    const denseStroke = beginSculptStroke(dense.id, "mesh-0", "add", { radiusMm: 1.5, strength: 0.7 });
    for (const x of [0, 1]) applySculptPoint(sparseStroke, new THREE.Vector3(x, 0, 0), new THREE.Vector3(0, 0, 1));
    for (const x of [0, 0.25, 0.5, 0.75, 1]) applySculptPoint(denseStroke, new THREE.Vector3(x, 0, 0), new THREE.Vector3(0, 0, 1));
    commitSculptStroke(sparseStroke); commitSculptStroke(denseStroke);
    const sparsePositions = sparse.mesh.geometry.getAttribute("position").array;
    const densePositions = dense.mesh.geometry.getAttribute("position").array;
    expect(sparsePositions.length).toBe(densePositions.length);
    for (let i = 0; i < sparsePositions.length; i++) expect(sparsePositions[i]).toBeCloseTo(densePositions[i], 5);
  });

  it("interpolates sparse paths and commits a whole stroke as one undoable revision", () => {
    const { id, mesh } = register(); const before = Float32Array.from(mesh.geometry.getAttribute("position").array);
    const stroke = beginSculptStroke(id, "mesh-0", "add", { radiusMm: 1.5, strength: 0.8 });
    applySculptPoint(stroke, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1));
    applySculptPoint(stroke, new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 1));
    const revision = commitSculptStroke(stroke);
    expect(revision).toBe(1); expect(useHistoryStore.getState().undoStack).toHaveLength(1);
    const after = Float32Array.from(mesh.geometry.getAttribute("position").array);
    expect(after).not.toEqual(before);
    useHistoryStore.getState().undo(); expect(mesh.geometry.getAttribute("position").array).toEqual(before);
    useHistoryStore.getState().redo(); expect(mesh.geometry.getAttribute("position").array).toEqual(after);
  });

  it("cancels without a revision or command and rejects invalid output without corrupting source", () => {
    const { id, mesh } = register(); const original = mesh.geometry; const before = Float32Array.from(original.getAttribute("position").array);
    const cancelled = beginSculptStroke(id, "mesh-0", "add", { radiusMm: 1, strength: 1 });
    applySculptPoint(cancelled, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1)); cancelSculptStroke(cancelled);
    expect(mesh.geometry).toBe(original); expect(useHistoryStore.getState().undoStack).toHaveLength(0);
    const failed = beginSculptStroke(id, "mesh-0", "add", { radiusMm: 1, strength: 1 });
    applySculptPoint(failed, new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, 1));
    failed.working.getAttribute("position").array[0] = Number.NaN;
    expect(() => commitSculptStroke(failed)).toThrow("Sculpt operation could not be applied to this mesh.");
    expect(geometryRegistry.get(id)?.geometryRevision).toBe(0);
    expect(mesh.geometry.getAttribute("position").array).toEqual(before);
    expect(useHistoryStore.getState().undoStack).toHaveLength(0);
  });
});
