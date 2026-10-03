"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, BookOpen, BriefcaseBusiness, ClipboardList, FileUp, FlaskConical, RotateCcw, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FREE_LAB_CATEGORIES, FREE_LAB_DIFFICULTY_LABELS, selectRandomScenario } from "./scenarios";
import { resolveScenarioPackage } from "./package-resolution";
import { createFreeLabSession, writeFreeLabSession } from "./session";
import type { FreeLabCategory, FreeLabDifficulty, FreeLabOrigin, FreeLabScenario } from "./types";
import { useI18n, type MessageKey } from "@/lib/i18n";

const entryCards: { origin: FreeLabOrigin; title: MessageKey; description: MessageKey; icon: typeof BookOpen; action: MessageKey }[] = [
  { origin: "scenario", title: "scenarioCard", description: "scenarioCardText", icon: ClipboardList, action: "browseScenarios" },
  { origin: "import", title: "importCard", description: "importCardText", icon: FileUp, action: "selectFiles" },
  { origin: "blank", title: "blankCard", description: "blankCardText", icon: FlaskConical, action: "openEmptyWorkspace" },
  { origin: "random", title: "randomCard", description: "randomCardText", icon: Shuffle, action: "chooseFilters" },
];
export const FREE_LAB_ENTRY_MODES: readonly FreeLabOrigin[] = entryCards.map(({ origin }) => origin);
export const FREE_LAB_RANDOM_DEFAULT_FILTERS = { category: "crown", difficulty: "intermediate" } as const;

function categoryLabel(category: FreeLabCategory, t: (key: MessageKey) => string) {
  if (category === "crown") return t("crown");
  if (category === "bridge") return t("bridge");
  if (category === "inlay_onlay") return `${t("inlay")} / ${t("onlay")}`;
  if (category === "veneer") return t("veneer");
  if (category === "complete_denture") return t("completeDenture");
  if (category === "partial_denture") return t("partialDenture");
  if (category === "bite_splint") return t("biteSplint");
  if (category === "digital_model") return t("digitalModel");
  return t("implantFixture");
}

function difficultyLabel(difficulty: FreeLabDifficulty, t: (key: MessageKey) => string) {
  return t(`${difficulty}Level` as MessageKey);
}

function launch(router: ReturnType<typeof useRouter>, config: Parameters<typeof createFreeLabSession>[0]) {
  const session = createFreeLabSession(config);
  writeFreeLabSession(session);
  router.push(`/free-lab/workspace/${session.workspaceId}`);
}

function CaseBrief({ scenario, locale, onOpen, preview = false }: { scenario: FreeLabScenario; locale: "en" | "sr"; onOpen: () => void; preview?: boolean }) {
  const { t } = useI18n();
  const brief = scenario.brief;
  return <section aria-label={t("caseBrief")} className="rounded-lg border border-border bg-card p-4">
    <p className="mb-2 rounded bg-primary/5 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-primary">{t("syntheticTraining")} · {t("notPatientData")}</p>
    <div className="flex items-start justify-between gap-3 border-b border-border pb-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">{t("caseBrief")} · {scenario.slug.toUpperCase()}</p><h3 className="mt-1 text-base font-semibold">{scenario.title[locale]}</h3><p className="mt-1 text-[11px] leading-4 text-muted-foreground">{scenario.description[locale]}</p></div><span className="rounded border border-border px-2 py-1 text-[10px] text-muted-foreground">{difficultyLabel(scenario.difficulty, t)}</span></div>
    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 py-3 text-[11px] sm:grid-cols-3"><BriefField label={locale === "en" ? "Training case ID" : "Oznaka vežbovnog slučaja"} value={brief.patientCode} /><BriefField label={t("age")} value={brief.patientAge ? `${brief.patientAge}` : "—"} /><BriefField label={t("indication")} value={brief.indication[locale]} /><BriefField label={t("targetTeeth")} value={brief.targetTeeth.join(", ")} /><BriefField label={t("material")} value={brief.material[locale]} /><BriefField label={locale === "en" ? "Category" : "Kategorija"} value={categoryLabel(scenario.category, t)} /></dl>
    <div className="grid gap-4 border-t border-border pt-3 sm:grid-cols-3"><BriefList title={t("supplied")} entries={brief.supplied[locale]} /><BriefList title={t("requirements")} entries={brief.requirements[locale]} /><BriefList title={t("exerciseNotes")} entries={[brief.notes?.[locale] ?? t("simulatedContent")]} /></div>
    {preview && <p className="mt-3 rounded border border-amber-600/30 bg-amber-500/5 px-2 py-1.5 text-[10px] text-amber-800 dark:text-amber-200">{t("adminPreview")} · {locale === "en" ? "Changes and completion will not be saved to user records." : "Izmene i završetak neće biti sačuvani u korisničkim zapisima."}</p>}
    <div className="mt-4 flex flex-wrap gap-2"><Button onClick={onOpen}>{preview ? (locale === "en" ? "Launch preview" : "Pokreni pregled") : t("workspace")} <ArrowRight className="ml-1 size-3.5" /></Button></div>
  </section>;
}

function BriefField({ label, value }: { label: string; value: string }) { return <div><dt className="text-[9px] uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="mt-0.5 font-medium">{value}</dd></div>; }
function BriefList({ title, entries }: { title: string; entries: string[] }) { return <div><h4 className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4><ul className="mt-1.5 space-y-1 text-[10px] leading-4">{entries.map((entry) => <li key={entry}>· {entry}</li>)}</ul></div>; }

export function FreeLabHome({ scenarios, previewScenarioId }: { scenarios: FreeLabScenario[]; previewScenarioId?: string }) {
  const router = useRouter();
  const previewScenario = scenarios.find((scenario) => scenario.id === previewScenarioId);
  const [selected, setSelected] = useState<FreeLabScenario | null>(previewScenario ?? null);
  const [category, setCategory] = useState<FreeLabCategory>(FREE_LAB_RANDOM_DEFAULT_FILTERS.category);
  const [difficulty, setDifficulty] = useState<FreeLabDifficulty>(FREE_LAB_RANDOM_DEFAULT_FILTERS.difficulty);
  const [catalogCategory, setCatalogCategory] = useState<FreeLabCategory | "all">("all");
  const [catalogDifficulty, setCatalogDifficulty] = useState<FreeLabDifficulty | "all">("all");
  const [randomMessage, setRandomMessage] = useState("");
  const { locale, setLocale, t } = useI18n();
  const catalog = scenarios.filter((scenario) => (scenario.status === "published" || scenario.id === previewScenarioId) && (catalogCategory === "all" || scenario.category === catalogCategory) && (catalogDifficulty === "all" || scenario.difficulty === catalogDifficulty));

  const onEntry = (origin: FreeLabOrigin) => {
    if (origin === "scenario") { document.getElementById("scenario-catalog")?.scrollIntoView({ behavior: "smooth", block: "start" }); return; }
    if (origin === "random") { document.getElementById("random-case")?.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
    launch(router, { origin, title: origin === "blank" ? t("blankCard") : t("importCard") });
  };

  const pickRandom = () => {
    const scenario = selectRandomScenario(scenarios, category, difficulty);
    if (!scenario) { setRandomMessage(t("noMatchingScenarios")); setSelected(null); return; }
    const resolved = resolveScenarioPackage(scenario);
    if (!resolved) { setRandomMessage(t("noMatchingScenarios")); setSelected(null); return; }
    setRandomMessage("");
    launch(router, { origin: "random", scenarioId: scenario.id, scenarioAssets: scenario.assets, title: scenario.title[locale], category: scenario.category, restorationType: scenario.restorationType, partialDentureClass: scenario.partialDentureClass, difficulty: scenario.difficulty, caseBrief: scenario.brief, materialPreset: scenario.materialPreset, caseInitializer: scenario.caseInitializer, casePackageId: resolved.manifest.packageId, casePackage: scenario.casePackage, checkpointId: resolved.checkpointId });
  };

  return <div>
    <div className="mb-7"><p className="page-eyebrow">{t("freeLabPage")}</p><h1 className="mt-2 text-3xl font-medium tracking-tight">Free Lab</h1><p className="mt-2 max-w-2xl text-[13px] leading-6 text-muted-foreground">{t("workIndependently")}</p></div>
    <section aria-label="Start a Free Lab session" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{entryCards.map(({ origin, title, description, icon: Icon, action }) => <button key={origin} type="button" onClick={() => onEntry(origin)} className="app-surface group flex min-h-44 flex-col items-start p-4 text-left transition-colors hover:border-primary/40 hover:bg-card">
      <span className="grid size-9 place-items-center rounded-lg bg-surface-soft text-primary"><Icon className="size-[17px]" /></span><span className="mt-3 text-sm font-semibold">{t(title)}</span><span className="mt-1 text-[11px] leading-5 text-muted-foreground">{t(description)}</span><span className="mt-auto flex items-center gap-1 pt-4 text-[10px] font-semibold text-primary">{t(action)}<ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" /></span>
    </button>)}</section>

    <section id="scenario-catalog" className="mt-8 scroll-mt-6"><div className="mb-3 flex flex-wrap items-end justify-between gap-3"><div><p className="page-eyebrow">{previewScenario ? t("adminPreview") : t("publishedCases")}</p><h2 className="mt-1 text-xl font-medium">{previewScenario ? t("scenarioPreview") : t("scenarioCatalog")}</h2></div><label className="text-[9px] text-muted-foreground">{t("scenarioLanguage")}<select value={locale} onChange={(event) => setLocale(event.target.value as "en" | "sr")} className="ml-1 h-8 rounded border border-input bg-background px-2 text-[10px]"><option value="en">English</option><option value="sr">Srpski</option></select></label><div className="flex flex-wrap items-end gap-2"><label className="text-[9px] text-muted-foreground">{locale === "en" ? "Category" : "Kategorija"}<select aria-label={locale === "en" ? "Scenario category filter" : "Filter kategorije scenarija"} value={catalogCategory} onChange={(event) => { setCatalogCategory(event.target.value as FreeLabCategory | "all"); setSelected(null); }} className="mt-1 block h-8 min-w-44 rounded-md border border-input bg-background px-2 text-[10px] text-foreground"><option value="all">{t("allCategories")}</option>{FREE_LAB_CATEGORIES.map((item) => <option key={item.id} value={item.id}>{categoryLabel(item.id, t)}</option>)}</select></label><label className="text-[9px] text-muted-foreground">{locale === "en" ? "Difficulty" : "Težina"}<select aria-label={locale === "en" ? "Scenario difficulty filter" : "Filter težine scenarija"} value={catalogDifficulty} onChange={(event) => { setCatalogDifficulty(event.target.value as FreeLabDifficulty | "all"); setSelected(null); }} className="mt-1 block h-8 min-w-36 rounded-md border border-input bg-background px-2 text-[10px] text-foreground"><option value="all">{t("allDifficulties")}</option>{Object.entries(FREE_LAB_DIFFICULTY_LABELS).map(([id]) => <option key={id} value={id}>{difficultyLabel(id as FreeLabDifficulty, t)}</option>)}</select></label><span className="pb-2 text-[10px] text-muted-foreground">{catalog.length} {t("caseCount")}</span></div></div>
      {catalog.length === 0 ? <div className="app-surface p-5 text-xs text-muted-foreground">{t("noScenarios")}</div> : <div className="grid gap-3 lg:grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)]"><div className="app-surface divide-y divide-border p-1">{catalog.map((scenario) => <button type="button" key={scenario.id} onClick={() => setSelected(scenario)} aria-pressed={selected?.id === scenario.id} className={`flex w-full items-center gap-3 rounded-md p-3 text-left ${selected?.id === scenario.id ? "bg-primary/5" : "hover:bg-muted/60"}`}><span className="grid size-9 shrink-0 place-items-center rounded-md bg-surface-soft text-primary"><BriefcaseBusiness className="size-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{scenario.title[locale]}</span><span className="mt-1 block text-[10px] text-muted-foreground">{categoryLabel(scenario.category, t)}{scenario.partialDentureClass ? ` · Kennedy ${scenario.partialDentureClass}` : ""} · {difficultyLabel(scenario.difficulty, t)}{scenario.id === previewScenarioId ? " · Preview" : ""}</span></span><ArrowRight className="size-3.5 text-muted-foreground" /></button>)}</div>{selected ? <CaseBrief scenario={selected} locale={locale} preview={selected.id === previewScenarioId} onOpen={() => launch(router, { origin: "scenario", scenarioId: selected.id, scenarioAssets: selected.assets, title: selected.title[locale], category: selected.category, restorationType: selected.restorationType, partialDentureClass: selected.partialDentureClass, difficulty: selected.difficulty, caseBrief: selected.brief, materialPreset: selected.materialPreset, caseInitializer: selected.caseInitializer, casePackageId: selected.casePackageId, casePackage: selected.casePackage, checkpointId: selected.startingCheckpointId, preview: selected.id === previewScenarioId })} /> : <div className="app-surface grid min-h-52 place-items-center p-5 text-center"><div><ClipboardList className="mx-auto size-6 text-muted-foreground" /><p className="mt-3 text-xs font-medium">{t("selectScenario")}</p><p className="mt-1 text-[10px] text-muted-foreground">{t("requirementsDoNotGate")}</p></div></div>}</div>}
    </section>

    <section id="random-case" className="app-surface mt-8 scroll-mt-6 p-4 sm:p-5"><div className="flex items-start gap-3"><span className="grid size-9 place-items-center rounded-lg bg-surface-soft text-primary"><Shuffle className="size-4" /></span><div><p className="page-eyebrow">{t("randomCase")}</p><h2 className="mt-1 text-lg font-medium">{t("practicePrompt")}</h2><p className="mt-1 text-[11px] text-muted-foreground">{t("eligibleFilterInfo")}</p></div></div><div className="mt-4 flex flex-wrap items-end gap-3"><label className="text-[10px] text-muted-foreground">{locale === "en" ? "Category" : "Kategorija"}<select aria-label={locale === "en" ? "Random case category" : "Kategorija nasumičnog slučaja"} value={category} onChange={(event) => { setCategory(event.target.value as FreeLabCategory); setRandomMessage(""); }} className="mt-1 block h-9 min-w-56 rounded-md border border-input bg-background px-2 text-xs text-foreground">{FREE_LAB_CATEGORIES.map((item) => <option key={item.id} value={item.id}>{categoryLabel(item.id, t)}</option>)}</select></label><label className="text-[10px] text-muted-foreground">{locale === "en" ? "Difficulty" : "Težina"}<select aria-label={locale === "en" ? "Random case difficulty" : "Težina nasumičnog slučaja"} value={difficulty} onChange={(event) => { setDifficulty(event.target.value as FreeLabDifficulty); setRandomMessage(""); }} className="mt-1 block h-9 min-w-40 rounded-md border border-input bg-background px-2 text-xs text-foreground">{Object.entries(FREE_LAB_DIFFICULTY_LABELS).map(([id]) => <option key={id} value={id}>{difficultyLabel(id as FreeLabDifficulty, t)}</option>)}</select></label><Button onClick={pickRandom} className="h-9 gap-2"><Shuffle className="size-3.5" />{t("selectRandomCase")}</Button><span role="status" className="basis-full text-[11px] text-muted-foreground">{randomMessage}</span></div></section>

    <p className="mt-5 flex items-center gap-1.5 text-[10px] text-muted-foreground"><RotateCcw className="size-3" />{t("sessionTemporary")}</p>
  </div>;
}
