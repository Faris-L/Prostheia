import * as THREE from "three";
import { MeshBVH } from "three-mesh-bvh";
import type { AnalysisMeshSnapshot, DynamicContactAnalysisResult } from "../analysis/types";
import { poseMatrix } from "./kinematics";
import type { MotionSample } from "./types";

function geometryOf(mesh: AnalysisMeshSnapshot) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(mesh.positions.slice(), 3));
  geometry.setIndex(new THREE.BufferAttribute(mesh.indices.slice(), 1));
  geometry.computeVertexNormals(); geometry.computeBoundingBox();
  return geometry;
}

/** Runs deterministic, sampled surface proximity against a moving lower arch. */
export function computeDynamicContact(targets: [AnalysisMeshSnapshot, AnalysisMeshSnapshot], samples: MotionSample[], thresholdMm: number, configSignature = "", onProgress: (progress: number) => void = () => {}): DynamicContactAnalysisResult {
  if (!Number.isFinite(thresholdMm) || thresholdMm <= 0) throw new Error("Contact threshold must be greater than 0 mm.");
  if (!samples.length) throw new Error("Dynamic analysis requires at least one motion sample.");
  const upper = geometryOf(targets[0]);
  const lowerReference = geometryOf(targets[1]);
  const upperPosition = upper.getAttribute("position");
  const lowerPosition = lowerReference.getAttribute("position");
  const upperBvh = new MeshBVH(upper, { targetLeafSize: 12 });
  if (!upperPosition.count || !lowerPosition.count) throw new Error("Dynamic analysis geometry is empty.");
  const point = new THREE.Vector3();
  const maxVertexSamples = 2500;
  const stride = Math.max(1, Math.ceil(upperPosition.count / maxVertexSamples));
  const events: DynamicContactAnalysisResult["samples"] = [];
  for (const [sampleOrdinal, sample] of samples.entries()) {
    const moving = lowerReference.clone();
    moving.applyMatrix4(poseMatrix(sample.pose));
    const bvh = new MeshBVH(moving, { targetLeafSize: 12 });
    const hit = { point: new THREE.Vector3(), distance: Infinity, faceIndex: -1 };
    let minimum = Infinity;
    for (let i = 0; i < upperPosition.count; i += stride) {
      point.fromBufferAttribute(upperPosition, i);
      const closest = bvh.closestPointToPoint(point, hit);
      if (closest && Number.isFinite(closest.distance)) minimum = Math.min(minimum, closest.distance);
    }
    const intersects = upperBvh.intersectsGeometry(moving, new THREE.Matrix4());
    moving.disposeBoundsTree?.(); moving.dispose();
    const state = intersects ? "intersection" : minimum <= thresholdMm ? "contact" : minimum <= thresholdMm * 3 ? "near" : "separated";
    events.push({ sampleIndex: sample.index, t: sample.t, distanceMm: minimum, state });
    onProgress((sampleOrdinal + 1) / samples.length);
  }
  upper.disposeBoundsTree?.(); upper.dispose(); lowerReference.dispose();
  const first = events.find((event) => event.state === "contact" || event.state === "intersection") ?? null;
  return {
    kind: "dynamic_contact", targets: targets.map(({ objectId, meshId, geometryRevision, transformSignature }) => ({ objectId, meshId, geometryRevision, transformSignature })) as DynamicContactAnalysisResult["targets"],
    thresholdMm, samples: events, firstContactSample: first?.sampleIndex ?? null, firstContactT: first?.t ?? null, motion: samples[0].motion, configSignature,
  };
}
