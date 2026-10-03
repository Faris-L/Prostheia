import { create } from "zustand";
import { useSaveStore } from "../engine/save-store";

export type SplintObjectPart = "upper_arch" | "antagonist" | "splint" | "reference";
export type BiteSplintSnapshot = { upperArchId: string | null; antagonistId: string | null; splintId: string | null; boundaryCurveId: string | null; targetThicknessMm: number };
type State = BiteSplintSnapshot & { configure: (value: BiteSplintSnapshot, dirty?: boolean) => void; setThickness: (value: number) => void; reset: () => void };
const empty: BiteSplintSnapshot = { upperArchId: null, antagonistId: null, splintId: null, boundaryCurveId: null, targetThicknessMm: 2 };
export const useBiteSplintStore = create<State>((set) => ({ ...empty, configure: (value, dirty = false) => { set(value); if (dirty) useSaveStore.getState().markDirty(); }, setThickness: (value) => { set({ targetThicknessMm: Math.max(0.5, Math.min(8, value)) }); useSaveStore.getState().markDirty(); }, reset: () => set(empty) }));
export function restoreBiteSplintSetup(value: unknown) {
  if (!value || typeof value !== "object") { useBiteSplintStore.getState().reset(); return; }
  const raw = value as Partial<BiteSplintSnapshot>;
  useBiteSplintStore.getState().configure({ upperArchId: typeof raw.upperArchId === "string" ? raw.upperArchId : null, antagonistId: typeof raw.antagonistId === "string" ? raw.antagonistId : null, splintId: typeof raw.splintId === "string" ? raw.splintId : null, boundaryCurveId: typeof raw.boundaryCurveId === "string" ? raw.boundaryCurveId : null, targetThicknessMm: Number.isFinite(raw.targetThicknessMm) ? Math.max(0.5, Math.min(8, raw.targetThicknessMm!)) : 2 }, false);
}
