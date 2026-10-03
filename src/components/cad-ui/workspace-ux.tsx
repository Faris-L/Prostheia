"use client";

import { ArrowLeft, Brush, CircleDashed, Crosshair, Grid2X2, Move3D, SlidersHorizontal, Wrench } from "lucide-react";
import type { PracticeLesson, PracticeStep } from "@/practice/types";

export type ToolGroup = "navigation" | "edit" | "margin" | "analysis" | "sculpt" | "mesh";
export type WorkflowItem = { id: string; title: { en: string; sr: string }; status: "complete" | "current" | "upcoming" };

export const toolGroupLabels: Record<ToolGroup, { en: string; sr: string }> = {
  navigation: { en: "Navigation", sr: "Navigacija" },
  edit: { en: "Edit / Transform", sr: "Uređivanje / Transformacija" },
  margin: { en: "Margin / Curves", sr: "Margina / Krive" },
  analysis: { en: "Analysis", sr: "Analiza" },
  sculpt: { en: "Sculpt", sr: "Skulptovanje" },
  mesh: { en: "Mesh Editing", sr: "Uređivanje mreže" },
};

export function localeText(locale: "en" | "sr", en: string, sr: string) { return locale === "sr" ? sr : en; }

export type RightPanelMode = "guide" | "properties";

export function defaultRightPanelMode(isPractice: boolean): RightPanelMode {
  return isPractice ? "guide" : "properties";
}

export function RightPanelModeControl({ practice, mode, locale, onOpenProperties, onBackToTask }: { practice: boolean; mode: RightPanelMode; locale: "en" | "sr"; onOpenProperties: () => void; onBackToTask: () => void }) {
  return <div className="cad-right-mode-control">
    {practice && mode === "properties" ? <>
      <button type="button" className="cad-right-mode-back" onClick={onBackToTask}><ArrowLeft aria-hidden="true" className="size-3.5" />{localeText(locale, "Back to task", "Nazad na zadatak")}</button>
      <span className="cad-right-mode-label" aria-current="page">{localeText(locale, "Properties", "Svojstva")}</span>
    </> : practice ? <>
      <span className="cad-right-mode-label cad-guide-mode-title" aria-current="page">{localeText(locale, "Learning Guide", "Vodič za učenje")}</span>
      <button type="button" aria-pressed={false} className="cad-right-mode-properties" onClick={onOpenProperties}><SlidersHorizontal aria-hidden="true" className="size-3.5" />{localeText(locale, "Properties", "Svojstva")}</button>
    </> : <span className="cad-right-mode-label" aria-current="page">{localeText(locale, "Properties", "Svojstva")}</span>}
  </div>;
}

export function workflowItems(lesson: PracticeLesson, currentStepId: string | null | undefined, completedStepIds: string[]): WorkflowItem[] {
  return [...lesson.steps].sort((a, b) => a.order - b.order).map((step) => ({
    id: step.id,
    title: step.title,
    status: completedStepIds.includes(step.id) ? "complete" : step.id === currentStepId ? "current" : "upcoming",
  }));
}

export function toolGroupForPracticeStep(step: PracticeStep | null | undefined): ToolGroup {
  if (!step) return "navigation";
  if (step.validators.some((validator) => validator.type === "margin_complete" || validator.type === "curve_closed")) return "margin";
  if (step.allowedTools.includes("sculpt")) return "sculpt";
  if (step.allowedTools.includes("mesh-edit")) return "mesh";
  if (step.allowedTools.includes("analysis")) return "analysis";
  if (step.allowedTools.some((tool) => tool === "select" || tool === "move" || tool === "rotate" || tool === "scale")) return "edit";
  return "navigation";
}

const groupIcons = { navigation: Crosshair, edit: Move3D, margin: CircleDashed, analysis: Grid2X2, sculpt: Brush, mesh: Wrench } as const;

export function ToolCategoryBar({ active, onChange, highlighted, activeToolLabel, locale }: { active: ToolGroup; onChange: (group: ToolGroup) => void; highlighted?: ToolGroup | null; activeToolLabel: string; locale: "en" | "sr" }) {
  return <nav aria-label={localeText(locale, "CAD tool categories", "Kategorije CAD alata")} className="cad-tool-category-bar flex min-h-11 shrink-0 items-center gap-1 overflow-x-auto border-t border-border bg-card px-2 py-1">
    {(Object.keys(toolGroupLabels) as ToolGroup[]).map((group) => {
      const Icon = groupIcons[group];
      const label = toolGroupLabels[group][locale];
      return <button key={group} type="button" aria-pressed={active === group} title={label} onClick={() => onChange(group)} className={`inline-flex min-h-8 shrink-0 items-center gap-1.5 rounded-md border px-2.5 text-[10px] font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${active === group ? "border-primary/40 bg-primary/10 text-foreground shadow-sm" : "border-transparent text-muted-foreground hover:border-border hover:bg-muted/70 hover:text-foreground"} ${highlighted === group ? "ring-2 ring-amber-400" : ""}`}>
        <Icon className={`size-3.5 ${active === group ? "text-primary" : ""}`} /><span>{label}</span>{highlighted === group && <span className="sr-only">{localeText(locale, "Suggested for this step", "Preporučeno za ovaj korak")}</span>}
      </button>;
    })}
    <span role="status" aria-live="polite" className="ml-auto inline-flex shrink-0 items-center gap-1.5 rounded border border-primary/20 bg-background px-2.5 py-1 text-[9px] text-muted-foreground"><span className="size-1.5 rounded-full bg-primary" />{localeText(locale, "Active tool", "Aktivan alat")}: <strong className="font-semibold text-foreground">{activeToolLabel}</strong></span>
  </nav>;
}

export function WorkflowProgress({ lesson, currentStepId, completedStepIds, locale }: { lesson: PracticeLesson; currentStepId: string | null; completedStepIds: string[]; locale: "en" | "sr" }) {
  const items = workflowItems(lesson, currentStepId, completedStepIds);
  return <nav aria-label={localeText(locale, "Practice workflow progress", "Napredak u vežbi")} className="shrink-0 border-b border-border bg-card/80 px-3 py-2">
    <ol className="flex items-center gap-1 overflow-x-auto">
      {items.map((item, index) => <li key={item.id} aria-current={item.status === "current" ? "step" : undefined} className={`flex min-w-0 shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[10px] ${item.status === "current" ? "bg-primary/10 font-semibold text-foreground ring-1 ring-primary/30" : item.status === "complete" ? "text-foreground" : "text-muted-foreground"}`}>
        <span aria-hidden="true" className={`grid size-4 shrink-0 place-items-center rounded-full border text-[9px] ${item.status === "current" ? "border-primary bg-primary text-primary-foreground" : item.status === "complete" ? "border-emerald-600 bg-emerald-600 text-white" : "border-border bg-background"}`}>{item.status === "complete" ? "✓" : index + 1}</span>
        <span className="max-w-44 truncate">{item.title[locale] || item.title.en}</span>
        <span className="sr-only">{item.status === "complete" ? localeText(locale, "complete", "završeno") : item.status === "current" ? localeText(locale, "current step", "trenutni korak") : localeText(locale, "upcoming", "predstoji")}</span>
        {index < items.length - 1 && <span aria-hidden="true" className="pl-1 text-muted-foreground">›</span>}
      </li>)}
    </ol>
  </nav>;
}
