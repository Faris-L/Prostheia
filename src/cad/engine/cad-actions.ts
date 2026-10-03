import type { CadObjectId, CadTransform } from "../types";
import { TransformCommand, TransparencyCommand, VisibilityCommand } from "./commands";
import { useHistoryStore } from "./history-store";
import { useSaveStore } from "./save-store";
import { useWorkspaceStore } from "./workspace-store";

const applyTransform = (id: CadObjectId, transform: CadTransform) => useWorkspaceStore.getState().applyTransform(id, transform);
const applyVisibility = (changes: { id: CadObjectId; visible: boolean }[]) => useWorkspaceStore.getState().applyVisibility(changes);
const applyOpacity = (id: CadObjectId, opacity: number) => useWorkspaceStore.getState().applyOpacity(id, opacity);

export function runTransformCommand(id: CadObjectId, before: CadTransform, after: CadTransform) {
  if (sameTransform(before, after)) return;
  useHistoryStore.getState().execute(new TransformCommand(id, before, after, applyTransform));
}

export function recordAppliedTransform(id: CadObjectId, before: CadTransform, after: CadTransform) {
  if (sameTransform(before, after)) return;
  useHistoryStore.getState().recordApplied(new TransformCommand(id, before, after, applyTransform));
}

export function runVisibilityCommand(changes: { id: CadObjectId; visible: boolean }[], label = "Change visibility") {
  const objects = useWorkspaceStore.getState().objects;
  const actual = changes.flatMap(({ id, visible }) => {
    const object = objects.find((entry) => entry.id === id);
    return object && object.visible !== visible ? [{ id, before: object.visible, after: visible }] : [];
  });
  if (!actual.length) return;
  useHistoryStore.getState().execute(new VisibilityCommand(actual, applyVisibility, label));
}

export function runIsolateCommand(id: CadObjectId | null) {
  const objects = useWorkspaceStore.getState().objects;
  runVisibilityCommand(objects.map((object) => ({ id: object.id, visible: id === null || id === object.id })), id ? "Isolate object" : "Show all objects");
}

export function runTransparencyCommand(id: CadObjectId, before: number, opacity: number) {
  const object = useWorkspaceStore.getState().objects.find((entry) => entry.id === id);
  if (!object) return;
  const after = Math.max(0.15, Math.min(1, opacity));
  if (before === after) return;
  useHistoryStore.getState().execute(new TransparencyCommand({ id, before, after }, applyOpacity));
}

export function markPreviewDirty() { useSaveStore.getState().markDirty(); }

function sameTransform(a: CadTransform, b: CadTransform) {
  return (["position", "rotation", "scale"] as const).every((key) => a[key].every((value, index) => value === b[key][index]));
}
