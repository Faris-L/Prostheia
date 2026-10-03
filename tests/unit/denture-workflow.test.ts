import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createDentureCase, DENTURE_IDS, dentureToothId } from "@/cad/denture/case";
import { fdiPositions } from "@/cad/denture/geometry";
import { applyDentureToothSet } from "@/cad/denture/tooth-library";
import { regenerateDentureBase } from "@/cad/denture/tooth-library";
import { transformDentureGroup } from "@/cad/denture/operations";
import { useDentureSetupStore } from "@/cad/denture/setup-store";
import { geometryRegistry } from "@/cad/scene/geometry-registry";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import { useHistoryStore } from "@/cad/engine/history-store";
import { editCurve } from "@/cad/curves/commands";
import { useCurveStore, validateClosedCurve } from "@/cad/curves/store";
import { cadObjectId } from "@/cad/types";
import { lessonSchema } from "@/practice/types";
import { runStepValidators } from "@/practice/validators";
import { initializePracticeLesson } from "@/practice/initialize-assets";
import { initializeFreeLabWorkspace } from "@/free-lab/initialize-workspace";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260927190000_phase_17_complete_denture.sql"), "utf8");

afterEach(() => {
  useHistoryStore.getState().clear();
  geometryRegistry.clear();
  useCurveStore.getState().replace({ curves: [], activeCurveId: null });
  useDentureSetupStore.getState().reset();
  useWorkspaceStore.getState().resetDemo();
});

function checkLesson(type: "model_analysis" | "tooth_setup" | "chain_mode" | "base", arch?: "upper" | "lower", segment?: "anterior" | "posterior") {
  return lessonSchema.parse({
    id: "denture-test", databaseId: "b7170000-0000-4000-8000-000000000010", moduleId: "complete_denture",
    title: { en: "Denture", sr: "Proteza" }, summary: { en: "Summary", sr: "Sažetak" }, goal: { en: "Goal", sr: "Cilj" },
    difficulty: "beginner", recommendedPrerequisites: [], estimatedMinutes: 5, assets: [], caseSetup: { source: "denture-case", objectMappings: [] },
    steps: [{ id: type, order: 1, title: { en: "Check", sr: "Provera" }, instructions: { en: "Review", sr: "Pregledajte" }, allowedTools: ["select"], targetObjectIds: [], hints: [], referenceModes: ["off"], validators: [{ type: "denture_setup", check: type, ...(arch ? { arch } : {}), ...(segment ? { segment } : {}) }] }],
  });
}

describe("Phase 17 Complete Denture workflow", () => {
  it("initializes stable editable FDI teeth, edentulous arches, bases, and protected reference objects", () => {
    const ids = createDentureCase("practice");
    const objects = useWorkspaceStore.getState().objects;
    const teeth = objects.filter((object) => object.denturePart === "tooth");
    expect(ids).toHaveLength(objects.length);
    expect(teeth).toHaveLength(32);
    expect(teeth.map((object) => object.dentalPosition).sort()).toEqual([...fdiPositions("upper"), ...fdiPositions("lower")].sort());
    for (const object of teeth) {
      expect(object.id).toBe(dentureToothId(object.dentalPosition!));
      expect(object.role).toBe("denture_tooth");
      expect(object.editable).toBe(true);
      expect(geometryRegistry.get(object.id)).toBeDefined();
    }
    expect(objects.find((object) => object.id === DENTURE_IDS.upperArch)).toMatchObject({ role: "maxilla", editable: false, denturePart: "arch" });
    expect(objects.find((object) => object.id === DENTURE_IDS.lowerArch)).toMatchObject({ role: "mandible", editable: false, denturePart: "arch" });
    expect(objects.filter((object) => object.denturePart === "base" && object.editable)).toHaveLength(2);
    expect(objects.find((object) => object.denturePart === "reference")).toMatchObject({ role: "reference", editable: false, visible: false });
    expect(objects.find((object) => object.id === DENTURE_IDS.plane)).toMatchObject({ editable: true, denturePart: "plane" });
  });

  it("initializes the same case through Practice and ungated Free Lab entry points", async () => {
    const lesson = checkLesson("model_analysis");
    await initializePracticeLesson(lesson);
    expect(useWorkspaceStore.getState().mode).toBe("practice");
    expect(useWorkspaceStore.getState().objects.filter((object) => object.denturePart === "tooth")).toHaveLength(32);
    const freeLabIds = await initializeFreeLabWorkspace({ workspaceId: "test-denture", origin: "scenario", scenarioId: "synthetic_upper_complete_denture", title: "Upper Complete Denture", category: "complete_denture", createdAt: new Date().toISOString() });
    expect(freeLabIds).toHaveLength(useWorkspaceStore.getState().objects.length);
    expect(useWorkspaceStore.getState().mode).toBe("free-lab");
  });

  it("creates finite indexed base meshes with deterministic synthetic tooth seats", () => {
    createDentureCase("free-lab");
    for (const id of [DENTURE_IDS.upperBase, DENTURE_IDS.lowerBase]) {
      const mesh = geometryRegistry.getMeshes(cadObjectId(id))[0];
      expect(mesh.geometry.index).not.toBeNull();
      expect(mesh.geometry.index!.count).toBeGreaterThan(1000);
      const positions = mesh.geometry.getAttribute("position").array;
      expect([...positions].every(Number.isFinite)).toBe(true);
      expect([...mesh.geometry.index!.array].every((value) => Number.isInteger(value) && value >= 0 && value < positions.length / 3)).toBe(true);
    }
  });

  it("keeps tooth set replacement in the shared geometry history", () => {
    createDentureCase("practice");
    const tooth = useWorkspaceStore.getState().objects.find((object) => object.id === dentureToothId(16))!;
    const id = cadObjectId(tooth.id);
    const before = geometryRegistry.get(id)!.geometryRevision;
    applyDentureToothSet("broad");
    expect(useWorkspaceStore.getState().objects.find((object) => object.id === tooth.id)?.toothSetId).toBe("broad");
    expect(geometryRegistry.get(id)!.geometryRevision).toBeGreaterThan(before);
    useHistoryStore.getState().undo();
    expect(useWorkspaceStore.getState().objects.find((object) => object.id === tooth.id)?.toothSetId).toBe("balanced");
    expect(geometryRegistry.get(id)!.geometryRevision).toBe(before);
    useHistoryStore.getState().redo();
    expect(useWorkspaceStore.getState().objects.find((object) => object.id === tooth.id)?.toothSetId).toBe("broad");
  });

  it("stores editable curves with history and requires the model references to be adjusted", () => {
    createDentureCase("practice");
    const modelLesson = checkLesson("model_analysis");
    expect(runStepValidators(modelLesson, modelLesson.steps[0])[0].outcome).toBe("fail");
    const plane = cadObjectId(DENTURE_IDS.plane);
    useWorkspaceStore.getState().applyTransform(plane, { position: [0.5, 0, 4], rotation: [0, 0, 0], scale: [1, 1, 1] });
    expect(runStepValidators(modelLesson, modelLesson.steps[0])[0].outcome).toBe("pass");

    const boundaryId = cadObjectId(DENTURE_IDS.upperArch);
    editCurve(() => { const state = useCurveStore.getState(); const id = state.addPoint(boundaryId, [-10, 0, -1]); state.setKind(id, "boundary"); });
    editCurve(() => useCurveStore.getState().addPoint(boundaryId, [0, 15, -1]));
    editCurve(() => useCurveStore.getState().addPoint(boundaryId, [10, 0, -1]));
    editCurve(() => useCurveStore.getState().close(boundaryId));
    expect(validateClosedCurve(useCurveStore.getState().active(boundaryId, "boundary")).valid).toBe(true);
    const baseLesson = checkLesson("base", "upper");
    expect(runStepValidators(baseLesson, baseLesson.steps[0])[0].outcome).toBe("fail");
    regenerateDentureBase("upper");
    expect(runStepValidators(baseLesson, baseLesson.steps[0])[0].outcome).toBe("pass");
    useHistoryStore.getState().undo();
    expect(runStepValidators(baseLesson, baseLesson.steps[0])[0].outcome).toBe("fail");
  });

  it("requires a real linked Chain Mode operation and removes its evidence on Undo", () => {
    createDentureCase("practice");
    const chainLesson = checkLesson("chain_mode");
    expect(runStepValidators(chainLesson, chainLesson.steps[0])[0].outcome).toBe("fail");
    useDentureSetupStore.getState().setMode("chain");
    expect(runStepValidators(chainLesson, chainLesson.steps[0])[0].outcome).toBe("fail");
    expect(transformDentureGroup({ mode: "chain", arch: "upper", segment: "all", selectedObjectId: dentureToothId(11), axis: "x", amount: 0.5 })).toBeGreaterThan(1);
    expect(runStepValidators(chainLesson, chainLesson.steps[0])[0].outcome).toBe("pass");
    useHistoryStore.getState().undo();
    expect(runStepValidators(chainLesson, chainLesson.steps[0])[0].outcome).toBe("fail");
  });

  it("checks actual anterior and posterior FDI transforms and a selected tooth set", () => {
    createDentureCase("practice");
    const anterior = checkLesson("tooth_setup", "upper", "anterior");
    const posterior = checkLesson("tooth_setup", "upper", "posterior");
    expect(runStepValidators(anterior, anterior.steps[0])[0].outcome).toBe("fail");
    expect(runStepValidators(posterior, posterior.steps[0])[0].outcome).toBe("fail");
    transformDentureGroup({ mode: "arch", arch: "upper", segment: "anterior", selectedObjectId: null, axis: "x", amount: 0.5 });
    expect(runStepValidators(anterior, anterior.steps[0])[0].outcome).toBe("pass");
    expect(runStepValidators(posterior, posterior.steps[0])[0].outcome).toBe("fail");
    useHistoryStore.getState().undo();
    applyDentureToothSet("broad");
    const selection = checkLesson("tooth_setup");
    expect(runStepValidators(selection, selection.steps[0])[0].outcome).toBe("pass");
  });

  it("seeds eight ordered bilingual curriculum entries and two complete denture scenarios", () => {
    expect((migration.match(/\('b7170000-0000-4000-8000-0000000000\d+'::uuid,'[a-z_]+','(?:beginner|intermediate|advanced)'/g) ?? [])).toHaveLength(8);
    expect((migration.match(/select pg_temp\.seed_phase17_step\(/g) ?? [])).toHaveLength(8);
    expect(migration).toContain("'synthetic_upper_complete_denture'");
    expect(migration).toContain("'synthetic_upper_lower_complete_denture'");
    expect(migration).toContain('"source":"denture-case"');
    expect(migration).toContain('"type":"denture_setup"');
    expect(migration).toContain("instructions_sr");
    expect(migration.toLowerCase()).toContain("not a clinical boolean fit");
  });
});
