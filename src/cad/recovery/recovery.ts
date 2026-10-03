import { z } from "zod";
import { useSaveStore } from "../engine/save-store";
import { useWorkspaceStore, type WorkspaceSnapshot } from "../engine/workspace-store";
import { recoveryDatabase, type RecoverySnapshot } from "./database";
import { cadObjectId, type CadObjectMetadata, type CadTransform } from "../types";
import { curveSnapshot, useCurveStore } from "../curves/store";
import type { CurveSnapshot } from "../curves/types";
import { restoreDentureSetup, useDentureSetupStore } from "../denture/setup-store";
import { restoreRestorativeSetup, useRestorativeSetupStore } from "../restorative/types";
import { restorePartialDentureSetup, usePartialDentureStore } from "../partial-denture/types";
import { restoreBiteSplintSetup, useBiteSplintStore } from "../splint/types";
import { restoreDigitalModelSetup, useDigitalModelStore } from "../digital-model/types";
import { articulatorSnapshot, restoreArticulatorSetup } from "../articulator/persistence";
import { implantSetupSnapshot, restoreImplantSetup } from "../implant/types";

export const RECOVERY_SCHEMA_VERSION = 1;
const triple = z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]);
const articulatorSetupSchema = z.object({ config: z.object({ hingeAxis: triple, hingePivotMm: triple, maxOpeningDeg: z.number().finite(), protrusiveTravelMm: z.number().finite(), lateralTravelMm: z.number().finite(), contactThresholdMm: z.number().finite(), sampleCount: z.number().int() }), motion: z.enum(["open_close", "protrusive", "left_lateral", "right_lateral"]) });
const implantSetupSchema = z.object({ selectedDefinitionId: z.string(), fixtureIds: z.array(z.string()), restorativeAxis: triple, exerciseDepthTargetMm: z.number().finite(), exerciseAngleTargetDeg: z.number().finite(), exerciseDistanceTargetMm: z.number().finite() });
const partialDentureSetupSchema = z.object({
  kennedyClass: z.enum(["I", "II", "III", "IV"]).nullable(), archObjectId: z.string().nullable(),
  packageId: z.string().nullable().optional(), arch: z.enum(["upper", "lower"]).nullable().optional(),
  missingToothNumbers: z.array(z.number().int()), abutmentObjectIds: z.array(z.string()),
  components: z.array(z.object({
    id: z.string().min(1), kind: z.enum(["blockout", "major_connector", "lingual_bar", "retention_mesh", "saddle", "clasp", "minor_connector", "rest", "guide_plane", "finish_line", "relief"]),
    curveId: z.string(), abutmentObjectId: z.string().optional(), toothNumber: z.number().int().optional(), parentComponentId: z.string().optional(),
    restSurface: z.enum(["occlusal", "cingulum"]).optional(), connectorForm: z.enum(["lingual_bar", "palatal_strap", "horseshoe"]).optional(), arch: z.enum(["upper", "lower"]).optional(),
  })),
  surveyCompleted: z.boolean().optional(), insertionPathSelected: z.boolean().optional(), contoursReviewed: z.boolean().optional(), undercutsReviewed: z.boolean().optional(), blockoutApplied: z.boolean().optional(),
});
const transformSchema = z.object({ position: triple, rotation: triple, scale: triple });
const roleSchema = z.enum(["maxilla", "mandible", "antagonist", "preop", "prepared_tooth", "tooth", "crown", "bridge", "pontic", "denture_tooth", "denture_base", "framework", "splint", "implant", "abutment", "model_base", "reference", "scan", "other"]);
const objectSchema = z.object({
  id: z.string().min(1), name: z.string(), role: roleSchema, editable: z.boolean(),
  transform: transformSchema, visible: z.boolean(), opacity: z.number().min(0.15).max(1),
}).passthrough();
const snapshotSchema = z.object({
  schemaVersion: z.number().int(), workspaceKey: z.string().min(1), timestamp: z.number().finite(), lastCloudRevision: z.string().nullable(),
  payload: z.object({ objects: z.array(objectSchema), selectedObjectId: z.string().nullable(), transformMode: z.enum(["select", "translate", "rotate", "scale"]), cameraMode: z.enum(["perspective", "orthographic"]), translationStep: z.union([z.literal("free"), z.literal(0.1), z.literal(0.5), z.literal(1)]), rotationStep: z.union([z.literal("free"), z.literal(0.5), z.literal(1), z.literal(5)]), articulatorSetup: articulatorSetupSchema.optional(), implantSetup: implantSetupSchema.optional(), curves: z.object({ curves: z.array(z.object({ id: z.string().min(1), kind: z.enum(["margin", "boundary", "splint_boundary", "model_trim_boundary", "denture_arch_guide", "denture_midline", "survey_line", "framework_path", "framework_boundary"]), coordinateSpace: z.enum(["object-local", "world"]).optional(), objectId: z.string().min(1), points: z.array(triple), closed: z.boolean() })), activeCurveId: z.string().nullable() }).optional(), dentureSetup: z.object({ mode: z.enum(["arch", "chain", "individual"]), arch: z.enum(["upper", "lower"]), segment: z.enum(["all", "anterior", "posterior"]), toothSet: z.enum(["balanced", "broad"]) }).optional(), restorativeSetup: z.object({ restorationType: z.enum(["crown", "bridge", "inlay", "onlay", "veneer"]).nullable(), connectorWidthMm: z.number().finite(), insertionDirection: triple, units: z.array(z.object({ id: z.string().min(1), kind: z.enum(["crown", "abutment", "pontic", "connector", "inlay", "onlay", "veneer"]), toothNumber: z.number().int().optional() })) }).optional(), partialDentureSetup: partialDentureSetupSchema.optional(), biteSplintSetup: z.object({ upperArchId: z.string().nullable(), antagonistId: z.string().nullable(), splintId: z.string().nullable(), boundaryCurveId: z.string().nullable(), targetThicknessMm: z.number().finite() }).optional(), digitalModelSetup: z.object({ rawScanId: z.string().nullable(), workingModelId: z.string().nullable(), baseId: z.string().nullable(), trimBoundaryCurveId: z.string().nullable(), baseHeightMm: z.number().finite(), dieIds: z.array(z.string()), attachmentIds: z.array(z.string()), stage: z.enum(["raw_scan", "trim", "cleanup", "hole_fill", "orientation", "base", "final"]).optional() }).optional() }),
});

export class RecoveryValidationError extends Error { constructor(message: string) { super(message); this.name = "RecoveryValidationError"; } }

export async function readRecovery(workspaceKey: string): Promise<RecoverySnapshot | null> {
  try {
    const raw: unknown = await recoveryDatabase.recoveries.get(workspaceKey);
    if (raw === undefined) return null;
    if (typeof raw === "object" && raw !== null && "schemaVersion" in raw && typeof raw.schemaVersion === "number" && raw.schemaVersion !== RECOVERY_SCHEMA_VERSION) {
      throw new RecoveryValidationError(`Unsupported recovery schema version ${raw.schemaVersion}`);
    }
    const parsed = snapshotSchema.safeParse(raw);
    if (!parsed.success) throw new RecoveryValidationError(`Recovery snapshot validation failed: ${parsed.error.message}`);
    if (parsed.data.schemaVersion !== RECOVERY_SCHEMA_VERSION) throw new RecoveryValidationError(`Unsupported recovery schema version ${parsed.data.schemaVersion}`);
    if (parsed.data.workspaceKey !== workspaceKey) throw new RecoveryValidationError("Recovery workspace key does not match the current workspace");
    return parsed.data as RecoverySnapshot;
  } catch (error) {
    console.error("Unable to read Prostheia CAD recovery.", error);
    if (error instanceof RecoveryValidationError) throw error;
    throw new Error("Local recovery could not be read from this browser.", { cause: error });
  }
}

export async function writeRecovery(workspaceKey: string): Promise<number> {
  const state = useWorkspaceStore.getState();
  const timestamp = Date.now();
  const snapshot: RecoverySnapshot = {
    schemaVersion: RECOVERY_SCHEMA_VERSION,
    workspaceKey,
    timestamp,
    lastCloudRevision: useSaveStore.getState().lastCloudRevision,
    payload: {
      objects: state.objects.map((object) => ({ ...object, transform: cloneTransform(object.transform) })),
      selectedObjectId: state.selectedObjectId,
      transformMode: state.transformMode,
      cameraMode: state.cameraMode,
      translationStep: state.translationStep,
      rotationStep: state.rotationStep,
      curves: curveSnapshot(),
      dentureSetup: (({ mode, arch, segment, toothSet }) => ({ mode, arch, segment, toothSet }))(useDentureSetupStore.getState()),
      restorativeSetup: (({ restorationType, connectorWidthMm, insertionDirection, units }) => ({ restorationType, connectorWidthMm, insertionDirection, units }))(useRestorativeSetupStore.getState()),
      partialDentureSetup: (({ kennedyClass, archObjectId, packageId, arch, missingToothNumbers, abutmentObjectIds, components, surveyCompleted, insertionPathSelected, contoursReviewed, undercutsReviewed, blockoutApplied }) => ({ kennedyClass, archObjectId, packageId, arch, missingToothNumbers, abutmentObjectIds, components, surveyCompleted, insertionPathSelected, contoursReviewed, undercutsReviewed, blockoutApplied }))(usePartialDentureStore.getState()),
      biteSplintSetup: (({ upperArchId, antagonistId, splintId, boundaryCurveId, targetThicknessMm }) => ({ upperArchId, antagonistId, splintId, boundaryCurveId, targetThicknessMm }))(useBiteSplintStore.getState()),
      digitalModelSetup: (({ rawScanId, workingModelId, baseId, trimBoundaryCurveId, baseHeightMm, dieIds, attachmentIds, stage }) => ({ rawScanId, workingModelId, baseId, trimBoundaryCurveId, baseHeightMm, dieIds, attachmentIds, stage }))(useDigitalModelStore.getState()),
      articulatorSetup: articulatorSnapshot(),
      implantSetup: implantSetupSnapshot(),
    },
  };
  await recoveryDatabase.recoveries.put(snapshot);
  return timestamp;
}

export async function discardRecovery(workspaceKey: string) { await recoveryDatabase.recoveries.delete(workspaceKey); }

export function restoreRecovery(snapshot: RecoverySnapshot, workspaceKey?: string) {
  const parsed = snapshotSchema.safeParse(snapshot);
  if (!parsed.success || parsed.data.schemaVersion !== RECOVERY_SCHEMA_VERSION) throw new RecoveryValidationError("Recovery snapshot is invalid or incompatible.");
  if (workspaceKey && parsed.data.workspaceKey !== workspaceKey) throw new RecoveryValidationError("Recovery belongs to a different workspace.");
  const currentIds = new Set<string>(useWorkspaceStore.getState().objects.map((object) => object.id));
  const recoveredObjects = parsed.data.payload.objects as CadObjectMetadata[];
  const recoveredIds = new Set<string>(recoveredObjects.map((object) => object.id));
  if ([...currentIds].some((id) => !recoveredIds.has(id)) || [...recoveredIds].some((id) => !currentIds.has(id))) throw new RecoveryValidationError("Recovery object list does not match the current demo workspace.");
  if (parsed.data.payload.selectedObjectId && !recoveredIds.has(parsed.data.payload.selectedObjectId)) throw new RecoveryValidationError("Recovery refers to a missing selected object.");
  const snapshotState: WorkspaceSnapshot = {
    objects: recoveredObjects,
    selectedObjectId: parsed.data.payload.selectedObjectId ? cadObjectId(parsed.data.payload.selectedObjectId) : null,
    transformMode: parsed.data.payload.transformMode,
    cameraMode: parsed.data.payload.cameraMode,
    translationStep: parsed.data.payload.translationStep,
    rotationStep: parsed.data.payload.rotationStep,
  } as WorkspaceSnapshot;
  useWorkspaceStore.getState().restoreSnapshot(snapshotState);
  useCurveStore.getState().replace(parsed.data.payload.curves as CurveSnapshot ?? { curves: [], activeCurveId: null });
  restoreDentureSetup(parsed.data.payload.dentureSetup);
  restoreRestorativeSetup(parsed.data.payload.restorativeSetup);
  restorePartialDentureSetup(parsed.data.payload.partialDentureSetup);
  restoreBiteSplintSetup(parsed.data.payload.biteSplintSetup);
  restoreDigitalModelSetup(parsed.data.payload.digitalModelSetup);
  restoreArticulatorSetup(parsed.data.payload.articulatorSetup);
  restoreImplantSetup(parsed.data.payload.implantSetup);
  useSaveStore.getState().markDirty();
}

export function restoreCloudRecovery(snapshot: RecoverySnapshot, workspaceKey: string) {
  const parsed = snapshotSchema.safeParse(snapshot);
  if (!parsed.success || parsed.data.schemaVersion !== RECOVERY_SCHEMA_VERSION || parsed.data.workspaceKey !== workspaceKey) throw new RecoveryValidationError("Recovery is invalid or belongs to another case.");
  const current = useWorkspaceStore.getState();
  const recoveredObjects = parsed.data.payload.objects as CadObjectMetadata[];
  const currentIds = new Set<string>(current.objects.map((object) => object.id));
  const recoveredIds = new Set<string>(recoveredObjects.map((object) => object.id));
  if (currentIds.size !== recoveredIds.size || [...currentIds].some((id) => !recoveredIds.has(id))) throw new RecoveryValidationError("Recovery object identities do not match this cloud revision.");
  if (parsed.data.payload.selectedObjectId && !currentIds.has(parsed.data.payload.selectedObjectId)) throw new RecoveryValidationError("Recovery refers to an object missing from this cloud revision.");
  current.restoreSnapshot({
    objects: recoveredObjects,
    selectedObjectId: parsed.data.payload.selectedObjectId ? cadObjectId(parsed.data.payload.selectedObjectId) : null,
    transformMode: parsed.data.payload.transformMode,
    cameraMode: parsed.data.payload.cameraMode,
    translationStep: parsed.data.payload.translationStep,
    rotationStep: parsed.data.payload.rotationStep,
  } as WorkspaceSnapshot);
  useCurveStore.getState().replace(parsed.data.payload.curves as CurveSnapshot ?? { curves: [], activeCurveId: null });
  restoreDentureSetup(parsed.data.payload.dentureSetup);
  restoreRestorativeSetup(parsed.data.payload.restorativeSetup);
  restorePartialDentureSetup(parsed.data.payload.partialDentureSetup);
  restoreBiteSplintSetup(parsed.data.payload.biteSplintSetup);
  restoreDigitalModelSetup(parsed.data.payload.digitalModelSetup);
  restoreArticulatorSetup(parsed.data.payload.articulatorSetup);
  restoreImplantSetup(parsed.data.payload.implantSetup);
  useSaveStore.getState().markDirty();
}

export async function persistRecovery(workspaceKey: string) {
  const save = useSaveStore.getState();
  save.markSaving();
  const revision = useSaveStore.getState().revision;
  try {
    const timestamp = await writeRecovery(workspaceKey);
    const current = useSaveStore.getState();
    if (current.revision === revision) current.markLocallySaved(timestamp);
    else current.markDirty();
    return timestamp;
  } catch (error) {
    console.error("Unable to write Prostheia CAD recovery.", error);
    useSaveStore.getState().markSaveFailed("Local recovery could not be saved in this browser.");
    throw error;
  }
}

function cloneTransform(transform: CadTransform): CadTransform { return { position: [...transform.position], rotation: [...transform.rotation], scale: [...transform.scale] }; }
