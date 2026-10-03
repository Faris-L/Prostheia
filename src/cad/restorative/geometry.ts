import * as THREE from "three";
import { createSyntheticCrownMesh } from "../crown/geometry";
import type { RestorationType } from "./types";

const materials = {
  restoration: () => new THREE.MeshStandardMaterial({ color: "#f0dfbf", roughness: 0.43, metalness: 0.02 }),
  reference: () => new THREE.MeshStandardMaterial({ color: "#64c9bf", roughness: 0.5, transparent: true, opacity: 0.42 }),
  gum: () => new THREE.MeshStandardMaterial({ color: "#bf7775", roughness: 0.8 }),
};

function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, id: string) {
  const result = new THREE.Mesh(geometry, material);
  result.userData.prostheiaMeshId = id;
  result.castShadow = true; result.receiveShadow = true;
  return result;
}

function scaledCrown(scale: [number, number, number], material: THREE.Material, id: string) {
  const object = mesh(createSyntheticCrownMesh(), material, id); object.scale.set(...scale); return object;
}

export function createSyntheticBridgeConnectorGeometry(width: number) {
  const geometry = new THREE.CapsuleGeometry(width / 2, Math.max(0.1, 3.7 - width), 6, 12);
  geometry.rotateZ(-Math.PI / 2); geometry.scale(1, 1, 0.72); geometry.computeVertexNormals();
  return geometry;
}

function connector(width: number, start: number, end: number, id: string) {
  const geometry = createSyntheticBridgeConnectorGeometry(width);
  const object = mesh(geometry, materials.restoration(), id);
  object.position.set((start + end) / 2, 0, 1.7);
  return object;
}

/** A single bridge CAD object with stable named abutment, pontic and connector members. */
export function createSyntheticBridgeObject(connectorWidthMm = 3, reference = false) {
  const assembly = new THREE.Group(); assembly.name = "Synthetic bridge assembly";
  const material = reference ? materials.reference() : materials.restoration();
  assembly.add(scaledCrown([0.82, 0.84, 0.82], material.clone(), "bridge-unit-abutment-14")); assembly.children[0].position.x = -8;
  assembly.add(scaledCrown([0.82, 0.84, 0.82], material.clone(), "bridge-unit-abutment-16")); assembly.children[1].position.x = 8;
  assembly.add(scaledCrown([0.78, 0.8, 0.8], material.clone(), "bridge-unit-pontic-15"));
  assembly.add(connector(connectorWidthMm, -5.8, -2.1, "bridge-connector-mesial"));
  assembly.add(connector(connectorWidthMm, 2.1, 5.8, "bridge-connector-distal"));
  assembly.updateMatrixWorld(true);
  const positions: number[] = []; const indices: number[] = [];
  const members: { id: string; vertexStart: number; vertexCount: number; triangleStart: number; triangleCount: number }[] = [];
  for (const child of assembly.children) {
    if (!(child instanceof THREE.Mesh)) continue;
    const geometry = child.geometry.clone(); geometry.applyMatrix4(child.matrixWorld);
    const attribute = geometry.getAttribute("position"); const start = positions.length / 3; const indexStart = indices.length / 3;
    for (let i = 0; i < attribute.count; i += 1) positions.push(attribute.getX(i), attribute.getY(i), attribute.getZ(i));
    if (geometry.index) for (let i = 0; i < geometry.index.count; i += 1) indices.push(geometry.index.getX(i) + start);
    else for (let i = 0; i < attribute.count; i += 1) indices.push(i + start);
    members.push({ id: String(child.userData.prostheiaMeshId), vertexStart: start, vertexCount: attribute.count, triangleStart: indexStart, triangleCount: indices.length / 3 - indexStart });
    geometry.dispose();
    for (const item of (Array.isArray(child.material) ? child.material : [child.material])) item.dispose();
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingBox();
  const restoration = mesh(geometry, reference ? materials.reference() : materials.restoration(), "bridge-restoration-solid");
  restoration.userData.restorativeUnitSpans = members;
  const root = new THREE.Group(); root.name = reference ? "Synthetic bridge reference" : "Synthetic multi-unit bridge"; root.add(restoration);
  return root;
}

export function createSyntheticGingivaRegion() {
  const geometry = new THREE.SphereGeometry(1, 32, 18);
  const gum = mesh(geometry, materials.gum(), "gingiva-reference-surface");
  gum.scale.set(4.6, 3.2, 0.65); gum.position.set(0, -2.8, -1.8);
  const root = new THREE.Group(); root.name = "Synthetic gingiva reference region"; root.add(gum); return root;
}

function inlayGeometry() {
  const shape = new THREE.Shape();
  shape.moveTo(-2.1, -1.25); shape.quadraticCurveTo(-2.5, 0.1, -1.35, 1.4); shape.quadraticCurveTo(0, 2.0, 1.55, 1.35); shape.quadraticCurveTo(2.45, 0.2, 2.05, -1.2); shape.quadraticCurveTo(0, -2.0, -2.1, -1.25);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1.25, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.22, bevelThickness: 0.18, curveSegments: 12 });
  geometry.translate(0, 0, 2.1); geometry.computeVertexNormals(); return geometry;
}

function veneerGeometry() {
  const geometry = new THREE.SphereGeometry(1, 32, 20, Math.PI * 0.05, Math.PI * 0.9, Math.PI * 0.12, Math.PI * 0.76);
  geometry.scale(3.15, 0.34, 4.25); geometry.rotateX(Math.PI / 2); geometry.translate(0, -3.02, 0.1);
  geometry.computeVertexNormals(); return geometry;
}

/** Internally generated educational restorations only; not clinical-fit geometry. */
export function createSyntheticRestorationObject(type: Exclude<RestorationType, "bridge" | "crown">, reference = false) {
  const root = new THREE.Group(); root.name = reference ? `Synthetic ${type} reference` : `Synthetic ${type} restoration`;
  const material = reference ? materials.reference() : materials.restoration();
  if (type === "inlay") {
    root.add(mesh(inlayGeometry(), material, "inlay-internal-and-occlusal-form"));
  } else if (type === "onlay") {
    root.add(scaledCrown([0.76, 0.74, 0.36], material, "onlay-occlusal-and-cusp-coverage"));
    root.children[0].position.z = 2.35;
  } else {
    root.add(mesh(veneerGeometry(), material, "veneer-facial-shell"));
  }
  return root;
}

export function createSyntheticRestorationGeometry(type: RestorationType, connectorWidthMm = 3) {
  if (type === "bridge") return createSyntheticBridgeObject(connectorWidthMm);
  if (type === "crown") { const root = new THREE.Group(); root.add(scaledCrown([1, 1, 1], materials.restoration(), "crown-restoration")); return root; }
  return createSyntheticRestorationObject(type);
}
