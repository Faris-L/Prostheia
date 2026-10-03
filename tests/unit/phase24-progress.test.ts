import { describe, expect, it } from "vitest";
import { deriveCompletedRequiredStepSlugs, deriveLearnerProgress, type ProgressAttempt, type ProgressLesson, type ProgressModule, type ProgressSkill } from "@/practice/progress";
import { scoreResults } from "@/practice/validators";

const modules: ProgressModule[] = [
  { id: "foundation", slug: "foundation", title_en: "Foundation", title_sr: "Osnove", sort_order: 1 },
  { id: "crown", slug: "crown", title_en: "Crown", title_sr: "Kruna", sort_order: 2 },
];
const lessons: ProgressLesson[] = [
  { id: "nav", slug: "navigation", module_id: "foundation", difficulty: "foundation", title_en: "Navigation", title_sr: "Navigacija", sort_order: 1, required_step_count: 3 },
  { id: "sculpt", slug: "sculpting", module_id: "foundation", difficulty: "beginner", title_en: "Sculpting", title_sr: "Modelovanje", sort_order: 2, required_step_count: 2 },
  { id: "crown-intro", slug: "crown-intro", module_id: "crown", difficulty: "intermediate", title_en: "Crown", title_sr: "Kruna", sort_order: 1, required_step_count: 4 },
];
const skills: ProgressSkill[] = [{ id: "skill-nav", slug: "navigation", name_en: "Navigation", name_sr: "Navigacija", sort_order: 1 }];
function attempt(id: string, lesson_id: string, status: ProgressAttempt["status"], last_activity_at: string, score: number | null, completed_step_ids: string[] = []): ProgressAttempt {
  return { id, lesson_id, status, started_at: last_activity_at, completed_at: status === "completed" ? last_activity_at : null, last_activity_at, score, checks_count: 1, completed_step_ids };
}

describe("Phase 24 learner progress derivation", () => {
  it("uses the Practice scoring model for persisted Design Check outcomes", () => {
    expect(scoreResults([
      { id: "pass", validatorType: "fixture", outcome: "pass", title: { en: "Pass", sr: "Prošlo" }, message: { en: "", sr: "" } },
      { id: "warning", validatorType: "fixture", outcome: "warning", title: { en: "Review", sr: "Proveriti" }, message: { en: "", sr: "" } },
      { id: "fail", validatorType: "fixture", outcome: "fail", title: { en: "Needs work", sr: "Potrebna dorada" }, message: { en: "", sr: "" } },
    ])).toBe(50);
  });

  it("returns an empty new learner with the first published recommendation", () => {
    const progress = deriveLearnerProgress({ modules, lessons, attempts: [], skills, lessonSkills: [{ lesson_id: "nav", skill_id: "skill-nav" }] });
    expect(progress.lessons.every((item) => item.status === "not_started")).toBe(true);
    expect(progress.modules.map((item) => [item.completedCount, item.lessons.length])).toEqual([[0, 2], [0, 1]]);
    expect(progress.recommendedLesson?.slug).toBe("navigation");
    expect(progress.continueAttempt).toBeNull();
  });

  it("keeps an abandoned attempt visible without presenting it as active progress", () => {
    const progress = deriveLearnerProgress({ modules, lessons, attempts: [attempt("ended", "nav", "abandoned", "2026-01-01T00:00:00.000Z", null, ["step-1"])], skills, lessonSkills: [] });
    expect(progress.lessons[0]).toMatchObject({ status: "abandoned", everCompleted: false, attempts: [{ id: "ended" }] });
    expect(progress.continueAttempt).toBeNull();
    expect(progress.recommendedLesson?.slug).toBe("navigation");
  });

  it("prefers the most recently active incomplete lesson and retains repeated attempts", () => {
    const attempts = [
      attempt("old", "nav", "in_progress", "2026-01-01T00:00:00.000Z", null, ["step-1"]),
      attempt("completed", "sculpt", "completed", "2026-01-02T00:00:00.000Z", 81, ["one", "two"]),
      attempt("new", "nav", "in_progress", "2026-01-03T00:00:00.000Z", null, ["step-1", "step-2"]),
    ];
    const progress = deriveLearnerProgress({ modules, lessons, attempts, skills, lessonSkills: [{ lesson_id: "nav", skill_id: "skill-nav" }] });
    expect(progress.continueAttempt?.id).toBe("new");
    expect(progress.recommendedLesson).toBeNull();
    expect(progress.lessons.find((item) => item.lesson.id === "nav")?.attempts).toHaveLength(2);
    expect(progress.lessons.find((item) => item.lesson.id === "nav")?.latestCompletedStepCount).toBe(2);
    expect(progress.lessons.find((item) => item.lesson.id === "sculpt")?.status).toBe("completed");
  });

  it("derives best score only from completed attempts and keeps module denominators dynamic", () => {
    const attempts = [
      attempt("done-1", "nav", "completed", "2026-01-01T00:00:00.000Z", 76, ["a", "b", "c"]),
      attempt("done-2", "nav", "completed", "2026-01-02T00:00:00.000Z", 84, ["a", "b", "c"]),
      attempt("active", "nav", "in_progress", "2026-01-03T00:00:00.000Z", 99, ["a"]),
    ];
    const progress = deriveLearnerProgress({ modules, lessons, attempts, skills, lessonSkills: [{ lesson_id: "nav", skill_id: "skill-nav" }] });
    expect(progress.lessons[0].bestScore).toBe(84);
    expect(progress.lessons[0]).toMatchObject({ status: "in_progress", everCompleted: true, latestAttempt: { id: "active" } });
    expect(progress.modules[0].completedCount).toBe(1);
    expect(progress.modules[0].percent).toBe(50);
    expect(progress.skills[0]).toMatchObject({ lessonCount: 1, completedCount: 1, percent: 100 });
  });

  it("marks a required step complete only when its latest saved checks all pass", () => {
    expect(deriveCompletedRequiredStepSlugs(["one", "two"], ["one", "two"], {
      one: [{ outcome: "pass" }], two: [{ outcome: "pass" }, { outcome: "warning" }],
    })).toEqual({ completedStepIds: ["one"], isComplete: false });
    expect(deriveCompletedRequiredStepSlugs(["one", "two"], ["one", "two"], {
      one: [{ outcome: "pass" }], two: [{ outcome: "pass" }],
    })).toEqual({ completedStepIds: ["one", "two"], isComplete: true });
    expect(deriveCompletedRequiredStepSlugs(["one"], ["one"], { one: [] }).isComplete).toBe(false);
  });
});
