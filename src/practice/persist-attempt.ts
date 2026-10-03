import type { PracticeLesson } from "./types";
import type { PracticeSession } from "./session-store";

export async function persistPracticeAttempt(lesson: PracticeLesson, session: PracticeSession): Promise<"cloud" | "device" | "memory"> {
  try {
    const response = await fetch("/api/practice/attempts", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: session.id, lessonId: lesson.databaseId, startedAt: session.startedAt, completedAt: session.completedAt, completed: session.isComplete, checksByStep: session.checksByStep, completedStepIds: session.completedStepIds, resultsByStep: session.resultsByStep, validationFingerprintByStep: session.validationFingerprintByStep }) });
    if (!response.ok) throw new Error("Attempt metadata could not be saved.");
    try { localStorage.removeItem(`prostheia:practice-attempt:${session.id}`); } catch { /* Server persistence succeeded. */ }
    return "cloud";
  } catch {
    try {
      localStorage.setItem(`prostheia:practice-attempt:${session.id}`, JSON.stringify({ lessonId: lesson.id, startedAt: session.startedAt, completedAt: session.completedAt, completed: session.isComplete, checksByStep: session.checksByStep, completedStepIds: session.completedStepIds, resultsByStep: session.resultsByStep, validationFingerprintByStep: session.validationFingerprintByStep }));
      return "device";
    } catch { return "memory"; }
  }
}
