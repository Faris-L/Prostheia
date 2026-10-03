import { create } from "zustand";
import type { DentureArch } from "./geometry";
import { useSaveStore } from "../engine/save-store";

export type DentureSetupMode = "arch" | "chain" | "individual";
export type DentureSegment = "all" | "anterior" | "posterior";
type DentureSetupState = { mode: DentureSetupMode; arch: DentureArch; segment: DentureSegment; toothSet: "balanced" | "broad"; setMode: (mode: DentureSetupMode) => void; setArch: (arch: DentureArch) => void; setSegment: (segment: DentureSegment) => void; setToothSet: (toothSet: "balanced" | "broad") => void; reset: () => void };
export const useDentureSetupStore = create<DentureSetupState>((set) => ({
  mode: "individual", arch: "upper", segment: "all", toothSet: "balanced",
  setMode: (mode) => { if (useDentureSetupStore.getState().mode !== mode) useSaveStore.getState().markDirty(); set({ mode }); },
  setArch: (arch) => { if (useDentureSetupStore.getState().arch !== arch) useSaveStore.getState().markDirty(); set({ arch }); },
  setSegment: (segment) => { if (useDentureSetupStore.getState().segment !== segment) useSaveStore.getState().markDirty(); set({ segment }); },
  setToothSet: (toothSet) => { if (useDentureSetupStore.getState().toothSet !== toothSet) useSaveStore.getState().markDirty(); set({ toothSet }); },
  reset: () => set({ mode: "individual", arch: "upper", segment: "all", toothSet: "balanced" }),
}));

export function restoreDentureSetup(value: unknown) {
  if (!value || typeof value !== "object") return;
  const state = value as Record<string, unknown>;
  if (["arch", "chain", "individual"].includes(String(state.mode)) && ["upper", "lower"].includes(String(state.arch)) && ["all", "anterior", "posterior"].includes(String(state.segment)) && ["balanced", "broad"].includes(String(state.toothSet))) {
    useDentureSetupStore.setState({ mode: state.mode as DentureSetupMode, arch: state.arch as DentureArch, segment: state.segment as DentureSegment, toothSet: state.toothSet as "balanced" | "broad" });
  }
}

export function toothIdsForSetup(arch: DentureArch, segment: DentureSegment) {
  const quadrant = arch === "upper" ? [1, 2] : [3, 4];
  return quadrant.flatMap((q) => Array.from({ length: 8 }, (_, i) => q * 10 + i + 1)).filter((number) => segment === "all" || (segment === "anterior" ? number % 10 <= 3 : number % 10 >= 4));
}
