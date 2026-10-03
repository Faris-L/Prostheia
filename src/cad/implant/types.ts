import { create } from "zustand";
import { useSaveStore } from "../engine/save-store";

export const IMPLANT_FIXTURES = [
  { id: "prostheia-synthetic-fixture-3_5x8", name: "Synthetic training fixture 3.5 × 8 mm", diameterMm: 3.5, lengthMm: 8 },
  { id: "prostheia-synthetic-fixture-4_0x10", name: "Synthetic training fixture 4.0 × 10 mm", diameterMm: 4, lengthMm: 10 },
  { id: "prostheia-synthetic-fixture-4_5x11", name: "Synthetic training fixture 4.5 × 11 mm", diameterMm: 4.5, lengthMm: 11 },
] as const;
export type ImplantFixtureDefinition = (typeof IMPLANT_FIXTURES)[number];
export type ImplantObjectPart = "site" | "fixture" | "reference_fixture" | "scan_body" | "abutment" | "restoration" | "emergence_reference" | "screw_channel" | "synthetic_risk";
export type ImplantSetupSnapshot = {
  selectedDefinitionId: string;
  fixtureIds: string[];
  restorativeAxis: [number, number, number];
  exerciseDepthTargetMm: number;
  exerciseAngleTargetDeg: number;
  exerciseDistanceTargetMm: number;
};
type ImplantState = ImplantSetupSnapshot & {
  configure: (value: ImplantSetupSnapshot, dirty?: boolean) => void;
  setDefinition: (id: string) => void;
  addFixture: (id: string) => void;
  removeFixture: (id: string) => void;
  setRestorativeAxis: (axis: [number, number, number], dirty?: boolean) => void;
  reset: () => void;
};
export const DEFAULT_IMPLANT_SETUP: ImplantSetupSnapshot = {
  selectedDefinitionId: IMPLANT_FIXTURES[0].id, fixtureIds: [], restorativeAxis: [0, 0, 1],
  exerciseDepthTargetMm: 8, exerciseAngleTargetDeg: 12, exerciseDistanceTargetMm: 2,
};
export const useImplantStore = create<ImplantState>((set, get) => ({
  ...DEFAULT_IMPLANT_SETUP,
  configure: (value, dirty = false) => { set({ ...value, fixtureIds: [...value.fixtureIds], restorativeAxis: [...value.restorativeAxis] }); if (dirty) useSaveStore.getState().markDirty(); },
  setDefinition: (id) => { if (!IMPLANT_FIXTURES.some((entry) => entry.id === id) || get().selectedDefinitionId === id) return; set({ selectedDefinitionId: id }); useSaveStore.getState().markDirty(); },
  addFixture: (id) => { if (get().fixtureIds.includes(id)) return; set((state) => ({ fixtureIds: [...state.fixtureIds, id] })); useSaveStore.getState().markDirty(); },
  removeFixture: (id) => { if (!get().fixtureIds.includes(id)) return; set((state) => ({ fixtureIds: state.fixtureIds.filter((entry) => entry !== id) })); useSaveStore.getState().markDirty(); },
  setRestorativeAxis: (axis, dirty = true) => { const magnitude = Math.hypot(...axis); if (!axis.every(Number.isFinite) || magnitude < 1e-8) return; const normalized = axis.map((value) => value / magnitude) as [number, number, number]; set({ restorativeAxis: normalized }); if (dirty) useSaveStore.getState().markDirty(); },
  reset: () => set({ ...DEFAULT_IMPLANT_SETUP, fixtureIds: [] }),
}));

export function implantSetupSnapshot(): ImplantSetupSnapshot {
  const { selectedDefinitionId, fixtureIds, restorativeAxis, exerciseDepthTargetMm, exerciseAngleTargetDeg, exerciseDistanceTargetMm } = useImplantStore.getState();
  return { selectedDefinitionId, fixtureIds: [...fixtureIds], restorativeAxis: [...restorativeAxis], exerciseDepthTargetMm, exerciseAngleTargetDeg, exerciseDistanceTargetMm };
}
export function restoreImplantSetup(value: unknown) {
  if (!value || typeof value !== "object") { useImplantStore.getState().reset(); return; }
  const raw = value as Partial<ImplantSetupSnapshot>;
  const definition = IMPLANT_FIXTURES.find((entry) => entry.id === raw.selectedDefinitionId)?.id ?? DEFAULT_IMPLANT_SETUP.selectedDefinitionId;
  const axis = Array.isArray(raw.restorativeAxis) && raw.restorativeAxis.length === 3 && raw.restorativeAxis.every(Number.isFinite) && Math.hypot(...raw.restorativeAxis) > 1e-8 ? raw.restorativeAxis as [number, number, number] : DEFAULT_IMPLANT_SETUP.restorativeAxis;
  useImplantStore.getState().configure({
    selectedDefinitionId: definition,
    fixtureIds: Array.isArray(raw.fixtureIds) ? raw.fixtureIds.filter((id): id is string => typeof id === "string") : [],
    restorativeAxis: axis,
    exerciseDepthTargetMm: finiteRange(raw.exerciseDepthTargetMm, 0, 30, DEFAULT_IMPLANT_SETUP.exerciseDepthTargetMm),
    exerciseAngleTargetDeg: finiteRange(raw.exerciseAngleTargetDeg, 0, 90, DEFAULT_IMPLANT_SETUP.exerciseAngleTargetDeg),
    exerciseDistanceTargetMm: finiteRange(raw.exerciseDistanceTargetMm, 0, 30, DEFAULT_IMPLANT_SETUP.exerciseDistanceTargetMm),
  }, false);
}
function finiteRange(value: unknown, min: number, max: number, fallback: number) { return typeof value === "number" && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback; }
