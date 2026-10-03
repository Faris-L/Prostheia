import { useArticulatorStore } from "./store";
import { ARTICULATOR_MOTIONS } from "./types";
import type { ArticulatorConfig, ArticulatorMotion } from "./types";

export function articulatorSnapshot() {
  const { config, motion } = useArticulatorStore.getState();
  return { config, motion };
}

export function restoreArticulatorSetup(value: unknown) {
  if (!value || typeof value !== "object") { useArticulatorStore.getState().reset(); return; }
  const state = value as { config?: unknown; motion?: unknown };
  if (!state.config || typeof state.config !== "object") { useArticulatorStore.getState().reset(); return; }
  try {
    useArticulatorStore.getState().restore(state.config as ArticulatorConfig);
    if (typeof state.motion === "string" && ARTICULATOR_MOTIONS.includes(state.motion as ArticulatorMotion)) useArticulatorStore.getState().setMotion(state.motion as ArticulatorMotion);
  } catch { useArticulatorStore.getState().reset(); }
}
