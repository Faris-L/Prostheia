import { create } from "zustand";
import { useSaveStore } from "../engine/save-store";
import { useWorkspaceStore } from "../engine/workspace-store";
export type DigitalModelObjectPart = "raw_scan" | "working_model" | "base" | "removable_die" | "attachment";
export type DigitalModelStage = "raw_scan" | "trim" | "cleanup" | "hole_fill" | "orientation" | "base" | "final";
export type DigitalModelSnapshot = { rawScanId: string | null; workingModelId: string | null; baseId: string | null; trimBoundaryCurveId: string | null; baseHeightMm: number; dieIds: string[]; attachmentIds: string[]; stage: DigitalModelStage };
type State = DigitalModelSnapshot & { configure: (value: DigitalModelSnapshot) => void; setBaseHeight: (heightMm: number) => void; reset: () => void };
const initial: DigitalModelSnapshot = { rawScanId: null, workingModelId: null, baseId: null, trimBoundaryCurveId: null, baseHeightMm: 8, dieIds: [], attachmentIds: [], stage: "raw_scan" };
const copy = (v: DigitalModelSnapshot): DigitalModelSnapshot => ({ ...v, dieIds: [...v.dieIds], attachmentIds: [...v.attachmentIds] });
export const useDigitalModelStore = create<State>((set) => ({ ...initial, configure: (value) => { set(copy(value)); useSaveStore.getState().markDirty(); }, setBaseHeight: (heightMm) => { set({ baseHeightMm: Math.max(2, Math.min(25, heightMm)) }); useSaveStore.getState().markDirty(); }, reset: () => set(copy(initial)) }));
export function restoreDigitalModelSetup(value: unknown) {
  if (!value || typeof value !== "object") { useDigitalModelStore.getState().reset(); return; }
  const raw = value as Partial<DigitalModelSnapshot>;
  const objectIds = new Set<string>(useWorkspaceStore.getState().objects.map((object) => object.id));
  const stages: DigitalModelStage[] = ["raw_scan", "trim", "cleanup", "hole_fill", "orientation", "base", "final"];
  useDigitalModelStore.setState({ rawScanId: typeof raw.rawScanId === "string" && objectIds.has(raw.rawScanId) ? raw.rawScanId : null, workingModelId: typeof raw.workingModelId === "string" && objectIds.has(raw.workingModelId) ? raw.workingModelId : null, baseId: typeof raw.baseId === "string" && objectIds.has(raw.baseId) ? raw.baseId : null, trimBoundaryCurveId: typeof raw.trimBoundaryCurveId === "string" ? raw.trimBoundaryCurveId : null, baseHeightMm: Number.isFinite(raw.baseHeightMm) ? Math.max(2, Math.min(25, raw.baseHeightMm!)) : 8, dieIds: Array.isArray(raw.dieIds) ? raw.dieIds.filter((id): id is string => typeof id === "string" && objectIds.has(id)) : [], attachmentIds: Array.isArray(raw.attachmentIds) ? raw.attachmentIds.filter((id): id is string => typeof id === "string" && objectIds.has(id)) : [], stage: stages.includes(raw.stage as DigitalModelStage) ? raw.stage as DigitalModelStage : "raw_scan" });
}
