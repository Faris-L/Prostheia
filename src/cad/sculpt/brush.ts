import * as THREE from "three";
import { INTERSECTED, NOT_INTERSECTED } from "three-mesh-bvh";

export type SculptTool = "add" | "remove" | "smooth" | "flatten" | "morph";
export type BrushSettings = { radiusMm: number; strength: number };
export type BrushNeighborhood = { vertices: number[]; triangles: number[]; distances: Map<number, number> };

export const SCULPT_CONFIG = {
  minRadiusMm: 0.25,
  maxRadiusMm: 20,
  defaultRadiusMm: 3,
  defaultStrength: 0.35,
  maxStrength: 1,
  lowDensityVertexThreshold: 5_000,
  sampleSpacingRatio: 0.22,
  displacementRatio: 0.12,
} as const;

type BoundsTreeGeometry = THREE.BufferGeometry & { boundsTree?: { shapecast: (callbacks: Record<string, unknown>) => void } };

/** BVH-assisted vertex neighborhood query. Returns unique vertices and triangles in a local-space sphere. */
export function findBrushNeighborhood(geometry: THREE.BufferGeometry, center: THREE.Vector3, radius: number): BrushNeighborhood {
  const position = geometry.getAttribute("position");
  if (!position || radius <= 0) return { vertices: [], triangles: [], distances: new Map() };
  const boundsTree = (geometry as BoundsTreeGeometry).boundsTree;
  const triangles: number[] = [];
  const candidateTriangles = new Set<number>();
  if (boundsTree) {
    const box = new THREE.Box3(center.clone().addScalar(-radius), center.clone().addScalar(radius));
    boundsTree.shapecast({
      intersectsBounds: (bounds: THREE.Box3) => bounds.intersectsBox(box) ? INTERSECTED : NOT_INTERSECTED,
      intersectsTriangle: (_triangle: THREE.Triangle, triangleIndex: number) => { candidateTriangles.add(triangleIndex); return false; },
    });
  } else {
    const index = geometry.index;
    const count = Math.floor((index?.count ?? position.count) / 3);
    for (let triangle = 0; triangle < count; triangle++) candidateTriangles.add(triangle);
  }
  const distances = new Map<number, number>();
  const indices = geometry.index;
  const radiusSq = radius * radius;
  for (const triangle of candidateTriangles) {
    const corners = [0, 1, 2].map((corner) => indices ? indices.getX(triangle * 3 + corner) : triangle * 3 + corner);
    let intersects = false;
    for (const vertex of corners) {
      const dx = position.getX(vertex) - center.x, dy = position.getY(vertex) - center.y, dz = position.getZ(vertex) - center.z;
      const distanceSq = dx * dx + dy * dy + dz * dz;
      if (distanceSq < radiusSq) { intersects = true; distances.set(vertex, Math.min(distances.get(vertex) ?? Infinity, Math.sqrt(distanceSq))); }
    }
    if (intersects) triangles.push(triangle);
  }
  return { vertices: [...distances.keys()], triangles, distances };
}

export function smoothFalloff(distance: number, radius: number) {
  const t = THREE.MathUtils.clamp(1 - distance / radius, 0, 1);
  return t * t * (3 - 2 * t);
}

export function applyBrushSample(
  geometry: THREE.BufferGeometry,
  neighborhood: BrushNeighborhood,
  center: THREE.Vector3,
  normal: THREE.Vector3,
  settings: BrushSettings,
  tool: SculptTool,
  displacement: THREE.Vector3 = new THREE.Vector3(),
) {
  const position = geometry.getAttribute("position") as THREE.BufferAttribute;
  if (!position || !neighborhood.vertices.length) return false;
  const indices = geometry.index;
  const normals = geometry.getAttribute("normal");
  const strength = THREE.MathUtils.clamp(settings.strength, 0, SCULPT_CONFIG.maxStrength);
  const radius = settings.radiusMm;
  const scale = radius * SCULPT_CONFIG.displacementRatio * strength;
  const targetPlaneNormal = normal.clone().normalize();
  const neighbors = tool === "smooth" ? buildNeighborhoodAdjacency(neighborhood, indices) : undefined;
  let changed = false;
  for (const vertex of neighborhood.vertices) {
    const distance = neighborhood.distances.get(vertex) ?? radius;
    const influence = smoothFalloff(distance, radius) * strength;
    if (!influence) continue;
    const x = position.getX(vertex), y = position.getY(vertex), z = position.getZ(vertex);
    if (tool === "add" || tool === "remove") {
      const nx = normals?.getX(vertex) ?? targetPlaneNormal.x, ny = normals?.getY(vertex) ?? targetPlaneNormal.y, nz = normals?.getZ(vertex) ?? targetPlaneNormal.z;
      const sign = tool === "add" ? 1 : -1;
      position.setXYZ(vertex, x + nx * scale * influence * sign, y + ny * scale * influence * sign, z + nz * scale * influence * sign);
    } else if (tool === "flatten") {
      const signedDistance = (x - center.x) * targetPlaneNormal.x + (y - center.y) * targetPlaneNormal.y + (z - center.z) * targetPlaneNormal.z;
      position.setXYZ(vertex, x - targetPlaneNormal.x * signedDistance * influence, y - targetPlaneNormal.y * signedDistance * influence, z - targetPlaneNormal.z * signedDistance * influence);
    } else if (tool === "morph") {
      position.setXYZ(vertex, x + displacement.x * influence, y + displacement.y * influence, z + displacement.z * influence);
    } else {
      const adjacent = neighbors?.get(vertex) ?? [];
      if (!adjacent.length) continue;
      let ax = 0, ay = 0, az = 0;
      for (const neighbor of adjacent) { ax += position.getX(neighbor); ay += position.getY(neighbor); az += position.getZ(neighbor); }
      const factor = Math.min(0.45, influence * 0.45);
      const inv = 1 / adjacent.length;
      position.setXYZ(vertex, x + (ax * inv - x) * factor, y + (ay * inv - y) * factor, z + (az * inv - z) * factor);
    }
    if (Math.abs(position.getX(vertex) - x) + Math.abs(position.getY(vertex) - y) + Math.abs(position.getZ(vertex) - z) > 1e-10) changed = true;
  }
  if (!changed) return false;
  position.needsUpdate = true;
  recomputeNormals(geometry, neighborhood);
  return true;
}

function buildNeighborhoodAdjacency(neighborhood: BrushNeighborhood, indices: THREE.BufferAttribute | null) {
  const adjacent = new Map<number, Set<number>>();
  const add = (a: number, b: number) => { if (!adjacent.has(a)) adjacent.set(a, new Set()); adjacent.get(a)!.add(b); };
  for (const triangle of neighborhood.triangles) {
    const offset = triangle * 3;
    const tri = [0, 1, 2].map((corner) => indices ? indices.getX(offset + corner) : offset + corner);
    add(tri[0], tri[1]); add(tri[0], tri[2]); add(tri[1], tri[0]); add(tri[1], tri[2]); add(tri[2], tri[0]); add(tri[2], tri[1]);
  }
  return new Map([...adjacent].map(([id, set]) => [id, [...set]]));
}

function recomputeNormals(geometry: THREE.BufferGeometry, neighborhood: BrushNeighborhood) {
  const normals = geometry.getAttribute("normal") as THREE.BufferAttribute | undefined;
  if (!normals || normals.count !== geometry.getAttribute("position").count) { geometry.computeVertexNormals(); return; }
  const indices = geometry.index, positions = geometry.getAttribute("position");
  const sums = new Map<number, THREE.Vector3>();
  for (const vertex of neighborhood.vertices) sums.set(vertex, new THREE.Vector3());
  for (const triangle of neighborhood.triangles) {
    const offset = triangle * 3;
    const ids = [0, 1, 2].map((corner) => indices ? indices.getX(offset + corner) : offset + corner);
    const a = point(ids[0]), b = point(ids[1]), c = point(ids[2]);
    const face = b.sub(a).cross(c.sub(a));
    for (const id of ids) sums.get(id)?.add(face);
  }
  for (const [id, sum] of sums) {
    if (sum.lengthSq() > 1e-16) { sum.normalize(); normals.setXYZ(id, sum.x, sum.y, sum.z); }
  }
  normals.needsUpdate = true;
  function point(id: number) { return new THREE.Vector3(positions.getX(id), positions.getY(id), positions.getZ(id)); }
}
