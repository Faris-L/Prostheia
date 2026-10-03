import * as THREE from "three";
import { geometryRegistry } from "../scene/geometry-registry";
import { cadObjectId, type CadObjectId } from "../types";
import { useWorkspaceStore } from "../engine/workspace-store";
import type { AnalysisMeshSnapshot, AnalysisTarget } from "./types";
import { useArticulatorStore } from "../articulator/store";
import { evaluateJawPose, poseMatrix } from "../articulator/kinematics";

export function snapshotMesh(objectId: string, meshId?: string, referencePose = false): AnalysisMeshSnapshot {
  const id = cadObjectId(objectId);
  const runtime = geometryRegistry.get(id);
  const object = runtime?.object;
  if (!runtime || !object) throw new Error("Analysis target is no longer available.");
  object.updateWorldMatrix(true, true);
  const entries = geometryRegistry.getMeshes(id);
  const entry = meshId ? entries.find((mesh) => mesh.key === meshId) : entries.length === 1 ? entries[0] : undefined;
  if (!entry) throw new Error(entries.length > 1 ? "Choose a mesh child for this multi-mesh object." : "Analysis target has no mesh geometry.");
  const position = entry.geometry.getAttribute("position");
  if (!position || position.count < 3) throw new Error("Analysis target has no usable vertices.");
  const positions = new Float32Array(position.count * 3);
  const transform = entry.mesh.matrixWorld.clone();
  if (referencePose && useWorkspaceStore.getState().objects.find((candidate) => candidate.id === id)?.articulatorArch === "lower") {
    const articulation = useArticulatorStore.getState();
    transform.premultiply(poseMatrix(evaluateJawPose(articulation.motion, articulation.t, articulation.config)).invert());
  }
  const point = new THREE.Vector3();
  for (let index = 0; index < position.count; index += 1) {
    point.fromBufferAttribute(position, index).applyMatrix4(transform);
    positions.set(point.toArray(), index * 3);
  }
  const index = entry.geometry.index;
  const indices = index ? Uint32Array.from(index.array) : Uint32Array.from({ length: position.count }, (_, i) => i);
  const metadataTransform = transformSignature(id);
  const signature = referencePose ? metadataTransform : `${transform.toArray().map((value) => Number(value.toPrecision(12))).join(",")};${metadataTransform}`;
  return { objectId: id, meshId: entry.key, geometryRevision: runtime.geometryRevision, transformSignature: signature, positions, indices };
}

export function targetIsCurrent(target: AnalysisTarget, referencePose = false) {
  const runtime = geometryRegistry.get(target.objectId);
  if (!runtime || runtime.geometryRevision !== target.geometryRevision) return false;
  const mesh = geometryRegistry.getMeshes(target.objectId).find((candidate) => candidate.key === target.meshId);
  if (!mesh) return false;
  runtime.object.updateWorldMatrix(true, true);
  const signature = referencePose ? transformSignature(target.objectId) : `${mesh.mesh.matrixWorld.toArray().map((value) => Number(value.toPrecision(12))).join(",")};${transformSignature(target.objectId)}`;
  return signature === target.transformSignature;
}

function transformSignature(id: CadObjectId) { const metadata = useWorkspaceStore.getState().objects.find((object) => object.id === id); return metadata ? [...metadata.transform.position, ...metadata.transform.rotation, ...metadata.transform.scale].map((value) => Number(value.toPrecision(12))).join(",") : "missing"; }

export function pointDistanceMm(a: readonly [number, number, number], b: readonly [number, number, number]) {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}
