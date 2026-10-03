import * as THREE from "three";
import { validateMeshData, toMeshData } from "../mesh/geometry";

/** Simplified editable teaching base. The mesh stays separate from the scan; no boolean union is claimed. */
export function createEducationalModelBase(source: THREE.Object3D, heightMm = 8) {
  if (!Number.isFinite(heightMm) || heightMm < 2 || heightMm > 25) throw new Error("Model base height must be between 2 and 25 mm for this exercise.");
  source.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(source);
  if (bounds.isEmpty() || ![...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite)) throw new Error("Working model bounds are not valid.");
  const size = bounds.getSize(new THREE.Vector3());
  const shape = new THREE.Shape();
  const rx = Math.max(size.x * 0.58, 8), ry = Math.max(size.y * 0.62, 7);
  shape.absellipse(0, 0, rx, ry, Math.PI * 0.08, Math.PI * 1.92, false, 0);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: heightMm, bevelEnabled: true, bevelSegments: 2, bevelSize: 0.5, bevelThickness: 0.35, curveSegments: 40 });
  geometry.translate((bounds.min.x + bounds.max.x) / 2, (bounds.min.y + bounds.max.y) / 2, bounds.min.z - heightMm);
  geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  const invalid = validateMeshData(toMeshData(geometry));
  if (invalid) { geometry.dispose(); throw new Error(`Generated model base is invalid: ${invalid}`); }
  return geometry;
}
export function createRemovableDieGeometry(radiusMm = 4, heightMm = 8) { const geometry = new THREE.CylinderGeometry(radiusMm * 0.9, radiusMm, heightMm, 24, 1); geometry.rotateX(Math.PI / 2); return geometry; }
export function createModelAttachmentGeometry() { const geometry = new THREE.CylinderGeometry(2.1, 2.8, 2.5, 20, 1); geometry.rotateX(Math.PI / 2); return geometry; }
