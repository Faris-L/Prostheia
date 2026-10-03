import * as THREE from "three";
import { geometryRegistry } from "../scene/geometry-registry";
import type { CadObjectId } from "../types";
import { MeshOperationCommand } from "../engine/commands";
import { useHistoryStore } from "../engine/history-store";
import { useWorkspaceStore } from "../engine/workspace-store";
import { SCULPT_CONFIG, applyBrushSample, findBrushNeighborhood, type BrushSettings, type SculptTool } from "./brush";

export type SculptStroke = {
  objectId: CadObjectId;
  meshKey: string;
  mesh: THREE.Mesh;
  source: THREE.BufferGeometry;
  working: THREE.BufferGeometry;
  beforeRevision: number;
  lastPoint: THREE.Vector3;
  settings: BrushSettings;
  tool: SculptTool;
  changed: boolean;
  initialized: boolean;
};

export function beginSculptStroke(objectId: CadObjectId, meshKey: string, tool: SculptTool, settings: BrushSettings): SculptStroke {
  const runtime = geometryRegistry.get(objectId);
  if (!runtime || runtime.role === "reference") throw new Error("Sculpting is available only on editable mesh objects.");
  const entry = geometryRegistry.getMeshes(objectId).find((mesh) => mesh.key === meshKey);
  if (!entry || !(entry.mesh instanceof THREE.Mesh)) throw new Error("Choose an editable mesh child before sculpting.");
  const working = entry.geometry.clone();
  const stroke: SculptStroke = { objectId, meshKey, mesh: entry.mesh, source: entry.geometry, working, beforeRevision: runtime.geometryRevision, lastPoint: new THREE.Vector3(), settings, tool, changed: false, initialized: false };
  entry.mesh.geometry = working;
  return stroke;
}

export function applySculptPoint(stroke: SculptStroke, center: THREE.Vector3, normal: THREE.Vector3, worldDisplacement = new THREE.Vector3()) {
  const radius = THREE.MathUtils.clamp(stroke.settings.radiusMm, SCULPT_CONFIG.minRadiusMm, SCULPT_CONFIG.maxRadiusMm);
  const scale = new THREE.Vector3(); stroke.mesh.getWorldScale(scale);
  const worldToLocalScale = 1 / Math.max(Math.abs(scale.x), Math.abs(scale.y), Math.abs(scale.z), 1e-6);
  const localRadius = radius * worldToLocalScale;
  const localCenter = stroke.mesh.worldToLocal(center.clone());
  const inverseMatrix = new THREE.Matrix4().copy(stroke.mesh.matrixWorld).invert();
  const inverse = new THREE.Matrix3().setFromMatrix4(inverseMatrix);
  const localNormal = normal.clone().applyMatrix3(new THREE.Matrix3().getNormalMatrix(inverseMatrix)).normalize();
  const localDisplacement = worldDisplacement.clone().applyMatrix3(inverse);
  if (!stroke.initialized) { stroke.lastPoint.copy(localCenter); stroke.initialized = true; }
  const spacing = Math.max(localRadius * SCULPT_CONFIG.sampleSpacingRatio, 0.05);
  const distance = stroke.lastPoint.distanceTo(localCenter);
  const steps = Math.max(1, Math.ceil(distance / spacing));
  for (let step = 1; step <= steps; step++) {
    const t = step / steps;
    const sampleCenter = stroke.lastPoint.clone().lerp(localCenter, t);
    const neighborhood = findBrushNeighborhood(stroke.source, sampleCenter, localRadius);
    const sampleNormal = localNormal.clone();
    if (stroke.tool === "flatten") {
      const normals = stroke.source.getAttribute("normal");
      if (normals && neighborhood.vertices.length) {
        sampleNormal.set(0, 0, 0);
        for (const vertex of neighborhood.vertices) sampleNormal.add(new THREE.Vector3(normals.getX(vertex), normals.getY(vertex), normals.getZ(vertex)));
        if (sampleNormal.lengthSq() < 1e-12) sampleNormal.copy(localNormal);
        sampleNormal.normalize();
      }
    }
    const move = localDisplacement.clone().multiplyScalar(1 / steps);
    stroke.changed = applyBrushSample(stroke.working, neighborhood, sampleCenter, sampleNormal, { ...stroke.settings, radiusMm: localRadius }, stroke.tool, move) || stroke.changed;
  }
  stroke.lastPoint.copy(localCenter);
  stroke.mesh.geometry = stroke.working;
  return stroke.changed;
}

export function commitSculptStroke(stroke: SculptStroke) {
  if (!stroke.changed) { cancelSculptStroke(stroke); return null; }
  let installedRevision: number | null = null;
  let command: MeshOperationCommand | null = null;
  try {
    const position = stroke.working.getAttribute("position");
    const index = stroke.working.index;
    const sourceIndex = stroke.source.index;
    if (!position || position.count < 3 || !position.array.every(Number.isFinite) || Boolean(index) !== Boolean(sourceIndex) || (index && sourceIndex && (index.count !== sourceIndex.count || !index.array.every((value, offset) => value === sourceIndex.array[offset])))) throw new Error("Sculpt operation could not be applied to this mesh.");
    stroke.working.computeBoundingBox(); stroke.working.computeBoundingSphere();
    if (!stroke.working.boundingBox || !stroke.working.boundingSphere || !Number.isFinite(stroke.working.boundingSphere.radius)) throw new Error("Sculpt operation could not be applied to this mesh.");
    if (stroke.working.getAttribute("normal")?.array.some((value) => !Number.isFinite(value))) throw new Error("Sculpt operation could not be applied to this mesh.");
    installedRevision = geometryRegistry.installRevision(stroke.objectId, stroke.meshKey, stroke.working);
    const refreshStats = (id: CadObjectId) => useWorkspaceStore.getState().setGeometryStats(id, geometryRegistry.stats(id));
    refreshStats(stroke.objectId);
    command = new MeshOperationCommand(stroke.objectId, stroke.beforeRevision, installedRevision, `Sculpt ${stroke.tool[0].toUpperCase()}${stroke.tool.slice(1)}`, refreshStats);
    useHistoryStore.getState().recordApplied(command);
    return installedRevision;
  } catch (error) {
    if (installedRevision !== null && geometryRegistry.get(stroke.objectId)?.geometryRevision === installedRevision) {
      geometryRegistry.setRevision(stroke.objectId, stroke.beforeRevision);
      if (command) command.dispose(); else geometryRegistry.unpinRevision(stroke.objectId, installedRevision);
      useWorkspaceStore.getState().setGeometryStats(stroke.objectId, geometryRegistry.stats(stroke.objectId));
    }
    cancelSculptStroke(stroke);
    console.error("Sculpt stroke validation failed.", error);
    throw new Error("Sculpt operation could not be applied to this mesh.");
  }
}

export function cancelSculptStroke(stroke: SculptStroke) {
  if (geometryRegistry.get(stroke.objectId)?.geometryRevision === stroke.beforeRevision) stroke.mesh.geometry = stroke.source;
  stroke.working.dispose();
}
