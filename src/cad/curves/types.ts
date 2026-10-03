import type { CadObjectId } from "../types";

export type CadCurve = {
  id: string;
  kind: "margin" | "boundary" | "splint_boundary" | "model_trim_boundary" | "denture_arch_guide" | "denture_midline" | "survey_line" | "framework_path" | "framework_boundary";
  coordinateSpace?: "object-local" | "world";
  objectId: CadObjectId;
  points: [number, number, number][];
  closed: boolean;
};

export type CurveSnapshot = { curves: CadCurve[]; activeCurveId: string | null };
