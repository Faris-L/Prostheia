import type { ModelUnit } from "./types";

export type Point3 = [number, number, number];
export type Bounds3 = { min: Point3; max: Point3 };

export function resolveSourceUnit(unit: ModelUnit, format: "stl" | "obj" | "ply" | "glb" | "gltf"): ModelUnit {
  return unit === "unknown" && (format === "glb" || format === "gltf") ? "m" : unit;
}

/** Unit conversion only. Translation and source-axis orientation are deliberately preserved. */
export function createUnitNormalization(unitScale: number): number[] {
  if (!Number.isFinite(unitScale) || unitScale <= 0) throw new RangeError("Unit scale must be a positive finite number.");
  return [unitScale, 0, 0, 0, 0, unitScale, 0, 0, 0, 0, unitScale, 0, 0, 0, 0, 1];
}

export function convertPointToMillimeters(point: Point3, unitScale: number): Point3 {
  return [point[0] * unitScale, point[1] * unitScale, point[2] * unitScale];
}

export function boundsToMillimeters(bounds: Bounds3, unitScale: number): Bounds3 {
  return { min: convertPointToMillimeters(bounds.min, unitScale), max: convertPointToMillimeters(bounds.max, unitScale) };
}

export const SOURCE_ORIGIN: Point3 = [0, 0, 0];
