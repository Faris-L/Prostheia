import { afterEach, describe, expect, it } from "vitest";
import { demoObjects } from "@/cad/scene/demo-objects";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import { cadObjectId } from "@/cad/types";
import { PRACTICE_LESSONS, PRACTICE_LEVELS } from "@/practice/lessons";
import { canRunShortcut, canUsePracticeTool } from "@/practice/permissions";
import { usePracticeSessionStore } from "@/practice/session-store";
import { localized, type PracticeStep, type ValidationResult } from "@/practice/types";
import { runStepValidators, scoreResults, validationFingerprint } from "@/practice/validators";
import { resolveCadShortcut } from "@/cad/engine/shortcuts";

const lesson = PRACTICE_LESSONS[0];
const passing: ValidationResult = { id: "pass", validatorType: "test", outcome: "pass", title: { en: "Passed", sr: "Uspešno" }, message: { en: "Target reached.", sr: "Cilj dostignut." } };
const failing: ValidationResult = { ...passing, id: "fail", outcome: "fail" };

afterEach(() => {
  usePracticeSessionStore.setState({ session: null, locale: "en" });
  useWorkspaceStore.getState().resetDemo();
});

describe("Practice lesson runtime", () => {
  it("initializes a new session at the first ordered step", () => {
    usePracticeSessionStore.getState().initialize(lesson);
    const session = usePracticeSessionStore.getState().session!;
    expect(session.lessonId).toBe(lesson.id);
    expect(session.currentStepId).toBe(lesson.steps[0].id);
    expect(session.startedAt).toBeTruthy();
    expect(session.completedStepIds).toEqual([]);
  });

  it("keeps all four difficulty levels accessible while exposing only authored lessons", () => {
    expect(PRACTICE_LEVELS.map((level) => level.id)).toEqual(["foundation", "beginner", "intermediate", "advanced"]);
    expect(lesson.difficulty).toBe("foundation");
  });

  it("does not let a later step complete before the current required step", () => {
    usePracticeSessionStore.getState().initialize(lesson);
    usePracticeSessionStore.getState().recordCheck(lesson.steps[1].id, [passing], "step-2", lesson);
    expect(usePracticeSessionStore.getState().session?.currentStepId).toBe(lesson.steps[0].id);
    usePracticeSessionStore.getState().recordCheck(lesson.steps[0].id, [failing], "step-1-fail", lesson);
    expect(usePracticeSessionStore.getState().session?.currentStepId).toBe(lesson.steps[0].id);
    usePracticeSessionStore.getState().recordCheck(lesson.steps[0].id, [passing], "step-1-pass", lesson);
    expect(usePracticeSessionStore.getState().session?.currentStepId).toBe(lesson.steps[1].id);
  });

  it("completes a lesson only after every required step passes", () => {
    usePracticeSessionStore.getState().initialize(lesson);
    for (const step of lesson.steps) usePracticeSessionStore.getState().recordCheck(step.id, [passing], step.id, lesson);
    const session = usePracticeSessionStore.getState().session!;
    expect(session.isComplete).toBe(true);
    expect(session.completedAt).toBeTruthy();
    expect(session.completedStepIds).toEqual(lesson.steps.map((step) => step.id));
  });

  it("restarts with a clean attempt and disallows reference modes outside step configuration", () => {
    usePracticeSessionStore.getState().initialize(lesson);
    const firstId = usePracticeSessionStore.getState().session?.id;
    usePracticeSessionStore.getState().recordCheck(lesson.steps[0].id, [passing], "first", lesson);
    expect(usePracticeSessionStore.getState().session?.currentStepId).toBe(lesson.steps[1].id);
    usePracticeSessionStore.getState().setReferenceMode("full");
    expect(usePracticeSessionStore.getState().session?.referenceMode).not.toBe("full");
    usePracticeSessionStore.getState().restart(lesson);
    expect(usePracticeSessionStore.getState().session?.id).not.toBe(firstId);
    expect(usePracticeSessionStore.getState().session?.completedStepIds).toEqual([]);
    expect(usePracticeSessionStore.getState().session?.checksByStep).toEqual({});
  });

  it("caps progressive hints and reads the selected localized copy", () => {
    usePracticeSessionStore.getState().initialize(lesson);
    const step = lesson.steps[0];
    usePracticeSessionStore.getState().showNextHint(step.id, step.hints.length);
    usePracticeSessionStore.getState().showNextHint(step.id, step.hints.length);
    usePracticeSessionStore.getState().showNextHint(step.id, step.hints.length);
    expect(usePracticeSessionStore.getState().session?.hintIndexByStep[step.id]).toBe(step.hints.length);
    expect(localized(step.instructions, "sr")).toContain("Demo restoration");
  });
});

describe("Practice tool policy", () => {
  it("allows the configured Move tool and rejects disallowed tool activation and shortcuts", () => {
    const step = lesson.steps[0];
    expect(canUsePracticeTool(step, "move")).toBe(true);
    expect(canUsePracticeTool(step, "sculpt")).toBe(false);
    expect(canRunShortcut(step, resolveCadShortcut({ key: "r", ctrlKey: false, metaKey: false, shiftKey: false, altKey: false })!)).toBe(false);
    expect(canRunShortcut(step, resolveCadShortcut({ key: "g", ctrlKey: false, metaKey: false, shiftKey: false, altKey: false })!)).toBe(true);
    expect(canRunShortcut(step, resolveCadShortcut({ key: "delete", ctrlKey: false, metaKey: false, shiftKey: false, altKey: false })!)).toBe(false);
  });

  it("keeps the camera usable and protects the configured reference object", () => {
    expect(canUsePracticeTool(lesson.steps[0], "camera")).toBe(true);
    const reference = demoObjects.find((object) => object.id === cadObjectId("demo-reference"));
    expect(reference?.role).toBe("reference");
    expect(reference?.editable).toBe(false);
  });
});

describe("Practice validator registry", () => {
  it("evaluates a transform target against the current stable CAD object", () => {
    const step = lesson.steps[0];
    const initial = runStepValidators(lesson, step);
    expect(initial[0].outcome).toBe("fail");
    const object = useWorkspaceStore.getState().objects.find((entry) => entry.id === cadObjectId("demo-crown"))!;
    useWorkspaceStore.getState().applyTransform(object.id, { ...object.transform, position: [0, 0, 0] });
    expect(runStepValidators(lesson, step)[0].outcome).toBe("pass");
  });

  it("fails closed for unknown validators and malformed trusted configuration", () => {
    const base = lesson.steps[0];
    const unknown = { ...base, validators: [{ type: "future_check" }] } as unknown as PracticeStep;
    const invalid = { ...base, validators: [{ type: "transform_range", objectId: "demo-crown", position: [0, 0, 0], axes: [], toleranceMm: -1 }] } as unknown as PracticeStep;
    expect(runStepValidators(lesson, unknown)[0].message.en).toContain("current workspace");
    expect(runStepValidators(lesson, invalid)[0].message.en).toContain("could not be configured");
  });

  it("returns a warning when mesh statistics are unavailable and scores it secondarily", () => {
    const step = { ...lesson.steps[0], validators: [{ type: "geometry_statistics", objectId: "demo-crown", minVertices: 20 }] } as unknown as PracticeStep;
    const warning = runStepValidators(lesson, step);
    expect(warning[0].outcome).toBe("warning");
    expect(scoreResults(warning)).toBe(50);
  });

  it("marks a previously checked transform as stale after it changes", () => {
    const object = useWorkspaceStore.getState().objects.find((entry) => entry.id === cadObjectId("demo-crown"))!;
    const before = validationFingerprint(useWorkspaceStore.getState().objects, [object.id]);
    useWorkspaceStore.getState().applyTransform(object.id, { ...object.transform, position: [0, 0, 0] });
    const after = validationFingerprint(useWorkspaceStore.getState().objects, [object.id]);
    expect(after).not.toBe(before);
    const geometryFingerprint = validationFingerprint(useWorkspaceStore.getState().objects, [object.id]);
    useWorkspaceStore.getState().setGeometryStats(object.id, { vertexCount: 40, triangleCount: 20, boundsMm: [1, 1, 1], revision: 1, dirty: true });
    expect(validationFingerprint(useWorkspaceStore.getState().objects, [object.id])).not.toBe(geometryFingerprint);
  });
});
