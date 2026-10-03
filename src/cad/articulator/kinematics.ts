import * as THREE from "three";
import type { ArticulatorConfig, ArticulatorMotion, JawPose, MotionSample } from "./types";

/** Canonical coordinates: X is left/right, Y is anterior/posterior, Z is superior/inferior (mm). */
export function evaluateJawPose(motion: ArticulatorMotion, t: number, config: ArticulatorConfig): JawPose {
  if (!Number.isFinite(t) || t < 0 || t > 1) throw new Error("Motion position must be between 0 and 1.");
  const axis = new THREE.Vector3(...config.hingeAxis);
  if (axis.lengthSq() < 1e-12) throw new Error("The hinge axis must be non-zero.");
  axis.normalize();
  const translation: [number, number, number] = [0, 0, 0];
  let rotationDeg = 0;
  if (motion === "open_close") rotationDeg = -config.maxOpeningDeg * Math.sin((Math.PI * t) / 2);
  if (motion === "protrusive") translation[1] = config.protrusiveTravelMm * t;
  // +X is left in the canonical Prostheia coordinate system.
  if (motion === "left_lateral") translation[0] = config.lateralTravelMm * t;
  if (motion === "right_lateral") translation[0] = -config.lateralTravelMm * t;
  return { fixedArch: "upper", movingArch: "lower", translationMm: translation, rotationAxis: axis.toArray() as [number, number, number], rotationPivotMm: [...config.hingePivotMm], rotationDeg };
}

export function poseMatrix(pose: JawPose) {
  const pivot = new THREE.Vector3(...pose.rotationPivotMm);
  const rotation = new THREE.Matrix4().makeRotationAxis(new THREE.Vector3(...pose.rotationAxis).normalize(), THREE.MathUtils.degToRad(pose.rotationDeg));
  return new THREE.Matrix4().makeTranslation(pose.translationMm[0], pose.translationMm[1], pose.translationMm[2])
    .multiply(new THREE.Matrix4().makeTranslation(pivot.x, pivot.y, pivot.z))
    .multiply(rotation)
    .multiply(new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z));
}

export function sampleMotion(motion: ArticulatorMotion, config: ArticulatorConfig): MotionSample[] {
  if (!Number.isInteger(config.sampleCount) || config.sampleCount < 2 || config.sampleCount > 128) throw new Error("Motion samples must be between 2 and 128.");
  return Array.from({ length: config.sampleCount }, (_, index) => {
    const t = index / (config.sampleCount - 1);
    return { index, t, motion, pose: evaluateJawPose(motion, t, config) };
  });
}

export function validateArticulatorConfig(config: ArticulatorConfig): ArticulatorConfig {
  const finite = [...config.hingeAxis, ...config.hingePivotMm, config.maxOpeningDeg, config.protrusiveTravelMm, config.lateralTravelMm, config.contactThresholdMm];
  if (!finite.every(Number.isFinite)) throw new Error("Articulator parameters must be finite numbers.");
  if (Math.hypot(...config.hingeAxis) < 1e-6) throw new Error("Hinge axis must be non-zero.");
  if (config.maxOpeningDeg < 0 || config.maxOpeningDeg > 45) throw new Error("Opening angle must be between 0 and 45 degrees for this exercise model.");
  if (config.protrusiveTravelMm < 0 || config.protrusiveTravelMm > 20 || config.lateralTravelMm < 0 || config.lateralTravelMm > 20) throw new Error("Exercise travel must be between 0 and 20 mm.");
  if (config.contactThresholdMm <= 0 || config.contactThresholdMm > 5) throw new Error("Contact threshold must be greater than 0 and no more than 5 mm.");
  if (!Number.isInteger(config.sampleCount) || config.sampleCount < 2 || config.sampleCount > 128) throw new Error("Motion samples must be between 2 and 128.");
  return { ...config, hingeAxis: new THREE.Vector3(...config.hingeAxis).normalize().toArray() as [number, number, number], hingePivotMm: [...config.hingePivotMm] };
}
