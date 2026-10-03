"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, BookOpenCheck, BriefcaseBusiness, Check, CircleGauge, Clock3, FileCheck2, ScanLine } from "lucide-react";
import type { LearnerProgress, LessonProgress } from "@/practice/progress";
import { usePracticeSessionStore } from "@/practice/session-store";
import { createPracticeAttemptId } from "@/practice/session-store";
import { useRouter } from "next/navigation";

const copy = {
  en: {
    language: "Language", dashboardEyebrow: "LEARNING WORKSPACE", dashboard: "A place to learn by doing.", dashboardIntro: "Practice progress and your saved CAD work, together in one place.",
    continue: "Continue Practice", continueText: "Pick up where your last active attempt stopped.", start: "Start recommended lesson", noLessons: "No published Practice lessons are available yet.",
    practice: "Explore Practice", freeLab: "Free Lab", freeLabText: "Work independently in the shared CAD workspace.", openFreeLab: "Open Free Lab", recentCases: "Recent Cases", allCases: "All cases", noCases: "Saved Free Lab cases will appear here.", open: "Open",
    learningProgress: "Learning Progress", viewProgress: "View progress", publishedLessons: "published lessons", completed: "Completed", attempted: "Attempted", modules: "Modules", noAttempts: "No Practice attempts yet. Start with the recommended lesson when you are ready.",
    recentResults: "Recent Results", allResults: "All results", noResults: "Completed and in-progress attempts will appear here as you work through lessons.", review: "Review", inProgress: "In progress", notStarted: "Not started", completedStatus: "Completed", abandoned: "Abandoned", unavailableLesson: "Practice lesson unavailable", continueAction: "Continue", retry: "Repeat lesson", bestResult: "Best result", score: "Technical score", steps: "required steps", of: "of", updated: "Updated", revision: "Revision", startAnyway: "Start anyway", recommendations: "Recommended prerequisites", latestResult: "Latest result", results: "Results", resume: "Resume", startLesson: "Start lesson", noProgress: "Your learning record will appear as you complete Practice exercises.", skills: "Skill progress", modulesProgress: "Module progress", history: "Attempt history", lesson: "Lesson", status: "Status", date: "Date", checks: "Design Checks", noSkills: "No published skill areas are linked to lessons yet.", attempt: "attempt", attempts: "attempts", allComplete: "All currently published lessons are completed.", browse: "Browse lessons", emptyCases: "No saved cases yet", caseTypes: { practice: "Practice", scenario: "Scenario", import: "Import", blank: "Blank workspace" }, pass: "Pass", warning: "Review", fail: "Needs work", latest: "Latest", dateLocale: "en-US",
  },
  sr: {
    language: "Jezik", dashboardEyebrow: "PROSTOR ZA UČENJE", dashboard: "Učenje kroz praktičan rad.", dashboardIntro: "Napredak u vežbama i sačuvani CAD radovi na jednom mestu.",
    continue: "Nastavite vežbu", continueText: "Nastavite od mesta na kom je poslednji pokušaj stao.", start: "Započni preporučenu lekciju", noLessons: "Još nema objavljenih Practice lekcija.",
    practice: "Otvori Practice", freeLab: "Free Lab", freeLabText: "Samostalni rad u zajedničkom CAD okruženju.", openFreeLab: "Otvori Free Lab", recentCases: "Nedavni slučajevi", allCases: "Svi slučajevi", noCases: "Sačuvani Free Lab slučajevi pojaviće se ovde.", open: "Otvori",
    learningProgress: "Napredak u učenju", viewProgress: "Prikaži napredak", publishedLessons: "objavljenih lekcija", completed: "Završeno", attempted: "Započeto", modules: "Moduli", noAttempts: "Još nema Practice pokušaja. Kada budete spremni, počnite preporučenu lekciju.",
    recentResults: "Nedavni rezultati", allResults: "Svi rezultati", noResults: "Završeni i aktivni pokušaji pojaviće se ovde dok radite lekcije.", review: "Pregledaj", inProgress: "U toku", notStarted: "Nije započeto", completedStatus: "Završeno", abandoned: "Prekinuto", unavailableLesson: "Practice lekcija nije dostupna", continueAction: "Nastavi", retry: "Ponovi lekciju", bestResult: "Najbolji rezultat", score: "Tehnički rezultat", steps: "obavezna koraka", of: "od", updated: "Izmenjeno", revision: "Revizija", startAnyway: "Započni svakako", recommendations: "Preporučene predlekcije", latestResult: "Poslednji rezultat", results: "Rezultati", resume: "Nastavi", startLesson: "Započni lekciju", noProgress: "Vaša evidencija učenja pojaviće se kada završite Practice vežbe.", skills: "Napredak po veštinama", modulesProgress: "Napredak po modulima", history: "Istorija pokušaja", lesson: "Lekcija", status: "Status", date: "Datum", checks: "Design Check provere", noSkills: "Još nema objavljenih oblasti veština povezanih sa lekcijama.", attempt: "pokušaj", attempts: "pokušaja", allComplete: "Završili ste sve trenutno objavljene lekcije.", browse: "Pregledaj lekcije", emptyCases: "Još nema sačuvanih slučajeva", caseTypes: { practice: "Practice", scenario: "Scenario", import: "Uvoz", blank: "Prazan radni prostor" }, pass: "Prošlo", warning: "Proveriti", fail: "Potrebna dorada", latest: "Najnovije", dateLocale: "sr-RS",
  },
} as const;

type Locale = "en" | "sr";
type Copy = typeof copy[Locale];
function LocalizedShell({ children }: { children: (locale: Locale, t: Copy) => ReactNode }) {
  const locale = usePracticeSessionStore((state) => state.locale);
  const setLocale = usePracticeSessionStore((state) => state.setLocale);
  const language: Locale = locale === "sr" ? "sr" : "en";
  return <div><div className="mb-3 flex justify-end"><button type="button" onClick={() => setLocale(language === "en" ? "sr" : "en")} aria-label={copy[language].language} className="rounded-md border border-border px-2.5 py-1 text-[10px] font-semibold">{language.toUpperCase()}</button></div>{children(language, copy[language])}</div>;
}
function Heading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="mb-7"><p className="page-eyebrow">{eyebrow}</p><h1 className="mt-2 text-4xl font-medium leading-tight tracking-[-0.025em] sm:text-[2.65rem]">{title}</h1><p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-foreground">{description}</p></div>;
}
function Status({ value, locale }: { value: LessonProgress["status"] | "abandoned"; locale: Locale }) {
  const t = copy[locale];
  const label = value === "completed" ? t.completedStatus : value === "in_progress" ? t.inProgress : value === "abandoned" ? t.abandoned : t.notStarted;
  return <span className="rounded-full border border-border px-2 py-0.5 text-[10px] font-medium">{label}</span>;
}
function DateText({ date, locale }: { date: string; locale: Locale }) {
  return <time dateTime={date}>{new Intl.DateTimeFormat(copy[locale].dateLocale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(date))}</time>;
}
function Score({ value, locale }: { value: number | null; locale: Locale }) {
  if (value === null) return null;
  return <span className="text-[10px] text-muted-foreground">{copy[locale].bestResult}: {value.toLocaleString(copy[locale].dateLocale)} / 100</span>;
}

export function DashboardProgressView({ progress }: { progress: LearnerProgress }) {
  return <LocalizedShell>{(locale, t) => {
    const activeLesson = progress.continueAttempt ? progress.lessons.find((item) => item.lesson.id === progress.continueAttempt?.lesson_id) : null;
    const recommended = progress.recommendedLesson;
    const completedCount = progress.lessons.filter((item) => item.everCompleted).length;
    const attemptedCount = progress.lessons.filter((item) => item.attempts.length > 0).length;
    const recentAttempts = progress.attempts.slice(0, 4);
    return <div>
      <Heading eyebrow={t.dashboardEyebrow} title={t.dashboard} description={t.dashboardIntro} />
      <div className="grid gap-4 xl:grid-cols-[1.25fr_0.75fr]">
        <section className="app-surface p-5 sm:p-6">
          <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-soft text-primary"><BookOpenCheck className="size-[18px]" /></span><div className="min-w-0 flex-1"><p className="page-eyebrow">{t.continue}</p><h2 className="mt-1.5 text-xl font-medium">{activeLesson ? activeLesson.lesson[`title_${locale}`] : recommended ? recommended[`title_${locale}`] : t.allComplete}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{activeLesson ? `${activeLesson.activeAttempt?.completed_step_ids.length ?? 0} ${t.of} ${activeLesson.requiredStepCount} ${t.steps}` : recommended ? t.continueText : t.noAttempts}</p>
            <div className="mt-4 flex flex-wrap gap-2"><Link className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground" href={activeLesson && progress.continueAttempt ? `/practice/${activeLesson.lesson.slug}?attempt=${progress.continueAttempt.id}` : recommended ? `/practice/${recommended.slug}` : "/practice"}>{activeLesson ? t.continueAction : recommended ? t.start : t.browse}<ArrowRight className="size-3.5" /></Link><Link className="inline-flex h-9 items-center gap-2 rounded-lg border border-border px-3.5 text-xs font-semibold hover:bg-surface-soft" href="/practice">{t.practice}</Link></div>
          </div></div>
        </section>
        <section className="app-surface flex flex-col justify-between p-5 sm:p-6"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-soft text-primary"><ScanLine className="size-[18px]" /></span><div><p className="page-eyebrow">{t.freeLab}</p><p className="mt-1.5 text-sm leading-5 text-muted-foreground">{t.freeLabText}</p></div></div><Link className="mt-4 inline-flex h-9 w-fit items-center gap-2 rounded-lg border border-border px-3.5 text-xs font-semibold hover:bg-surface-soft" href="/free-lab">{t.openFreeLab}<ArrowRight className="size-3.5" /></Link></section>
      </div>
      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <section className="app-surface p-5"><div className="mb-4 flex items-center justify-between gap-3"><div><h2 className="text-lg font-medium">{t.learningProgress}</h2><p className="mt-1 text-[11px] text-muted-foreground">{completedCount} {t.of} {progress.lessons.length} {t.publishedLessons} · {attemptedCount} {t.attempted.toLowerCase()}</p></div><Link href="/progress" className="text-xs font-semibold text-primary hover:underline">{t.viewProgress}</Link></div>
          {progress.modules.length ? <ul className="space-y-3">{progress.modules.slice(0, 5).map((module) => <li key={module.id}><div className="mb-1 flex justify-between gap-3 text-xs"><span>{module[`title_${locale}`]}</span><span className="tabular-nums text-muted-foreground">{module.completedCount} / {module.lessons.length}</span></div><div role="progressbar" aria-label={module[`title_${locale}`]} aria-valuenow={module.completedCount} aria-valuemin={0} aria-valuemax={module.lessons.length} className="h-1.5 overflow-hidden rounded-full bg-surface-soft"><div className="h-full rounded-full bg-primary" style={{ width: `${module.percent}%` }} /></div></li>)}</ul> : <EmptyMessage text={t.noLessons} />}
        </section>
        <section className="app-surface p-5"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-medium">{t.recentCases}</h2><Link href="/cases" className="text-xs font-semibold text-primary hover:underline">{t.allCases}</Link></div>
          {progress.recentCases.length ? <ul className="divide-y divide-border">{progress.recentCases.slice(0, 4).map((item) => <li key={item.id} className="flex items-center gap-3 py-3 first:pt-0"><span className="grid size-8 shrink-0 place-items-center rounded-md bg-surface-soft text-primary"><BriefcaseBusiness className="size-4" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.title}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{t.caseTypes[item.source_type as keyof typeof t.caseTypes] ?? item.source_type} · {t.updated} <DateText date={item.updated_at} locale={locale} /></p></div>{item.revision_id && <Link href={`/workspace/${item.id}`} className="text-xs font-semibold text-primary">{t.open}</Link>}</li>)}</ul> : <EmptyMessage text={t.noCases} />}
        </section>
      </div>
      <section className="app-surface mt-5 p-5"><div className="mb-4 flex items-center justify-between gap-3"><h2 className="text-lg font-medium">{t.recentResults}</h2><Link href="/progress#attempt-history" className="text-xs font-semibold text-primary hover:underline">{t.allResults}</Link></div>
        {recentAttempts.length ? <ul className="divide-y divide-border">{recentAttempts.map((attempt) => { const lesson = progress.lessons.find((item) => item.lesson.id === attempt.lesson_id); return <li key={attempt.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0"><span className="grid size-8 shrink-0 place-items-center rounded-md bg-surface-soft text-primary"><FileCheck2 className="size-4" /></span><div className="min-w-0 flex-1"><Link className="truncate text-sm font-medium hover:text-primary" href={`/results/${attempt.id}`}>{lesson?.lesson[`title_${locale}`] ?? t.unavailableLesson}</Link><p className="mt-0.5 text-[10px] text-muted-foreground"><DateText date={attempt.completed_at ?? attempt.last_activity_at} locale={locale} /></p></div><Status value={attempt.status} locale={locale} /><Link href={`/results/${attempt.id}`} className="text-xs font-semibold text-primary">{t.review}</Link></li>; })}</ul> : <EmptyMessage text={t.noResults} />}
      </section>
    </div>;
  }}</LocalizedShell>;
}

export function ProgressLoadError() {
  return <LocalizedShell>{(locale) => <section role="alert" className="app-surface p-6"><h1 className="text-xl font-medium">{locale === "en" ? "Learning record unavailable" : "Evidencija učenja nije dostupna"}</h1><p className="mt-2 text-sm text-muted-foreground">{locale === "en" ? "Your learning data could not be loaded. Refresh the page to try again." : "Podaci o učenju nisu učitani. Osvežite stranicu i pokušajte ponovo."}</p></section>}</LocalizedShell>;
}

export function LearnerRouteError({ reset }: { reset: () => void }) {
  return <LocalizedShell>{(locale) => <section role="alert" className="app-surface p-6"><h1 className="text-xl font-medium">{locale === "en" ? "This learning page could not be loaded" : "Ova stranica za učenje nije učitana"}</h1><p className="mt-2 text-sm text-muted-foreground">{locale === "en" ? "Refresh the page or return to your learning record." : "Osvežite stranicu ili se vratite na evidenciju učenja."}</p><div className="mt-4 flex gap-2"><button type="button" onClick={reset} className="h-9 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground">{locale === "en" ? "Try again" : "Pokušaj ponovo"}</button><Link href="/progress" className="inline-flex h-9 items-center rounded-lg border border-border px-3.5 text-xs font-semibold">{locale === "en" ? "Learning progress" : "Napredak u učenju"}</Link></div></section>}</LocalizedShell>;
}

export function ProgressRecordView({ progress }: { progress: LearnerProgress }) {
  return <LocalizedShell>{(locale, t) => {
    const completed = progress.lessons.filter((item) => item.everCompleted).length;
    const attempted = progress.lessons.filter((item) => item.attempts.length > 0).length;
    return <div>
      <Heading eyebrow="LEARNING RECORD" title={t.learningProgress} description={`${completed} ${t.completed.toLowerCase()} · ${attempted} ${t.attempted.toLowerCase()} · ${progress.lessons.length} ${t.publishedLessons}.`} />
      <div className="mb-5 grid gap-3 sm:grid-cols-3"><SummaryCard icon={<Check className="size-4" />} label={t.completed} value={`${completed} / ${progress.lessons.length}`} /><SummaryCard icon={<Clock3 className="size-4" />} label={t.attempted} value={`${attempted} / ${progress.lessons.length}`} /><SummaryCard icon={<CircleGauge className="size-4" />} label={t.skills} value={`${progress.skills.length}`} /></div>
      {progress.modules.length > 0 && <section className="app-surface p-5"><h2 className="mb-4 text-lg font-medium">{t.modulesProgress}</h2><div className="grid gap-3 md:grid-cols-2">{progress.modules.map((module) => <article key={module.id} className="rounded-lg border border-border bg-background/60 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold">{module[`title_${locale}`]}</h3><p className="mt-1 text-[11px] text-muted-foreground">{module.completedCount} {t.of} {module.lessons.length} {t.completed.toLowerCase()} · {module.attemptedCount} {t.attempted.toLowerCase()}</p></div><span className="text-xs tabular-nums text-muted-foreground">{module.percent}%</span></div><div role="progressbar" aria-label={module[`title_${locale}`]} aria-valuenow={module.completedCount} aria-valuemin={0} aria-valuemax={module.lessons.length} className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-soft"><div className="h-full rounded-full bg-primary" style={{ width: `${module.percent}%` }} /></div><ul className="mt-3 divide-y divide-border">{module.lessons.map((item) => <LessonRow key={item.lesson.id} item={item} locale={locale} t={t} />)}</ul></article>)}</div></section>}
      <section className="app-surface mt-5 p-5"><h2 className="mb-4 text-lg font-medium">{t.skills}</h2>{progress.skills.length ? <div className="grid gap-x-6 gap-y-4 sm:grid-cols-2">{progress.skills.map((skill) => <div key={skill.id}><div className="mb-1 flex justify-between gap-3 text-xs"><span>{skill[`name_${locale}`]}</span><span className="text-muted-foreground">{skill.completedCount} / {skill.lessonCount}</span></div><div role="progressbar" aria-label={skill[`name_${locale}`]} aria-valuenow={skill.completedCount} aria-valuemin={0} aria-valuemax={skill.lessonCount} className="h-1.5 overflow-hidden rounded-full bg-surface-soft"><div className="h-full rounded-full bg-primary" style={{ width: `${skill.percent}%` }} /></div></div>)}</div> : <EmptyMessage text={t.noSkills} />}</section>
      <section id="attempt-history" className="app-surface mt-5 scroll-mt-4 p-5"><h2 className="mb-4 text-lg font-medium">{t.history}</h2>{progress.attempts.length ? <div className="overflow-x-auto"><table className="w-full min-w-[540px] text-left text-xs"><thead><tr className="border-b border-border text-muted-foreground"><th className="pb-2 pr-4 font-medium">{t.lesson}</th><th className="pb-2 pr-4 font-medium">{t.status}</th><th className="pb-2 pr-4 font-medium">{t.date}</th><th className="pb-2 pr-4 text-right font-medium">{t.score}</th><th className="pb-2" /></tr></thead><tbody>{progress.attempts.map((attempt) => { const item = progress.lessons.find((lesson) => lesson.lesson.id === attempt.lesson_id); return <tr key={attempt.id} className="border-b border-border/70 last:border-0"><td className="py-3 pr-4"><Link href={`/results/${attempt.id}`} className="font-medium hover:text-primary">{item?.lesson[`title_${locale}`] ?? t.unavailableLesson}</Link></td><td className="py-3 pr-4"><Status value={attempt.status} locale={locale} /></td><td className="py-3 pr-4 text-muted-foreground"><DateText date={attempt.completed_at ?? attempt.last_activity_at} locale={locale} /></td><td className="py-3 pr-4 text-right tabular-nums text-muted-foreground">{attempt.score === null ? "—" : `${attempt.score} / 100`}</td><td className="py-3 text-right"><Link href={`/results/${attempt.id}`} className="font-semibold text-primary">{t.review}</Link></td></tr>; })}</tbody></table></div> : <EmptyMessage text={t.noProgress} />}</section>
    </div>;
  }}</LocalizedShell>;
}

function LessonRow({ item, locale, t }: { item: LessonProgress; locale: Locale; t: Copy }) {
  const currentAttempt = item.activeAttempt ?? item.latestAttempt;
  return <li className="flex flex-wrap items-center gap-2 py-2.5 first:pt-0"><div className="min-w-0 flex-1"><p className="text-xs font-medium">{item.lesson[`title_${locale}`]}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{item.attempts.length} {item.attempts.length === 1 ? t.attempt : t.attempts}{currentAttempt ? ` · ${currentAttempt.completed_step_ids.length} ${t.of} ${item.requiredStepCount} ${t.steps}` : ""}</p></div><Status value={item.status} locale={locale} /><Score value={item.bestScore} locale={locale} />{item.latestCompletedAttempt && <Link href={`/results/${item.latestCompletedAttempt.id}`} aria-label={`${t.latestResult}: ${item.lesson[`title_${locale}`]}`} className="text-[10px] font-semibold text-primary">{t.latest}</Link>}</li>;
}
function SummaryCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="app-surface flex items-center gap-3 p-4"><span className="grid size-9 place-items-center rounded-lg bg-surface-soft text-primary">{icon}</span><div><p className="text-[10px] text-muted-foreground">{label}</p><p className="mt-0.5 text-lg font-medium tabular-nums">{value}</p></div></div>;
}
function EmptyMessage({ text }: { text: string }) { return <p className="rounded-lg border border-dashed border-border px-4 py-5 text-xs leading-5 text-muted-foreground">{text}</p>; }

export function AttemptResultView({ detail }: { detail: Awaited<ReturnType<typeof import("@/practice/progress-data").loadAttemptDetail>> }) {
  return <LocalizedShell>{(locale, t) => {
    if (!detail) return <Heading eyebrow="LEARNING RECORD" title={t.latestResult} description={t.noProgress} />;
    const { attempt, lesson, stepResults, steps } = detail;
    const title = lesson ? lesson[`title_${locale}`] : (locale === "en" ? "Practice lesson" : "Practice lekcija");
    const stepBySlug = new Map(steps.map((step) => [step.slug, step]));
    const attemptLabel = attempt.status === "completed" ? t.completedStatus : attempt.status === "abandoned" ? t.abandoned : t.inProgress;
    const localizedResultStatus = (status: string) => status === "passed" ? t.pass : status === "failed" ? t.fail : status === "abandoned" ? t.abandoned : t.inProgress;
    return <div><Heading eyebrow={t.latestResult.toUpperCase()} title={title} description={`${attemptLabel} · ${locale === "en" ? "Started" : "Započeto"} ${new Intl.DateTimeFormat(t.dateLocale, { dateStyle: "medium" }).format(new Date(attempt.started_at))}`} />
      <section className="app-surface mb-5 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-medium">{attemptLabel}</p><p className="mt-1 text-xs text-muted-foreground"><DateText date={attempt.completed_at ?? attempt.last_activity_at} locale={locale} /></p></div><div className="flex flex-wrap gap-2">{lesson && <RetryLessonAction lessonSlug={lesson.slug} label={t.retry} />}<Link className="inline-flex h-9 items-center rounded-lg border border-border px-3.5 text-xs font-semibold" href="/progress">{t.learningProgress}</Link></div></div>
      </section>
      <section className="app-surface p-5"><h2 className="mb-4 text-lg font-medium">{t.checks}</h2>{stepResults.length ? <ol className="space-y-3">{stepResults.map((row) => <li key={row.step_slug} className="rounded-lg border border-border bg-background/60 p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold">{row.lessonStep?.[`title_${locale}`] ?? stepBySlug.get(row.step_slug)?.[`title_${locale}`] ?? (locale === "en" ? "Practice step" : "Korak vežbe")}</h3><span className="rounded-full border border-border px-2 py-0.5 text-[10px]">{localizedResultStatus(row.status)} · {row.checks_count}</span></div>
          {row.validationResults.length ? <ul className="mt-3 space-y-2">{row.validationResults.map((result, index) => <li key={`${row.step_slug}-${index}`} className="border-l-2 border-border pl-3"><div className="flex flex-wrap items-center gap-2"><p className="text-xs font-medium">{result.title[locale]}</p><span className="rounded-full border border-border px-1.5 py-0.5 text-[9px]">{result.outcome === "pass" ? t.pass : result.outcome === "warning" ? t.warning : t.fail}</span></div>{result.message[locale] && <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">{result.message[locale]}</p>}</li>)}</ul> : <p className="mt-2 text-[11px] text-muted-foreground">{locale === "en" ? "No Design Check feedback was saved for this step." : "Za ovaj korak nije sačuvana povratna informacija Design Check-a."}</p>}
          <p className="mt-3 text-[10px] text-muted-foreground"><DateText date={row.updated_at} locale={locale} /></p></li>)}</ol> : <EmptyMessage text={t.noResults} />}</section>
      <section className="mt-4 rounded-lg border border-dashed border-border px-4 py-3 text-[10px] leading-5 text-muted-foreground">{locale === "en" ? "Free Lab work and saved CAD cases are separate from Practice lesson progress." : "Rad u Free Lab-u i sačuvani CAD slučajevi odvojeni su od napretka u Practice lekcijama."}</section>
      {attempt.score !== null && <p className="mt-4 px-1 text-[10px] text-muted-foreground">{t.score}: <span className="font-medium text-foreground">{attempt.score} / 100</span></p>}
    </div>;
  }}</LocalizedShell>;
}

function RetryLessonAction({ lessonSlug, label }: { lessonSlug: string; label: string }) {
  const router = useRouter();
  return <button type="button" className="inline-flex h-9 items-center rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground" onClick={() => router.push(`/practice/${lessonSlug}?newAttemptId=${createPracticeAttemptId()}`)}>{label}</button>;
}
