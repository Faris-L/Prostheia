import * as THREE from "three";
import { cadObjectId, type CadObjectMetadata, type WorkspaceMode } from "../types";
import { createSyntheticTooth } from "../scene/synthetic-dental-geometry";
import { geometryRegistry } from "../scene/geometry-registry";
import { useWorkspaceStore } from "../engine/workspace-store";
import { useHistoryStore } from "../engine/history-store";
import { useCurveStore } from "../curves/store";
import { useAnalysisStore } from "../analysis/state";
import { createSyntheticGingivaRegion, createSyntheticRestorationGeometry } from "./geometry";
import { RESTORATION_TYPES, useRestorativeSetupStore, type RestorationType, type RestorativeUnit } from "./types";
import { usePartialDentureStore } from "../partial-denture/types";

export type RestorativeCaseIds = {
  restoration: string;
  reference: string;
  preparations: string[];
  adjacent: string[];
  antagonist: string;
  gingiva?: string;
};

function antagonistTooth(tooth: number) {
  const quadrant = Math.floor(tooth / 10);
  return tooth + (quadrant === 1 ? 30 : quadrant === 2 ? 10 : quadrant === 3 ? -10 : -30);
}

export function restorativeCaseIds(type: RestorationType): RestorativeCaseIds {
  if (type === "crown") return { restoration: "crown26-restoration", reference: "crown26-reference", preparations: ["crown26-preparation"], adjacent: ["crown26-adjacent-25"], antagonist: "crown26-antagonist-36" };
  const prefix = `restorative-${type}`;
  if (type === "bridge") return { restoration: `${prefix}-bridge`, reference: `${prefix}-reference`, preparations: [`${prefix}-preparation-14`, `${prefix}-preparation-16`], adjacent: [`${prefix}-adjacent-13`, `${prefix}-adjacent-17`], antagonist: `${prefix}-antagonist-44`, gingiva: `${prefix}-gingiva` };
  const tooth = type === "veneer" ? 11 : type === "inlay" ? 36 : type === "onlay" ? 46 : 26;
  return { restoration: `${prefix}-restoration-${tooth}`, reference: `${prefix}-reference-${tooth}`, preparations: [`${prefix}-preparation-${tooth}`], adjacent: [`${prefix}-adjacent-${type === "veneer" ? 12 : tooth - 1}`, `${prefix}-adjacent-${type === "veneer" ? 21 : tooth + 1}`], antagonist: `${prefix}-antagonist-${antagonistTooth(tooth)}` };
}

function unitSetup(type: RestorationType): RestorativeUnit[] {
  if (type === "bridge") return [
    { id: "bridge-unit-abutment-14", kind: "abutment", toothNumber: 14 }, { id: "bridge-unit-pontic-15", kind: "pontic", toothNumber: 15 },
    { id: "bridge-unit-abutment-16", kind: "abutment", toothNumber: 16 }, { id: "bridge-connector-mesial", kind: "connector" }, { id: "bridge-connector-distal", kind: "connector" },
  ];
  const tooth = type === "veneer" ? 11 : type === "inlay" ? 36 : type === "onlay" ? 46 : 26;
  return [{ id: `${type}-unit-${tooth}`, kind: type, toothNumber: tooth }];
}

function cloneReference(source: THREE.Object3D) {
  const clone = source.clone(true);
  clone.traverse((child) => { if (child instanceof THREE.Mesh) { child.material = (Array.isArray(child.material) ? child.material : [child.material]).map((material) => { const copy = material.clone(); if (copy instanceof THREE.MeshStandardMaterial) { copy.color.set("#64c9bf"); copy.transparent = true; copy.opacity = 0.4; } return copy; }); } });
  return clone;
}

export function createRestorativeCase(type: RestorationType, mode: WorkspaceMode = "free-lab") {
  if (!RESTORATION_TYPES.includes(type)) throw new Error("Unsupported restorative workflow.");
  geometryRegistry.clear(); useHistoryStore.getState().clear();
  useCurveStore.getState().replace({ curves: [], activeCurveId: null }); useAnalysisStore.getState().clear();
  usePartialDentureStore.getState().reset();
  const ids = restorativeCaseIds(type);
  const centerTooth = type === "bridge" ? 15 : type === "veneer" ? 11 : type === "inlay" ? 36 : type === "onlay" ? 46 : 26;
  const restorationArch = centerTooth < 30 ? "upper" : "lower";
  const offset = type === "bridge" ? [-8, 8] : [0];
  const objects: { id: string; name: string; role: CadObjectMetadata["role"]; editable: boolean; visible: boolean; opacity: number; runtime: THREE.Object3D; transform: CadObjectMetadata["transform"] }[] = [];
  ids.preparations.forEach((id, index) => {
    const position = type === "bridge" ? [offset[index], 0, 0] as [number, number, number] : [0, 0, 0] as [number, number, number];
    objects.push({ id, name: `Preparation · ${type === "bridge" ? index === 0 ? 14 : 16 : centerTooth}`, role: "prepared_tooth", editable: false, visible: true, opacity: 1, runtime: createSyntheticTooth("preparation"), transform: { position, rotation: [0, 0, 0], scale: [0.86, 0.86, 0.82] } });
  });
  ids.adjacent.forEach((id, index) => {
    const tooth = createSyntheticTooth("restoration");
    const isBridge = type === "bridge";
    const position = isBridge ? [index === 0 ? -15 : 15, 0, 0] as [number, number, number] : [index === 0 ? -8 : 8, 0, 0] as [number, number, number];
    objects.push({ id, name: `Adjacent tooth · ${isBridge ? index === 0 ? 13 : 17 : centerTooth + (index === 0 ? -1 : 1)}`, role: "tooth", editable: false, visible: true, opacity: 1, runtime: tooth, transform: { position, rotation: [0, 0, 0], scale: [0.8, 0.8, 0.84] } });
  });
  const antagonist = createSyntheticTooth("restoration"); antagonist.rotation.x = Math.PI;
  objects.push({ id: ids.antagonist, name: `Antagonist · ${type === "bridge" ? 44 : antagonistTooth(centerTooth)}`, role: "antagonist", editable: false, visible: true, opacity: 1, runtime: antagonist, transform: { position: [0, 0, 11], rotation: [Math.PI, 0, 0], scale: [0.8, 0.8, 0.8] } });
  if (ids.gingiva) objects.push({ id: ids.gingiva, name: "Synthetic pontic support region", role: "model_base", editable: false, visible: true, opacity: 0.78, runtime: createSyntheticGingivaRegion(), transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] } });
  const restoration = createSyntheticRestorationGeometry(type);
  objects.push({ id: ids.restoration, name: type === "bridge" ? "Bridge · 14–16 · connected units" : `${type[0].toUpperCase()}${type.slice(1)} restoration · ${centerTooth}`, role: type === "bridge" ? "bridge" : "crown", editable: true, visible: true, opacity: 1, runtime: restoration, transform: { position: [0, 0, type === "veneer" ? 0 : 0.5], rotation: [0, 0, 0], scale: [1, 1, 1] } });
  const reference = cloneReference(restoration);
  objects.push({ id: ids.reference, name: `Synthetic ${type} reference · training only`, role: "reference", editable: false, visible: false, opacity: 0.4, runtime: reference, transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] } });

  const units = unitSetup(type);
  useRestorativeSetupStore.getState().configure({ restorationType: type, connectorWidthMm: 3, insertionDirection: [0, 0, 1], units }, false);
  const metadata: CadObjectMetadata[] = objects.map((entry) => {
    const id = cadObjectId(entry.id);
    geometryRegistry.register({ id, role: entry.role, name: entry.name, object: entry.runtime, ownsResources: true });
    return {
      id, name: entry.name, role: entry.role, editable: entry.editable, syntheticMesh: true, transform: entry.transform, visible: entry.visible, opacity: entry.opacity, geometryStats: geometryRegistry.stats(id),
      articulatorArch: entry.id === ids.antagonist ? (restorationArch === "upper" ? "lower" : "upper") : entry.id === ids.reference ? undefined : restorationArch,
      ...(entry.id === ids.restoration ? { restorationType: type, restorationUnitIds: units.map((unit) => unit.id), connectorWidthMm: 3 } : {}),
    };
  });
  useWorkspaceStore.getState().initializeWorkspace(mode, metadata);
  useWorkspaceStore.getState().select(cadObjectId(ids.restoration));
  return metadata.map((object) => object.id);
}
