import { create } from "zustand";
import type { PracticeLesson, PracticeLocale, ReferenceMode, ValidationResult } from "./types";

export type PracticeSession = {
  id: string; lessonId: string; currentStepId: string; completedStepIds: string[]; startedAt: string; completedAt: string | null;
  checksByStep: Record<string, number>; hintIndexByStep: Record<string, number>; referenceMode: ReferenceMode;
  resultsByStep: Record<string, ValidationResult[]>; validationFingerprintByStep: Record<string, string>; isComplete: boolean;
};
type PracticeState = {
  locale: PracticeLocale; session: PracticeSession | null; lesson: PracticeLesson | null; initialize: (lesson: PracticeLesson) => void; restart: (lesson: PracticeLesson, attemptId?: string) => void;
  restore: (lesson: PracticeLesson, attempt: { id: string; startedAt: string; completedAt: string | null; status: "in_progress" | "completed"; completedStepIds: string[] }, stepResults: { stepSlug: string; checksCount: number; validationResults: unknown }[]) => void;
  setLocale: (locale: PracticeLocale) => void; showNextHint: (stepId: string, hintCount: number) => void; setReferenceMode: (mode: ReferenceMode) => void;
  recordCheck: (stepId: string, results: ValidationResult[], fingerprint: string, lesson: PracticeLesson) => void;
};
export function createPracticeAttemptId() {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (letter) => { const random = Math.floor(Math.random() * 16); return (letter === "x" ? random : (random & 0x3) | 0x8).toString(16); });
}
const makeSession = (lesson: PracticeLesson, id = createPracticeAttemptId()): PracticeSession => ({ id, lessonId: lesson.id, currentStepId: lesson.steps[0].id, completedStepIds: [], startedAt: new Date().toISOString(), completedAt: null, checksByStep: {}, hintIndexByStep: {}, referenceMode: lesson.steps[0].referenceModes.includes("outline") ? "outline" : (lesson.steps[0].referenceModes[0] ?? "off"), resultsByStep: {}, validationFingerprintByStep: {}, isComplete: false });

export const usePracticeSessionStore = create<PracticeState>((set, get) => ({
  locale: "en", session: null, lesson: null,
  initialize: (lesson) => { if (get().session?.lessonId !== lesson.id) set({ lesson, session: makeSession(lesson) }); else set({ lesson }); },
  restart: (lesson, attemptId) => set({ lesson, session: makeSession(lesson, attemptId) }),
  restore: (lesson, attempt, stepResults) => {
    const completedStepIds = attempt.completedStepIds.filter((id) => lesson.steps.some((step) => step.id === id));
    const activeStep = lesson.steps.find((step) => step.required && !completedStepIds.includes(step.id)) ?? lesson.steps.find((step) => step.required) ?? lesson.steps[0];
    const checksByStep: Record<string, number> = {};
    const resultsByStep: Record<string, ValidationResult[]> = {};
    const validationFingerprintByStep: Record<string, string> = {};
    for (const row of stepResults) {
      checksByStep[row.stepSlug] = row.checksCount;
      if (Array.isArray(row.validationResults)) resultsByStep[row.stepSlug] = row.validationResults.filter(isValidationResult);
    }
    set({ lesson, session: {
      id: attempt.id, lessonId: lesson.id, currentStepId: activeStep.id, completedStepIds,
      startedAt: attempt.startedAt, completedAt: attempt.completedAt, checksByStep, hintIndexByStep: {},
      referenceMode: activeStep.referenceModes.includes("outline") ? "outline" : (activeStep.referenceModes[0] ?? "off"),
      resultsByStep, validationFingerprintByStep, isComplete: attempt.status === "completed",
    } });
  },
  setLocale: (locale) => set({ locale }),
  showNextHint: (stepId, hintCount) => set((state) => { const session = state.session; if (!session || session.currentStepId !== stepId) return state; const current = session.hintIndexByStep[stepId] ?? 0; return { session: { ...session, hintIndexByStep: { ...session.hintIndexByStep, [stepId]: Math.min(current + 1, hintCount) } } }; }),
  setReferenceMode: (referenceMode) => set((state) => { const session = state.session; const step = session && state.lesson?.steps.find((entry) => entry.id === session.currentStepId); return session && step?.referenceModes.includes(referenceMode) ? { session: { ...session, referenceMode } } : state; }),
  recordCheck: (stepId, results, fingerprint, lesson) => set((state) => {
    const session = state.session; if (!session || session.currentStepId !== stepId) return state;
    const nextChecks = { ...session.checksByStep, [stepId]: (session.checksByStep[stepId] ?? 0) + 1 };
    const pass = results.length > 0 && results.every((result) => result.outcome === "pass");
    const validationFingerprintByStep = { ...session.validationFingerprintByStep, [stepId]: fingerprint };
    if (!pass) return { session: { ...session, checksByStep: nextChecks, resultsByStep: { ...session.resultsByStep, [stepId]: results }, validationFingerprintByStep } };
    const completedStepIds = session.completedStepIds.includes(stepId) ? session.completedStepIds : [...session.completedStepIds, stepId];
    const currentIndex = lesson.steps.findIndex((step) => step.id === stepId);
    const nextStep = lesson.steps.slice(currentIndex + 1).find((step) => step.required && !completedStepIds.includes(step.id));
    const complete = !nextStep;
    return { session: { ...session, checksByStep: nextChecks, resultsByStep: { ...session.resultsByStep, [stepId]: results }, validationFingerprintByStep, completedStepIds, currentStepId: nextStep?.id ?? stepId, referenceMode: nextStep?.referenceModes.includes(session.referenceMode) ? session.referenceMode : (nextStep?.referenceModes[0] ?? "off"), isComplete: complete, completedAt: complete ? new Date().toISOString() : null } };
  }),
}));

function isValidationResult(value: unknown): value is ValidationResult {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  const localized = (entry: unknown) => entry !== null && typeof entry === "object" && typeof (entry as Record<string, unknown>).en === "string" && typeof (entry as Record<string, unknown>).sr === "string";
  return typeof row.id === "string" && typeof row.validatorType === "string" && (row.outcome === "pass" || row.outcome === "warning" || row.outcome === "fail") && localized(row.title) && localized(row.message);
}
