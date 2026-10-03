import type { CadObjectId, CadObjectMetadata, CadTransform } from "../types";
import { geometryRegistry, MAX_MESH_HISTORY_BYTES } from "../scene/geometry-registry";
import * as THREE from "three";
import { useWorkspaceStore } from "./workspace-store";

export interface CadCommand {
  label: string;
  execute(): void;
  undo(): void;
  redo?(): void;
}

export class TransformCommand implements CadCommand {
  readonly label = "Transform object";
  constructor(readonly id: CadObjectId, readonly before: CadTransform, readonly after: CadTransform, private readonly apply: (id: CadObjectId, transform: CadTransform) => void) {}
  execute() { this.apply(this.id, cloneTransform(this.after)); }
  undo() { this.apply(this.id, cloneTransform(this.before)); }
  redo() { this.execute(); }
}

export type VisibilityChange = { id: CadObjectId; before: boolean; after: boolean };
export class VisibilityCommand implements CadCommand {
  readonly label: string;
  constructor(readonly changes: VisibilityChange[], private readonly apply: (changes: { id: CadObjectId; visible: boolean }[]) => void, label = "Change visibility") { this.label = label; }
  execute() { this.apply(this.changes.map(({ id, after }) => ({ id, visible: after }))); }
  undo() { this.apply(this.changes.map(({ id, before }) => ({ id, visible: before }))); }
  redo() { this.execute(); }
}

export type TransparencyChange = { id: CadObjectId; before: number; after: number };
export class TransparencyCommand implements CadCommand {
  readonly label = "Change transparency";
  constructor(readonly change: TransparencyChange, private readonly apply: (id: CadObjectId, opacity: number) => void) {}
  execute() { this.apply(this.change.id, this.change.after); }
  undo() { this.apply(this.change.id, this.change.before); }
  redo() { this.execute(); }
}

export class CompositeCommand implements CadCommand {
  constructor(readonly label: string, readonly commands: CadCommand[]) {}
  execute() { for (const command of this.commands) command.execute(); }
  undo() { for (const command of [...this.commands].reverse()) command.undo(); }
  redo() { for (const command of this.commands) { if (command.redo) command.redo(); else command.execute(); } }
  get historyBytes() { return this.commands.reduce((total, command) => total + ((command as CadCommand & { historyBytes?: number }).historyBytes ?? 0), 0); }
  dispose() { for (const command of this.commands) (command as CadCommand & { dispose?: () => void }).dispose?.(); }
}

export class MeshOperationCommand implements CadCommand {
  readonly label: string;
  readonly historyBytes: number;
  constructor(readonly objectId: CadObjectId, readonly beforeGeometryRevision: number, readonly afterGeometryRevision: number, operation: string, private readonly applyStats: (id: CadObjectId) => void) {
    this.label = operation;
    geometryRegistry.pinRevision(objectId, beforeGeometryRevision);
    geometryRegistry.pinRevision(objectId, afterGeometryRevision);
    this.historyBytes = Math.min(MAX_MESH_HISTORY_BYTES * 2, geometryRegistry.revisionBytes(objectId, beforeGeometryRevision) + geometryRegistry.revisionBytes(objectId, afterGeometryRevision));
  }
  execute() { geometryRegistry.setRevision(this.objectId, this.afterGeometryRevision); this.applyStats(this.objectId); }
  undo() { geometryRegistry.setRevision(this.objectId, this.beforeGeometryRevision); this.applyStats(this.objectId); }
  redo() { this.execute(); }
  dispose() { geometryRegistry.unpinRevision(this.objectId, this.beforeGeometryRevision); geometryRegistry.unpinRevision(this.objectId, this.afterGeometryRevision); }
}

export class DuplicateObjectCommand implements CadCommand {
  readonly label = "Duplicate object";
  constructor(readonly metadata: CadObjectMetadata, readonly object: THREE.Object3D) {}
  execute() {
    geometryRegistry.register({ id: this.metadata.id, name: this.metadata.name, role: this.metadata.role, object: this.object, ownsResources: true });
    const stats = geometryRegistry.stats(this.metadata.id);
    useWorkspaceStore.getState().addImportedObject({ ...this.metadata, geometryStats: stats });
  }
  undo() { useWorkspaceStore.getState().removeObject(this.metadata.id); geometryRegistry.remove(this.metadata.id, false); }
  redo() { this.execute(); }
  dispose() { geometryRegistry.disposeDetached(this.metadata.id); }
  get historyBytes() { return geometryRegistry.revisionBytes(this.metadata.id, 0); }
}

export function cloneTransform(transform: CadTransform): CadTransform {
  return { position: [...transform.position], rotation: [...transform.rotation], scale: [...transform.scale] };
}
