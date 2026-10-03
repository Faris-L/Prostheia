import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CASE_PACKAGES, getCasePackage } from "@/cad/case-packages/registry";
import { caseObjectRuntimeId } from "@/cad/case-packages/identity";
import { useAnalysisStore } from "@/cad/analysis/state";
import { geometryRegistry } from "@/cad/scene/geometry-registry";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import { initializeFreeLabWorkspace } from "@/free-lab/initialize-workspace";
import { mergeLocalFreeLabScenarios } from "@/free-lab/database-scenarios";
import { FREE_LAB_ENTRY_MODES, FREE_LAB_RANDOM_DEFAULT_FILTERS } from "@/free-lab/free-lab-page";
import { BITE_SPLINT_R6_SCENARIOS, DIGITAL_MODEL_R6_SCENARIOS, FREE_LAB_SCENARIOS, PARTIAL_DENTURE_R5_SCENARIOS, R3_FIXED_PROSTHETICS_SCENARIOS, R4_COMPLETE_DENTURE_SCENARIOS, selectRandomScenario, validateFreeLabScenario } from "@/free-lab/scenarios";
import { R7_IMPLANT_SCENARIOS } from "@/free-lab/implant-scenario";
import { resolveScenarioPackage } from "@/free-lab/package-resolution";
import { PRACTICE_LESSONS } from "@/practice/lessons";
import { REGISTERED_VALIDATOR_TYPES, runStepValidators } from "@/practice/validators";
import type { FreeLabScenario } from "@/free-lab/types";

const localRealisticScenarios: FreeLabScenario[] = [
  ...R3_FIXED_PROSTHETICS_SCENARIOS,
  ...R4_COMPLETE_DENTURE_SCENARIOS,
  ...PARTIAL_DENTURE_R5_SCENARIOS,
  ...BITE_SPLINT_R6_SCENARIOS,
  ...DIGITAL_MODEL_R6_SCENARIOS,
  ...R7_IMPLANT_SCENARIOS,
];

afterEach(() => {
  geometryRegistry.clear();
  useWorkspaceStore.getState().resetDemo();
  useAnalysisStore.getState().clear();
});

describe("R8 Practice package and checkpoint bindings", () => {
  it("routes every local dental workflow lesson to an existing package stage and correctly mapped objects", () => {
    const packageLessons = PRACTICE_LESSONS.filter((lesson) => lesson.caseSetup.casePackageId);
    expect(packageLessons.length).toBeGreaterThan(30);

    for (const lesson of packageLessons) {
      const manifest = getCasePackage(lesson.caseSetup.casePackageId!);
      expect(manifest, `${lesson.id} package`).toBeDefined();
      expect(manifest!.checkpoints.some((checkpoint) => checkpoint.id === lesson.caseSetup.checkpointId), `${lesson.id} checkpoint`).toBe(true);

      const mappings = new Map(lesson.caseSetup.objectMappings.map((mapping) => [mapping.runtimeObjectId, mapping]));
      expect(mappings.size, `${lesson.id} unique object mappings`).toBe(lesson.caseSetup.objectMappings.length);
      for (const mapping of lesson.caseSetup.objectMappings) {
        const prefix = `${manifest!.caseId}-`;
        expect(mapping.runtimeObjectId.startsWith(prefix), `${lesson.id} runtime ID ${mapping.runtimeObjectId}`).toBe(true);
        const object = manifest!.objects.find((candidate) => candidate.id === mapping.runtimeObjectId.slice(prefix.length));
        expect(object, `${lesson.id} object ${mapping.runtimeObjectId}`).toBeDefined();
        expect(mapping.editable, `${lesson.id} editability ${object?.id}`).toBe(object?.editable);
      }
      for (const step of lesson.steps) {
        for (const targetId of step.targetObjectIds) expect(mappings.has(targetId), `${lesson.id}/${step.id} target ${targetId}`).toBe(true);
        if (step.reference) expect(mappings.has(step.reference.objectId), `${lesson.id}/${step.id} reference`).toBe(true);
        for (const validator of step.validators) {
          expect(REGISTERED_VALIDATOR_TYPES).toContain(validator.type);
          const validatorObjectIds = "objectId" in validator ? [validator.objectId] : "objectIds" in validator ? validator.objectIds : [];
          for (const objectId of validatorObjectIds.filter((id): id is string => typeof id === "string")) {
            expect(mappings.has(objectId), `${lesson.id}/${step.id} validator object ${objectId}`).toBe(true);
          }
        }
      }
      const checkpoint = manifest!.checkpoints.find((entry) => entry.id === lesson.caseSetup.checkpointId)!;
      const visibilityOverrides = checkpoint.source.kind === "asset_snapshot"
        ? new Map(checkpoint.source.objects.flatMap((entry) => entry.visible === undefined ? [] : [[entry.objectId, entry.visible] as const]))
        : new Map<string, boolean>();
      const firstStep = lesson.steps[0];
      const targetObjects = firstStep.targetObjectIds.flatMap((targetId) => {
        const objectId = targetId.slice(`${manifest!.caseId}-`.length);
        const object = manifest!.objects.find((candidate) => candidate.id === objectId);
        return object ? [{ targetId, object }] : [];
      });
      const action = firstStep.instructions.en.toLowerCase();
      const stepCreatesObject = /\b(generate|create|build|add|prepare|copy|apply|trace|draw|mark|define)\b|naprav|generi|dodaj/i.test(action);
      for (const { targetId, object } of targetObjects) {
        if (object.caseRole === "REFERENCE") continue;
        const visible = visibilityOverrides.get(object.id) ?? object.visible;
        expect(visible || stepCreatesObject, `${lesson.id} target ${targetId} (${object.caseRole}) is visible or created by its first action`).toBe(true);
      }
    }
  });

  it("binds all 17 R3 fixed-prosthetics lessons to valid stages and real semantic objects", () => {
    const migrationPath = join(process.cwd(), "supabase", "migrations", "20261002120000_dental_realism_r3_fixed_prosthetics.sql");
    const migration = readFileSync(migrationPath, "utf8");
    const rows = [...migration.matchAll(/^\s+\('([^']+)','[^']+','[^']+','([^']+)','([^']+)','(.*)'::jsonb\),?$/gm)];
    expect(rows).toHaveLength(17);

    for (const [, lessonSlug, packageId, checkpointId, serializedMappings] of rows) {
      const manifest = getCasePackage(packageId);
      expect(manifest, `${lessonSlug} package`).toBeDefined();
      expect(manifest!.checkpoints.some((checkpoint) => checkpoint.id === checkpointId), `${lessonSlug} checkpoint`).toBe(true);
      const mappings = JSON.parse(serializedMappings) as { runtimeObjectId: string; semanticRole: string; editable: boolean }[];
      expect(mappings.length, `${lessonSlug} mappings`).toBeGreaterThan(0);
      for (const mapping of mappings) {
        const prefix = `${manifest!.caseId}-`;
        expect(mapping.runtimeObjectId.startsWith(prefix), `${lessonSlug} runtime ID`).toBe(true);
        const object = manifest!.objects.find((candidate) => candidate.id === mapping.runtimeObjectId.slice(prefix.length));
        expect(object, `${lessonSlug} object ${mapping.runtimeObjectId}`).toBeDefined();
        expect(mapping.semanticRole.startsWith(object!.caseRole), `${lessonSlug} semantic role ${object!.id}`).toBe(true);
        expect(mapping.editable, `${lessonSlug} editability ${object!.id}`).toBe(object!.editable);
      }
      if (!lessonSlug.startsWith("full_") && lessonSlug !== "bridge_full_case") {
        expect(checkpointId, `${lessonSlug} must not reopen its raw case start`).not.toBe("case_start");
      }
    }
  });

  it("keeps the supported R4-R7 lesson guidance bilingual and structured", () => {
    const english = ["WHAT:", "WHY:", "OBJECT:", "TOOL:", "ACTION:", "TARGET:", "CHECK:"];
    const serbian = ["ŠTA:", "ZAŠTO:", "OBJEKAT:", "ALAT:", "AKCIJA:", "CILJ:", "PROVERA:"];
    for (const lesson of PRACTICE_LESSONS.filter((entry) => entry.caseSetup.casePackageId)) {
      for (const step of lesson.steps) {
        for (const label of english) expect(step.instructions.en, `${lesson.id}/${step.id} English`).toContain(label);
        for (const label of serbian) expect(step.instructions.sr, `${lesson.id}/${step.id} Serbian`).toContain(label);
      }
    }
  });
});

describe("R9 Free Lab package catalog", () => {
  it("resolves every R3-R7 Free Lab case to a real package and valid starting stage", () => {
    expect(localRealisticScenarios).toHaveLength(20);
    expect(new Set(localRealisticScenarios.map((scenario) => scenario.casePackageId)).size).toBe(20);
    for (const scenario of localRealisticScenarios) {
      expect(validateFreeLabScenario(scenario), scenario.slug).toBe(true);
      const resolved = resolveScenarioPackage(scenario);
      expect(resolved, scenario.slug).toBeDefined();
      expect(resolved!.manifest.packageId).toBe(scenario.casePackageId);
      expect(resolved!.manifest.checkpoints.some((checkpoint) => checkpoint.id === scenario.startingCheckpointId), scenario.slug).toBe(true);
      expect(scenario.brief.indication.en).not.toBe("");
      expect(scenario.brief.supplied.en.length).toBeGreaterThan(0);
      expect(scenario.brief.requirements.en.length).toBeGreaterThan(0);
    }
  });

  it("puts package-backed cases first, replaces duplicates, and omits unresolvable legacy rows", () => {
    const remoteDuplicate = { ...R3_FIXED_PROSTHETICS_SCENARIOS[0], id: "remote-r3-row", title: { en: "Stale duplicate", sr: "Zastareo duplikat" } };
    const legacyPlaceholder = { ...R3_FIXED_PROSTHETICS_SCENARIOS[0], id: "legacy-placeholder", slug: "synthetic_posterior_crown_26", casePackageId: undefined, startingCheckpointId: undefined };
    const merged = mergeLocalFreeLabScenarios([legacyPlaceholder, remoteDuplicate]);
    for (const scenario of [...R3_FIXED_PROSTHETICS_SCENARIOS, ...BITE_SPLINT_R6_SCENARIOS, ...DIGITAL_MODEL_R6_SCENARIOS]) {
      expect(merged.filter((candidate) => candidate.casePackageId === scenario.casePackageId)).toHaveLength(1);
    }
    expect(merged[0].id).toBe(R3_FIXED_PROSTHETICS_SCENARIOS[0].id);
    expect(merged.some((scenario) => scenario.id === legacyPlaceholder.id)).toBe(false);
    expect(merged.find((scenario) => scenario.casePackageId === remoteDuplicate.casePackageId)?.id).toBe(R3_FIXED_PROSTHETICS_SCENARIOS[0].id);
  });

  it("lets Random Case select only published, eligible, resolvable package cases", () => {
    const valid = R3_FIXED_PROSTHETICS_SCENARIOS[0];
    const legacy = FREE_LAB_SCENARIOS.find((scenario) => !scenario.casePackageId)!;
    const broken = { ...valid, id: "broken-case", startingCheckpointId: "missing-stage" };
    const eligible = [legacy, broken, valid];
    expect(selectRandomScenario(eligible, valid.category, valid.difficulty, () => 0)?.id).toBe(valid.id);
    expect(selectRandomScenario([legacy], legacy.category, legacy.difficulty, () => 0)).toBeUndefined();
    expect(selectRandomScenario([{ ...valid, status: "draft" }], valid.category, valid.difficulty, () => 0)).toBeUndefined();
    expect(resolveScenarioPackage({ casePackageId: "missing-package", startingCheckpointId: "inspect" })).toBeUndefined();
    expect(selectRandomScenario(localRealisticScenarios, FREE_LAB_RANDOM_DEFAULT_FILTERS.category, FREE_LAB_RANDOM_DEFAULT_FILTERS.difficulty)).toBeDefined();
  });

  it("opens a random-selected package at its chosen checkpoint and keeps import and blank entry modes reachable", async () => {
    const scenario = BITE_SPLINT_R6_SCENARIOS[0];
    const resolved = resolveScenarioPackage(scenario)!;
    const ids = await initializeFreeLabWorkspace({
      workspaceId: "r8-random-open",
      origin: "random",
      scenarioId: scenario.id,
      title: scenario.title.en,
      category: scenario.category,
      casePackageId: resolved.manifest.packageId,
      checkpointId: resolved.checkpointId,
      createdAt: new Date().toISOString(),
    });
    expect(useWorkspaceStore.getState().mode).toBe("free-lab");
    expect(ids).toEqual(resolved.manifest.objects.map((object) => caseObjectRuntimeId(resolved.manifest.caseId, object.id)));
    expect(useWorkspaceStore.getState().objects.every((object) => object.casePackageId === resolved.manifest.packageId)).toBe(true);
    const selected = useWorkspaceStore.getState().objects.find((object) => object.id === useWorkspaceStore.getState().selectedObjectId);
    expect(selected).toMatchObject({ caseRole: "DESIGN", editable: true, visible: true });

    expect(FREE_LAB_ENTRY_MODES).toEqual(expect.arrayContaining(["scenario", "import", "blank", "random"]));
    const importIds = await initializeFreeLabWorkspace({ workspaceId: "r9-import", origin: "import", title: "Import My Case", createdAt: new Date().toISOString() });
    expect(importIds).toEqual([]);
    expect(useWorkspaceStore.getState().objects).toEqual([]);
    const blankIds = await initializeFreeLabWorkspace({ workspaceId: "r9-blank", origin: "blank", title: "Blank Workspace", createdAt: new Date().toISOString() });
    expect(blankIds).toEqual([]);
    expect(useWorkspaceStore.getState().objects).toEqual([]);
  });
});

describe("R10-R11 package presentation and Design Check mappings", () => {
  it("keeps package IDs stable while exposing readable names and matching semantic roles", () => {
    expect(CASE_PACKAGES.length).toBeGreaterThanOrEqual(20);
    for (const manifest of CASE_PACKAGES) {
      expect(manifest.checkpoints.some((checkpoint) => checkpoint.id === manifest.startingCheckpointId), manifest.packageId).toBe(true);
      for (const object of manifest.objects) {
        expect(["SOURCE", "DESIGN", "GUIDE", "REFERENCE"]).toContain(object.caseRole);
        expect(object.name.en).not.toMatch(/(?:^|[_ ])r[3-7]_[a-z0-9_-]+_(?:design|mesh|final|v\d+)/i);
        expect(object.name.en).not.toMatch(/\b(?:debug|placeholder)\s+mesh\b/i);
        if (object.caseRole === "DESIGN") expect(object.editable, `${manifest.packageId}/${object.id}`).toBe(true);
        if (object.caseRole === "REFERENCE") expect(object.visible, `${manifest.packageId}/${object.id}`).toBe(false);
      }
      for (const binding of manifest.validationBindings) {
        if (binding.binding.kind === "inline") expect(REGISTERED_VALIDATOR_TYPES).toContain(binding.binding.validatorType);
        for (const objectId of binding.objectIds) expect(manifest.objects.some((object) => object.id === objectId), `${manifest.packageId}/${binding.id}/${objectId}`).toBe(true);
      }
      const localScenario = localRealisticScenarios.find((scenario) => scenario.casePackageId === manifest.packageId);
      if (localScenario) {
        const checkpoint = manifest.checkpoints.find((entry) => entry.id === localScenario.startingCheckpointId)!;
        const visibilityOverrides = checkpoint.source.kind === "asset_snapshot"
          ? new Map(checkpoint.source.objects.flatMap((entry) => entry.visible === undefined ? [] : [[entry.objectId, entry.visible] as const]))
          : new Map<string, boolean>();
        expect(manifest.objects.some((object) => object.caseRole === "DESIGN" && object.editable && (visibilityOverrides.get(object.id) ?? object.visible)), `${manifest.packageId} Free Lab design`).toBe(true);
      }
    }
  });

  it("keeps numeric exercise targets labeled in English and Serbian", () => {
    const dentalLessons = PRACTICE_LESSONS.filter((lesson) => lesson.caseSetup.casePackageId);
    const english = [
      ...dentalLessons.flatMap((lesson) => lesson.steps.flatMap((step) => [step.instructions.en, step.theory?.en ?? ""])),
      ...CASE_PACKAGES.flatMap((manifest) => [...manifest.trainingNotes.map((item) => item.en), ...manifest.labOrder.requiredOutput.en]),
    ];
    const serbian = [
      ...dentalLessons.flatMap((lesson) => lesson.steps.flatMap((step) => [step.instructions.sr, step.theory?.sr ?? ""])),
      ...CASE_PACKAGES.flatMap((manifest) => [...manifest.trainingNotes.map((item) => item.sr), ...manifest.labOrder.requiredOutput.sr]),
    ];
    const numericTarget = /(?:\d+(?:\.\d+)?\s?mm|\d+\s?(?:deg|°))/i;
    for (const text of english.filter((value) => numericTarget.test(value))) expect(text).toContain("Target for this exercise");
    const lesson = PRACTICE_LESSONS.find((entry) => entry.caseSetup.casePackageId)!;
    const step = { ...lesson.steps[0], validators: [{ type: "analysis_target" as const, kind: "thickness" as const, objectIds: ["test-design"], minValue: 1 }] };
    const [result] = runStepValidators(lesson, step);
    expect(result.outcome).toBe("fail");
    expect(result.message.en).toContain("Target for this exercise: at least 1 mm");
    expect(result.message.sr).toContain("Cilj za ovu ve\u017Ebu: najmanje 1 mm");
    const validatorCopy = readFileSync(join(process.cwd(), "src", "practice", "validators.ts"), "utf8");
    expect(validatorCopy).not.toMatch(/clinically approved|clinically correct|safe for patient|manufacturing ready|clinically validated/i);
    for (const text of serbian.filter((value) => numericTarget.test(value))) expect(text).toContain("Cilj za ovu vežbu");
  });
});
