import type { CadObjectId } from "../types";
import type { MotionSample } from "../articulator/types";

export type AnalysisTarget = { objectId: CadObjectId; meshId: string; geometryRevision: number; transformSignature: string };
export type AnalysisState = "idle" | "preparing" | "processing" | "ready" | "stale" | "failed" | "cancelled";
export type AnalysisMeshSnapshot = AnalysisTarget & { positions: Float32Array; indices: Uint32Array };
export type ScalarAnalysisKind = "deviation" | "contact" | "thickness";
export type AnalysisRequest =
  | { type: "ANALYSIS_REQUEST"; requestId: string; kind: "intersection"; targets: [AnalysisMeshSnapshot, AnalysisMeshSnapshot] }
  | { type: "ANALYSIS_REQUEST"; requestId: string; kind: "contact" | "deviation"; targets: [AnalysisMeshSnapshot, AnalysisMeshSnapshot]; thresholdMm: number }
  | { type: "ANALYSIS_REQUEST"; requestId: string; kind: "thickness"; targets: [AnalysisMeshSnapshot]; thresholdMm: number }
  | { type: "ANALYSIS_REQUEST"; requestId: string; kind: "undercut"; targets: [AnalysisMeshSnapshot]; insertionDirection: [number, number, number] }
  | { type: "ANALYSIS_REQUEST"; requestId: string; kind: "dynamic_contact"; targets: [AnalysisMeshSnapshot, AnalysisMeshSnapshot]; samples: MotionSample[]; thresholdMm: number; configSignature: string }
  | { type: "ANALYSIS_CANCEL"; requestId: string };
export type AnalysisResponse =
  | { type: "ANALYSIS_PROGRESS"; requestId: string; progress: number }
  | { type: "ANALYSIS_SUCCESS"; requestId: string; result: AnalysisResult }
  | { type: "ANALYSIS_ERROR"; requestId: string; message: string };
export type IntersectionResult = { kind: "intersection"; intersects: boolean; targets: [AnalysisTarget, AnalysisTarget] };
export type ScalarAnalysisResult = { kind: ScalarAnalysisKind; targets: AnalysisTarget[]; values: Float32Array; valid: Uint8Array; minMm: number; maxMm: number; thresholdMm: number; sampleCount: number };
export type UndercutAnalysisResult = { kind: "undercut"; targets: [AnalysisTarget]; values: Float32Array; valid: Uint8Array; minMm: number; maxMm: number; thresholdMm: 1; sampleCount: number; insertionDirection: [number, number, number]; note: "directional-preview" };
export type DynamicContactAnalysisResult = { kind: "dynamic_contact"; targets: [AnalysisTarget, AnalysisTarget]; thresholdMm: number; samples: { sampleIndex: number; t: number; distanceMm: number; state: "intersection" | "contact" | "near" | "separated" }[]; firstContactSample: number | null; firstContactT: number | null; motion: MotionSample["motion"]; configSignature: string };
export type AnalysisResult = IntersectionResult | ScalarAnalysisResult | UndercutAnalysisResult | DynamicContactAnalysisResult;
export type AnalysisSnapshot = { first: AnalysisMeshSnapshot; second?: AnalysisMeshSnapshot };
