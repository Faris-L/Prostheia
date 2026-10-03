import * as THREE from "three";
import { MeshOperationCommand, type CadCommand } from "../engine/commands";
import { useHistoryStore } from "../engine/history-store";
import { useWorkspaceStore } from "../engine/workspace-store";
import { geometryRegistry } from "../scene/geometry-registry";
import { useCurveStore } from "../curves/store";
import { cadObjectId, type CadObjectMetadata } from "../types";
import { createPartialComponentGeometry, partialComponentPath } from "./geometry";
import { usePartialDentureStore, type PartialComponent, type PartialComponentKind } from "./types";
import { createR5PartialComponent, rpdComponentPath, RPD_CASE_PLANS } from "./r5-geometry";

function runtimeObject(id: string, name: string, kind: PartialComponentKind, path: [number, number, number][]) {
  const object = createPartialComponentGeometry(kind, path);
  object.name = name;
  object.traverse((child) => { if (child instanceof THREE.Mesh && !child.userData.prostheiaMeshId) child.userData.prostheiaMeshId = `${id}-mesh-${object.children.indexOf(child)}`; });
  return object;
}

class PartialComponentCommand implements CadCommand {
  readonly label: string;
  readonly metadata: CadObjectMetadata;
  readonly object: THREE.Object3D;
  readonly component: PartialComponent;
  readonly curve: import("../curves/types").CadCurve;
  constructor(metadata: CadObjectMetadata, object: THREE.Object3D, component: PartialComponent, curve: import("../curves/types").CadCurve) {
    this.metadata = metadata; this.object = object; this.component = component; this.curve = curve;
    this.label = `Add ${component.kind.replaceAll("_", " ")}`;
  }
  execute() {
    geometryRegistry.register({ id: this.metadata.id, role: this.metadata.role, name: this.metadata.name, object: this.object, ownsResources: true });
    useWorkspaceStore.getState().addImportedObject({ ...this.metadata, geometryStats: geometryRegistry.stats(this.metadata.id) });
    usePartialDentureStore.getState().addComponent(this.component, false);
    const curves = useCurveStore.getState().curves;
    if (!curves.some((curve) => curve.id === this.curve.id)) useCurveStore.getState().replace({ curves: [...curves, this.curve], activeCurveId: useCurveStore.getState().activeCurveId });
  }
  undo() { useWorkspaceStore.getState().removeObject(this.metadata.id); geometryRegistry.remove(this.metadata.id, false); usePartialDentureStore.getState().removeComponent(this.component.id, false); useCurveStore.getState().removeCurve(this.curve.id); }
  redo() { this.execute(); }
  dispose() { geometryRegistry.disposeDetached(this.metadata.id); }
  get historyBytes() { return geometryRegistry.revisionBytes(this.metadata.id, 0); }
}

/** Adds a stable, editable framework subcomponent to the shared CAD Scene Tree. */
export function addPartialDentureComponent(kind: PartialComponentKind, toothNumber?: number, ordinal = 0, recordHistory = true) {
  const setup = usePartialDentureStore.getState();
  if (!setup.kennedyClass) throw new Error("Open a Partial Denture training case first.");
  const packageAbutment = toothNumber ? useWorkspaceStore.getState().objects.find((object) => object.id === setup.abutmentObjectIds.find((id) => {
    const tooth = useWorkspaceStore.getState().objects.find((candidate) => candidate.id === cadObjectId(id));
    return tooth?.partialDentureToothNumber === toothNumber || tooth?.dentalPosition === toothNumber;
  })) : undefined;
  const legacyAbutmentId = toothNumber ? `partial-denture-synthetic-tooth-${toothNumber}` : undefined;
  if (toothNumber && (setup.packageId ? !packageAbutment : !setup.missingToothNumbers.includes(toothNumber) && !setup.abutmentObjectIds.includes(legacyAbutmentId!))) throw new Error(`Tooth ${toothNumber} is not an abutment in this case.`);
  const existing = setup.components.find((component) => component.kind === kind && component.toothNumber === toothNumber);
  if (existing) return existing.id;
  const id = `partial-denture-${setup.kennedyClass.toLowerCase()}-${kind}${toothNumber ? `-${toothNumber}` : ""}${ordinal > 0 ? `-${ordinal + 1}` : ""}`;
  const plan = setup.packageId && setup.arch ? RPD_CASE_PLANS[setup.kennedyClass] : undefined;
  const path = plan ? rpdComponentPath({ kind, arch: setup.arch!, classPlan: plan, toothNumber }) : partialComponentPath(kind, toothNumber, ordinal);
  const curveId = `${id}-path`;
  const component: PartialComponent = { id, kind, curveId, ...(setup.arch ? { arch: setup.arch } : {}), ...(plan && kind === "major_connector" ? { connectorForm: plan.connectorForm } : {}), ...(toothNumber ? { toothNumber, abutmentObjectId: packageAbutment?.id ?? legacyAbutmentId } : {}), ...(kind !== "major_connector" ? { parentComponentId: setup.components.find((item) => item.kind === "major_connector")?.id } : {}) };
  const objectId = cadObjectId(id);
  const label = `${kind.replaceAll("_", " ")}${toothNumber ? ` · FDI ${toothNumber}` : ""} · Kennedy ${setup.kennedyClass}`;
  const object = plan ? createR5PartialComponent({ kind, arch: setup.arch!, points: path, connectorForm: plan.connectorForm }) : runtimeObject(id, label, kind, path);
  object.name = label;
  const metadata: CadObjectMetadata = { id: objectId, name: label, role: kind === "blockout" || kind === "relief" ? "other" : "framework", editable: true, syntheticMesh: true, visible: true, opacity: kind === "blockout" || kind === "relief" ? 0.7 : 1, transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }, articulatorArch: setup.arch ?? "lower", partialDentureArch: setup.arch ?? undefined, partialDenturePart: kind, partialDentureClass: setup.kennedyClass, partialDentureToothNumber: toothNumber, partialDentureAbutmentObjectId: component.abutmentObjectId, partialDentureParentComponentId: component.parentComponentId, ...(setup.packageId ? { caseRole: "DESIGN" as const, casePackageId: setup.packageId, caseObjectId: id, caseWorkflowMetadata: { partialDenturePart: kind, partialDentureClass: setup.kennedyClass, partialDentureArch: setup.arch, partialDentureToothNumber: toothNumber, partialDentureAbutmentObjectId: component.abutmentObjectId, partialDentureParentComponentId: component.parentComponentId } } : {}) };
  const curve: import("../curves/types").CadCurve = { id: curveId, kind: "framework_path", coordinateSpace: "object-local", objectId, points: path.map((point) => [...point] as [number, number, number]), closed: kind === "retention_mesh" };
  const command = new PartialComponentCommand(metadata, object, component, curve);
  if (recordHistory) useHistoryStore.getState().execute(command);
  else command.execute();
  return id;
}

export function removePartialDentureComponent(componentId: string) {
  const component = usePartialDentureStore.getState().components.find((item) => item.id === componentId);
  if (!component) return false;
  const metadata = useWorkspaceStore.getState().objects.find((item) => item.id === cadObjectId(componentId));
  const runtime = geometryRegistry.get(cadObjectId(componentId));
  const componentCurve = useCurveStore.getState().curves.find((curve) => curve.id === component.curveId);
  if (!metadata || !runtime || !componentCurve) return false;
  const currentComponent = component;
  const currentMetadata = metadata;
  const currentRuntime = runtime;
  const currentCurve = componentCurve;
  class RemoveComponentCommand implements CadCommand {
    label = `Remove ${currentComponent.kind.replaceAll("_", " ")}`;
    execute() { useWorkspaceStore.getState().removeObject(currentMetadata.id); geometryRegistry.remove(currentMetadata.id, false); usePartialDentureStore.getState().removeComponent(currentComponent.id, false); useCurveStore.getState().removeCurve(currentCurve.id); }
    undo() { geometryRegistry.register({ id: currentMetadata.id, role: currentMetadata.role, name: currentMetadata.name, object: currentRuntime.object, ownsResources: true }); useWorkspaceStore.getState().addImportedObject({ ...currentMetadata, geometryStats: geometryRegistry.stats(currentMetadata.id) }); usePartialDentureStore.getState().addComponent(currentComponent, false); const curves = useCurveStore.getState().curves; if (!curves.some((curve) => curve.id === currentCurve.id)) useCurveStore.getState().replace({ curves: [...curves, currentCurve], activeCurveId: useCurveStore.getState().activeCurveId }); }
    redo() { this.execute(); }
  }
  useHistoryStore.getState().execute(new RemoveComponentCommand());
  return true;
}

export function regeneratePartialDenturePath(curveId: string, points: [number, number, number][]) {
  const component = usePartialDentureStore.getState().components.find((item) => item.curveId === curveId);
  if (!component) return null;
  const id = cadObjectId(component.id);
  const runtime = geometryRegistry.get(id);
  const meshes = geometryRegistry.getMeshes(id);
  if (!runtime || meshes.length !== 1) throw new Error("The framework path target is not a single registered mesh.");
  const fresh = component.arch
    ? createR5PartialComponent({ kind: component.kind, arch: component.arch, points, ...(component.connectorForm ? { connectorForm: component.connectorForm } : {}), ...(component.restSurface ? { restSurface: component.restSurface } : {}), toothNumber: component.toothNumber })
    : createPartialComponentGeometry(component.kind, points);
  const child = fresh.children.find((entry): entry is THREE.Mesh => entry instanceof THREE.Mesh);
  if (!child) throw new Error("The framework component geometry could not be regenerated from its path.");
  const beforeRevision = runtime.geometryRevision;
  const afterRevision = geometryRegistry.installRevision(id, meshes[0].key, child.geometry);
  for (const material of (Array.isArray(child.material) ? child.material : [child.material])) material.dispose();
  const updateStats = (objectId: ReturnType<typeof cadObjectId>) => useWorkspaceStore.setState((state) => ({ objects: state.objects.map((object) => object.id === objectId ? { ...object, geometryStats: geometryRegistry.stats(objectId) } : object) }));
  updateStats(id);
  return new MeshOperationCommand(id, beforeRevision, afterRevision, "Regenerate Partial Denture component from shared curve", updateStats);
}
