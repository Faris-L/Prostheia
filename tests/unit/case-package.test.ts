import * as THREE from "three";
import { afterEach, describe, expect, it, vi } from "vitest";

import { geometryRegistry } from "@/cad/scene/geometry-registry";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import { cadObjectId } from "@/cad/types";
import { posteriorCrown26Package } from "@/cad/case-packages/definitions/posterior-crown-26";
import { caseAssetMetadataSchema, CasePackageValidationError, validateCasePackage } from "@/cad/case-packages/contract";
import { caseRuntimeAssetRecordId, unitScaleToMm, type ResolvedCaseAsset } from "@/cad/case-packages/asset-registry";
import { normalizeResolvedCaseAsset, originalToCanonicalFromRegistry, validateOriginalToCanonical } from "@/cad/case-packages/asset-normalization";
import { caseObjectRuntimeId } from "@/cad/case-packages/identity";
import { loadCasePackage } from "@/cad/case-packages/loader";
import { createCrownCase } from "@/cad/crown/case";
import { initializeFreeLabWorkspace } from "@/free-lab/initialize-workspace";
import { initializePracticeLesson } from "@/practice/initialize-assets";
import { lessonSchema } from "@/practice/types";

let packageSequence = 0;
function testManifest() {
  packageSequence += 1;
  const caseId = `r1case${packageSequence}`;
  const manifest = structuredClone(posteriorCrown26Package);
  manifest.packageId = `r1-case-package-${packageSequence}-v1`;
  manifest.caseId = caseId;
  manifest.slug = `r1-case-${packageSequence}`;
  manifest.compatibility = { practiceSources: [], scenarioSlugs: [] };
  return manifest;
}

function sourceTriangle() {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
  geometry.setIndex([0, 1, 2]);
  geometry.computeVertexNormals();
  const root = new THREE.Group();
  root.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial()));
  return { root, geometry };
}

function resolvedTestAsset(originalToCanonical: number[], sourceUnit: "mm" | "cm" = "mm"): ResolvedCaseAsset {
  const { root } = sourceTriangle();
  return {
    object: root,
    importSource: undefined as unknown as NonNullable<ResolvedCaseAsset["importSource"]>,
    metadata: {
      assetId: "123e4567-e89b-42d3-a456-426614174091",
      bucketId: "research-only",
      objectPath: "candidate/tooth.obj",
      format: "obj",
      sourceUnit,
      canonicalUnit: "mm",
      unitScaleToMm: sourceUnit === "cm" ? 10 : 1,
      coordinateSystem: { id: "test-source", handedness: "right", upAxis: "z" },
      provenance: { status: "recorded", source: "unit fixture", sourceUrl: null, attribution: null },
      license: { status: "unreviewed", name: null, url: null, commercialUseAllowed: null, modificationAllowed: null, redistributionAllowed: null },
      expertReview: "not_reviewed",
      segmentation: [],
      technicalMetadata: {},
    },
    masterAssetId: null,
    runtimeAssetId: "123e4567-e89b-42d3-a456-426614174091",
    originalToCanonical,
    normalizationState: "source",
  };
}

afterEach(() => {
  geometryRegistry.clear();
  useWorkspaceStore.getState().resetDemo();
  vi.restoreAllMocks();
});

describe("shared Case Package contract", () => {
  it("accepts a versioned bilingual package and maps semantic roles without replacing CAD roles", () => {
    const manifest = validateCasePackage(posteriorCrown26Package);
    expect(manifest.schemaVersion).toBe(1);
    expect(new Set(manifest.objects.map((object) => object.caseRole))).toEqual(new Set(["SOURCE", "DESIGN", "GUIDE", "REFERENCE"]));
    expect(manifest.objects.find((object) => object.id === "restoration")).toMatchObject({ caseRole: "DESIGN", cadRole: "crown", editable: true });
    expect(manifest.metadata.title.sr).toBeTruthy();
    expect(manifest.labOrder.educationalDisclaimer.en).toContain("Educational");
  });

  it("rejects duplicate IDs, dangling assets and parents, invalid semantic/CAD/workflow roles, and bad procedure descriptors", async () => {
    const duplicate = testManifest();
    duplicate.objects[1].id = duplicate.objects[0].id;
    expect(() => validateCasePackage(duplicate)).toThrow(/duplicate object id/i);

    const missingAsset = testManifest();
    missingAsset.objects[0].source = { kind: "asset", assetRefId: "absent-asset" };
    expect(() => validateCasePackage(missingAsset)).toThrow(/missing asset reference/i);

    const missingParent = testManifest();
    missingParent.objects[0].parentId = "absent-parent";
    expect(() => validateCasePackage(missingParent)).toThrow(/missing parent/i);

    const invalidRole = testManifest();
    (invalidRole.objects[0] as unknown as { caseRole: string }).caseRole = "PATIENT";
    expect(() => validateCasePackage(invalidRole)).toThrow(CasePackageValidationError);

    const invalidCadRole = testManifest();
    (invalidCadRole.objects[0] as unknown as { cadRole: string }).cadRole = "cylinder";
    expect(() => validateCasePackage(invalidCadRole)).toThrow(CasePackageValidationError);

    const invalidWorkflow = testManifest();
    (invalidWorkflow as unknown as { workflowType: string }).workflowType = "unknown-workflow";
    expect(() => validateCasePackage(invalidWorkflow)).toThrow(CasePackageValidationError);

    const invalidProcedure = testManifest();
    invalidProcedure.objects[0].source = { kind: "procedural", factoryId: "missing.factory", parameters: {} };
    await expect(loadCasePackage(invalidProcedure, { mode: "practice" })).rejects.toThrow(/unknown factory/i);
  });

  it("validates checkpoint and validation-binding object references and asset metadata", () => {
    const badCheckpoint = testManifest();
    badCheckpoint.startingCheckpointId = "missing-checkpoint";
    expect(() => validateCasePackage(badCheckpoint)).toThrow(/starting checkpoint .* does not exist/i);

    const badBinding = testManifest();
    badBinding.validationBindings[0].objectIds = ["missing-object"];
    expect(() => validateCasePackage(badBinding)).toThrow(/validation binding .* refers to missing object/i);

    const validMetadata = {
      assetId: "123e4567-e89b-42d3-a456-426614174000", bucketId: "practice-assets", objectPath: "training/case.glb",
      format: "glb", sourceUnit: "unknown", canonicalUnit: "mm", unitScaleToMm: null,
      coordinateSystem: { id: "unknown", handedness: "unknown", upAxis: "unknown" },
      provenance: { status: "unknown", source: null, sourceUrl: null, attribution: null },
      license: { status: "unknown", name: null, url: null, commercialUseAllowed: null, modificationAllowed: null, redistributionAllowed: null },
      expertReview: "unknown", segmentation: [], technicalMetadata: {},
    };
    expect(caseAssetMetadataSchema.safeParse(validMetadata).success).toBe(true);
    expect(caseAssetMetadataSchema.safeParse({ ...validMetadata, sourceUnit: "inch" }).success).toBe(false);
    expect(caseAssetMetadataSchema.safeParse({ ...validMetadata, license: { ...validMetadata.license, commercialUseAllowed: "yes" } }).success).toBe(false);
    expect(unitScaleToMm("mm")).toBe(1);
    expect(unitScaleToMm("cm")).toBe(10);
    expect(unitScaleToMm("m")).toBe(1000);
    expect(unitScaleToMm("unknown")).toBeNull();
    const cmToMm = new THREE.Matrix4().makeScale(10, 10, 10).toArray();
    expect(originalToCanonicalFromRegistry({ matrix: cmToMm }, "cm")).toEqual(cmToMm);
    expect(caseRuntimeAssetRecordId({ id: "pair", required: true, masterAssetId: assetIdsForTest.master, runtimeAssetId: assetIdsForTest.runtime })).toBe(assetIdsForTest.runtime);
    expect(caseRuntimeAssetRecordId({ id: "master-only", required: true, masterAssetId: assetIdsForTest.master })).toBe(assetIdsForTest.master);
    expect(caseRuntimeAssetRecordId({ id: "legacy", required: true, assetId: assetIdsForTest.runtime })).toBe(assetIdsForTest.runtime);
  });
});

const assetIdsForTest = { master: "123e4567-e89b-42d3-a456-426614174021", runtime: "123e4567-e89b-42d3-a456-426614174022" };

describe("Case Package identity and loading", () => {
  it("derives deterministic case-namespaced CAD IDs", () => {
    expect(caseObjectRuntimeId("caseone", "preparation")).toBe(caseObjectRuntimeId("caseone", "preparation"));
    expect(caseObjectRuntimeId("caseone", "preparation")).not.toBe(caseObjectRuntimeId("casetwo", "preparation"));
    expect(String(caseObjectRuntimeId("crown26", "preparation"))).toBe("crown26-preparation");
  });

  it("loads, reloads and switches packages with stable IDs and disposes prior case geometry", async () => {
    const manifest = testManifest();
    const first = await loadCasePackage(manifest, { mode: "practice" });
    const ids = first.ids;
    const firstPreparation = geometryRegistry.get(cadObjectId(ids[0]))!;
    const firstGeometry = geometryRegistry.getMeshes(cadObjectId(ids[0]))[0].geometry;
    const dispose = vi.spyOn(firstGeometry, "dispose");
    expect(useWorkspaceStore.getState().objects).toHaveLength(manifest.objects.length);
    expect(useWorkspaceStore.getState().selectedObjectId).toBe(caseObjectRuntimeId(manifest.caseId, "restoration"));

    const reload = await loadCasePackage(manifest, { mode: "practice" });
    expect(reload.ids).toEqual(ids);
    expect(useWorkspaceStore.getState().objects).toHaveLength(manifest.objects.length);
    expect(dispose).toHaveBeenCalled();
    expect(geometryRegistry.get(firstPreparation.id)).not.toBe(firstPreparation);

    const nextManifest = testManifest();
    const switched = await loadCasePackage(nextManifest, { mode: "free-lab" });
    expect(useWorkspaceStore.getState().mode).toBe("free-lab");
    expect(switched.ids).not.toEqual(ids);
    expect(geometryRegistry.getAll().map((object) => String(object.id))).toEqual(switched.ids);
  });

  it("keeps the active workspace intact and disposes staged assets when resolution fails", async () => {
    const active = testManifest();
    const activeResult = await loadCasePackage(active, { mode: "practice" });
    const activeIds = [...activeResult.ids];
    const activeRoots = geometryRegistry.getAll().map((entry) => entry.object);
    const beforeObjects = useWorkspaceStore.getState().objects.map((object) => object.id);

    const failed = testManifest();
    const assetIds = ["123e4567-e89b-42d3-a456-426614174001", "123e4567-e89b-42d3-a456-426614174002"];
    failed.assetRefs = [{ id: "asset-one", assetId: assetIds[0], required: true }, { id: "asset-two", assetId: assetIds[1], required: true }];
    failed.objects[0].source = { kind: "asset", assetRefId: "asset-one" };
    failed.objects[1].source = { kind: "asset", assetRefId: "asset-two" };
    const stagedGeometry = new THREE.BoxGeometry(1, 1, 1);
    const stagedDispose = vi.spyOn(stagedGeometry, "dispose");
    const stagedRoot = new THREE.Group();
    stagedRoot.add(new THREE.Mesh(stagedGeometry, new THREE.MeshStandardMaterial()));
    const resolveAsset = vi.fn(async (reference) => {
      if (reference.id === "asset-two") throw new Error("simulated storage failure");
      return { object: stagedRoot, importSource: {}, metadata: {}, masterAssetId: assetIds[0], runtimeAssetId: assetIds[0] } as unknown as ResolvedCaseAsset;
    });

    await expect(loadCasePackage(failed, { mode: "free-lab", resolveAsset })).rejects.toThrow(/simulated storage failure/i);
    expect(stagedDispose).toHaveBeenCalled();
    expect(geometryRegistry.getAll().map((entry) => entry.object)).toEqual(activeRoots);
    expect(geometryRegistry.getAll().map((entry) => String(entry.id))).toEqual(activeIds);
    expect(useWorkspaceStore.getState().objects.map((object) => object.id)).toEqual(beforeObjects);
  });

  it("routes Practice and Free Lab through the same package loader and retains legacy factories", async () => {
    const lesson = lessonSchema.parse({
      id: "package-crown-proof", databaseId: "123e4567-e89b-42d3-a456-426614174012", moduleId: "crown-workflow",
      title: { en: "Crown proof", sr: "Provera krunice" }, summary: { en: "Summary", sr: "Sažetak" }, goal: { en: "Goal", sr: "Cilj" },
      difficulty: "beginner", recommendedPrerequisites: [], estimatedMinutes: 5, assets: [],
      caseSetup: { source: "crown-case", objectMappings: [] },
      steps: [{ id: "proof", order: 1, title: { en: "Check", sr: "Provera" }, instructions: { en: "Review", sr: "Pregledajte" }, allowedTools: ["select"], targetObjectIds: [], hints: [], referenceModes: ["off"], validators: [] }],
    });
    const practiceIds = await initializePracticeLesson(lesson);
    expect(useWorkspaceStore.getState().mode).toBe("practice");
    const packageObjects = useWorkspaceStore.getState().objects;
    expect(packageObjects.find((object) => object.caseObjectId === "preparation")).toMatchObject({ caseRole: "SOURCE", role: "prepared_tooth", editable: false });
    expect(packageObjects.find((object) => object.caseObjectId === "adjacent-25")).toMatchObject({ caseRole: "SOURCE", role: "tooth", editable: false });
    expect(packageObjects.find((object) => object.caseObjectId === "antagonist-36")).toMatchObject({ caseRole: "SOURCE", role: "antagonist", editable: false });
    expect(packageObjects.find((object) => object.caseObjectId === "restoration")).toMatchObject({ caseRole: "DESIGN", role: "crown", editable: true });
    expect(packageObjects.find((object) => object.caseObjectId === "reference")).toMatchObject({ caseRole: "REFERENCE", role: "reference", editable: false, visible: false, caseReferenceState: "hidden" });
    expect(packageObjects.find((object) => object.caseObjectId === "insertion-axis")).toMatchObject({ caseRole: "GUIDE", role: "other", editable: false });

    const freeLabIds = await initializeFreeLabWorkspace({ workspaceId: "case-package-proof", origin: "scenario", scenarioId: "synthetic_posterior_crown_26", title: "Crown", category: "crown", casePackageId: "posterior-crown-26-v1", createdAt: new Date().toISOString() });
    expect(freeLabIds).toEqual(practiceIds);
    expect(useWorkspaceStore.getState().mode).toBe("free-lab");

    createCrownCase("practice");
    expect(useWorkspaceStore.getState().objects.map((object) => object.id)).toEqual(expect.arrayContaining(["crown26-preparation", "crown26-restoration", "crown26-reference"]));
  });
});

describe("canonical Case Package asset normalization", () => {
  it("leaves an identity-normalized asset unchanged", () => {
    const asset = resolvedTestAsset(new THREE.Matrix4().identity().toArray());
    const before = new THREE.Box3().setFromObject(asset.object);
    normalizeResolvedCaseAsset(asset);
    const after = new THREE.Box3().setFromObject(asset.object);
    expect(after.min.toArray()).toEqual(before.min.toArray());
    expect(after.max.toArray()).toEqual(before.max.toArray());
    expect(asset.normalizationState).toBe("canonical");
  });

  it("applies source orientation and cm-to-mm scale once before the Case Package transform", async () => {
    const manifest = testManifest();
    const referenceId = "normalized-candidate";
    const sourceUnit = "cm" as const;
    const originalToCanonical = new THREE.Matrix4()
      .makeTranslation(0, 5, 0)
      .multiply(new THREE.Matrix4().makeRotationZ(Math.PI / 2))
      .multiply(new THREE.Matrix4().makeScale(10, 10, 10))
      .toArray();
    manifest.assetRefs = [{ id: referenceId, assetId: "123e4567-e89b-42d3-a456-426614174091", required: true }];
    manifest.objects[0].source = { kind: "asset", assetRefId: referenceId };
    manifest.objects[0].transform = { position: [100, 0, 0], rotation: [0, 0, 0], scale: [2, 2, 2] };
    let sourceGeometry: THREE.BufferGeometry | undefined;
    const result = await loadCasePackage(manifest, {
      mode: "practice",
      resolveAsset: async () => {
        const asset = resolvedTestAsset(originalToCanonical, sourceUnit);
        sourceGeometry = (asset.object.children[0] as THREE.Mesh).geometry;
        return asset;
      },
    });

    const runtimeId = cadObjectId(result.ids[0]);
    const stats = geometryRegistry.stats(runtimeId);
    expect(stats).toMatchObject({ vertexCount: 3, triangleCount: 1, boundsMm: [10, 10, 0] });
    expect(useWorkspaceStore.getState().objects.find((object) => object.id === runtimeId)?.transform).toEqual(manifest.objects[0].transform);
    expect(sourceGeometry?.getAttribute("position").getX(1)).toBe(1);

    const canonicalPoint = new THREE.Vector3(1, 0, 0).applyMatrix4(new THREE.Matrix4().fromArray(originalToCanonical));
    const caseTransform = new THREE.Matrix4().compose(new THREE.Vector3(100, 0, 0), new THREE.Quaternion(), new THREE.Vector3(2, 2, 2));
    expect(canonicalPoint.toArray()).toEqual(expect.arrayContaining([expect.closeTo(0), 15, 0]));
    expect(canonicalPoint.applyMatrix4(caseTransform).toArray()).toEqual(expect.arrayContaining([100, 30, 0]));

    const reload = await loadCasePackage(manifest, {
      mode: "practice",
      resolveAsset: async () => resolvedTestAsset(originalToCanonical, sourceUnit),
    });
    expect(reload.ids).toEqual(result.ids);
    expect(geometryRegistry.stats(runtimeId).boundsMm).toEqual([10, 10, 0]);
    expect(geometryRegistry.get(runtimeId)?.object.userData.prostheiaCoordinateSpace).toBe("canonical");
  });

  it("rejects malformed, non-finite, singular, and reflected transforms", () => {
    expect(() => validateOriginalToCanonical([1, 2, 3])).toThrow(/16 finite matrix values/i);
    expect(() => validateOriginalToCanonical([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, Number.NaN, 0, 0, 0, 0, 1])).toThrow(/16 finite matrix values/i);
    expect(() => validateOriginalToCanonical(new THREE.Matrix4().makeScale(1, 0, 1).toArray())).toThrow(/invertible/i);
    expect(() => validateOriginalToCanonical(new THREE.Matrix4().makeScale(-1, 1, 1).toArray())).toThrow(/reflection/i);
  });

  it("disposes failed normalization resources and preserves the active workspace", async () => {
    const active = testManifest();
    await loadCasePackage(active, { mode: "practice" });
    const activeRoots = geometryRegistry.getAll().map((entry) => entry.object);
    const activeObjects = useWorkspaceStore.getState().objects.map((object) => object.id);
    const failed = testManifest();
    const referenceId = "bad-normalization";
    failed.assetRefs = [{ id: referenceId, assetId: "123e4567-e89b-42d3-a456-426614174092", required: true }];
    failed.objects[0].source = { kind: "asset", assetRefId: referenceId };
    const { root, geometry } = sourceTriangle();
    const dispose = vi.spyOn(geometry, "dispose");
    const badTransform = new THREE.Matrix4().identity().toArray().slice(0, 15);

    await expect(loadCasePackage(failed, {
      mode: "free-lab",
      resolveAsset: async () => ({
        object: root,
        importSource: undefined as unknown as ResolvedCaseAsset["importSource"],
        metadata: {} as ResolvedCaseAsset["metadata"],
        masterAssetId: null,
        runtimeAssetId: "123e4567-e89b-42d3-a456-426614174092",
        originalToCanonical: badTransform,
        normalizationState: "source",
      } as ResolvedCaseAsset),
    })).rejects.toThrow(/16 finite matrix values/i);

    expect(dispose).toHaveBeenCalledOnce();
    expect(geometryRegistry.getAll().map((entry) => entry.object)).toEqual(activeRoots);
    expect(useWorkspaceStore.getState().objects.map((object) => object.id)).toEqual(activeObjects);
  });
});
