import type { CadObjectId, ViewPreset } from "../types";

export type ViewportApi = {
  setView: (preset: ViewPreset) => void;
  frameSelected: (id: CadObjectId | null) => void;
  frameAll: () => void;
  capture: () => Promise<{ blob: Blob; width: number; height: number; camera: CameraSnapshot }>;
};

export type CameraSnapshot = {
  position: [number, number, number];
  target: [number, number, number];
  projection: "perspective" | "orthographic";
  fov?: number;
  zoom?: number;
  standardView: ViewPreset | null;
};
