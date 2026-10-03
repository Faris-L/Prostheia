import { notFound } from "next/navigation";
import { WorkspaceLoader } from "@/components/cad-ui/workspace-loader";
import { loadPracticeLessonBySlug } from "@/practice/database-catalog";
import { requireAdminUser } from "@/lib/auth/guards";
import { loadAttemptDetail } from "@/practice/progress-data";

export default async function PracticeLessonPage({ params, searchParams }: { params: Promise<{ lessonId: string }>; searchParams: Promise<{ preview?: string; attempt?: string; newAttemptId?: string }> }) {
  const { lessonId } = await params;
  const query = await searchParams;
  const preview = query.preview === "1";
  if (preview) await requireAdminUser();
  const lesson = await loadPracticeLessonBySlug(lessonId, "en", preview);
  if (!lesson) notFound();
  let practiceAttemptResume;
  let newPracticeAttemptId: string | undefined;
  if (query.attempt) {
    const detail = await loadAttemptDetail(query.attempt);
    if (!detail || detail.attempt.status !== "in_progress" || detail.lesson?.slug !== lessonId) notFound();
    practiceAttemptResume = {
      id: detail.attempt.id,
      startedAt: detail.attempt.started_at,
      completedAt: detail.attempt.completed_at,
      status: detail.attempt.status,
      completedStepIds: detail.attempt.completed_step_ids,
      stepResults: detail.stepResults.map((row) => ({ stepSlug: row.step_slug, checksCount: row.checks_count, validationResults: row.validationResults })),
    };
  } else if (query.newAttemptId) {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(query.newAttemptId)) notFound();
    const previous = await loadAttemptDetail(query.newAttemptId);
    if (previous && previous.lesson?.slug !== lessonId) notFound();
    if (previous?.attempt.status === "abandoned") notFound();
    if (previous) {
      practiceAttemptResume = {
        id: previous.attempt.id,
        startedAt: previous.attempt.started_at,
        completedAt: previous.attempt.completed_at,
        status: previous.attempt.status,
        completedStepIds: previous.attempt.completed_step_ids,
        stepResults: previous.stepResults.map((row) => ({ stepSlug: row.step_slug, checksCount: row.checks_count, validationResults: row.validationResults })),
      };
    } else newPracticeAttemptId = query.newAttemptId;
  }
  return <WorkspaceLoader caseId={`practice-${lesson.id}`} practiceLessonId={lesson.id} practiceLesson={lesson} practiceAttemptResume={practiceAttemptResume} newPracticeAttemptId={newPracticeAttemptId} preview={preview} />;
}
