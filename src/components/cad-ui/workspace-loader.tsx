"use client";

import dynamic from "next/dynamic";
import type { PracticeLesson } from "@/practice/types";
import { useI18n } from "@/lib/i18n";

export type PracticeAttemptResume = {
  id: string;
  startedAt: string;
  completedAt: string | null;
  status: "in_progress" | "completed";
  completedStepIds: string[];
  stepResults: { stepSlug: string; checksCount: number; validationResults: unknown }[];
};

function WorkspaceLoading() {
  const { t } = useI18n();
  return <div className="grid h-dvh place-items-center bg-background text-xs text-muted-foreground">{t("loading")} {t("workspace")}</div>;
}

const CadWorkspace = dynamic(() => import("./cad-workspace").then((module) => module.CadWorkspace), {
  ssr: false,
  loading: WorkspaceLoading,
});

export function WorkspaceLoader({ caseId, practiceLessonId, freeLabSessionId, practiceLesson, practiceAttemptResume, newPracticeAttemptId, preview = false }: { caseId: string; practiceLessonId?: string; freeLabSessionId?: string; practiceLesson?: PracticeLesson; practiceAttemptResume?: PracticeAttemptResume; newPracticeAttemptId?: string; preview?: boolean }) {
  const mode = practiceLessonId ? "practice" : freeLabSessionId ? "free-lab" : "developer";
  return <CadWorkspace key={`${caseId}:${mode}`} caseId={caseId} practiceLessonId={practiceLessonId} freeLabSessionId={freeLabSessionId} practiceLesson={practiceLesson} practiceAttemptResume={practiceAttemptResume} newPracticeAttemptId={newPracticeAttemptId} preview={preview} />;
}
