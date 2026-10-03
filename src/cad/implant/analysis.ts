import * as THREE from "three";
import type { CadTransform } from "../types";

export function normalizedVector(value: readonly number[]): [number, number, number] {
  if (value.length !== 3 || !value.every(Number.isFinite)) throw new Error("An axis must contain three finite coordinates.");
  const length = Math.hypot(value[0], value[1], value[2]);
  if (length < 1e-10) throw new Error("An axis cannot be a zero vector.");
  return [value[0] / length, value[1] / length, value[2] / length];
}
export function implantAxisFromTransform(transform: CadTransform): [number, number, number] {
  const rotation = new THREE.Euler(...transform.rotation);
  return normalizedVector(new THREE.Vector3(0, 0, 1).applyEuler(rotation).toArray());
}
export function axisAngleDegrees(first: readonly number[], second: readonly number[]) {
  const a = normalizedVector(first), b = normalizedVector(second);
  const dot = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  return Math.acos(dot) * 180 / Math.PI;
}
