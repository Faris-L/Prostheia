import { create } from "zustand";
import { DEFAULT_ARTICULATOR_CONFIG, type ArticulatorConfig, type ArticulatorMotion, type DynamicContactResult } from "./types";
import { validateArticulatorConfig } from "./kinematics";

type ArticulatorState = {
  config: ArticulatorConfig;
  motion: ArticulatorMotion;
  t: number;
  playing: boolean;
  result: DynamicContactResult | null;
  configure: (config: ArticulatorConfig) => void;
  setMotion: (motion: ArticulatorMotion) => void;
  setPosition: (t: number) => void;
  setPlaying: (playing: boolean) => void;
  recordResult: (result: DynamicContactResult) => void;
  clearResult: () => void;
  restore: (config: ArticulatorConfig) => void;
  reset: () => void;
};

export const useArticulatorStore = create<ArticulatorState>((set) => ({
  config: { ...DEFAULT_ARTICULATOR_CONFIG, hingeAxis: [...DEFAULT_ARTICULATOR_CONFIG.hingeAxis], hingePivotMm: [...DEFAULT_ARTICULATOR_CONFIG.hingePivotMm] },
  motion: "open_close", t: 0, playing: false, result: null,
  configure: (config) => set({ config: validateArticulatorConfig(config), result: null }),
  setMotion: (motion) => set({ motion, t: 0, playing: false }),
  setPosition: (t) => set({ t: Math.max(0, Math.min(1, t)), playing: false }),
  setPlaying: (playing) => set({ playing }),
  recordResult: (result) => set({ result }),
  clearResult: () => set({ result: null }),
  restore: (config) => set({ config: validateArticulatorConfig(config), t: 0, playing: false, result: null }),
  reset: () => set({ config: { ...DEFAULT_ARTICULATOR_CONFIG, hingeAxis: [...DEFAULT_ARTICULATOR_CONFIG.hingeAxis], hingePivotMm: [...DEFAULT_ARTICULATOR_CONFIG.hingePivotMm] }, motion: "open_close", t: 0, playing: false, result: null }),
}));
