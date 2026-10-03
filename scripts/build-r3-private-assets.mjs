import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { acceleratedRaycast, computeBoundsTree } from "three-mesh-bvh";

THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
THREE.Mesh.prototype.raycast = acceleratedRaycast;

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RESEARCH = path.join(ROOT, ".research", "dundee-permanent-teeth");
const RUNTIME = path.join(ROOT, "src", "cad", "case-packages", "private-v1", "runtime");
const OUT_MANIFEST = path.join(ROOT, "src", "cad", "case-packages", "private-v1", "asset-manifest.json");
const CANDIDATE_IDS = [
  "f9b48a29d34f4923b683433f030c5c70", // upper first premolar 24
  "69f3142830064588b000b04bea0ee09f", // upper second premolar 25
  "e719a474ef7e4bd7abec508f85f1e984", // upper first molar 26
  "e035713849d1438791306e25235ac452", // upper second molar 27
  "e1c919d6603846eca873154eeededdd6", // lower first molar 36
  "c8a7c2d9280d4c92bc651cfa1459866a", // upper central incisor 21
  "5e89ddbfc6454e2e8e09c645574b8932", // upper lateral incisor 22
  "935637a703dc49eb9eeec9b15a8a5c4c", // lower first premolar 34
  "fe59fe04725446479bc1115bb12d0ad8", // lower second premolar 35
  "90dcbf474e5a4d97b8783b7eb2b9c4b7", // lower central incisor 31
  "00fa4f74e10b4769830bf60469c65e27", // lower lateral incisor 32
  "bd930c9b9da14f2a9a8c9b130b0e08a2", // upper-left canine 23, source file UL3
  "b77dcbc5052e4740b87cdb1964649742", // lower-left second molar 37, source file LL7
];

const UUID_PREFIX = "d4000000-0000-5000-8000-";
const CANDIDATE_ASSET_IDS = new Map(CANDIDATE_IDS.map((uid, index) => [uid, uuidForOrdinal(index + 1)]));
function uuidForOrdinal(value) { return `${UUID_PREFIX}${String(value).padStart(12, "0")}`; }
function derivedUuid(index) { return `${UUID_PREFIX}${String(100 + index).padStart(12, "0")}`; }

const SOURCE_DISPLAY_MM = new Map([
  [21, 21], [22, 19.5], [24, 16.5], [25, 16], [26, 17], [27, 16.5],
  [31, 19.5], [32, 18.5], [34, 15], [35, 15.5], [36, 16.5], [23, 25], [37, 18],
]);

const sourceBounds = (positions) => {
  const box = new THREE.Box3();
  for (let i = 0; i < positions.length; i += 3) box.expandByPoint(new THREE.Vector3(positions[i], positions[i + 1], positions[i + 2]));
  return { min: box.min.toArray(), max: box.max.toArray(), spans: box.getSize(new THREE.Vector3()).toArray() };
};

function parseObj(text) {
  const rawPositions = [];
  const triangles = [];
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed.startsWith("v ")) {
      const values = trimmed.split(/\s+/).slice(1, 4).map(Number);
      if (values.length !== 3 || !values.every(Number.isFinite)) throw new Error("OBJ contains a non-finite vertex.");
      rawPositions.push(values);
    } else if (trimmed.startsWith("f ")) {
      const indices = trimmed.split(/\s+/).slice(1).map((value) => {
        const sourceIndex = Number(value.split("/")[0]);
        return sourceIndex > 0 ? sourceIndex - 1 : rawPositions.length + sourceIndex;
      });
      if (indices.length < 3 || indices.some((index) => index < 0 || index >= rawPositions.length)) throw new Error("OBJ contains an invalid face index.");
      for (let i = 1; i < indices.length - 1; i += 1) triangles.push([indices[0], indices[i], indices[i + 1]]);
    }
  }
  if (!rawPositions.length || !triangles.length) throw new Error("OBJ does not contain triangle geometry.");
  const flat = rawPositions.flat();
  const volume = signedVolume(flat, triangles);
  if (volume < 0) for (const face of triangles) [face[1], face[2]] = [face[2], face[1]];
  return { positions: flat, triangles };
}

function signedVolume(positions, triangles) {
  let volume = 0;
  for (const [ia, ib, ic] of triangles) {
    const a = point(positions, ia); const b = point(positions, ib); const c = point(positions, ic);
    volume += a.dot(new THREE.Vector3().crossVectors(b, c)) / 6;
  }
  return volume;
}

function point(positions, index) { return new THREE.Vector3(positions[index * 3], positions[index * 3 + 1], positions[index * 3 + 2]); }
function key(p) { return p.map((value) => value.toFixed(6)).join(","); }

function transformToTrainingFrame(mesh, toothNumber) {
  const bounds = sourceBounds(mesh.positions);
  const scale = SOURCE_DISPLAY_MM.get(toothNumber) / bounds.spans[1];
  const centerX = (bounds.min[0] + bounds.max[0]) / 2;
  const centerZ = (bounds.min[2] + bounds.max[2]) / 2;
  const cervicalY = bounds.min[1] + bounds.spans[1] * (toothNumber < 30 ? 0.58 : 0.59);
  const transformed = mesh.positions.map((value, index) => {
    const axis = index % 3;
    const vertex = Math.floor(index / 3);
    const x = mesh.positions[vertex * 3];
    const y = mesh.positions[vertex * 3 + 1];
    const z = mesh.positions[vertex * 3 + 2];
    return axis === 0 ? (x - centerX) * scale : axis === 1 ? -(z - centerZ) * scale : (y - cervicalY) * scale;
  });
  const matrix = [
    scale, 0, 0, 0,
    0, 0, scale, 0,
    0, -scale, 0, 0,
    -centerX * scale, centerZ * scale, -cervicalY * scale, 1,
  ];
  return { positions: transformed, triangles: mesh.triangles.map((face) => [...face]), sourceBounds: bounds, matrix, displayScale: scale };
}

function geometryFrom(positions, triangles) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(triangles.flat());
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

function dedupeMesh(positions, triangles) {
  const unique = new Map(); const outPositions = []; const outTriangles = [];
  for (const face of triangles) {
    const mapped = face.map((raw) => {
      const p = Array.isArray(raw) ? raw : [positions[raw * 3], positions[raw * 3 + 1], positions[raw * 3 + 2]];
      const k = key(p);
      let index = unique.get(k);
      if (index === undefined) { index = outPositions.length / 3; unique.set(k, index); outPositions.push(...p); }
      return index;
    });
    if (new Set(mapped).size === 3) outTriangles.push(mapped);
  }
  return { positions: outPositions, triangles: outTriangles };
}

function clipAtZ(mesh, threshold, side) {
  const keep = (p) => side === "above" ? p[2] >= threshold - 1e-8 : p[2] <= threshold + 1e-8;
  const polygons = []; const segments = [];
  for (const face of mesh.triangles) {
    const input = face.map((index) => [mesh.positions[index * 3], mesh.positions[index * 3 + 1], mesh.positions[index * 3 + 2]]);
    const output = [];
    for (let i = 0; i < input.length; i += 1) {
      const a = input[i]; const b = input[(i + 1) % input.length];
      const insideA = keep(a); const insideB = keep(b);
      if (insideA) output.push(a);
      if (insideA !== insideB) {
        const t = (threshold - a[2]) / (b[2] - a[2]);
        output.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, threshold]);
      }
    }
    const clean = output.filter((p, index) => index === 0 || key(p) !== key(output[index - 1]));
    if (clean.length > 1 && key(clean[0]) === key(clean.at(-1))) clean.pop();
    if (clean.length >= 3) polygons.push(clean);
    const cuts = output.filter((p) => Math.abs(p[2] - threshold) < 1e-6).filter((p, index, list) => list.findIndex((q) => key(q) === key(p)) === index);
    if (cuts.length === 2) segments.push(cuts);
  }

  const flat = []; const triangles = [];
  for (const polygon of polygons) for (let i = 1; i < polygon.length - 1; i += 1) triangles.push([polygon[0], polygon[i], polygon[i + 1]]);
  const neighbors = new Map();
  for (const [a, b] of segments) {
    const ka = key(a); const kb = key(b);
    if (ka === kb) continue;
    if (!neighbors.has(ka)) neighbors.set(ka, { point: a, links: new Set() });
    if (!neighbors.has(kb)) neighbors.set(kb, { point: b, links: new Set() });
    neighbors.get(ka).links.add(kb); neighbors.get(kb).links.add(ka);
  }
  const loops = []; const usedEdges = new Set();
  for (const [start, entry] of neighbors) for (const neighbor of entry.links) {
    const edgeKey = [start, neighbor].sort().join("|");
    if (usedEdges.has(edgeKey)) continue;
    const loop = [start]; let previous = start; let current = neighbor; let guard = neighbors.size + 2;
    usedEdges.add(edgeKey);
    while (guard-- > 0) {
      if (current === start) break;
      loop.push(current);
      const options = [...(neighbors.get(current)?.links ?? [])].filter((item) => item !== previous);
      const next = options.find((item) => !usedEdges.has([current, item].sort().join("|"))) ?? options[0];
      if (!next) break;
      usedEdges.add([current, next].sort().join("|")); previous = current; current = next;
    }
    if (current === start && loop.length >= 3) loops.push(loop);
  }

  for (const loop of loops) {
    const ring = loop.map((id) => neighbors.get(id).point);
    const center = [ring.reduce((sum, p) => sum + p[0], 0) / ring.length, ring.reduce((sum, p) => sum + p[1], 0) / ring.length, threshold];
    ring.sort((a, b) => Math.atan2(a[1] - center[1], a[0] - center[0]) - Math.atan2(b[1] - center[1], b[0] - center[0]));
    for (let i = 0; i < ring.length; i += 1) {
      triangles.push(side === "above" ? [center, ring[(i + 1) % ring.length], ring[i]] : [center, ring[i], ring[(i + 1) % ring.length]]);
    }
  }
  for (const face of triangles) for (const p of face) flat.push(...p);
  const indexed = dedupeMesh(flat, Array.from({ length: triangles.length }, (_, i) => [i * 3, i * 3 + 1, i * 3 + 2]));
  if (!indexed.triangles.length) throw new Error(`No triangles remain after clipping at ${threshold} mm.`);
  return indexed;
}

function taperPreparation(mesh, cutZ, taperAmount = 0.14, taperStart = 1.2) {
  const adjusted = { positions: [...mesh.positions], triangles: mesh.triangles.map((face) => [...face]) };
  for (let i = 0; i < adjusted.positions.length; i += 3) {
    const z = adjusted.positions[i + 2];
    if (z <= taperStart) continue;
    const t = Math.min(1, (z - taperStart) / Math.max(0.1, cutZ - taperStart));
    const factor = 1 - taperAmount * t;
    adjusted.positions[i] *= factor;
    adjusted.positions[i + 1] *= factor;
  }
  return clipAtZ(adjusted, cutZ, "below");
}

function inlayPreparation(mesh) {
  const adjusted = cloneMesh(mesh);
  for (let i = 0; i < adjusted.positions.length; i += 3) {
    const x = adjusted.positions[i]; const y = adjusted.positions[i + 1]; const z = adjusted.positions[i + 2];
    if (z <= 1.8) continue;
    const radius = Math.hypot(x / 2.7, y / 3.0);
    const basin = Math.max(0, Math.min(1, (1.08 - radius) / 0.28));
    const smooth = basin * basin * (3 - 2 * basin);
    adjusted.positions[i + 2] -= 1.35 * smooth;
  }
  return adjusted;
}

function veneerPreparation(mesh) {
  const adjusted = cloneMesh(mesh);
  for (let i = 0; i < adjusted.positions.length; i += 3) {
    const x = adjusted.positions[i]; const y = adjusted.positions[i + 1]; const z = adjusted.positions[i + 2];
    if (y < 0.15 || z < 0.1 || z > 8.0) continue;
    const radial = Math.hypot(x / 3.2, (z - 4.0) / 4.1);
    const falloff = Math.max(0, Math.min(1, (1.1 - radial) / 0.25));
    const smooth = falloff * falloff * (3 - 2 * falloff);
    adjusted.positions[i + 1] -= 0.55 * smooth;
  }
  return adjusted;
}

function buildOcclusalPatch(source, radiusX, radiusY, depth, name) {
  const geometry = geometryFrom(source.positions, source.triangles);
  geometry.computeBoundsTree();
  const sourceMesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  const bounds = geometry.boundingBox;
  const zTop = bounds.max.z + 2;
  const segments = 48; const rings = 12; const top = []; const bottom = []; const valid = []; const triangles = [];
  const raycaster = new THREE.Raycaster(); raycaster.firstHitOnly = true;
  function sample(x, y) {
    raycaster.set(new THREE.Vector3(x, y, zTop), new THREE.Vector3(0, 0, -1));
    const hit = raycaster.intersectObject(sourceMesh, false)[0];
    if (!hit || hit.point.z < 0.3) return { point: [x, y, 0], valid: false };
    return { point: [hit.point.x, hit.point.y, hit.point.z + 0.05], valid: true };
  }
  const center = sample(0, 0);
  if (!center.valid) throw new Error(`${name} patch did not intersect the candidate's occlusal surface at its center.`);
  top.push(center.point); bottom.push([top[0][0], top[0][1], top[0][2] - depth]); valid.push(true);
  const ringStarts = [0];
  for (let ring = 1; ring <= rings; ring += 1) {
    const r = ring / rings;
    ringStarts.push(top.length);
    for (let i = 0; i < segments; i += 1) {
      const angle = Math.PI * 2 * i / segments;
      const sampled = sample(radiusX * r * Math.cos(angle), radiusY * r * Math.sin(angle));
      const p = sampled.point;
      top.push(p); bottom.push([p[0], p[1], p[2] - depth]); valid.push(sampled.valid);
    }
  }
  for (let i = 0; i < segments; i += 1) if (valid[0] && valid[ringStarts[1] + i] && valid[ringStarts[1] + (i + 1) % segments]) triangles.push([0, ringStarts[1] + i, ringStarts[1] + (i + 1) % segments]);
  for (let ring = 1; ring < rings; ring += 1) for (let i = 0; i < segments; i += 1) {
    const a = ringStarts[ring] + i; const b = ringStarts[ring] + (i + 1) % segments;
    const c = ringStarts[ring + 1] + i; const d = ringStarts[ring + 1] + (i + 1) % segments;
    if (valid[a] && valid[b] && valid[c]) triangles.push([a, c, b]);
    if (valid[b] && valid[c] && valid[d]) triangles.push([b, c, d]);
  }
  const topCount = top.length;
  const all = [...top, ...bottom];
  for (const [a, b, c] of triangles.slice()) triangles.push([a + topCount, c + topCount, b + topCount]);
  const outerStart = ringStarts[rings];
  for (let i = 0; i < segments; i += 1) {
    const a = outerStart + i; const b = outerStart + (i + 1) % segments;
    if (valid[a] && valid[b]) triangles.push([a, b, b + topCount], [a, b + topCount, a + topCount]);
  }
  if (!triangles.length) throw new Error(`${name} patch contained no valid anatomical surface.`);
  geometry.disposeBoundsTree?.(); geometry.dispose(); sourceMesh.material.dispose();
  return { name, positions: all.flat(), triangles };
}

function buildFacialPatch(source, radiusX, centerZ, radiusZ, depth, name) {
  const geometry = geometryFrom(source.positions, source.triangles);
  geometry.computeBoundsTree();
  const sourceMesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  const bounds = geometry.boundingBox;
  const yFront = bounds.max.y + 2;
  const columns = 36; const rows = 44; const top = []; const inner = []; const triangles = [];
  const raycaster = new THREE.Raycaster(); raycaster.firstHitOnly = true;
  for (let row = 0; row <= rows; row += 1) {
    const v = row / rows * 2 - 1;
    for (let column = 0; column <= columns; column += 1) {
      const u = column / columns * 2 - 1;
      const radial = u * u + v * v;
      const x = u * radiusX; const z = centerZ + v * radiusZ;
      raycaster.set(new THREE.Vector3(x, yFront, z), new THREE.Vector3(0, -1, 0));
      const hit = radial <= 1 ? raycaster.intersectObject(sourceMesh, false)[0] : undefined;
      if (!hit || z < 0.15) { top.push([x, 1000, z]); inner.push([x, 1000 - depth, z]); }
      else { top.push([hit.point.x, hit.point.y + 0.05, hit.point.z]); inner.push([hit.point.x, hit.point.y - depth, hit.point.z]); }
    }
  }
  const stride = columns + 1;
  for (let row = 0; row < rows; row += 1) for (let column = 0; column < columns; column += 1) {
    const a = row * stride + column; const b = a + 1; const c = a + stride; const d = c + 1;
    const centerU = (column + 0.5) / columns * 2 - 1; const centerV = (row + 0.5) / rows * 2 - 1;
    if (centerU * centerU + centerV * centerV > 1 || centerZ + centerV * radiusZ < 0.15 || top[a][1] > 100 || top[b][1] > 100 || top[c][1] > 100 || top[d][1] > 100) continue;
    triangles.push([a, b, c], [b, d, c]);
  }
  const topCount = top.length; const all = [...top, ...inner];
  for (const [a, b, c] of triangles.slice()) triangles.push([a + topCount, c + topCount, b + topCount]);
  const edge = [];
  for (let column = 0; column < columns; column += 1) edge.push([column, column + 1]);
  for (let row = 0; row < rows; row += 1) edge.push([row * stride + columns, (row + 1) * stride + columns]);
  for (let column = columns; column > 0; column -= 1) edge.push([rows * stride + column, rows * stride + column - 1]);
  for (let row = rows; row > 0; row -= 1) edge.push([row * stride, (row - 1) * stride]);
  for (const [a, b] of edge) {
    if (top[a][1] > 100 || top[b][1] > 100) continue;
    triangles.push([a, b, b + topCount], [a, b + topCount, a + topCount]);
  }
  geometry.disposeBoundsTree?.(); geometry.dispose(); sourceMesh.material.dispose();
  return { name, positions: all.flat(), triangles };
}

function buildTube(start, end, radius, name) {
  const a = new THREE.Vector3(...start); const b = new THREE.Vector3(...end); const axis = b.clone().sub(a).normalize();
  const helper = Math.abs(axis.z) > 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
  const u = axis.clone().cross(helper).normalize(); const v = axis.clone().cross(u).normalize();
  const steps = 16; const points = []; const triangles = [];
  for (const center of [a, b]) for (let i = 0; i < steps; i += 1) {
    const angle = Math.PI * 2 * i / steps;
    const p = center.clone().addScaledVector(u, Math.cos(angle) * radius).addScaledVector(v, Math.sin(angle) * radius);
    points.push(p.toArray());
  }
  for (let i = 0; i < steps; i += 1) {
    const next = (i + 1) % steps;
    triangles.push([i, next, steps + i], [next, steps + next, steps + i]);
  }
  for (let i = 1; i < steps - 1; i += 1) {
    triangles.push([0, i + 1, i]);
    triangles.push([steps, steps + i, steps + i + 1]);
  }
  return { name, positions: points.flat(), triangles };
}

function glbForMeshes(meshes, outputName, extras = {}) {
  const binaryParts = []; const bufferViews = []; const accessors = []; const jsonMeshes = []; const materials = []; const nodes = [];
  let byteOffset = 0;
  const align = () => { while (byteOffset % 4) { binaryParts.push(Buffer.from([0])); byteOffset += 1; } };
  function addBuffer(data, target, componentType, type, count, min, max) {
    align(); const buffer = Buffer.from(data.buffer, data.byteOffset, data.byteLength); const index = bufferViews.length;
    binaryParts.push(buffer); bufferViews.push({ buffer: 0, byteOffset, byteLength: buffer.length, target }); byteOffset += buffer.length;
    const accessorIndex = accessors.length; accessors.push({ bufferView: index, componentType, count, type, ...(min ? { min } : {}), ...(max ? { max } : {}) }); return accessorIndex;
  }
  for (const part of meshes) {
    const indexed = part.positions instanceof Float32Array ? part : { ...part, positions: new Float32Array(part.positions), triangles: part.triangles };
    if (!indexed.triangles.length) throw new Error(`Runtime mesh ${part.name} has no triangles.`);
    const positions = indexed.positions; const geometry = geometryFrom(positions, indexed.triangles);
    const normals = geometry.getAttribute("normal").array;
    const bounds = sourceBounds(positions);
    const positionAccessor = addBuffer(positions, 34962, 5126, "VEC3", positions.length / 3, bounds.min, bounds.max);
    const normalAccessor = addBuffer(normals, 34962, 5126, "VEC3", normals.length / 3);
    const indices = new Uint32Array(indexed.triangles.flat());
    const indexAccessor = addBuffer(indices, 34963, 5125, "SCALAR", indices.length, [0], [positions.length / 3 - 1]);
    const color = part.color ?? [0.88, 0.83, 0.72, 1];
    const materialIndex = materials.length;
    materials.push({ name: `${part.name} training material`, pbrMetallicRoughness: { baseColorFactor: color, metallicFactor: 0, roughnessFactor: 0.55 }, doubleSided: false });
    const meshIndex = jsonMeshes.length;
    jsonMeshes.push({ name: part.name, primitives: [{ attributes: { POSITION: positionAccessor, NORMAL: normalAccessor }, indices: indexAccessor, material: materialIndex, mode: 4 }] });
    nodes.push({ name: part.name, mesh: meshIndex, extras: part.extras ?? {} });
    geometry.dispose();
  }
  const binary = Buffer.concat(binaryParts);
  const document = Buffer.from(JSON.stringify({ asset: { version: "2.0", generator: "Prostheia R3 private training asset builder" }, scene: 0, scenes: [{ nodes: nodes.map((_, i) => i) }], nodes, meshes: jsonMeshes, materials, buffers: [{ byteLength: binary.length }], bufferViews, accessors, extras }));
  const jsonPaddedLength = Math.ceil(document.length / 4) * 4;
  const binPaddedLength = Math.ceil(binary.length / 4) * 4;
  const total = 12 + 8 + jsonPaddedLength + 8 + binPaddedLength;
  const header = Buffer.alloc(12); header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(total, 8);
  const jsonHeader = Buffer.alloc(8); jsonHeader.writeUInt32LE(jsonPaddedLength, 0); jsonHeader.writeUInt32LE(0x4e4f534a, 4);
  const jsonChunk = Buffer.alloc(jsonPaddedLength, 0x20); document.copy(jsonChunk);
  const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(binPaddedLength, 0); binHeader.writeUInt32LE(0x004e4942, 4);
  const binChunk = Buffer.alloc(binPaddedLength); binary.copy(binChunk);
  return Buffer.concat([header, jsonHeader, jsonChunk, binHeader, binChunk]);
}

function assetBounds(meshes) {
  const all = meshes.flatMap((mesh) => mesh.positions);
  const box = new THREE.Box3();
  for (let i = 0; i < all.length; i += 3) box.expandByPoint(new THREE.Vector3(all[i], all[i + 1], all[i + 2]));
  return { min: box.min.toArray(), max: box.max.toArray(), spans: box.getSize(new THREE.Vector3()).toArray() };
}

function assetRecord({ id, candidate, kind, fileName, meshes, transform, source, notes, proposedFdi = candidate.anatomy.proposedSourceFDI, derivedFromAssetIdOverride = null, morphologyQaStatus = "VISUAL_SCREENING_PASS" }) {
  const b = assetBounds(meshes);
  const vertexCount = meshes.reduce((sum, mesh) => sum + mesh.positions.length / 3, 0);
  const triangleCount = meshes.reduce((sum, mesh) => sum + mesh.triangles.length, 0);
  return {
    id, assetState: "private_training_approved", kind, title: candidate.title, uid: candidate.sketchfabModelId,
    originalUrl: `https://sketchfab.com/3d-models/${slug(candidate.title)}-${candidate.sketchfabModelId}`,
    licenseName: "CC BY 4.0", licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
    attribution: candidate.attributionTemplate, sourceArchiveChecksum: candidate.download.sha256,
    sourceObjChecksum: source.sourceObjChecksum, sourceObjPath: source.sourceObjPath,
    rawSourceBounds: transform.sourceBounds,
    proposedFdi, originalOrDerived: kind === "intact_tooth" ? "original_runtime_conversion" : "derived_training_geometry",
    sourceUnitStatus: "unknown", sourceUnit: "unknown", unitScaleToMm: null, canonicalRuntimeUnit: "mm",
    coordinateStatus: "unknown", normalizationNotes: notes,
    originalToCanonicalTrainingMatrix: transform.matrix,
    morphologyQaStatus, reviewStatus: "private_training_approved_unreviewed",
    expertReviewStatus: "not_reviewed", patientProvenanceStatus: "unknown",
    derivedFromAssetId: kind === "intact_tooth" ? null : derivedFromAssetIdOverride ?? CANDIDATE_ASSET_IDS.get(candidate.sketchfabModelId),
    runtimeFile: fileName, runtimePath: `/api/private-training-assets/${id}`,
    format: "glb", runtimeBoundsMm: b, runtimeVertexCount: vertexCount, runtimeTriangleCount: triangleCount,
  };
}

function mirrorAcrossSagittalPlane(mesh, label) {
  const reflected = cloneMesh(mesh);
  for (let i = 0; i < reflected.positions.length; i += 3) reflected.positions[i] *= -1;
  reflected.triangles = reflected.triangles.map(([a, b, c]) => [a, c, b]);
  const edgeUses = new Map();
  const faceKeys = new Set();
  let degenerateTriangles = 0;
  for (const [a, b, c] of reflected.triangles) {
    if (a === b || b === c || c === a) { degenerateTriangles += 1; continue; }
    const faceKey = [a, b, c].sort((x, y) => x - y).join(":");
    if (faceKeys.has(faceKey)) throw new Error(`${label} contains a duplicate triangle after mirroring.`);
    faceKeys.add(faceKey);
    const pa = point(reflected.positions, a); const pb = point(reflected.positions, b); const pc = point(reflected.positions, c);
    if (new THREE.Vector3().crossVectors(pb.clone().sub(pa), pc.clone().sub(pa)).lengthSq() < 1e-20) degenerateTriangles += 1;
    for (const [from, to] of [[a, b], [b, c], [c, a]]) {
      const lo = Math.min(from, to); const hi = Math.max(from, to); const keyValue = `${lo}:${hi}`;
      const use = edgeUses.get(keyValue) ?? { count: 0, directionSum: 0 };
      use.count += 1; use.directionSum += from === lo ? 1 : -1; edgeUses.set(keyValue, use);
    }
  }
  const openBoundaryEdges = [...edgeUses.values()].filter((edge) => edge.count === 1).length;
  const nonManifoldEdges = [...edgeUses.values()].filter((edge) => edge.count !== 2).length;
  const sameDirectionTwoFaceEdges = [...edgeUses.values()].filter((edge) => edge.count === 2 && edge.directionSum !== 0).length;
  const signedMeshVolume = signedVolume(reflected.positions, reflected.triangles);
  if (degenerateTriangles || openBoundaryEdges || nonManifoldEdges || sameDirectionTwoFaceEdges || signedMeshVolume <= 0) {
    throw new Error(`${label} topology validation failed: ${JSON.stringify({ degenerateTriangles, openBoundaryEdges, nonManifoldEdges, sameDirectionTwoFaceEdges, signedMeshVolume })}`);
  }
  return { mesh: reflected, topology: { triangleCount: reflected.triangles.length, degenerateTriangles, openBoundaryEdges, nonManifoldEdges, sameDirectionTwoFaceEdges, signedMeshVolume } };
}

function slug(title) { return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function cloneMesh(mesh) { return { positions: [...mesh.positions], triangles: mesh.triangles.map((face) => [...face]) }; }
function translateMesh(mesh, x, y, z) {
  const output = cloneMesh(mesh);
  for (let i = 0; i < output.positions.length; i += 3) { output.positions[i] += x; output.positions[i + 1] += y; output.positions[i + 2] += z; }
  return output;
}

async function main() {
  await mkdir(RUNTIME, { recursive: true });
  const candidateManifest = JSON.parse(await readFile(path.join(RESEARCH, "candidate-manifest.json"), "utf8"));
  const candidates = new Map(candidateManifest.candidates.map((candidate) => [candidate.sketchfabModelId, candidate]));
  const loaded = new Map(); const assetRecords = [];
  for (const uid of CANDIDATE_IDS) {
    const candidate = candidates.get(uid);
    if (!candidate || candidate.meshQA?.status !== "PASS_STRUCTURAL_SCREEN" || candidate.morphologyQA?.status !== "VISUAL_SCREENING_PASS") throw new Error(`Candidate ${uid} is not structurally and visually screening-passing.`);
    if (!Number.isInteger(candidate.anatomy?.proposedSourceFDI)) throw new Error(`Candidate ${uid} has no resolved source-side FDI identity.`);
    const objSourcePath = path.join(RESEARCH, "extracted", uid, "mesh-original", path.basename(candidate.meshQA.sourceFile));
    const sourceBuffer = await readFile(objSourcePath);
    const sourceObjChecksum = createHash("sha256").update(sourceBuffer).digest("hex");
    const sourcePart = candidate.download.meshSourceFiles.find((part) => part.sha256 === sourceObjChecksum);
    if (!sourcePart) throw new Error(`Source checksum mismatch for ${uid}; original OBJ was not modified.`);
    const transformed = transformToTrainingFrame(parseObj(sourceBuffer.toString("utf8")), candidate.anatomy.proposedSourceFDI);
    const intact = { ...transformed, name: `Intact tooth · FDI ${candidate.anatomy.proposedSourceFDI}`, color: [0.88, 0.84, 0.75, 1] };
    const assetId = CANDIDATE_ASSET_IDS.get(uid);
    const fileName = `dundee-${uid}-intact.glb`;
    await writeFile(path.join(RUNTIME, fileName), glbForMeshes([intact], fileName, { privateTraining: true, sourceUid: uid }));
    const source = { sourceObjChecksum, sourceObjPath: `.research/dundee-permanent-teeth/${candidate.meshQA.sourceFile}` };
    const notes = `Source OBJ coordinates and physical units remain unknown. Runtime-only rigid rotation, centering, and a tooth-class display scale were authored for this exercise. The scale is not a measured source-unit conversion or clinical dimension.`;
    assetRecords.push(assetRecord({ id: assetId, candidate, kind: "intact_tooth", fileName, meshes: [intact], transform: transformed, source, notes }));
    loaded.set(candidate.anatomy.proposedSourceFDI, { candidate, transformed, source, intact, assetId });
  }

  const offlineMirrors = [];
  for (const [index, { sourceFdi, targetFdi }] of [
    { sourceFdi: 23, targetFdi: 13 },
    { sourceFdi: 37, targetFdi: 47 },
  ].entries()) {
    const base = loaded.get(sourceFdi);
    if (!base) throw new Error(`Cannot mirror unresolved source FDI ${sourceFdi}.`);
    const { mesh, topology } = mirrorAcrossSagittalPlane({ ...base.transformed, name: `Mirrored training tooth · FDI ${targetFdi}`, color: [0.88, 0.84, 0.75, 1] }, `FDI ${sourceFdi} → ${targetFdi}`);
    const id = derivedUuid(900 + index);
    const fileName = `dundee-${base.candidate.sketchfabModelId}-mirror-fdi-${targetFdi}.glb`;
    await writeFile(path.join(RUNTIME, fileName), glbForMeshes([mesh], fileName, {
      privateTraining: true, sourceUid: base.candidate.sketchfabModelId, derived: true,
      derivation: "offline sagittal reflection with triangle winding reversal and recomputed vertex normals",
      sourceFdi, targetFdi, topology,
    }));
    const record = assetRecord({
      id, candidate: base.candidate, kind: "contralateral_mirror", fileName, meshes: [mesh], transform: base.transformed, source: base.source,
      proposedFdi: targetFdi, derivedFromAssetIdOverride: base.assetId,
      notes: `Controlled OFFLINE sagittal mirror of the source FDI ${sourceFdi} training mesh to FDI ${targetFdi}. Triangle winding was reversed after reflection; runtime vertex normals were recomputed; closed-manifold topology was checked. Exact symmetry is an educational derivation, not a natural contralateral specimen. Source units and patient/source-image provenance remain unknown; not expert reviewed.`,
      morphologyQaStatus: "OFFLINE_MIRROR_TOPOLOGY_PASS_NOT_EXPERT_REVIEWED",
    });
    record.mirrorOfFdi = sourceFdi;
    record.offlineMirrorTopology = topology;
    assetRecords.push(record);
    offlineMirrors.push({ sourceFdi, targetFdi, assetId: id, runtimeFile: fileName, ...topology });
  }

  let nextDerived = 1;
  const addDerived = async ({ fdi, variant, mesh, parts = [mesh], notes, morphologyQaStatus }) => {
    const base = loaded.get(fdi);
    if (!base) throw new Error(`Missing accepted anatomy for FDI ${fdi}.`);
    const id = derivedUuid(nextDerived++);
    const fileName = `r3-${variant}.glb`;
    const isPreparation = variant.startsWith("prep-");
    const defaultColor = isPreparation ? [0.72, 0.66, 0.57, 1] : [0.94, 0.89, 0.78, 1];
    const materialParts = parts.map((part) => ({ ...part, color: part.color ?? defaultColor }));
    await writeFile(path.join(RUNTIME, fileName), glbForMeshes(materialParts, fileName, { privateTraining: true, sourceUid: base.candidate.sketchfabModelId, derived: true }));
    assetRecords.push(assetRecord({ id, candidate: base.candidate, kind: variant.split("-")[0], fileName, meshes: materialParts, transform: base.transformed, source: base.source,
      notes: `${notes} Derived from the preserved source OBJ; geometry is exercise-specific and is not a universal preparation or clinical recommendation.`, morphologyQaStatus: morphologyQaStatus ?? "DERIVED_TRAINING_GEOMETRY_NOT_EXPERT_REVIEWED" }));
    return id;
  };

  const crownPrep26 = await addDerived({ fdi: 26, variant: "prep-crown-26", mesh: taperPreparation(loaded.get(26).transformed, 3.6), notes: "Occlusal reduction and a modest convergent sidewall display were applied; cervical position and root context are retained. Target for this exercise: 3.6 mm stump height above the cervical datum." });
  const crownPrep36 = await addDerived({ fdi: 36, variant: "prep-crown-36", mesh: taperPreparation(loaded.get(36).transformed, 3.5), notes: "Occlusal reduction and a modest convergent sidewall display were applied; cervical position and root context are retained. Target for this exercise: 3.5 mm stump height above the cervical datum." });
  const bridgePrep24 = await addDerived({ fdi: 24, variant: "prep-bridge-24", mesh: taperPreparation(loaded.get(24).transformed, 3.0), notes: "Premolar abutment reduction was derived by clipping the source crown and tapering the coronal walls. Target for this exercise: 3.0 mm preparation height." });
  const inlayPrep36 = await addDerived({ fdi: 36, variant: "prep-inlay-36", mesh: inlayPreparation(loaded.get(36).transformed), notes: "A central intracoronal basin was lowered while the original cusp envelope was retained, visibly separating this preparation from a crown or broad Onlay form." });
  const onlayPrep26 = await addDerived({ fdi: 26, variant: "prep-onlay-26", mesh: taperPreparation(loaded.get(26).transformed, 2.4, 0.22, 0.8), notes: "A broader occlusal and cuspal reduction visibly lowers the posterior crown envelope. Target for this exercise: 2.4 mm remaining coronal height." });
  const veneerPrep21 = await addDerived({ fdi: 21, variant: "prep-veneer-21", mesh: veneerPreparation(loaded.get(21).transformed), notes: "A shallow facial surface reduction was applied while preserving the anterior tooth outline, incisal edge, and cervical region." });

  const crown26 = await addDerived({ fdi: 26, variant: "crown-proposal-26", mesh: clipAtZ(loaded.get(26).transformed, -0.35, "above"), notes: "The intact source crown contour was separated at the cervical training datum to create an editable anatomical proposal aligned to the exercise preparation." });
  const crown36 = await addDerived({ fdi: 36, variant: "crown-proposal-36", mesh: clipAtZ(loaded.get(36).transformed, -0.35, "above"), notes: "The intact source crown contour was separated at the cervical training datum to create an editable anatomical proposal aligned to the exercise preparation." });
  const bridgeCrown24 = clipAtZ(loaded.get(24).transformed, -0.35, "above");
  const bridgePontic25 = clipAtZ(loaded.get(25).transformed, -0.35, "above");
  const bridgeCrown26 = clipAtZ(loaded.get(26).transformed, -0.35, "above");
  const bridgeParts = [
    { ...translateMesh(bridgeCrown24, -8.1, 0, 0), name: "Abutment crown A · 24", color: [0.88, 0.81, 0.66, 1], extras: { restorationUnitId: "bridge-unit-abutment-24" } },
    { ...bridgePontic25, name: "Pontic · 25", color: [0.91, 0.86, 0.73, 1], extras: { restorationUnitId: "bridge-unit-pontic-25" } },
    { ...translateMesh(bridgeCrown26, 8.6, 0, 0), name: "Abutment crown B · 26", color: [0.88, 0.81, 0.66, 1], extras: { restorationUnitId: "bridge-unit-abutment-26" } },
    { ...buildTube([-5.0, 0, 1.05], [-2.7, 0, 1.05], 0.82, "Connector · 24–25"), color: [0.85, 0.77, 0.63, 1], extras: { restorationUnitId: "bridge-connector-24-25" } },
    { ...buildTube([2.7, 0, 1.05], [5.15, 0, 1.05], 0.82, "Connector · 25–26"), color: [0.85, 0.77, 0.63, 1], extras: { restorationUnitId: "bridge-connector-25-26" } },
  ];
  const bridgeDesign = await addDerived({ fdi: 26, variant: "bridge-24-26-connected", mesh: bridgeParts[0], parts: bridgeParts, notes: "Three anatomical crown/pontic forms were linked with two short training connectors; member IDs are retained in GLB node extras and Case Package workflow metadata." });
  const inlayDesign = await addDerived({ fdi: 36, variant: "inlay-36-occlusal", mesh: buildOcclusalPatch(loaded.get(36).transformed, 2.35, 2.9, 1.0, "Inlay 36"), notes: "An occlusal patch samples the preserved tooth surface inside a compact central outline and has a separate training underside; it is not an automatic internal fit." });
  const onlayDesign = await addDerived({ fdi: 26, variant: "onlay-26-cuspal", mesh: buildOcclusalPatch(loaded.get(26).transformed, 3.8, 3.5, 1.5, "Onlay 26"), notes: "A wider occlusal patch samples the tooth cusp surface and covers a broader region than the Inlay exercise. Target for this exercise: the outer shell spans the central and cusp-tip region." });
  const veneerDesign = await addDerived({ fdi: 21, variant: "veneer-21-facial", mesh: buildFacialPatch(loaded.get(21).transformed, 3.35, 4.15, 4.0, 0.65, "Veneer 21"), notes: "A thin source-surface shell was sampled from the incisal/facial surface for CAD editing. Target for this exercise: 0.65 mm display depth; not a clinical thickness prescription." });

  const byId = new Map(assetRecords.map((record) => [record.id, record]));
  const prepIds = [crownPrep26, crownPrep36, bridgePrep24, inlayPrep36, onlayPrep26, veneerPrep21];
  const extraCandidates = [
    { fdi: 26, variant: "prep-bridge-26", sourceVariant: "prep-crown-26" },
  ];
  for (const extra of extraCandidates) {
    const already = byId.get(crownPrep26);
    const base = loaded.get(extra.fdi);
    const copy = { ...already, id: derivedUuid(nextDerived++), runtimeFile: already.runtimeFile.replace("prep-crown-26", extra.variant), runtimePath: already.runtimePath.replace("prep-crown-26", extra.variant), kind: "prep", originalOrDerived: "derived_training_geometry", derivedFromAssetId: base.assetId, proposedFdi: extra.fdi,
      normalizationNotes: "A duplicate named reference to the same source-derived preparation form keeps the bridge abutment asset ID stable in the catalog." };
    await writeFile(path.join(RUNTIME, copy.runtimeFile), await readFile(path.join(RUNTIME, already.runtimeFile)));
    assetRecords.push(copy); prepIds.push(copy.id);
  }

  const crown26BaseMesh = clipAtZ(loaded.get(26).transformed, -0.35, "above");
  const crown26Placement = await addDerived({ fdi: 26, variant: "crown-proposal-26-placement", mesh: translateMesh(crown26BaseMesh, 0, 0, 4.5), notes: "The source-derived anatomical proposal is shifted coronally as a placement checkpoint. The offset is a starting-state cue for this exercise, not a fit measurement." });
  const nearFinalCrown26 = cloneMesh(crown26BaseMesh);
  for (let i = 0; i < nearFinalCrown26.positions.length; i += 3) {
    const x = nearFinalCrown26.positions[i]; const y = nearFinalCrown26.positions[i + 1]; const z = nearFinalCrown26.positions[i + 2];
    const cuspFalloff = Math.max(0, Math.min(1, (z - 5.5) / 2.2));
    const radialFalloff = Math.max(0, 1 - Math.hypot(x, y) / 4.8);
    nearFinalCrown26.positions[i + 2] -= 0.14 * cuspFalloff * radialFalloff;
  }
  const crown26Thickness = await addDerived({ fdi: 26, variant: "crown-proposal-26-near-final", mesh: nearFinalCrown26, notes: "A small occlusal contour adjustment to the source-derived anatomical proposal provides a separate near-final section/thickness checkpoint. The change is an exercise state, not a clinical recommendation." });

  const generatedDesigns = [crown26, crown36, bridgeDesign, inlayDesign, onlayDesign, veneerDesign, crown26Placement, crown26Thickness];
  for (const id of generatedDesigns) byId.set(id, assetRecords.find((record) => record.id === id));
  for (const record of assetRecords) {
    const filePath = path.join(RUNTIME, record.runtimeFile);
    const [file, details] = await Promise.all([readFile(filePath), stat(filePath)]);
    record.runtimeByteSize = details.size;
    record.runtimeChecksum = createHash("sha256").update(file).digest("hex");
  }
  const runtimeBytes = assetRecords.reduce((sum, record) => sum + record.runtimeByteSize, 0);
  await writeFile(OUT_MANIFEST, `${JSON.stringify({ schemaVersion: 1, scope: "PRIVATE EDUCATIONAL V1 ONLY", generatedAt: new Date().toISOString(), sourceManifest: ".research/dundee-permanent-teeth/candidate-manifest.json", acceptedCandidateUids: CANDIDATE_IDS, sourceUnitStatus: "unknown", patientAndSourceImageProvenanceStatus: "unknown", expertReviewStatus: "not_reviewed", publicProductionApproval: false, assets: assetRecords }, null, 2)}\n`);
  console.log(JSON.stringify({ runtimeAssets: assetRecords.length, sourceAssets: CANDIDATE_IDS.length, derivedAssets: assetRecords.length - CANDIDATE_IDS.length, offlineMirrors, runtimeBytes, files: assetRecords.map((record) => record.runtimeFile) }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
