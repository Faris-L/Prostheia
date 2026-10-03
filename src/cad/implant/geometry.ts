import * as THREE from "three";

/** Deterministic, internally authored educational meshes. No commercial implant geometry is used. */
export function createSyntheticImplantFixture(diameterMm: number, lengthMm: number) {
  const root = new THREE.Group(); root.name = "Synthetic educational implant fixture";
  const material = new THREE.MeshStandardMaterial({ color: "#b9c8d2", metalness: 0.66, roughness: 0.32 });
  const pieces: THREE.BufferGeometry[] = [];
  const body = new THREE.CylinderGeometry(diameterMm * 0.46, diameterMm * 0.5, lengthMm, 24, 8, false);
  body.rotateX(Math.PI / 2); body.translate(0, 0, -lengthMm / 2); pieces.push(body);
  const collarLength = Math.max(0.35, diameterMm * 0.16);
  const collar = new THREE.CylinderGeometry(diameterMm * 0.52, diameterMm * 0.52, collarLength, 24, 1, false);
  collar.rotateX(Math.PI / 2); collar.translate(0, 0, -collarLength / 2); pieces.push(collar);
  const threadCount = Math.max(6, Math.round(lengthMm * 1.5));
  for (let index = 0; index < threadCount; index += 1) {
    const z = -lengthMm + (index + 0.5) * (lengthMm / threadCount);
    const ring = new THREE.TorusGeometry(diameterMm * 0.495, Math.max(0.07, diameterMm * 0.035), 4, 20);
    ring.translate(0, 0, z); pieces.push(ring);
  }
  const positions: number[] = [], indices: number[] = [];
  for (const piece of pieces) {
    const offset = positions.length / 3, position = piece.getAttribute("position");
    for (let vertex = 0; vertex < position.count; vertex += 1) positions.push(position.getX(vertex), position.getY(vertex), position.getZ(vertex));
    if (piece.index) for (let index = 0; index < piece.index.count; index += 1) indices.push(piece.index.getX(index) + offset);
    else for (let index = 0; index < position.count; index += 1) indices.push(offset + index);
    piece.dispose();
  }
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3)); geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingBox();
  const fixture = new THREE.Mesh(geometry, material); fixture.userData.prostheiaMeshId = "synthetic-fixture-surface"; fixture.castShadow = true; fixture.receiveShadow = true; root.add(fixture);
  root.updateMatrixWorld(true); return root;
}
export function createSyntheticImplantAbutment(diameterMm: number) {
  const root = new THREE.Group(); root.name = "Synthetic educational abutment";
  const body = new THREE.Mesh(new THREE.CylinderGeometry(diameterMm * 0.36, diameterMm * 0.42, diameterMm * 1.5, 20), new THREE.MeshStandardMaterial({ color: "#d5b487", metalness: 0.25, roughness: 0.45 }));
  body.userData.prostheiaMeshId = "implant-abutment-body"; body.position.z = diameterMm * 0.6; body.rotation.x = Math.PI / 2; root.add(body);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(diameterMm * 0.28, diameterMm * 0.36, diameterMm * 0.5, 20), body.material); top.userData.prostheiaMeshId = "implant-abutment-platform"; top.position.z = diameterMm * 1.6; top.rotation.x = Math.PI / 2; root.add(top);
  return root;
}
export function createSyntheticImplantSite() {
  const root = new THREE.Group(); root.name = "Synthetic educational implant site";
  const bone = new THREE.Mesh(new THREE.BoxGeometry(24, 18, 5), new THREE.MeshStandardMaterial({ color: "#d8b894", roughness: 0.85, transparent: true, opacity: 0.42 }));
  bone.userData.prostheiaMeshId = "synthetic-site-block"; bone.position.z = -2.5; root.add(bone);
  const adjacent = new THREE.Mesh(new THREE.CapsuleGeometry(1.05, 10, 4, 12), new THREE.MeshStandardMaterial({ color: "#eee4cf", roughness: 0.5 }));
  adjacent.userData.prostheiaMeshId = "synthetic-adjacent-root"; adjacent.position.set(5.5, 0, -4); adjacent.rotation.x = Math.PI / 2; root.add(adjacent);
  const risk = new THREE.Mesh(new THREE.TorusGeometry(2, 0.22, 6, 32), new THREE.MeshStandardMaterial({ color: "#d58a69", roughness: 0.6, transparent: true, opacity: 0.72 }));
  risk.userData.prostheiaMeshId = "synthetic-reference-ring"; risk.position.set(0, 0, -11); root.add(risk);
  return root;
}
