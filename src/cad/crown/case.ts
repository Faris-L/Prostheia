import * as THREE from "three";
import { cadObjectId, type CadObjectMetadata, type WorkspaceMode } from "../types";
import { geometryRegistry } from "../scene/geometry-registry";
import { createSyntheticTooth } from "../scene/synthetic-dental-geometry";
import { useWorkspaceStore } from "../engine/workspace-store";
import { createSyntheticCrownObject } from "./geometry";
import { useCurveStore } from "../curves/store";
import { useAnalysisStore } from "../analysis/state";
import { useRestorativeSetupStore } from "../restorative/types";
import { usePartialDentureStore } from "../partial-denture/types";

export const CROWN_CASE_OBJECTS = {
  preparation: "crown26-preparation",
  adjacent: "crown26-adjacent-25",
  antagonist: "crown26-antagonist-36",
  restoration: "crown26-restoration",
  reference: "crown26-reference",
} as const;

type CrownRole = keyof typeof CROWN_CASE_OBJECTS;
const transforms: Record<CrownRole, CadObjectMetadata["transform"]> = {
  preparation: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [0.86, 0.86, 0.82] },
  adjacent: { position: [-8, 0, 0], rotation: [0, 0, -0.08], scale: [0.82, 0.82, 0.86] },
  antagonist: { position: [0, 0, 11], rotation: [Math.PI, 0, 0], scale: [0.8, 0.8, 0.8] },
  restoration: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
  reference: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
};

function objectFor(role: CrownRole) {
  if (role === "preparation") return createSyntheticTooth("preparation");
  if (role === "adjacent") { const tooth = createSyntheticTooth("restoration"); tooth.scale.set(0.84, 0.84, 0.9); return tooth; }
  if (role === "antagonist") return createSyntheticTooth("restoration");
  return createSyntheticCrownObject(role === "reference" ? "reference" : "restoration");
}

export function createCrownCase(mode: WorkspaceMode = "free-lab") {
  geometryRegistry.clear();
  useCurveStore.getState().replace({ curves: [], activeCurveId: null });
  usePartialDentureStore.getState().reset();
  useAnalysisStore.getState().clear();
  useRestorativeSetupStore.getState().configure({ restorationType: "crown", connectorWidthMm: 3, insertionDirection: [0, 0, 1], units: [{ id: "crown-unit-26", kind: "crown", toothNumber: 26 }] }, false);
  const roles: { key: CrownRole; label: string; role: CadObjectMetadata["role"]; editable: boolean; visible: boolean; opacity: number; owns: boolean }[] = [
    { key: "preparation", label: "Preparation · 26", role: "prepared_tooth", editable: false, visible: true, opacity: 1, owns: true },
    { key: "adjacent", label: "Adjacent tooth · 25", role: "tooth", editable: false, visible: true, opacity: 1, owns: true },
    { key: "antagonist", label: "Antagonist · 36", role: "antagonist", editable: false, visible: true, opacity: 1, owns: true },
    { key: "restoration", label: "Crown restoration · 26", role: "crown", editable: true, visible: true, opacity: 1, owns: true },
    { key: "reference", label: "Crown example · synthetic", role: "reference", editable: false, visible: false, opacity: 0.4, owns: true },
  ];
  const objects = roles.map(({ key, label, role, editable, visible, opacity, owns }) => {
    const id = cadObjectId(CROWN_CASE_OBJECTS[key]);
    const runtime = key === "reference"
      ? geometryRegistry.get(cadObjectId(CROWN_CASE_OBJECTS.restoration))?.object.clone(true) ?? objectFor(key)
      : objectFor(key);
    runtime.name = label;
    if (key === "reference") runtime.traverse((child) => { if (child instanceof THREE.Mesh) { child.material = (Array.isArray(child.material) ? child.material : [child.material]).map((material) => { const copy = material.clone(); if (copy instanceof THREE.MeshStandardMaterial) copy.color.set("#64c9bf"); return copy; }); } });
    geometryRegistry.register({ id, role, name: label, object: runtime, ownsResources: owns });
    return { id, name: label, role, editable, syntheticMesh: true, transform: structuredClone(transforms[key]), visible, opacity, geometryStats: geometryRegistry.stats(id), ...(key === "restoration" ? { restorationType: "crown" as const, restorationUnitIds: ["crown-unit-26"] } : {}) } satisfies CadObjectMetadata;
  });
  useWorkspaceStore.getState().initializeWorkspace(mode, objects);
  useWorkspaceStore.getState().select(cadObjectId(CROWN_CASE_OBJECTS.restoration));
  return objects.map((object) => object.id);
}
