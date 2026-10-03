import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthenticatedIdentity } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";
import { deriveCompletedRequiredStepSlugs } from "@/practice/progress";
import { scoreResults } from "@/practice/validators";

const localizedText = z.object({ en: z.string().max(500), sr: z.string().max(500) });
const validationResult = z.object({ id: z.string().max(180), validatorType: z.string().max(80), outcome: z.enum(["pass", "warning", "fail"]), title: localizedText, message: localizedText, measured: z.number().finite().optional(), target: z.number().finite().optional(), objectId: z.string().max(180).optional() });
const payloadSchema = z.object({
  id: z.string().uuid(), lessonId: z.string().uuid(), startedAt: z.string().datetime(), completedAt: z.string().datetime().nullable(), completed: z.boolean(),
  checksByStep: z.record(z.string(), z.number().int().nonnegative()), completedStepIds: z.array(z.string().max(180)).max(100),
  resultsByStep: z.record(z.string(), z.array(validationResult).max(50)),
  validationFingerprintByStep: z.record(z.string(), z.string().max(2000)),
});

export async function POST(request: Request) {
  let identity: Awaited<ReturnType<typeof getAuthenticatedIdentity>>;
  try { identity = await getAuthenticatedIdentity(); }
  catch { return NextResponse.json({ error: "Practice attempt service is unavailable." }, { status: 503 }); }
  if (!identity) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid Practice attempt payload." }, { status: 400 });

  try {
    const body = parsed.data;
    const db = await createServerSupabaseClient();
    const { data: lesson } = await db.from("practice_lessons").select("id,module_id").eq("id", body.lessonId).eq("status", "published").maybeSingle();
    if (!lesson) return NextResponse.json({ error: "Published Practice lesson not found." }, { status: 404 });
    const { data: module } = await db.from("practice_modules").select("id").eq("id", lesson.module_id).eq("status", "published").maybeSingle();
    if (!module) return NextResponse.json({ error: "Published Practice lesson not found." }, { status: 404 });
    const { data: lessonSteps, error: stepsError } = await db.from("practice_steps").select("slug,required").eq("lesson_id", lesson.id).order("sort_order");
    if (stepsError) throw new Error(stepsError.message);
    const lessonStepSlugs = new Set((lessonSteps ?? []).map((step) => step.slug));
    const validResultsByStep = Object.fromEntries(Object.entries(body.resultsByStep).filter(([slug]) => lessonStepSlugs.has(slug)));
    const completion = deriveCompletedRequiredStepSlugs((lessonSteps ?? []).filter((step) => step.required).map((step) => step.slug), body.completedStepIds, validResultsByStep);
    const stepRows: Database["public"]["Tables"]["attempt_step_results"]["Insert"][] = Object.entries(validResultsByStep).map(([stepSlug, results]) => ({
      attempt_id: body.id,
      step_slug: stepSlug,
      status: (completion.completedStepIds.includes(stepSlug) ? "passed" : results.some((result) => result.outcome === "fail") ? "failed" : "in_progress") as Database["public"]["Enums"]["step_result_status"],
      checks_count: body.checksByStep[stepSlug] ?? 0,
      validation_results: results,
      geometry_fingerprint: body.validationFingerprintByStep[stepSlug] ?? null,
      updated_at: new Date().toISOString(),
    }));
    const results = Object.values(validResultsByStep).flat();
    const score = scoreResults(results);
    const attempt = await db.from("practice_attempts").upsert({
      id: body.id,
      user_id: identity.id,
      lesson_id: body.lessonId,
      status: completion.isComplete ? "completed" : "in_progress",
      started_at: body.startedAt,
      completed_at: completion.isComplete ? body.completedAt ?? new Date().toISOString() : null,
      checks_count: Object.values(body.checksByStep).reduce((sum, count) => sum + count, 0),
      completed_step_ids: completion.completedStepIds,
      score,
      result_summary: { checksByStep: body.checksByStep, completedStepIds: completion.completedStepIds },
      last_activity_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "id" });
    if (attempt.error) throw new Error(attempt.error.message);
    if (stepRows.length) {
      const stepResult = await db.from("attempt_step_results").upsert(stepRows, { onConflict: "attempt_id,step_slug" });
      if (stepResult.error) throw new Error(stepResult.error.message);
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Practice attempt could not be saved." }, { status: 503 });
  }
}
