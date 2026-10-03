import { describe, expect, it, beforeEach } from "vitest";
import * as THREE from "three";
import { axisAngleDegrees, implantAxisFromTransform, normalizedVector } from "@/cad/implant/analysis";
import { createSyntheticImplantFixture } from "@/cad/implant/geometry";
import { createImplantCase, IMPLANT_IDS } from "@/cad/implant/case";
import { geometryRegistry } from "@/cad/scene/geometry-registry";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import { useImplantStore } from "@/cad/implant/types";
import { runStepValidators } from "@/practice/validators";
import { lessonSchema, type PracticeLesson } from "@/practice/types";
import { runTransformCommand } from "@/cad/engine/cad-actions";
import { useHistoryStore } from "@/cad/engine/history-store";
import { snapshotMesh } from "@/cad/analysis/geometry";
import { analysisResultIsCurrent } from "@/cad/analysis/state";
import { addImplantFixture } from "@/cad/implant/case";

describe("synthetic Implant Practice", () => {
  beforeEach(() => { geometryRegistry.clear(); useImplantStore.getState().reset(); });

  it("creates a deterministic valid synthetic fixture with declared dimensions", () => {
    const first = createSyntheticImplantFixture(4, 10), second = createSyntheticImplantFixture(4, 10);
    const mesh = first.children[0] as THREE.Mesh;
    const nextMesh = second.children[0] as THREE.Mesh;
    expect(mesh.geometry.getAttribute("position").array).toEqual(nextMesh.geometry.getAttribute("position").array);
    const position = mesh.geometry.getAttribute("position");
    expect(Array.from(position.array).every(Number.isFinite)).toBe(true);
    expect(mesh.geometry.index?.count).toBeGreaterThan(0);
    mesh.geometry.computeBoundingBox();
    expect(mesh.geometry.boundingBox?.getSize(new THREE.Vector3()).z).toBeCloseTo(10, 1);
    first.traverse((object) => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
    second.traverse((object) => { if (object instanceof THREE.Mesh) object.geometry.dispose(); });
  });

  it("normalizes axes and computes stable parallel, perpendicular and known-angle results", () => {
    expect(normalizedVector([0, 0, 7])).toEqual([0, 0, 1]);
    expect(axisAngleDegrees([0, 0, 2], [0, 0, 5])).toBeCloseTo(0, 6);
    expect(axisAngleDegrees([1, 0, 0], [0, 1, 0])).toBeCloseTo(90, 6);
    expect(axisAngleDegrees([0, 0, 1], [Math.sin(Math.PI / 6), 0, Math.cos(Math.PI / 6)])).toBeCloseTo(30, 6);
    expect(implantAxisFromTransform({ position: [0, 0, 0], rotation: [Math.PI / 2, 0, 0], scale: [1, 1, 1] })[1]).toBeCloseTo(-1, 6);
    expect(() => normalizedVector([0, 0, 0])).toThrow();
  });

  it("builds a stable, typed synthetic case with explicit read-only reference and restorative relationships", () => {
    createImplantCase("practice");
    const objects = useWorkspaceStore.getState().objects;
    expect(objects.map((object) => object.id)).toContain(IMPLANT_IDS.fixture);
    expect(objects.find((object) => object.id === IMPLANT_IDS.fixture)).toMatchObject({ role: "implant", implantPart: "fixture", implantDefinitionId: "prostheia-synthetic-fixture-3_5x8", implantReference: false });
    expect(objects.find((object) => object.id === IMPLANT_IDS.reference)).toMatchObject({ role: "reference", editable: false, implantPart: "reference_fixture", implantReference: true });
    const abutment = objects.find((object) => object.id === IMPLANT_IDS.abutment);
    const crown = objects.find((object) => object.id === IMPLANT_IDS.restoration);
    expect(abutment?.implantFixtureObjectId).toBe(IMPLANT_IDS.fixture);
    expect(crown?.implantParentObjectId).toBe(IMPLANT_IDS.abutment);
    expect(geometryRegistry.getMeshes(cadId(IMPLANT_IDS.fixture))).toHaveLength(1);
  });

  it("runs the shared Design Check validator with concrete axis and relationship feedback", () => {
    createImplantCase("practice");
    const lesson = lessonSchema.parse({
      id: "implant-test", databaseId: "b7220000-0000-4000-8000-000000000010", moduleId: "implant_practice",
      title: { en: "Implant test", sr: "Test implantata" }, summary: { en: "Test", sr: "Test" }, goal: { en: "Test", sr: "Test" },
      difficulty: "advanced", recommendedPrerequisites: [], estimatedMinutes: 1, assets: [], caseSetup: { source: "implant-case", objectMappings: [] },
      steps: [{ id: "axis", order: 1, title: { en: "Axis", sr: "Osa" }, instructions: { en: "Check", sr: "Provera" }, allowedTools: ["select", "rotate"], targetObjectIds: [IMPLANT_IDS.fixture], hints: [], referenceModes: ["off"], validators: [{ type: "implant_check", check: "axis", targetMm: 12 }], required: true }],
    }) as PracticeLesson;
    const result = runStepValidators(lesson, lesson.steps[0]);
    expect(result[0].outcome).toBe("pass");
    expect(result[0].message.en).toContain("Implant Axis differs from the Restorative Axis by 0.0°");
  });

  it("keeps fixture identity through shared transform Undo and Redo", () => {
    createImplantCase("practice");
    const fixture = useWorkspaceStore.getState().objects.find((object) => object.id === IMPLANT_IDS.fixture)!;
    const after = { ...fixture.transform, position: [1.5, -0.5, 1] as [number, number, number], rotation: [0.1, 0.2, 0] as [number, number, number] };
    runTransformCommand(fixture.id, fixture.transform, after);
    expect(useWorkspaceStore.getState().objects.find((object) => object.id === IMPLANT_IDS.fixture)?.transform).toEqual(after);
    useHistoryStore.getState().undo();
    expect(useWorkspaceStore.getState().objects.find((object) => object.id === IMPLANT_IDS.fixture)?.transform.position).toEqual([0, 0, 0]);
    useHistoryStore.getState().redo();
    expect(useWorkspaceStore.getState().objects.find((object) => object.id === IMPLANT_IDS.fixture)?.id).toBe(IMPLANT_IDS.fixture);
    expect(useWorkspaceStore.getState().objects.find((object) => object.id === IMPLANT_IDS.fixture)?.transform).toEqual(after);
  });

  it("marks shared fixture-to-reference proximity stale after a fixture transform changes", () => {
    createImplantCase("practice");
    const fixtureTarget = snapshotMesh(IMPLANT_IDS.fixture, "synthetic-fixture-surface");
    const riskTarget = snapshotMesh(IMPLANT_IDS.risk, "synthetic-risk-ring");
    const result = { kind: "contact" as const, targets: [fixtureTarget, riskTarget] as [typeof fixtureTarget, typeof riskTarget], values: new Float32Array(), valid: new Uint8Array(), minMm: 1, maxMm: 4, thresholdMm: 2, sampleCount: 1 };
    expect(analysisResultIsCurrent(result)).toBe(true);
    const fixture = useWorkspaceStore.getState().objects.find((object) => object.id === IMPLANT_IDS.fixture)!;
    useWorkspaceStore.getState().applyTransform(fixture.id, { ...fixture.transform, position: [0.5, 0, 0] });
    expect(analysisResultIsCurrent(result)).toBe(false);
  });

  it("records additional synthetic fixture creation as one undoable shared CAD command", () => {
    createImplantCase("practice");
    const id = addImplantFixture();
    expect(useWorkspaceStore.getState().objects.find((object) => object.id === id)?.role).toBe("implant");
    useHistoryStore.getState().undo();
    expect(useWorkspaceStore.getState().objects.some((object) => object.id === id)).toBe(false);
    useHistoryStore.getState().redo();
    expect(useWorkspaceStore.getState().objects.find((object) => object.id === id)?.implantDefinitionId).toBe("prostheia-synthetic-fixture-3_5x8");
  });
});

function cadId(value: string) { return value as import("@/cad/types").CadObjectId; }
