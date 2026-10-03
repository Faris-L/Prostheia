import * as THREE from "three";
import { cadObjectId, type CadObjectMetadata } from "../types";
import { useWorkspaceStore } from "../engine/workspace-store";
import { useHistoryStore } from "../engine/history-store";
import { DuplicateObjectCommand, MeshOperationCommand } from "../engine/commands";
import { geometryRegistry } from "../scene/geometry-registry";
import { useCurveStore, validateClosedCurve } from "../curves/store";
import { useBiteSplintStore } from "./types";
import { generateSplintGeometry } from "./geometry";

export function generateBiteSplint() {
  const setup = useBiteSplintStore.getState();
  if (!setup.upperArchId) throw new Error("Open a Bite Splint case first.");
  const curve = useCurveStore.getState().curves.find((entry) => entry.id === setup.boundaryCurveId);
  const closed = validateClosedCurve(curve, "Splint Boundary");
  if (!closed.valid || !curve) throw new Error(closed.reason);
  const geometry = generateSplintGeometry({ boundary: curve.points, thicknessMm: setup.targetThicknessMm, verticalOffsetMm: 0.25 });
  const id = cadObjectId(setup.splintId ?? "bite-splint-generated");
  const existing = geometryRegistry.get(id);
  if (existing) {
    const meshes = geometryRegistry.getMeshes(id);
    if (meshes.length !== 1) { geometry.dispose(); throw new Error("The editable splint must contain one shell mesh for thickness regeneration."); }
    const beforeRevision = existing.geometryRevision;
    const afterRevision = geometryRegistry.installRevision(id, meshes[0].key, geometry);
    const updateStats = (objectId: typeof id) => useWorkspaceStore.setState((state) => ({ objects: state.objects.map((object) => object.id === objectId ? { ...object, geometryStats: geometryRegistry.stats(objectId), exerciseThicknessTargetMm: setup.targetThicknessMm } : object) }));
    updateStats(id);
    useHistoryStore.getState().recordApplied(new MeshOperationCommand(id, beforeRevision, afterRevision, "Adjust educational splint thickness", updateStats));
    useWorkspaceStore.getState().applyVisibility([{ id, visible: true }]);
    useWorkspaceStore.getState().select(id);
    return id;
  }
  const object = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: "#87d8d1", roughness: 0.36, metalness: 0.04 }));
  object.name = "Generated educational bite splint";
  const metadata: CadObjectMetadata = { id, name: object.name, role: "splint", editable: true, syntheticMesh: true, transform: { position: [0, 0, 2.5], rotation: [0, 0, 0], scale: [1, 1, 1] }, visible: true, opacity: 1, biteSplintPart: "splint", articulatorArch: "upper", exerciseThicknessTargetMm: setup.targetThicknessMm };
  useHistoryStore.getState().execute(new DuplicateObjectCommand(metadata, object));
  useBiteSplintStore.getState().configure({ ...setup, splintId: id }, false);
  useWorkspaceStore.getState().select(id);
  return id;
}

export function validateSplintWorkflow() {
  const setup = useBiteSplintStore.getState();
  const boundary = validateClosedCurve(useCurveStore.getState().curves.find((curve) => curve.id === setup.boundaryCurveId), "Splint Boundary");
  const splint = setup.splintId ? geometryRegistry.get(cadObjectId(setup.splintId)) : undefined;
  return { boundary: boundary.valid, splint: Boolean(splint && useWorkspaceStore.getState().objects.some((item) => item.id === setup.splintId)), targetThicknessMm: setup.targetThicknessMm };
}
