import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CASE_PACKAGES, getCasePackage } from "@/cad/case-packages/registry";
import { caseAssetMetadataSchema, validateCasePackage } from "@/cad/case-packages/contract";
import type { ResolvedCaseAsset } from "@/cad/case-packages/asset-registry";
import { caseObjectRuntimeId } from "@/cad/case-packages/identity";
import { loadRegisteredCasePackage } from "@/cad/case-packages/loader";
import { createProceduralCaseObject } from "@/cad/case-packages/procedures";
import { IMPLANT_R7_CASE_STAGES, IMPLANT_R7_PACKAGES } from "@/cad/case-packages/definitions/implant-r7";
import { geometryRegistry } from "@/cad/scene/geometry-registry";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import { useAnalysisStore } from "@/cad/analysis/state";
import { snapshotMesh } from "@/cad/analysis/geometry";
import { runStepValidators } from "@/practice/validators";
import { IMPLANT_R7_LESSONS } from "@/practice/implant-r7-lessons";
import { mergeLocalPracticeLessons } from "@/practice/database-catalog";
import { lessonSchema } from "@/practice/types";
import { R7_IMPLANT_SCENARIOS } from "@/free-lab/implant-scenario";
import { selectRandomScenario } from "@/free-lab/scenarios";

afterEach(() => {
  geometryRegistry.clear();
  useWorkspaceStore.getState().resetDemo();
  useAnalysisStore.getState().clear();
  vi.restoreAllMocks();
});

function resolvedTrainingCrown(reference: { assetId?: string }): ResolvedCaseAsset {
  const root = new THREE.Group();
  const geometry = new THREE.SphereGeometry(4, 12, 10);
  const material = new THREE.MeshStandardMaterial({ color: "#e8ddc8" });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.userData.prostheiaMeshId = "training-crown-proposal";
  root.add(mesh);
  const assetId = reference.assetId ?? "d4000000-0000-5000-8000-000000000108";
  return {
    object: root,
    importSource: {} as ResolvedCaseAsset["importSource"],
    metadata: caseAssetMetadataSchema.parse({
      assetId,
      bucketId: "private-training-assets",
      objectPath: "r7/test-crown.glb",
      format: "glb",
      sourceUnit: "unknown",
      canonicalUnit: "mm",
      unitScaleToMm: null,
      coordinateSystem: { id: "test-display-frame", handedness: "unknown", upAxis: "unknown" },
      provenance: { status: "recorded", source: "University of Dundee, School of Dentistry", sourceUrl: null, attribution: "Synthetic test fixture" },
      license: { status: "reviewed", name: "CC BY 4.0", url: "https://creativecommons.org/licenses/by/4.0/", commercialUseAllowed: true, modificationAllowed: true, redistributionAllowed: true },
      expertReview: "not_reviewed",
      segmentation: [],
      technicalMetadata: { assetKind: "anatomical crown proposal" },
    }),
    masterAssetId: assetId,
    runtimeAssetId: assetId,
    normalizationState: "canonical",
  };
}

function packageObject(caseId: string, localId: string) {
  return useWorkspaceStore.getState().objects.find((object) => object.id === caseObjectRuntimeId(caseId, localId));
}

describe("R7 restorative implant case packages", () => {
  it("registers two bilingual synthetic cases with SOURCE, DESIGN, GUIDE, and REFERENCE semantics", () => {
    expect(IMPLANT_R7_PACKAGES).toHaveLength(2);
    for (const manifest of IMPLANT_R7_PACKAGES) {
      const parsed = validateCasePackage(manifest);
      expect(getCasePackage(parsed.packageId)).toBeTruthy();
      expect(new Set(parsed.objects.map((object) => object.caseRole))).toEqual(new Set(["SOURCE", "DESIGN", "GUIDE", "REFERENCE"]));
      expect(parsed.workflowType).toBe("implant");
      expect(parsed.metadata.title.sr).toBeTruthy();
      expect(parsed.labOrder.educationalDisclaimer.en).toContain("fictional");
      expect(parsed.trainingNotes.map((note) => note.en).join(" ")).toContain("exercise");
      expect(parsed.assetRefs[0].assetId).toMatch(/^d4000000-0000-5000-8000-/);
      expect(parsed.objects.find((object) => object.id === "source-scan-body")).toMatchObject({ caseRole: "SOURCE", cadRole: "scan", editable: false });
      expect(parsed.objects.find((object) => object.id === "source-implant-reference")).toMatchObject({ caseRole: "SOURCE", cadRole: "implant", editable: false });
      expect(parsed.objects.find((object) => object.id === "design-emergence-profile")).toMatchObject({ caseRole: "DESIGN", editable: true });
      expect(parsed.objects.find((object) => object.id === "design-abutment")).toMatchObject({ caseRole: "DESIGN", cadRole: "abutment", editable: true });
      expect(parsed.objects.find((object) => object.id === "design-implant-crown")).toMatchObject({ caseRole: "DESIGN", cadRole: "crown", editable: true, source: { kind: "asset", assetRefId: "dundee-crown" } });
      expect(parsed.objects.find((object) => object.id === "guide-screw-access")).toMatchObject({ caseRole: "GUIDE", editable: false });
      expect(parsed.validationBindings.some((binding) => binding.binding.kind === "inline" && binding.binding.validatorType === "r7_workflow")).toBe(true);
    }
    const system = IMPLANT_R7_PACKAGES[0].objects.find((object) => object.id === "source-implant-reference")!.workflowMetadata;
    expect(system).toMatchObject({ name: "Synthetic Training Implant System", systemId: "prostheia-synthetic-training-implant-v1", platformType: "Training platform · P4", restorativeInterface: "Synthetic indexed interface · SI-4", noCommercialDimensionalCompatibility: true, surgicallyPositionable: false });
  });

  it("uses stable scan-body semantics and deterministic fixed axis geometry", async () => {
    const firstPackage = IMPLANT_R7_PACKAGES[0];
    await loadRegisteredCasePackage(firstPackage.packageId, { mode: "practice", resolveAsset: async (reference) => resolvedTrainingCrown(reference) });
    const scanDescriptor = firstPackage.objects.find((object) => object.id === "source-scan-body")!;
    const scan = createProceduralCaseObject(scanDescriptor.source as Extract<typeof scanDescriptor.source, { kind: "procedural" }>);
    const scanMeshes: THREE.Mesh[] = [];
    scan.traverse((object) => { if (object instanceof THREE.Mesh) scanMeshes.push(object); });
    expect(scanMeshes.map((mesh) => mesh.userData.prostheiaMeshId)).toContain("r7-scan-body-indexed-head");
    expect(scanMeshes.map((mesh) => mesh.userData.prostheiaMeshId)).toContain("r7-scan-body-indexing-flat");
    expect(scanMeshes).toHaveLength(5);
    const fixture = packageObject(firstPackage.caseId, "source-implant-reference");
    expect(fixture?.caseWorkflowMetadata).toMatchObject({ implantRole: "fixture", axisSource: "synthetic_case_reference", surgicallyPositionable: false });
    expect(firstPackage.objects.find((object) => object.id === "source-scan-body")?.workflowMetadata).toMatchObject({ scanBodyId: "stis-scanbody-indexed-a", orientationMarker: "flat-a", resolvesFixtureObjectId: "source-implant-reference", commercialMatch: false });
    const fixtureGeometry = createProceduralCaseObject(firstPackage.objects.find((object) => object.id === "source-implant-reference")!.source as Extract<typeof scanDescriptor.source, { kind: "procedural" }>);
    expect(fixtureGeometry.name).toContain("fixed case axis");
    scan.traverse((object) => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose(); } });
    fixtureGeometry.traverse((object) => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); for (const material of Array.isArray(object.material) ? object.material : [object.material]) material.dispose(); } });
  });

  it("defines the required progressive checkpoints and starts each local lesson from its own state", () => {
    expect(IMPLANT_R7_CASE_STAGES.map((stage) => stage.id)).toEqual(["inspect", "scan_body", "implant_axis", "emergence", "abutment", "crown_proposal", "crown_position", "contacts", "occlusion", "screw_access", "final"]);
    expect(IMPLANT_R7_PACKAGES[0].checkpoints.map((checkpoint) => checkpoint.id)).toEqual(IMPLANT_R7_CASE_STAGES.map((stage) => stage.id));
    expect(IMPLANT_R7_LESSONS).toHaveLength(IMPLANT_R7_CASE_STAGES.length);
    for (const [index, lesson] of IMPLANT_R7_LESSONS.entries()) {
      const parsed = lessonSchema.parse(lesson);
      expect(parsed.caseSetup.casePackageId).toBe(IMPLANT_R7_PACKAGES[0].packageId);
      expect(parsed.caseSetup.checkpointId).toBe(IMPLANT_R7_CASE_STAGES[index].id);
      expect(parsed.steps[0].instructions.en).toContain("WHAT:");
      expect(parsed.steps[0].instructions.en).toContain("WHY:");
      expect(parsed.steps[0].instructions.en).toContain("OBJECT:");
      expect(parsed.steps[0].instructions.en).toContain("TOOL:");
      expect(parsed.steps[0].instructions.en).toContain("ACTION:");
      expect(parsed.steps[0].instructions.en).toContain("TARGET:");
      expect(parsed.steps[0].instructions.en).toContain("CHECK:");
      expect(parsed.steps[0].instructions.sr).toContain("PROVERA:");
    }
    const merged = mergeLocalPracticeLessons([]);
    expect(merged.filter((lesson) => lesson.moduleId === "implant-r7-restorative-cad")).toHaveLength(11);
    expect(merged.some((lesson) => lesson.caseSetup.source === "implant-case" && !lesson.id.startsWith("r7-implant-"))).toBe(false);
  });

  it("loads the full package, binds typed objects, runs Design Check, then switches cases and disposes prior geometry", async () => {
    const first = await loadRegisteredCasePackage(IMPLANT_R7_PACKAGES[0].packageId, { mode: "free-lab", resolveAsset: async (reference) => resolvedTrainingCrown(reference) });
    expect(first.checkpointId).toBe("inspect");
    expect(useWorkspaceStore.getState().objects).toHaveLength(IMPLANT_R7_PACKAGES[0].objects.length);
    const scan = packageObject(IMPLANT_R7_PACKAGES[0].caseId, "source-scan-body");
    expect(scan).toMatchObject({ caseRole: "SOURCE", casePackageId: "r7-implant-posterior-v1", caseCheckpointId: "inspect", caseWorkflowMetadata: { implantRole: "scan_body", scanBodyId: "stis-scanbody-indexed-a" } });
    const crown = packageObject(IMPLANT_R7_PACKAGES[0].caseId, "design-implant-crown");
    expect(crown).toMatchObject({ caseRole: "DESIGN", role: "crown", caseRuntimeAssetId: "d4000000-0000-5000-8000-000000000108" });
    const crownMesh = geometryRegistry.getMeshes(crown!.id)[0].geometry;
    const dispose = vi.spyOn(crownMesh, "dispose");
    await loadRegisteredCasePackage(IMPLANT_R7_PACKAGES[0].packageId, { mode: "practice", checkpointId: "scan_body", resolveAsset: async (reference) => resolvedTrainingCrown(reference) });
    const scanLesson = IMPLANT_R7_LESSONS.find((lesson) => lesson.id === "r7-implant-scan-body")!;
    const scanResult = runStepValidators(scanLesson, scanLesson.steps[0]);
    expect(scanResult[0].outcome).toBe("pass");

    const switched = await loadRegisteredCasePackage(IMPLANT_R7_PACKAGES[1].packageId, { mode: "practice", checkpointId: "contacts", resolveAsset: async (reference) => resolvedTrainingCrown(reference) });
    expect(switched.checkpointId).toBe("contacts");
    expect(useWorkspaceStore.getState().mode).toBe("practice");
    expect(packageObject(IMPLANT_R7_PACKAGES[1].caseId, "design-implant-crown")?.caseCheckpointId).toBe("contacts");
    expect(dispose).toHaveBeenCalled();
    expect(geometryRegistry.getAll().every((entry) => String(entry.id).startsWith(`${IMPLANT_R7_PACKAGES[1].caseId}-`))).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 10));
    const secondCrown = packageObject(IMPLANT_R7_PACKAGES[1].caseId, "design-implant-crown")!;
    const secondGeometry = geometryRegistry.getMeshes(secondCrown.id)[0].geometry as THREE.BufferGeometry & { boundsTree?: unknown };
    expect(secondGeometry.boundsTree).toBeTruthy();
    const secondDispose = vi.spyOn(secondGeometry, "dispose");
    await loadRegisteredCasePackage(IMPLANT_R7_PACKAGES[0].packageId, { mode: "practice", checkpointId: "final", resolveAsset: async (reference) => resolvedTrainingCrown(reference) });
    expect(secondDispose).toHaveBeenCalled();
    expect(packageObject(IMPLANT_R7_PACKAGES[0].caseId, "design-implant-crown")?.caseCheckpointId).toBe("final");
    expect(useAnalysisStore.getState().results).toHaveLength(0);
  });

  it("checks current contact/occlusion analysis and confirms final required outputs", async () => {
    await loadRegisteredCasePackage(IMPLANT_R7_PACKAGES[0].packageId, { mode: "practice", checkpointId: "contacts", resolveAsset: async (reference) => resolvedTrainingCrown(reference) });
    const lesson = IMPLANT_R7_LESSONS.find((entry) => entry.id === "r7-implant-contacts")!;
    expect(runStepValidators(lesson, lesson.steps[0])[0].outcome).toBe("fail");
    const crown = packageObject(IMPLANT_R7_PACKAGES[0].caseId, "design-implant-crown")!;
    const adjacent = packageObject(IMPLANT_R7_PACKAGES[0].caseId, "source-neighbor-mesial")!;
    const crownTarget = snapshotMesh(crown.id, geometryRegistry.getMeshes(crown.id)[0].key);
    const adjacentTarget = snapshotMesh(adjacent.id, geometryRegistry.getMeshes(adjacent.id)[0].key);
    useAnalysisStore.getState().record({ kind: "contact", targets: [crownTarget, adjacentTarget], values: new Float32Array(), valid: new Uint8Array(), minMm: 0.2, maxMm: 2, thresholdMm: 0.5, sampleCount: 2 });
    expect(runStepValidators(lesson, lesson.steps[0])[0].outcome).toBe("pass");

    await loadRegisteredCasePackage(IMPLANT_R7_PACKAGES[0].packageId, { mode: "practice", checkpointId: "final", resolveAsset: async (reference) => resolvedTrainingCrown(reference) });
    const finalLesson = IMPLANT_R7_LESSONS.find((entry) => entry.id === "r7-implant-final")!;
    const finalCrown = packageObject(IMPLANT_R7_PACKAGES[0].caseId, "design-implant-crown")!;
    const antagonist = packageObject(IMPLANT_R7_PACKAGES[0].caseId, "source-antagonist")!;
    const finalCrownTarget = snapshotMesh(finalCrown.id, geometryRegistry.getMeshes(finalCrown.id)[0].key);
    const antagonistTarget = snapshotMesh(antagonist.id, geometryRegistry.getMeshes(antagonist.id)[0].key);
    useAnalysisStore.getState().record({ kind: "contact", targets: [finalCrownTarget, antagonistTarget], values: new Float32Array(), valid: new Uint8Array(), minMm: 0.4, maxMm: 3.5, thresholdMm: 0.5, sampleCount: 2 });
    useAnalysisStore.getState().record({ kind: "intersection", targets: [finalCrownTarget, antagonistTarget], intersects: false });
    useAnalysisStore.getState().record({ kind: "thickness", targets: [finalCrownTarget], values: new Float32Array(), valid: new Uint8Array(), minMm: 0.8, maxMm: 2.1, thresholdMm: 1, sampleCount: 2 });
    expect(runStepValidators(finalLesson, finalLesson.steps[0])[0].outcome).toBe("pass");
  });

  it("registers two distinct random-eligible package-backed Free Lab cases", () => {
    expect(R7_IMPLANT_SCENARIOS).toHaveLength(2);
    expect(R7_IMPLANT_SCENARIOS.map((scenario) => scenario.casePackageId)).toEqual(IMPLANT_R7_PACKAGES.map((manifest) => manifest.packageId));
    expect(R7_IMPLANT_SCENARIOS.every((scenario) => scenario.category === "implant" && scenario.randomEligible && scenario.status === "published" && scenario.startingCheckpointId === "inspect")).toBe(true);
    expect(R7_IMPLANT_SCENARIOS[0].brief.targetTeeth).not.toEqual(R7_IMPLANT_SCENARIOS[1].brief.targetTeeth);
    expect(R7_IMPLANT_SCENARIOS[0].brief.requirements.en.join(" ")).toContain("proximal contacts");
    expect(R7_IMPLANT_SCENARIOS[1].brief.requirements.en.join(" ")).toContain("distal contact");
    expect(selectRandomScenario(R7_IMPLANT_SCENARIOS, "implant", "intermediate", () => 0)?.casePackageId).toBe(IMPLANT_R7_PACKAGES[0].packageId);
    expect(selectRandomScenario(R7_IMPLANT_SCENARIOS, "implant", "advanced", () => 0.99)?.casePackageId).toBe(IMPLANT_R7_PACKAGES[1].packageId);
  });

  it("keeps the shared R1–R6 package registry alongside R7", () => {
    const ids = CASE_PACKAGES.map((manifest) => manifest.packageId);
    expect(ids).toContain("posterior-crown-26-v1");
    for (const prefix of ["r3-", "r4-", "r5-", "r6-", "r7-implant-"]) expect(ids.some((id) => id.startsWith(prefix))).toBe(true);
  });
});
