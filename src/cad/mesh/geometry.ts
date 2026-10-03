import * as THREE from "three";
import type { MeshData } from "./types";

export function toMeshData(geometry: THREE.BufferGeometry): MeshData {
  const position = geometry.getAttribute("position");
  if (!position) throw new Error("Mesh has no position data.");
  const positions = new Float32Array(position.count * 3);
  for (let i = 0; i < position.count; i++) { positions[i * 3] = position.getX(i); positions[i * 3 + 1] = position.getY(i); positions[i * 3 + 2] = position.getZ(i); }
  const sourceIndex = geometry.index?.array;
  const indices = sourceIndex ? Uint32Array.from(sourceIndex) : Uint32Array.from({ length: position.count }, (_, i) => i);
  const normal = geometry.getAttribute("normal");
  const normals = normal ? Float32Array.from({ length: normal.count * 3 }, (_, n) => { const i = Math.floor(n / 3); return n % 3 === 0 ? normal.getX(i) : n % 3 === 1 ? normal.getY(i) : normal.getZ(i); }) : undefined;
  const color = geometry.getAttribute("color");
  const colors = color ? Float32Array.from({ length: color.count * color.itemSize }, (_, n) => color.getComponent(Math.floor(n / color.itemSize), n % color.itemSize)) : undefined;
  const box = geometry.boundingBox;
  const sphere = geometry.boundingSphere;
  return { positions, indices, normals, colors, colorItemSize: color?.itemSize, bounds: box && sphere ? { min: box.min.toArray() as [number, number, number], max: box.max.toArray() as [number, number, number], center: sphere.center.toArray() as [number, number, number], radius: sphere.radius } : undefined };
}

export function fromMeshData(data: MeshData): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(data.positions, 3));
  geometry.setIndex(new THREE.BufferAttribute(data.indices, 1));
  if (data.colors && data.colorItemSize) geometry.setAttribute("color", new THREE.BufferAttribute(data.colors, data.colorItemSize));
  if (data.normals && data.normals.length === data.positions.length) geometry.setAttribute("normal", new THREE.BufferAttribute(data.normals, 3));
  else geometry.computeVertexNormals();
  if (data.bounds) { geometry.boundingBox = new THREE.Box3(new THREE.Vector3(...data.bounds.min), new THREE.Vector3(...data.bounds.max)); geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(...data.bounds.center), data.bounds.radius); }
  else { geometry.computeBoundingBox(); geometry.computeBoundingSphere(); }
  return geometry;
}

export function validateMeshData(mesh: MeshData, allowEmpty = false): string | null {
  if (mesh.positions.length % 3 || (!allowEmpty && mesh.positions.length < 9)) return "The operation returned empty or malformed vertex data.";
  if (mesh.indices.length % 3 || (!allowEmpty && mesh.indices.length < 3)) return "The operation returned empty or malformed triangle data.";
  if (!mesh.positions.every(Number.isFinite)) return "The operation returned non-finite coordinates.";
  if (mesh.normals && (mesh.normals.length !== mesh.positions.length || !mesh.normals.every(Number.isFinite))) return "The operation returned invalid normal data.";
  if (mesh.colors && (!mesh.colorItemSize || mesh.colors.length !== (mesh.positions.length / 3) * mesh.colorItemSize || !mesh.colors.every(Number.isFinite))) return "The operation returned invalid color data.";
  if (mesh.bounds && ![...mesh.bounds.min, ...mesh.bounds.max, ...mesh.bounds.center, mesh.bounds.radius].every(Number.isFinite)) return "The operation returned invalid bounds.";
  const vertexCount = mesh.positions.length / 3;
  for (const index of mesh.indices) if (index >= vertexCount) return "The operation returned an out-of-range triangle index.";
  for (let i = 0; i < mesh.indices.length; i += 3) if (mesh.indices[i] === mesh.indices[i + 1] || mesh.indices[i + 1] === mesh.indices[i + 2] || mesh.indices[i] === mesh.indices[i + 2]) return "The operation returned a degenerate triangle.";
  return null;
}

export function meshByteSize(mesh: MeshData) { return mesh.positions.byteLength + mesh.indices.byteLength + (mesh.normals?.byteLength ?? 0) + (mesh.colors?.byteLength ?? 0); }
