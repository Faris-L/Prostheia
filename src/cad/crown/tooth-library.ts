import { createSyntheticCrownMesh } from "./geometry";
import { geometryRegistry } from "../scene/geometry-registry";
import type { CadObjectId } from "../types";
import { useWorkspaceStore } from "../engine/workspace-store";
import { useHistoryStore } from "../engine/history-store";
import { MeshOperationCommand } from "../engine/commands";

export const CROWN_TOOTH_LIBRARY = [{ id: "synthetic-posterior-crown-26", label: "Synthetic posterior crown · 26", role: "crown" as const }];

/** Loads an internally generated anatomy preset into an editable Crown object and records it in CAD history. */
export function placeCrownFromLibrary(objectId: CadObjectId, presetId = CROWN_TOOTH_LIBRARY[0].id) {
  const object = useWorkspaceStore.getState().objects.find((entry) => entry.id === objectId);
  const runtime = geometryRegistry.get(objectId);
  if (!object || object.role !== "crown" || !object.editable || !runtime) throw new Error("Select an editable Crown object before placing an anatomy preset.");
  if (!CROWN_TOOTH_LIBRARY.some((preset) => preset.id === presetId)) throw new Error("This tooth library preset is unavailable.");
  const meshes = geometryRegistry.getMeshes(objectId);
  if (meshes.length !== 1) throw new Error("Choose a Crown object with one editable mesh child.");
  const before = runtime.geometryRevision;
  geometryRegistry.installRevision(objectId, meshes[0].key, createSyntheticCrownMesh());
  const after = geometryRegistry.get(objectId)!.geometryRevision;
  const updateStats = (id: CadObjectId) => useWorkspaceStore.getState().setGeometryStats(id, geometryRegistry.stats(id));
  updateStats(objectId);
  useHistoryStore.getState().recordApplied(new MeshOperationCommand(objectId, before, after, "Place crown from tooth library", updateStats));
  return after;
}
