import * as THREE from "three";
import { createSyntheticDentureTooth } from "./geometry";
import { useWorkspaceStore } from "../engine/workspace-store";
import { useHistoryStore } from "../engine/history-store";
import { MeshOperationCommand } from "../engine/commands";
import type { CadCommand } from "../engine/commands";
import { geometryRegistry } from "../scene/geometry-registry";
import { useSaveStore } from "../engine/save-store";
import { dentureToothId } from "./case";
import { cadObjectId } from "../types";
import { useDentureSetupStore } from "./setup-store";
import { createDentureBase, type DentureArch } from "./geometry";
import { DENTURE_IDS } from "./case";

export const DENTURE_TOOTH_SETS = [
  { id: "balanced", label: "Balanced · synthetic set A" },
  { id: "broad", label: "Broad · synthetic set B" },
] as const;

export function regenerateDentureBase(arch: DentureArch) {
  const id = cadObjectId(arch === "upper" ? DENTURE_IDS.upperBase : DENTURE_IDS.lowerBase);
  const runtime = geometryRegistry.get(id);
  const current = geometryRegistry.getMeshes(id);
  if (!runtime || current.length !== 1) throw new Error("Select a registered denture base with one editable mesh.");
  const fresh = createDentureBase(arch);
  const newMesh = fresh.children.find((child): child is THREE.Mesh => child instanceof THREE.Mesh);
  if (!newMesh) throw new Error("A valid synthetic base surface could not be generated.");
  const before = runtime.geometryRevision;
  const after = geometryRegistry.installRevision(id, current[0].key, newMesh.geometry);
  fresh.traverse((child) => { if (!(child instanceof THREE.Mesh)) return; for (const material of (Array.isArray(child.material) ? child.material : [child.material])) material.dispose(); });
  useWorkspaceStore.getState().setGeometryStats(id, geometryRegistry.stats(id));
  useHistoryStore.getState().recordApplied(new MeshOperationCommand(id, before, after, "Regenerate synthetic denture base", (targetId) => useWorkspaceStore.getState().setGeometryStats(targetId, geometryRegistry.stats(targetId))));
  useSaveStore.getState().markDirty();
  return after;
}

export function applyDentureToothSet(toothSet: "balanced" | "broad") {
  const objects = useWorkspaceStore.getState().objects.filter((object) => object.denturePart === "tooth");
  const commands: MeshOperationCommand[] = [];
  for (const object of objects) {
    const number = object.dentalPosition;
    if (number === undefined || object.toothSetId === toothSet) continue;
    const id = cadObjectId(dentureToothId(number));
    const runtime = geometryRegistry.get(id);
    if (!runtime) continue;
    const fresh = createSyntheticDentureTooth(number, toothSet);
    const freshMeshes: import("three").Mesh[] = [];
    fresh.traverse((child) => { if (child instanceof THREE.Mesh) freshMeshes.push(child); });
    const currentMeshes = geometryRegistry.getMeshes(id);
    if (freshMeshes.length !== currentMeshes.length) continue;
    for (let index = 0; index < currentMeshes.length; index++) {
      const before = geometryRegistry.get(id)!.geometryRevision;
      const after = geometryRegistry.installRevision(id, currentMeshes[index].key, freshMeshes[index].geometry);
      commands.push(new MeshOperationCommand(id, before, after, "Change denture tooth set", (targetId) => useWorkspaceStore.getState().setGeometryStats(targetId, geometryRegistry.stats(targetId))));
    }
    fresh.traverse((child) => { if (!(child instanceof THREE.Mesh)) return; for (const material of (Array.isArray(child.material) ? child.material : [child.material])) material.dispose(); });
    useWorkspaceStore.setState((state) => ({ objects: state.objects.map((entry) => entry.id === object.id ? { ...entry, toothSetId: toothSet, geometryStats: geometryRegistry.stats(id) } : entry) }));
  }
  if (commands.length) useHistoryStore.getState().recordApplied(new DentureToothSetCommand(toothSet, commands));
  useDentureSetupStore.getState().setToothSet(toothSet);
  markDentureSetDirty();
}

class DentureToothSetCommand implements CadCommand {
  readonly label = "Change artificial tooth set";
  constructor(private readonly after: "balanced" | "broad", private readonly commands: MeshOperationCommand[]) {}
  get historyBytes() { return this.commands.reduce((total, command) => total + command.historyBytes, 0); }
  execute() { for (const command of this.commands) command.execute(); this.update(this.after); }
  redo() { this.execute(); }
  undo() { for (const command of [...this.commands].reverse()) command.undo(); this.update(this.after === "broad" ? "balanced" : "broad"); }
  dispose() { for (const command of this.commands) command.dispose(); }
  private update(toothSet: "balanced" | "broad") {
    useWorkspaceStore.setState((state) => ({ objects: state.objects.map((object) => object.denturePart === "tooth" ? { ...object, toothSetId: toothSet } : object) }));
    useDentureSetupStore.getState().setToothSet(toothSet);
  }
}

function markDentureSetDirty() { useSaveStore.getState().markDirty(); }
