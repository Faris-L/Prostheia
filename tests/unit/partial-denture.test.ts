import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import * as THREE from "three";
import { createPartialDentureCase, partialToothId } from "@/cad/partial-denture/case";
import { partialDentureAbutments, partialDentureMissingTeeth, createPartialComponentGeometry } from "@/cad/partial-denture/geometry";
import { addPartialDentureComponent } from "@/cad/partial-denture/operations";
import { restorePartialDentureSetup, usePartialDentureStore } from "@/cad/partial-denture/types";
import { cadObjectId } from "@/cad/types";
import { geometryRegistry } from "@/cad/scene/geometry-registry";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import { useHistoryStore } from "@/cad/engine/history-store";
import { useRestorativeSetupStore } from "@/cad/restorative/types";
import { useCurveStore } from "@/cad/curves/store";
import { editCurve } from "@/cad/curves/commands";
import { computeDirectionalUndercut } from "@/cad/analysis/analysis.worker";
import { snapshotMesh } from "@/cad/analysis/geometry";
import { useAnalysisStore } from "@/cad/analysis/state";
import { lessonSchema, validatorConfigSchema } from "@/practice/types";
import { runStepValidators } from "@/practice/validators";
import { initializePracticeLesson } from "@/practice/initialize-assets";
import { initializeFreeLabWorkspace } from "@/free-lab/initialize-workspace";
import { FREE_LAB_SCENARIOS } from "@/free-lab/scenarios";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260928110000_phase_19_partial_denture.sql"), "utf8");

afterEach(() => {
  useHistoryStore.getState().clear(); geometryRegistry.clear();
  useWorkspaceStore.getState().resetDemo();
  usePartialDentureStore.getState().reset(); useAnalysisStore.getState().clear();
  useRestorativeSetupStore.getState().configure({ restorationType: null, connectorWidthMm: 3, insertionDirection: [0, 0, 1], units: [] }, false);
});

function partialLesson(check: "survey" | "framework" | "complete_case" = "framework") {
  return lessonSchema.parse({
    id: "kennedy_class_i", databaseId: "b7190000-0000-4000-8000-000000000010", moduleId: "partial_denture",
    title: { en: "Kennedy I", sr: "Kennedy I" }, summary: { en: "Summary", sr: "Sažetak" }, goal: { en: "Goal", sr: "Cilj" },
    difficulty: "beginner", recommendedPrerequisites: [], estimatedMinutes: 10, assets: [], caseSetup: { source: "partial-denture-case", kennedyClass: "I", objectMappings: [] },
    steps: [{ id: "review", order: 1, title: { en: "Review", sr: "Pregled" }, instructions: { en: "Inspect the case.", sr: "Pregledajte slučaj." }, allowedTools: ["select", "camera", "analysis", "scene", "move"], targetObjectIds: [], hints: [], referenceModes: ["off"], validators: [{ type: "partial_denture_setup", check, kennedyClass: "I" }] }],
  });
}

describe("Phase 19 shared Partial Denture workflow", () => {
  it.each(["I", "II", "III", "IV"] as const)("creates Kennedy Class %s with stable synthetic teeth, spaces and components", (klass) => {
    const ids = createPartialDentureCase(klass, "practice");
    const setup = usePartialDentureStore.getState();
    const objects = useWorkspaceStore.getState().objects;
    expect(setup).toMatchObject({ kennedyClass: klass, archObjectId: "partial-denture-synthetic-lower-arch", missingToothNumbers: partialDentureMissingTeeth(klass), abutmentObjectIds: partialDentureAbutments(klass).map(partialToothId) });
    expect(ids).toHaveLength(objects.length);
    expect(objects.filter((object) => object.partialDenturePart === "tooth" && object.partialDentureClass === klass)).toHaveLength(16 - setup.missingToothNumbers.length);
    expect(objects.filter((object) => object.partialDenturePart === "missing_region")).toHaveLength(klass === "I" ? 2 : 1);
    expect(setup.components.map((component) => component.kind)).toEqual(["major_connector", "lingual_bar", "retention_mesh"]);
    expect(objects.filter((object) => object.role === "framework").every((object) => object.syntheticMesh && object.editable && geometryRegistry.getMeshes(object.id).length > 0)).toBe(true);
    expect(useWorkspaceStore.getState().mode).toBe("practice");
  });

  it("creates an abutment-associated clasp as a stable, undoable registered CAD object", () => {
    createPartialDentureCase("I", "free-lab");
    const id = addPartialDentureComponent("clasp", 35);
    const object = useWorkspaceStore.getState().objects.find((entry) => entry.id === cadObjectId(id));
    expect(object).toMatchObject({ role: "framework", partialDenturePart: "clasp", partialDentureToothNumber: 35, partialDentureAbutmentObjectId: partialToothId(35), partialDentureParentComponentId: "partial-denture-i-major_connector" });
    expect(usePartialDentureStore.getState().components.find((item) => item.id === id)).toMatchObject({ kind: "clasp", abutmentObjectId: partialToothId(35), toothNumber: 35 });
    expect(useHistoryStore.getState().undoStack.at(-1)?.label).toBe("Add clasp");
    useHistoryStore.getState().undo();
    expect(useWorkspaceStore.getState().objects.some((entry) => entry.id === id)).toBe(false);
    expect(usePartialDentureStore.getState().components.some((entry) => entry.id === id)).toBe(false);
    useHistoryStore.getState().redo();
    expect(geometryRegistry.get(cadObjectId(id))).toBeDefined();
    const component = usePartialDentureStore.getState().components.find((item) => item.id === id)!;
    const curve = useCurveStore.getState().curves.find((item) => item.id === component.curveId)!;
    expect(curve).toMatchObject({ kind: "framework_path", objectId: cadObjectId(id), coordinateSpace: "object-local" });
    const meshKey = geometryRegistry.getMeshes(cadObjectId(id))[0].key;
    const beforeGeometry = Array.from(geometryRegistry.getMeshes(cadObjectId(id))[0].geometry.getAttribute("position").array);
    useCurveStore.getState().setActiveCurve(curve.id);
    editCurve(() => useCurveStore.getState().movePoint(cadObjectId(id), 0, [2.5, -7, 10]));
    const afterGeometry = Array.from(geometryRegistry.getMeshes(cadObjectId(id))[0].geometry.getAttribute("position").array);
    expect(afterGeometry).not.toEqual(beforeGeometry);
    expect(meshKey).toBe(geometryRegistry.getMeshes(cadObjectId(id))[0].key);
    useHistoryStore.getState().undo();
    expect(Array.from(geometryRegistry.getMeshes(cadObjectId(id))[0].geometry.getAttribute("position").array)).toEqual(beforeGeometry);
    useHistoryStore.getState().redo();
    expect(Array.from(geometryRegistry.getMeshes(cadObjectId(id))[0].geometry.getAttribute("position").array)).toEqual(afterGeometry);
  });

  it("builds finite reusable geometry for each framework component kind", () => {
    for (const kind of ["blockout", "major_connector", "lingual_bar", "retention_mesh", "clasp", "minor_connector", "rest", "guide_plane", "finish_line", "relief"] as const) {
      const object = createPartialComponentGeometry(kind, [[-3, 0, 2], [0, 3, 2], [3, 0, 2]]);
      object.traverse((child) => { if (child instanceof THREE.Mesh) expect([...child.geometry.getAttribute("position").array].every(Number.isFinite)).toBe(true); });
      geometryRegistry.disposeObject(object);
    }
  });

  it("uses a reusable ray-clearance undercut preview without mutating source geometry", () => {
    createPartialDentureCase("I", "free-lab");
    const toothId = cadObjectId("partial-denture-synthetic-tooth-35");
    const mesh = snapshotMesh(toothId, geometryRegistry.getMeshes(toothId)[0].key);
    const before = mesh.positions.slice();
    const positive = computeDirectionalUndercut(mesh, [0, 0, 1]);
    const negative = computeDirectionalUndercut(mesh, [0, 0, -1]);
    expect(positive.note).toBe("directional-preview");
    expect(positive.insertionDirection).toEqual([0, 0, 1]);
    expect(negative.insertionDirection).toEqual([0, 0, -1]);
    expect(positive.values).toHaveLength(mesh.positions.length / 3);
    expect(Array.from(positive.values).every(Number.isFinite)).toBe(true);
    expect(Array.from(positive.values)).not.toEqual(Array.from(negative.values));
    expect(mesh.positions).toEqual(before);
    expect(useWorkspaceStore.getState().objects.find((object) => object.id === mesh.objectId)?.geometryStats?.dirty).toBe(false);
    useAnalysisStore.getState().record(positive);
    expect(useAnalysisStore.getState().getCurrent("undercut", [toothId])).toBeDefined();
    useRestorativeSetupStore.getState().setInsertionDirection([0, 0, -1], false);
    expect(useAnalysisStore.getState().getCurrent("undercut", [toothId])).toBeUndefined();
  });

  it("checks current survey and coherent component relationships at pass/fail boundaries", () => {
    createPartialDentureCase("I", "practice");
    const survey = partialLesson("survey");
    expect(runStepValidators(survey, survey.steps[0])[0].outcome).toBe("fail");
    const arch = snapshotMesh("partial-denture-synthetic-lower-arch");
    useAnalysisStore.getState().record(computeDirectionalUndercut(arch, [0, 0, 1]));
    expect(runStepValidators(survey, survey.steps[0])[0].outcome).toBe("pass");

    const framework = partialLesson("framework");
    expect(runStepValidators(framework, framework.steps[0])[0].outcome).toBe("fail");
    for (const toothNumber of [35, 45]) for (const kind of ["rest", "clasp", "minor_connector"] as const) addPartialDentureComponent(kind, toothNumber, 0, false);
    expect(runStepValidators(framework, framework.steps[0])[0].outcome).toBe("pass");
    addPartialDentureComponent("blockout", undefined, 0, false); addPartialDentureComponent("guide_plane", 35, 0, false); addPartialDentureComponent("finish_line", 35, 0, false); addPartialDentureComponent("relief", undefined, 0, false);
    expect(runStepValidators(partialLesson("complete_case"), partialLesson("complete_case").steps[0])[0].outcome).toBe("pass");
  });

  it("round-trips domain state and uses the same case initializer for Practice and Free Lab", async () => {
    const lesson = partialLesson("framework");
    await initializePracticeLesson(lesson);
    expect(useWorkspaceStore.getState().mode).toBe("practice");
    expect(usePartialDentureStore.getState().kennedyClass).toBe("I");
    addPartialDentureComponent("clasp", 35);
    const setup = usePartialDentureStore.getState();
    restorePartialDentureSetup(JSON.parse(JSON.stringify({ kennedyClass: setup.kennedyClass, archObjectId: setup.archObjectId, missingToothNumbers: setup.missingToothNumbers, abutmentObjectIds: setup.abutmentObjectIds, components: setup.components })));
    expect(usePartialDentureStore.getState()).toMatchObject({ kennedyClass: "I", missingToothNumbers: [36, 37, 38, 46, 47, 48], components: setup.components });
    expect(useCurveStore.getState().curves.filter((curve) => curve.kind === "framework_path")).toHaveLength(setup.components.length);
    await initializeFreeLabWorkspace({ workspaceId: "rpd-free-lab", origin: "scenario", scenarioId: "scenario-synthetic-partial-denture-iv", title: "Kennedy IV", category: "partial_denture", partialDentureClass: "IV", createdAt: new Date().toISOString() });
    expect(useWorkspaceStore.getState().mode).toBe("free-lab");
    expect(usePartialDentureStore.getState().kennedyClass).toBe("IV");
    expect(FREE_LAB_SCENARIOS.filter((scenario) => scenario.category === "partial_denture").map((scenario) => scenario.partialDentureClass)).toEqual(["I", "II", "III", "IV"]);
  });

  it("publishes bilingual configurable cases and supported shared validators", () => {
    expect(validatorConfigSchema.safeParse({ type: "partial_denture_setup", check: "survey", kennedyClass: "I" }).success).toBe(true);
    expect(validatorConfigSchema.safeParse({ type: "partial_denture_setup", check: "not-a-check" }).success).toBe(false);
    expect(migration).toContain("Kennedy Class IV"); expect(migration).toContain("kennedy_class_iv");
    expect(migration).toContain("partial_denture_setup"); expect(migration).toContain("partial_denture_survey");
    expect(migration).toContain("instructions_sr"); expect(migration).toContain("noPatientData");
    expect(migration.toLowerCase()).toContain("not a clinical undercut-depth measurement");
  });
});
