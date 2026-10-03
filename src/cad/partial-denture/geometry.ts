import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import type { KennedyClass, PartialComponentKind } from "./types";
import { positionForTooth } from "../denture/geometry";

const componentMaterials = () => ({
  metal: new THREE.MeshStandardMaterial({ color: "#aebbc7", metalness: 0.72, roughness: 0.3 }),
  resin: new THREE.MeshStandardMaterial({ color: "#d58680", roughness: 0.65, transparent: true, opacity: 0.7, side: THREE.DoubleSide }),
  guide: new THREE.MeshStandardMaterial({ color: "#d4a454", roughness: 0.5 }),
});

export function partialDentureMissingTeeth(klass: KennedyClass) {
  switch (klass) {
    case "I": return [36, 37, 38, 46, 47, 48];
    case "II": return [46, 47, 48];
    case "III": return [36, 37];
    case "IV": return [31, 32, 41, 42];
  }
}

export function partialDentureAbutments(klass: KennedyClass) {
  switch (klass) {
    case "I": return [35, 45];
    case "II": return [45];
    case "III": return [35, 38];
    case "IV": return [33, 43];
  }
}

function tube(points: [number, number, number][], radius: number, tubularSegments = 48) {
  const path = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
  return new THREE.TubeGeometry(path, tubularSegments, radius, 8, false);
}

export function createPartialComponentGeometry(kind: PartialComponentKind, path: [number, number, number][], index = 0) {
  const material = componentMaterials();
  const root = new THREE.Group();
  root.name = `Synthetic ${kind.replaceAll("_", " ")} component`;
  const fallback: [number, number, number][] = [[-6, 3, 2 + index], [0, 5, 2 + index], [6, 3, 2 + index]];
  const coords: [number, number, number][] = path.length >= 2 ? path : fallback;
  if (kind === "major_connector" || kind === "lingual_bar" || kind === "minor_connector" || kind === "clasp" || kind === "finish_line") {
    const radius = kind === "major_connector" ? 1.05 : kind === "lingual_bar" ? 0.8 : kind === "clasp" ? 0.34 : kind === "finish_line" ? 0.2 : 0.55;
    const mesh = new THREE.Mesh(tube(coords, radius), kind === "finish_line" ? material.guide : material.metal);
    mesh.userData.prostheiaMeshId = `partial-${kind}`;
    root.add(mesh);
  } else if (kind === "retention_mesh") {
    const defaultMesh: [number, number, number][] = [[-10, 9, -0.5], [10, 9, -0.5], [0, 14, -0.5]];
    const [left, right, back] = coords.length >= 3 ? coords : defaultMesh;
    const strips: THREE.BufferGeometry[] = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const a = new THREE.Vector3(...left).lerp(new THREE.Vector3(...right), t);
      const b = new THREE.Vector3(...left).lerp(new THREE.Vector3(...back), t);
      const c = new THREE.Vector3(...right).lerp(new THREE.Vector3(...back), t);
      strips.push(tube([a.toArray() as [number, number, number], b.toArray() as [number, number, number]], 0.13, 12));
      if (i < 8) strips.push(tube([b.toArray() as [number, number, number], c.toArray() as [number, number, number]], 0.13, 12));
    }
    const merged = mergeGeometries(strips, false);
    strips.forEach((geometry) => geometry.dispose());
    if (!merged) throw new Error("The synthetic retention mesh could not be assembled.");
    const mesh = new THREE.Mesh(merged, material.metal); mesh.userData.prostheiaMeshId = "partial-retention-mesh"; root.add(mesh);
  } else if (kind === "rest" || kind === "guide_plane" || kind === "relief") {
    const point = coords[0];
    const geometry = kind === "rest" ? new THREE.SphereGeometry(1, 16, 10) : new THREE.BoxGeometry(kind === "guide_plane" ? 1.8 : 2.4, 3.4, kind === "relief" ? 0.35 : 1.15);
    if (kind === "rest") geometry.scale(1.35, 1.05, 0.55);
    const mesh = new THREE.Mesh(geometry, kind === "relief" ? material.resin : kind === "guide_plane" ? material.guide : material.metal);
    mesh.position.set(...point); mesh.userData.prostheiaMeshId = `partial-${kind}`; root.add(mesh);
  } else if (kind === "blockout") {
    const patches = coords.map((point) => {
      const geometry = new THREE.SphereGeometry(0.9, 12, 8);
      geometry.scale(1, 0.65, 0.45); geometry.translate(...point); return geometry;
    });
    const merged = mergeGeometries(patches, false); patches.forEach((geometry) => geometry.dispose());
    if (!merged) throw new Error("The synthetic blockout surface could not be assembled.");
    const mesh = new THREE.Mesh(merged, material.resin); mesh.userData.prostheiaMeshId = "partial-blockout-surface"; root.add(mesh);
  }
  root.traverse((child) => { if (child instanceof THREE.Mesh) { child.castShadow = true; child.receiveShadow = true; } });
  return root;
}

export function partialComponentPath(kind: PartialComponentKind, toothNumber?: number, ordinal = 0): [number, number, number][] {
  const placement = toothNumber ? positionForTooth(toothNumber, "lower").position : [0, 0, 0] as [number, number, number];
  const [x, y, z] = placement;
  if (kind === "major_connector" || kind === "lingual_bar") return [[-15, -6, z - 1], [-11, -8, z -1], [-5, -9, z - 1], [0, -9.5, z - 1], [5, -9, z - 1], [11, -8, z - 1], [15, -6, z - 1]];
  if (kind === "retention_mesh") return [[-9, 8, z - 0.8], [9, 8, z - 0.8], [0, 14, z - 0.8]];
  if (kind === "clasp") {
    const side = x < 0 ? -1 : 1;
    return [[x + side * 1.9, y, z + 1.1], [x + side * 2.9, y - 1.1, z + 0.3], [x + side * 2.4, y - 2.4, z - 0.1], [x + side * 1.2, y - 2.2, z + 0.1]];
  }
  if (kind === "minor_connector") return [[x, y - 1.8, z - 0.4], [x * 0.65, -3.4, z - 0.7], [x * 0.35, -6.6, z - 0.9]];
  if (kind === "finish_line") return [[x - 1.2, y - 0.8, z + 1], [x, y - 1.5, z + 1], [x + 1.2, y - 0.8, z + 1]];
  return [[x, y - 1.8, z + (ordinal % 2 ? 1.7 : 0.7)], [x + (x < 0 ? 1.4 : -1.4), y - 2.4, z + 0.8], [x, y - 3.1, z + 0.2]];
}
