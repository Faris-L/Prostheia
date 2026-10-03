import * as THREE from "three";
import type { CadCommand } from "../engine/commands";
import type { CadObjectMetadata } from "../types";
import { geometryRegistry } from "../scene/geometry-registry";
import { useWorkspaceStore } from "../engine/workspace-store";
import { useImplantStore } from "./types";
import { useHistoryStore } from "../engine/history-store";

export class AddImplantFixtureCommand implements CadCommand {
  readonly label = "Add synthetic implant fixture";
  constructor(readonly metadata: CadObjectMetadata, readonly object: THREE.Object3D) {}
  execute() {
    geometryRegistry.register({ id: this.metadata.id, role: this.metadata.role, name: this.metadata.name, object: this.object, ownsResources: true });
    useWorkspaceStore.getState().addImportedObject({ ...this.metadata, geometryStats: geometryRegistry.stats(this.metadata.id) });
    useImplantStore.getState().addFixture(this.metadata.id);
  }
  undo() { useWorkspaceStore.getState().removeObject(this.metadata.id); geometryRegistry.remove(this.metadata.id, false); useImplantStore.getState().removeFixture(this.metadata.id); }
  redo() { this.execute(); }
  dispose() { geometryRegistry.disposeDetached(this.metadata.id); }
  get historyBytes() { return geometryRegistry.revisionBytes(this.metadata.id, 0); }
}

export class SetImplantRestorativeAxisCommand implements CadCommand {
  readonly label = "Set restorative reference axis";
  constructor(readonly before: [number, number, number], readonly after: [number, number, number]) {}
  execute() { useImplantStore.getState().setRestorativeAxis(this.after, false); }
  undo() { useImplantStore.getState().setRestorativeAxis(this.before, false); }
  redo() { this.execute(); }
}
export function setImplantRestorativeAxis(axis: [number, number, number]) {
  const state = useImplantStore.getState(), before = [...state.restorativeAxis] as [number, number, number];
  if (axis.every((value, index) => Math.abs(value - before[index]) < 0.00001)) return;
  useHistoryStore.getState().execute(new SetImplantRestorativeAxisCommand(before, axis));
}
