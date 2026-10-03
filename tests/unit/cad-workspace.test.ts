import { afterEach, describe, expect, it } from "vitest";
import { getStandardView } from "@/cad/camera/standard-views";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import { degreesToRadians, fromDisplayTransform, radiansToDegrees, rotationSnapRadians, toDisplayTransform, translationSnapValue } from "@/cad/transform/units";
import { demoObjects } from "@/cad/scene/demo-objects";
import { runIsolateCommand, runTransparencyCommand, runVisibilityCommand } from "@/cad/engine/cad-actions";
import { useHistoryStore } from "@/cad/engine/history-store";
import { useSaveStore } from "@/cad/engine/save-store";

afterEach(() => { useWorkspaceStore.getState().resetDemo(); useHistoryStore.getState().clear(); useSaveStore.getState().markClean(); });

describe("Phase 5 CAD workspace foundations", () => {
  it("calculates standard views from the canonical Z-up dental axes", () => {
    expect(getStandardView("front", 10)).toEqual({ position: [0, -10, 0], up: [0, 0, 1] });
    expect(getStandardView("top", 10)).toEqual({ position: [0, 0, 10], up: [0, 1, 0] });
    expect(getStandardView("bottom", 5).position).toEqual([0, 0, -5]);
    expect(getStandardView("left", 2).position).toEqual([-2, 0, 0]);
  });

  it("converts typed rotations between degrees and Three.js radians", () => {
    expect(radiansToDegrees(Math.PI)).toBe(180);
    expect(degreesToRadians(90)).toBeCloseTo(Math.PI / 2);
    expect(rotationSnapRadians(5)).toBeCloseTo((5 * Math.PI) / 180);
    expect(rotationSnapRadians("free")).toBeNull();
    expect(translationSnapValue(0.5)).toBe(0.5);
    expect(translationSnapValue("free")).toBeNull();
    const updated = fromDisplayTransform(demoObjects[0].transform, "rotation", 2, 45);
    expect(toDisplayTransform(updated).rotation[2]).toBeCloseTo(45);
  });

  it("synchronizes selection, visibility, isolate, and transparency metadata", () => {
    const store = useWorkspaceStore.getState();
    const first = demoObjects[0].id;
    const second = demoObjects[1].id;
    store.select(first);
    expect(useWorkspaceStore.getState().selectedObjectId).toBe(first);
    runVisibilityCommand([{ id: first, visible: false }]);
    expect(useWorkspaceStore.getState().objects.find((object) => object.id === first)?.visible).toBe(false);
    runIsolateCommand(null);
    expect(useWorkspaceStore.getState().objects.every((object) => object.visible)).toBe(true);
    runIsolateCommand(second);
    expect(useWorkspaceStore.getState().objects.filter((object) => object.visible).map((object) => object.id)).toEqual([second]);
    runIsolateCommand(null);
    runTransparencyCommand(second, 1, 0.35);
    expect(useWorkspaceStore.getState().objects.find((object) => object.id === second)?.opacity).toBe(0.35);
    store.select(null);
    expect(useWorkspaceStore.getState().selectedObjectId).toBeNull();
  });

  it("reflects perspective and orthographic mode in editor state", () => {
    useWorkspaceStore.getState().setCameraMode("orthographic");
    expect(useWorkspaceStore.getState().cameraMode).toBe("orthographic");
    useWorkspaceStore.getState().setCameraMode("perspective");
    expect(useWorkspaceStore.getState().cameraMode).toBe("perspective");
  });
});
