import { describe, expect, it } from "vitest";
import { cadObjectId } from "@/cad/types";
import { computeDynamicContact } from "@/cad/articulator/contact";
import { evaluateJawPose, poseMatrix, sampleMotion, validateArticulatorConfig } from "@/cad/articulator/kinematics";
import { DEFAULT_ARTICULATOR_CONFIG } from "@/cad/articulator/types";
import type { AnalysisMeshSnapshot } from "@/cad/analysis/types";
import { Vector3 } from "three";
import * as THREE from "three";
import { geometryRegistry } from "@/cad/scene/geometry-registry";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import { useArticulatorStore } from "@/cad/articulator/store";
import { analysisResultIsCurrent, useAnalysisStore } from "@/cad/analysis/state";
import { snapshotMesh } from "@/cad/analysis/geometry";
import { articulatorSnapshot, restoreArticulatorSetup } from "@/cad/articulator/persistence";

const config = { ...DEFAULT_ARTICULATOR_CONFIG, sampleCount: 5 };
const point = (matrix: ReturnType<typeof poseMatrix>, value: [number, number, number]) => new Vector3(...value).applyMatrix4(matrix).toArray();

describe("virtual articulator kinematics", () => {
  it("keeps the reference pose unchanged", () => {
    const pose = evaluateJawPose("open_close", 0, config);
    expect(point(poseMatrix(pose), [3, 2, 0])).toEqual([3, 2, 0]);
    expect(pose.fixedArch).toBe("upper");
    expect(pose.movingArch).toBe("lower");
  });

  it("rotates around the configured hinge pivot and opens inferiorly", () => {
    const pose = evaluateJawPose("open_close", 1, config);
    const pivot = config.hingePivotMm;
    const atPivot = point(poseMatrix(pose), pivot);
    const anterior = point(poseMatrix(pose), [0, 0, 4]);
    expect(atPivot[0]).toBeCloseTo(pivot[0], 8);
    expect(atPivot[1]).toBeCloseTo(pivot[1], 8);
    expect(atPivot[2]).toBeCloseTo(pivot[2], 8);
    expect(anterior[2]).toBeLessThan(4);
  });

  it("supports deterministic protrusive and left/right lateral translations", () => {
    expect(evaluateJawPose("protrusive", 1, config).translationMm).toEqual([0, 4, 0]);
    expect(evaluateJawPose("left_lateral", 1, config).translationMm).toEqual([3, 0, 0]);
    expect(evaluateJawPose("right_lateral", 1, config).translationMm).toEqual([-3, 0, 0]);
  });

  it("samples endpoints deterministically and validates exercise ranges", () => {
    const first = sampleMotion("protrusive", config);
    const second = sampleMotion("protrusive", config);
    expect(first).toEqual(second);
    expect(first).toHaveLength(5);
    expect(first[0].t).toBe(0);
    expect(first.at(-1)?.t).toBe(1);
    expect(() => validateArticulatorConfig({ ...config, sampleCount: 1 })).toThrow();
  });

  it("returns reproducible sampled contact states and the first sampled contact", () => {
    const upper = triangle("upper", 0);
    const lower = triangle("lower", 0.4);
    const samples = sampleMotion("open_close", config).map((sample, index) => ({
      ...sample,
      pose: { ...sample.pose, translationMm: [0, 0, -index * 0.1] as [number, number, number], rotationDeg: 0 },
    }));
    const result = computeDynamicContact([upper, lower], samples, 0.1, JSON.stringify({ config, motion: "open_close" }));
    expect(result.samples.map(({ state }) => state)).toEqual(["separated", "separated", "near", "near", "contact"]);
    expect(result.firstContactSample).toBe(4);
    expect(result.firstContactT).toBe(1);
    const overlap = computeDynamicContact([upper, triangle("overlap", 0)], [samples[0]], 0.1);
    expect(overlap.samples[0].state).toBe("intersection");
  });

  it("marks sampled results stale after a transform or parameter change", () => {
    geometryRegistry.clear(); useAnalysisStore.getState().clear(); useArticulatorStore.getState().reset();
    const upperId = cadObjectId("articulator-test-upper"); const lowerId = cadObjectId("articulator-test-lower");
    const mesh = () => new THREE.Mesh(new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute([-1, -1, 0, 1, -1, 0, 0, 1, 0], 3)).setIndex([0, 1, 2]));
    const makeObject = (id: typeof upperId, arch: "upper" | "lower") => ({ id, name: id, role: "maxilla" as const, editable: true, articulatorArch: arch, transform: { position: [0, 0, arch === "lower" ? 1 : 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], scale: [1, 1, 1] as [number, number, number] }, visible: true, opacity: 1, geometryStats: { vertexCount: 3, triangleCount: 1, boundsMm: [2, 2, 0] as [number, number, number], revision: 1, dirty: false } });
    useWorkspaceStore.getState().initializeWorkspace("free-lab", [makeObject(upperId, "upper"), makeObject(lowerId, "lower")]);
    geometryRegistry.register({ id: upperId, name: "upper", role: "maxilla", object: mesh(), ownsResources: true });
    geometryRegistry.register({ id: lowerId, name: "lower", role: "mandible", object: mesh(), ownsResources: true });
    const currentConfig = useArticulatorStore.getState().config;
    const targets = [snapshotMesh(upperId, undefined, true), snapshotMesh(lowerId, undefined, true)] as [AnalysisMeshSnapshot, AnalysisMeshSnapshot];
    const result = computeDynamicContact(targets, sampleMotion("open_close", config), currentConfig.contactThresholdMm, JSON.stringify({ config: currentConfig, motion: "open_close" }));
    useAnalysisStore.getState().record(result);
    expect(analysisResultIsCurrent(result)).toBe(true);
    const lower = useWorkspaceStore.getState().objects.find((object) => object.id === lowerId)!;
    useWorkspaceStore.getState().applyTransform(lowerId, { ...lower.transform, position: [0, 1, 1] });
    expect(analysisResultIsCurrent(result)).toBe(false);
    useWorkspaceStore.getState().applyTransform(lowerId, lower.transform);
    useArticulatorStore.getState().configure({ ...currentConfig, lateralTravelMm: currentConfig.lateralTravelMm + 1 });
    expect(analysisResultIsCurrent(result)).toBe(false);
    useArticulatorStore.getState().configure(currentConfig);
    expect(analysisResultIsCurrent(result)).toBe(true);
    geometryRegistry.installRevision(lowerId, "mesh-0", mesh().geometry);
    expect(analysisResultIsCurrent(result)).toBe(false);
    geometryRegistry.clear(); useAnalysisStore.getState().clear(); useArticulatorStore.getState().reset();
  });

  it("serializes and restores only lightweight articulator metadata", () => {
    useArticulatorStore.getState().reset();
    useArticulatorStore.getState().configure({ ...config, hingePivotMm: [1, -16, 4], sampleCount: 7 });
    useArticulatorStore.getState().setMotion("right_lateral");
    const serialized = articulatorSnapshot();
    useArticulatorStore.getState().reset();
    restoreArticulatorSetup(serialized);
    expect(useArticulatorStore.getState().config.hingePivotMm).toEqual([1, -16, 4]);
    expect(useArticulatorStore.getState().config.sampleCount).toBe(7);
    expect(useArticulatorStore.getState().motion).toBe("right_lateral");
    useArticulatorStore.getState().reset();
  });
});

function triangle(id: string, z: number): AnalysisMeshSnapshot {
  return {
    objectId: cadObjectId(id), meshId: "triangle", geometryRevision: 1, transformSignature: "identity",
    positions: new Float32Array([-1, -1, z, 1, -1, z, 0, 1, z]), indices: new Uint32Array([0, 1, 2]),
  };
}
