import * as THREE from "three";
import { cadObjectId, type CadObjectMetadata, type WorkspaceMode } from "../types";
import { createEdentulousArch, createSyntheticDentureTooth, positionForTooth } from "../denture/geometry";
import { geometryRegistry } from "../scene/geometry-registry";
import { useWorkspaceStore } from "../engine/workspace-store";
import { useHistoryStore } from "../engine/history-store";
import { useCurveStore } from "../curves/store";
import { useAnalysisStore } from "../analysis/state";
import { useRestorativeSetupStore } from "../restorative/types";
import { partialDentureAbutments, partialDentureMissingTeeth } from "./geometry";
import { usePartialDentureStore, type KennedyClass } from "./types";
import { addPartialDentureComponent } from "./operations";

export const PARTIAL_DENTURE_ARCH_ID = "partial-denture-synthetic-lower-arch";
export const partialToothId = (toothNumber: number) => `partial-denture-synthetic-tooth-${toothNumber}`;
export const partialMissingRegionId = (klass: KennedyClass, ordinal: number) => `partial-denture-${klass.toLowerCase()}-missing-region-${ordinal + 1}`;

const zeroTransform: CadObjectMetadata["transform"] = { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] };
function register(idValue: string, name: string, role: CadObjectMetadata["role"], editable: boolean, object: THREE.Object3D, extra: Partial<CadObjectMetadata> = {}) {
  const id = cadObjectId(idValue); object.name = name;
  geometryRegistry.register({ id, role, name, object, ownsResources: true });
  return { id, name, role, editable, syntheticMesh: true, transform: structuredClone(zeroTransform), visible: true, opacity: 1, geometryStats: geometryRegistry.stats(id), ...extra } satisfies CadObjectMetadata;
}

export function createPartialDentureCase(kennedyClass: KennedyClass, mode: WorkspaceMode = "free-lab") {
  geometryRegistry.clear(); useHistoryStore.getState().clear();
  useCurveStore.getState().replace({ curves: [], activeCurveId: null }); useAnalysisStore.getState().clear();
  usePartialDentureStore.getState().reset();
  const missing = partialDentureMissingTeeth(kennedyClass); const abutments = partialDentureAbutments(kennedyClass);
  const objects: CadObjectMetadata[] = [];
  objects.push(register(PARTIAL_DENTURE_ARCH_ID, `Synthetic mandibular arch · Kennedy ${kennedyClass}`, "mandible", false, createEdentulousArch("lower"), { articulatorArch: "lower", partialDenturePart: "arch", partialDentureClass: kennedyClass }));
  const allTeeth = Array.from({ length: 8 }, (_, i) => 31 + i).concat(Array.from({ length: 8 }, (_, i) => 41 + i));
  for (const toothNumber of allTeeth.filter((value) => !missing.includes(value))) {
    const position = positionForTooth(toothNumber, "lower");
    objects.push(register(partialToothId(toothNumber), `Synthetic tooth · FDI ${toothNumber}${abutments.includes(toothNumber) ? " · abutment" : ""}`, "tooth", false, createSyntheticDentureTooth(toothNumber), { transform: { ...zeroTransform, position: position.position, rotation: position.rotation }, articulatorArch: "lower", partialDenturePart: "tooth", partialDentureClass: kennedyClass, partialDentureToothNumber: toothNumber }));
  }
  const gapGroups = kennedyClass === "I" ? [[36, 37, 38], [46, 47, 48]] : kennedyClass === "II" ? [[46, 47, 48]] : kennedyClass === "III" ? [[36, 37]] : [[31, 32, 41, 42]];
  gapGroups.forEach((numbers, index) => {
    const midpoint = numbers.map((number) => positionForTooth(number, "lower").position).reduce((sum, point) => sum.map((value, axis) => value + point[axis] / numbers.length), [0, 0, 0] as number[]);
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), new THREE.MeshStandardMaterial({ color: "#d58680", transparent: true, opacity: 0.3, roughness: 0.72 }));
    mesh.scale.set(numbers.length * 1.9, 3.2, 1.1); mesh.position.set(midpoint[0], midpoint[1], 8); mesh.userData.prostheiaMeshId = `missing-support-region-${index + 1}`;
    objects.push(register(partialMissingRegionId(kennedyClass, index), `Synthetic edentulous space · ${numbers.join(", ")}`, "model_base", false, mesh, { articulatorArch: "lower", partialDenturePart: "missing_region", partialDentureClass: kennedyClass }));
  });
  useRestorativeSetupStore.getState().configure({ restorationType: null, connectorWidthMm: 3, insertionDirection: [0, 0, 1], units: [] }, false);
  useWorkspaceStore.getState().initializeWorkspace(mode, objects);
  usePartialDentureStore.getState().configure({ kennedyClass, archObjectId: PARTIAL_DENTURE_ARCH_ID, packageId: null, arch: "lower", missingToothNumbers: missing, abutmentObjectIds: abutments.map(partialToothId), components: [], surveyCompleted: false, insertionPathSelected: false, contoursReviewed: false, undercutsReviewed: false, blockoutApplied: false }, false);
  const defaults: { kind: import("./types").PartialComponentKind; toothNumber?: number }[] = [{ kind: "major_connector" }, { kind: "lingual_bar" }, { kind: "retention_mesh" }];
  defaults.forEach((component) => addPartialDentureComponent(component.kind, component.toothNumber, 0, false));
  useWorkspaceStore.getState().select(cadObjectId(PARTIAL_DENTURE_ARCH_ID));
  return useWorkspaceStore.getState().objects.map((object) => object.id);
}
