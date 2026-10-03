import * as THREE from "three";
import { createEdentulousArch, createSyntheticDentureTooth, fdiPositions, positionForTooth, createDentureBaseGeometry } from "../denture/geometry";

export type DigitalScanStage = "raw" | "trimmed" | "cleaned" | "filled";
export type DigitalScanChallenge = "routine" | "noisy_partial";

function addPeripheralScanMesh(root: THREE.Group, variant: "flange" | "fragment", offset: number) {
  const positions: number[] = [];
  const indices: number[] = [];
  const rows = variant === "flange" ? 5 : 3;
  const cols = variant === "flange" ? 17 : 5;
  for (let i = 0; i <= cols; i++) {
    const u = i / cols;
    for (let j = 0; j <= rows; j++) {
      const v = j / rows;
      const x = variant === "flange" ? -20 + u * 40 : 21 + u * 3.5;
      const y = variant === "flange" ? -14 + v * 6 + 0.4 * Math.sin(u * Math.PI * 2) : -4 + v * 5;
      const z = variant === "flange" ? -2.9 + 0.7 * Math.sin(u * 3.7 + offset) * Math.cos(v * 2.2) : -2 + 0.5 * Math.sin(u * 8 + offset) * Math.cos(v * 5);
      positions.push(x, y, z);
      if (i < cols && j < rows) {
        const a = i * (rows + 1) + j;
        const b = a + rows + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: variant === "flange" ? "#b77875" : "#a96f6b", side: THREE.DoubleSide, roughness: 0.92 }));
  mesh.name = variant === "flange" ? "Peripheral scan excess · trim practice" : "Small disconnected scan fragment · cleanup practice";
  mesh.castShadow = true;
  root.add(mesh);
}

function removeOneSmallScanPatch(root: THREE.Group) {
  const archMesh = root.children.find((child): child is THREE.Mesh => child instanceof THREE.Mesh);
  if (!archMesh) return;
  const source = archMesh.geometry;
  const position = source.getAttribute("position");
  const sourceIndex = source.index;
  if (!position) return;
  const keptPositions: number[] = [];
  const keptIndices: number[] = [];
  const center = new THREE.Vector3();
  const triangleCount = (sourceIndex?.count ?? position.count) / 3;
  for (let face = 0; face < triangleCount; face++) {
    const triangle = face * 3;
    const ids = sourceIndex
      ? [sourceIndex.getX(triangle), sourceIndex.getX(triangle + 1), sourceIndex.getX(triangle + 2)]
      : [triangle, triangle + 1, triangle + 2];
    center.set(0, 0, 0);
    for (const id of ids) center.add(new THREE.Vector3().fromBufferAttribute(position, id));
    center.multiplyScalar(1 / 3);
    const smallVoid = center.z > -1.15 && center.x > 0 && center.x < 2.2 && center.y > 9.6 && center.y < 12.1;
    if (smallVoid) continue;
    if (sourceIndex) keptIndices.push(...ids);
    else for (const id of ids) keptPositions.push(position.getX(id), position.getY(id), position.getZ(id));
  }
  if (sourceIndex ? keptIndices.length === sourceIndex.count : keptPositions.length === position.count * 3) return;
  const geometry = new THREE.BufferGeometry();
  if (sourceIndex) {
    geometry.setAttribute("position", position.clone());
    geometry.setIndex(keptIndices);
  } else geometry.setAttribute("position", new THREE.Float32BufferAttribute(keptPositions, 3));
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  archMesh.geometry = geometry;
  source.dispose();
}

/** Low-density scan-like teaching mesh with small peripheral artifacts and optional localized patch loss. */
export function createR6DigitalScan(arch: "upper" | "lower", stage: DigitalScanStage, challenge: DigitalScanChallenge, tilted = false) {
  const root = createEdentulousArch(arch);
  const missing = challenge === "noisy_partial" ? new Set(arch === "upper" ? [14, 15, 24, 25] : [34, 35, 44, 45]) : new Set<number>();
  for (const number of fdiPositions(arch)) {
    if (missing.has(number)) continue;
    const placement = positionForTooth(number, arch);
    const tooth = createSyntheticDentureTooth(number, challenge === "noisy_partial" ? "broad" : "balanced");
    tooth.position.set(...placement.position);
    tooth.rotation.set(...placement.rotation);
    root.add(tooth);
  }
  root.name = `${arch === "upper" ? "Maxillary" : "Mandibular"} synthetic intraoral scan · ${stage}`;
  if (stage === "raw") addPeripheralScanMesh(root, "flange", challenge === "noisy_partial" ? 1.7 : 0.4);
  if (challenge === "noisy_partial" && (stage === "raw" || stage === "trimmed")) addPeripheralScanMesh(root, "fragment", 2.1);
  if (stage !== "filled") removeOneSmallScanPatch(root);
  if (stage === "cleaned" || stage === "filled") root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const position = child.geometry.getAttribute("position");
    for (let index = 0; index < position.count; index++) position.setZ(index, position.getZ(index) * 0.992);
    position.needsUpdate = true;
    child.geometry.computeVertexNormals();
    if (Array.isArray(child.material)) child.material.forEach((material) => { if ("roughness" in material) (material as THREE.MeshStandardMaterial).roughness = 0.68; });
    else if ("roughness" in child.material) (child.material as THREE.MeshStandardMaterial).roughness = 0.68;
  });
  if (tilted) {
    root.rotation.set(0.12, -0.06, 0.09);
    root.position.set(1.5, -1, 1.1);
  }
  return root;
}

export function createR6DigitalModelBase(arch: "upper" | "lower", heightMm = 8) {
  if (!Number.isFinite(heightMm) || heightMm < 2 || heightMm > 25) throw new Error("Model base height must be between 2 and 25 mm for this exercise.");
  const geometry = createDentureBaseGeometry(arch);
  geometry.computeBoundingBox();
  const baseBounds = geometry.boundingBox!;
  const centerZ = (baseBounds.min.z + baseBounds.max.z) / 2;
  const currentHeight = Math.max(baseBounds.max.z - baseBounds.min.z, 0.01);
  const position = geometry.getAttribute("position");
  for (let index = 0; index < position.count; index++) position.setZ(index, centerZ + (position.getZ(index) - centerZ) * heightMm / currentHeight);
  position.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: "#82a2aa", roughness: 0.7, side: THREE.DoubleSide }));
  mesh.name = `${arch === "upper" ? "Maxillary" : "Mandibular"} arch-support model base · educational`;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function digitalModelTrimBoundary(arch: "upper" | "lower") {
  const z = arch === "upper" ? 0.2 : 8.2;
  return [[-21, -2, z], [-19, 7, z], [-13, 14, z], [-7, 18, z], [0, 20, z], [7, 18, z], [13, 14, z], [19, 7, z], [21, -2, z], [14, -1, z], [8, 4, z], [0, 6, z], [-8, 4, z], [-14, -1, z]] as [number, number, number][];
}

export function createDigitalModelTrimGuide(points: readonly [number, number, number][]) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)), true, "centripetal");
  const guide = new THREE.Group();
  guide.name = "Digital model trim boundary · GUIDE";
  guide.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 96, 0.12, 7, true), new THREE.MeshStandardMaterial({ color: "#f2b857", roughness: 0.5 })));
  return guide;
}
