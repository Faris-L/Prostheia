import * as THREE from "three";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import { resolve } from "node:path";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CASE_PACKAGES } from "@/cad/case-packages/registry";
import { validateCasePackage, type CaseAssetReference } from "@/cad/case-packages/contract";
import { caseObjectRuntimeId } from "@/cad/case-packages/identity";
import { caseRuntimeAssetRecordId, type ResolvedCaseAsset } from "@/cad/case-packages/asset-registry";
import { getPrivateTrainingAsset, PRIVATE_DENTURE_TOOTH_ASSETS, PRIVATE_FIXED_ASSETS } from "@/cad/case-packages/private-asset-catalog";
import { FIXED_PROSTHETICS_R3_PACKAGES } from "@/cad/case-packages/definitions/fixed-prosthetics-r3";
import { loadCasePackage } from "@/cad/case-packages/loader";
import { geometryRegistry } from "@/cad/scene/geometry-registry";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import { exportCadObject } from "@/cad/import/export-model";
import { FREE_LAB_ENTRY_MODES } from "@/free-lab/free-lab-page";
import { FREE_LAB_SCENARIOS, R3_FIXED_PROSTHETICS_SCENARIOS, selectRandomScenario } from "@/free-lab/scenarios";
import { resolveScenarioPackage } from "@/free-lab/package-resolution";
import { R7_IMPLANT_SCENARIOS } from "@/free-lab/implant-scenario";
import { PRACTICE_LESSONS } from "@/practice/lessons";
import { normalizeR3PracticeLessonCopy } from "@/practice/database-catalog";
import { REGISTERED_VALIDATOR_TYPES } from "@/practice/validators";

afterEach(() => {
  geometryRegistry.clear();
  useWorkspaceStore.getState().resetDemo();
  vi.restoreAllMocks();
});

function syntheticAssetResolver() {
  return async (reference: { id: string; runtimeAssetId?: string; masterAssetId?: string; assetId?: string }) => {
    const root = new THREE.Group();
    root.add(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshStandardMaterial()));
    return {
      object: root,
      importSource: {} as ResolvedCaseAsset["importSource"],
      metadata: {} as ResolvedCaseAsset["metadata"],
      masterAssetId: reference.masterAssetId ?? reference.assetId ?? null,
      runtimeAssetId: reference.runtimeAssetId ?? reference.masterAssetId ?? reference.assetId ?? reference.id,
      originalToCanonical: new THREE.Matrix4().identity().toArray(),
      normalizationState: "source" as const,
    };
  };
}

function geometryBytes(geometry: THREE.BufferGeometry) {
  let bytes = geometry.index?.array.byteLength ?? 0;
  for (const attribute of Object.values(geometry.attributes)) bytes += attribute.array.byteLength;
  return bytes;
}

describe("R12–R14 final dental realism integration", () => {
  it("audits every registered package asset and resolves all package-backed catalogs", async () => {
    const packageIds = new Set<string>();
    const caseIds = new Set<string>();
    const allPrivateAssets = [...PRIVATE_FIXED_ASSETS, ...PRIVATE_DENTURE_TOOTH_ASSETS];
    expect(new Set(allPrivateAssets.map((asset) => asset.id)).size).toBe(allPrivateAssets.length);

    const checkedAssets = new Set<string>();
    let activeAssetBytes = 0;
    let largestAsset: { name: string; bytes: number } = { name: "", bytes: 0 };
    for (const input of CASE_PACKAGES) {
      const manifest = validateCasePackage(input);
      expect(packageIds.has(manifest.packageId), `${manifest.packageId} package ID`).toBe(false);
      expect(caseIds.has(manifest.caseId), `${manifest.caseId} case identity`).toBe(false);
      packageIds.add(manifest.packageId);
      caseIds.add(manifest.caseId);

      expect(manifest.checkpoints.some((checkpoint) => checkpoint.id === manifest.startingCheckpointId), `${manifest.slug} starting checkpoint`).toBe(true);
      expect(new Set(manifest.objects.map((object) => object.id)).size, `${manifest.slug} object IDs`).toBe(manifest.objects.length);
      expect(manifest.objects.some((object) => object.caseRole === "DESIGN" && object.editable), `${manifest.slug} editable DESIGN`).toBe(true);
      for (const object of manifest.objects) {
        expect([...object.transform.position, ...object.transform.rotation, ...object.transform.scale].every(Number.isFinite), `${manifest.slug}/${object.id} finite transform`).toBe(true);
        if (object.caseRole === "SOURCE" || object.caseRole === "REFERENCE") expect(object.editable, `${manifest.slug}/${object.id} locked role`).toBe(false);
      }
      for (const outputId of manifest.expectedOutput.objectIds) {
        const output = manifest.objects.find((object) => object.id === outputId);
        expect(output, `${manifest.slug}/${outputId} expected output`).toBeDefined();
        expect(output?.caseRole, `${manifest.slug}/${outputId} expected output role`).toBe("DESIGN");
      }

      for (const reference of manifest.assetRefs) {
        const assetId = caseRuntimeAssetRecordId(reference);
        const asset = getPrivateTrainingAsset(assetId);
        expect(asset, `${manifest.slug}/${reference.id} manifest entry for ${assetId}`).toBeDefined();
        if (checkedAssets.has(assetId)) continue;
        checkedAssets.add(assetId);
        const path = resolve(process.cwd(), "src/cad/case-packages/private-v1/runtime", asset!.runtimeFile);
        expect(existsSync(path), `${assetId} runtime file`).toBe(true);
        const bytes = readFileSync(path);
        expect(bytes.byteLength, `${assetId} runtime byte size`).toBe(asset!.runtimeByteSize);
        expect(createHash("sha256").update(bytes).digest("hex"), `${assetId} runtime checksum`).toBe(asset!.runtimeChecksum);
        expect(bytes.subarray(0, 4).toString("ascii"), `${assetId} GLB header`).toBe("glTF");
        activeAssetBytes += bytes.byteLength;
        if (bytes.byteLength > largestAsset.bytes) largestAsset = { name: asset!.runtimeFile, bytes: bytes.byteLength };
      }
    }
    expect(packageIds.size).toBe(CASE_PACKAGES.length);
    process.stdout.write(`[R12-R14] Active private runtime asset audit: ${checkedAssets.size} unique files, ${(activeAssetBytes / (1024 * 1024)).toFixed(1)} MiB total, largest ${largestAsset.name} (${(largestAsset.bytes / (1024 * 1024)).toFixed(2)} MiB).\n`);

    const packageLessons = PRACTICE_LESSONS.filter((lesson) => lesson.caseSetup.casePackageId);
    expect(packageLessons.length).toBeGreaterThan(30);
    for (const lesson of packageLessons) {
      const manifest = CASE_PACKAGES.find((candidate) => candidate.packageId === lesson.caseSetup.casePackageId);
      expect(manifest, `${lesson.id} Practice package`).toBeDefined();
      expect(manifest!.checkpoints.some((checkpoint) => checkpoint.id === lesson.caseSetup.checkpointId), `${lesson.id} Practice checkpoint`).toBe(true);
      const mappings = new Set(lesson.caseSetup.objectMappings.map((mapping) => mapping.runtimeObjectId));
      for (const step of lesson.steps) {
        for (const validator of step.validators) expect(REGISTERED_VALIDATOR_TYPES).toContain(validator.type);
        for (const target of step.targetObjectIds) expect(mappings.has(target), `${lesson.id}/${step.id} target mapping`).toBe(true);
      }
    }

    const packageScenarios = FREE_LAB_SCENARIOS.filter((scenario) => scenario.casePackageId);
    expect(packageScenarios.length).toBe(20);
    for (const scenario of packageScenarios) {
      const resolved = resolveScenarioPackage(scenario);
      expect(resolved, `${scenario.slug} Free Lab package`).toBeDefined();
      expect(resolved!.manifest.packageId).toBe(scenario.casePackageId);
      expect(resolved!.manifest.checkpoints.some((checkpoint) => checkpoint.id === resolved!.checkpointId), `${scenario.slug} checkpoint`).toBe(true);
    }
    expect(selectRandomScenario(FREE_LAB_SCENARIOS, "crown", "intermediate", () => 0)?.casePackageId).toBeTruthy();
    expect(FREE_LAB_ENTRY_MODES).toEqual(expect.arrayContaining(["scenario", "import", "blank", "random"]));

    for (const manifest of CASE_PACKAGES) {
      const requestedReferences: string[] = [];
      const resolveSyntheticAsset = syntheticAssetResolver();
      const resolveAsset = async (reference: CaseAssetReference) => {
        requestedReferences.push(reference.id);
        return resolveSyntheticAsset(reference);
      };
      const requiredReferences = new Set(manifest.objects.flatMap((object) => object.required && object.source.kind === "asset" ? [object.source.assetRefId] : []));
      const priorGeometries = new Set(geometryRegistry.getAll().flatMap((runtime) => geometryRegistry.getMeshes(runtime.id).map((mesh) => mesh.geometry)));
      const disposeSpies = [...priorGeometries].map((geometry) => vi.spyOn(geometry, "dispose"));
      const loaded = await loadCasePackage(manifest, {
        mode: "free-lab",
        checkpointId: manifest.startingCheckpointId,
        resolveAsset,
        resolveCheckpoint: async () => ({}),
      });
      expect(loaded.ids).toHaveLength(manifest.objects.length);
      expect(useWorkspaceStore.getState().objects).toHaveLength(manifest.objects.length);
      for (const referenceId of requiredReferences) expect(requestedReferences).toContain(referenceId);
      for (const outputId of manifest.expectedOutput.objectIds) {
        const output = useWorkspaceStore.getState().objects.find((object) => object.id === caseObjectRuntimeId(manifest.caseId, outputId));
        expect(output, `${manifest.slug}/${outputId} loaded DESIGN`).toMatchObject({ caseRole: "DESIGN", editable: true });
      }
      if (disposeSpies.length) expect(disposeSpies.every((spy) => spy.mock.calls.length > 0), `${manifest.slug} prior-case disposal`).toBe(true);
      disposeSpies.forEach((spy) => spy.mockRestore());
    }
    expect(geometryRegistry.getAll()).toHaveLength(CASE_PACKAGES.at(-1)!.objects.length);
  }, 120_000);

  it("loads and repeatedly switches representative cases with local GLB parsing, BVH, and cleanup measurements", async () => {
    const representatives = [
      CASE_PACKAGES.find((manifest) => manifest.packageId === "r3-crown-26-v1"),
      CASE_PACKAGES.find((manifest) => manifest.packageId.includes("r4-complete-denture-balanced")),
      CASE_PACKAGES.find((manifest) => manifest.packageId.includes("r5-partial-denture-kennedy-i")),
      CASE_PACKAGES.find((manifest) => manifest.packageId.includes("r6-digital-model") && manifest.packageId.includes("noisy")),
      CASE_PACKAGES.find((manifest) => manifest.packageId.includes("r7-implant") && manifest.packageId.includes("axis-contact")),
    ];
    expect(representatives.every(Boolean)).toBe(true);
    const samples: Record<string, { parseMs: number; bvhMs: number; packageSwitchMs: number; disposalMs: number; bytes: number; triangles: number; assets: number }> = {};
    const loader = new GLTFLoader();

    for (let cycle = 0; cycle < 2; cycle += 1) {
      for (const manifest of representatives) {
        if (!manifest) throw new Error("A required representative package is missing.");
        let parseMs = 0;
        let disposalMs = 0;
        const parsedAssets = new Map<string, Promise<ResolvedCaseAsset>>();
        const resolver = async (reference: CaseAssetReference) => {
          const assetId = caseRuntimeAssetRecordId(reference);
          const existing = parsedAssets.get(assetId);
          if (existing) return existing;
          const task = (async (): Promise<ResolvedCaseAsset> => {
            const asset = getPrivateTrainingAsset(assetId);
            if (!asset) throw new Error(`No local private training asset for ${reference.id}/${assetId}.`);
            const bytes = readFileSync(resolve(process.cwd(), "src/cad/case-packages/private-v1/runtime", asset.runtimeFile));
            const started = performance.now();
            const gltf = await loader.parseAsync(Uint8Array.from(bytes).buffer, "");
            parseMs += performance.now() - started;
            return {
              object: gltf.scene,
              importSource: {} as ResolvedCaseAsset["importSource"],
              metadata: {} as ResolvedCaseAsset["metadata"],
              masterAssetId: asset.derivedFromAssetId ?? asset.id,
              runtimeAssetId: asset.id,
              normalizationState: "canonical",
            };
          })();
          parsedAssets.set(assetId, task);
          return task;
        };

        const priorGeometries = new Set(geometryRegistry.getAll().flatMap((runtime) => geometryRegistry.getMeshes(runtime.id).map((mesh) => mesh.geometry)));
        const priorDisposalSpies = [...priorGeometries].map((geometry) => {
          const dispose = geometry.dispose.bind(geometry);
          return vi.spyOn(geometry, "dispose").mockImplementation(() => {
            const started = performance.now();
            dispose();
            disposalMs += performance.now() - started;
          });
        });
        const switchStarted = performance.now();
        const loaded = await loadCasePackage(manifest, { mode: "free-lab", checkpointId: manifest.startingCheckpointId, resolveAsset: resolver });
        const packageSwitchMs = performance.now() - switchStarted;
        if (priorDisposalSpies.length) expect(priorDisposalSpies.every((spy) => spy.mock.calls.length > 0), `${manifest.slug} disposes prior geometry`).toBe(true);
        priorDisposalSpies.forEach((spy) => spy.mockRestore());
        expect(useWorkspaceStore.getState().objects).toHaveLength(manifest.objects.length);
        expect(loaded.ids).toHaveLength(manifest.objects.length);

        let bvhMs = 0;
        let bytes = 0;
        let triangles = 0;
        const visitedGeometries = new Set<THREE.BufferGeometry>();
        for (const runtime of geometryRegistry.getAll()) {
          for (const mesh of geometryRegistry.getMeshes(runtime.id)) {
            const geometry = mesh.geometry;
            if (visitedGeometries.has(geometry)) continue;
            visitedGeometries.add(geometry);
            bytes += geometryBytes(geometry);
            const position = geometry.getAttribute("position");
            triangles += geometry.index ? geometry.index.count / 3 : (position?.count ?? 0) / 3;
            const bvhGeometry = geometry as THREE.BufferGeometry & { boundsTree?: unknown; computeBoundsTree?: (options?: { maxLeafSize?: number }) => void };
            if (!bvhGeometry.boundsTree && position?.count) {
              const started = performance.now();
              bvhGeometry.computeBoundsTree?.({ maxLeafSize: 12 });
              bvhMs += performance.now() - started;
              expect(bvhGeometry.boundsTree, `${manifest.slug} BVH`).toBeDefined();
            }
          }
        }
        const key = `${manifest.slug}${cycle === 0 ? "-first" : "-repeat"}`;
        samples[key] = { parseMs: +parseMs.toFixed(2), bvhMs: +bvhMs.toFixed(2), packageSwitchMs: +packageSwitchMs.toFixed(2), disposalMs: +disposalMs.toFixed(2), bytes, triangles, assets: parsedAssets.size };
      }
    }
    expect(Object.keys(samples)).toHaveLength(10);
    expect(Object.values(samples).every((sample) => Object.values(sample).every(Number.isFinite))).toBe(true);
    process.stdout.write(`[R12-R14] Non-browser local performance samples: ${JSON.stringify(samples)}\n`);
  }, 120_000);

  it("exports Crown, removable, and Digital Model DESIGN objects through STL, OBJ, and GLB", async () => {
    const representatives = [
      CASE_PACKAGES.find((manifest) => manifest.packageId === "r3-crown-26-v1"),
      CASE_PACKAGES.find((manifest) => manifest.packageId.includes("r5-partial-denture-kennedy-i")),
      CASE_PACKAGES.find((manifest) => manifest.packageId.includes("r6-digital-model") && manifest.packageId.includes("noisy")),
    ];
    expect(representatives.every(Boolean)).toBe(true);
    const previousCreate = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
    const previousRevoke = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");
    const createObjectURL = vi.fn(() => "blob:prostheia-export");
    const revokeObjectURL = vi.fn();
    Object.defineProperty(URL, "createObjectURL", { configurable: true, value: createObjectURL });
    Object.defineProperty(URL, "revokeObjectURL", { configurable: true, value: revokeObjectURL });
    const downloads: string[] = [];
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push(this.download);
    });

    try {
      for (const manifest of representatives) {
        if (!manifest) throw new Error("A required export representative package is missing.");
        await loadCasePackage(manifest, { mode: "free-lab", resolveAsset: syntheticAssetResolver() });
        const output = manifest.expectedOutput.objectIds[0];
        const objectId = caseObjectRuntimeId(manifest.caseId, output);
        for (const format of ["stl", "obj", "glb"] as const) {
          await exportCadObject(objectId, `${manifest.slug} / design`, format);
        }
      }
    } finally {
      clickSpy.mockRestore();
      if (previousCreate) Object.defineProperty(URL, "createObjectURL", previousCreate);
      else Reflect.deleteProperty(URL, "createObjectURL");
      if (previousRevoke) Object.defineProperty(URL, "revokeObjectURL", previousRevoke);
      else Reflect.deleteProperty(URL, "revokeObjectURL");
    }

    expect(createObjectURL).toHaveBeenCalledTimes(9);
    expect(downloads).toHaveLength(9);
    expect(downloads.every((filename) => /design\.(stl|obj|glb)$/.test(filename))).toBe(true);
  });

  it("uses consistent localized R3/R7 dental terminology and corrects the remote bridge title locally", () => {
    const bridgeSource = structuredClone(PRACTICE_LESSONS.find((lesson) => lesson.caseSetup.casePackageId)!);
    bridgeSource.id = "bridge_full_case";
    bridgeSource.caseSetup.casePackageId = "r3-bridge-24-26-v1";
    bridgeSource.title = { en: "Complete Bridge Case · teeth 14–16", sr: "Kompletan slučaj mosta · zubi 14–16" };
    bridgeSource.steps[0].title.sr = "Inlay kontakt i debljina · Margin Line";
    const fixedBridge = normalizeR3PracticeLessonCopy(bridgeSource);
    expect(fixedBridge.title).toEqual({ en: "Complete Bridge Case · teeth 24–26", sr: "Kompletan slučaj mosta · zubi 24–26" });
    expect(fixedBridge.steps[0].title.sr).toBe("inlej kontakt i debljina · linija završetka preparacije");

    const r3Copy = R3_FIXED_PROSTHETICS_SCENARIOS.flatMap((scenario) => [scenario.title.sr, scenario.description.sr, scenario.brief.indication.sr, ...scenario.brief.supplied.sr, ...scenario.brief.requirements.sr, scenario.brief.notes?.sr ?? ""]);
    expect(r3Copy.filter((copy) => /\bInlay\b|\bOnlay\b/i.test(copy))).toEqual([]);
    const r3ObjectNames = CASE_PACKAGES.filter((manifest) => manifest.packageId.startsWith("r3-")).flatMap((manifest) => manifest.objects.map((object) => object.name));
    expect(r3ObjectNames.every((name) => name.en !== name.sr)).toBe(true);
    expect(FIXED_PROSTHETICS_R3_PACKAGES.find((manifest) => manifest.packageId === "r3-inlay-36-v1")?.metadata.title.sr).toMatch(/inlej/i);
    expect(FIXED_PROSTHETICS_R3_PACKAGES.find((manifest) => manifest.packageId === "r3-onlay-26-v1")?.metadata.title.sr).toMatch(/onlej/i);
    const r7Copy = [...R7_IMPLANT_SCENARIOS.flatMap((scenario) => [scenario.title.sr, scenario.description.sr, scenario.brief.indication.sr, ...scenario.brief.supplied.sr, ...scenario.brief.requirements.sr, scenario.brief.notes?.sr ?? ""]), ...PRACTICE_LESSONS.filter((lesson) => lesson.moduleId.includes("implant")).flatMap((lesson) => [lesson.title.sr, ...lesson.steps.flatMap((step) => [step.instructions.sr, step.theory?.sr ?? "", ...step.hints.map((hint) => hint.body.sr)])])];
    const r7PackageCopy = CASE_PACKAGES.filter((manifest) => manifest.packageId.startsWith("r7-")).flatMap((manifest) => [manifest.metadata.title.sr, manifest.metadata.description.sr, ...manifest.objects.map((object) => object.name.sr), ...(manifest.labOrder?.providedRecords.sr ?? []), ...(manifest.labOrder?.requiredOutput.sr ?? [])]);
    expect(r7PackageCopy.filter((copy) => /scan body-ja|abatment|nicanj/i.test(copy))).toEqual([]);
    expect(r7Copy.filter((copy) => /scan body-ja|abatment|nicanj/i.test(copy))).toEqual([]);
    expect(r7Copy.some((copy) => /skenirajuće telo \(scan body\)/i.test(copy))).toBe(true);
  });
});
