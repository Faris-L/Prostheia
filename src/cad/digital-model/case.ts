import * as THREE from "three";
import { cadObjectId, type CadObjectMetadata, type WorkspaceMode } from "../types";
import { createEdentulousArch, createSyntheticDentureTooth, fdiPositions, positionForTooth } from "../denture/geometry";
import { geometryRegistry } from "../scene/geometry-registry";
import { useWorkspaceStore } from "../engine/workspace-store";
import { useHistoryStore } from "../engine/history-store";
import { useCurveStore } from "../curves/store";
import { useAnalysisStore } from "../analysis/state";
import { useDigitalModelStore } from "./types";
import { useBiteSplintStore } from "../splint/types";
import { useDentureSetupStore } from "../denture/setup-store";
import { usePartialDentureStore } from "../partial-denture/types";
import { useRestorativeSetupStore } from "../restorative/types";

export const DIGITAL_MODEL_IDS = { raw: "digital-model-synthetic-raw-scan", working: "digital-model-working-copy", base: "digital-model-base" } as const;
const zero = { position: [0, 0, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], scale: [1, 1, 1] as [number, number, number] };
function createSyntheticScan() {
  const root = createEdentulousArch("upper");
  for (const tooth of fdiPositions("upper")) { const place = positionForTooth(tooth, "upper"); const model = createSyntheticDentureTooth(tooth); model.position.set(...place.position); model.rotation.set(...place.rotation); root.add(model); }
  root.name = "Synthetic scan · upper arch";
  return root;
}
function cloneScan(source: THREE.Object3D) {
  const clone = source.clone(true);
  clone.traverse((node) => { if (node instanceof THREE.Mesh) { node.geometry = node.geometry.clone(); node.material = Array.isArray(node.material) ? node.material.map((material) => material.clone()) : node.material.clone(); } });
  return clone;
}
function register(id: string, name: string, role: CadObjectMetadata["role"], part: NonNullable<CadObjectMetadata["digitalModelPart"]>, editable: boolean, object: THREE.Object3D) {
  const cadId = cadObjectId(id); object.name = name;
  geometryRegistry.register({ id: cadId, role, name, object, ownsResources: true });
  return { id: cadId, name, role, editable, syntheticMesh: true, digitalModelPart: part, transform: structuredClone(zero), visible: true, opacity: 1, geometryStats: geometryRegistry.stats(cadId) } satisfies CadObjectMetadata;
}
export function createDigitalModelCase(mode: WorkspaceMode = "free-lab") {
  geometryRegistry.clear(); useHistoryStore.getState().clear(); useAnalysisStore.getState().clear();
  useBiteSplintStore.getState().reset();
  useDentureSetupStore.getState().reset(); usePartialDentureStore.getState().reset();
  useRestorativeSetupStore.getState().configure({ restorationType: null, connectorWidthMm: 3, insertionDirection: [0, 0, 1], units: [] }, false);
  const rawRuntime = createSyntheticScan();
  const raw = register(DIGITAL_MODEL_IDS.raw, "Synthetic raw scan · immutable source", "scan", "raw_scan", false, rawRuntime);
  const working = register(DIGITAL_MODEL_IDS.working, "Working digital model", "scan", "working_model", true, cloneScan(rawRuntime));
  const model = useDigitalModelStore.getState();
  useDigitalModelStore.setState({ ...model, rawScanId: raw.id, workingModelId: working.id, baseId: null, trimBoundaryCurveId: null, dieIds: [], attachmentIds: [] });
  useCurveStore.getState().replace({ curves: [], activeCurveId: null });
  useWorkspaceStore.getState().initializeWorkspace(mode, [raw, working]);
  useWorkspaceStore.getState().select(working.id);
  return [raw.id, working.id];
}
