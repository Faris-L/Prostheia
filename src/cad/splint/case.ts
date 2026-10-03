import * as THREE from "three";
import { cadObjectId, type CadObjectMetadata, type WorkspaceMode } from "../types";
import { createEdentulousArch, createSyntheticDentureTooth, fdiPositions, positionForTooth } from "../denture/geometry";
import { geometryRegistry } from "../scene/geometry-registry";
import { useWorkspaceStore } from "../engine/workspace-store";
import { useHistoryStore } from "../engine/history-store";
import { useCurveStore } from "../curves/store";
import { useAnalysisStore } from "../analysis/state";
import { useRestorativeSetupStore } from "../restorative/types";
import { useBiteSplintStore } from "./types";
import { useDigitalModelStore } from "../digital-model/types";
import { useDentureSetupStore } from "../denture/setup-store";
import { usePartialDentureStore } from "../partial-denture/types";

export const BITE_SPLINT_IDS = { upper: "bite-splint-synthetic-upper", lower: "bite-splint-synthetic-antagonist", boundary: "bite-splint-boundary-upper", splint: "bite-splint-generated" } as const;
const transform: CadObjectMetadata["transform"] = { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] };
function arch(archName: "upper" | "lower") {
  const root = createEdentulousArch(archName);
  const numbers = fdiPositions(archName);
  for (const tooth of numbers) { const placement = positionForTooth(tooth, archName); const geometry = createSyntheticDentureTooth(tooth); geometry.position.set(...placement.position); geometry.rotation.set(...placement.rotation); root.add(geometry); }
  root.name = archName === "upper" ? "Synthetic upper dentition" : "Synthetic lower antagonist";
  return root;
}
function metadata(id: string, name: string, role: CadObjectMetadata["role"], part: NonNullable<CadObjectMetadata["biteSplintPart"]>, editable: boolean, object: THREE.Object3D): CadObjectMetadata {
  geometryRegistry.register({ id: cadObjectId(id), role, name, object, ownsResources: true });
  return { id: cadObjectId(id), name, role, editable, syntheticMesh: true, transform: structuredClone(transform), visible: true, opacity: 1, geometryStats: geometryRegistry.stats(cadObjectId(id)), biteSplintPart: part, articulatorArch: part === "antagonist" ? "lower" : "upper" };
}
export function createBiteSplintCase(mode: WorkspaceMode = "free-lab") {
  geometryRegistry.clear(); useHistoryStore.getState().clear(); useAnalysisStore.getState().clear();
  useDigitalModelStore.getState().reset();
  useDentureSetupStore.getState().reset(); usePartialDentureStore.getState().reset();
  const upper = metadata(BITE_SPLINT_IDS.upper, "Synthetic upper arch", "maxilla", "upper_arch", false, arch("upper"));
  const lower = metadata(BITE_SPLINT_IDS.lower, "Synthetic lower antagonist", "antagonist", "antagonist", false, arch("lower"));
  lower.transform.position = [0, 0, 12]; lower.transform.rotation = [Math.PI, 0, 0];
  const boundary: [number, number, number][] = [[-18, -1, 2.5], [-17, 7, 2.5], [-12, 14, 2.5], [-5, 18, 2.5], [5, 18, 2.5], [12, 14, 2.5], [17, 7, 2.5], [18, -1, 2.5], [12, 3, 2.5], [7, 9, 2.5], [0, 10, 2.5], [-7, 9, 2.5], [-12, 3, 2.5]];
  const curve = { id: BITE_SPLINT_IDS.boundary, kind: "splint_boundary" as const, coordinateSpace: "object-local" as const, objectId: cadObjectId(BITE_SPLINT_IDS.upper), points: boundary, closed: true };
  useCurveStore.getState().replace({ curves: [curve], activeCurveId: curve.id });
  useRestorativeSetupStore.getState().configure({ restorationType: null, connectorWidthMm: 3, insertionDirection: [0, 0, 1], units: [] }, false);
  useBiteSplintStore.getState().configure({ upperArchId: upper.id, antagonistId: lower.id, splintId: null, boundaryCurveId: curve.id, targetThicknessMm: 2 }, false);
  useWorkspaceStore.getState().initializeWorkspace(mode, [upper, lower]);
  useWorkspaceStore.getState().select(upper.id);
  return [upper.id, lower.id];
}
