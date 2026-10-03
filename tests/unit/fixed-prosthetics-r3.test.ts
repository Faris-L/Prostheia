import * as THREE from "three";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { afterEach, describe, expect, it } from "vitest";

import { useRestorativeSetupStore } from "@/cad/restorative/types";
import { geometryRegistry } from "@/cad/scene/geometry-registry";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import { caseAssetMetadataSchema } from "@/cad/case-packages/contract";
import { FIXED_PROSTHETICS_R3_PACKAGES } from "@/cad/case-packages/definitions/fixed-prosthetics-r3";
import { caseObjectRuntimeId } from "@/cad/case-packages/identity";
import { loadCasePackage } from "@/cad/case-packages/loader";
import { PRIVATE_FIXED_ASSETS, getPrivateTrainingAsset } from "@/cad/case-packages/private-asset-catalog";
import { FREE_LAB_SCENARIOS, selectRandomScenario } from "@/free-lab/scenarios";
import { lessonSchema } from "@/practice/types";
import { runStepValidators } from "@/practice/validators";

afterEach(() => {
  geometryRegistry.clear();
  useWorkspaceStore.getState().resetDemo();
});

function privateAssetResolver(loadedIds: string[] = []) {
  return async (reference: { id: string; runtimeAssetId?: string }) => {
    const asset = getPrivateTrainingAsset(reference.runtimeAssetId ?? "");
    if (!asset) throw new Error(`Unmapped R3 runtime asset reference: ${reference.id}`);
    loadedIds.push(asset.id);
    const root = new THREE.Group();
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    root.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial()));
    const metadata = caseAssetMetadataSchema.parse({
      assetId: asset.id, bucketId: "private-training-assets", objectPath: asset.runtimeFile, format: "glb",
      sourceUnit: "unknown", canonicalUnit: "mm", unitScaleToMm: null,
      coordinateSystem: { id: "unknown", handedness: "unknown", upAxis: "unknown" },
      bounds: { min: asset.runtimeBoundsMm.min, max: asset.runtimeBoundsMm.max, unit: "mm" },
      statistics: { vertexCount: asset.runtimeVertexCount, triangleCount: asset.runtimeTriangleCount },
      provenance: { status: "recorded", source: "University of Dundee, School of Dentistry", sourceUrl: asset.originalUrl, attribution: asset.attribution },
      license: { status: "reviewed", name: asset.licenseName, url: asset.licenseUrl, commercialUseAllowed: true, modificationAllowed: true, redistributionAllowed: true },
      expertReview: "not_reviewed", segmentation: [],
      technicalMetadata: { sourceTitle: asset.title, sourceUid: asset.uid, sourceObjChecksum: asset.sourceObjChecksum, proposedFdi: asset.proposedFdi, morphologyQaStatus: asset.morphologyQaStatus, reviewStatus: asset.reviewStatus, privateTrainingApproval: asset.assetState },
    });
    return {
      object: root,
      importSource: {} as never,
      metadata,
      masterAssetId: asset.derivedFromAssetId ?? asset.id,
      runtimeAssetId: asset.id,
      normalizationState: "canonical" as const,
    };
  };
}

describe("R3 private fixed-prosthetics packages", () => {
  it("promotes only attributed, structurally screened private assets and retains their provenance", () => {
    expect(PRIVATE_FIXED_ASSETS).toHaveLength(30);
    expect(PRIVATE_FIXED_ASSETS.every((asset) => asset.assetState === "private_training_approved" && asset.licenseName === "CC BY 4.0" && asset.uid && asset.originalUrl && asset.attribution && asset.sourceObjChecksum && asset.runtimeChecksum)).toBe(true);
    expect(PRIVATE_FIXED_ASSETS.every((asset) => asset.sourceUnitStatus === "unknown" && asset.patientProvenanceStatus === "unknown" && asset.expertReviewStatus === "not_reviewed")).toBe(true);
    expect(PRIVATE_FIXED_ASSETS.some((asset) => asset.uid === "9117d0b3d2a04fb3b306e4ab77c98353" || asset.uid === "108201cf6434478882ef953e4dcf7cb1")).toBe(false);
  });

  it("parses every package-referenced runtime GLB and prepares its real geometry for BVH queries", async () => {
    const referenced = new Set(FIXED_PROSTHETICS_R3_PACKAGES.flatMap((manifest) => manifest.assetRefs.flatMap((reference) => reference.runtimeAssetId ? [reference.runtimeAssetId] : [])));
    expect(referenced.size).toBe(26);
    const loader = new GLTFLoader();
    let loadedTriangles = 0;
    for (const assetId of referenced) {
      const asset = getPrivateTrainingAsset(assetId)!;
      const file = readFileSync(resolve(process.cwd(), "src/cad/case-packages/private-v1/runtime", asset.runtimeFile));
      expect(createHash("sha256").update(file).digest("hex")).toBe(asset.runtimeChecksum);
      const buffer = Uint8Array.from(file).buffer;
      expect(new TextDecoder().decode(new Uint8Array(buffer, 0, 4))).toBe("glTF");
      const jsonLength = new DataView(buffer).getUint32(12, true);
      const header = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLength)).trim()) as { asset?: { version?: string } };
      expect(header.asset?.version).toBe("2.0");
      const gltf = await loader.parseAsync(buffer, "");
      let meshCount = 0;
      let assetVertices = 0;
      let assetTriangles = 0;
      gltf.scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        meshCount += 1;
        const geometry = object.geometry as THREE.BufferGeometry & { computeBoundsTree: (options?: { maxLeafSize?: number }) => unknown; boundsTree?: unknown; disposeBoundsTree: () => void };
        const positions = geometry.getAttribute("position");
        const normals = geometry.getAttribute("normal");
        const triangleCount = geometry.index ? geometry.index.count / 3 : positions.count / 3;
        geometry.computeBoundingBox();
        expect(positions.count).toBeGreaterThanOrEqual(3);
        expect(normals.count).toBe(positions.count);
        expect(Number.isFinite(geometry.boundingBox?.getSize(new THREE.Vector3()).length())).toBe(true);
        expect(triangleCount).toBeGreaterThan(0);
        assetVertices += positions.count;
        assetTriangles += triangleCount;
        geometry.computeBoundsTree({ targetLeafSize: 12 });
        expect(geometry.boundsTree).toBeDefined();
        geometry.disposeBoundsTree();
        geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      });
      expect(meshCount).toBeGreaterThan(0);
      expect(assetVertices).toBe(asset.runtimeVertexCount);
      expect(assetTriangles).toBe(asset.runtimeTriangleCount);
      loadedTriangles += assetTriangles;
    }
    expect(loadedTriangles).toBeGreaterThan(100_000);
  });

  it("loads the Crown anatomy package with an editable proposal, locked sources and retained Dundee metadata", async () => {
    const crown = FIXED_PROSTHETICS_R3_PACKAGES.find((manifest) => manifest.packageId === "r3-crown-26-v1")!;
    const loadedAssetIds: string[] = [];
    const result = await loadCasePackage(crown, { mode: "practice", resolveAsset: privateAssetResolver(loadedAssetIds) });
    const objects = useWorkspaceStore.getState().objects;
    const preparation = objects.find((object) => object.caseObjectId === "preparation")!;
    const restoration = objects.find((object) => object.caseObjectId === "restoration")!;
    expect(preparation).toMatchObject({ caseRole: "SOURCE", role: "prepared_tooth", editable: false });
    expect(restoration).toMatchObject({ caseRole: "DESIGN", role: "crown", restorationType: "crown", editable: true, visible: false });
    expect(objects.some((object) => object.caseRole === "SOURCE" && object.role === "antagonist")).toBe(true);
    expect(objects.some((object) => object.caseRole === "REFERENCE" && object.role === "reference")).toBe(true);
    const baselineAssetIds = crown.objects.flatMap((object) => {
      if (object.source.kind !== "asset") return [];
      const assetRefId = object.source.assetRefId;
      return [crown.assetRefs.find((reference) => reference.id === assetRefId)?.runtimeAssetId];
    }).filter((id): id is string => Boolean(id));
    expect(new Set(loadedAssetIds)).toEqual(new Set(baselineAssetIds));
    expect(restoration.caseAssetMetadata?.technicalMetadata).toMatchObject({ privateTrainingApproval: "private_training_approved", sourceUid: expect.any(String), morphologyQaStatus: "DERIVED_TRAINING_GEOMETRY_NOT_EXPERT_REVIEWED" });
    expect(result.ids).toHaveLength(crown.objects.length);
  });

  it("starts Crown lessons at distinct checkpoints and preserves procedural guide sources", async () => {
    const crown = FIXED_PROSTHETICS_R3_PACKAGES.find((manifest) => manifest.packageId === "r3-crown-26-v1")!;
    const ids = ["margin", "insertion_path", "placement", "contacts", "sculpt", "thickness", "case_start"];
    const states: Record<string, { designVisible: boolean; designAssetRef: string; referenceVisible: boolean; curveCount: number; guideSource: string }> = {};
    for (const checkpointId of ids) {
      await loadCasePackage(crown, { mode: "practice", checkpointId, resolveAsset: privateAssetResolver() });
      const design = useWorkspaceStore.getState().objects.find((object) => object.caseObjectId === "restoration")!;
      const reference = useWorkspaceStore.getState().objects.find((object) => object.caseObjectId === "reference")!;
      const guide = useWorkspaceStore.getState().objects.find((object) => object.caseObjectId === "margin-guide")!;
      states[checkpointId] = {
        designVisible: design.visible,
        designAssetRef: design.caseAssetRefId ?? "",
        referenceVisible: reference.visible,
        curveCount: (await import("@/cad/curves/store")).useCurveStore.getState().curves.length,
        guideSource: geometryRegistry.get(guide.id)?.object.name ?? "",
      };
    }
    expect(states.margin).toMatchObject({ designVisible: false, curveCount: 0 });
    expect(states.insertion_path).toMatchObject({ designVisible: false, curveCount: 1 });
    expect(states.placement).toMatchObject({ designVisible: true, designAssetRef: "design26-placement" });
    expect(states.contacts).toMatchObject({ designVisible: true, designAssetRef: "design26" });
    expect(states.sculpt).toMatchObject({ designVisible: true, referenceVisible: true, designAssetRef: "design26" });
    expect(states.thickness).toMatchObject({ designVisible: true, designAssetRef: "design26-near-final" });
    expect(states.case_start).toMatchObject({ designVisible: false, referenceVisible: false });
    expect(new Set(Object.values(states).map((state) => `${state.designVisible}:${state.designAssetRef}:${state.referenceVisible}:${state.curveCount}`)).size).toBeGreaterThanOrEqual(5);
    expect(states.sculpt.guideSource).toContain("Margin location guide");
  });

  it("keeps connected Bridge unit semantics and two prepared abutment sources", async () => {
    const bridge = FIXED_PROSTHETICS_R3_PACKAGES.find((manifest) => manifest.workflowType === "bridge")!;
    const designDescriptor = bridge.objects.find((object) => object.caseRole === "DESIGN")!;
    expect(designDescriptor.workflowMetadata).toMatchObject({ restorationType: "bridge", coverage: "two-abutments-one-pontic-two-connectors" });
    expect(designDescriptor.workflowMetadata.restorationUnitIds).toEqual(expect.arrayContaining([
      "bridge-unit-abutment-24", "bridge-unit-pontic-25", "bridge-unit-abutment-26", "bridge-connector-24-25", "bridge-connector-25-26",
    ]));
    await loadCasePackage(bridge, { mode: "free-lab", checkpointId: "proposal_ready", resolveAsset: privateAssetResolver() });
    expect(useRestorativeSetupStore.getState().units.filter((unit) => unit.kind === "abutment")).toHaveLength(2);
    expect(useRestorativeSetupStore.getState().units.filter((unit) => unit.kind === "pontic")).toHaveLength(1);
    expect(useRestorativeSetupStore.getState().units.filter((unit) => unit.kind === "connector")).toHaveLength(2);
    expect(useWorkspaceStore.getState().objects.filter((object) => object.caseRole === "SOURCE" && object.role === "prepared_tooth")).toHaveLength(2);
  });

  it("keeps Inlay and Onlay as distinct partial designs and Veneer as a thin anterior shell", () => {
    const byType = new Map(FIXED_PROSTHETICS_R3_PACKAGES.map((manifest) => [manifest.workflowType, manifest]));
    const inlay = byType.get("inlay")!;
    const onlay = byType.get("onlay")!;
    const veneer = byType.get("veneer")!;
    const coverage = (manifest: typeof inlay) => manifest.objects.find((object) => object.caseRole === "DESIGN")!.workflowMetadata.coverage;
    expect(coverage(inlay)).toBe("central-intracoronal-patch");
    expect(coverage(onlay)).toBe("broad-partial-cuspal-coverage");
    expect(inlay.objects.find((object) => object.id === "preparation")?.source).not.toEqual(onlay.objects.find((object) => object.id === "preparation")?.source);
    expect(coverage(veneer)).toBe("thin-facial-and-incisal-shell");
    expect(veneer.objects.find((object) => object.id === "preparation")?.dental?.fdi).toBe(21);
    expect(veneer.objects.find((object) => object.caseRole === "REFERENCE")?.dental?.fdi).toBe(21);
    expect(veneer.checkpoints.some((checkpoint) => checkpoint.id === "reference_review")).toBe(true);
  });

  it("resolves all six package-backed Free Lab cases and selects them through existing Random Case filters", async () => {
    const r3Cases = FREE_LAB_SCENARIOS.filter((scenario) => scenario.casePackageId?.startsWith("r3-"));
    expect(r3Cases).toHaveLength(6);
    expect(r3Cases.every((scenario) => scenario.status === "published" && scenario.randomEligible && scenario.startingCheckpointId === "proposal_ready")).toBe(true);
    for (const scenario of r3Cases) {
      const manifest = FIXED_PROSTHETICS_R3_PACKAGES.find((candidate) => candidate.packageId === scenario.casePackageId);
      expect(manifest).toBeDefined();
      expect(manifest?.labOrder.targetTeeth).toEqual(scenario.brief.targetTeeth);
      expect(manifest?.labOrder.restorationType).toBe(scenario.restorationType);
      const loaded = await loadCasePackage(manifest, { mode: "free-lab", checkpointId: scenario.startingCheckpointId, resolveAsset: privateAssetResolver() });
      expect(loaded.manifest.packageId).toBe(scenario.casePackageId);
      expect(useWorkspaceStore.getState().mode).toBe("free-lab");
    }
    expect(selectRandomScenario(r3Cases, "crown", "intermediate", () => 0)?.casePackageId).toBe("r3-crown-26-v1");
    expect(selectRandomScenario(r3Cases, "bridge", "advanced", () => 0)?.casePackageId).toBe("r3-bridge-24-26-v1");
    expect(selectRandomScenario(r3Cases, "inlay_onlay", "beginner", () => 0)?.casePackageId).toBe("r3-inlay-36-v1");
  });

  it("binds validation IDs to package objects and clears the prior case when switching", async () => {
    for (const manifest of FIXED_PROSTHETICS_R3_PACKAGES) {
      for (const binding of manifest.validationBindings) for (const localId of binding.objectIds) {
        expect(manifest.objects.some((object) => object.id === localId)).toBe(true);
        expect(String(caseObjectRuntimeId(manifest.caseId, localId))).toBeTruthy();
      }
      const result = await loadCasePackage(manifest, { mode: "practice", resolveAsset: privateAssetResolver() });
      expect(geometryRegistry.getAll().map((entry) => String(entry.id)).sort()).toEqual([...result.ids].sort());
      expect(useWorkspaceStore.getState().objects.every((object) => object.casePackageId === manifest.packageId)).toBe(true);
    }
  });

  it("runs Design Check against R3 package identities and meaningful unit/coverage state", async () => {
    const bridge = FIXED_PROSTHETICS_R3_PACKAGES.find((manifest) => manifest.workflowType === "bridge")!;
    await loadCasePackage(bridge, { mode: "practice", checkpointId: "proposal_ready", resolveAsset: privateAssetResolver() });
    const bridgeLesson = lessonSchema.parse({
      id: "r3-bridge-validator", databaseId: "b7180000-0000-4000-8000-000000000013", moduleId: "bridge-workflow",
      title: { en: "Bridge check", sr: "Provera mosta" }, summary: { en: "Summary", sr: "Sažetak" }, goal: { en: "Goal", sr: "Cilj" },
      difficulty: "intermediate", recommendedPrerequisites: [], estimatedMinutes: 5, assets: [],
      caseSetup: { source: "restorative-case", restorationType: "bridge", casePackageId: bridge.packageId, checkpointId: "proposal_ready", objectMappings: [] },
      steps: [{ id: "bridge-check", order: 1, title: { en: "Check", sr: "Provera" }, instructions: { en: "Review", sr: "Pregledajte" }, allowedTools: ["select"], targetObjectIds: [], hints: [], referenceModes: ["off"], validators: [{ type: "restorative_setup", check: "bridge_design", restorationType: "bridge" }] }],
    });
    expect(runStepValidators(bridgeLesson, bridgeLesson.steps[0]).map((result) => result.outcome)).toEqual(["pass"]);

    for (const type of ["inlay", "onlay", "veneer"] as const) {
      const manifest = FIXED_PROSTHETICS_R3_PACKAGES.find((candidate) => candidate.workflowType === type)!;
      await loadCasePackage(manifest, { mode: "practice", checkpointId: "design_ready", resolveAsset: privateAssetResolver() });
      const designId = caseObjectRuntimeId(manifest.caseId, "restoration");
      const step = { id: `${type}-check`, order: 1, title: { en: "Check", sr: "Provera" }, instructions: { en: "Review", sr: "Pregledajte" }, allowedTools: ["select"], targetObjectIds: [designId], hints: [], referenceModes: ["off"], validators: [{ type: "restorative_setup", check: type === "veneer" ? "veneer_position" : "single_unit_design", restorationType: type }] };
      const item = lessonSchema.parse({
        id: `r3-${type}-validator`, databaseId: "b7180000-0000-4000-8000-000000000020", moduleId: "r3-workflow",
        title: { en: "Design check", sr: "Provera dizajna" }, summary: { en: "Summary", sr: "Sažetak" }, goal: { en: "Goal", sr: "Cilj" },
        difficulty: "intermediate", recommendedPrerequisites: [], estimatedMinutes: 5, assets: [],
        caseSetup: { source: "restorative-case", restorationType: type, casePackageId: manifest.packageId, checkpointId: "design_ready", objectMappings: [] }, steps: [step],
      });
      expect(runStepValidators(item, item.steps[0])[0].outcome).toBe("fail");
      useWorkspaceStore.getState().applyTransform(designId, { position: [0.4, 0, 0], rotation: [0, 0.08, 0], scale: [1, 1, 1] });
      expect(runStepValidators(item, item.steps[0])[0].outcome, `Design Check should pass after editing the ${type} design.`).toBe("pass");
    }
  });
});
