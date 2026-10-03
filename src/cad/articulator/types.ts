export type JawArch = "upper" | "lower";
export type ArticulatorMotion = "open_close" | "protrusive" | "left_lateral" | "right_lateral";
export type Vec3 = [number, number, number];

/** Small, explicit exercise parameters. Values describe this simulation only. */
export type ArticulatorConfig = {
  hingeAxis: Vec3;
  hingePivotMm: Vec3;
  maxOpeningDeg: number;
  protrusiveTravelMm: number;
  lateralTravelMm: number;
  contactThresholdMm: number;
  sampleCount: number;
};

export type JawPose = {
  fixedArch: JawArch;
  movingArch: JawArch;
  translationMm: Vec3;
  rotationAxis: Vec3;
  rotationPivotMm: Vec3;
  rotationDeg: number;
};

export type MotionSample = { index: number; t: number; motion: ArticulatorMotion; pose: JawPose };
export type MotionContactEvent = { sampleIndex: number; t: number; distanceMm: number; state: "intersection" | "contact" | "near" | "separated" };
export type DynamicContactResult = {
  motion: ArticulatorMotion;
  thresholdMm: number;
  samples: MotionContactEvent[];
  firstContact: MotionContactEvent | null;
  geometrySignature: string;
  configSignature: string;
  stale: boolean;
};

export const DEFAULT_ARTICULATOR_CONFIG: ArticulatorConfig = {
  hingeAxis: [1, 0, 0],
  hingePivotMm: [0, -18, 2],
  maxOpeningDeg: 12,
  protrusiveTravelMm: 4,
  lateralTravelMm: 3,
  contactThresholdMm: 0.5,
  sampleCount: 16,
};

export const ARTICULATOR_MOTIONS: ArticulatorMotion[] = ["open_close", "protrusive", "left_lateral", "right_lateral"];
