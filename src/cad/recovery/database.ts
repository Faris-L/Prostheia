import Dexie, { type Table } from "dexie";

export type RecoverySnapshot = {
  schemaVersion: number;
  workspaceKey: string;
  timestamp: number;
  lastCloudRevision: string | null;
  payload: {
    objects: unknown[];
    selectedObjectId: string | null;
    transformMode: string;
    cameraMode: string;
    translationStep: string | number;
    rotationStep: string | number;
    curves?: { curves: { id: string; kind: "margin" | "boundary" | "splint_boundary" | "model_trim_boundary" | "denture_arch_guide" | "denture_midline" | "survey_line" | "framework_path" | "framework_boundary"; coordinateSpace?: "object-local" | "world"; objectId: string; points: [number, number, number][]; closed: boolean }[]; activeCurveId: string | null };
    dentureSetup?: { mode: "arch" | "chain" | "individual"; arch: "upper" | "lower"; segment: "all" | "anterior" | "posterior"; toothSet: "balanced" | "broad" };
    restorativeSetup?: { restorationType: "crown" | "bridge" | "inlay" | "onlay" | "veneer" | null; connectorWidthMm: number; insertionDirection: [number, number, number]; units: { id: string; kind: "crown" | "abutment" | "pontic" | "connector" | "inlay" | "onlay" | "veneer"; toothNumber?: number }[] };
    partialDentureSetup?: {
      kennedyClass: "I" | "II" | "III" | "IV" | null; archObjectId: string | null; packageId?: string | null; arch?: "upper" | "lower" | null;
      missingToothNumbers: number[]; abutmentObjectIds: string[];
      components: { id: string; kind: "blockout" | "major_connector" | "lingual_bar" | "retention_mesh" | "saddle" | "clasp" | "minor_connector" | "rest" | "guide_plane" | "finish_line" | "relief"; curveId: string; abutmentObjectId?: string; toothNumber?: number; parentComponentId?: string; restSurface?: "occlusal" | "cingulum"; connectorForm?: "lingual_bar" | "palatal_strap" | "horseshoe"; arch?: "upper" | "lower" }[];
      surveyCompleted?: boolean; insertionPathSelected?: boolean; contoursReviewed?: boolean; undercutsReviewed?: boolean; blockoutApplied?: boolean;
    };
    biteSplintSetup?: { upperArchId: string | null; antagonistId: string | null; splintId: string | null; boundaryCurveId: string | null; targetThicknessMm: number };
    digitalModelSetup?: { rawScanId: string | null; workingModelId: string | null; baseId: string | null; trimBoundaryCurveId: string | null; baseHeightMm: number; dieIds: string[]; attachmentIds: string[]; stage?: "raw_scan" | "trim" | "cleanup" | "hole_fill" | "orientation" | "base" | "final" };
    articulatorSetup?: { config: { hingeAxis: [number, number, number]; hingePivotMm: [number, number, number]; maxOpeningDeg: number; protrusiveTravelMm: number; lateralTravelMm: number; contactThresholdMm: number; sampleCount: number }; motion: "open_close" | "protrusive" | "left_lateral" | "right_lateral" };
    implantSetup?: { selectedDefinitionId: string; fixtureIds: string[]; restorativeAxis: [number, number, number]; exerciseDepthTargetMm: number; exerciseAngleTargetDeg: number; exerciseDistanceTargetMm: number };
  };
};

class CadRecoveryDatabase extends Dexie {
  recoveries!: Table<RecoverySnapshot, string>;
  constructor() {
    super("prostheia-cad-recovery");
    this.version(1).stores({ recoveries: "&workspaceKey,timestamp" });
  }
}

export const recoveryDatabase = new CadRecoveryDatabase();
