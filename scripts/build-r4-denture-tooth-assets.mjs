import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RUNTIME = path.join(ROOT, "src", "cad", "case-packages", "private-v1", "runtime");
const R3_MANIFEST = path.join(ROOT, "src", "cad", "case-packages", "private-v1", "asset-manifest.json");
const R4_MANIFEST = path.join(ROOT, "src", "cad", "case-packages", "private-v1", "r4-asset-manifest.json");
const PREFIX = "d5000000-0000-5000-9000-";

const specifications = [
  { key: "upper-central", sourceFdi: 21, label: "Maxillary central incisor" },
  { key: "upper-lateral", sourceFdi: 22, label: "Maxillary lateral incisor" },
  { key: "upper-canine-left", sourceFdi: 23, label: "Maxillary canine · left" },
  { key: "upper-canine-right", sourceFdi: 13, label: "Maxillary canine · mirrored right" },
  { key: "upper-first-premolar", sourceFdi: 24, label: "Maxillary first premolar" },
  { key: "upper-second-premolar", sourceFdi: 25, label: "Maxillary second premolar" },
  { key: "upper-first-molar", sourceFdi: 26, label: "Maxillary first molar" },
  { key: "upper-second-molar", sourceFdi: 27, label: "Maxillary second molar" },
  { key: "lower-central", sourceFdi: 31, label: "Mandibular central incisor" },
  { key: "lower-lateral", sourceFdi: 32, label: "Mandibular lateral incisor" },
  { key: "lower-canine-approximation", sourceFdi: 23, label: "Mandibular canine training approximation · maxillary source form" },
  { key: "lower-first-premolar", sourceFdi: 34, label: "Mandibular first premolar" },
  { key: "lower-second-premolar", sourceFdi: 35, label: "Mandibular second premolar" },
  { key: "lower-first-molar", sourceFdi: 36, label: "Mandibular first molar" },
  { key: "lower-second-molar-left", sourceFdi: 37, label: "Mandibular second molar · left" },
  { key: "lower-second-molar-right", sourceFdi: 47, label: "Mandibular second molar · mirrored right" },
];

function glbParts(buffer) {
  if (buffer.toString("ascii", 0, 4) !== "glTF") throw new Error("R3 runtime source is not a GLB.");
  const jsonLength = buffer.readUInt32LE(12);
  const document = JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength).trim());
  const binHeader = 20 + jsonLength;
  const binLength = buffer.readUInt32LE(binHeader);
  const binary = buffer.subarray(binHeader + 8, binHeader + 8 + binLength);
  const primitive = document.meshes?.[0]?.primitives?.[0];
  if (!primitive) throw new Error("R3 runtime source contains no mesh primitive.");
  const accessor = (id) => {
    const record = document.accessors[id];
    const view = document.bufferViews[record.bufferView];
    const offset = (view.byteOffset ?? 0) + (record.byteOffset ?? 0);
    if (record.componentType === 5126 && record.type === "VEC3") {
      const output = new Float32Array(record.count * 3);
      for (let i = 0; i < output.length; i += 1) output[i] = binary.readFloatLE(offset + i * 4);
      return output;
    }
    if (record.type === "SCALAR" && [5121, 5123, 5125].includes(record.componentType)) {
      const output = new Uint32Array(record.count);
      const width = record.componentType === 5121 ? 1 : record.componentType === 5123 ? 2 : 4;
      for (let i = 0; i < output.length; i += 1) output[i] = width === 1 ? binary.readUInt8(offset + i) : width === 2 ? binary.readUInt16LE(offset + i * 2) : binary.readUInt32LE(offset + i * 4);
      return output;
    }
    throw new Error("R3 runtime source has an unsupported mesh accessor.");
  };
  const positions = accessor(primitive.attributes.POSITION);
  const indices = primitive.indices === undefined ? Uint32Array.from({ length: positions.length / 3 }, (_, i) => i) : accessor(primitive.indices);
  return { positions, triangles: Array.from({ length: indices.length / 3 }, (_, i) => [indices[i * 3], indices[i * 3 + 1], indices[i * 3 + 2]]) };
}

function crownOnly(mesh, threshold, label) {
  const key = (point) => point.map((value) => Math.round(value * 100000)).join(":");
  const positions = []; const indices = []; const byKey = new Map(); const cuts = new Map();
  const indexFor = (point) => {
    const id = key(point);
    let index = byKey.get(id);
    if (index === undefined) { index = positions.length / 3; positions.push(...point); byKey.set(id, index); }
    return index;
  };
  for (const face of mesh.triangles) {
    const points = face.map((index) => [mesh.positions[index * 3], mesh.positions[index * 3 + 1], mesh.positions[index * 3 + 2]]);
    const polygon = [];
    for (let i = 0; i < points.length; i += 1) {
      const a = points[i]; const b = points[(i + 1) % points.length];
      const keepA = a[2] >= threshold - 1e-8; const keepB = b[2] >= threshold - 1e-8;
      if (keepA) polygon.push(a);
      if (keepA !== keepB) {
        const t = (threshold - a[2]) / (b[2] - a[2]);
        polygon.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, threshold]);
      }
    }
    const clean = polygon.filter((point, i) => i === 0 || key(point) !== key(polygon[i - 1]));
    if (clean.length > 1 && key(clean[0]) === key(clean.at(-1))) clean.pop();
    if (clean.length >= 3) {
      const faceIndices = clean.map(indexFor);
      for (let i = 1; i < faceIndices.length - 1; i += 1) indices.push(faceIndices[0], faceIndices[i], faceIndices[i + 1]);
    }
    const intersections = polygon.filter((point) => Math.abs(point[2] - threshold) < 1e-6);
    const unique = [...new Map(intersections.map((point) => [key(point), point])).values()];
    if (unique.length === 2) { cuts.set(key(unique[0]), unique[0]); cuts.set(key(unique[1]), unique[1]); }
  }
  const ring = [...cuts.values()];
  if (ring.length >= 3) {
    const center = [ring.reduce((sum, point) => sum + point[0], 0) / ring.length, ring.reduce((sum, point) => sum + point[1], 0) / ring.length, threshold];
    ring.sort((a, b) => Math.atan2(a[1] - center[1], a[0] - center[0]) - Math.atan2(b[1] - center[1], b[0] - center[0]));
    const centerIndex = indexFor(center); const ringIndices = ring.map(indexFor);
    for (let i = 0; i < ringIndices.length; i += 1) indices.push(centerIndex, ringIndices[(i + 1) % ringIndices.length], ringIndices[i]);
  }
  if (indices.length < 300) throw new Error(label + " has too few faces after root removal.");
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingBox();
  const normals = new Float32Array(geometry.getAttribute("normal").array);
  const box = geometry.boundingBox;
  const bounds = { min: box.min.toArray(), max: box.max.toArray(), spans: box.getSize(new THREE.Vector3()).toArray(), unit: "mm" };
  const result = { positions: new Float32Array(positions), normals, indices: new Uint32Array(indices), bounds, vertexCount: positions.length / 3, triangleCount: indices.length / 3 };
  geometry.dispose();
  return result;
}

function crownGlb(crown, name) {
  const pos = Buffer.from(crown.positions.buffer, crown.positions.byteOffset, crown.positions.byteLength);
  const nrm = Buffer.from(crown.normals.buffer, crown.normals.byteOffset, crown.normals.byteLength);
  const idx = Buffer.from(crown.indices.buffer, crown.indices.byteOffset, crown.indices.byteLength);
  const binary = Buffer.concat([pos, nrm, idx]);
  const document = {
    asset: { version: "2.0", generator: "Prostheia R4 offline crown-only denture-tooth derivation" },
    scene: 0, scenes: [{ nodes: [0] }], nodes: [{ name, mesh: 0 }],
    meshes: [{ name, primitives: [{ attributes: { POSITION: 0, NORMAL: 1 }, indices: 2, material: 0, mode: 4 }] }],
    materials: [{ name: name + " synthetic ivory denture training material", pbrMetallicRoughness: { baseColorFactor: [0.96, 0.89, 0.77, 1], metallicFactor: 0, roughnessFactor: 0.42 }, doubleSided: false }],
    buffers: [{ byteLength: binary.length }],
    bufferViews: [
      { buffer: 0, byteOffset: 0, byteLength: pos.length, target: 34962 },
      { buffer: 0, byteOffset: pos.length, byteLength: nrm.length, target: 34962 },
      { buffer: 0, byteOffset: pos.length + nrm.length, byteLength: idx.length, target: 34963 },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: crown.vertexCount, type: "VEC3", min: crown.bounds.min, max: crown.bounds.max },
      { bufferView: 1, componentType: 5126, count: crown.vertexCount, type: "VEC3" },
      { bufferView: 2, componentType: 5125, count: crown.indices.length, type: "SCALAR", min: [0], max: [crown.vertexCount - 1] },
    ],
  };
  const json = Buffer.from(JSON.stringify(document));
  const jsonSize = Math.ceil(json.length / 4) * 4; const binSize = Math.ceil(binary.length / 4) * 4;
  const header = Buffer.alloc(12); header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + jsonSize + 8 + binSize, 8);
  const jsonHeader = Buffer.alloc(8); jsonHeader.writeUInt32LE(jsonSize, 0); jsonHeader.writeUInt32LE(0x4e4f534a, 4);
  const jsonChunk = Buffer.alloc(jsonSize, 0x20); json.copy(jsonChunk);
  const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(binSize, 0); binHeader.writeUInt32LE(0x004e4942, 4);
  const binChunk = Buffer.alloc(binSize); binary.copy(binChunk);
  return Buffer.concat([header, jsonHeader, jsonChunk, binHeader, binChunk]);
}

function rebuildGlbWithTrainingMaterial(buffer, name, extras) {
  if (buffer.toString("ascii", 0, 4) !== "glTF") throw new Error(`${name}: source is not a GLB.`);
  const jsonLength = buffer.readUInt32LE(12);
  const jsonChunk = JSON.parse(buffer.toString("utf8", 20, 20 + jsonLength).trim());
  const binHeaderOffset = 20 + jsonLength;
  const binLength = buffer.readUInt32LE(binHeaderOffset);
  const binChunk = buffer.subarray(binHeaderOffset + 8, binHeaderOffset + 8 + binLength);
  jsonChunk.asset.generator = "Prostheia R4 private denture-tooth derivative builder";
  jsonChunk.extras = { ...(jsonChunk.extras ?? {}), ...extras };
  for (const mesh of jsonChunk.meshes ?? []) mesh.name = name;
  for (const node of jsonChunk.nodes ?? []) if (node.mesh !== undefined) node.name = name;
  for (const material of jsonChunk.materials ?? []) {
    material.name = `${name} · synthetic ivory denture-tooth training material`;
    material.pbrMetallicRoughness ??= {};
    material.pbrMetallicRoughness.baseColorFactor = [0.96, 0.89, 0.77, 1];
    material.pbrMetallicRoughness.metallicFactor = 0;
    material.pbrMetallicRoughness.roughnessFactor = 0.42;
  }
  const json = Buffer.from(JSON.stringify(jsonChunk));
  const jsonPaddedLength = Math.ceil(json.length / 4) * 4;
  const binPaddedLength = Math.ceil(binChunk.length / 4) * 4;
  const totalLength = 12 + 8 + jsonPaddedLength + 8 + binPaddedLength;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(totalLength, 8);
  const jsonHeader = Buffer.alloc(8); jsonHeader.writeUInt32LE(jsonPaddedLength, 0); jsonHeader.writeUInt32LE(0x4e4f534a, 4);
  const jsonBytes = Buffer.alloc(jsonPaddedLength, 0x20); json.copy(jsonBytes);
  const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(binPaddedLength, 0); binHeader.writeUInt32LE(0x004e4942, 4);
  const binBytes = Buffer.alloc(binPaddedLength); binChunk.copy(binBytes);
  return Buffer.concat([header, jsonHeader, jsonBytes, binHeader, binBytes]);
}

async function main() {
  await mkdir(RUNTIME, { recursive: true });
  const sourceManifest = JSON.parse(await readFile(R3_MANIFEST, "utf8"));
  const byFdi = new Map();
  for (const asset of sourceManifest.assets) {
    if (asset.kind === "intact_tooth" || asset.kind === "contralateral_mirror") byFdi.set(asset.proposedFdi, asset);
  }
  const assets = [];
  for (const [index, spec] of specifications.entries()) {
    const source = byFdi.get(spec.sourceFdi);
    if (!source) throw new Error(`Missing private training source for R4 tooth ${spec.key} (FDI ${spec.sourceFdi}).`);
    const name = `R4 denture tooth · ${spec.label}`;
    const runtimeFile = `r4-denture-tooth-${spec.key}.glb`;
    const original = await readFile(path.join(RUNTIME, source.runtimeFile));
    const crown = crownOnly(glbParts(original), -0.35, name);
    const crownRuntime = crownGlb(crown, name);
    const derived = rebuildGlbWithTrainingMaterial(crownRuntime, name, {
      privateTraining: true,
      phase: "R4 COMPLETE DENTURE PRIVATE EDUCATIONAL V1",
      assetKind: "denture_tooth_training_derivative",
      sourceUid: source.uid,
      sourceAssetId: source.id,
      sourceFdi: source.proposedFdi,
      trainingClass: spec.label,
      commercialDentureSystem: false,
      derivation: "Natural tooth root context removed at a source-frame cervical training datum; the cut surface was capped and vertex normals recomputed. The datum is for this exercise, not universal.",
      cervicalTrainingDatumMm: -0.35,
      note: "Crown-only training denture tooth morphology adapted from attributed Dundee anatomy; not a commercial denture-tooth system.",
    });
    await writeFile(path.join(RUNTIME, runtimeFile), derived);
    const id = `${PREFIX}${String(index + 1).padStart(12, "0")}`;
    assets.push({
      ...source,
      id,
      assetState: "private_training_approved",
      kind: "denture_tooth_training_derivative",
      title: name,
      proposedFdi: source.proposedFdi,
      originalOrDerived: "derived_training_geometry",
      derivedFromAssetId: source.id,
      r4DerivationNotes: source.normalizationNotes + " Root context was removed at the source-frame cervical datum -0.35 exercise mm, capped, and normals recomputed. This is not a universal dimension.",
      normalizationNotes: `${source.normalizationNotes} Separate R4 artificial denture-tooth training asset with a distinct runtime file and synthetic ivory material. Based on natural source anatomy as a morphology reference; not a commercial denture tooth system. The mandibular canine object is explicitly an upper-canine training approximation.`,
      morphologyQaStatus: "SOURCE_MORPHOLOGY_DERIVED_DENTURE_TOOTH_TRAINING_ASSET_NOT_EXPERT_REVIEWED",
      runtimeFile,
      runtimeBoundsMm: crown.bounds,
      runtimeVertexCount: crown.vertexCount,
      runtimeTriangleCount: crown.triangleCount,
      runtimePath: `/api/private-training-assets/${id}`,
      runtimeByteSize: (await stat(path.join(RUNTIME, runtimeFile))).size,
      runtimeChecksum: createHash("sha256").update(derived).digest("hex"),
      sourceRuntimeAssetId: source.id,
      r4ToothLibraryKey: spec.key,
      r4TrainingLabel: spec.label,
    });
  }
  await writeFile(R4_MANIFEST, `${JSON.stringify({
    schemaVersion: 1,
    scope: "PRIVATE EDUCATIONAL V1 ONLY",
    generatedAt: new Date().toISOString(),
    sourceManifest: "src/cad/case-packages/private-v1/asset-manifest.json",
    sourceUnitStatus: "unknown",
    patientAndSourceImageProvenanceStatus: "unknown",
    expertReviewStatus: "not_reviewed",
    publicProductionApproval: false,
    syntheticDentalTrainingAssets: true,
    assets,
  }, null, 2)}\n`);
  console.log(JSON.stringify({ runtimeAssets: assets.length, runtimeBytes: assets.reduce((sum, asset) => sum + asset.runtimeByteSize, 0), assets: assets.map(({ id, r4ToothLibraryKey, derivedFromAssetId, runtimeFile }) => ({ id, r4ToothLibraryKey, derivedFromAssetId, runtimeFile })) }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
