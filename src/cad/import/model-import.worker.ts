import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { PLYLoader } from "three/addons/loaders/PLYLoader.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { MODEL_IMPORT_LIMITS, UNIT_TO_MILLIMETERS } from "./config";
import { createUnitNormalization, resolveSourceUnit, SOURCE_ORIGIN } from "./normalization";
import type { ImportErrorCode, ImportWorkerRequest, ImportWorkerResponse, ImportWarningCode, ModelUnit, SerializedMesh } from "./types";

const scope = self as unknown as { onmessage: ((event: MessageEvent<ImportWorkerRequest>) => void) | null; postMessage(message: ImportWorkerResponse, transfer?: Transferable[]): void };

scope.onmessage = async (event: MessageEvent<ImportWorkerRequest>) => {
  const request = event.data;
  if (!request || request.type !== "IMPORT_MODEL" || typeof request.jobId !== "string" || !(request.file instanceof File)) return;
  const progress = (stage: "reading" | "parsing" | "normalizing") => scope.postMessage({ type: "IMPORT_PROGRESS", jobId: request.jobId, stage } satisfies ImportWorkerResponse);
  let parsedRoot: THREE.Object3D | null = null;
  try {
    progress("reading");
    const bytes = await request.file.arrayBuffer();
    if (bytes.byteLength === 0) throw failure("empty_file", "The selected file is empty.");
    validateContentSignature(bytes, request.format);
    progress("parsing");
    parsedRoot = await parseModel(bytes, request.format);
    progress("normalizing");
    const result = normalizeAndSerialize(parsedRoot, request.unit, request.format);
    const transfer = new Set<Transferable>();
    for (const mesh of result.meshes) {
      transfer.add(mesh.positions);
      if (mesh.indices) transfer.add(mesh.indices);
      if (mesh.normals) transfer.add(mesh.normals);
      if (mesh.colors) transfer.add(mesh.colors);
    }
    scope.postMessage({ type: "IMPORT_SUCCESS", jobId: request.jobId, payload: result } satisfies ImportWorkerResponse, [...transfer]);
    parsedRoot = null;
  } catch (error) {
    const known = error instanceof ImportWorkerError ? error : null;
    const code = known?.code ?? "parse_failed";
    const message = known?.message ?? "The file could not be parsed as valid model geometry.";
    scope.postMessage({ type: "IMPORT_ERROR", jobId: request.jobId, code, message } satisfies ImportWorkerResponse);
  } finally {
    if (parsedRoot) disposeObject(parsedRoot);
  }
};

async function parseModel(bytes: ArrayBuffer, format: ImportWorkerRequest["format"]): Promise<THREE.Object3D> {
  try {
    if (format === "stl") return new THREE.Mesh(new STLLoader().parse(bytes), new THREE.MeshStandardMaterial({ color: "#d8d6ce", roughness: 0.72, metalness: 0.04 }));
    if (format === "ply") return new THREE.Mesh(new PLYLoader().parse(bytes), new THREE.MeshStandardMaterial({ color: "#d8d6ce", roughness: 0.72, metalness: 0.04, vertexColors: true }));
    const source = new TextDecoder().decode(bytes);
    if (format === "obj") return new OBJLoader().parse(source);
    if (format === "gltf") {
      const document = JSON.parse(source) as { buffers?: { uri?: string }[]; images?: { uri?: string }[] };
      const external = [...(document.buffers ?? []), ...(document.images ?? [])].some((entry) => entry.uri && !entry.uri.startsWith("data:"));
      if (external) throw failure("parse_failed", "This glTF references external files. Package its resources into one GLB file and import that instead.");
    }
    const gltf = await new GLTFLoader().parseAsync(bytes, "");
    return gltf.scene;
  } catch (error) {
    disposeObject((error as { scene?: THREE.Object3D })?.scene ?? new THREE.Group());
    if (error instanceof ImportWorkerError) throw error;
    throw failure("parse_failed", `The ${format.toUpperCase()} file is malformed or uses unsupported external resources.`);
  }
}

function normalizeAndSerialize(root: THREE.Object3D, unit: ModelUnit, format: ImportWorkerRequest["format"]) {
  root.updateMatrixWorld(true);
  const meshes: { mesh: THREE.Mesh; geometry: THREE.BufferGeometry; box: THREE.Box3; vertices: number; triangles: number }[] = [];
  const wholeBounds = new THREE.Box3();
  let vertices = 0;
  let triangles = 0;
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const geometry = child.geometry;
    if (child instanceof THREE.SkinnedMesh || geometry.morphAttributes.position?.length) throw failure("parse_failed", "Animated and morph-target meshes are not supported for dental model import.");
    const position = geometry.getAttribute("position");
    if (!position || position.count === 0) return;
    const vertexCount = position.count;
    const triangleCount = geometry.index ? Math.floor(geometry.index.count / 3) : Math.floor(vertexCount / 3);
    vertices += vertexCount;
    triangles += triangleCount;
    geometry.computeBoundingBox();
    const box = geometry.boundingBox?.clone();
    if (!box) return;
    box.applyMatrix4(child.matrixWorld);
    wholeBounds.union(box);
    meshes.push({ mesh: child, geometry, box, vertices: vertexCount, triangles: triangleCount });
  });
  if (!meshes.length || vertices === 0 || triangles === 0 || wholeBounds.isEmpty()) throw failure("invalid_geometry", "The file does not contain valid triangle mesh geometry.");
  if (vertices > MODEL_IMPORT_LIMITS.maxVertices || triangles > MODEL_IMPORT_LIMITS.maxTriangles) throw failure("geometry_too_large", "This mesh exceeds the supported import complexity limit (15 million vertices or 5 million triangles).");
  for (const { geometry } of meshes) {
    const positions = geometry.getAttribute("position");
    const values = positions.array;
    for (let index = 0; index < values.length; index += 1) if (!Number.isFinite(values[index])) throw failure("invalid_coordinates", "The mesh contains NaN or infinite coordinates.");
    if (geometry.index) for (const index of geometry.index.array) if (index >= positions.count) throw failure("invalid_geometry", "The mesh contains invalid triangle indices.");
  }
  const sourceUnit = resolveSourceUnit(unit, format);
  const unitScale = UNIT_TO_MILLIMETERS[sourceUnit];
  const sourceSize = wholeBounds.getSize(new THREE.Vector3());
  const dimensionsMm: [number, number, number] = [sourceSize.x * unitScale, sourceSize.y * unitScale, sourceSize.z * unitScale];
  if (!dimensionsMm.every(Number.isFinite) || Math.max(...dimensionsMm) <= 0) throw failure("invalid_coordinates", "The model has invalid or zero-size bounds.");
  if (Math.max(...dimensionsMm) > MODEL_IMPORT_LIMITS.maxDimensionMm) throw failure("geometry_too_large", "The model bounds exceed the supported 10,000 mm safety limit.");
  const sourceBounds = { min: wholeBounds.min.toArray() as [number, number, number], max: wholeBounds.max.toArray() as [number, number, number] };
  const transform = createUnitNormalization(unitScale);
  const warnings: ImportWarningCode[] = ["orientation_unconfirmed"];
  if (unit === "unknown" && format !== "glb") warnings.push("unit_assumed");
  if (Math.max(...dimensionsMm) < MODEL_IMPORT_LIMITS.suspiciousTinyDimensionMm || Math.max(...dimensionsMm) > MODEL_IMPORT_LIMITS.suspiciousLargeDimensionMm) warnings.push("scale_suspicious");
  if (triangles > MODEL_IMPORT_LIMITS.denseMeshWarningTriangles) warnings.push("dense_mesh");
  const serialized: SerializedMesh[] = meshes.map(({ mesh, geometry, vertices: vertexCount, triangles: triangleCount }) => {
    if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
    const pos = toFloatBuffer(geometry.getAttribute("position"));
    const normalAttr = geometry.getAttribute("normal");
    const colorAttr = geometry.getAttribute("color");
    const indexAttr = geometry.index;
    return {
      positions: pos.buffer as ArrayBuffer,
      indices: indexAttr ? toIndexBuffer(indexAttr.array).buffer as ArrayBuffer : null,
      indexType: indexAttr ? (indexAttr.array instanceof Uint16Array ? "uint16" : "uint32") : null,
      normals: normalAttr ? toFloatBuffer(normalAttr).buffer as ArrayBuffer : null,
      colors: colorAttr ? toFloatBuffer(colorAttr).buffer as ArrayBuffer : null,
      colorItemSize: colorAttr ? colorAttr.itemSize : null,
      matrix: mesh.matrixWorld.toArray(),
      materialColor: getMaterialColor(mesh.material),
      vertexCount,
      triangleCount,
    };
  });
  return { meshes: serialized, sourceUnit, unitScale, dimensionsMm, sourceBounds, sourceOrigin: [...SOURCE_ORIGIN] as [number, number, number], vertexCount: vertices, triangleCount: triangles, warnings, originalToCanonical: transform };
}

function validateContentSignature(bytes: ArrayBuffer, format: ImportWorkerRequest["format"]) {
  const view = new DataView(bytes);
  const prefix = new TextDecoder().decode(bytes.slice(0, Math.min(bytes.byteLength, 4096))).trimStart().toLowerCase();
  if (format === "glb" && (bytes.byteLength < 12 || view.getUint32(0, true) !== 0x46546c67)) throw failure("format_mismatch", "The file extension says GLB, but its contents are not a GLB file.");
  if (format === "gltf" && !prefix.startsWith("{") ) throw failure("format_mismatch", "The file extension says glTF, but its contents are not a glTF JSON document.");
  if (format === "ply" && !prefix.startsWith("ply")) throw failure("format_mismatch", "The file extension says PLY, but its contents are not a PLY file.");
  if (format === "stl") {
    const binary = bytes.byteLength >= 84 && 84 + view.getUint32(80, true) * 50 === bytes.byteLength;
    const suffix = new TextDecoder().decode(bytes.slice(Math.max(0, bytes.byteLength - 256))).trimEnd().toLowerCase();
    const ascii = prefix.startsWith("solid") && /\bendsolid\b\s*[\w.-]*\s*$/.test(suffix);
    if (!binary && !ascii) throw failure("format_mismatch", "The file extension says STL, but its contents do not match an ASCII or binary STL file.");
  }
  if (format === "obj" && !/^(?:#.*\r?\n\s*)*(?:v|vt|vn|f|o|g|mtllib|usemtl)\s/m.test(prefix)) throw failure("format_mismatch", "The file extension says OBJ, but its contents do not look like an OBJ model.");
}

function toFloatBuffer(attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute): Float32Array {
  if (attribute instanceof THREE.BufferAttribute && attribute.array instanceof Float32Array && !attribute.normalized && attribute.array.length === attribute.count * attribute.itemSize) return attribute.array;
  const result = new Float32Array(attribute.count * attribute.itemSize);
  const accessors = [attribute.getX, attribute.getY, attribute.getZ, attribute.getW];
  for (let index = 0; index < attribute.count; index += 1) for (let channel = 0; channel < attribute.itemSize; channel += 1) {
    const accessor = accessors[channel];
    result[index * attribute.itemSize + channel] = accessor ? accessor.call(attribute, index) : attribute.getComponent(index, channel);
  }
  return result;
}

function toIndexBuffer(indices: THREE.BufferAttribute["array"]): Uint16Array | Uint32Array {
  if (indices instanceof Uint16Array || indices instanceof Uint32Array) return indices;
  return Uint32Array.from(indices);
}

function getMaterialColor(material: THREE.Material | THREE.Material[]) {
  const first = Array.isArray(material) ? material[0] : material;
  return first && "color" in first && (first as THREE.MeshStandardMaterial).color instanceof THREE.Color ? `#${(first as THREE.MeshStandardMaterial).color.getHexString()}` : "#d8d6ce";
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.dispose();
    for (const material of Array.isArray(child.material) ? child.material : [child.material]) material.dispose();
  });
}

class ImportWorkerError extends Error { constructor(readonly code: ImportErrorCode, message: string) { super(message); } }
function failure(code: ImportErrorCode, message: string) { return new ImportWorkerError(code, message); }
