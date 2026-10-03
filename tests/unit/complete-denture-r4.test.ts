import * as THREE from "three";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { afterEach, describe, expect, it } from "vitest";

import { useCurveStore } from "@/cad/curves/store";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import { caseAssetMetadataSchema } from "@/cad/case-packages/contract";
import { COMPLETE_DENTURE_R4_PACKAGES } from "@/cad/case-packages/definitions/complete-denture-r4";
import { FIXED_PROSTHETICS_R3_PACKAGES } from "@/cad/case-packages/definitions/fixed-prosthetics-r3";
import { caseObjectRuntimeId } from "@/cad/case-packages/identity";
import { loadCasePackage } from "@/cad/case-packages/loader";
import { PRIVATE_DENTURE_TOOTH_ASSETS, getPrivateTrainingAsset } from "@/cad/case-packages/private-asset-catalog";
import { geometryRegistry } from "@/cad/scene/geometry-registry";
import { FREE_LAB_SCENARIOS, selectRandomScenario } from "@/free-lab/scenarios";
import { mergeLocalFreeLabScenarios } from "@/free-lab/database-scenarios";
import { COMPLETE_DENTURE_R4_LESSONS } from "@/practice/complete-denture-r4-lessons";
import { PARTIAL_DENTURE_R5_LESSONS } from "@/practice/partial-denture-r5-lessons";
import { mergeLocalPracticeLessons } from "@/practice/database-catalog";
import { runStepValidators } from "@/practice/validators";
import { completeDentureToothPosition, createR4DentureBase, createR4EdentulousArch } from "@/cad/denture/r4-geometry";

afterEach(() => {
  useCurveStore.getState().replace({ curves: [], activeCurveId: null });
  geometryRegistry.clear();
  useWorkspaceStore.getState().resetDemo();
});

function r4AssetResolver(loadedIds: string[] = [], useRuntimeGlbs = false) {
  const loader = new GLTFLoader();
  return async (reference: { id: string; runtimeAssetId?: string }) => {
    const asset = getPrivateTrainingAsset(reference.runtimeAssetId ?? "");
    if (!asset) throw new Error("Unmapped private denture-tooth reference: " + reference.id);
    loadedIds.push(asset.id);
    let root: THREE.Object3D;
    if (useRuntimeGlbs) {
      const file = readFileSync(resolve(process.cwd(), "src/cad/case-packages/private-v1/runtime", asset.runtimeFile));
      root = (await loader.parseAsync(Uint8Array.from(file).buffer, "")).scene;
    } else {
      root = new THREE.Group();
      root.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial()));
    }
    return {
      object: root,
      importSource: {} as never,
      metadata: caseAssetMetadataSchema.parse({
        assetId: asset.id, bucketId: "private-training-assets", objectPath: asset.runtimeFile, format: "glb",
        sourceUnit: "unknown", canonicalUnit: "mm", unitScaleToMm: null,
        coordinateSystem: { id: "unknown", handedness: "unknown", upAxis: "unknown" },
        bounds: { min: asset.runtimeBoundsMm.min, max: asset.runtimeBoundsMm.max, unit: "mm" },
        statistics: { vertexCount: asset.runtimeVertexCount, triangleCount: asset.runtimeTriangleCount },
        provenance: { status: "recorded", source: "University of Dundee, School of Dentistry", sourceUrl: asset.originalUrl, attribution: asset.attribution },
        license: { status: "reviewed", name: asset.licenseName, url: asset.licenseUrl, commercialUseAllowed: true, modificationAllowed: true, redistributionAllowed: true },
        expertReview: "not_reviewed", segmentation: [],
        technicalMetadata: { sourceTitle: asset.title, sourceUid: asset.uid, sourceObjChecksum: asset.sourceObjChecksum, proposedFdi: asset.proposedFdi, morphologyQaStatus: asset.morphologyQaStatus, reviewStatus: asset.reviewStatus, privateTrainingApproval: asset.assetState },
      }),
      masterAssetId: asset.derivedFromAssetId ?? asset.id,
      runtimeAssetId: asset.id,
      normalizationState: "canonical" as const,
    };
  };
}

describe("R4 complete denture packages", () => {
  it("keeps 16 crown-only private denture-tooth derivatives attributed and source-linked", async () => {
    expect(PRIVATE_DENTURE_TOOTH_ASSETS).toHaveLength(16);
    expect(PRIVATE_DENTURE_TOOTH_ASSETS.every((asset) => asset.assetState === "private_training_approved"
      && asset.originalOrDerived === "derived_training_geometry" && asset.derivedFromAssetId
      && asset.licenseName === "CC BY 4.0" && asset.uid && asset.originalUrl && asset.attribution
      && asset.sourceObjChecksum && asset.runtimeChecksum && asset.runtimeBoundsMm && asset.runtimeVertexCount > 0 && asset.runtimeTriangleCount > 0)).toBe(true);
    const loader = new GLTFLoader();
    for (const asset of PRIVATE_DENTURE_TOOTH_ASSETS) {
      const file = readFileSync(resolve(process.cwd(), "src/cad/case-packages/private-v1/runtime", asset.runtimeFile));
      expect(createHash("sha256").update(file).digest("hex")).toBe(asset.runtimeChecksum);
      const arrayBuffer = Uint8Array.from(file).buffer;
      const gltf = await loader.parseAsync(arrayBuffer, "");
      let meshes = 0;
      gltf.scene.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        meshes += 1;
        const geometry = object.geometry as THREE.BufferGeometry;
        const positions = geometry.getAttribute("position");
        const normals = geometry.getAttribute("normal");
        const index = geometry.index;
        expect(normals.count).toBe(positions.count);
        expect([...normals.array].every(Number.isFinite)).toBe(true);
        geometry.computeBoundingBox();
        expect(geometry.boundingBox?.min.z).toBeCloseTo(-0.35, 3);
        expect(geometry.boundingBox?.max.z).toBeGreaterThan(0);
        expect(index).toBeDefined();
        const edgeUses = new Map<string, { count: number; direction: number }>();
        let signedVolume = 0;
        for (let i = 0; i < index!.count; i += 3) {
          const ids = [index!.getX(i), index!.getX(i + 1), index!.getX(i + 2)];
          const a = new THREE.Vector3().fromBufferAttribute(positions, ids[0]);
          const b = new THREE.Vector3().fromBufferAttribute(positions, ids[1]);
          const c = new THREE.Vector3().fromBufferAttribute(positions, ids[2]);
          signedVolume += a.dot(b.clone().cross(c)) / 6;
          for (let edge = 0; edge < 3; edge += 1) {
            const from = ids[edge]; const to = ids[(edge + 1) % 3];
            const edgeKey = [from, to].sort((left, right) => left - right).join(":");
            const use = edgeUses.get(edgeKey) ?? { count: 0, direction: 0 };
            use.count += 1; use.direction += from < to ? 1 : -1; edgeUses.set(edgeKey, use);
          }
        }
        expect([...edgeUses.values()].every((use) => use.count === 2 && use.direction === 0)).toBe(true);
        expect(signedVolume).toBeGreaterThan(0);
        const accelerated = geometry as THREE.BufferGeometry & { computeBoundsTree: (options?: { targetLeafSize?: number }) => unknown; boundsTree?: unknown; disposeBoundsTree: () => void };
        accelerated.computeBoundsTree({ targetLeafSize: 12 });
        expect(accelerated.boundsTree).toBeDefined();
        accelerated.disposeBoundsTree();
      });
      expect(meshes).toBeGreaterThan(0);
    }
  });

  it("maps FDI right and left quadrants consistently for upper and lower denture teeth", () => {
    for (const { arch, quadrants } of [
      { arch: "upper" as const, quadrants: [1, 2] },
      { arch: "lower" as const, quadrants: [3, 4] },
    ]) {
      for (const quadrant of quadrants) {
        const expectedSide = quadrant === 1 || quadrant === 4 ? -1 : 1;
        const teeth = Array.from({ length: 7 }, (_, index) => quadrant * 10 + index + 1);
        const positions = teeth.map((fdi) => completeDentureToothPosition(fdi, arch, "balanced"));
        expect(new Set(positions.map(({ position }) => position.join(","))).size).toBe(teeth.length);
        expect(positions.every(({ position, rotation, scale }) =>
          Math.sign(position[0]) === expectedSide &&
          [...position, ...rotation, ...scale].every(Number.isFinite),
        )).toBe(true);
        expect(positions.map(({ position }) => Math.abs(position[0]))).toEqual(
          [...positions.map(({ position }) => Math.abs(position[0]))].sort((a, b) => a - b),
        );
        expect(positions.every(({ rotation }) => rotation[0] === (arch === "upper" ? Math.PI : 0))).toBe(true);
      }
    }
  });

  it("keeps neighboring R4 crown bounds from severe interpenetration", () => {
    for (const manifest of COMPLETE_DENTURE_R4_PACKAGES) {
      const placed = new Map<number, THREE.Box3>();
      for (const tooth of manifest.objects.filter((object) => object.cadRole === "denture_tooth")) {
        const assetRefId = "assetRefId" in tooth.source ? tooth.source.assetRefId : undefined;
        if (!assetRefId) throw new Error(`R4 tooth FDI ${tooth.dental?.fdi} must use an asset source.`);
        const reference = manifest.assetRefs.find((asset) => asset.id === assetRefId);
        if (!reference?.runtimeAssetId) throw new Error(`Missing asset reference for FDI ${tooth.dental?.fdi}.`);
        const asset = getPrivateTrainingAsset(reference.runtimeAssetId);
        expect(asset, `Missing source asset for FDI ${tooth.dental?.fdi}`).toBeDefined();
        const bounds = new THREE.Box3(
          new THREE.Vector3(...asset!.runtimeBoundsMm.min),
          new THREE.Vector3(...asset!.runtimeBoundsMm.max),
        );
        const matrix = new THREE.Matrix4().compose(
          new THREE.Vector3(...tooth.transform.position),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(...tooth.transform.rotation)),
          new THREE.Vector3(...tooth.transform.scale),
        );
        expect(placed.has(tooth.dental!.fdi!)).toBe(false);
        placed.set(tooth.dental!.fdi!, bounds.applyMatrix4(matrix));
      }

      const adjacentPairs: [number, number][] = [];
      for (const quadrant of [1, 2, 3, 4]) {
        for (let position = 1; position < 7; position += 1) adjacentPairs.push([quadrant * 10 + position, quadrant * 10 + position + 1]);
      }
      adjacentPairs.push([11, 21], [31, 41]);
      for (const [firstFdi, secondFdi] of adjacentPairs) {
        const first = placed.get(firstFdi)!;
        const second = placed.get(secondFdi)!;
        const overlap = first.clone().intersect(second);
        const size = overlap.isEmpty() ? new THREE.Vector3() : overlap.getSize(new THREE.Vector3());
        const overlapVolume = size.x * size.y * size.z;
        const firstSize = first.getSize(new THREE.Vector3());
        const secondSize = second.getSize(new THREE.Vector3());
        const smallerVolume = Math.min(firstSize.x * firstSize.y * firstSize.z, secondSize.x * secondSize.y * secondSize.z);
        const overlapRatio = overlapVolume / smallerVolume;
        expect(overlapRatio, `R4 FDI ${firstFdi}/${secondFdi} crown-bounds overlap ${overlapRatio.toFixed(3)}`).toBeLessThan(0.15);
      }
    }
  });

  it("places each R4 support on the root side of opposing crown-only tooth cut planes", () => {
    for (const manifest of COMPLETE_DENTURE_R4_PACKAGES) {
      const byId = new Map(manifest.objects.map((object) => [object.id, object]));
      const upperTooth = byId.get("tooth-11")!;
      const lowerTooth = byId.get("tooth-41")!;
      const upperRootPlaneZ = upperTooth.transform.position[2] + 0.35;
      const lowerRootPlaneZ = lowerTooth.transform.position[2] - 0.35;
      expect(upperRootPlaneZ).toBeGreaterThan(0);
      expect(lowerRootPlaneZ).toBeLessThan(0);
      const upperSource = byId.get("source-upper-arch")!;
      const lowerSource = byId.get("source-lower-arch")!;
      const upperBase = byId.get("base-upper")!;
      const lowerBase = byId.get("base-lower")!;
      const morphology = upperSource.workflowMetadata.morphology as "balanced" | "resorbed";

      const worldBounds = (group: THREE.Group, position: [number, number, number]) => {
        group.position.set(...position);
        group.updateMatrixWorld(true);
        return new THREE.Box3().setFromObject(group);
      };
      const upperSourceBounds = worldBounds(createR4EdentulousArch("upper", morphology), upperSource.transform.position);
      const lowerSourceBounds = worldBounds(createR4EdentulousArch("lower", morphology), lowerSource.transform.position);
      const upperBaseBounds = worldBounds(createR4DentureBase("upper", morphology), upperBase.transform.position);
      const lowerBaseBounds = worldBounds(createR4DentureBase("lower", morphology), lowerBase.transform.position);

      expect(upperSourceBounds.min.z).toBeGreaterThanOrEqual(upperRootPlaneZ - 0.02);
      expect(upperBaseBounds.min.z).toBeGreaterThanOrEqual(upperRootPlaneZ - 0.02);
      expect(lowerSourceBounds.max.z).toBeLessThanOrEqual(lowerRootPlaneZ + 0.02);
      expect(lowerBaseBounds.max.z).toBeLessThanOrEqual(lowerRootPlaneZ + 0.02);
    }
  });

  it("defines three distinct packages with 28 individually editable semantic tooth objects and ten staged checkpoints", () => {
    expect(COMPLETE_DENTURE_R4_PACKAGES).toHaveLength(3);
    for (const manifest of COMPLETE_DENTURE_R4_PACKAGES) {
      const teeth = manifest.objects.filter((object) => object.caseRole === "DESIGN" && object.cadRole === "denture_tooth");
      expect(teeth).toHaveLength(28);
      expect(new Set(teeth.map((object) => object.dental?.fdi)).size).toBe(28);
      expect(teeth.every((object) => object.editable && object.source.kind === "asset" && object.workflowMetadata.denturePart === "tooth" && object.workflowMetadata.individualPositioning === true)).toBe(true);
      expect(manifest.objects.filter((object) => object.caseRole === "SOURCE" && object.workflowMetadata.denturePart === "arch")).toHaveLength(2);
      expect(manifest.objects.filter((object) => object.caseRole === "DESIGN" && object.cadRole === "denture_base" && object.editable)).toHaveLength(2);
      expect(manifest.objects.some((object) => object.caseRole === "GUIDE" && object.workflowMetadata.denturePart === "plane")).toBe(true);
      expect(manifest.objects.some((object) => object.caseRole === "REFERENCE")).toBe(true);
      expect(manifest.checkpoints.map((checkpoint) => checkpoint.id)).toEqual([
        "case_inspection", "occlusal_plane", "anterior_setup", "posterior_setup", "static_occlusion",
        "borders", "base", "polished_surface", "final_occlusion", "full_denture_case",
      ]);
      expect(manifest.validationBindings.every((binding) => binding.objectIds.every((id) => manifest.objects.some((object) => object.id === id)))).toBe(true);
      expect(manifest.labOrder?.notes?.en).toContain("Fictional synthetic educational case");
      expect(manifest.labOrder?.educationalDisclaimer.en).toContain("not patient-specific");
    }
    expect(COMPLETE_DENTURE_R4_PACKAGES.map((manifest) => manifest.objects.find((object) => object.id === "source-upper-arch")?.source).filter((source) => source?.kind === "procedural").length).toBe(3);
    expect(COMPLETE_DENTURE_R4_PACKAGES[0].objects.find((object) => object.id === "tooth-33")?.workflowMetadata.trainingApproximation).toContain("maxillary canine");
    const lowerArchPositions = COMPLETE_DENTURE_R4_PACKAGES.map((manifest) => manifest.objects.find((object) => object.id === "source-lower-arch")!.transform.position);
    expect(lowerArchPositions.map(([x, y]) => [x, y])).toEqual([[0, 0], [0, 0], [3, 1]]);
    expect(lowerArchPositions.map(([, , z]) => z)).toEqual([-18, -18, -19].map((offset) => offset + 8.65 - 4.6 * 1.182));
  });

  it("uses different visibility states for staged checkpoints and clears geometry when cases switch", async () => {
    const manifest = COMPLETE_DENTURE_R4_PACKAGES[0];
    const distinct: string[] = [];
    for (const checkpointId of ["case_inspection", "occlusal_plane", "anterior_setup", "posterior_setup", "base", "full_denture_case"]) {
      await loadCasePackage(manifest, { mode: "practice", checkpointId, resolveAsset: r4AssetResolver() });
      const objects = useWorkspaceStore.getState().objects;
      expect(objects).toHaveLength(manifest.objects.length);
      distinct.push(objects.filter((object) => object.visible).map((object) => object.caseObjectId).sort().join(","));
    }
    expect(new Set(distinct).size).toBeGreaterThanOrEqual(5);
    expect(geometryRegistry.getAll()).toHaveLength(useWorkspaceStore.getState().objects.length);
    const crown = FIXED_PROSTHETICS_R3_PACKAGES.find((item) => item.packageId === "r3-crown-26-v1")!;
    const loaded = await loadCasePackage(crown, { mode: "free-lab", checkpointId: "proposal_ready", resolveAsset: r4AssetResolver() });
    expect(geometryRegistry.getAll().map((entry) => String(entry.id)).sort()).toEqual([...loaded.ids].sort());
    expect(useWorkspaceStore.getState().objects.every((object) => object.casePackageId === crown.packageId)).toBe(true);
  });

  it("loads an entire Free Lab package from real GLBs, prepares registered geometry, then disposes it on switching", async () => {
    const manifest = COMPLETE_DENTURE_R4_PACKAGES[0];
    const loadedAssetIds: string[] = [];
    const started = performance.now();
    const loaded = await loadCasePackage(manifest, { mode: "free-lab", checkpointId: "full_denture_case", resolveAsset: r4AssetResolver(loadedAssetIds, true) });
    expect(loadedAssetIds).toHaveLength(16);
    expect(new Set(loadedAssetIds).size).toBe(16);
    expect(useWorkspaceStore.getState().objects.filter((object) => object.denturePart === "tooth")).toHaveLength(28);
    expect(geometryRegistry.getAll()).toHaveLength(loaded.ids.length);
    const toothMeshes = useWorkspaceStore.getState().objects.filter((object) => object.denturePart === "tooth").flatMap((tooth) => {
      const meshes = geometryRegistry.getMeshes(tooth.id);
      expect(meshes.length).toBeGreaterThan(0);
      expect(meshes[0].geometry.getAttribute("position").count).toBeGreaterThan(1000);
      return meshes.map(({ geometry }) => geometry as THREE.BufferGeometry & { boundsTree?: unknown });
    });
    const bvhDeadline = Date.now() + 5000;
    while (!toothMeshes.every((geometry) => geometry.boundsTree) && Date.now() < bvhDeadline) {
      await new Promise<void>((resolve) => setTimeout(resolve, 20));
    }
    expect(toothMeshes.every((geometry) => geometry.boundsTree)).toBe(true);
    const elapsedMs = performance.now() - started;
    expect(elapsedMs).toBeGreaterThan(0);
    const r3 = FIXED_PROSTHETICS_R3_PACKAGES.find((item) => item.packageId === "r3-crown-26-v1")!;
    const replacement = await loadCasePackage(r3, { mode: "free-lab", checkpointId: "proposal_ready", resolveAsset: r4AssetResolver() });
    expect(geometryRegistry.getAll().map((entry) => String(entry.id)).sort()).toEqual([...replacement.ids].sort());
    expect(useWorkspaceStore.getState().objects.every((object) => object.casePackageId === r3.packageId)).toBe(true);
  });

  it("publishes ten practical EN/SR Practice lessons and three distinct Random Case Free Lab packages", async () => {
    expect(COMPLETE_DENTURE_R4_LESSONS).toHaveLength(10);
    expect(COMPLETE_DENTURE_R4_LESSONS.every((lesson) => lesson.steps.every((step) => step.title.en && step.title.sr && step.instructions.en && step.instructions.sr && step.theory?.en && step.theory?.sr))).toBe(true);
    const scenarios = FREE_LAB_SCENARIOS.filter((scenario) => scenario.casePackageId?.startsWith("r4-complete-denture-"));
    expect(scenarios).toHaveLength(3);
    expect(new Set(scenarios.map((scenario) => scenario.casePackageId)).size).toBe(3);
    expect(scenarios.every((scenario) => scenario.randomEligible && scenario.category === "complete_denture" && scenario.brief.patientCode.startsWith("PT-EDU-R4-"))).toBe(true);
    expect(scenarios.every((scenario) => scenario.brief.targetTeeth.length === 28 && scenario.brief.notes?.en.toLowerCase().includes("fictional"))).toBe(true);
    for (const scenario of scenarios) {
      const manifest = COMPLETE_DENTURE_R4_PACKAGES.find((item) => item.packageId === scenario.casePackageId)!;
      const loaded = await loadCasePackage(manifest, { mode: "free-lab", checkpointId: scenario.startingCheckpointId, resolveAsset: r4AssetResolver() });
      expect(loaded.manifest.packageId).toBe(scenario.casePackageId);
    }
    expect(selectRandomScenario(scenarios, "complete_denture", "intermediate", () => 0)?.casePackageId).toBe("r4-complete-denture-balanced-v1");
    expect(selectRandomScenario(scenarios, "complete_denture", "advanced", () => 0)?.casePackageId).toBe("r4-complete-denture-resorbed-v1");
  });

  it("merges local R4 content into database-backed page catalogs without duplicating slugs", () => {
    const databaseLesson = { ...COMPLETE_DENTURE_R4_LESSONS[0], title: { en: "Stale database copy", sr: "Zastarela kopija baze" } };
    const lessons = mergeLocalPracticeLessons([databaseLesson]);
    const r4Lessons = lessons.filter((lesson) => lesson.id.startsWith("r4-complete-denture-"));
    expect(r4Lessons).toHaveLength(COMPLETE_DENTURE_R4_LESSONS.length);
    expect(r4Lessons.find((lesson) => lesson.id === databaseLesson.id)?.title).toEqual(COMPLETE_DENTURE_R4_LESSONS[0].title);
    expect(lessons.filter((lesson) => lesson.id.startsWith("r5-partial-denture-")).length).toBe(PARTIAL_DENTURE_R5_LESSONS.length);

    const r4Scenarios = FREE_LAB_SCENARIOS.filter((scenario) => scenario.casePackageId?.startsWith("r4-complete-denture-"));
    const databaseScenario = { ...r4Scenarios[0], title: { en: "Stale database order", sr: "Zastareli nalog baze" } };
    const scenarios = mergeLocalFreeLabScenarios([databaseScenario]);
    const mergedR4Scenarios = scenarios.filter((scenario) => scenario.casePackageId?.startsWith("r4-complete-denture-"));
    expect(mergedR4Scenarios).toHaveLength(r4Scenarios.length);
    expect(mergedR4Scenarios.find((scenario) => scenario.id === databaseScenario.id)?.title).toEqual(r4Scenarios[0].title);
    expect(scenarios.filter((scenario) => scenario.casePackageId?.startsWith("r5-partial-denture-kennedy-")).length).toBe(4);
  });

  it("checks the package plane, editable FDI setup, borders and base geometry through Design Check", async () => {
    const manifest = COMPLETE_DENTURE_R4_PACKAGES[0];
    await loadCasePackage(manifest, { mode: "practice", checkpointId: "occlusal_plane", resolveAsset: r4AssetResolver() });
    const planeLesson = COMPLETE_DENTURE_R4_LESSONS.find((lesson) => lesson.id === "r4-complete-denture-occlusal-plane")!;
    const planeStep = planeLesson.steps[0];
    expect(runStepValidators(planeLesson, planeStep)[0].outcome).toBe("fail");
    useWorkspaceStore.getState().applyTransform(caseObjectRuntimeId(manifest.caseId, "guide-occlusal-plane"), { position: [0, 0, 9], rotation: [0, 0, 0], scale: [1, 1, 1] });
    expect(runStepValidators(planeLesson, planeStep)[0].outcome).toBe("pass");

    await loadCasePackage(manifest, { mode: "practice", checkpointId: "anterior_setup", resolveAsset: r4AssetResolver() });
    const setupLesson = COMPLETE_DENTURE_R4_LESSONS.find((lesson) => lesson.id === "r4-complete-denture-anterior-setup")!;
    expect(runStepValidators(setupLesson, setupLesson.steps[0]).map((result) => result.outcome)).toEqual(["fail", "fail"]);
    for (const objectId of ["tooth-11", "tooth-41"]) {
      const id = caseObjectRuntimeId(manifest.caseId, objectId);
      const object = useWorkspaceStore.getState().objects.find((candidate) => candidate.id === id)!;
      useWorkspaceStore.getState().applyTransform(id, { ...object.transform, position: [object.transform.position[0] + 0.4, ...object.transform.position.slice(1)] as [number, number, number] });
    }
    expect(runStepValidators(setupLesson, setupLesson.steps[0]).map((result) => result.outcome)).toEqual(["pass", "pass"]);

    await loadCasePackage(manifest, { mode: "practice", checkpointId: "base", resolveAsset: r4AssetResolver() });
    const sourceIds = { upper: caseObjectRuntimeId(manifest.caseId, "source-upper-arch"), lower: caseObjectRuntimeId(manifest.caseId, "source-lower-arch") };
    useCurveStore.getState().replace({
      activeCurveId: null,
      curves: (["upper", "lower"] as const).map((arch) => ({
        id: "r4-border-" + arch, kind: "boundary" as const, coordinateSpace: "object-local" as const, objectId: sourceIds[arch],
        points: [[-8, -12, 0], [0, 16, 0], [8, -12, 0]], closed: true,
      })),
    });
    const baseLesson = COMPLETE_DENTURE_R4_LESSONS.find((lesson) => lesson.id === "r4-complete-denture-denture-bases")!;
    expect(runStepValidators(baseLesson, baseLesson.steps[0])[0].outcome).toBe("pass");
  });

  it("creates dental arch and base meshes with separate tissue and polished surface components", () => {
    const upper = createR4EdentulousArch("upper", "balanced");
    const lower = createR4EdentulousArch("lower", "resorbed");
    const upperBase = createR4DentureBase("upper", "balanced");
    const lowerBase = createR4DentureBase("lower", "resorbed");
    expect(upper.children.map((child) => child.name)).toEqual(expect.arrayContaining(["Maxillary residual ridge · vestibular and crest form", "Palatal vault · synthetic educational surface"]));
    expect(lower.children.map((child) => child.name)).toEqual(expect.arrayContaining(["Mandibular residual ridge · buccal and lingual form", "Lingual support shelf · synthetic tissue form", "Retromolar support region · left exercise geometry", "Retromolar support region · right exercise geometry"]));
    for (const group of [upper, lower, upperBase, lowerBase]) {
      expect(group.children.every((child) => child instanceof THREE.Mesh)).toBe(true);
      expect(group.children.every((child) => (child as THREE.Mesh).geometry.getAttribute("position").count > 400)).toBe(true);
      expect(group.children.every((child) => (child as THREE.Mesh).geometry.getAttribute("normal").count > 0)).toBe(true);
    }
    expect(upperBase.children.map((child) => child.name)).toContain("Tissue-side adaptation surface · exercise representation");
    expect(upperBase.children.map((child) => child.name)).toContain("Polished external surface · simplified shell");
    expect(lowerBase.children.map((child) => child.name)).toContain("Lower denture lingual flange · tissue-side adaptation surface");
  });
});
