"use client";

import Link from "next/link";
import { ArrowRight, BookOpenCheck, BriefcaseBusiness, CircleGauge, ScanLine } from "lucide-react";
import { DentalPreview } from "@/components/prostheia-mark";
import { PracticeCatalog } from "@/components/practice/practice-catalog";
import { FreeLabHome } from "@/free-lab/free-lab-page";
import { MyCasesList } from "@/components/cad-ui/my-cases-list";
import type { PracticeLesson } from "@/practice/types";
import type { FreeLabScenario } from "@/free-lab/types";
import type { LessonProgress } from "@/practice/progress";
import { useI18n } from "@/lib/i18n";

function PageHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <div className="mb-7"><p className="page-eyebrow">{eyebrow}</p><h1 className="mt-2 text-4xl font-medium leading-tight tracking-[-0.025em] sm:text-[2.65rem]">{title}</h1><p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-foreground">{description}</p></div>;
}

function EmptyState({ icon: Icon, title, children, action }: { icon: typeof BookOpenCheck; title: string; children: string; action?: { href: string; label: string } }) {
  return <div className="flex min-h-40 items-center gap-4 rounded-xl border border-dashed border-border bg-background/60 px-5 py-5 sm:px-6"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-surface-soft text-primary"><Icon className="size-[18px]" strokeWidth={1.8}/></span><div className="min-w-0 flex-1"><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 max-w-xl text-xs leading-5 text-muted-foreground">{children}</p></div>{action && <Link href={action.href} className="hidden shrink-0 items-center gap-1 text-xs font-semibold text-primary hover:underline sm:inline-flex">{action.label}<ArrowRight className="size-3.5"/></Link>}</div>;
}

function DentalArt() {
  return <div className="relative min-h-[250px] overflow-hidden rounded-xl border border-border bg-surface-blue px-3 py-2 sm:min-h-[300px]"><div className="absolute inset-0 opacity-70" style={{ backgroundImage: "radial-gradient(var(--border) .7px, transparent .7px)", backgroundSize: "16px 16px" }} /><div className="relative h-full min-h-[235px] sm:min-h-[285px]"><DentalPreview /></div></div>;
}

export function DashboardPage() {
  const { t } = useI18n();
  return <div>
    <PageHeading eyebrow={t("learningWorkspace")} title={t("learnByDoing")} description={t("learningIntro")} />
    <section className="app-surface overflow-hidden p-5 sm:p-7">
      <div className="grid gap-6 lg:grid-cols-[1fr_0.86fr] lg:items-center">
        <div className="py-1 sm:py-3"><p className="page-eyebrow">{t("yourWorkspace")}</p><h2 className="mt-3 max-w-xl text-3xl font-medium leading-tight sm:text-[2.15rem]">{t("continueCraft")}</h2><p className="mt-3 max-w-lg text-[13px] leading-6 text-muted-foreground">{t("choosePath")}</p><div className="mt-5 flex flex-wrap gap-2.5"><Link href="/practice" className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground transition-colors hover:opacity-90">{t("explorePractice")}<ArrowRight className="size-3.5"/></Link><Link href="/free-lab" className="inline-flex h-10 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-xs font-semibold transition-colors hover:bg-surface-soft">{t("openFreeLab")}<ScanLine className="size-3.5 text-primary"/></Link></div></div>
        <DentalArt />
      </div>
    </section>
    <div className="mt-8 grid gap-6 xl:grid-cols-2">
      <section><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-medium">{t("continuePractice")}</h2><Link href="/practice" className="text-xs font-semibold text-primary hover:underline">{t("viewLearningPaths")}</Link></div><EmptyState icon={BookOpenCheck} title={t("yourLearningStarts")}>{t("practiceProgressAppears")}</EmptyState></section>
      <section><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-medium">{t("recentCases")}</h2><Link href="/cases" className="text-xs font-semibold text-primary hover:underline">{t("viewCases")}</Link></div><EmptyState icon={BriefcaseBusiness} title={t("noSavedCases")}>{t("savedCasesAppear")}</EmptyState></section>
    </div>
    <section className="mt-7"><h2 className="mb-3 text-xl font-medium">{t("learningProgress")}</h2><EmptyState icon={CircleGauge} title={t("learningRecord")}>{t("progressAppears")}</EmptyState></section>
  </div>;
}

export function FreeLabPage({ scenarios, previewScenarioId }: { scenarios: FreeLabScenario[]; previewScenarioId?: string }) {
  return <FreeLabHome scenarios={scenarios} previewScenarioId={previewScenarioId} />;
}

export function PracticePage({ lessons, progress = [] }: { lessons: PracticeLesson[]; progress?: LessonProgress[] }) {
  const { t } = useI18n();
  return <div>
    <PageHeading eyebrow={t("guidedLearning")} title={t("practice")} description={t("practiceIntro")} />
    <PracticeCatalog lessons={lessons} progress={progress} />
  </div>;
}

export function CasesPage() {
  const { t } = useI18n();
  return <div><PageHeading eyebrow={t("caseWorkspace")} title={t("myCases")} description={t("casesIntro")}/><section className="app-surface p-5 sm:p-7"><div className="mb-5 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-surface-soft text-primary"><BriefcaseBusiness className="size-[18px]"/></span><div><h2 className="text-xl font-medium">{t("savedDesignCases")}</h2><p className="mt-0.5 text-xs text-muted-foreground">{t("privateCloudCases")}</p></div></div><MyCasesList/><Link href="/free-lab" className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-xs font-semibold text-primary-foreground">{t("startInFreeLab")}<ArrowRight className="size-3.5"/></Link></section></div>;
}

export function ProgressPage() {
  const { t } = useI18n();
  return <div><PageHeading eyebrow={t("learningRecord")} title={t("progress")} description={t("progressIntro")}/><section className="app-surface p-5 sm:p-7"><div className="mb-5 flex items-center gap-3"><span className="grid size-10 place-items-center rounded-lg bg-surface-soft text-primary"><CircleGauge className="size-[18px]"/></span><div><h2 className="text-xl font-medium">{t("skillsAndActivity")}</h2><p className="mt-0.5 text-xs text-muted-foreground">{t("completedExercisesAreas")}</p></div></div><EmptyState icon={CircleGauge} title={t("learningWillAppear")}>{t("completePracticeToBuild")}</EmptyState></section></div>;
}
