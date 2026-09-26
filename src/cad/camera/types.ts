import type { CadObjectId, ViewPreset } from "../types";

export type ViewportApi = {
  setView: (preset: ViewPreset) => void;
  frameSelected: (id: CadObjectId | null) => void;
};
