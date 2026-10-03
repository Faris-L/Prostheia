import { create } from "zustand";
import { useSaveStore } from "../engine/save-store";

export const KENNEDY_CLASSES = ["I", "II", "III", "IV"] as const;
export type KennedyClass = (typeof KENNEDY_CLASSES)[number];
export const PARTIAL_COMPONENT_KINDS = ["blockout", "major_connector", "lingual_bar", "retention_mesh", "saddle", "clasp", "minor_connector", "rest", "guide_plane", "finish_line", "relief"] as const;
export type PartialComponentKind = (typeof PARTIAL_COMPONENT_KINDS)[number];
export type PartialComponent = {
  id: string;
  kind: PartialComponentKind;
  curveId: string;
  abutmentObjectId?: string;
  toothNumber?: number;
  parentComponentId?: string;
  restSurface?: "occlusal" | "cingulum";
  connectorForm?: "lingual_bar" | "palatal_strap" | "horseshoe";
  arch?: "upper" | "lower";
};
export type PartialDentureSetupSnapshot = {
  kennedyClass: KennedyClass | null;
  archObjectId: string | null;
  packageId: string | null;
  arch: "upper" | "lower" | null;
  missingToothNumbers: number[];
  abutmentObjectIds: string[];
  components: PartialComponent[];
  surveyCompleted: boolean;
  insertionPathSelected: boolean;
  contoursReviewed: boolean;
  undercutsReviewed: boolean;
  blockoutApplied: boolean;
};
type State = PartialDentureSetupSnapshot & {
  configure: (value: PartialDentureSetupSnapshot, dirty?: boolean) => void;
  setStageFlag: (flag: "surveyCompleted" | "insertionPathSelected" | "contoursReviewed" | "undercutsReviewed" | "blockoutApplied", value: boolean, dirty?: boolean) => void;
  addComponent: (component: PartialComponent, dirty?: boolean) => void;
  removeComponent: (id: string, dirty?: boolean) => void;
  reset: () => void;
};
const defaults: PartialDentureSetupSnapshot = { kennedyClass: null, archObjectId: null, packageId: null, arch: null, missingToothNumbers: [], abutmentObjectIds: [], components: [], surveyCompleted: false, insertionPathSelected: false, contoursReviewed: false, undercutsReviewed: false, blockoutApplied: false };
const clone = (value: PartialDentureSetupSnapshot): PartialDentureSetupSnapshot => ({ ...value, missingToothNumbers: [...value.missingToothNumbers], abutmentObjectIds: [...value.abutmentObjectIds], components: value.components.map((component) => ({ ...component })) });

export const usePartialDentureStore = create<State>((set, get) => ({
  ...defaults,
  configure: (value, dirty = false) => { set(clone(value)); if (dirty) useSaveStore.getState().markDirty(); },
  setStageFlag: (flag, value, dirty = true) => { if (get()[flag] === value) return; set({ [flag]: value } as Pick<State, typeof flag>); if (dirty) useSaveStore.getState().markDirty(); },
  addComponent: (component, dirty = true) => {
    if (get().components.some((item) => item.id === component.id)) return;
    set((state) => ({ components: [...state.components, { ...component }] }));
    if (dirty) useSaveStore.getState().markDirty();
  },
  removeComponent: (id, dirty = true) => { set((state) => ({ components: state.components.filter((component) => component.id !== id && component.parentComponentId !== id) })); if (dirty) useSaveStore.getState().markDirty(); },
  reset: () => set(clone(defaults)),
}));

export function restorePartialDentureSetup(value: unknown) {
  if (!value || typeof value !== "object") { usePartialDentureStore.getState().reset(); return; }
  const raw = value as Partial<PartialDentureSetupSnapshot>;
  const kennedyClass = KENNEDY_CLASSES.includes(raw.kennedyClass as KennedyClass) ? raw.kennedyClass as KennedyClass : null;
  const components = Array.isArray(raw.components) ? raw.components.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const component = item as Partial<PartialComponent>;
    if (typeof component.id !== "string" || typeof component.curveId !== "string" || !PARTIAL_COMPONENT_KINDS.includes(component.kind as PartialComponentKind)) return [];
    return [{ id: component.id, curveId: component.curveId, kind: component.kind as PartialComponentKind, ...(typeof component.abutmentObjectId === "string" ? { abutmentObjectId: component.abutmentObjectId } : {}), ...(Number.isInteger(component.toothNumber) ? { toothNumber: component.toothNumber } : {}), ...(typeof component.parentComponentId === "string" ? { parentComponentId: component.parentComponentId } : {}), ...(component.restSurface === "occlusal" || component.restSurface === "cingulum" ? { restSurface: component.restSurface } : {}), ...(component.connectorForm === "lingual_bar" || component.connectorForm === "palatal_strap" || component.connectorForm === "horseshoe" ? { connectorForm: component.connectorForm } : {}), ...(component.arch === "upper" || component.arch === "lower" ? { arch: component.arch } : {}) }];
  }) : [];
  const missingToothNumbers = Array.isArray(raw.missingToothNumbers) ? raw.missingToothNumbers.filter((value): value is number => Number.isInteger(value) && value > 0) : [];
  const abutmentObjectIds = Array.isArray(raw.abutmentObjectIds) ? raw.abutmentObjectIds.filter((value): value is string => typeof value === "string") : [];
  usePartialDentureStore.getState().configure({
    ...defaults,
    kennedyClass,
    archObjectId: typeof raw.archObjectId === "string" ? raw.archObjectId : null,
    packageId: typeof raw.packageId === "string" ? raw.packageId : null,
    arch: raw.arch === "upper" || raw.arch === "lower" ? raw.arch : null,
    missingToothNumbers,
    abutmentObjectIds,
    components,
    surveyCompleted: raw.surveyCompleted === true,
    insertionPathSelected: raw.insertionPathSelected === true,
    contoursReviewed: raw.contoursReviewed === true,
    undercutsReviewed: raw.undercutsReviewed === true,
    blockoutApplied: raw.blockoutApplied === true,
  }, false);
}
