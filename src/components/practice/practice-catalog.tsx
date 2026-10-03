"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, BookOpenCheck, Check, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PRACTICE_LEVELS } from "@/practice/lessons";
import type { PracticeLesson } from "@/practice/types";
import type { LessonProgress } from "@/practice/progress";
import { usePracticeSessionStore } from "@/practice/session-store";
import { localized } from "@/practice/types";
import { persistPracticeAttempt } from "@/practice/persist-attempt";
import { useI18n } from "@/lib/i18n";

export function PracticeCatalog({ lessons, progress = [] }: { lessons: PracticeLesson[]; progress?: LessonProgress[] }) {
  const router = useRouter();
  const { locale, setLocale, t } = useI18n();
  const start = async (lessonId: string) => {
    const lesson = lessons.find((entry) => entry.id === lessonId);
    if (!lesson) return;
    const item = progress.find((entry) => entry.lesson.slug === lessonId);
    if (item?.activeAttempt) {
      router.push(`/practice/${lesson.id}?attempt=${item.activeAttempt.id}`);
      return;
    }
    usePracticeSessionStore.getState().restart(lesson);
    const session = usePracticeSessionStore.getState().session;
    if (session) await persistPracticeAttempt(lesson, session);
    router.push(`/practice/${lesson.id}`);
  };
  return <div>
    <div className="mb-3 flex items-center justify-end gap-2 text-[10px]"><span className="text-muted-foreground">{t("lessonLanguage")}</span><button type="button" onClick={() => setLocale(locale === "en" ? "sr" : "en")} className="rounded border border-border px-2 py-1 font-semibold">{locale.toUpperCase()}</button></div>
    <section className="app-surface mb-7 flex flex-wrap items-center justify-between gap-4 p-5 sm:px-6"><div><p className="page-eyebrow">{t("learnByDoingEyebrow")}</p><h2 className="mt-1.5 text-xl font-medium">{t("startWithSkill")}</h2><p className="mt-1 text-xs text-muted-foreground">{t("learningPathsOpen")}</p></div><Link href="/free-lab" className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3.5 text-xs font-semibold hover:bg-surface-soft">{t("exploreFreeLab")}<ArrowRight className="size-3.5" /></Link></section>
    <div className="grid gap-3 md:grid-cols-2">{PRACTICE_LEVELS.map((level, index) => {
      const levelLessons = lessons.filter((lesson) => lesson.difficulty === level.id);
      const levelLabel = level.id === "foundation" ? t("cadFundamentals") : level.id === "beginner" ? t("scanAndModel") : level.id === "intermediate" ? t("restorationDesign") : t("complexWorkflows");
      return <section key={level.id} className="app-surface min-h-36 p-5"><div className="flex items-start gap-4"><span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-soft font-mono text-xs font-semibold text-primary">0{index + 1}</span><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><h2 className="text-lg font-medium">{localized(level.label, locale)}</h2><span className="rounded-full border border-border bg-background px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{levelLabel}</span></div><p className="mt-1.5 text-xs leading-5 text-muted-foreground">{levelLessons.length ? t("chooseGuidedExercise") : t("lessonsWillAppear")}</p></div></div>
        {levelLessons.map((lesson) => { const item = progress.find((entry) => entry.lesson.slug === lesson.id); const status = item?.status ?? "not_started"; const statusLabel = locale === "sr" ? (status === "completed" ? "Završeno" : status === "in_progress" ? "U toku" : status === "abandoned" ? "Prekinuto" : "Nije započeto") : (status === "completed" ? "Completed" : status === "in_progress" ? "In progress" : status === "abandoned" ? "Abandoned" : "Not started"); const currentAttempt = item?.activeAttempt ?? item?.latestAttempt; return <article key={lesson.id} className="mt-4 rounded-lg border border-border bg-background/70 p-3"><div className="flex items-start gap-2"><BookOpenCheck className="mt-0.5 size-4 shrink-0 text-primary" /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">{localized(lesson.title, locale)}</h3><span className="rounded-full border border-border px-2 py-0.5 text-[9px]">{statusLabel}</span></div><p className="mt-1 text-[11px] leading-4 text-muted-foreground">{localized(lesson.summary, locale)}</p><p className="mt-1 text-[10px] text-muted-foreground">{lesson.estimatedMinutes} min · {lesson.steps.length} steps{currentAttempt ? ` · ${currentAttempt.completed_step_ids.length}/${item?.requiredStepCount ?? 0} ${locale === "sr" ? "obaveznih koraka" : "required steps"}` : ""}</p>
          {lesson.recommendedPrerequisites.length > 0 && <div className="mt-2 rounded border border-amber-500/25 bg-amber-500/5 p-2"><p className="text-[10px] font-semibold">Recommended prerequisites</p>{lesson.recommendedPrerequisites.map((item) => <p key={item.en} className="mt-1 text-[10px] text-muted-foreground">· {localized(item, locale)}</p>)}<p className="mt-1 text-[9px] text-muted-foreground">Recommended path: complete the listed lessons first. You can still start now.</p></div>}
          <div className="mt-2 flex flex-wrap items-center gap-2"><Button size="sm" className="h-7 gap-1.5 text-[10px]" onClick={() => void start(lesson.id)}><Play className="size-3" />{status === "in_progress" ? (locale === "sr" ? "Nastavi" : "Resume") : status === "completed" || status === "abandoned" ? (locale === "sr" ? "Ponovi lekciju" : "Repeat lesson") : lesson.recommendedPrerequisites.length ? (locale === "sr" ? "Započni svakako" : "Start anyway") : (locale === "sr" ? "Započni lekciju" : "Start lesson")}</Button>{item?.latestCompletedAttempt && <Link className="inline-flex h-7 items-center px-2 text-[10px] font-semibold text-primary hover:underline" href={`/results/${item.latestCompletedAttempt.id}`}>{locale === "sr" ? "Rezultati" : "Results"}</Link>}</div>
        </div></div></article>; })}
      </section>;
    })}</div>
    <div className="mt-5 flex items-center gap-2 rounded-lg border border-dashed border-border p-4 text-[11px] text-muted-foreground"><Check className="size-4 text-primary" />Lessons use educational exercise targets and do not certify clinical suitability.</div>
  </div>;
}
