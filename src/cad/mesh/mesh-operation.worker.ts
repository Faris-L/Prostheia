import type { MeshData, MeshOperationRequest, MeshOperationResult } from "./types";
import { validateMeshData } from "./geometry";

const scope = self as unknown as { onmessage: ((event: MessageEvent<MeshOperationRequest & { jobId: string }>) => void) | null; postMessage(message: { jobId: string; result: MeshOperationResult }, transfer?: Transferable[]): void };

scope.onmessage = (event) => {
  const { jobId, ...request } = event.data;
  try {
    const mesh = applyMeshOperation(request);
    const invalid = validateMeshData(mesh);
    if (invalid) throw new Error(invalid);
    const transfer: Transferable[] = [mesh.positions.buffer, mesh.indices.buffer];
    if (mesh.normals) transfer.push(mesh.normals.buffer);
    if (mesh.colors) transfer.push(mesh.colors.buffer);
    scope.postMessage({ jobId, result: { ok: true, mesh } }, transfer);
  } catch (error) {
    scope.postMessage({ jobId, result: { ok: false, message: error instanceof Error ? error.message : "The mesh operation failed." } });
  }
};

export function applyMeshOperation(request: MeshOperationRequest): MeshData {
  let result: MeshData;
  switch (request.kind) {
    case "delete": result = deleteFaces(request.mesh, new Set(request.selectedFaces ?? [])); break;
    case "trim": result = trimPlane(request.mesh, Number(request.parameters?.nx), Number(request.parameters?.ny), Number(request.parameters?.nz), Number(request.parameters?.offset)); break;
    case "smooth": result = smooth(request.mesh, Math.max(1, Math.min(5, Number(request.parameters?.iterations ?? 1)))); break;
    case "fill-hole": result = fillHole(request.mesh); break;
    case "cleanup": result = cleanup(request.mesh); break;
    case "mirror": result = mirror(request.mesh, String(request.parameters?.axis ?? "x")); break;
  }
  result.normals = computeNormals(result);
  result.bounds = computeBounds(result);
  return result;
}

function cloneMesh(mesh: MeshData): MeshData { return { ...mesh, positions: mesh.positions.slice(), indices: mesh.indices.slice(), normals: mesh.normals?.slice(), colors: mesh.colors?.slice() }; }
function deleteFaces(mesh: MeshData, faces: Set<number>): MeshData {
  if (!faces.size) throw new Error("Select at least one mesh face before deleting.");
  const indices = Array.from(mesh.indices).filter((_, index) => !faces.has(Math.floor(index / 3)));
  if (indices.length === mesh.indices.length) throw new Error("The selected faces could not be found in the current mesh revision.");
  return { ...cloneMesh(mesh), indices: Uint32Array.from(indices) };
}

function trimPlane(mesh: MeshData, nx: number, ny: number, nz: number, offset: number): MeshData {
  const length = Math.hypot(nx, ny, nz);
  if (!Number.isFinite(length) || length < 1e-8 || !Number.isFinite(offset)) throw new Error("Set a valid trim plane before applying Trim.");
  nx /= length; ny /= length; nz /= length;
  const outPos: number[] = []; const outColors: number[] = []; const outIndices: number[] = []; const shared = new Map<string, number>();
  const itemSize = mesh.colorItemSize ?? 3;
  const vertex = (index: number) => ({ p: [mesh.positions[index * 3], mesh.positions[index * 3 + 1], mesh.positions[index * 3 + 2]], c: mesh.colors ? Array.from(mesh.colors.slice(index * itemSize, (index + 1) * itemSize)) : undefined });
  const distance = (p: number[]) => p[0] * nx + p[1] * ny + p[2] * nz - offset;
  const add = (v: { p: number[]; c?: number[] }) => { const key = [...v.p.map((value) => Math.round(value * 1e6)), ...(v.c ?? [])].join(":"); const previous = shared.get(key); if (previous !== undefined) return previous; const id = outPos.length / 3; shared.set(key, id); outPos.push(...v.p); if (v.c) outColors.push(...v.c); return id; };
  for (let i = 0; i < mesh.indices.length; i += 3) {
    let polygon = [vertex(mesh.indices[i]), vertex(mesh.indices[i + 1]), vertex(mesh.indices[i + 2])];
    const clipped: typeof polygon = [];
    for (let j = 0; j < polygon.length; j++) {
      const a = polygon[j], b = polygon[(j + 1) % polygon.length]; const da = distance(a.p), db = distance(b.p); const insideA = da <= 0, insideB = db <= 0;
      if (insideA) clipped.push(a);
      if (insideA !== insideB) {
        const t = da / (da - db); const p = a.p.map((value, axis) => value + (b.p[axis] - value) * t);
        const c = a.c && b.c ? a.c.map((value, axis) => value + (b.c![axis] - value) * t) : undefined;
        clipped.push({ p, c });
      }
    }
    polygon = clipped;
    if (polygon.length < 3) continue;
    const ids = polygon.map(add); for (let j = 1; j < ids.length - 1; j++) outIndices.push(ids[0], ids[j], ids[j + 1]);
  }
  if (!outIndices.length) throw new Error("Trim would remove the entire mesh. Move the trim plane and try again.");
  return { positions: Float32Array.from(outPos), indices: Uint32Array.from(outIndices), colors: mesh.colors ? Float32Array.from(outColors) : undefined, colorItemSize: mesh.colorItemSize };
}

function smooth(mesh: MeshData, iterations: number): MeshData {
  const result = cloneMesh(mesh); const adjacency = Array.from({ length: mesh.positions.length / 3 }, () => new Set<number>());
  for (let i = 0; i < mesh.indices.length; i += 3) { const [a, b, c] = [mesh.indices[i], mesh.indices[i + 1], mesh.indices[i + 2]]; adjacency[a].add(b); adjacency[a].add(c); adjacency[b].add(a); adjacency[b].add(c); adjacency[c].add(a); adjacency[c].add(b); }
  let current = result.positions;
  for (let pass = 0; pass < iterations; pass++) { const next = current.slice(); for (let i = 0; i < adjacency.length; i++) { const neighbors = [...adjacency[i]]; if (!neighbors.length) continue; for (let axis = 0; axis < 3; axis++) { let avg = 0; for (const neighbor of neighbors) avg += current[neighbor * 3 + axis]; next[i * 3 + axis] = current[i * 3 + axis] * 0.65 + (avg / neighbors.length) * 0.35; } } current = next; }
  result.positions = current; result.normals = undefined; return result;
}

function fillHole(mesh: MeshData): MeshData {
  const edgeCounts = new Map<string, { a: number; b: number; count: number }>();
  const edge = (a: number, b: number) => { const key = a < b ? `${a}:${b}` : `${b}:${a}`; const found = edgeCounts.get(key); if (found) found.count++; else edgeCounts.set(key, { a, b, count: 1 }); };
  for (let i = 0; i < mesh.indices.length; i += 3) { const a = mesh.indices[i], b = mesh.indices[i + 1], c = mesh.indices[i + 2]; edge(a, b); edge(b, c); edge(c, a); }
  const boundary = [...edgeCounts.values()].filter((entry) => entry.count === 1);
  if ([...edgeCounts.values()].some((entry) => entry.count > 2)) throw new Error("Fill Hole cannot continue because the mesh contains non-manifold edges.");
  if (boundary.length < 3) throw new Error("Fill Hole could not find an open boundary.");
  const adjacent = new Map<number, number[]>();
  for (const { a, b } of boundary) { adjacent.set(a, [...(adjacent.get(a) ?? []), b]); adjacent.set(b, [...(adjacent.get(b) ?? []), a]); }
  if ([...adjacent.values()].some((neighbors) => neighbors.length !== 2)) throw new Error("Fill Hole requires one simple boundary loop. The selected mesh has branching or non-manifold edges.");
  const start = boundary[0].a; const loop = [start]; let previous = -1, current = start;
  for (let step = 0; step <= boundary.length; step++) { const next = (adjacent.get(current) ?? []).find((candidate) => candidate !== previous); if (next === undefined) break; if (next === start) break; if (loop.includes(next)) throw new Error("Fill Hole could not complete because the boundary is not a single closed loop."); loop.push(next); previous = current; current = next; }
  if (loop.length !== boundary.length || (adjacent.get(current) ?? []).length !== 2) throw new Error("Fill Hole could not complete because the boundary is not a single closed loop.");
  const indices = Array.from(mesh.indices); for (let i = 1; i < loop.length - 1; i++) indices.push(loop[0], loop[i], loop[i + 1]);
  return { ...cloneMesh(mesh), indices: Uint32Array.from(indices), normals: undefined };
}

function cleanup(mesh: MeshData): MeshData {
  const outIndices: number[] = [];
  for (let i = 0; i < mesh.indices.length; i += 3) { const [a, b, c] = [mesh.indices[i], mesh.indices[i + 1], mesh.indices[i + 2]]; if (a === b || b === c || a === c) continue; const ab = sqDist(mesh.positions, a, b), bc = sqDist(mesh.positions, b, c), ca = sqDist(mesh.positions, c, a); if (Math.max(ab, bc, ca) < 1e-16) continue; outIndices.push(a, b, c); }
  if (outIndices.length === mesh.indices.length) throw new Error("Cleanup found no degenerate triangles to remove.");
  const used = [...new Set(outIndices)].sort((a, b) => a - b); const remap = new Map(used.map((id, next) => [id, next]));
  const positions = Float32Array.from(used.flatMap((id) => Array.from(mesh.positions.slice(id * 3, id * 3 + 3))));
  const indices = Uint32Array.from(outIndices.map((id) => remap.get(id)!));
  const colors = mesh.colors ? Float32Array.from(used.flatMap((id) => Array.from(mesh.colors!.slice(id * (mesh.colorItemSize ?? 3), (id + 1) * (mesh.colorItemSize ?? 3))))) : undefined;
  return { positions, indices, colors, colorItemSize: mesh.colorItemSize, normals: undefined };
}
function sqDist(p: Float32Array, a: number, b: number) { return (p[a * 3] - p[b * 3]) ** 2 + (p[a * 3 + 1] - p[b * 3 + 1]) ** 2 + (p[a * 3 + 2] - p[b * 3 + 2]) ** 2; }

function mirror(mesh: MeshData, axis: string): MeshData {
  const coordinate = axis.toLowerCase() === "x" ? 0 : axis.toLowerCase() === "y" ? 1 : axis.toLowerCase() === "z" ? 2 : -1;
  if (coordinate < 0) throw new Error("Choose X, Y, or Z for Mirror.");
  const result = cloneMesh(mesh); for (let i = coordinate; i < result.positions.length; i += 3) result.positions[i] *= -1;
  for (let i = 0; i < result.indices.length; i += 3) [result.indices[i + 1], result.indices[i + 2]] = [result.indices[i + 2], result.indices[i + 1]];
  if (result.normals) for (let i = coordinate; i < result.normals.length; i += 3) result.normals[i] *= -1;
  return result;
}

function computeNormals(mesh: MeshData) {
  const normals = new Float32Array(mesh.positions.length);
  for (let i = 0; i < mesh.indices.length; i += 3) {
    const a = mesh.indices[i] * 3, b = mesh.indices[i + 1] * 3, c = mesh.indices[i + 2] * 3;
    const abx = mesh.positions[b] - mesh.positions[a], aby = mesh.positions[b + 1] - mesh.positions[a + 1], abz = mesh.positions[b + 2] - mesh.positions[a + 2];
    const acx = mesh.positions[c] - mesh.positions[a], acy = mesh.positions[c + 1] - mesh.positions[a + 1], acz = mesh.positions[c + 2] - mesh.positions[a + 2];
    const nx = aby * acz - abz * acy, ny = abz * acx - abx * acz, nz = abx * acy - aby * acx;
    for (const vertex of [a, b, c]) { normals[vertex] += nx; normals[vertex + 1] += ny; normals[vertex + 2] += nz; }
  }
  for (let i = 0; i < normals.length; i += 3) { const length = Math.hypot(normals[i], normals[i + 1], normals[i + 2]); if (length > 1e-20) { normals[i] /= length; normals[i + 1] /= length; normals[i + 2] /= length; } }
  return normals;
}

function computeBounds(mesh: MeshData) {
  const min: [number, number, number] = [Infinity, Infinity, Infinity]; const max: [number, number, number] = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < mesh.positions.length; i += 3) for (let axis = 0; axis < 3; axis++) { min[axis] = Math.min(min[axis], mesh.positions[i + axis]); max[axis] = Math.max(max[axis], mesh.positions[i + axis]); }
  const center: [number, number, number] = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2]; let radius = 0;
  for (let i = 0; i < mesh.positions.length; i += 3) radius = Math.max(radius, Math.hypot(mesh.positions[i] - center[0], mesh.positions[i + 1] - center[1], mesh.positions[i + 2] - center[2]));
  return { min, max, center, radius };
}
