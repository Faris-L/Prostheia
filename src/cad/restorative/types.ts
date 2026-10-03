import { create } from "zustand";
import { useSaveStore } from "../engine/save-store";

export const RESTORATION_TYPES = ["crown", "bridge", "inlay", "onlay", "veneer"] as const;
export type RestorationType = (typeof RESTORATION_TYPES)[number];
export type RestorativeUnitKind = "crown" | "abutment" | "pontic" | "connector" | "inlay" | "onlay" | "veneer";
export type RestorativeUnit = { id: string; kind: RestorativeUnitKind; toothNumber?: number };
export type RestorativeSetupSnapshot = {
  restorationType: RestorationType | null;
  connectorWidthMm: number;
  insertionDirection: [number, number, number];
  units: RestorativeUnit[];
};
type RestorativeSetupState = RestorativeSetupSnapshot & {
  configure: (snapshot: RestorativeSetupSnapshot, dirty?: boolean) => void;
  setConnectorWidth: (width: number, dirty?: boolean) => void;
  setInsertionDirection: (direction: [number, number, number], dirty?: boolean) => void;
};

const defaults: RestorativeSetupSnapshot = { restorationType: null, connectorWidthMm: 3, insertionDirection: [0, 0, 1], units: [] };
export const useRestorativeSetupStore = create<RestorativeSetupState>((set, get) => ({
  ...defaults,
  configure: (snapshot, dirty = false) => {
    set({ ...snapshot, insertionDirection: [...snapshot.insertionDirection], units: snapshot.units.map((unit) => ({ ...unit })) });
    if (dirty) useSaveStore.getState().markDirty();
  },
  setConnectorWidth: (width, dirty = true) => {
    if (!Number.isFinite(width) || width < 1 || width > 8 || width === get().connectorWidthMm) return;
    set({ connectorWidthMm: width }); if (dirty) useSaveStore.getState().markDirty();
  },
  setInsertionDirection: (direction, dirty = true) => {
    if (!direction.every(Number.isFinite) || Math.hypot(...direction) === 0) return;
    const normalized = direction.map((value) => value / Math.hypot(...direction)) as [number, number, number];
    if (normalized.every((value, index) => Math.abs(value - get().insertionDirection[index]) < 0.0001)) return;
    set({ insertionDirection: normalized }); if (dirty) useSaveStore.getState().markDirty();
  },
}));

export function restoreRestorativeSetup(value: unknown) {
  if (!value || typeof value !== "object") { useRestorativeSetupStore.getState().configure(defaults, false); return; }
  const raw = value as Partial<RestorativeSetupSnapshot>;
  const restorationType = RESTORATION_TYPES.includes(raw.restorationType as RestorationType) ? raw.restorationType as RestorationType : null;
  const connectorWidthMm = typeof raw.connectorWidthMm === "number" && Number.isFinite(raw.connectorWidthMm) ? Math.min(8, Math.max(1, raw.connectorWidthMm)) : defaults.connectorWidthMm;
  const insertionDirection = Array.isArray(raw.insertionDirection) && raw.insertionDirection.length === 3 && raw.insertionDirection.every(Number.isFinite) && Math.hypot(...raw.insertionDirection) > 0
    ? raw.insertionDirection as [number, number, number]
    : defaults.insertionDirection;
  const units = Array.isArray(raw.units) ? raw.units.flatMap((unit) => unit && typeof unit === "object" && typeof unit.id === "string" && ["crown", "abutment", "pontic", "connector", "inlay", "onlay", "veneer"].includes(String(unit.kind)) ? [{ id: unit.id, kind: unit.kind as RestorativeUnitKind, ...(Number.isInteger(unit.toothNumber) ? { toothNumber: unit.toothNumber } : {}) }] : []) : [];
  useRestorativeSetupStore.getState().configure({ restorationType, connectorWidthMm, insertionDirection, units }, false);
}
