import { z } from "zod";

import { useAnalysisStore } from "@/cad/analysis/state";
import { curveSnapshot, useCurveStore } from "@/cad/curves/store";
import { KENNEDY_CLASSES, PARTIAL_COMPONENT_KINDS, usePartialDentureStore, type PartialDentureSetupSnapshot } from "@/cad/partial-denture/types";
import { RESTORATION_TYPES, useRestorativeSetupStore, type RestorativeSetupSnapshot } from "@/cad/restorative/types";
import { restoreBiteSplintSetup, useBiteSplintStore, type BiteSplintSnapshot } from "@/cad/splint/types";
import { restoreDigitalModelSetup, useDigitalModelStore, type DigitalModelSnapshot } from "@/cad/digital-model/types";
import { restoreArticulatorSetup, articulatorSnapshot } from "@/cad/articulator/persistence";
import { useArticulatorStore } from "@/cad/articulator/store";

type Adapter<T = unknown> = {
  schema: z.ZodType<T>;
  capture: () => unknown;
  apply: (value: T) => void;
  restore: (snapshot: unknown) => void;
};

const adapters = new Map<string, Adapter>();
const vector3 = z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]);
const restorativeSetupSchema = z.object({
  restorationType: z.enum(RESTORATION_TYPES).nullable(),
  connectorWidthMm: z.number().finite().min(1).max(8),
  insertionDirection: vector3,
  units: z.array(z.object({ id: z.string().min(1), kind: z.enum(["crown", "abutment", "pontic", "connector", "inlay", "onlay", "veneer"]), toothNumber: z.number().int().positive().optional() })),
});
const curveStateSchema = z.object({
  curves: z.array(z.object({
    id: z.string().min(1),
    kind: z.enum(["margin", "boundary", "splint_boundary", "model_trim_boundary", "denture_arch_guide", "denture_midline", "survey_line", "framework_path", "framework_boundary"]),
    coordinateSpace: z.enum(["object-local", "world"]).optional(),
    objectId: z.string().min(1),
    points: z.array(vector3).min(1),
    closed: z.boolean(),
  })),
  activeCurveId: z.string().nullable(),
});
const resetSchema = z.literal(true);
const biteSplintSetupSchema = z.object({ upperArchId: z.string().nullable(), antagonistId: z.string().nullable(), splintId: z.string().nullable(), boundaryCurveId: z.string().nullable(), targetThicknessMm: z.number().finite().min(0.5).max(8) });
const digitalModelSetupSchema = z.object({ rawScanId: z.string().nullable(), workingModelId: z.string().nullable(), baseId: z.string().nullable(), trimBoundaryCurveId: z.string().nullable(), baseHeightMm: z.number().finite().min(2).max(25), dieIds: z.array(z.string()), attachmentIds: z.array(z.string()), stage: z.enum(["raw_scan", "trim", "cleanup", "hole_fill", "orientation", "base", "final"]).default("raw_scan") });
const articulatorSetupSchema = z.object({ config: z.object({ hingeAxis: vector3, hingePivotMm: vector3, maxOpeningDeg: z.number().min(0).max(45), protrusiveTravelMm: z.number().min(0).max(20), lateralTravelMm: z.number().min(0).max(20), contactThresholdMm: z.number().positive().max(5), sampleCount: z.number().int().min(2).max(128) }), motion: z.enum(["open_close", "protrusive", "left_lateral", "right_lateral"]) });
const partialDentureSetupSchema = z.object({
  kennedyClass: z.enum(KENNEDY_CLASSES).nullable(),
  archObjectId: z.string().nullable(),
  packageId: z.string().nullable(),
  arch: z.enum(["upper", "lower"]).nullable(),
  missingToothNumbers: z.array(z.number().int().positive()),
  abutmentObjectIds: z.array(z.string()),
  components: z.array(z.object({
    id: z.string().min(1), kind: z.enum(PARTIAL_COMPONENT_KINDS), curveId: z.string().min(1),
    abutmentObjectId: z.string().optional(), toothNumber: z.number().int().positive().optional(),
    parentComponentId: z.string().optional(), restSurface: z.enum(["occlusal", "cingulum"]).optional(),
    connectorForm: z.enum(["lingual_bar", "palatal_strap", "horseshoe"]).optional(), arch: z.enum(["upper", "lower"]).optional(),
  })),
  surveyCompleted: z.boolean(), insertionPathSelected: z.boolean(), contoursReviewed: z.boolean(),
  undercutsReviewed: z.boolean(), blockoutApplied: z.boolean(),
});

registerCaseWorkflowStateAdapter("restorativeSetup", {
  schema: restorativeSetupSchema,
  capture: () => snapshotRestorativeSetup(),
  apply: (value) => useRestorativeSetupStore.getState().configure(value as RestorativeSetupSnapshot, false),
  restore: (value) => useRestorativeSetupStore.getState().configure(value as RestorativeSetupSnapshot, false),
});

registerCaseWorkflowStateAdapter("curveState", {
  schema: curveStateSchema,
  capture: () => curveSnapshot(),
  apply: (value) => useCurveStore.getState().replace(value as ReturnType<typeof curveSnapshot>),
  restore: (value) => useCurveStore.getState().replace(value as ReturnType<typeof curveSnapshot>),
});

registerCaseWorkflowStateAdapter("partialDentureSetup", {
  schema: partialDentureSetupSchema,
  capture: () => snapshotPartialSetup(),
  apply: (value) => usePartialDentureStore.getState().configure(value as PartialDentureSetupSnapshot, false),
  restore: (value) => usePartialDentureStore.getState().configure(value as PartialDentureSetupSnapshot, false),
});

registerCaseWorkflowStateAdapter("biteSplintSetup", {
  schema: biteSplintSetupSchema,
  capture: () => snapshotBiteSplintSetup(),
  apply: (value) => restoreBiteSplintSetup(value),
  restore: (value) => restoreBiteSplintSetup(value),
});

registerCaseWorkflowStateAdapter("digitalModelSetup", {
  schema: digitalModelSetupSchema,
  capture: () => snapshotDigitalModelSetup(),
  apply: (value) => restoreDigitalModelSetup(value),
  restore: (value) => restoreDigitalModelSetup(value),
});

registerCaseWorkflowStateAdapter("articulatorSetup", {
  schema: articulatorSetupSchema,
  capture: () => articulatorSnapshot(),
  apply: (value) => restoreArticulatorSetup(value),
  restore: (value) => restoreArticulatorSetup(value),
});

registerCaseWorkflowStateAdapter("resetTransientState", {
  schema: resetSchema,
  capture: () => ({ curves: curveSnapshot(), analysis: useAnalysisStore.getState().results, partialDenture: snapshotPartialSetup(), restorative: snapshotRestorativeSetup(), biteSplint: snapshotBiteSplintSetup(), digitalModel: snapshotDigitalModelSetup(), articulator: articulatorSnapshot() }),
  apply: () => {
    useCurveStore.getState().replace({ curves: [], activeCurveId: null });
    useAnalysisStore.getState().clear();
    usePartialDentureStore.getState().reset();
    useRestorativeSetupStore.getState().configure({ restorationType: null, connectorWidthMm: 3, insertionDirection: [0, 0, 1], units: [] }, false);
    useBiteSplintStore.getState().reset();
    useDigitalModelStore.getState().reset();
    useArticulatorStore.getState().reset();
  },
  restore: (value) => {
    const snapshot = value as { curves: ReturnType<typeof curveSnapshot>; analysis: ReturnType<typeof useAnalysisStore.getState>["results"]; partialDenture: PartialDentureSetupSnapshot; restorative: RestorativeSetupSnapshot; biteSplint: BiteSplintSnapshot; digitalModel: DigitalModelSnapshot; articulator: ReturnType<typeof articulatorSnapshot> };
    useCurveStore.getState().replace(snapshot.curves);
    useAnalysisStore.setState({ results: snapshot.analysis });
    usePartialDentureStore.getState().configure(snapshot.partialDenture, false);
    useRestorativeSetupStore.getState().configure(snapshot.restorative, false);
    restoreBiteSplintSetup(snapshot.biteSplint);
    restoreDigitalModelSetup(snapshot.digitalModel);
    restoreArticulatorSetup(snapshot.articulator);
  },
});

export function registerCaseWorkflowStateAdapter<T>(key: string, adapter: Adapter<T>) {
  if (!key || adapters.has(key)) throw new Error(`Case workflow state adapter "${key}" is already registered or invalid.`);
  adapters.set(key, adapter as Adapter);
  return () => { adapters.delete(key); };
}

export function prepareCaseWorkflowState(state: Record<string, unknown>) {
  const actions: { key: string; adapter: Adapter; value: unknown; snapshot: unknown }[] = [];
  const stateWithDefaults = state.resetTransientState === undefined ? { resetTransientState: true, ...state } : state;
  for (const [key, raw] of Object.entries(stateWithDefaults)) {
    const adapter = adapters.get(key);
    if (!adapter) throw new Error(`Case Package initialWorkflowState uses unregistered state adapter "${key}".`);
    const parsed = adapter.schema.safeParse(raw);
    if (!parsed.success) throw new Error(`Case Package initialWorkflowState.${key} is invalid: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`);
    actions.push({ key, adapter, value: parsed.data, snapshot: adapter.capture() });
  }
  let committed = false;
  return {
    commit() {
      committed = true;
      try {
        for (const action of actions) action.adapter.apply(action.value);
      } catch (error) {
        this.rollback();
        throw error;
      }
    },
    rollback() {
      if (!committed) return;
      for (const action of [...actions].reverse()) action.adapter.restore(action.snapshot);
      committed = false;
    },
  };
}

function snapshotRestorativeSetup(): RestorativeSetupSnapshot {
  const state = useRestorativeSetupStore.getState();
  return { restorationType: state.restorationType, connectorWidthMm: state.connectorWidthMm, insertionDirection: [...state.insertionDirection], units: state.units.map((unit) => ({ ...unit })) };
}

function snapshotPartialSetup(): PartialDentureSetupSnapshot {
  const state = usePartialDentureStore.getState();
  return {
    kennedyClass: state.kennedyClass, archObjectId: state.archObjectId, packageId: state.packageId, arch: state.arch,
    missingToothNumbers: [...state.missingToothNumbers], abutmentObjectIds: [...state.abutmentObjectIds],
    components: state.components.map((component) => ({ ...component })),
    surveyCompleted: state.surveyCompleted, insertionPathSelected: state.insertionPathSelected,
    contoursReviewed: state.contoursReviewed, undercutsReviewed: state.undercutsReviewed, blockoutApplied: state.blockoutApplied,
  };
}

function snapshotBiteSplintSetup(): BiteSplintSnapshot {
  const state = useBiteSplintStore.getState();
  return { upperArchId: state.upperArchId, antagonistId: state.antagonistId, splintId: state.splintId, boundaryCurveId: state.boundaryCurveId, targetThicknessMm: state.targetThicknessMm };
}

function snapshotDigitalModelSetup(): DigitalModelSnapshot {
  const state = useDigitalModelStore.getState();
  return { rawScanId: state.rawScanId, workingModelId: state.workingModelId, baseId: state.baseId, trimBoundaryCurveId: state.trimBoundaryCurveId, baseHeightMm: state.baseHeightMm, dieIds: [...state.dieIds], attachmentIds: [...state.attachmentIds], stage: state.stage };
}
