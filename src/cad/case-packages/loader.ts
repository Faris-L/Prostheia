import * as THREE from "three";

import { type CadObjectMetadata, type CadObjectRole, type WorkspaceMode } from "@/cad/types";
import { useWorkspaceStore, type WorkspaceSnapshot } from "@/cad/engine/workspace-store";
import { geometryRegistry } from "@/cad/scene/geometry-registry";
import { useHistoryStore } from "@/cad/engine/history-store";
import { casePackageManifestSchema, validateCasePackage, type CaseCheckpoint, type CaseObjectDescriptor, type CasePackageManifest } from "./contract";
import { caseObjectRuntimeId } from "./identity";
import { resolveRegisteredCaseAsset, type CaseAssetResolver, type ResolvedCaseAsset } from "./asset-registry";
import { getCasePackage, registerCasePackageManifest } from "./registry";
import { createProceduralCaseObject } from "./procedures";
import { prepareCaseWorkflowState } from "./workflow-state";
import { normalizeResolvedCaseAsset } from "./asset-normalization";

export type CaseCheckpointObjectOverride = {
  objectId: string;
  source?: CaseObjectDescriptor["source"];
  transform?: CaseObjectDescriptor["transform"];
  visible?: boolean;
  opacity?: number;
};

export type CasePackageCheckpointResolution = {
  objects?: CaseCheckpointObjectOverride[];
  workflowState?: Record<string, unknown>;
};

export type CasePackageLoadOptions = {
  mode: WorkspaceMode;
  locale?: "en" | "sr";
  checkpointId?: string;
  resolveAsset?: CaseAssetResolver;
  resolveCheckpoint?: (checkpoint: CaseCheckpoint, manifest: CasePackageManifest) => Promise<CasePackageCheckpointResolution>;
  registry?: typeof geometryRegistry;
  workspace?: typeof useWorkspaceStore;
};

export class CasePackageLoadError extends Error {
  constructor(message: string) { super(message); this.name = "CasePackageLoadError"; }
}

/** Validate, resolve, and stage a package before replacing any active workspace state. */
export async function loadCasePackage(input: unknown, options: CasePackageLoadOptions) {
  const manifest = registerCasePackageManifest(validateCasePackage(input));
  const registry = options.registry ?? geometryRegistry;
  const workspace = options.workspace ?? useWorkspaceStore;
  const locale = options.locale ?? "en";
  const checkpointId = options.checkpointId ?? manifest.startingCheckpointId;
  const checkpoint = manifest.checkpoints.find((item) => item.id === checkpointId);
  if (!checkpoint) throw new CasePackageLoadError(`Case Package "${manifest.slug}" has no checkpoint named "${checkpointId}".`);

  const checkpointResolution = await resolveCheckpoint(checkpoint, manifest, options.resolveCheckpoint);
  const overrides = new Map((checkpointResolution.objects ?? []).map((item) => [item.objectId, item]));
  for (const objectId of overrides.keys()) {
    if (!manifest.objects.some((object) => object.id === objectId)) throw new CasePackageLoadError(`Checkpoint "${checkpoint.id}" refers to missing object "${objectId}".`);
  }

  const initialWorkflowState = { ...manifest.initialWorkflowState, ...(checkpointResolution.workflowState ?? {}) };
  const workflowStatePlan = prepareCaseWorkflowState(initialWorkflowState);
  const assetRefs = new Map(manifest.assetRefs.map((reference) => [reference.id, reference]));
  const resolvedAssets = new Map<string, ResolvedCaseAsset>();
  const prepared: { descriptor: CaseObjectDescriptor; object: THREE.Object3D; asset?: ResolvedCaseAsset }[] = [];
  let registryCommitAttempted = false;
  const assetResolver = options.resolveAsset ?? resolveRegisteredCaseAsset;
  const selectedObjects = manifest.objects.map((descriptor) => {
    const override = overrides.get(descriptor.id);
    const merged = { ...descriptor, ...(override?.source ? { source: override.source } : {}), ...(override?.transform ? { transform: override.transform } : {}), ...(override?.visible !== undefined ? { visible: override.visible } : {}), ...(override?.opacity !== undefined ? { opacity: override.opacity } : {}) };
    const parsed = casePackageManifestSchema.shape.objects.element.safeParse(merged);
    if (!parsed.success) throw new CasePackageLoadError(`Checkpoint "${checkpoint.id}" contains invalid state for object "${descriptor.id}": ${parsed.error.issues.map((issue) => issue.message).join("; ")}`);
    return parsed.data;
  });

  try {
    for (const descriptor of selectedObjects) {
      try {
        if (descriptor.source.kind === "procedural") {
          prepared.push({ descriptor, object: createProceduralCaseObject(descriptor.source) });
          continue;
        }
        const reference = assetRefs.get(descriptor.source.assetRefId);
        if (!reference) throw new CasePackageLoadError(`Object "${descriptor.id}" points to missing asset reference "${descriptor.source.assetRefId}".`);
        let asset = resolvedAssets.get(reference.id);
        if (!asset) {
          asset = await assetResolver(reference, descriptor.cadRole);
          if (asset.normalizationState === "canonical" && registry.getAll().some((entry) => entry.object === asset?.object)) {
            asset.object = cloneOwnedObject(asset.object);
          }
          resolvedAssets.set(reference.id, asset);
          normalizeResolvedCaseAsset(asset);
        }
        const root = prepared.some((item) => item.asset === asset) ? cloneOwnedObject(asset.object) : asset.object;
        prepared.push({ descriptor, object: root, asset });
      } catch (error) {
        const reference = descriptor.source.kind === "asset" ? assetRefs.get(descriptor.source.assetRefId) : undefined;
        if (!descriptor.required || reference?.required === false) continue;
        throw new CasePackageLoadError(`Could not prepare Case Package object "${descriptor.id}": ${errorMessage(error)}`);
      }
    }

    const loadedObjectIds = new Set(prepared.map(({ descriptor }) => descriptor.id));
    for (const item of prepared) if (item.descriptor.parentId && !loadedObjectIds.has(item.descriptor.parentId)) throw new CasePackageLoadError(`Loaded object "${item.descriptor.id}" depends on unavailable parent "${item.descriptor.parentId}".`);
    for (const binding of manifest.validationBindings) for (const objectId of binding.objectIds) if (!loadedObjectIds.has(objectId)) throw new CasePackageLoadError(`Validation binding "${binding.id}" requires unavailable object "${objectId}".`);
    for (const objectId of manifest.expectedOutput.objectIds) if (!loadedObjectIds.has(objectId)) throw new CasePackageLoadError(`Expected output requires unavailable object "${objectId}".`);

    const metadata: CadObjectMetadata[] = prepared.map(({ descriptor, asset }) => {
      const id = caseObjectRuntimeId(manifest.caseId, descriptor.id);
      return {
        id,
        name: descriptor.name[locale],
        role: descriptor.cadRole,
        editable: descriptor.editable,
        transform: cloneTransform(descriptor.transform),
        visible: descriptor.visible,
        opacity: descriptor.opacity,
        caseRole: descriptor.caseRole,
        casePackageId: manifest.packageId,
        caseCheckpointId: checkpointId,
        caseObjectId: descriptor.id,
        caseParentObjectId: descriptor.parentId,
        caseWorkflowMetadata: descriptor.workflowMetadata,
        caseReferenceState: descriptor.referenceState?.visibility,
        caseAssetRefId: descriptor.source.kind === "asset" ? descriptor.source.assetRefId : undefined,
        caseMasterAssetId: asset?.masterAssetId ?? undefined,
        caseRuntimeAssetId: asset?.runtimeAssetId,
        caseAssetMetadata: asset?.metadata,
        importSource: asset?.importSource,
        syntheticMesh: descriptor.source.kind === "procedural",
        dentalPosition: descriptor.dental?.fdi,
        ...(isRestorationType(descriptor.workflowMetadata.restorationType) ? { restorationType: descriptor.workflowMetadata.restorationType } : {}),
        ...(stringArray(descriptor.workflowMetadata.restorationUnitIds) ? { restorationUnitIds: descriptor.workflowMetadata.restorationUnitIds as string[] } : {}),
        ...(isDenturePart(descriptor.workflowMetadata.denturePart) ? { denturePart: descriptor.workflowMetadata.denturePart } : {}),
        ...(isDentureArch(descriptor.workflowMetadata.dentureArch) ? { dentureArch: descriptor.workflowMetadata.dentureArch } : {}),
        ...(typeof descriptor.workflowMetadata.toothSetId === "string" ? { toothSetId: descriptor.workflowMetadata.toothSetId } : {}),
        ...(isPartialDenturePart(descriptor.workflowMetadata.partialDenturePart) ? { partialDenturePart: descriptor.workflowMetadata.partialDenturePart } : {}),
        ...(isKennedyClass(descriptor.workflowMetadata.partialDentureClass) ? { partialDentureClass: descriptor.workflowMetadata.partialDentureClass } : {}),
        ...(isPartialDentureArch(descriptor.workflowMetadata.partialDentureArch) ? { partialDentureArch: descriptor.workflowMetadata.partialDentureArch, articulatorArch: descriptor.workflowMetadata.partialDentureArch } : {}),
        ...(Number.isInteger(descriptor.workflowMetadata.partialDentureToothNumber) ? { partialDentureToothNumber: Number(descriptor.workflowMetadata.partialDentureToothNumber) } : {}),
        ...(typeof descriptor.workflowMetadata.partialDentureAbutmentObjectId === "string" ? { partialDentureAbutmentObjectId: descriptor.workflowMetadata.partialDentureAbutmentObjectId } : {}),
        ...(typeof descriptor.workflowMetadata.partialDentureParentComponentId === "string" ? { partialDentureParentComponentId: descriptor.workflowMetadata.partialDentureParentComponentId } : {}),
        ...(isPartialDentureRestSurface(descriptor.workflowMetadata.partialDentureRestSurface) ? { partialDentureRestSurface: descriptor.workflowMetadata.partialDentureRestSurface } : {}),
        ...(isPartialDentureConnectorForm(descriptor.workflowMetadata.partialDentureConnectorForm) ? { partialDentureConnectorForm: descriptor.workflowMetadata.partialDentureConnectorForm } : {}),
        ...(isArticulatorArch(descriptor.workflowMetadata.articulatorArch ?? descriptor.workflowMetadata.partialDentureArch ?? descriptor.workflowMetadata.dentureArch) ? { articulatorArch: (descriptor.workflowMetadata.articulatorArch ?? descriptor.workflowMetadata.partialDentureArch ?? descriptor.workflowMetadata.dentureArch) as "upper" | "lower" } : {}),
        ...(isBiteSplintPart(descriptor.workflowMetadata.biteSplintPart) ? { biteSplintPart: descriptor.workflowMetadata.biteSplintPart } : {}),
        ...(isDigitalModelPart(descriptor.workflowMetadata.digitalModelPart) ? { digitalModelPart: descriptor.workflowMetadata.digitalModelPart } : {}),
        ...(typeof descriptor.workflowMetadata.digitalModelParentId === "string" ? { digitalModelParentId: descriptor.workflowMetadata.digitalModelParentId } : {}),
        ...(typeof descriptor.workflowMetadata.exerciseThicknessTargetMm === "number" && Number.isFinite(descriptor.workflowMetadata.exerciseThicknessTargetMm) ? { exerciseThicknessTargetMm: descriptor.workflowMetadata.exerciseThicknessTargetMm } : {}),
      };
    });
    const runtimeEntries: Parameters<typeof registry.replaceAllAtomically>[0] = prepared.map(({ descriptor, object }) => ({
      id: caseObjectRuntimeId(manifest.caseId, descriptor.id),
      role: descriptor.cadRole as CadObjectRole,
      name: descriptor.name[locale],
      object,
      ownsResources: true,
    }));
    const primaryOutputId = manifest.expectedOutput.objectIds.find((id) => prepared.some((item) => item.descriptor.id === id && item.descriptor.caseRole === "DESIGN"))
      ?? prepared.find((item) => item.descriptor.caseRole === "DESIGN" && item.descriptor.editable)?.descriptor.id
      ?? manifest.expectedOutput.objectIds[0];
    const primaryRuntimeId = caseObjectRuntimeId(manifest.caseId, primaryOutputId);
    const previousWorkspace = snapshotWorkspace(workspace.getState());

    registryCommitAttempted = true;
    registry.replaceAllAtomically(runtimeEntries, () => {
      try {
        workspace.getState().initializeWorkspace(options.mode, metadata);
        workspace.getState().select(primaryRuntimeId);
        workflowStatePlan.commit();
      } catch (error) {
        workspace.getState().initializeWorkspace(previousWorkspace.mode, previousWorkspace.snapshot.objects);
        workspace.getState().restoreSnapshot(previousWorkspace.snapshot);
        workflowStatePlan.rollback();
        throw error;
      }
    });
    useHistoryStore.getState().clear();
    return { ids: metadata.map((object) => object.id), manifest, checkpointId, objects: metadata };
  } catch (error) {
    workflowStatePlan.rollback();
    if (registryCommitAttempted) throw error;
    const committedRoots = new Set(registry.getAll().map((entry) => entry.object));
    const disposedRoots = new Set<THREE.Object3D>();
    const stagedRoots = [...prepared.map((item) => item.object), ...[...resolvedAssets.values()].map((asset) => asset.object)];
    for (const root of stagedRoots) {
      if (committedRoots.has(root) || disposedRoots.has(root)) continue;
      disposedRoots.add(root);
      registry.disposeObject(root);
    }
    throw error;
  }
}

export async function loadRegisteredCasePackage(packageId: string, options: CasePackageLoadOptions) {
  const manifest = getCasePackage(packageId);
  if (!manifest) throw new CasePackageLoadError(`Case Package "${packageId}" is not registered.`);
  return loadCasePackage(manifest, options);
}

async function resolveCheckpoint(
  checkpoint: CaseCheckpoint,
  manifest: CasePackageManifest,
  resolver?: CasePackageLoadOptions["resolveCheckpoint"],
): Promise<CasePackageCheckpointResolution> {
  if (checkpoint.source.kind === "package_baseline") return { workflowState: checkpoint.workflowState };
  if (checkpoint.source.kind === "asset_snapshot") return {
    objects: checkpoint.source.objects.map(({ objectId, assetRefId, source, ...state }) => ({
      objectId,
      ...(source ? { source } : {}),
      ...(assetRefId ? { source: { kind: "asset" as const, assetRefId } } : {}),
      ...state,
    })),
    workflowState: checkpoint.workflowState,
  };
  if (!resolver) throw new CasePackageLoadError(`Checkpoint "${checkpoint.id}" for "${manifest.slug}" needs a case-revision or deterministic-state resolver.`);
  const resolved = await resolver(checkpoint, manifest);
  return { ...resolved, workflowState: { ...checkpoint.workflowState, ...(resolved.workflowState ?? {}) } };
}

function snapshotWorkspace(state: ReturnType<typeof useWorkspaceStore.getState>): { mode: WorkspaceMode; snapshot: WorkspaceSnapshot } {
  return {
    mode: state.mode,
    snapshot: {
      objects: state.objects,
      selectedObjectId: state.selectedObjectId,
      transformMode: state.transformMode,
      cameraMode: state.cameraMode,
      translationStep: state.translationStep,
      rotationStep: state.rotationStep,
    },
  };
}

function cloneTransform(transform: CaseObjectDescriptor["transform"]): CaseObjectDescriptor["transform"] {
  return { position: [...transform.position], rotation: [...transform.rotation], scale: [...transform.scale] };
}

function cloneOwnedObject(source: THREE.Object3D) {
  const cloned = source.clone(true);
  const sourceMeshes: THREE.Mesh[] = [];
  const clonedMeshes: THREE.Mesh[] = [];
  source.traverse((child) => { if (child instanceof THREE.Mesh) sourceMeshes.push(child); });
  cloned.traverse((child) => { if (child instanceof THREE.Mesh) clonedMeshes.push(child); });
  sourceMeshes.forEach((mesh, index) => {
    const copy = clonedMeshes[index];
    if (!copy) return;
    copy.geometry = mesh.geometry.clone();
    copy.material = Array.isArray(mesh.material) ? mesh.material.map((material) => material.clone()) : mesh.material.clone();
  });
  return cloned;
}

function errorMessage(error: unknown) { return error instanceof Error ? error.message : "unknown error"; }
function isRestorationType(value: unknown): value is NonNullable<CadObjectMetadata["restorationType"]> { return ["crown", "bridge", "inlay", "onlay", "veneer"].includes(String(value)); }
function stringArray(value: unknown): value is string[] { return Array.isArray(value) && value.every((item) => typeof item === "string"); }
function isDenturePart(value: unknown): value is NonNullable<CadObjectMetadata["denturePart"]> { return ["arch", "tooth", "base", "plane", "midline", "border", "reference"].includes(String(value)); }
function isDentureArch(value: unknown): value is NonNullable<CadObjectMetadata["dentureArch"]> { return value === "upper" || value === "lower"; }
function isPartialDenturePart(value: unknown): value is NonNullable<CadObjectMetadata["partialDenturePart"]> { return ["blockout", "major_connector", "lingual_bar", "retention_mesh", "saddle", "clasp", "minor_connector", "rest", "guide_plane", "finish_line", "relief", "arch", "tooth", "missing_region", "reference", "survey_line", "insertion_axis"].includes(String(value)); }
function isKennedyClass(value: unknown): value is NonNullable<CadObjectMetadata["partialDentureClass"]> { return ["I", "II", "III", "IV"].includes(String(value)); }
function isPartialDentureArch(value: unknown): value is NonNullable<CadObjectMetadata["partialDentureArch"]> { return value === "upper" || value === "lower"; }
function isPartialDentureRestSurface(value: unknown): value is NonNullable<CadObjectMetadata["partialDentureRestSurface"]> { return value === "occlusal" || value === "cingulum"; }
function isPartialDentureConnectorForm(value: unknown): value is NonNullable<CadObjectMetadata["partialDentureConnectorForm"]> { return ["lingual_bar", "palatal_strap", "horseshoe"].includes(String(value)); }
function isArticulatorArch(value: unknown): value is "upper" | "lower" { return value === "upper" || value === "lower"; }
function isBiteSplintPart(value: unknown): value is NonNullable<CadObjectMetadata["biteSplintPart"]> { return ["upper_arch", "antagonist", "splint", "reference"].includes(String(value)); }
function isDigitalModelPart(value: unknown): value is NonNullable<CadObjectMetadata["digitalModelPart"]> { return ["raw_scan", "working_model", "base", "removable_die", "attachment"].includes(String(value)); }
