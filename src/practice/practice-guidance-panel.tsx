"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, ChevronRight, Crosshair, Eye, RotateCcw, Sparkles } from "lucide-react";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import { useCurveStore, validateClosedCurve } from "@/cad/curves/store";
import { cadObjectId, type CadObjectMetadata } from "@/cad/types";
import { Button } from "@/components/ui/button";
import { localized, type PracticeLesson, type PracticeStep, type ReferenceMode, type ValidationResult } from "./types";
import { runStepValidators, scoreResults, validationFingerprint } from "./validators";
import { usePracticeSessionStore } from "./session-store";
import { persistPracticeAttempt } from "./persist-attempt";
import { useHistoryStore } from "@/cad/engine/history-store";
import { cleanupPracticeLesson, initializePracticeLesson } from "./initialize-assets";
import { useAnalysisStore } from "@/cad/analysis/state";

const referenceLabel: Record<ReferenceMode, { en: string; sr: string }> = {
  off: { en: "Off", sr: "Isključeno" },
  outline: { en: "Outline", sr: "Kontura" },
  transparent: { en: "Transparent", sr: "Providno" },
  full: { en: "Full", sr: "Puno" },
};

const axisIndex = { x: 0, y: 1, z: 2 } as const;

function curveName(validator: Extract<PracticeStep["validators"][number], { type: "curve_closed" }>) {
  if (validator.curveKind === "splint_boundary") return { en: "Splint boundary", sr: "Granica splinta" };
  if (validator.curveKind === "model_trim_boundary") return { en: "Trim boundary", sr: "Granica modela" };
  if (validator.curveKind === "boundary") return { en: "Denture border", sr: "Granica proteze" };
  return { en: "Margin line", sr: "Marginalna linija" };
}

function validatorTitle(result: ValidationResult | undefined, locale: "en" | "sr") {
  return result ? localized(result.title, locale) : "";
}

export type GuideCheckState = "complete" | "current" | "upcoming";

export function guideCheckState(stepComplete: boolean, isCurrentTarget: boolean): GuideCheckState {
  if (stepComplete) return "complete";
  return isCurrentTarget ? "current" : "upcoming";
}

export function PracticeGuidancePanel({ lesson, preview = false, hidden = false, onShowObject, onShowTools }: { lesson: PracticeLesson; preview?: boolean; hidden?: boolean; onShowObject?: (id: string) => void; onShowTools?: () => void }) {
  const session = usePracticeSessionStore((state) => state.session);
  const locale = usePracticeSessionStore((state) => state.locale);
  const showNextHint = usePracticeSessionStore((state) => state.showNextHint);
  const setReferenceMode = usePracticeSessionStore((state) => state.setReferenceMode);
  const recordCheck = usePracticeSessionStore((state) => state.recordCheck);
  const objects = useWorkspaceStore((state) => state.objects);
  const selectedObjectId = useWorkspaceStore((state) => state.selectedObjectId);
  const curves = useCurveStore((state) => state.curves);
  const [busy, setBusy] = useState(false);
  const [saveScope, setSaveScope] = useState<"cloud" | "device" | "memory" | null>(null);
  const [exampleVisible, setExampleVisible] = useState(false);
  const step = lesson.steps.find((entry) => entry.id === session?.currentStepId);
  if (!session || !step) return null;

  const text = (value: { en: string; sr: string }) => localized(value, locale);
  const completed = session.completedStepIds.length;
  const stepNumber = lesson.steps.findIndex((item) => item.id === step.id) + 1;
  const hintIndex = session.hintIndexByStep[step.id] ?? 0;
  const currentHint = hintIndex > 0 ? step.hints[hintIndex - 1] : undefined;
  const modes = step.referenceModes;
  const resolveObject = (id: string): CadObjectMetadata | undefined => {
    const mapping = lesson.caseSetup.objectMappings.find((entry) => entry.runtimeObjectId === id || entry.semanticRole === id);
    return objects.find((object) => object.id === id || object.id === mapping?.runtimeObjectId || object.role === mapping?.semanticRole);
  };
  const targets = step.targetObjectIds.map((id) => ({ id, object: resolveObject(id) })).filter((target): target is { id: string; object: CadObjectMetadata } => Boolean(target.object));
  const fingerprint = validationFingerprint(objects, step.targetObjectIds);
  const results = session.resultsByStep[step.id];
  const stale = Boolean(results && session.validationFingerprintByStep[step.id] !== fingerprint);
  const hasResults = Boolean(results?.length);
  const passed = Boolean(hasResults && !stale && results?.every((result) => result.outcome === "pass"));
  const stepComplete = session.completedStepIds.includes(step.id) && !stale && (!results?.length || results.every((result) => result.outcome === "pass"));
  const resultState = !hasResults ? "none" : stale ? "warning" : passed ? "success" : results?.some((result) => result.outcome === "fail") ? "error" : "warning";
  const primaryResult = results?.find((result) => result.outcome === "fail") ?? results?.find((result) => result.outcome === "warning") ?? results?.[0];
  const activeTarget = targets.find((target) => target.object.id === selectedObjectId) ?? targets[0];
  const checklist = targets.length ? targets : [{ id: step.id, object: undefined }];
  const checkedCount = stepComplete ? checklist.length : 0;

  const livePositions = step.validators.flatMap((validator) => {
    if (validator.type !== "transform_range" || (validator.field ?? "position") !== "position") return [];
    const object = resolveObject(validator.objectId);
    if (!object) return [];
    const values = validator.axes.map((axis) => ({
      axis,
      current: object.transform.position[axisIndex[axis]],
      target: validator.position[axisIndex[axis]],
    }));
    return [{ id: `${validator.objectId}-position`, name: object.name, values }];
  });

  const liveCurves = step.validators.flatMap((validator) => {
    if (validator.type === "margin_complete") {
      const curve = curves.find((entry) => entry.objectId === cadObjectId(validator.objectId) && entry.kind === "margin");
      const name = { en: "Margin line", sr: "Marginalna linija" };
      return [{ id: `${validator.objectId}-margin`, name, closed: validateClosedCurve(curve).valid }];
    }
    if (validator.type === "curve_closed") {
      const curve = curves.find((entry) => entry.id === validator.curveId && entry.objectId === cadObjectId(validator.objectId) && entry.kind === validator.curveKind);
      const name = curveName(validator);
      return [{ id: validator.curveId, name, closed: validateClosedCurve(curve, text(name)).valid }];
    }
    return [];
  });

  const onCheck = async () => {
    if (busy) return;
    setBusy(true);
    const nextResults = runStepValidators(lesson, step);
    recordCheck(step.id, nextResults, fingerprint, lesson);
    const nextSession = usePracticeSessionStore.getState().session;
    if (nextSession && !preview) setSaveScope(await persistPracticeAttempt(lesson, nextSession));
    setBusy(false);
  };

  return <section aria-label={text({ en: "Practice learning guide", sr: "Vodič za vežbu" })} data-practice-guide hidden={hidden} className={`cad-practice-guide flex min-h-0 flex-1 flex-col text-card-foreground ${hidden ? "hidden" : ""}`}>
    <div className="cad-guide-task-header shrink-0 border-b border-border p-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">{preview ? text({ en: "Admin preview", sr: "Pregled administratora" }) : text({ en: "Practice · current task", sr: "Vežba · trenutni zadatak" })}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{text({ en: "Step", sr: "Korak" })} {stepNumber} {text({ en: "of", sr: "od" })} {lesson.steps.length}</p>
      <h2 className="mt-1.5 text-base font-semibold leading-5">{text(step.title)}</h2>
      <p className="mt-1.5 text-[12px] leading-[1.45] text-muted-foreground">{text(step.instructions)}</p>
    </div>

    <div className="cad-guide-scroll-region min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
      <section className="cad-guide-progress" aria-labelledby="practice-actions-title">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 id="practice-actions-title" className="text-[10px] font-semibold uppercase tracking-[0.12em]">{text({ en: "Progress", sr: "Napredak" })}</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{checkedCount} / {checklist.length} {text({ en: "targets complete", sr: "ciljeva završeno" })}</p>
          </div>
          {onShowTools && <button type="button" className="cad-guide-secondary-action" onClick={onShowTools}><Crosshair aria-hidden="true" className="size-3.5" />{text({ en: "Show tools", sr: "Prikaži alate" })}</button>}
        </div>
        <ol className="cad-guide-checklist mt-2">
          {checklist.map((target, index) => {
            const state = guideCheckState(stepComplete, Boolean(target.object && activeTarget?.object.id === target.object.id));
            const label = target.object?.name ?? text(step.title);
            return <li key={target.id} data-check-state={state} aria-current={state === "current" ? "step" : undefined} className="cad-guide-check-row">
              <span className="cad-guide-check-marker" aria-hidden="true">{state === "complete" ? <Check className="size-3.5" /> : index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-[12px] font-medium">{label}</span>
              <span className="sr-only">{text(state === "complete" ? { en: "Complete", sr: "Završeno" } : state === "current" ? { en: "Current", sr: "Trenutno" } : { en: "Upcoming", sr: "Predstoji" })}</span>
              {target.object && <button type="button" className="cad-guide-target-action" aria-label={text({ en: `Show ${label}`, sr: `Prikaži ${label}` })} title={text({ en: `Show ${label}`, sr: `Prikaži ${label}` })} onClick={() => onShowObject?.(target.id)}><Crosshair aria-hidden="true" className="size-4" /></button>}
            </li>;
          })}
        </ol>
      </section>

      {(livePositions.length > 0 || liveCurves.length > 0) && <section className="cad-guide-live-state" aria-label={text({ en: "Live task status", sr: "Trenutno stanje zadatka" })}>
        {livePositions.map((position) => <div key={position.id} className="cad-guide-live-target">
          <span className="cad-guide-live-object">{position.name}</span>
          <div className="grid grid-cols-2 gap-2">
            <div><span className="cad-guide-live-label">{text({ en: "Current", sr: "Trenutno" })}</span><strong data-testid="guide-current-position">{position.values.map(({ axis, current }) => `${axis.toUpperCase()} = ${current.toFixed(1)} mm`).join(" · ")}</strong></div>
            <div><span className="cad-guide-live-label">{text({ en: "Target", sr: "Cilj" })}</span><strong data-testid="guide-target-position">{position.values.map(({ axis, target }) => `${axis.toUpperCase()} = ${target.toFixed(1)} mm`).join(" · ")}</strong></div>
          </div>
        </div>)}
        {liveCurves.map((curve) => <div key={curve.id} className="cad-guide-live-target">
          <span className="cad-guide-live-object">{text(curve.name)}</span>
          <div className="flex items-center justify-between gap-2 text-[12px]"><span>{text({ en: "Status", sr: "Status" })}</span><strong data-testid="guide-curve-state">{text(curve.closed ? { en: "Closed", sr: "Zatvorena" } : { en: "Open", sr: "Otvorena" })}</strong></div>
          <p className="mt-1 text-[10px] text-muted-foreground">{text({ en: "Target: closed", sr: "Cilj: zatvorena" })}</p>
        </div>)}
      </section>}

      {(step.hints.length > 0 || step.theory || step.example || modes.length > 1) && <details className="cad-guide-help">
        <summary>{text({ en: "Help", sr: "Pomoć" })}</summary>
        <div className="cad-guide-help-content">
          {step.hints.length > 0 && <details open={Boolean(currentHint)}>
            <summary>{text({ en: "Tip", sr: "Savet" })}</summary>
            {currentHint && <div role="status" className="cad-guide-hint"><p className="text-[12px] font-semibold">{text(currentHint.title)}</p><p className="mt-1 text-[11px] leading-4 text-muted-foreground">{text(currentHint.body)}</p></div>}
            <Button variant="outline" size="sm" className="mt-2 h-8 gap-1 px-2.5 text-[11px]" disabled={hintIndex >= step.hints.length} onClick={() => showNextHint(step.id, step.hints.length)}><Sparkles aria-hidden="true" className="size-3.5" />{hintIndex === 0 ? text({ en: "Show a hint", sr: "Prikaži savet" }) : hintIndex >= step.hints.length ? text({ en: "All hints shown", sr: "Prikazani su svi saveti" }) : text({ en: "Next hint", sr: "Sledeći savet" })}</Button>
          </details>}
          {step.theory && <details>
            <summary>{text({ en: "Why does this matter?", sr: "Zašto je ovo važno?" })}</summary>
            <p className="mt-2 text-[11px] leading-4 text-muted-foreground">{text(step.theory)}</p>
          </details>}
          {(step.example || modes.length > 1) && <details>
            <summary>{text({ en: "Example and reference", sr: "Primer i referenca" })}</summary>
            {step.example && <Button variant="outline" size="sm" className="mt-2 h-8 gap-1.5 px-2.5 text-[11px]" onClick={() => { const mode = exampleVisible ? "off" : step.example!.mode; if (modes.includes(mode)) setReferenceMode(mode); setExampleVisible(!exampleVisible); }}><Eye aria-hidden="true" className="size-3.5" />{exampleVisible ? text({ en: "Hide example", sr: "Sakrij primer" }) : text({ en: "Show example", sr: "Prikaži primer" })}</Button>}
            {modes.length > 1 && <label className="cad-guide-reference-select mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">{text({ en: "Reference mode", sr: "Režim reference" })}<select aria-label={text({ en: "Reference mode", sr: "Režim reference" })} value={session.referenceMode} onChange={(event) => setReferenceMode(event.target.value as ReferenceMode)}>{modes.map((mode) => <option key={mode} value={mode}>{text(referenceLabel[mode])}</option>)}</select></label>}
          </details>}
        </div>
      </details>}

      {hasResults && <section className="cad-guide-result" data-result-state={resultState} role="status" aria-live="polite" aria-label={text({ en: "Design Check result", sr: "Rezultat provere dizajna" })}>
        <div className="cad-guide-result-heading">
          <div className="min-w-0">
            <span className="cad-guide-result-eyebrow">{text(resultState === "success" ? { en: "Success", sr: "Uspešno" } : resultState === "error" ? { en: "Needs attention", sr: "Potrebna je izmena" } : { en: "Review", sr: "Proverite rezultat" })}</span>
            <h3 className="mt-1 text-[13px] font-semibold leading-4">{stale ? text({ en: "Result is out of date", sr: "Rezultat je zastareo" }) : validatorTitle(primaryResult, locale)}</h3>
          </div>
          {resultState === "success" ? <Check aria-hidden="true" className="size-5 shrink-0" /> : <span aria-hidden="true" className="cad-guide-result-symbol">!</span>}
        </div>
        <p className="mt-1 text-[11px] leading-4">{stale ? text({ en: "Run Design Check again to refresh this result.", sr: "Ponovo pokrenite proveru dizajna da biste osvežili rezultat." }) : primaryResult ? localized(primaryResult.message, locale) : ""}</p>
        <p className="cad-guide-score"><span>{text({ en: "Result", sr: "Rezultat" })}</span><strong>{scoreResults(results ?? []) ?? "—"}<small> / 100</small></strong></p>
        {results && results.length > 1 && <details className="cad-guide-result-details"><summary>{text({ en: "Check details", sr: "Detalji provere" })}</summary>{results.map((result) => <p key={result.id}><strong>{localized(result.title, locale)}</strong> · {localized(result.message, locale)}</p>)}</details>}
      </section>}

      {saveScope && <p className="cad-guide-save-note" role="status">{saveScope === "cloud" ? text({ en: "Check saved to your account.", sr: "Provera je sačuvana na nalogu." }) : text({ en: "Check saved on this device.", sr: "Provera je sačuvana na ovom uređaju." })}</p>}
      {session.isComplete && <section className="cad-guide-exercise-complete"><p className="text-[13px] font-semibold">{text({ en: "Exercise complete", sr: "Vežba je završena" })}</p><p className="mt-1 text-[11px] leading-4 text-muted-foreground">{text({ en: "You can repeat the lesson or return to Practice.", sr: "Možete ponoviti lekciju ili se vratiti na vežbe." })}</p><div className="mt-2 flex items-center gap-3"><Button variant="outline" size="sm" className="h-8 gap-1.5 text-[11px]" onClick={() => { cleanupPracticeLesson(lesson, lesson.assets.map((asset) => asset.runtimeObjectId)); useHistoryStore.getState().clear(); useAnalysisStore.getState().clear(); void initializePracticeLesson(lesson); usePracticeSessionStore.getState().restart(lesson); }}><RotateCcw aria-hidden="true" className="size-3.5" />{text({ en: "Retry", sr: "Ponovi" })}</Button><Link href="/practice" className="inline-flex h-8 items-center gap-1 text-[11px] text-primary">{text({ en: "Practice catalog", sr: "Katalog vežbi" })}<ChevronRight aria-hidden="true" className="size-3.5" /></Link></div></section>}
    </div>

    <div className="cad-guide-check-footer sticky bottom-0 shrink-0" role="group" aria-label={text({ en: "Step check", sr: "Provera koraka" })}>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground"><span>{completed} / {lesson.steps.length} {text({ en: "steps complete", sr: "koraka završeno" })}</span><span>{text({ en: "Step", sr: "Korak" })} {stepNumber} / {lesson.steps.length}</span></div>
      <div className="cad-guide-overall-progress" role="progressbar" aria-label={text({ en: "Practice progress", sr: "Napredak vežbe" })} aria-valuemin={0} aria-valuemax={lesson.steps.length} aria-valuenow={completed}><span style={{ width: `${Math.min(100, (completed / lesson.steps.length) * 100)}%` }} /></div>
      <Button className="h-10 w-full gap-1.5 text-[12px] font-semibold" disabled={busy} onClick={() => void onCheck()}><Check aria-hidden="true" className="size-4" />{busy ? text({ en: "Checking…", sr: "Provera…" }) : text({ en: "Check step", sr: "Proveri korak" })}</Button>
    </div>
  </section>;
}
