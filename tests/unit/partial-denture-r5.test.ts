import * as THREE from "three";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { afterEach, describe, expect, it } from "vitest";

import { useAnalysisStore } from "@/cad/analysis/state";
import { computeDirectionalUndercut } from "@/cad/analysis/analysis.worker";
import { snapshotMesh } from "@/cad/analysis/geometry";
import { useCurveStore } from "@/cad/curves/store";
import { caseAssetMetadataSchema, casePackageManifestSchema } from "@/cad/case-packages/contract";
import { PARTIAL_DENTURE_R5_PACKAGES } from "@/cad/case-packages/definitions/partial-denture-r5";
import { loadCasePackage } from "@/cad/case-packages/loader";
import { getPrivateTrainingAsset } from "@/cad/case-packages/private-asset-catalog";
import { createR5ResidualArch, rpdArchTeeth, rpdToothPosition } from "@/cad/partial-denture/r5-geometry";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import { geometryRegistry } from "@/cad/scene/geometry-registry";
import { useRestorativeSetupStore } from "@/cad/restorative/types";
import { usePartialDentureStore } from "@/cad/partial-denture/types";
import { cadObjectId } from "@/cad/types";
import { PARTIAL_DENTURE_R5_SCENARIOS, FREE_LAB_SCENARIOS, validateFreeLabScenario } from "@/free-lab/scenarios";
import { mergeLocalFreeLabScenarios } from "@/free-lab/database-scenarios";
import { PARTIAL_DENTURE_R5_LESSONS } from "@/practice/partial-denture-r5-lessons";
import { mergeLocalPracticeLessons } from "@/practice/database-catalog";
import { lessonSchema } from "@/practice/types";
import { runStepValidators } from "@/practice/validators";

const byClass = new Map(PARTIAL_DENTURE_R5_PACKAGES.map((manifest, index) => [["I", "II", "III", "IV"][index], manifest]));

function fakeAssetResolver() {
  return async (reference: { id: string; runtimeAssetId?: string }) => {
    const asset = getPrivateTrainingAsset(reference.runtimeAssetId ?? "");
    if (!asset) throw new Error(`Unknown private RPD tooth form ${reference.id}.`);
    const root = new THREE.Group();
    root.name = `Private training tooth ${asset.proposedFdi}`;
    const geometry = new THREE.SphereGeometry(2.2, 18, 12);
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: "#eee5d6", roughness: 0.5 }));
    mesh.userData.prostheiaMeshId = `training-tooth-${asset.proposedFdi}`;
    root.add(mesh);
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
        expertReview: "not_reviewed", segmentation: [], technicalMetadata: { sourceTitle: asset.title, sourceUid: asset.uid, assetState: asset.assetState },
      }),
      masterAssetId: asset.derivedFromAssetId ?? asset.id,
      runtimeAssetId: asset.id,
      normalizationState: "canonical" as const,
    };
  };
}

function realGlbAssetResolver() {
  const loader = new GLTFLoader();
  return async (reference: { id: string; runtimeAssetId?: string }) => {
    const asset = getPrivateTrainingAsset(reference.runtimeAssetId ?? "");
    if (!asset) throw new Error(`Unknown private RPD tooth form ${reference.id}.`);
    const file = readFileSync(resolve(process.cwd(), "src/cad/case-packages/private-v1/runtime", asset.runtimeFile));
    const gltf = await loader.parseAsync(Uint8Array.from(file).buffer, "");
    return {
      object: gltf.scene,
      importSource: {} as never,
      metadata: caseAssetMetadataSchema.parse({
        assetId: asset.id, bucketId: "private-training-assets", objectPath: asset.runtimeFile, format: "glb",
        sourceUnit: "unknown", canonicalUnit: "mm", unitScaleToMm: null,
        coordinateSystem: { id: "unknown", handedness: "unknown", upAxis: "unknown" },
        bounds: { min: asset.runtimeBoundsMm.min, max: asset.runtimeBoundsMm.max, unit: "mm" },
        statistics: { vertexCount: asset.runtimeVertexCount, triangleCount: asset.runtimeTriangleCount },
        provenance: { status: "recorded", source: "University of Dundee, School of Dentistry", sourceUrl: asset.originalUrl, attribution: asset.attribution },
        license: { status: "reviewed", name: asset.licenseName, url: asset.licenseUrl, commercialUseAllowed: true, modificationAllowed: true, redistributionAllowed: true },
        expertReview: "not_reviewed", segmentation: [], technicalMetadata: { sourceTitle: asset.title, sourceUid: asset.uid, assetState: asset.assetState },
      }),
      masterAssetId: asset.derivedFromAssetId ?? asset.id,
      runtimeAssetId: asset.id,
      normalizationState: "canonical" as const,
    };
  };
}

async function loadClass(klass: "I" | "II" | "III" | "IV", checkpointId = "case_inspection", realAssets = false) {
  const manifest = byClass.get(klass)!;
  return loadCasePackage(manifest, {
    mode: "practice", checkpointId,
    resolveAsset: (realAssets ? realGlbAssetResolver() : fakeAssetResolver()) as never,
  });
}

afterEach(() => {
  useCurveStore.getState().replace({ curves: [], activeCurveId: null });
  useAnalysisStore.getState().clear();
  usePartialDentureStore.getState().reset();
  useRestorativeSetupStore.getState().configure({ restorationType: null, connectorWidthMm: 3, insertionDirection: [0, 0, 1], units: [] }, false);
  geometryRegistry.clear();
  useWorkspaceStore.getState().resetDemo();
});

describe("R5 package-backed Kennedy cases", () => {
  it("defines four distinct missing-tooth distributions, arch forms, and connector concepts", () => {
    expect(PARTIAL_DENTURE_R5_PACKAGES).toHaveLength(4);
    const expected = {
      I: { arch: "lower", missing: [36, 37, 46, 47], form: "lingual_bar", gaps: 2 },
      II: { arch: "lower", missing: [46, 47], form: "lingual_bar", gaps: 1 },
      III: { arch: "upper", missing: [24, 25], form: "palatal_strap", gaps: 1 },
      IV: { arch: "upper", missing: [11, 12, 21, 22], form: "horseshoe", gaps: 1 },
    } as const;
    const distributions = new Set<string>();
    for (const [klass, manifest] of byClass) {
      const parsed = casePackageManifestSchema.parse(manifest);
      expect(parsed.workflowType).toBe("partial_denture");
      expect(parsed.packageId).toBe(`r5-partial-denture-kennedy-${klass.toLowerCase()}-v1`);
      expect(parsed.labOrder?.targetTeeth).toEqual(expected[klass as keyof typeof expected].missing);
      expect(parsed.labOrder?.targetArch).toBe(expected[klass as keyof typeof expected].arch === "upper" ? "maxilla" : "mandible");
      expect(parsed.objects.find((object) => object.id === "source-arch")?.workflowMetadata.partialDentureArch).toBe(expected[klass as keyof typeof expected].arch);
      expect(parsed.objects.find((object) => object.id === "design-major-connector")?.workflowMetadata.partialDentureConnectorForm).toBe(expected[klass as keyof typeof expected].form);
      const toothIds = parsed.objects.filter((object) => object.caseRole === "SOURCE" && object.workflowMetadata.partialDenturePart === "tooth").map((object) => object.dental!.fdi!);
      const missing = expected[klass as keyof typeof expected].missing;
      expect(missing.every((tooth) => !toothIds.includes(tooth))).toBe(true);
      expect(toothIds.length).toBe(14 - missing.length);
      distributions.add(toothIds.sort((a, b) => a - b).join(","));
      for (const reference of parsed.assetRefs) expect(getPrivateTrainingAsset(reference.runtimeAssetId!)).toBeDefined();
    }
    expect(distributions.size).toBe(4);
    const classIII = byClass.get("III")!;
    const classIIIteeth = classIII.objects.map((object) => object.dental?.fdi).filter(Boolean);
    expect(classIIIteeth).toContain(23);
    expect(classIIIteeth).toContain(26);
    const classIV = byClass.get("IV")!;
    expect(classIV.labOrder?.targetTeeth).toEqual([11, 12, 21, 22]);
    expect(classIV.objects.filter((object) => object.workflowMetadata.partialDentureRestSurface === "cingulum")).toHaveLength(2);
  });

  it("keeps lower RPD tooth identity, placement, spacing, and gingiva on the cervical plane", async () => {
    const expectedClassIAssets = new Map<number, string>([
      [31, "d4000000-0000-5000-8000-000000000010"], [32, "d4000000-0000-5000-8000-000000000011"],
      [33, "d4000000-0000-5000-8000-000000000012"], [34, "d4000000-0000-5000-8000-000000000008"],
      [35, "d4000000-0000-5000-8000-000000000009"], [41, "d4000000-0000-5000-8000-000000000010"],
      [42, "d4000000-0000-5000-8000-000000000011"], [43, "d4000000-0000-5000-8000-000000001000"],
      [44, "d4000000-0000-5000-8000-000000000008"], [45, "d4000000-0000-5000-8000-000000000009"],
    ]);
    const expectedClassIScaleX = new Map<number, number>([[31, 1], [32, 1], [33, 1], [34, 1], [35, 1], [41, 1], [42, -1], [43, 1], [44, -1], [45, -1]]);
    const sourceBoundsByAsset = new Map<string, THREE.Box3>();
    const loader = new GLTFLoader();

    for (const klass of ["I", "II"] as const) {
      const manifest = byClass.get(klass)!;
      const teeth = manifest.objects.filter((object) => object.caseRole === "SOURCE" && object.workflowMetadata.partialDenturePart === "tooth");
      const fdis = teeth.map((object) => object.dental!.fdi!);
      expect(new Set(fdis).size).toBe(fdis.length);
      expect(fdis.every((fdi) => rpdArchTeeth("lower").includes(fdi))).toBe(true);
      const byFdi = new Map(teeth.map((object) => [object.dental!.fdi!, object]));
      const placedBounds = new Map<number, THREE.Box3>();
      const positionKeys = new Set<string>();

      for (const object of teeth) {
        const fdi = object.dental!.fdi!;
        const quadrant = Math.floor(fdi / 10);
        const expectedSide = quadrant === 3 ? 1 : -1;
        const [x, y, z] = object.transform.position;
        const [rx, ry, rz] = object.transform.rotation;
        const [sx, sy, sz] = object.transform.scale;
        expect(Math.sign(x)).toBe(expectedSide);
        expect([x, y, z, rx, ry, rz, sx, sy, sz].every(Number.isFinite)).toBe(true);
        expect(object.transform.position).toEqual(rpdToothPosition(fdi, "lower").position);
        expect(object.transform.rotation).toEqual(rpdToothPosition(fdi, "lower").rotation);
        const positionKey = object.transform.position.map((value) => value.toFixed(4)).join(",");
        expect(positionKeys.has(positionKey)).toBe(false);
        positionKeys.add(positionKey);

        const sourceRefId = object.source.kind === "asset" ? object.source.assetRefId : undefined;
        const reference = manifest.assetRefs.find((candidate) => candidate.id === sourceRefId);
        expect(reference?.runtimeAssetId).toBeDefined();
        if (klass === "I") {
          expect(reference?.runtimeAssetId).toBe(expectedClassIAssets.get(fdi));
          expect(sx).toBe(expectedClassIScaleX.get(fdi));
        }
        const asset = getPrivateTrainingAsset(reference!.runtimeAssetId!);
        expect(asset).toBeDefined();
        let sourceBounds = sourceBoundsByAsset.get(asset!.id);
        if (!sourceBounds) {
          const file = readFileSync(resolve(process.cwd(), "src/cad/case-packages/private-v1/runtime", asset!.runtimeFile));
          const gltf = await loader.parseAsync(Uint8Array.from(file).buffer, "");
          gltf.scene.updateMatrixWorld(true);
          sourceBounds = new THREE.Box3().setFromObject(gltf.scene);
          sourceBoundsByAsset.set(asset!.id, sourceBounds);
        }
        const matrix = new THREE.Matrix4().compose(
          new THREE.Vector3(x, y, z),
          new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)),
          new THREE.Vector3(sx, sy, sz),
        );
        placedBounds.set(fdi, sourceBounds.clone().applyMatrix4(matrix));
      }

      for (const quadrant of [3, 4]) {
        const sideTeeth = fdis.filter((fdi) => Math.floor(fdi / 10) === quadrant).sort((a, b) => a % 10 - b % 10);
        for (let index = 1; index < sideTeeth.length; index += 1) {
          const previousFdi = sideTeeth[index - 1];
          const currentFdi = sideTeeth[index];
          const previous = byFdi.get(previousFdi)!;
          const current = byFdi.get(currentFdi)!;
          const previousPosition = previous.transform.position;
          const currentPosition = current.transform.position;
          expect(Math.abs(currentPosition[0])).toBeGreaterThan(Math.abs(previousPosition[0]));
          expect(Math.hypot(currentPosition[0] - previousPosition[0], currentPosition[1] - previousPosition[1])).toBeGreaterThan(0);

          const first = placedBounds.get(previousFdi)!;
          const second = placedBounds.get(currentFdi)!;
          const overlap = first.clone().intersect(second);
          const size = overlap.isEmpty() ? new THREE.Vector3() : overlap.getSize(new THREE.Vector3());
          const overlapVolume = size.x * size.y * size.z;
          const firstSize = first.getSize(new THREE.Vector3());
          const secondSize = second.getSize(new THREE.Vector3());
          const smallerVolume = Math.min(firstSize.x * firstSize.y * firstSize.z, secondSize.x * secondSize.y * secondSize.z);
          const overlapRatio = overlapVolume / smallerVolume;
          expect(overlapRatio, `FDI ${previousFdi}/${currentFdi} bounding-box overlap ratio ${overlapRatio.toFixed(3)}; boxes ${firstSize.toArray().map((value) => value.toFixed(1))}/${secondSize.toArray().map((value) => value.toFixed(1))}; overlap ${size.toArray().map((value) => value.toFixed(1))}`).toBeLessThan(0.15);
        }
      }
    }

    for (const arch of ["upper", "lower"] as const) {
      const group = createR5ResidualArch(arch);
      const ridge = group.children.find((child): child is THREE.Mesh => child instanceof THREE.Mesh && child.name.includes("residual ridge"));
      expect(ridge).toBeDefined();
      ridge!.geometry.computeBoundingBox();
      const bounds = ridge!.geometry.boundingBox!;
      expect([bounds.min.x, bounds.min.y, bounds.min.z, bounds.max.x, bounds.max.y, bounds.max.z].every(Number.isFinite)).toBe(true);
      expect(Math.abs(bounds.min.x)).toBeLessThan(45);
      expect(Math.abs(bounds.max.x)).toBeLessThan(45);
      expect(bounds.min.y).toBeGreaterThan(-45);
      expect(bounds.max.y).toBeLessThan(25);
      if (arch === "upper") expect(bounds.min.z).toBeGreaterThan(0);
      else expect(bounds.max.z).toBeLessThan(0);
    }
  });

  it("loads each package into shared SOURCE, DESIGN, and GUIDE objects with stable semantic links", async () => {
    for (const klass of ["I", "II", "III", "IV"] as const) {
      const { ids } = await loadClass(klass, "final_review");
      const manifest = byClass.get(klass)!;
      const objects = useWorkspaceStore.getState().objects;
      expect(objects).toHaveLength(manifest.objects.length);
      expect(new Set(objects.map((object) => object.caseRole)).size).toBe(3);
      expect(objects.some((object) => object.caseRole === "SOURCE" && object.partialDenturePart === "arch" && object.role === (klass === "III" || klass === "IV" ? "maxilla" : "mandible"))).toBe(true);
      expect(objects.filter((object) => object.caseRole === "SOURCE" && object.partialDenturePart === "tooth").every((object) => !object.editable && object.partialDentureToothNumber && object.casePackageId === manifest.packageId)).toBe(true);
      expect(objects.filter((object) => object.caseRole === "DESIGN" && object.partialDenturePart === "rest")).toHaveLength(2);
      expect(objects.filter((object) => object.caseRole === "DESIGN" && object.partialDenturePart === "clasp")).toHaveLength(2);
      expect(objects.some((object) => object.caseRole === "DESIGN" && object.partialDenturePart === "major_connector" && object.partialDentureConnectorForm)).toBe(true);
      expect(objects.filter((object) => object.partialDenturePart === "saddle")).toHaveLength(klass === "I" ? 2 : 1);
      expect(objects.filter((object) => object.partialDenturePart === "retention_mesh")).toHaveLength(klass === "I" ? 2 : 1);
      expect(objects.every((object) => geometryRegistry.getMeshes(object.id).length > 0)).toBe(true);
      const setup = usePartialDentureStore.getState();
      expect(setup).toMatchObject({ kennedyClass: klass, packageId: manifest.packageId, arch: klass === "III" || klass === "IV" ? "upper" : "lower", surveyCompleted: true, blockoutApplied: true });
      expect(setup.abutmentObjectIds).toHaveLength(2);
      expect(setup.components.every((component) => component.id && component.curveId)).toBe(true);
      expect(useCurveStore.getState().curves.some((curve) => curve.kind === "framework_path" && curve.objectId === cadObjectId(setup.components[0].id))).toBe(true);
      expect(ids.map(String).sort()).toEqual(geometryRegistry.getAll().map((entry) => String(entry.id)).sort());
    }
  });

  it("stages survey, insertion, blockout, rests, connectors, clasps, saddles, mesh, and finish lines", async () => {
    const stages = ["case_inspection", "survey", "insertion_path", "contours", "undercuts", "blockout", "rests", "major_connector", "minor_connectors", "clasps", "saddle_mesh", "finish_lines", "final_review"];
    const visible: string[] = [];
    for (const stage of stages) {
      await loadClass("IV", stage);
      const objects = useWorkspaceStore.getState().objects;
      visible.push(objects.filter((object) => object.visible).map((object) => object.caseObjectId).sort().join(","));
      if (stage === "survey") expect(usePartialDentureStore.getState().surveyCompleted).toBe(true);
      if (stage === "insertion_path") expect(usePartialDentureStore.getState().insertionPathSelected).toBe(true);
      if (stage === "contours") expect(usePartialDentureStore.getState().contoursReviewed).toBe(true);
      if (stage === "undercuts") expect(usePartialDentureStore.getState().undercutsReviewed).toBe(true);
      if (stage === "blockout") expect(usePartialDentureStore.getState().blockoutApplied).toBe(true);
    }
    expect(new Set(visible).size).toBeGreaterThanOrEqual(10);
    const finalVisible = useWorkspaceStore.getState().objects.filter((object) => object.visible);
    expect(finalVisible.some((object) => object.partialDenturePart === "finish_line")).toBe(true);
    expect(finalVisible.some((object) => object.partialDenturePart === "major_connector")).toBe(true);
  });

  it("binds all R5 Design Check validators to package state and the shared undercut analysis", async () => {
    await loadClass("IV", "final_review");
    const lessons = PARTIAL_DENTURE_R5_LESSONS.filter((lesson) => lesson.id.startsWith("r5-partial-denture-iv-"));
    expect(lessons).toHaveLength(13);
    for (const lesson of lessons) {
      const step = lesson.steps[0];
      if (step.validators.some((validator) => "check" in validator && validator.check === "undercuts")) {
        expect(runStepValidators(lesson, step)[0].outcome).toBe("fail");
        const toothId = usePartialDentureStore.getState().abutmentObjectIds[0];
        const result = computeDirectionalUndercut(snapshotMesh(toothId), [0, 0, 1]);
        useAnalysisStore.getState().record(result);
      }
      expect(runStepValidators(lesson, step).map((result) => result.outcome)).toEqual(["pass"]);
    }
    const cases = ["survey", "insertion_path", "contours", "undercuts", "blockout", "rests", "major_connector", "minor_connectors", "clasps", "saddle_mesh", "finish_lines", "framework", "complete_case"];
    expect(new Set(cases).size).toBe(13);
    expect(PARTIAL_DENTURE_R5_PACKAGES.every((manifest) => cases.every((check) => manifest.validationBindings.some((binding) => binding.binding.kind === "inline" && binding.binding.validatorType === "partial_denture_setup" && binding.binding.config.check === check)))).toBe(true);
  });

  it("publishes four fictional package-backed Random Case briefs and 52 staged bilingual Practice lessons", () => {
    expect(PARTIAL_DENTURE_R5_SCENARIOS).toHaveLength(4);
    expect(FREE_LAB_SCENARIOS.filter((scenario) => scenario.casePackageId?.startsWith("r5-partial-denture-kennedy-")).map((scenario) => scenario.partialDentureClass)).toEqual(["I", "II", "III", "IV"]);
    for (const scenario of PARTIAL_DENTURE_R5_SCENARIOS) {
      expect(validateFreeLabScenario(scenario)).toBe(true);
      expect(scenario.casePackageId).toBeDefined();
      expect(scenario.startingCheckpointId).toBe("final_review");
      expect(scenario.brief.patientCode).toMatch(/^PT-EDU-R5-RPD/);
      expect(scenario.brief.notes?.en).toContain("PRIVATE EDUCATIONAL V1 ONLY");
    }
    const legacy = { ...PARTIAL_DENTURE_R5_SCENARIOS[0], id: "legacy-rpd", slug: "legacy_kennedy_i", casePackageId: undefined, startingCheckpointId: undefined };
    expect(mergeLocalFreeLabScenarios([legacy]).filter((scenario) => scenario.category === "partial_denture")).toHaveLength(4);

    expect(PARTIAL_DENTURE_R5_LESSONS).toHaveLength(52);
    for (const lesson of PARTIAL_DENTURE_R5_LESSONS) {
      const textEn = lesson.steps[0].instructions.en;
      const textSr = lesson.steps[0].instructions.sr;
      for (const section of ["WHAT:", "WHY:", "OBJECT:", "TOOL:", "ACTION:", "TARGET:", "CHECK:"]) expect(textEn).toContain(section);
      for (const section of ["ŠTA:", "ZAŠTO:", "OBJEKAT:", "ALAT:", "AKCIJA:", "CILJ:", "PROVERA:"]) expect(textSr).toContain(section);
      expect(lesson.caseSetup.casePackageId).toMatch(/^r5-partial-denture-kennedy-/);
      expect(lesson.caseSetup.checkpointId).toBeTruthy();
    }
    const oldPractice = lessonSchema.parse(lessonSchemaStub("legacy-rpd-lesson"));
    expect(mergeLocalPracticeLessons([oldPractice]).some((lesson) => lesson.id === oldPractice.id)).toBe(false);
    expect(mergeLocalPracticeLessons([]).filter((lesson) => lesson.id.startsWith("r5-partial-denture-")).length).toBe(52);
  });

  it("loads private Dundee GLBs, prepares BVHs, and replaces each case registry cleanly", async () => {
    const started = performance.now();
    let priorToothMeshes: THREE.BufferGeometry[] = [];
    for (const klass of ["I", "II", "III", "IV"] as const) {
      const { ids } = await loadClass(klass, "final_review", true);
      expect(geometryRegistry.getAll()).toHaveLength(ids.length);
      const missingCount = PARTIAL_DENTURE_R5_PACKAGES.find((manifest) => manifest.packageId.endsWith(`-${klass.toLowerCase()}-v1`))!.labOrder!.targetTeeth.length;
      expect(useWorkspaceStore.getState().objects.filter((object) => object.partialDenturePart === "tooth")).toHaveLength(14 - missingCount);
      const currentToothMeshes = useWorkspaceStore.getState().objects.filter((object) => object.partialDenturePart === "tooth").flatMap((object) => geometryRegistry.getMeshes(object.id).map(({ geometry }) => geometry));
      expect(currentToothMeshes.every((geometry) => geometry.getAttribute("position").count > 0)).toBe(true);
      await new Promise<void>((resolveWait) => setTimeout(resolveWait, 40));
      expect(currentToothMeshes.every((geometry) => Boolean((geometry as THREE.BufferGeometry & { boundsTree?: unknown }).boundsTree))).toBe(true);
      if (priorToothMeshes.length) expect(priorToothMeshes.every((geometry) => !(geometry as THREE.BufferGeometry & { boundsTree?: unknown }).boundsTree)).toBe(true);
      priorToothMeshes = currentToothMeshes;
      expect(new Set(ids).size).toBe(ids.length);
    }
    expect(performance.now() - started).toBeGreaterThan(0);
    expect(useWorkspaceStore.getState().objects.every((object) => object.casePackageId === byClass.get("IV")!.packageId)).toBe(true);
  });
});

function lessonSchemaStub(id: string) {
  return {
    id,
    databaseId: "b7190000-0000-4000-8000-000000000010",
    moduleId: "partial_denture",
    title: { en: "Legacy Partial Denture", sr: "Stara parcijalna proteza" },
    summary: { en: "Old synthetic lesson", sr: "Stara sintetička lekcija" },
    goal: { en: "Use the old partial denture setup.", sr: "Koristite staru postavku parcijalne proteze." },
    difficulty: "beginner" as const,
    recommendedPrerequisites: [], estimatedMinutes: 5, assets: [],
    caseSetup: { source: "partial-denture-case" as const, kennedyClass: "I" as const, objectMappings: [] },
    steps: [{ id: "inspect", order: 1, title: { en: "Inspect", sr: "Pregled" }, instructions: { en: "Inspect the arch.", sr: "Pregledajte luk." }, allowedTools: ["select" as const], targetObjectIds: [], hints: [], referenceModes: ["off" as const], validators: [] }],
  };
}
