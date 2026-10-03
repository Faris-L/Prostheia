import { afterEach, describe, expect, it } from "vitest";
import { BITE_SPLINT_R6_PACKAGES, DIGITAL_MODEL_R6_PACKAGES, DENTAL_REALISM_R6_PACKAGES } from "@/cad/case-packages/definitions/dental-realism-r6";
import { loadRegisteredCasePackage } from "@/cad/case-packages/loader";
import { caseObjectRuntimeId } from "@/cad/case-packages/identity";
import { geometryRegistry } from "@/cad/scene/geometry-registry";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import { useHistoryStore } from "@/cad/engine/history-store";
import { useCurveStore } from "@/cad/curves/store";
import { useAnalysisStore } from "@/cad/analysis/state";
import { useBiteSplintStore } from "@/cad/splint/types";
import { useDigitalModelStore } from "@/cad/digital-model/types";
import { useArticulatorStore } from "@/cad/articulator/store";
import { generateBiteSplint } from "@/cad/splint/operations";
import { runMeshOperation } from "@/cad/mesh/run-operation";
import { evaluateJawPose, poseMatrix } from "@/cad/articulator/kinematics";
import { DEFAULT_ARTICULATOR_CONFIG } from "@/cad/articulator/types";
import { FREE_LAB_SCENARIOS } from "@/free-lab/scenarios";
import { initializeFreeLabWorkspace } from "@/free-lab/initialize-workspace";
import { DENTAL_REALISM_R6_LESSONS } from "@/practice/dental-realism-r6-lessons";
import { initializePracticeLesson } from "@/practice/initialize-assets";
import { runStepValidators } from "@/practice/validators";

afterEach(() => {
  useHistoryStore.getState().clear();
  geometryRegistry.clear();
  useWorkspaceStore.getState().resetDemo();
  useCurveStore.getState().replace({ curves: [], activeCurveId: null });
  useAnalysisStore.getState().clear();
  useBiteSplintStore.getState().reset();
  useDigitalModelStore.getState().reset();
  useArticulatorStore.getState().reset();
});

describe("R6 Case Package catalog", () => {
  it("registers two distinct Bite Splint packages with semantic roles, editable boundaries, shell geometry, and all staged checkpoints", () => {
    expect(BITE_SPLINT_R6_PACKAGES).toHaveLength(2);
    for (const manifest of BITE_SPLINT_R6_PACKAGES) {
      expect(manifest.workflowType).toBe("bite_splint");
      expect(manifest.objects.find((object) => object.id === "source-upper-arch")).toMatchObject({ caseRole: "SOURCE", cadRole: "maxilla", editable: false });
      expect(manifest.objects.find((object) => object.id === "source-lower-arch")).toMatchObject({ caseRole: "SOURCE", cadRole: "antagonist", editable: false });
      expect(manifest.objects.find((object) => object.id === "design-splint")).toMatchObject({ caseRole: "DESIGN", cadRole: "splint", editable: true, source: { kind: "procedural", factoryId: "bite-splint.r6-shell" } });
      expect(manifest.objects.find((object) => object.id === "guide-boundary")?.workflowMetadata).toMatchObject({ editableCurve: true, targetForThisExercise: true });
      expect(manifest.checkpoints.map((item) => item.id)).toEqual(["inspect", "alignment", "boundary", "inner_surface", "outer_form", "thickness", "contacts", "occlusion", "refinement", "final"]);
    }
    expect(BITE_SPLINT_R6_PACKAGES[0].objects.find((object) => object.id === "design-splint")?.source).not.toEqual(BITE_SPLINT_R6_PACKAGES[1].objects.find((object) => object.id === "design-splint")?.source);
  });

  it("contains three distinct Digital Model packages and all required cleanup checkpoints", () => {
    expect(DIGITAL_MODEL_R6_PACKAGES).toHaveLength(3);
    expect(new Set(DIGITAL_MODEL_R6_PACKAGES.map((manifest) => manifest.caseId)).size).toBe(3);
    for (const manifest of DIGITAL_MODEL_R6_PACKAGES) {
      expect(manifest.workflowType).toBe("digital_model");
      expect(manifest.objects.find((object) => object.id === "source-raw-scan")).toMatchObject({ caseRole: "SOURCE", editable: false });
      expect(manifest.objects.find((object) => object.id === "design-working-copy")).toMatchObject({ caseRole: "DESIGN", editable: true });
      expect(manifest.objects.find((object) => object.id === "design-model-base")).toMatchObject({ caseRole: "DESIGN", cadRole: "model_base", editable: true });
      expect(manifest.checkpoints.map((item) => item.id)).toEqual(["raw_scan", "trim", "cleanup", "hole_fill", "orientation", "base", "final"]);
    }
    expect(DIGITAL_MODEL_R6_PACKAGES[0].objects[0].source).not.toEqual(DIGITAL_MODEL_R6_PACKAGES[1].objects[0].source);
    expect(DIGITAL_MODEL_R6_PACKAGES[2].objects[0].workflowMetadata.digitalModelChallenge).toBe("noisy_partial");
  });
});

describe("R6 Bite Splint workflow", () => {
  it("loads a package-backed conforming shell and applies thickness changes through mesh history", async () => {
    const manifest = BITE_SPLINT_R6_PACKAGES[0];
    await loadRegisteredCasePackage(manifest.packageId, { mode: "practice", checkpointId: "boundary" });
    const upperId = caseObjectRuntimeId(manifest.caseId, "source-upper-arch");
    const lowerId = caseObjectRuntimeId(manifest.caseId, "source-lower-arch");
    const shellId = caseObjectRuntimeId(manifest.caseId, "design-splint");
    const upperMeshes = geometryRegistry.getMeshes(upperId);
    const shellMeshes = geometryRegistry.getMeshes(shellId);
    expect(upperMeshes.length).toBeGreaterThan(20);
    expect(shellMeshes).toHaveLength(1);
    expect(useWorkspaceStore.getState().objects.find((object) => object.id === shellId)).toMatchObject({ caseRole: "DESIGN", editable: true, visible: false, biteSplintPart: "splint" });
    expect(useBiteSplintStore.getState()).toMatchObject({ upperArchId: upperId, antagonistId: lowerId, splintId: shellId, targetThicknessMm: 2 });
    expect(useCurveStore.getState().curves[0]).toMatchObject({ kind: "splint_boundary", objectId: upperId, closed: true });

    useBiteSplintStore.getState().setThickness(3.2);
    generateBiteSplint();
    const runtime = geometryRegistry.get(shellId)!;
    const firstRevision = runtime.geometryRevision;
    expect(firstRevision).toBe(1);
    expect(geometryRegistry.stats(shellId).boundsMm[2]).toBeGreaterThanOrEqual(3.2);
    expect(useWorkspaceStore.getState().objects.find((object) => object.id === shellId)?.visible).toBe(true);
    useHistoryStore.getState().undo();
    expect(runtime.geometryRevision).toBe(0);
    useHistoryStore.getState().redo();
    expect(runtime.geometryRevision).toBe(firstRevision);
  });
});

describe("R6 Digital Model workflow", () => {
  it("keeps the raw SOURCE immutable and creates independent editable working geometry", async () => {
    const manifest = DIGITAL_MODEL_R6_PACKAGES[0];
    await loadRegisteredCasePackage(manifest.packageId, { mode: "free-lab", checkpointId: "raw_scan" });
    const rawId = caseObjectRuntimeId(manifest.caseId, "source-raw-scan");
    const workingId = caseObjectRuntimeId(manifest.caseId, "design-working-copy");
    const baseId = caseObjectRuntimeId(manifest.caseId, "design-model-base");
    const rawRuntime = geometryRegistry.get(rawId)!;
    const workingRuntime = geometryRegistry.get(workingId)!;
    expect(rawRuntime.object).not.toBe(workingRuntime.object);
    expect(geometryRegistry.getMeshes(rawId)[0].geometry).not.toBe(geometryRegistry.getMeshes(workingId)[0].geometry);
    expect(useWorkspaceStore.getState().objects.find((object) => object.id === rawId)).toMatchObject({ caseRole: "SOURCE", editable: false, digitalModelPart: "raw_scan" });
    expect(useWorkspaceStore.getState().objects.find((object) => object.id === workingId)).toMatchObject({ caseRole: "DESIGN", editable: true, digitalModelPart: "working_model" });
    expect(useWorkspaceStore.getState().objects.find((object) => object.id === baseId)).toMatchObject({ caseRole: "DESIGN", editable: true, visible: false, digitalModelPart: "base" });
    const rawRevision = rawRuntime.geometryRevision;
    await expect(runMeshOperation({ objectId: rawId, meshKey: geometryRegistry.getMeshes(rawId)[0].key, kind: "cleanup" })).rejects.toThrow(/raw SOURCE is immutable/);
    expect(rawRuntime.geometryRevision).toBe(rawRevision);
  });

  it("loads genuinely different trim, cleanup, hole-fill, orientation, base, and final checkpoint states", async () => {
    const manifest = DIGITAL_MODEL_R6_PACKAGES[2];
    const workingId = caseObjectRuntimeId(manifest.caseId, "design-working-copy");
    const snapshot = async (checkpointId: string) => {
      await loadRegisteredCasePackage(manifest.packageId, { mode: "free-lab", checkpointId });
      const meshes = geometryRegistry.getMeshes(workingId);
      const archData = Array.from(meshes[0].geometry.getAttribute("position").array);
      return { meshes, archData, stage: useDigitalModelStore.getState().stage, transform: useWorkspaceStore.getState().objects.find((object) => object.id === workingId)!.transform, base: useWorkspaceStore.getState().objects.find((object) => object.digitalModelPart === "base") };
    };
    const raw = await snapshot("raw_scan");
    const trimmed = await snapshot("trim");
    const cleaned = await snapshot("cleanup");
    const filled = await snapshot("hole_fill");
    const oriented = await snapshot("orientation");
    const base = await snapshot("base");
    const final = await snapshot("final");
    expect(raw.meshes.length).toBeGreaterThan(trimmed.meshes.length);
    expect(raw.archData).not.toEqual(filled.archData);
    expect(trimmed.archData).not.toEqual(cleaned.archData);
    expect(cleaned.archData).not.toEqual(filled.archData);
    expect(raw.stage).toBe("raw_scan");
    expect(trimmed.stage).toBe("trim");
    expect(cleaned.stage).toBe("cleanup");
    expect(filled.stage).toBe("hole_fill");
    expect(oriented.stage).toBe("orientation");
    expect(oriented.transform).toMatchObject({ position: [0, 0, 0], rotation: [0, 0, 0] });
    expect(base.stage).toBe("base");
    expect(base.base).toMatchObject({ caseRole: "DESIGN", visible: true, digitalModelPart: "base" });
    expect(final.stage).toBe("final");
    expect(final.base?.visible).toBe(true);
  });
});

describe("R6 Virtual Articulator reuse", () => {
  it("reuses package-backed upper/lower arches and resets every deterministic motion to centric", async () => {
    const manifest = BITE_SPLINT_R6_PACKAGES[0];
    await loadRegisteredCasePackage(manifest.packageId, { mode: "practice", checkpointId: "final" });
    const upperId = caseObjectRuntimeId(manifest.caseId, "source-upper-arch");
    const lowerId = caseObjectRuntimeId(manifest.caseId, "source-lower-arch");
    const upper = useWorkspaceStore.getState().objects.find((object) => object.id === upperId)!;
    const lower = useWorkspaceStore.getState().objects.find((object) => object.id === lowerId)!;
    expect(upper).toMatchObject({ caseRole: "SOURCE", articulatorArch: "upper" });
    expect(lower).toMatchObject({ caseRole: "SOURCE", articulatorArch: "lower" });
    expect(geometryRegistry.get(upperId)).toBeDefined();
    expect(geometryRegistry.get(lowerId)).toBeDefined();

    for (const motion of ["open_close", "protrusive", "left_lateral", "right_lateral"] as const) {
      useArticulatorStore.getState().setMotion(motion);
      useArticulatorStore.getState().setPosition(0.75);
      const first = poseMatrix(evaluateJawPose(motion, 0.75, DEFAULT_ARTICULATOR_CONFIG)).toArray();
      const second = poseMatrix(evaluateJawPose(motion, 0.75, DEFAULT_ARTICULATOR_CONFIG)).toArray();
      expect(first).toEqual(second);
      useArticulatorStore.getState().setPosition(0);
      expect(useWorkspaceStore.getState().objects.find((object) => object.id === lowerId)?.transform).toEqual(lower.transform);
    }
    expect(useArticulatorStore.getState()).toMatchObject({ motion: "right_lateral", t: 0, playing: false });
  });
});

describe("R6 Practice and Free Lab", () => {
  it("exposes exactly two splint and three digital-model package-backed random cases", () => {
    const splints = FREE_LAB_SCENARIOS.filter((scenario) => scenario.slug.startsWith("r6_bite_splint_") && scenario.status === "published");
    const models = FREE_LAB_SCENARIOS.filter((scenario) => scenario.slug.startsWith("r6_digital_model_") && scenario.status === "published");
    expect(splints).toHaveLength(2);
    expect(models).toHaveLength(3);
    expect([...splints, ...models].every((scenario) => scenario.randomEligible && scenario.casePackageId)).toBe(true);
    expect(DENTAL_REALISM_R6_PACKAGES).toHaveLength(5);
  });

  it("loads Practice and Free Lab from the same registered packages at the requested checkpoint", async () => {
    const modelLesson = DENTAL_REALISM_R6_LESSONS.find((item) => item.id === "r6-digital-model-orientation-base")!;
    await initializePracticeLesson(modelLesson);
    expect(useDigitalModelStore.getState().stage).toBe("hole_fill");
    expect(useWorkspaceStore.getState().mode).toBe("practice");
    const scenario = FREE_LAB_SCENARIOS.find((item) => item.slug === "r6_digital_model_noisy_partial")!;
    await initializeFreeLabWorkspace({ origin: "scenario", scenarioId: scenario.id, title: scenario.title.en, category: scenario.category, casePackageId: scenario.casePackageId, checkpointId: scenario.startingCheckpointId, createdAt: new Date(0).toISOString(), workspaceId: "r6-test" });
    expect(useDigitalModelStore.getState().stage).toBe(scenario.startingCheckpointId);
    expect(useWorkspaceStore.getState().mode).toBe("free-lab");
    expect(useWorkspaceStore.getState().objects.some((object) => object.digitalModelPart === "raw_scan" && object.editable === false)).toBe(true);
  });

  it("provides bilingual WHAT/WHY/OBJECT/TOOL/ACTION/TARGET/CHECK guidance and package-aware validation", async () => {
    const lesson = DENTAL_REALISM_R6_LESSONS.find((item) => item.id === "r6-bite-splint-foundations")!;
    await initializePracticeLesson(lesson);
    const step = lesson.steps[0];
    expect(step.instructions.en.replace(/\n/g, " ")).toMatch(/WHAT:.*WHY:.*OBJECT:.*TOOL:.*ACTION:.*TARGET:.*CHECK:/);
    expect(["TA:", "TO:", "OBJEKAT:", "ALAT:", "AKCIJA:", "CILJ:", "PROVERA:"].every((label) => step.instructions.sr.includes(label))).toBe(true);
    expect(runStepValidators(lesson, lesson.steps[2]).every((result) => result.validatorType === "curve_closed" || result.validatorType === "r6_workflow")).toBe(true);
  });
});
