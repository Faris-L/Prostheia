import * as THREE from "three";
import { cadObjectId, type CadObjectMetadata } from "../types";
import { geometryRegistry } from "../scene/geometry-registry";
import { useWorkspaceStore } from "../engine/workspace-store";
import { useHistoryStore } from "../engine/history-store";
import { DuplicateObjectCommand, MeshOperationCommand, TransformCommand } from "../engine/commands";
import { useDigitalModelStore } from "./types";
import { createEducationalModelBase, createModelAttachmentGeometry, createRemovableDieGeometry } from "./geometry";
import { useSaveStore } from "../engine/save-store";
import { createR6DigitalModelBase } from "./r6-geometry";

function addMesh(id: string, name: string, part: NonNullable<CadObjectMetadata["digitalModelPart"]>, geometry: THREE.BufferGeometry, position: [number, number, number], color: string) {
  if (geometryRegistry.get(cadObjectId(id))) throw new Error("This model component already exists.");
  const object = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.58 }));
  object.name = name;
  const metadata: CadObjectMetadata = { id: cadObjectId(id), name, role: "model_base", editable: true, syntheticMesh: true, digitalModelPart: part, digitalModelParentId: useDigitalModelStore.getState().workingModelId ?? undefined, transform: { position, rotation: [0, 0, 0], scale: [1, 1, 1] }, visible: true, opacity: 1 };
  useHistoryStore.getState().execute(new DuplicateObjectCommand(metadata, object));
  return metadata.id;
}
export function generateDigitalModelBase(heightMm = 8) {
  const setup = useDigitalModelStore.getState();
  if (setup.baseId) {
    const baseId = cadObjectId(setup.baseId);
    const existing = geometryRegistry.get(baseId);
    if (existing) {
      const working = setup.workingModelId && geometryRegistry.get(cadObjectId(setup.workingModelId));
      const metadata = useWorkspaceStore.getState().objects.find((object) => object.id === baseId);
      const arch = metadata?.caseWorkflowMetadata?.scanArch === "lower" ? "lower" : "upper";
      const replacement = metadata?.casePackageId?.startsWith("r6-digital-model-")
        ? createR6DigitalModelBase(arch, heightMm)
        : working ? new THREE.Mesh(createEducationalModelBase(working.object, heightMm), new THREE.MeshStandardMaterial({ color: "#7e9eac", roughness: 0.58 })) : null;
      if (replacement) {
        const meshes = geometryRegistry.getMeshes(baseId);
        if (meshes.length !== 1) { replacement.geometry.dispose(); replacement.material.dispose(); throw new Error("The support base must be a single mesh to update its exercise height."); }
        const beforeRevision = existing.geometryRevision;
        const afterRevision = geometryRegistry.installRevision(baseId, meshes[0].key, replacement.geometry);
        replacement.material.dispose();
        const updateStats = (objectId: typeof baseId) => useWorkspaceStore.setState((state) => ({ objects: state.objects.map((object) => object.id === objectId ? { ...object, geometryStats: geometryRegistry.stats(objectId) } : object) }));
        updateStats(baseId);
        useHistoryStore.getState().recordApplied(new MeshOperationCommand(baseId, beforeRevision, afterRevision, "Adjust educational model-base height", updateStats));
      }
      useWorkspaceStore.getState().applyVisibility([{ id: baseId, visible: true }]);
      useDigitalModelStore.setState({ baseHeightMm: heightMm, stage: "base" });
      useSaveStore.getState().markDirty();
      useWorkspaceStore.getState().select(baseId);
      return baseId;
    }
  }
  const source = setup.workingModelId && geometryRegistry.get(cadObjectId(setup.workingModelId));
  if (!source) throw new Error("Open a Digital Model case and select its working geometry first.");
  const geometry = createEducationalModelBase(source.object, heightMm);
  const id = addMesh("digital-model-base", "Generated model base · educational shape", "base", geometry, [0, 0, 0], "#7e9eac");
  useDigitalModelStore.setState({ baseId: id, baseHeightMm: heightMm, stage: "base" });
  useWorkspaceStore.getState().select(id);
  return id;
}

export function orientDigitalModel() {
  const setup = useDigitalModelStore.getState();
  const id = setup.workingModelId && cadObjectId(setup.workingModelId);
  const object = id && useWorkspaceStore.getState().objects.find((entry) => entry.id === id);
  if (!id || !object || object.caseRole !== "DESIGN" || !object.editable) throw new Error("Choose the editable working copy before changing its orientation.");
  const before = object.transform;
  const after = { position: [0, 0, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], scale: [...before.scale] as [number, number, number] };
  useHistoryStore.getState().execute(new TransformCommand(id, before, after, (objectId, transform) => useWorkspaceStore.getState().applyTransform(objectId, transform)));
  useDigitalModelStore.setState({ stage: "orientation" });
  return id;
}

export function markDigitalModelFinalReview() {
  const setup = useDigitalModelStore.getState();
  const workingId = setup.workingModelId && cadObjectId(setup.workingModelId);
  const baseId = setup.baseId && cadObjectId(setup.baseId);
  if (!workingId || !baseId || !geometryRegistry.get(workingId) || !geometryRegistry.get(baseId)) throw new Error("Complete the working copy and separate model base before final review.");
  const stats = geometryRegistry.stats(workingId);
  if (stats.triangleCount < 20 || stats.vertexCount < 30) throw new Error("The working mesh does not contain enough geometry for a final review.");
  useDigitalModelStore.setState({ stage: "final" });
  useSaveStore.getState().markDirty();
  return workingId;
}
export function addRemovableDie(position: [number, number, number] = [0, 0, 0]) {
  const id = `digital-model-removable-die-${useDigitalModelStore.getState().dieIds.length + 1}`;
  const geometry = createRemovableDieGeometry();
  const objectId = addMesh(id, `Removable die ${useDigitalModelStore.getState().dieIds.length + 1}`, "removable_die", geometry, position, "#e3ba76");
  useDigitalModelStore.setState((state) => ({ dieIds: [...state.dieIds, objectId] }));
  useWorkspaceStore.getState().select(objectId);
  return objectId;
}
export function addModelAttachment(position: [number, number, number] = [0, 0, 0]) {
  const id = `digital-model-attachment-${useDigitalModelStore.getState().attachmentIds.length + 1}`;
  const geometry = createModelAttachmentGeometry();
  const objectId = addMesh(id, `Model attachment ${useDigitalModelStore.getState().attachmentIds.length + 1}`, "attachment", geometry, position, "#9fb8bd");
  useDigitalModelStore.setState((state) => ({ attachmentIds: [...state.attachmentIds, objectId] }));
  useWorkspaceStore.getState().select(objectId);
  return objectId;
}
