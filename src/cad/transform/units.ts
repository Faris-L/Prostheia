import type { CadTransform } from "../types";

export const radiansToDegrees = (radians: number) => (radians * 180) / Math.PI;
export const degreesToRadians = (degrees: number) => (degrees * Math.PI) / 180;
export const translationSnapValue = (step: "free" | 0.1 | 0.5 | 1) => step === "free" ? null : step;
export const rotationSnapRadians = (step: "free" | 0.5 | 1 | 5) => step === "free" ? null : degreesToRadians(step);

export function toDisplayTransform(transform: CadTransform) {
  return {
    position: [...transform.position] as [number, number, number],
    rotation: transform.rotation.map(radiansToDegrees) as [number, number, number],
    scale: [...transform.scale] as [number, number, number],
  };
}

export function fromDisplayTransform(transform: CadTransform, field: keyof CadTransform, axis: number, value: number): CadTransform {
  const next = { ...transform, [field]: [...transform[field]] } as CadTransform;
  next[field][axis] = field === "rotation" ? degreesToRadians(value) : value;
  return next;
}
