import { createServerSupabaseClient } from "@/lib/supabase/server";
import { deriveLearnerProgress, type LearnerProgress, type ProgressAttempt, type ProgressLesson, type ProgressModule, type ProgressSkill } from "./progress";

export async function loadLearnerProgress(): Promise<LearnerProgress> {
  const db = await createServerSupabaseClient();
  const [modulesResult, lessonsResult, skillsResult, attemptsResult, casesResult] = await Promise.all([
    db.from("practice_modules").select("id,slug,title_en,title_sr,sort_order").eq("status", "published").order("sort_order"),
    db.from("practice_lessons").select("id,slug,module_id,difficulty,title_en,title_sr,sort_order").eq("status", "published").order("sort_order"),
    db.from("skills").select("id,slug,name_en,name_sr,sort_order").eq("status", "published").order("sort_order"),
    db.from("practice_attempts").select("id,lesson_id,status,started_at,completed_at,last_activity_at,score,checks_count,completed_step_ids").order("last_activity_at", { ascending: false }),
    db.from("user_cases").select("id,title,source_type,updated_at").order("updated_at", { ascending: false }).limit(5),
  ]);
  for (const result of [modulesResult, lessonsResult, skillsResult, attemptsResult, casesResult]) {
    if (result.error) throw new Error("Your learning progress could not be loaded.");
  }

  const modules = (modulesResult.data ?? []) as ProgressModule[];
  const lessonsData = lessonsResult.data ?? [];
  const lessonIds = lessonsData.map((lesson) => lesson.id);
  const caseIds = (casesResult.data ?? []).map((item) => item.id);
  const [stepsResult, lessonSkillsResult, headsResult] = await Promise.all([
    lessonIds.length ? db.from("practice_steps").select("lesson_id,required").in("lesson_id", lessonIds) : Promise.resolve({ data: [], error: null }),
    lessonIds.length ? db.from("practice_lesson_skills").select("lesson_id,skill_id").in("lesson_id", lessonIds) : Promise.resolve({ data: [], error: null }),
    caseIds.length ? db.from("case_heads").select("case_id,revision_id").in("case_id", caseIds) : Promise.resolve({ data: [], error: null }),
  ]);
  if (stepsResult.error || lessonSkillsResult.error || headsResult.error) throw new Error("Your learning progress could not be loaded.");
  const requiredCounts = new Map<string, number>();
  for (const step of stepsResult.data ?? []) if (step.required) requiredCounts.set(step.lesson_id, (requiredCounts.get(step.lesson_id) ?? 0) + 1);
  const lessons: ProgressLesson[] = lessonsData.map((lesson) => ({ ...lesson, required_step_count: requiredCounts.get(lesson.id) ?? 0 }));
  const skills = (skillsResult.data ?? []) as ProgressSkill[];
  const attempts: ProgressAttempt[] = (attemptsResult.data ?? []).filter((attempt) => attempt.status === "in_progress" || attempt.status === "completed" || attempt.status === "abandoned").map((attempt) => ({ ...attempt, status: attempt.status as ProgressAttempt["status"] }));
  const revisionByCase = new Map((headsResult.data ?? []).map((head) => [head.case_id, head.revision_id]));
  const recentCases = (casesResult.data ?? []).map((item) => ({ ...item, revision_id: revisionByCase.get(item.id) ?? null }));
  return deriveLearnerProgress({ modules, lessons, attempts, skills, lessonSkills: lessonSkillsResult.data ?? [], recentCases });
}

export async function loadAttemptDetail(attemptId: string) {
  const db = await createServerSupabaseClient();
  const { data: attempt, error } = await db.from("practice_attempts").select("id,lesson_id,status,started_at,completed_at,last_activity_at,score,checks_count,completed_step_ids,result_summary").eq("id", attemptId).maybeSingle();
  if (error) throw new Error("This Practice result could not be loaded.");
  if (!attempt) return null;
  const [lessonResult, stepsResult, resultRows] = await Promise.all([
    db.from("practice_lessons").select("id,slug,title_en,title_sr,difficulty,module_id").eq("id", attempt.lesson_id).maybeSingle(),
    db.from("practice_steps").select("slug,title_en,title_sr,sort_order,required").eq("lesson_id", attempt.lesson_id).order("sort_order"),
    db.from("attempt_step_results").select("step_slug,status,checks_count,validation_results,updated_at").eq("attempt_id", attemptId).order("updated_at"),
  ]);
  if (lessonResult.error || stepsResult.error || resultRows.error) throw new Error("This Practice result could not be loaded.");
  const stepBySlug = new Map((stepsResult.data ?? []).map((step) => [step.slug, step]));
  const stepResults = (resultRows.data ?? []).map((row) => ({
    ...row,
    lessonStep: stepBySlug.get(row.step_slug) ?? null,
    validationResults: Array.isArray(row.validation_results) ? row.validation_results.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const value = item as Record<string, unknown>;
      if (typeof value.outcome !== "string" || !["pass", "warning", "fail"].includes(value.outcome)) return [];
      const text = (entry: unknown) => entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
      const enTitle = text(value.title).en;
      const srTitle = text(value.title).sr;
      const enMessage = text(value.message).en;
      const srMessage = text(value.message).sr;
      return [{
        outcome: value.outcome as "pass" | "warning" | "fail",
        title: { en: typeof enTitle === "string" ? enTitle : "Design Check", sr: typeof srTitle === "string" ? srTitle : "Provera dizajna" },
        message: { en: typeof enMessage === "string" ? enMessage : "", sr: typeof srMessage === "string" ? srMessage : "" },
      }];
    }) : [],
  }));
  return { attempt, lesson: lessonResult.data, steps: stepsResult.data ?? [], stepResults };
}
