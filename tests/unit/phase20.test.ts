import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import * as THREE from "three";
import { createBiteSplintCase, BITE_SPLINT_IDS } from "@/cad/splint/case";
import { generateBiteSplint, validateSplintWorkflow } from "@/cad/splint/operations";
import { generateSplintGeometry } from "@/cad/splint/geometry";
import { createDigitalModelCase, DIGITAL_MODEL_IDS } from "@/cad/digital-model/case";
import { addModelAttachment, addRemovableDie, generateDigitalModelBase } from "@/cad/digital-model/operations";
import { createEducationalModelBase } from "@/cad/digital-model/geometry";
import { useBiteSplintStore } from "@/cad/splint/types";
import { useDigitalModelStore } from "@/cad/digital-model/types";
import { useCurveStore } from "@/cad/curves/store";
import { geometryRegistry } from "@/cad/scene/geometry-registry";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import { useHistoryStore } from "@/cad/engine/history-store";
import { cadObjectId } from "@/cad/types";
import { runStepValidators } from "@/practice/validators";
import type { PracticeLesson, PracticeStep } from "@/practice/types";
import { readRecovery, restoreRecovery, writeRecovery } from "@/cad/recovery/recovery";
import { recoveryDatabase } from "@/cad/recovery/database";

afterEach(async () => { useHistoryStore.getState().clear(); geometryRegistry.clear(); useBiteSplintStore.getState().reset(); useDigitalModelStore.getState().reset(); await recoveryDatabase.recoveries.clear(); });

describe("Phase 20 workflows", () => {
  it("initializes a stable synthetic Bite Splint case and creates editable valid geometry", () => {
    const ids = createBiteSplintCase("practice");
    expect(ids).toEqual([BITE_SPLINT_IDS.upper, BITE_SPLINT_IDS.lower]);
    expect(useWorkspaceStore.getState().objects.map((object) => object.biteSplintPart)).toEqual(["upper_arch", "antagonist"]);
    expect(useCurveStore.getState().curves[0]).toMatchObject({ id: BITE_SPLINT_IDS.boundary, kind: "splint_boundary", closed: true });
    expect(validateSplintWorkflow()).toMatchObject({ boundary: true, splint: false });
    const id = generateBiteSplint();
    const runtime = geometryRegistry.get(cadObjectId(id));
    const geometry = runtime && geometryRegistry.getMeshes(cadObjectId(id))[0].geometry;
    const positions = geometry?.getAttribute("position");
    expect(positions?.count).toBeGreaterThan(3);
    expect(Array.from(positions!.array).every(Number.isFinite)).toBe(true);
    expect(useWorkspaceStore.getState().objects.find((object) => object.id === id)).toMatchObject({ editable: true, role: "splint" });
    expect(validateSplintWorkflow().splint).toBe(true);
    useHistoryStore.getState().undo();
    expect(validateSplintWorkflow().splint).toBe(false);
    useHistoryStore.getState().redo();
    expect(validateSplintWorkflow().splint).toBe(true);
  });

  it("validates a splint boundary with the reusable validator registry", () => {
    createBiteSplintCase("practice");
    const curve = useCurveStore.getState().curves[0];
    useCurveStore.getState().replace({ curves: [{ ...curve, closed: false }], activeCurveId: curve.id });
    const step = { id: "boundary", order: 1, title: { en: "Boundary", sr: "Granica" }, instructions: { en: "Close it", sr: "Zatvorite" }, allowedTools: ["analysis"], targetObjectIds: [BITE_SPLINT_IDS.upper], hints: [], referenceModes: ["off"], validators: [{ type: "curve_closed", objectId: BITE_SPLINT_IDS.upper, curveId: BITE_SPLINT_IDS.boundary, curveKind: "splint_boundary" }], required: true } as PracticeStep;
    const lesson = { id: "phase20", steps: [step] } as PracticeLesson;
    expect(runStepValidators(lesson, step)[0].outcome).toBe("fail");
    useCurveStore.getState().replace({ curves: [{ ...curve, closed: true }], activeCurveId: curve.id });
    expect(runStepValidators(lesson, step)[0].outcome).toBe("pass");
  });

  it("generates deterministic finite splint geometry without changing its boundary input", () => {
    const boundary: [number, number, number][] = [[-5, -4, 0], [5, -4, 0], [5, 4, 0], [-5, 4, 0]];
    const before = structuredClone(boundary);
    const first = generateSplintGeometry({ boundary, thicknessMm: 2 });
    const second = generateSplintGeometry({ boundary, thicknessMm: 2 });
    expect(Array.from(first.getAttribute("position").array)).toEqual(Array.from(second.getAttribute("position").array));
    expect(Array.from(first.getAttribute("position").array).every(Number.isFinite)).toBe(true);
    expect(boundary).toEqual(before);
    first.dispose(); second.dispose();
  });

  it("keeps raw and working model geometry separate and adds editable components", () => {
    createDigitalModelCase("free-lab");
    const raw = geometryRegistry.get(cadObjectId(DIGITAL_MODEL_IDS.raw))!;
    const working = geometryRegistry.get(cadObjectId(DIGITAL_MODEL_IDS.working))!;
    const rawGeometry = geometryRegistry.getMeshes(cadObjectId(DIGITAL_MODEL_IDS.raw))[0].geometry;
    const workingGeometry = geometryRegistry.getMeshes(cadObjectId(DIGITAL_MODEL_IDS.working))[0].geometry;
    expect(raw.object).not.toBe(working.object);
    expect(rawGeometry).not.toBe(workingGeometry);
    expect(useWorkspaceStore.getState().objects.find((object) => object.id === DIGITAL_MODEL_IDS.raw)).toMatchObject({ editable: false, digitalModelPart: "raw_scan" });
    const baseId = generateDigitalModelBase(8);
    const dieId = addRemovableDie([4, 3, 0]);
    const attachmentId = addModelAttachment([-4, 3, 0]);
    for (const id of [baseId, dieId, attachmentId]) {
      expect(geometryRegistry.get(cadObjectId(id))).toBeDefined();
      const geometry = geometryRegistry.getMeshes(cadObjectId(id))[0].geometry;
      expect(Array.from(geometry.getAttribute("position").array).every(Number.isFinite)).toBe(true);
      expect(geometry.index?.count ?? geometry.getAttribute("position").count).toBeGreaterThan(0);
    }
    expect(geometryRegistry.get(cadObjectId(DIGITAL_MODEL_IDS.raw))!.geometryRevision).toBe(0);
    expect(useWorkspaceStore.getState().objects.find((object) => object.id === baseId)?.editable).toBe(true);
    expect(useDigitalModelStore.getState()).toMatchObject({ rawScanId: DIGITAL_MODEL_IDS.raw, workingModelId: DIGITAL_MODEL_IDS.working, baseId, dieIds: [dieId], attachmentIds: [attachmentId] });
  });

  it("recovers Digital Model object identities and non-mesh workflow settings", async () => {
    createDigitalModelCase("free-lab");
    const baseId = generateDigitalModelBase(9);
    addRemovableDie([3, 4, 0]);
    useDigitalModelStore.getState().setBaseHeight(9);
    await writeRecovery("phase20-digital-model");
    const snapshot = await readRecovery("phase20-digital-model");
    expect(snapshot?.payload.digitalModelSetup).toMatchObject({ rawScanId: DIGITAL_MODEL_IDS.raw, workingModelId: DIGITAL_MODEL_IDS.working, baseId, baseHeightMm: 9, dieIds: [expect.any(String)] });
    useDigitalModelStore.getState().reset();
    restoreRecovery(snapshot!, "phase20-digital-model");
    expect(useDigitalModelStore.getState()).toMatchObject({ rawScanId: DIGITAL_MODEL_IDS.raw, workingModelId: DIGITAL_MODEL_IDS.working, baseId, baseHeightMm: 9, dieIds: [expect.any(String)] });
  });

  it("rejects invalid splint thickness and invalid model base height", () => {
    const points: [number, number, number][] = [[0, 0, 0], [1, 0, 0], [0, 1, 0]];
    expect(() => generateSplintGeometry({ boundary: points, thicknessMm: Number.NaN })).toThrow(/Thickness/);
    expect(() => generateSplintGeometry({ boundary: [[0, 0, 0], [1, 0, 0]], thicknessMm: 2 })).toThrow(/three finite/);
    expect(() => createEducationalModelBase(new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2)), 1)).toThrow(/between 2 and 25/);
  });
});
