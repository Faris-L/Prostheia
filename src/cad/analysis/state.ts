import { create } from "zustand";
import type { AnalysisResult } from "./types";
import { targetIsCurrent } from "./geometry";
import { useRestorativeSetupStore } from "../restorative/types";
import { useArticulatorStore } from "../articulator/store";

type AnalysisStore = { results: AnalysisResult[]; record: (result: AnalysisResult) => void; clear: (kind?: AnalysisResult["kind"]) => void; getCurrent: (kind: AnalysisResult["kind"], objectIds?: string[]) => AnalysisResult | undefined };
export function analysisResultIsCurrent(result: AnalysisResult) {
  if (result.kind === "dynamic_contact") {
    const config = useArticulatorStore.getState().config;
    return result.targets.every((target) => targetIsCurrent(target, true)) && result.configSignature === JSON.stringify({ config, motion: result.motion });
  }
  if (!result.targets.every((target) => targetIsCurrent(target))) return false;
  if (result.kind !== "undercut") return true;
  const direction = useRestorativeSetupStore.getState().insertionDirection;
  return result.insertionDirection.every((value, index) => Math.abs(value - direction[index]) < 0.0001);
}
export const useAnalysisStore = create<AnalysisStore>((set, get) => ({
  results: [],
  record: (result) => set((state) => ({ results: [...state.results.filter((item) => item.kind !== result.kind), result] })),
  clear: (kind) => set((state) => ({ results: kind ? state.results.filter((item) => item.kind !== kind) : [] })),
  getCurrent: (kind, objectIds) => get().results.find((result) => result.kind === kind && analysisResultIsCurrent(result) && (!objectIds || (objectIds.length === result.targets.length && objectIds.every((id, index) => result.targets[index]?.objectId === id)))),
}));
