import type { Vector3Tuple } from "three";
import type { ViewPreset } from "../types";

export type ViewDirection = { position: Vector3Tuple; up: Vector3Tuple };

// Canonical Prostheia coordinates: X left/right, Y anterior/posterior, Z superior/inferior.
const directions: Record<Exclude<ViewPreset, "reset">, Vector3Tuple> = {
  front: [0, -1, 0],
  back: [0, 1, 0],
  left: [-1, 0, 0],
  right: [1, 0, 0],
  top: [0, 0, 1],
  bottom: [0, 0, -1],
};

export function getStandardView(preset: Exclude<ViewPreset, "reset">, distance: number): ViewDirection {
  const direction = directions[preset];
  const up: Vector3Tuple = preset === "top" ? [0, 1, 0] : preset === "bottom" ? [0, -1, 0] : [0, 0, 1];
  return { position: [direction[0] * distance, direction[1] * distance, direction[2] * distance], up };
}
