import type { CadCommand } from "../engine/commands";
import { useHistoryStore } from "../engine/history-store";
import { useWorkspaceStore } from "../engine/workspace-store";
import { geometryRegistry } from "../scene/geometry-registry";
import { cadObjectId } from "../types";
import * as THREE from "three";
import { createSyntheticBridgeObject } from "./geometry";
import { useRestorativeSetupStore } from "./types";
import { restorativeCaseIds } from "./case";

export function setBridgeConnectorWidth(width: number) {
  if (!Number.isFinite(width) || width < 1 || width > 8) throw new Error("Connector target must be between 1 and 8 mm for this exercise.");
  const store = useRestorativeSetupStore.getState();
  if (store.restorationType !== "bridge" || width === store.connectorWidthMm) return false;
  const id = cadObjectId(restorativeCaseIds("bridge").restoration);
  const runtime = geometryRegistry.get(id);
  const meshes = geometryRegistry.getMeshes(id);
  const target = meshes.find((entry) => entry.key === "bridge-restoration-solid");
  if (!runtime || !target || meshes.length !== 1) throw new Error("The registered multi-unit bridge geometry is unavailable.");
  const beforeRevision = runtime.geometryRevision;
  const fresh = createSyntheticBridgeObject(width);
  const freshMesh = fresh.children.find((child): child is THREE.Mesh => child instanceof THREE.Mesh);
  if (!freshMesh) throw new Error("Bridge connector geometry could not be regenerated.");
  const afterRevision = geometryRegistry.installRevision(id, target.key, freshMesh.geometry);
  for (const material of (Array.isArray(freshMesh.material) ? freshMesh.material : [freshMesh.material])) material.dispose();
  const beforeWidth = store.connectorWidthMm;
  const command = new ConnectorAdjustmentCommand(id, beforeRevision, afterRevision, beforeWidth, width);
  useWorkspaceStore.setState((state) => ({ objects: state.objects.map((object) => object.id === id ? { ...object, connectorWidthMm: width, geometryStats: geometryRegistry.stats(id) } : object) }));
  useRestorativeSetupStore.getState().setConnectorWidth(width, false);
  useHistoryStore.getState().recordApplied(command);
  return true;
}

class ConnectorAdjustmentCommand implements CadCommand {
  readonly label = "Adjust bridge connector exercise target";
  readonly historyBytes: number;
  constructor(private readonly id: ReturnType<typeof cadObjectId>, private readonly beforeRevision: number, private readonly afterRevision: number, private readonly beforeWidth: number, private readonly afterWidth: number) {
    geometryRegistry.pinRevision(id, beforeRevision); geometryRegistry.pinRevision(id, afterRevision);
    this.historyBytes = Math.min(geometryRegistry.revisionBytes(id, beforeRevision) + geometryRegistry.revisionBytes(id, afterRevision), 32 * 1024 * 1024);
  }
  execute() { this.apply(this.afterRevision, this.afterWidth); }
  redo() { this.execute(); }
  undo() { this.apply(this.beforeRevision, this.beforeWidth); }
  dispose() { geometryRegistry.unpinRevision(this.id, this.beforeRevision); geometryRegistry.unpinRevision(this.id, this.afterRevision); }
  private apply(revision: number, width: number) {
    geometryRegistry.setRevision(this.id, revision);
    useWorkspaceStore.setState((state) => ({ objects: state.objects.map((object) => object.id === this.id ? { ...object, connectorWidthMm: width, geometryStats: geometryRegistry.stats(this.id) } : object) }));
    useRestorativeSetupStore.getState().setConnectorWidth(width, false);
  }
}
