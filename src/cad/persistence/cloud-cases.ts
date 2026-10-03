import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import type { CadObjectMetadata } from "@/cad/types";
import { caseAssetMetadataSchema } from "@/cad/case-packages/contract";
import { geometryRegistry } from "@/cad/scene/geometry-registry";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { CloudObjectBinding } from "./store";
import { curveSnapshot } from "@/cad/curves/store";
import { useDentureSetupStore } from "@/cad/denture/setup-store";
import { useRestorativeSetupStore } from "@/cad/restorative/types";
import { usePartialDentureStore } from "@/cad/partial-denture/types";
import { useBiteSplintStore } from "@/cad/splint/types";
import { useDigitalModelStore } from "@/cad/digital-model/types";
import { useArticulatorStore } from "@/cad/articulator/store";
import { implantSetupSnapshot } from "@/cad/implant/types";

export type PersistenceStage = "Preparing geometry" | "Uploading geometry" | "Creating revision" | "Finalizing";
export type SavedCase = { id: string; title: string; source_type: "practice" | "scenario" | "import" | "blank"; updated_at: string; created_at: string; head: { revision_id: string; revision_number: number; created_at: string } | null };
export type RevisionInfo = { id: string; revision_number: number; created_at: string; change_summary: string | null; current: boolean; checkpointNames: string[] };

type SaveCloudInput = {
  caseId: string | null;
  expectedHeadId: string | null;
  title: string;
  sourceType: "scenario" | "import" | "blank";
  sourceSnapshot: Record<string, unknown>;
  sourceRevisionId: string | null;
  duplicatedFromCaseId?: string | null;
  bindings: Record<string, CloudObjectBinding>;
  onStage?: (stage: PersistenceStage) => void;
};

function uuid() { return crypto.randomUUID(); }
function quaternion(transform: CadObjectMetadata["transform"]) {
  const value = new THREE.Quaternion().setFromEuler(new THREE.Euler(...transform.rotation));
  return [value.x, value.y, value.z, value.w];
}

function validateRuntime(id: string) {
  const runtime = geometryRegistry.get(id as CadObjectMetadata["id"]);
  if (!runtime) throw new Error(`Geometry for “${id}” is not available. Reload the object before saving.`);
  const meshes = geometryRegistry.getMeshes(id as CadObjectMetadata["id"]);
  if (!meshes.length) throw new Error(`“${runtime.name}” has no mesh geometry to save.`);
  let vertexCount = 0;
  let triangleCount = 0;
  const box = new THREE.Box3().makeEmpty();
  runtime.object.updateWorldMatrix(true, true);
  const inverse = runtime.object.matrixWorld.clone().invert();
  for (const { geometry, mesh } of meshes) {
    const position = geometry.getAttribute("position");
    if (!position || position.count < 3) throw new Error(`“${runtime.name}” contains an empty mesh.`);
    for (let i = 0; i < position.count * position.itemSize; i++) if (!Number.isFinite(position.array[i])) throw new Error(`“${runtime.name}” contains invalid coordinates.`);
    const index = geometry.index;
    const indexCount = index?.count ?? position.count;
    if (indexCount < 3 || indexCount % 3 !== 0) throw new Error(`“${runtime.name}” contains invalid triangle indices.`);
    if (index) for (let i = 0; i < index.count; i++) if (!Number.isInteger(index.getX(i)) || index.getX(i) < 0 || index.getX(i) >= position.count) throw new Error(`“${runtime.name}” contains an out-of-range vertex index.`);
    triangleCount += indexCount / 3;
    vertexCount += position.count;
    geometry.computeBoundingBox();
    if (geometry.boundingBox) box.union(geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse, mesh.matrixWorld)));
  }
  if (!vertexCount || !triangleCount || box.isEmpty()) throw new Error(`“${runtime.name}” does not contain a valid surface.`);
  const min = box.min.toArray();
  const max = box.max.toArray();
  if (![...min, ...max].every(Number.isFinite)) throw new Error(`“${runtime.name}” has invalid bounds.`);
  return { runtime, vertexCount, triangleCount, min, max };
}

export async function serializeGeometry(id: string, name: string) {
  const info = validateRuntime(id);
  const clone = info.runtime.object.clone(true);
  clone.position.set(0, 0, 0); clone.rotation.set(0, 0, 0); clone.scale.set(1, 1, 1); clone.updateMatrixWorld(true);
  const overlays: THREE.Object3D[] = [];
  clone.traverse((child) => { if (child.userData.prostheiaSelectionOverlay) overlays.push(child); });
  for (const overlay of overlays) overlay.parent?.remove(overlay);
  const data = await new GLTFExporter().parseAsync(clone, { binary: true, onlyVisible: false, forceIndices: true });
  if (!(data instanceof ArrayBuffer) || !data.byteLength) throw new Error(`Could not serialize “${name}” as an internal GLB geometry snapshot.`);
  const bytes = new Uint8Array(data);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const sha256 = [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
  return { blob: new Blob([bytes], { type: "model/gltf-binary" }), sha256, vertexCount: info.vertexCount, triangleCount: info.triangleCount, boundsMin: info.min, boundsMax: info.max };
}

export async function saveCloudCase(input: SaveCloudInput) {
  const client = createBrowserSupabaseClient();
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) throw new Error("Sign in again before saving this case.");
  const caseId = input.caseId ?? uuid();
  const objects = useWorkspaceStore.getState().objects;
  const uploads: { path: string; id: string }[] = [];
  const bindingResult: Record<string, CloudObjectBinding> = {};
  const payload: Record<string, unknown>[] = [];
  const serializedMetadata = (object: CadObjectMetadata) => ({
    ...(object.importSource ?? {}), syntheticMesh: object.syntheticMesh === true, articulatorArch: object.articulatorArch,
    provenance: object.syntheticMesh ? "internal-training-geometry" : undefined,
    caseRole: object.caseRole, casePackageId: object.casePackageId, caseObjectId: object.caseObjectId, caseParentObjectId: object.caseParentObjectId,
    caseWorkflowMetadata: object.caseWorkflowMetadata, caseReferenceState: object.caseReferenceState,
    caseAssetRefId: object.caseAssetRefId, caseMasterAssetId: object.caseMasterAssetId, caseRuntimeAssetId: object.caseRuntimeAssetId, caseAssetMetadata: object.caseAssetMetadata,
    editable: object.editable, dentalPosition: object.dentalPosition, dentureArch: object.dentureArch, denturePart: object.denturePart, toothSetId: object.toothSetId,
    restorationType: object.restorationType, restorationUnitIds: object.restorationUnitIds, connectorWidthMm: object.connectorWidthMm,
    partialDenturePart: object.partialDenturePart, partialDentureClass: object.partialDentureClass, partialDentureToothNumber: object.partialDentureToothNumber,
    partialDentureAbutmentObjectId: object.partialDentureAbutmentObjectId, partialDentureParentComponentId: object.partialDentureParentComponentId,
    biteSplintPart: object.biteSplintPart, digitalModelPart: object.digitalModelPart, digitalModelParentId: object.digitalModelParentId, exerciseThicknessTargetMm: object.exerciseThicknessTargetMm,
    implantPart: object.implantPart, implantDefinitionId: object.implantDefinitionId, implantDiameterMm: object.implantDiameterMm, implantLengthMm: object.implantLengthMm, implantDepthMm: object.implantLengthMm !== undefined ? object.implantLengthMm - object.transform.position[2] : object.implantDepthMm, implantFixtureObjectId: object.implantFixtureObjectId, implantParentObjectId: object.implantParentObjectId, implantReference: object.implantReference,
  });

  input.onStage?.("Preparing geometry");
  for (const object of objects) {
    const binding = input.bindings[object.id];
    const caseObjectId = binding?.caseObjectId ?? uuid();
    const runtime = geometryRegistry.get(object.id);
    if (!runtime) throw new Error(`“${object.name}” is not registered in the CAD geometry registry.`);
    let objectVersionId = binding?.objectVersionId;
    const geometryRevision = runtime.geometryRevision;
    if (!binding || binding.geometryRevision !== runtime.geometryRevision) {
      const versionId = uuid();
      const assetId = uuid();
      const path = `${auth.user.id}/${caseId}/${caseObjectId}/${versionId}.glb`;
      const snapshot = await serializeGeometry(object.id, object.name);
      payload.push({
        case_object_id: caseObjectId, runtime_id: object.id, role: object.role, name: object.name,
        source_asset_id: object.caseRuntimeAssetId ?? object.caseMasterAssetId ?? object.importSource?.rawAsset?.assetId ?? null,
        position: object.transform.position,
        rotation_quaternion: quaternion(object.transform), scale: object.transform.scale, visible: object.visible,
        opacity: object.opacity, metadata: serializedMetadata(object),
        new_geometry: { asset_id: assetId, version_id: versionId, object_path: path, byte_size: snapshot.blob.size, sha256: snapshot.sha256, vertex_count: snapshot.vertexCount, triangle_count: snapshot.triangleCount, bounds_min: snapshot.boundsMin, bounds_max: snapshot.boundsMax },
      });
      objectVersionId = versionId;
      bindingResult[object.id] = { caseObjectId, objectVersionId, geometryRevision, versionNumber: (binding?.versionNumber ?? 0) + 1 };
      uploads.push({ path, id: object.id });
      Object.assign((payload.at(-1) as Record<string, unknown>), { _blob: snapshot.blob });
    } else {
      payload.push({ case_object_id: caseObjectId, runtime_id: object.id, role: object.role, name: object.name,
        source_asset_id: object.caseRuntimeAssetId ?? object.caseMasterAssetId ?? object.importSource?.rawAsset?.assetId ?? null,
        position: object.transform.position, rotation_quaternion: quaternion(object.transform), scale: object.transform.scale,
        visible: object.visible, opacity: object.opacity, metadata: serializedMetadata(object), object_version_id: objectVersionId });
      bindingResult[object.id] = { ...binding, geometryRevision };
    }
  }

  const toUpload = payload.filter((entry) => "_blob" in entry);
  input.onStage?.("Uploading geometry");
  const preparedPaths = toUpload.map((entry) => (entry.new_geometry as { object_path: string }).object_path);
  try {
    for (const entry of toUpload) {
      const blob = entry._blob as Blob;
      delete entry._blob;
      const newGeometry = entry.new_geometry as { object_path: string };
      const { error } = await client.storage.from("case-geometry").upload(newGeometry.object_path, blob, { contentType: "model/gltf-binary", upsert: false, cacheControl: "31536000" });
      if (error) throw new Error(`Geometry upload failed: ${error.message}`);
    }
  } catch (error) {
    if (preparedPaths.length) await client.storage.from("case-geometry").remove(preparedPaths).catch(() => undefined);
    throw error;
  }

  input.onStage?.("Creating revision");
  const { data, error } = await client.rpc("commit_case_revision", {
    p_case_id: input.caseId as unknown as string,
    p_expected_head_id: input.expectedHeadId as unknown as string,
    p_title: input.title,
    p_source_type: input.sourceType,
    p_source_snapshot: input.sourceSnapshot as never,
    p_workspace_state: { selectedObjectId: useWorkspaceStore.getState().selectedObjectId, transformMode: useWorkspaceStore.getState().transformMode, cameraMode: useWorkspaceStore.getState().cameraMode, curves: curveSnapshot(), dentureSetup: (({ mode, arch, segment, toothSet }) => ({ mode, arch, segment, toothSet }))(useDentureSetupStore.getState()), restorativeSetup: (({ restorationType, connectorWidthMm, insertionDirection, units }) => ({ restorationType, connectorWidthMm, insertionDirection, units }))(useRestorativeSetupStore.getState()), partialDentureSetup: (({ kennedyClass, archObjectId, packageId, arch, missingToothNumbers, abutmentObjectIds, components, surveyCompleted, insertionPathSelected, contoursReviewed, undercutsReviewed, blockoutApplied }) => ({ kennedyClass, archObjectId, packageId, arch, missingToothNumbers, abutmentObjectIds, components, surveyCompleted, insertionPathSelected, contoursReviewed, undercutsReviewed, blockoutApplied }))(usePartialDentureStore.getState()), biteSplintSetup: (({ upperArchId, antagonistId, splintId, boundaryCurveId, targetThicknessMm }) => ({ upperArchId, antagonistId, splintId, boundaryCurveId, targetThicknessMm }))(useBiteSplintStore.getState()), digitalModelSetup: (({ rawScanId, workingModelId, baseId, trimBoundaryCurveId, baseHeightMm, dieIds, attachmentIds, stage }) => ({ rawScanId, workingModelId, baseId, trimBoundaryCurveId, baseHeightMm, dieIds, attachmentIds, stage }))(useDigitalModelStore.getState()), articulatorSetup: { config: useArticulatorStore.getState().config, motion: useArticulatorStore.getState().motion }, implantSetup: implantSetupSnapshot() },
    p_objects: payload as never,
    p_source_revision_id: input.sourceRevisionId as unknown as string,
    p_duplicated_from_case_id: (input.duplicatedFromCaseId ?? null) as unknown as string,
    p_scenario_id: null as unknown as string,
    p_practice_lesson_id: null as unknown as string,
  });
  if (error) {
    if (error.code && uploads.length) await client.storage.from("case-geometry").remove(uploads.map((entry) => entry.path)).catch(() => undefined);
    if (error.code === "40001" || error.message.includes("case_head_conflict")) throw new Error("This case changed in another session. Reload the latest revision before saving your changes.");
    throw new Error(error.message || "The revision could not be committed. Your workspace is still dirty.");
  }
  const committed = data as { case_id: string; revision_id: string; revision_number: number };
  for (const object of objects) {
    const binding = bindingResult[object.id];
    geometryRegistry.markCloudSaved(object.id as CadObjectMetadata["id"]);
    useWorkspaceStore.setState((state) => ({ objects: state.objects.map((entry) => entry.id === object.id ? { ...entry, cloudCaseObjectId: binding.caseObjectId, cloudGeometryVersionId: binding.objectVersionId, geometryStats: entry.geometryStats ? { ...entry.geometryStats, dirty: false } : entry.geometryStats } : entry) }));
  }
  input.onStage?.("Finalizing");
  return { ...committed, bindings: bindingResult, title: input.title };
}

export async function listSavedCases() {
  const client = createBrowserSupabaseClient();
  const { data, error } = await client.from("user_cases").select("id,title,source_type,updated_at,created_at,case_heads(revision_id,case_revisions(revision_number,created_at))").order("updated_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) => {
    const head = Array.isArray(row.case_heads) ? row.case_heads[0] : row.case_heads;
    const revision = head && (Array.isArray(head.case_revisions) ? head.case_revisions[0] : head.case_revisions);
    return { id: row.id, title: row.title, source_type: row.source_type, updated_at: row.updated_at, created_at: row.created_at, head: head && revision ? { revision_id: head.revision_id, revision_number: revision.revision_number, created_at: revision.created_at } : null } as SavedCase;
  });
}

export async function loadCaseRevision(caseId: string, revisionId?: string) {
  const client = createBrowserSupabaseClient();
  const { data: caseRow, error: caseError } = await client.from("user_cases").select("id,title,source_type,source_snapshot,case_heads(revision_id)").eq("id", caseId).single();
  if (caseError || !caseRow) throw new Error("This case is unavailable or you do not have permission to open it.");
  const head = Array.isArray(caseRow.case_heads) ? caseRow.case_heads[0] : caseRow.case_heads;
  const targetRevision = revisionId ?? head?.revision_id;
  if (!targetRevision) throw new Error("This case does not have a saved revision yet.");
  const { data: revision, error: revisionError } = await client.from("case_revisions").select("id,revision_number,workspace_state,created_at").eq("case_id", caseId).eq("id", targetRevision).single();
  if (revisionError || !revision) throw new Error("The requested saved revision could not be found.");
  const { data: rows, error: objectError } = await client.from("case_revision_objects").select("position,rotation_quaternion,scale,visible,object_state,case_objects!inner(id,runtime_id,role,name,source_asset_id),case_object_versions!inner(id,version_number,vertex_count,triangle_count,geometry_asset_id,geometry_hash,assets!inner(bucket_id,object_path,byte_size))").eq("revision_id", targetRevision);
  if (objectError || !rows) throw new Error("The case revision manifest could not be read completely.");
  const loaded: { metadata: CadObjectMetadata; runtime: THREE.Object3D; binding: CloudObjectBinding }[] = [];
  for (const row of rows) {
    const object = Array.isArray(row.case_objects) ? row.case_objects[0] : row.case_objects;
    const version = Array.isArray(row.case_object_versions) ? row.case_object_versions[0] : row.case_object_versions;
    const asset = version && (Array.isArray(version.assets) ? version.assets[0] : version.assets);
    if (!object || !version || !asset || asset.bucket_id !== "case-geometry") throw new Error("This revision refers to an incomplete geometry record.");
    const { data: file, error: fileError } = await client.storage.from("case-geometry").download(asset.object_path);
    if (fileError || !file) throw new Error(`Geometry download failed for “${object.name}”: ${fileError?.message ?? "Storage file missing"}.`);
    const parsed = await new GLTFLoader().parseAsync(await file.arrayBuffer(), "");
    const runtime = parsed.scene;
    if (!runtime.children.length) throw new Error(`The saved geometry for “${object.name}” is empty.`);
    const position = row.position as number[];
    const rotation = row.rotation_quaternion as number[];
    const scale = row.scale as number[];
    if (position.length !== 3 || rotation.length !== 4 || scale.length !== 3 || ![...position,...rotation,...scale].every(Number.isFinite)) throw new Error(`The transform for “${object.name}” is invalid.`);
    const euler = new THREE.Euler().setFromQuaternion(new THREE.Quaternion(rotation[0],rotation[1],rotation[2],rotation[3]), "XYZ");
    const state = row.object_state as { opacity?: number; metadata?: Record<string, unknown> };
    const stats = geometryRegistryStats(runtime);
    const metadata: CadObjectMetadata = {
      id: object.runtime_id as CadObjectMetadata["id"], name: object.name, role: object.role, editable: typeof state.metadata?.editable === "boolean" ? state.metadata.editable : object.role !== "reference",
      transform: { position: [position[0],position[1],position[2]], rotation: [euler.x,euler.y,euler.z], scale: [scale[0],scale[1],scale[2]] },
      visible: row.visible, opacity: Math.min(1,Math.max(0.15,state.opacity ?? 1)), geometryStats: { ...stats, revision: version.version_number, dirty: false },
      cloudCaseObjectId: object.id, cloudGeometryVersionId: version.id,
      importSource: state.metadata && !("syntheticMesh" in state.metadata) && Object.keys(state.metadata).length ? state.metadata as unknown as CadObjectMetadata["importSource"] : undefined,
      syntheticMesh: state.metadata?.syntheticMesh === true,
      caseRole: ["SOURCE", "DESIGN", "GUIDE", "REFERENCE"].includes(String(state.metadata?.caseRole)) ? state.metadata?.caseRole as CadObjectMetadata["caseRole"] : undefined,
      casePackageId: typeof state.metadata?.casePackageId === "string" ? state.metadata.casePackageId : undefined,
      caseObjectId: typeof state.metadata?.caseObjectId === "string" ? state.metadata.caseObjectId : undefined,
      caseParentObjectId: typeof state.metadata?.caseParentObjectId === "string" ? state.metadata.caseParentObjectId : undefined,
      caseWorkflowMetadata: state.metadata?.caseWorkflowMetadata && typeof state.metadata.caseWorkflowMetadata === "object" && !Array.isArray(state.metadata.caseWorkflowMetadata) ? state.metadata.caseWorkflowMetadata as Record<string, unknown> : undefined,
      caseReferenceState: ["hidden", "visible", "available_on_request"].includes(String(state.metadata?.caseReferenceState)) ? state.metadata?.caseReferenceState as CadObjectMetadata["caseReferenceState"] : undefined,
      caseAssetRefId: typeof state.metadata?.caseAssetRefId === "string" ? state.metadata.caseAssetRefId : undefined,
      caseMasterAssetId: typeof state.metadata?.caseMasterAssetId === "string" ? state.metadata.caseMasterAssetId : undefined,
      caseRuntimeAssetId: typeof state.metadata?.caseRuntimeAssetId === "string" ? state.metadata.caseRuntimeAssetId : undefined,
      caseAssetMetadata: validCaseAssetMetadata(state.metadata?.caseAssetMetadata),
      articulatorArch: state.metadata?.articulatorArch === "upper" || state.metadata?.articulatorArch === "lower" ? state.metadata.articulatorArch : undefined,
      dentalPosition: typeof state.metadata?.dentalPosition === "number" ? state.metadata.dentalPosition : undefined,
      dentureArch: state.metadata?.dentureArch === "upper" || state.metadata?.dentureArch === "lower" ? state.metadata.dentureArch : undefined,
      denturePart: ["arch", "tooth", "base", "plane", "midline", "reference"].includes(String(state.metadata?.denturePart)) ? state.metadata?.denturePart as CadObjectMetadata["denturePart"] : undefined,
      toothSetId: state.metadata?.toothSetId === "balanced" || state.metadata?.toothSetId === "broad" ? state.metadata.toothSetId : undefined,
      restorationType: ["crown", "bridge", "inlay", "onlay", "veneer"].includes(String(state.metadata?.restorationType)) ? state.metadata?.restorationType as CadObjectMetadata["restorationType"] : undefined,
      restorationUnitIds: Array.isArray(state.metadata?.restorationUnitIds) ? state.metadata.restorationUnitIds.filter((item): item is string => typeof item === "string") : undefined,
      connectorWidthMm: typeof state.metadata?.connectorWidthMm === "number" && Number.isFinite(state.metadata.connectorWidthMm) ? state.metadata.connectorWidthMm : undefined,
      partialDenturePart: typeof state.metadata?.partialDenturePart === "string" ? state.metadata.partialDenturePart as CadObjectMetadata["partialDenturePart"] : undefined,
      partialDentureClass: ["I", "II", "III", "IV"].includes(String(state.metadata?.partialDentureClass)) ? state.metadata?.partialDentureClass as CadObjectMetadata["partialDentureClass"] : undefined,
      partialDentureToothNumber: Number.isInteger(state.metadata?.partialDentureToothNumber) ? state.metadata?.partialDentureToothNumber as number : undefined,
      partialDentureAbutmentObjectId: typeof state.metadata?.partialDentureAbutmentObjectId === "string" ? state.metadata.partialDentureAbutmentObjectId : undefined,
      partialDentureParentComponentId: typeof state.metadata?.partialDentureParentComponentId === "string" ? state.metadata.partialDentureParentComponentId : undefined,
      biteSplintPart: ["upper_arch", "antagonist", "splint", "reference"].includes(String(state.metadata?.biteSplintPart)) ? state.metadata?.biteSplintPart as CadObjectMetadata["biteSplintPart"] : undefined,
      digitalModelPart: ["raw_scan", "working_model", "base", "removable_die", "attachment"].includes(String(state.metadata?.digitalModelPart)) ? state.metadata?.digitalModelPart as CadObjectMetadata["digitalModelPart"] : undefined,
      digitalModelParentId: typeof state.metadata?.digitalModelParentId === "string" ? state.metadata.digitalModelParentId : undefined,
      exerciseThicknessTargetMm: typeof state.metadata?.exerciseThicknessTargetMm === "number" && Number.isFinite(state.metadata.exerciseThicknessTargetMm) ? state.metadata.exerciseThicknessTargetMm : undefined,
      implantPart: ["site", "fixture", "reference_fixture", "scan_body", "abutment", "restoration", "emergence_reference", "screw_channel", "synthetic_risk"].includes(String(state.metadata?.implantPart)) ? state.metadata?.implantPart as CadObjectMetadata["implantPart"] : undefined,
      implantDefinitionId: typeof state.metadata?.implantDefinitionId === "string" ? state.metadata.implantDefinitionId : undefined,
      implantDiameterMm: typeof state.metadata?.implantDiameterMm === "number" && Number.isFinite(state.metadata.implantDiameterMm) ? state.metadata.implantDiameterMm : undefined,
      implantLengthMm: typeof state.metadata?.implantLengthMm === "number" && Number.isFinite(state.metadata.implantLengthMm) ? state.metadata.implantLengthMm : undefined,
      implantDepthMm: typeof state.metadata?.implantDepthMm === "number" && Number.isFinite(state.metadata.implantDepthMm) ? state.metadata.implantDepthMm : undefined,
      implantFixtureObjectId: typeof state.metadata?.implantFixtureObjectId === "string" ? state.metadata.implantFixtureObjectId : undefined,
      implantParentObjectId: typeof state.metadata?.implantParentObjectId === "string" ? state.metadata.implantParentObjectId : undefined,
      implantReference: state.metadata?.implantReference === true,
    };
    loaded.push({ metadata, runtime, binding: { caseObjectId: object.id, objectVersionId: version.id, geometryRevision: 0, versionNumber: version.version_number } });
  }
  if (loaded.length !== rows.length) throw new Error("The saved workspace is incomplete and was not opened.");
  return { caseId, title: caseRow.title, sourceType: caseRow.source_type, sourceSnapshot: caseRow.source_snapshot as Record<string,unknown>, headRevisionId: head?.revision_id ?? null, loadedRevisionId: revision.id, revisionNumber: revision.revision_number, createdAt: revision.created_at, objects: loaded, workspaceState: revision.workspace_state as Record<string,unknown> };
}

function geometryRegistryStats(root: THREE.Object3D) {
  let vertexCount = 0, triangleCount = 0;
  root.traverse((child) => { if (child instanceof THREE.Mesh) { const position = child.geometry.getAttribute("position"); vertexCount += position?.count ?? 0; triangleCount += child.geometry.index ? child.geometry.index.count / 3 : Math.floor((position?.count ?? 0) / 3); } });
  const bounds = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
  return { vertexCount, triangleCount, boundsMm: [bounds.x,bounds.y,bounds.z] as [number,number,number] };
}

function validCaseAssetMetadata(value: unknown): CadObjectMetadata["caseAssetMetadata"] {
  const parsed = caseAssetMetadataSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export async function listCaseRevisions(caseId: string) {
  const client = createBrowserSupabaseClient();
  const [{ data: revisions, error }, { data: checkpoints, error: checkpointError }, { data: head }] = await Promise.all([
    client.from("case_revisions").select("id,revision_number,created_at,change_summary").eq("case_id",caseId).order("revision_number",{ascending:false}),
    client.from("case_checkpoints").select("revision_id,name").eq("case_id",caseId),
    client.from("case_heads").select("revision_id").eq("case_id",caseId).maybeSingle(),
  ]);
  if (error || checkpointError) throw new Error(error?.message ?? checkpointError?.message ?? "Revision history could not be loaded.");
  const names = new Map<string,string[]>();
  for (const item of checkpoints ?? []) names.set(item.revision_id,[...(names.get(item.revision_id) ?? []),item.name]);
  return (revisions ?? []).map((item) => ({ ...item, current: item.id === head?.revision_id, checkpointNames: names.get(item.id) ?? [] })) as RevisionInfo[];
}

export async function createCheckpoint(caseId: string, revisionId: string, name: string) {
  const client = createBrowserSupabaseClient();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) throw new Error("Sign in before creating a checkpoint.");
  const { error } = await client.from("case_checkpoints").insert({ case_id: caseId, revision_id: revisionId, user_id: auth.user.id, name: name.trim() });
  if (error) throw new Error(error.message.includes("case_checkpoints_case_name_key") ? "A checkpoint already uses that name." : error.message);
}

export async function duplicateSavedCase(caseId: string, revisionId: string, title: string) {
  const client = createBrowserSupabaseClient();
  const { data, error } = await client.rpc("copy_case", { p_source_case_id: caseId, p_source_revision_id: revisionId, p_title: title });
  if (error) throw new Error(error.message);
  return data as { case_id: string; revision_id: string; revision_number: number };
}
