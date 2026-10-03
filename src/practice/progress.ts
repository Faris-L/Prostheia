import type { PracticeDifficulty } from "./types";

export type AttemptStatus = "in_progress" | "completed" | "abandoned";
export type ProgressAttempt = {
  id: string;
  lesson_id: string;
  status: AttemptStatus;
  started_at: string;
  completed_at: string | null;
  last_activity_at: string;
  score: number | null;
  checks_count: number;
  completed_step_ids: string[];
};
export type ProgressLesson = {
  id: string;
  slug: string;
  module_id: string;
  difficulty: PracticeDifficulty;
  title_en: string;
  title_sr: string;
  sort_order: number;
  required_step_count: number;
};
export type ProgressModule = { id: string; slug: string; title_en: string; title_sr: string; sort_order: number };
export type ProgressSkill = { id: string; slug: string; name_en: string; name_sr: string; sort_order: number };
export type LessonProgress = {
  lesson: ProgressLesson;
  status: "not_started" | "in_progress" | "completed" | "abandoned";
  everCompleted: boolean;
  attempts: ProgressAttempt[];
  latestAttempt: ProgressAttempt | null;
  activeAttempt: ProgressAttempt | null;
  latestCompletedAttempt: ProgressAttempt | null;
  bestScore: number | null;
  requiredStepCount: number;
  latestCompletedStepCount: number;
};
export type ModuleProgress = ProgressModule & { lessons: LessonProgress[]; completedCount: number; attemptedCount: number; percent: number };
export type SkillProgress = ProgressSkill & { lessonCount: number; completedCount: number; percent: number };
export type CaseSummary = { id: string; title: string; source_type: string; updated_at: string; revision_id: string | null };
export type LearnerProgress = {
  modules: ModuleProgress[];
  lessons: LessonProgress[];
  skills: SkillProgress[];
  attempts: ProgressAttempt[];
  recentCases: CaseSummary[];
  continueAttempt: ProgressAttempt | null;
  recommendedLesson: ProgressLesson | null;
};

export function deriveLearnerProgress(input: {
  modules: ProgressModule[];
  lessons: ProgressLesson[];
  attempts: ProgressAttempt[];
  skills: ProgressSkill[];
  lessonSkills: { lesson_id: string; skill_id: string }[];
  recentCases?: CaseSummary[];
}): LearnerProgress {
  const attemptsByLesson = new Map<string, ProgressAttempt[]>();
  for (const attempt of input.attempts) {
    const items = attemptsByLesson.get(attempt.lesson_id) ?? [];
    items.push(attempt);
    attemptsByLesson.set(attempt.lesson_id, items);
  }
  for (const items of attemptsByLesson.values()) items.sort(compareActivity);

  const lessons = input.lessons.map((lesson): LessonProgress => {
    const attempts = attemptsByLesson.get(lesson.id) ?? [];
    const completed = attempts.filter((attempt) => attempt.status === "completed");
    const latestAttempt = attempts[0] ?? null;
    const activeAttempt = attempts.find((attempt) => attempt.status === "in_progress") ?? null;
    const latestCompletedAttempt = completed[0] ?? null;
    const scores = completed.flatMap((attempt) => attempt.score === null ? [] : [attempt.score]);
    return {
      lesson,
      status: activeAttempt ? "in_progress" : completed.length ? "completed" : latestAttempt?.status === "abandoned" ? "abandoned" : "not_started",
      everCompleted: completed.length > 0,
      attempts,
      latestAttempt,
      activeAttempt,
      latestCompletedAttempt,
      bestScore: scores.length ? Math.max(...scores) : null,
      requiredStepCount: lesson.required_step_count,
      latestCompletedStepCount: latestAttempt?.completed_step_ids.length ?? 0,
    };
  });
  const progressByLesson = new Map(lessons.map((item) => [item.lesson.id, item]));
  const modules = input.modules.map((module): ModuleProgress => {
    const moduleLessons = lessons.filter((item) => item.lesson.module_id === module.id);
    const completedCount = moduleLessons.filter((item) => item.everCompleted).length;
    return {
      ...module,
      lessons: moduleLessons,
      completedCount,
      attemptedCount: moduleLessons.filter((item) => item.attempts.length > 0).length,
      percent: moduleLessons.length ? Math.round(completedCount / moduleLessons.length * 100) : 0,
    };
  }).filter((module) => module.lessons.length > 0);
  const skills = input.skills.map((skill): SkillProgress => {
    const skillLessonIds = new Set(input.lessonSkills.filter((link) => link.skill_id === skill.id).map((link) => link.lesson_id));
    const relevant = [...skillLessonIds].flatMap((id) => {
      const item = progressByLesson.get(id);
      return item ? [item] : [];
    });
    const completedCount = relevant.filter((item) => item.everCompleted).length;
    return { ...skill, lessonCount: relevant.length, completedCount, percent: relevant.length ? Math.round(completedCount / relevant.length * 100) : 0 };
  }).filter((skill) => skill.lessonCount > 0);

  const orderedLessons = [...input.lessons].sort((a, b) => {
    const moduleA = input.modules.find((module) => module.id === a.module_id)?.sort_order ?? 0;
    const moduleB = input.modules.find((module) => module.id === b.module_id)?.sort_order ?? 0;
    return moduleA - moduleB || a.sort_order - b.sort_order || a.title_en.localeCompare(b.title_en);
  });
  const orderedAttempts = [...input.attempts].sort(compareActivity);
  const continueAttempt = orderedAttempts.find((attempt) => attempt.status === "in_progress" && progressByLesson.has(attempt.lesson_id)) ?? null;
  const recommendedLesson = continueAttempt
    ? null
    : orderedLessons.find((lesson) => progressByLesson.get(lesson.id)?.status !== "completed") ?? null;
  return { modules, lessons, skills, attempts: orderedAttempts, recentCases: input.recentCases ?? [], continueAttempt, recommendedLesson };
}

export function deriveCompletedRequiredStepSlugs(
  requiredStepSlugs: string[],
  submittedCompletedStepIds: string[],
  resultsByStep: Record<string, { outcome: "pass" | "warning" | "fail" }[]>,
) {
  const submitted = new Set(submittedCompletedStepIds);
  const passed = new Set(requiredStepSlugs.filter((slug) => {
    const results = resultsByStep[slug];
    return submitted.has(slug) && !!results?.length && results.every((result) => result.outcome === "pass");
  }));
  return { completedStepIds: [...passed], isComplete: requiredStepSlugs.length > 0 && requiredStepSlugs.every((slug) => passed.has(slug)) };
}

function activityTime(attempt: ProgressAttempt) {
  const time = Date.parse(attempt.last_activity_at || attempt.started_at);
  return Number.isFinite(time) ? time : 0;
}

function compareActivity(a: ProgressAttempt, b: ProgressAttempt) {
  return activityTime(b) - activityTime(a) || Date.parse(b.started_at) - Date.parse(a.started_at) || a.id.localeCompare(b.id);
}
