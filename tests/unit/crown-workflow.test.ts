import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createCrownCase, CROWN_CASE_OBJECTS } from "@/cad/crown/case";
import { computeDirectionalUndercut } from "@/cad/analysis/analysis.worker";
import { computeSurfaceThickness } from "@/cad/analysis/analysis.worker";
import { snapshotMesh } from "@/cad/analysis/geometry";
import { geometryRegistry } from "@/cad/scene/geometry-registry";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import { useHistoryStore } from "@/cad/engine/history-store";
import { editCurve } from "@/cad/curves/commands";
import { useCurveStore, validateClosedCurve } from "@/cad/curves/store";
import { cadObjectId } from "@/cad/types";
import { placeCrownFromLibrary } from "@/cad/crown/tooth-library";
import { getValidator } from "@/practice/validators";
import { validatorConfigSchema } from "@/practice/types";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260927180000_phase_16_crown_workflow.sql"), "utf8");

afterEach(() => {
  useHistoryStore.getState().clear();
  geometryRegistry.clear();
  useCurveStore.getState().replace({ curves: [], activeCurveId: null });
  useWorkspaceStore.getState().resetDemo();
});

describe("Phase 16 Crown case", () => {
  it("registers the preparation, neighbors, editable restoration, and protected example", () => {
    createCrownCase("practice");
    const objects = useWorkspaceStore.getState().objects;
    expect(objects.map((object) => object.id)).toEqual(Object.values(CROWN_CASE_OBJECTS));
    expect(objects.find((object) => object.id === CROWN_CASE_OBJECTS.restoration)).toMatchObject({ role: "crown", editable: true, syntheticMesh: true });
    expect(objects.find((object) => object.id === CROWN_CASE_OBJECTS.reference)).toMatchObject({ role: "reference", editable: false, visible: false });
    expect(geometryRegistry.get(cadObjectId(CROWN_CASE_OBJECTS.restoration))).toBeDefined();
    expect(geometryRegistry.get(cadObjectId(CROWN_CASE_OBJECTS.preparation))).toBeDefined();
  });

  it("draws and edits a local Margin Line with Undo/Redo without changing preparation geometry", () => {
    createCrownCase("practice");
    const prep = cadObjectId(CROWN_CASE_OBJECTS.preparation);
    const crown = cadObjectId(CROWN_CASE_OBJECTS.restoration);
    const revisionBefore = geometryRegistry.get(prep)?.geometryRevision;
    editCurve(() => useCurveStore.getState().addPoint(prep, [1, 0, 0]));
    editCurve(() => useCurveStore.getState().addPoint(prep, [0, 1, 0]));
    editCurve(() => useCurveStore.getState().addPoint(prep, [-1, 0, 0]));
    expect(validateClosedCurve(useCurveStore.getState().active(prep, "margin")).valid).toBe(false);
    editCurve(() => useCurveStore.getState().close(prep));
    expect(validateClosedCurve(useCurveStore.getState().active(prep, "margin")).valid).toBe(true);
    const previous = useCurveStore.getState().active(prep, "margin")!.points[0];
    editCurve(() => useCurveStore.getState().movePoint(prep, 0, [1.5, 0, 0]));
    useHistoryStore.getState().undo();
    expect(useCurveStore.getState().active(prep, "margin")?.points[0]).toEqual(previous);
    useHistoryStore.getState().redo();
    expect(useCurveStore.getState().active(prep, "margin")?.points[0]).toEqual([1.5, 0, 0]);
    expect(useCurveStore.getState().active(crown, "margin")).toBeUndefined();
    expect(geometryRegistry.get(prep)?.geometryRevision).toBe(revisionBefore);
  });

  it("produces a finite directional preview and records one target", () => {
    createCrownCase("practice");
    const prepId = cadObjectId(CROWN_CASE_OBJECTS.preparation);
    const target = snapshotMesh(prepId, geometryRegistry.getMeshes(prepId)[0].key);
    const result = computeDirectionalUndercut(target, [0, 0, 1]);
    expect(result.kind).toBe("undercut");
    expect(result.targets).toHaveLength(1);
    expect(result.values.length).toBe(target.positions.length / 3);
    expect(result.values.every(Number.isFinite)).toBe(true);
    expect(result.note).toBe("directional-preview");
  });

  it("returns finite thickness samples for the closed synthetic restoration mesh", () => {
    createCrownCase("practice");
    const crownId = cadObjectId(CROWN_CASE_OBJECTS.restoration);
    const result = computeSurfaceThickness(snapshotMesh(crownId), 0.8);
    expect(result.sampleCount).toBeGreaterThanOrEqual(Math.ceil(result.values.length * 0.8));
    expect(Number.isFinite(result.minMm)).toBe(true);
    expect(result.minMm).toBeGreaterThan(0);
  });

  it("places a library crown preset through the geometry registry and supports Undo", () => {
    createCrownCase("practice");
    const crownId = cadObjectId(CROWN_CASE_OBJECTS.restoration);
    const before = geometryRegistry.get(crownId)!.geometryRevision;
    expect(placeCrownFromLibrary(crownId)).toBe(before + 1);
    expect(geometryRegistry.stats(crownId).revision).toBe(before + 1);
    useHistoryStore.getState().undo();
    expect(geometryRegistry.get(crownId)?.geometryRevision).toBe(before);
    useHistoryStore.getState().redo();
    expect(geometryRegistry.get(crownId)?.geometryRevision).toBe(before + 1);
  });

  it("seeds seven ordered bilingual lessons and schema-valid lesson checks", () => {
    const lessonCount = (migration.match(/\('b7160000-0000-4000-8000-0000000000\d+'::uuid,'[a-z_]+','(?:foundation|beginner|intermediate)'/g) ?? []).length;
    expect(lessonCount).toBe(7);
    expect((migration.match(/select pg_temp\.seed_phase16_step\(/g) ?? []).length).toBe(11);
    expect(migration).toContain('"source":"crown-case"');
    expect(migration).toContain("'synthetic_posterior_crown_26'");
    expect(migration).toContain('"crown26-reference"');
    const validators = [...migration.matchAll(/'\{\"type\":\"(margin_complete|analysis_target|transform_range|required_object)[^']*\}'/g)];
    expect(validators.length).toBeGreaterThanOrEqual(9);
    for (const match of validators) {
      const config = JSON.parse(match[0].slice(1, -1)) as unknown;
      expect(validatorConfigSchema.safeParse(config).success).toBe(true);
      expect(getValidator((config as { type: string }).type)).toBeDefined();
    }
    expect(migration).toContain("summary_sr");
    expect(migration).toContain("instructions_sr");
    expect(migration.toLowerCase()).toContain("not a real patient case or clinically validated anatomy");
  });
});
