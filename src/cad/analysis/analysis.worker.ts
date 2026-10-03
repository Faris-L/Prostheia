import * as THREE from "three";
import { MeshBVH } from "three-mesh-bvh";
import type { AnalysisRequest, AnalysisResponse, AnalysisMeshSnapshot, AnalysisResult, ScalarAnalysisKind } from "./types";
import { computeDynamicContact } from "../articulator/contact";

const scope = self as unknown as { onmessage: ((event: MessageEvent<AnalysisRequest>) => void) | null; postMessage(message: AnalysisResponse, transfer?: Transferable[]): void };
scope.onmessage = (event) => {
  const request = event.data;
  if (!request || request.type !== "ANALYSIS_REQUEST") return;
  try {
    if (request.kind === "dynamic_contact") {
      const result = computeDynamicContact(request.targets, request.samples, request.thresholdMm, request.configSignature, (progress) => scope.postMessage({ type: "ANALYSIS_PROGRESS", requestId: request.requestId, progress }));
      scope.postMessage({ type: "ANALYSIS_SUCCESS", requestId: request.requestId, result });
      return;
    }
    if (!request.targets.length || (request.kind !== "thickness" && request.kind !== "undercut" && request.targets.length < 2)) throw new Error("The selected analysis targets are incomplete.");
    const [a, b] = request.targets;
    if (request.kind === "intersection") {
      const intersects = computeSurfaceIntersection(a, b!);
      scope.postMessage({ type: "ANALYSIS_SUCCESS", requestId: request.requestId, result: { kind: "intersection", intersects, targets: [targetOf(a), targetOf(b!)] } });
      return;
    }
    const progress = (value: number) => scope.postMessage({ type: "ANALYSIS_PROGRESS", requestId: request.requestId, progress: value });
    let result: AnalysisResult;
    switch (request.kind) {
      case "undercut": result = computeDirectionalUndercut(a, request.insertionDirection, progress); break;
      case "thickness": result = computeSurfaceThickness(a, request.thresholdMm, progress); break;
      case "contact": case "deviation": result = computeSurfaceDistances(request.kind, a, b!, request.thresholdMm, progress); break;
    }
    if ("values" in result) scope.postMessage({ type: "ANALYSIS_SUCCESS", requestId: request.requestId, result }, [result.values.buffer, result.valid.buffer]);
    else scope.postMessage({ type: "ANALYSIS_SUCCESS", requestId: request.requestId, result });
  } catch (error) {
    scope.postMessage({ type: "ANALYSIS_ERROR", requestId: request.requestId, message: error instanceof Error ? error.message : "Geometry analysis failed." });
  }
};

function targetOf(mesh: AnalysisMeshSnapshot) { return { objectId: mesh.objectId, meshId: mesh.meshId, geometryRevision: mesh.geometryRevision, transformSignature: mesh.transformSignature }; }
function toGeometry(mesh: AnalysisMeshSnapshot) {
  if (mesh.positions.length < 9 || mesh.positions.length % 3 || mesh.indices.length < 3 || mesh.indices.length % 3 || !mesh.positions.every(Number.isFinite)) throw new Error("Analysis target has invalid or empty triangle geometry.");
  const vertexCount = mesh.positions.length / 3;
  if (mesh.indices.some((index) => index >= vertexCount)) throw new Error("Analysis target contains an out-of-range triangle index.");
  const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position", new THREE.BufferAttribute(mesh.positions, 3)); geometry.setIndex(new THREE.BufferAttribute(mesh.indices, 1)); geometry.computeVertexNormals(); geometry.computeBoundingBox(); return geometry;
}
export function computeSurfaceIntersection(a: AnalysisMeshSnapshot, b: AnalysisMeshSnapshot) {
  const geometryA = toGeometry(a), geometryB = toGeometry(b);
  const result = Boolean(new MeshBVH(geometryA, { targetLeafSize: 12 }).intersectsGeometry(geometryB, new THREE.Matrix4()));
  geometryA.dispose(); geometryB.dispose();
  return result;
}
export function computeSurfaceDistances(kind: ScalarAnalysisKind, source: AnalysisMeshSnapshot, other: AnalysisMeshSnapshot, thresholdMm: number, onProgress: (progress: number) => void = () => {}) {
  if (!Number.isFinite(thresholdMm) || thresholdMm <= 0) throw new Error("Visualization threshold must be greater than 0 mm.");
  const sourceGeometry = toGeometry(source), targetGeometry = toGeometry(other);
  const targetBvh = new MeshBVH(targetGeometry, { targetLeafSize: 12 });
  const position = sourceGeometry.getAttribute("position");
  const values = new Float32Array(position.count); const valid = new Uint8Array(position.count);
  let minMm = Infinity, maxMm = -Infinity, sampleCount = 0;
  const point = new THREE.Vector3(); const hit = { point: new THREE.Vector3(), distance: Infinity, faceIndex: -1 };
  const interval = Math.max(1, Math.floor(position.count / 20));
  for (let i = 0; i < position.count; i += 1) {
    point.fromBufferAttribute(position, i);
    const closest = targetBvh.closestPointToPoint(point, hit);
    if (closest && Number.isFinite(closest.distance)) {
      values[i] = closest.distance;
      valid[i] = 1;
      minMm = Math.min(minMm, closest.distance); maxMm = Math.max(maxMm, closest.distance); sampleCount += 1;
    }
    if (i % interval === 0) onProgress(i / position.count);
  }
  sourceGeometry.dispose(); targetGeometry.dispose();
  if (sampleCount === 0) throw new Error("No valid surface distance samples were produced.");
  return { kind, targets: [targetOf(source), targetOf(other)], values, valid, minMm, maxMm, thresholdMm, sampleCount };
}

export function computeDirectionalUndercut(source: AnalysisMeshSnapshot, insertionDirection: [number, number, number], onProgress: (progress: number) => void = () => {}) {
  const magnitude = Math.hypot(...insertionDirection);
  if (!Number.isFinite(magnitude) || magnitude < 1e-8) throw new Error("Set a non-zero insertion direction before running this preview.");
  const direction = insertionDirection.map((value) => value / magnitude) as [number, number, number];
  const geometry = toGeometry(source); const normals = geometry.getAttribute("normal"); const positions = geometry.getAttribute("position");
  const bvh = new MeshBVH(geometry, { targetLeafSize: 12 });
  const values = new Float32Array(positions.count); const valid = new Uint8Array(positions.count); let sampleCount = 0;
  let maximum = 0; const interval = Math.max(1, Math.floor(positions.count / 20));
  const path = new THREE.Vector3(...direction); const point = new THREE.Vector3(); const normal = new THREE.Vector3();
  const ray = new THREE.Ray(new THREE.Vector3(), path); const startOffsetMm = 0.04;
  for (let index = 0; index < positions.count; index += 1) {
    normal.fromBufferAttribute(normals, index).normalize();
    const facingAway = Math.max(0, -normal.dot(path));
    point.fromBufferAttribute(positions, index);
    ray.origin.copy(point).addScaledVector(path, startOffsetMm);
    const obstruction = facingAway > 0.025 ? bvh.raycastFirst(ray, THREE.DoubleSide, startOffsetMm, 25) : null;
    // A ray in the seating direction must clear the source surface. A second surface hit
    // marks a directionally obstructed patch; the score is an orientation/visibility
    // preview only and is not a measured undercut depth.
    const obstructed = !!obstruction && obstruction.distance > startOffsetMm * 2;
    const score = obstructed ? facingAway : 0;
    values[index] = score; valid[index] = 1; maximum = Math.max(maximum, score); sampleCount += 1;
    if (index % interval === 0) onProgress(index / positions.count);
  }
  geometry.dispose();
  return { kind: "undercut" as const, targets: [targetOf(source)] as [ReturnType<typeof targetOf>], values, valid, minMm: 0, maxMm: maximum, thresholdMm: 1 as const, sampleCount, insertionDirection: direction, note: "directional-preview" as const };
}

export function computeSurfaceThickness(source: AnalysisMeshSnapshot, thresholdMm: number, onProgress: (progress: number) => void = () => {}) {
  if (!Number.isFinite(thresholdMm) || thresholdMm <= 0) throw new Error("Exercise thickness target must be greater than 0 mm.");
  const geometry = toGeometry(source); const bvh = new MeshBVH(geometry, { targetLeafSize: 12 });
  const positions = geometry.getAttribute("position"); const normals = geometry.getAttribute("normal");
  const values = new Float32Array(positions.count); const valid = new Uint8Array(positions.count); let minimum = Infinity; let maximum = -Infinity; let sampleCount = 0;
  const origin = new THREE.Vector3(); const direction = new THREE.Vector3(); const epsilon = 0.025;
  const interval = Math.max(1, Math.floor(positions.count / 20));
  for (let index = 0; index < positions.count; index += 1) {
    const normal = new THREE.Vector3().fromBufferAttribute(normals, index).normalize();
    origin.fromBufferAttribute(positions, index).addScaledVector(normal, -epsilon);
    direction.copy(normal).negate();
    const intersections = bvh.raycast(new THREE.Ray(origin, direction), THREE.DoubleSide);
    const opposite = intersections.find((intersection) => intersection.distance > epsilon * 2);
    if (opposite && Number.isFinite(opposite.distance)) {
      const value = opposite.distance + epsilon;
      values[index] = value; valid[index] = 1; minimum = Math.min(minimum, value); maximum = Math.max(maximum, value); sampleCount += 1;
    }
    if (index % interval === 0) onProgress(index / positions.count);
  }
  geometry.dispose();
  if (sampleCount < Math.ceil(positions.count * 0.8)) throw new Error("Thickness is unavailable for this open or ambiguous mesh. Use a closed restoration surface.");
  return { kind: "thickness" as const, targets: [targetOf(source)], values, valid, minMm: minimum, maxMm: maximum, thresholdMm, sampleCount };
}
