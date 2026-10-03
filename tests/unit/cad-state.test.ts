import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { cadObjectId } from "@/cad/types";
import { GeometryRegistry } from "@/cad/scene/geometry-registry";
import { demoObjects } from "@/cad/scene/demo-objects";
import { CompositeCommand, TransformCommand, VisibilityCommand, type CadCommand } from "@/cad/engine/commands";
import { useHistoryStore } from "@/cad/engine/history-store";
import { useSaveStore } from "@/cad/engine/save-store";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import { recoveryDatabase } from "@/cad/recovery/database";
import { RECOVERY_SCHEMA_VERSION, discardRecovery, readRecovery, restoreRecovery, writeRecovery } from "@/cad/recovery/recovery";
import { isEditableTarget, resolveCadShortcut } from "@/cad/engine/shortcuts";
import { recordAppliedTransform, runTransformCommand, runTransparencyCommand } from "@/cad/engine/cad-actions";

afterEach(async () => {
  useWorkspaceStore.getState().resetDemo();
  useHistoryStore.getState().clear();
  useSaveStore.getState().markClean();
  await recoveryDatabase.recoveries.clear();
});

describe("Phase 6 CAD state", () => {
  it("registers, retrieves, marks dirty, and removes stable runtime object IDs", () => {
    const registry = new GeometryRegistry();
    const id = demoObjects[0].id;
    const object = new THREE.Group();
    registry.register({ id, name: "demo", role: "prepared_tooth", object, ownsResources: false });
    expect(registry.get(id)?.object).toBe(object);
    expect(registry.get(id)?.geometryRevision).toBe(0);
    registry.markDirty(id);
    expect(registry.get(id)).toMatchObject({ dirty: true, geometryRevision: 1 });
    expect(registry.getAll()).toHaveLength(1);
    registry.remove(id);
    expect(registry.get(id)).toBeUndefined();
  });

  it("uses stable application IDs independent of Three.js object UUIDs", () => {
    const registry = new GeometryRegistry();
    const first = new THREE.Group();
    const second = new THREE.Group();
    registry.register({ id: cadObjectId("stable-prostheia-id"), name: "Demo", role: "crown", object: first, ownsResources: false });
    expect(first.uuid).not.toBe("stable-prostheia-id");
    registry.register({ id: cadObjectId("stable-prostheia-id"), name: "Demo", role: "crown", object: second, ownsResources: false });
    expect(registry.get(cadObjectId("stable-prostheia-id"))?.object).toBe(second);
  });

  it("disposes runtime-owned resources once and leaves externally-owned resources alone", () => {
    const registry = new GeometryRegistry();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
    const geometryDispose = vi.spyOn(mesh.geometry, "dispose");
    const materialDispose = vi.spyOn(mesh.material, "dispose");
    const id = cadObjectId("owned");
    registry.register({ id, name: "Owned", role: "crown", object: mesh, ownsResources: true });
    registry.remove(id); registry.remove(id);
    expect(geometryDispose).toHaveBeenCalledTimes(1);
    expect(materialDispose).toHaveBeenCalledTimes(1);

    const shared = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
    const sharedDispose = vi.spyOn(shared.geometry, "dispose");
    registry.register({ id, name: "Shared", role: "crown", object: shared, ownsResources: false });
    registry.remove(id);
    expect(sharedDispose).not.toHaveBeenCalled();
  });

  it("executes, undoes and redoes complete transforms and records one gesture as one command", () => {
    const id = demoObjects[0].id;
    const before = demoObjects[0].transform;
    const after = { position: [3, 4, 5] as [number, number, number], rotation: [0.1, 0.2, 0.3] as [number, number, number], scale: [2, 2, 2] as [number, number, number] };
    let current = before;
    const command = new TransformCommand(id, before, after, (_id, value) => { current = value; });
    useHistoryStore.getState().execute(command);
    expect(current).toEqual(after);
    expect(useHistoryStore.getState().undoStack).toHaveLength(1);
    useHistoryStore.getState().undo();
    expect(current).toEqual(before);
    useHistoryStore.getState().redo();
    expect(current).toEqual(after);
  });

  it("records a gizmo gesture once after transient updates and commits numeric transforms once", () => {
    const id = demoObjects[0].id;
    const before = useWorkspaceStore.getState().objects[0].transform;
    const after = { position: [1, 2, 3] as [number, number, number], rotation: [0, 0.25, 0] as [number, number, number], scale: [1, 1, 1] as [number, number, number] };
    useWorkspaceStore.getState().previewTransform(id, { position: [0.2, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] });
    useWorkspaceStore.getState().previewTransform(id, { position: [0.5, 1, 0], rotation: [0, 0.1, 0], scale: [1, 1, 1] });
    useWorkspaceStore.getState().previewTransform(id, after);
    recordAppliedTransform(id, before, after);
    expect(useHistoryStore.getState().undoStack).toHaveLength(1);
    useHistoryStore.getState().undo();
    expect(useWorkspaceStore.getState().objects[0].transform).toEqual(before);
    const numericAfter = { ...before, position: [4, 0, 0] as [number, number, number] };
    useWorkspaceStore.getState().previewTransform(id, numericAfter);
    runTransformCommand(id, before, numericAfter);
    expect(useHistoryStore.getState().undoStack).toHaveLength(1);
  });

  it("undoes visibility and grouped isolate commands", () => {
    const ids = demoObjects.map((object) => object.id);
    const apply = (changes: { id: typeof ids[number]; visible: boolean }[]) => useWorkspaceStore.getState().applyVisibility(changes);
    const command = new VisibilityCommand(ids.map((id, index) => ({ id, before: true, after: index === 0 })), apply, "Isolate object");
    useHistoryStore.getState().execute(command);
    expect(useWorkspaceStore.getState().objects.filter((object) => object.visible).map((object) => object.id)).toEqual([ids[0]]);
    useHistoryStore.getState().undo();
    expect(useWorkspaceStore.getState().objects.every((object) => object.visible)).toBe(true);
    useHistoryStore.getState().redo();
    expect(useWorkspaceStore.getState().objects.filter((object) => object.visible).map((object) => object.id)).toEqual([ids[0]]);
  });

  it("undoes and redoes transparency changes", () => {
    const id = demoObjects[1].id;
    useWorkspaceStore.getState().previewOpacity(id, 0.35);
    runTransparencyCommand(id, 1, 0.35);
    expect(useWorkspaceStore.getState().objects[1].opacity).toBe(0.35);
    useHistoryStore.getState().undo();
    expect(useWorkspaceStore.getState().objects[1].opacity).toBe(1);
    useHistoryStore.getState().redo();
    expect(useWorkspaceStore.getState().objects[1].opacity).toBe(0.35);
  });

  it("clears redo after a new command and supports composite command ordering", () => {
    const changes: string[] = [];
    const command = (label: string): CadCommand => ({ label, execute: () => changes.push(label), undo: () => { changes.pop(); } });
    useHistoryStore.getState().execute(command("first"));
    useHistoryStore.getState().undo();
    expect(useHistoryStore.getState().redoStack).toHaveLength(1);
    useHistoryStore.getState().execute(command("new"));
    expect(useHistoryStore.getState().redoStack).toHaveLength(0);
    const grouped = new CompositeCommand("group", [command("a"), command("b")]);
    grouped.execute(); grouped.undo();
    expect(changes).toEqual(["new"]);
  });

  it("tracks dirty state across edits and local recovery without claiming cloud save", () => {
    const save = useSaveStore.getState();
    save.markDirty();
    expect(useSaveStore.getState()).toMatchObject({ status: "dirty", hasUnsavedChanges: true });
    useSaveStore.getState().markSaving();
    expect(useSaveStore.getState().status).toBe("saving");
    useSaveStore.getState().markLocallySaved(123);
    expect(useSaveStore.getState()).toMatchObject({ status: "saved", hasUnsavedChanges: true, lastRecoveryAt: 123, lastCloudRevision: null });
    useSaveStore.getState().markSaveFailed("offline");
    expect(useSaveStore.getState().status).toBe("save_failed");
  });

  it("resets the active transform operation without adding history", () => {
    const id = demoObjects[0].id;
    const before = demoObjects[0].transform;
    useWorkspaceStore.getState().beginTransformOperation(id, before);
    useWorkspaceStore.getState().previewTransform(id, { ...before, position: [5, 0, 0] });
    const operation = useWorkspaceStore.getState().cancelTransformOperation();
    expect(operation?.id).toBe(id);
    expect(useWorkspaceStore.getState().objects[0].transform).toEqual(before);
    expect(useWorkspaceStore.getState().transformDragging).toBe(false);
    expect(useHistoryStore.getState().undoStack).toHaveLength(0);
  });

  it("serializes, validates, restores and discards recovery snapshots", async () => {
    const id = demoObjects[0].id;
    useWorkspaceStore.getState().applyTransform(id, { position: [7, 8, 9], rotation: [0, 0.3, 0], scale: [1.2, 1.2, 1.2] });
    const timestamp = await writeRecovery("test-workspace");
    const snapshot = await readRecovery("test-workspace");
    expect(snapshot).toMatchObject({ schemaVersion: RECOVERY_SCHEMA_VERSION, workspaceKey: "test-workspace", timestamp, lastCloudRevision: null });
    useWorkspaceStore.getState().resetDemo();
    restoreRecovery(snapshot!, "test-workspace");
    expect(useWorkspaceStore.getState().objects.find((object) => object.id === id)?.transform.position).toEqual([7, 8, 9]);
    expect(useSaveStore.getState()).toMatchObject({ status: "dirty", hasUnsavedChanges: true });
    await discardRecovery("test-workspace");
    expect(await readRecovery("test-workspace")).toBeNull();
  });

  it("rejects invalid and unknown recovery schemas without restoring them", async () => {
    await recoveryDatabase.recoveries.put({ schemaVersion: 99, workspaceKey: "future", timestamp: Date.now(), lastCloudRevision: null, payload: {} } as never);
    await expect(readRecovery("future")).rejects.toThrow(/Unsupported recovery schema version/);
    await recoveryDatabase.recoveries.put({ schemaVersion: 1, workspaceKey: "broken", timestamp: Date.now(), payload: {} } as never);
    await expect(readRecovery("broken")).rejects.toThrow(/validation failed/i);
  });

  it("guards CAD shortcuts from text fields and maps required keys", () => {
    const input = document.createElement("input");
    document.body.append(input);
    expect(isEditableTarget(input)).toBe(true);
    expect(isEditableTarget(document.createElement("canvas"))).toBe(false);
    input.remove();
    expect(resolveCadShortcut({ key: "z", ctrlKey: true, metaKey: false, shiftKey: false, altKey: false })).toBe("undo");
    expect(resolveCadShortcut({ key: "z", ctrlKey: true, metaKey: false, shiftKey: true, altKey: false })).toBe("redo");
    expect(resolveCadShortcut({ key: "y", ctrlKey: true, metaKey: false, shiftKey: false, altKey: false })).toBe("redo");
    expect(resolveCadShortcut({ key: "s", ctrlKey: true, metaKey: false, shiftKey: false, altKey: false })).toBe("save");
    expect(resolveCadShortcut({ key: "g", ctrlKey: false, metaKey: false, shiftKey: false, altKey: false })).toBe("move");
    expect(resolveCadShortcut({ key: "r", ctrlKey: false, metaKey: false, shiftKey: false, altKey: false })).toBe("rotate");
    expect(resolveCadShortcut({ key: "s", ctrlKey: false, metaKey: false, shiftKey: false, altKey: false })).toBe("scale");
    expect(resolveCadShortcut({ key: "Delete", ctrlKey: false, metaKey: false, shiftKey: false, altKey: false })).toBe("reserved-delete");
  });
});
