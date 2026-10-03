import type { Database } from "@/types/database.types";
import type { ImportSourceMetadata } from "./import/types";
import type { RestorationType } from "./restorative/types";
import type { PartialComponentKind, KennedyClass } from "./partial-denture/types";
import type { SplintObjectPart } from "./splint/types";
import type { DigitalModelObjectPart } from "./digital-model/types";
import type { JawArch } from "./articulator/types";
import type { ImplantObjectPart } from "./implant/types";
import type { CaseAssetMetadata, CaseSemanticRole } from "./case-packages/contract";

export type CadObjectId = string & { readonly __cadObjectId: unique symbol };
export type CadObjectRole = Database["public"]["Enums"]["cad_object_role"];
export type TransformMode = "select" | "translate" | "rotate" | "scale";
export type CameraMode = "perspective" | "orthographic";
export type WorkspaceMode = "practice" | "free-lab" | "developer";
export type CadTransform = {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
};
export type CadObjectMetadata = {
  id: CadObjectId;
  name: string;
  role: CadObjectRole;
  editable: boolean;
  transform: CadTransform;
  visible: boolean;
  opacity: number;
  importSource?: ImportSourceMetadata;
  geometryStats?: { vertexCount: number; triangleCount: number; boundsMm: [number, number, number]; revision: number; dirty: boolean };
  /** Internally generated, license-cleared teaching mesh; contains no patient data. */
  syntheticMesh?: boolean;
  /** Case-level meaning, independent from the existing CAD role enum. */
  caseRole?: CaseSemanticRole;
  casePackageId?: string;
  caseCheckpointId?: string;
  caseObjectId?: string;
  caseParentObjectId?: string;
  caseWorkflowMetadata?: Record<string, unknown>;
  caseAssetRefId?: string;
  caseMasterAssetId?: string;
  caseRuntimeAssetId?: string;
  caseAssetMetadata?: CaseAssetMetadata;
  caseReferenceState?: "hidden" | "visible" | "available_on_request";
  cloudCaseObjectId?: string;
  cloudGeometryVersionId?: string;
  /** Stable FDI identity for educational denture teeth. */
  dentalPosition?: number;
  /** Domain grouping for the shared CAD workspace. */
  articulatorArch?: JawArch;
  dentureArch?: "upper" | "lower";
  denturePart?: "arch" | "tooth" | "base" | "plane" | "midline" | "border" | "reference";
  toothSetId?: string;
  /** Stable domain identity shared by Crown, Bridge, Inlay, Onlay and Veneer workflows. */
  restorationType?: RestorationType;
  /** Stable member identifiers for a multi-unit restorative object. */
  restorationUnitIds?: string[];
  /** Connector diameter in millimeters; exercise design input, not a clinical rule. */
  connectorWidthMm?: number;
  /** Stable semantic role and relationship for a removable partial framework object. */
  partialDenturePart?: PartialComponentKind | "arch" | "tooth" | "missing_region" | "reference" | "survey_line" | "insertion_axis";
  partialDentureClass?: KennedyClass;
  partialDentureArch?: "upper" | "lower";
  partialDentureToothNumber?: number;
  partialDentureAbutmentObjectId?: string;
  partialDentureParentComponentId?: string;
  partialDentureRestSurface?: "occlusal" | "cingulum";
  partialDentureConnectorForm?: "lingual_bar" | "palatal_strap" | "horseshoe";
  biteSplintPart?: SplintObjectPart;
  digitalModelPart?: DigitalModelObjectPart;
  digitalModelParentId?: string;
  exerciseThicknessTargetMm?: number;
  /** Typed synthetic implant workflow identity and relationships; independent of display labels. */
  implantPart?: ImplantObjectPart;
  implantDefinitionId?: string;
  implantDiameterMm?: number;
  implantLengthMm?: number;
  implantDepthMm?: number;
  implantFixtureObjectId?: string;
  implantParentObjectId?: string;
  implantReference?: boolean;
};
export type ViewPreset = "front" | "back" | "left" | "right" | "top" | "bottom" | "reset";
export type TranslationStep = "free" | 0.1 | 0.5 | 1;
export type RotationStep = "free" | 0.5 | 1 | 5;

export const cadObjectId = (value: string) => value as CadObjectId;
