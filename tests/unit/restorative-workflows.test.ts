import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { afterEach, describe, expect, it } from "vitest";
import * as THREE from "three";
import { createRestorativeCase, restorativeCaseIds } from "@/cad/restorative/case";
import { geometryRegistry } from "@/cad/scene/geometry-registry";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import { useHistoryStore } from "@/cad/engine/history-store";
import { useCurveStore } from "@/cad/curves/store";
import { useRestorativeSetupStore } from "@/cad/restorative/types";
import { setBridgeConnectorWidth } from "@/cad/restorative/operations";
import { cadObjectId } from "@/cad/types";
import { lessonSchema, validatorConfigSchema } from "@/practice/types";
import { runStepValidators } from "@/practice/validators";
import { initializePracticeLesson } from "@/practice/initialize-assets";
import { initializeFreeLabWorkspace } from "@/free-lab/initialize-workspace";
import { serializeGeometry } from "@/cad/persistence/cloud-cases";
import { curveSnapshot } from "@/cad/curves/store";
import { restoreRestorativeSetup } from "@/cad/restorative/types";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260928100000_phase_18_restorative_workflows.sql"), "utf8");

afterEach(() => {
  useHistoryStore.getState().clear(); geometryRegistry.clear();
  useCurveStore.getState().replace({ curves: [], activeCurveId: null });
  useRestorativeSetupStore.getState().configure({ restorationType: null, connectorWidthMm: 3, insertionDirection: [0, 0, 1], units: [] }, false);
  useWorkspaceStore.getState().resetDemo();
});

function lesson(type: "bridge" | "inlay" | "onlay" | "veneer", check: "bridge_design" | "single_unit_design" | "veneer_position") {
  return lessonSchema.parse({
    id: `restorative-${type}`, databaseId: "b7180000-0000-4000-8000-000000000010", moduleId: "restorative",
    title: { en: "Restorative", sr: "Nadoknada" }, summary: { en: "Summary", sr: "Sažetak" }, goal: { en: "Goal", sr: "Cilj" },
    difficulty: "beginner", recommendedPrerequisites: [], estimatedMinutes: 5, assets: [], caseSetup: { source: "restorative-case", restorationType: type, objectMappings: [] },
    steps: [{ id: "check", order: 1, title: { en: "Check", sr: "Provera" }, instructions: { en: "Review", sr: "Pregledajte" }, allowedTools: ["select", "analysis"], targetObjectIds: [], hints: [], referenceModes: ["off"], validators: [{ type: "restorative_setup", check, restorationType: type }] }],
  });
}

function closeMargin(objectId: string) {
  const state = useCurveStore.getState(); const id = cadObjectId(objectId);
  state.addPoint(id, [1, 0, 0]); state.addPoint(id, [0, 1, 0]); state.addPoint(id, [-1, 0, 0]); state.close(id);
}

describe("Phase 18 shared restorative CAD workflows", () => {
  it("uses typed restoration IDs and initializes one multi-unit bridge object", () => {
    const ids = createRestorativeCase("bridge", "practice");
    const bridge = useWorkspaceStore.getState().objects.find((object) => object.id === restorativeCaseIds("bridge").restoration)!;
    expect(bridge).toMatchObject({ role: "bridge", restorationType: "bridge", editable: true, restorationUnitIds: ["bridge-unit-abutment-14", "bridge-unit-pontic-15", "bridge-unit-abutment-16", "bridge-connector-mesial", "bridge-connector-distal"] });
    const meshes = geometryRegistry.getMeshes(cadObjectId(bridge.id));
    expect(meshes).toHaveLength(1);
    expect(meshes[0].geometry.getAttribute("position").count).toBeGreaterThan(1000);
    expect(meshes[0].mesh.userData.restorativeUnitSpans.map((unit: { id: string }) => unit.id).sort()).toEqual([...bridge.restorationUnitIds!].sort());
    expect(ids).toHaveLength(useWorkspaceStore.getState().objects.length);
    expect(useWorkspaceStore.getState().objects.filter((object) => object.role === "prepared_tooth")).toHaveLength(2);
    expect(useWorkspaceStore.getState().objects.find((object) => object.id === restorativeCaseIds("bridge").gingiva)).toBeDefined();
  });

  it("changes bridge connector geometry as one undoable revision", () => {
    createRestorativeCase("bridge", "free-lab");
    const bridge = cadObjectId(restorativeCaseIds("bridge").restoration);
    const originalPosition = [...geometryRegistry.getMeshes(bridge)[0].geometry.getAttribute("position").array];
    expect(setBridgeConnectorWidth(4.25)).toBe(true);
    expect(useRestorativeSetupStore.getState().connectorWidthMm).toBe(4.25);
    expect(geometryRegistry.get(bridge)?.geometryRevision).toBe(1);
    expect([...geometryRegistry.getMeshes(bridge)[0].geometry.getAttribute("position").array]).not.toEqual(originalPosition);
    useHistoryStore.getState().undo();
    expect(useRestorativeSetupStore.getState().connectorWidthMm).toBe(3);
    expect(geometryRegistry.get(bridge)?.geometryRevision).toBe(0);
    useHistoryStore.getState().redo();
    expect(useRestorativeSetupStore.getState().connectorWidthMm).toBe(4.25);
  });

  it("keeps separate bridge preparation margins attached and verifies bridge units", () => {
    createRestorativeCase("bridge", "practice");
    const item = lesson("bridge", "bridge_design");
    expect(runStepValidators(item, item.steps[0]).every((result) => result.outcome === "fail")).toBe(true);
    const ids = restorativeCaseIds("bridge");
    closeMargin(ids.preparations[0]); closeMargin(ids.preparations[1]);
    const results = runStepValidators(item, item.steps[0]);
    expect(results.every((result) => result.outcome === "pass")).toBe(true);
    expect(useCurveStore.getState().curves.map((curve) => curve.objectId)).toEqual(ids.preparations.map(cadObjectId));
  });

  it.each(["inlay", "onlay", "veneer"] as const)("creates an editable typed %s with finite synthetic geometry", (type) => {
    createRestorativeCase(type, "free-lab");
    const ids = restorativeCaseIds(type);
    const object = useWorkspaceStore.getState().objects.find((entry) => entry.id === ids.restoration)!;
    expect(object).toMatchObject({ restorationType: type, editable: true, syntheticMesh: true });
    const geometry = geometryRegistry.getMeshes(object.id)[0].geometry;
    expect(geometry.getAttribute("position").count).toBeGreaterThan(30);
    expect([...geometry.getAttribute("position").array].every(Number.isFinite)).toBe(true);
  });

  it("passes Inlay margin and Veneer placement checks against type-specific IDs", () => {
    createRestorativeCase("inlay", "practice");
    const inlayLesson = lesson("inlay", "single_unit_design");
    expect(runStepValidators(inlayLesson, inlayLesson.steps[0])[0].outcome).toBe("fail");
    closeMargin(restorativeCaseIds("inlay").preparations[0]);
    expect(runStepValidators(inlayLesson, inlayLesson.steps[0])[0].outcome).toBe("pass");
    createRestorativeCase("veneer", "practice");
    const veneerLesson = lesson("veneer", "veneer_position");
    expect(runStepValidators(veneerLesson, veneerLesson.steps[0])[0].outcome).toBe("fail");
    const veneer = cadObjectId(restorativeCaseIds("veneer").restoration);
    useWorkspaceStore.getState().applyTransform(veneer, { position: [0.5, 0, 0], rotation: [0, 0.1, 0], scale: [1, 1, 1] });
    expect(runStepValidators(veneerLesson, veneerLesson.steps[0])[0].outcome).toBe("pass");
  });

  it("uses the shared case initializer in Practice and ungated Free Lab", async () => {
    await initializePracticeLesson(lesson("onlay", "single_unit_design"));
    expect(useWorkspaceStore.getState().mode).toBe("practice");
    expect(useRestorativeSetupStore.getState().restorationType).toBe("onlay");
    const ids = await initializeFreeLabWorkspace({ workspaceId: "restorative-free-lab", origin: "scenario", scenarioId: "synthetic_veneer_11", title: "Veneer", category: "veneer", restorationType: "veneer", createdAt: new Date().toISOString() });
    expect(useWorkspaceStore.getState().mode).toBe("free-lab");
    expect(useRestorativeSetupStore.getState().restorationType).toBe("veneer");
    expect(ids).toContain(restorativeCaseIds("veneer").restoration);
  });

  it("round trips bridge geometry and restorative workflow state through the save snapshot formats", async () => {
    createRestorativeCase("bridge", "free-lab");
    const ids = restorativeCaseIds("bridge");
    const bridgeId = cadObjectId(ids.restoration);
    setBridgeConnectorWidth(4.25);
    closeMargin(ids.preparations[0]);
    closeMargin(ids.preparations[1]);
    useWorkspaceStore.getState().applyTransform(bridgeId, { position: [0.3, -0.2, 0.8], rotation: [0.05, 0.12, -0.03], scale: [1, 1, 1] });
    useRestorativeSetupStore.getState().setInsertionDirection([0.1, 0.2, 1], false);

    const objectState = useWorkspaceStore.getState().objects.find((object) => object.id === ids.restoration)!;
    const setupState = useRestorativeSetupStore.getState();
    const curves = curveSnapshot();
    const snapshot = await serializeGeometry(ids.restoration, objectState.name);
    const loaded = await new GLTFLoader().parseAsync(await snapshot.blob.arrayBuffer(), "");
    const loadedMeshes: THREE.Mesh[] = [];
    loaded.scene.traverse((child) => { if (child instanceof THREE.Mesh) loadedMeshes.push(child); });
    expect(loadedMeshes).toHaveLength(1);
    expect(loadedMeshes[0].geometry.getAttribute("position").count).toBe(geometryRegistry.getMeshes(bridgeId)[0].geometry.getAttribute("position").count);
    expect(loadedMeshes[0].userData.restorativeUnitSpans.map((unit: { id: string }) => unit.id).sort()).toEqual([...objectState.restorationUnitIds!].sort());
    expect(objectState).toMatchObject({ id: ids.restoration, restorationType: "bridge", connectorWidthMm: 4.25, transform: { position: [0.3, -0.2, 0.8], rotation: [0.05, 0.12, -0.03] } });
    expect(curves.curves.map((curve) => curve.objectId)).toEqual(ids.preparations.map(cadObjectId));
    expect(curves.curves.every((curve) => curve.closed && curve.coordinateSpace === "object-local")).toBe(true);

    restoreRestorativeSetup(JSON.parse(JSON.stringify({ restorationType: setupState.restorationType, connectorWidthMm: setupState.connectorWidthMm, insertionDirection: setupState.insertionDirection, units: setupState.units })));
    expect(useRestorativeSetupStore.getState()).toMatchObject({ restorationType: "bridge", connectorWidthMm: 4.25, insertionDirection: setupState.insertionDirection, units: setupState.units });
    useCurveStore.getState().replace(JSON.parse(JSON.stringify(curves)));
    expect(useCurveStore.getState().curves).toEqual(curves.curves);
  });

  it("seeds bilingual modules, lessons, scenarios, and schema-valid restorative validators", () => {
    for (const config of [
      { type: "restorative_setup", check: "bridge_design", restorationType: "bridge" },
      { type: "restorative_setup", check: "single_unit_design", restorationType: "inlay" },
      { type: "restorative_setup", check: "veneer_position", restorationType: "veneer" },
      { type: "analysis_target", kind: "thickness", objectIds: ["restorative-bridge-bridge"] },
    ]) expect(validatorConfigSchema.safeParse(config).success).toBe(true);
    expect((migration.match(/'b7180000-0000-4000-8000-0000000000\d+'::uuid/g) ?? [])).toHaveLength(10);
    expect(migration.match(/'PT-TR-18\d'/g)?.length).toBe(4);
    expect(migration).toContain("bridge_workflow"); expect(migration).toContain("inlay_onlay_workflow"); expect(migration).toContain("veneer_workflow");
    expect(migration).toContain("synthetic_bridge_14_16"); expect(migration).toContain("synthetic_inlay_36"); expect(migration).toContain("synthetic_onlay_46"); expect(migration).toContain("synthetic_veneer_11");
    expect(migration).toContain("geometryProvenance"); expect(migration).toContain("noPatientData"); expect(migration).toContain("instructions_sr");
    expect(migration.toLowerCase()).toContain("target for this exercise");
  });
});
