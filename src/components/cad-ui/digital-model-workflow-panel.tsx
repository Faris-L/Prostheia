"use client";
import { useInterfaceCopy } from "@/lib/i18n";
import { useState } from "react";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import { useDigitalModelStore } from "@/cad/digital-model/types";
import { addModelAttachment, addRemovableDie, generateDigitalModelBase, markDigitalModelFinalReview, orientDigitalModel } from "@/cad/digital-model/operations";

export function DigitalModelWorkflowPanel({ canEdit = true }: { canEdit?: boolean }) {
  const tx = useInterfaceCopy();
  const setup = useDigitalModelStore();
  const [message, setMessage] = useState("");
  if (!setup.workingModelId) return null;
  const run = (operation: () => string) => { try { operation(); setMessage(""); } catch { setMessage("The model operation failed."); } };
  return <div className="flex min-h-8 shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-border bg-card px-2.5 py-1.5 text-[9px]" aria-label={tx("Digital Model workflow controls")}>
    <strong className="font-semibold uppercase tracking-wide text-primary">{tx("Digital Model")}</strong>
    <button type="button" className="rounded border border-border px-1.5 py-0.5 hover:bg-muted" onClick={() => useWorkspaceStore.getState().select(setup.rawScanId as never)}>{tx("SOURCE · locked raw scan")}</button>
    <button type="button" className="rounded border border-border px-1.5 py-0.5 hover:bg-muted" onClick={() => useWorkspaceStore.getState().select(setup.workingModelId as never)}>{tx("DESIGN · editable working copy")}</button>
    <span className="rounded bg-muted px-1.5 py-0.5 text-muted-foreground">{tx(`Stage · ${setup.stage.replaceAll("_", " ")}`)}</span>
    <label className="flex items-center gap-1 text-muted-foreground">{tx("Base height · target for this exercise")}<input aria-label={tx("Digital model base height target in millimeters")} type="number" min="2" max="25" step="0.5" value={setup.baseHeightMm} disabled={!canEdit} onChange={(event) => useDigitalModelStore.getState().setBaseHeight(Number(event.target.value))} className="h-6 w-14 rounded border border-input bg-background px-1 text-foreground" />mm</label>
    <button type="button" disabled={!canEdit} onClick={() => run(() => generateDigitalModelBase(setup.baseHeightMm))} className="rounded bg-primary/10 px-2 py-1 text-primary disabled:opacity-40">{tx("Generate base")}</button>
    <button type="button" disabled={!canEdit} onClick={() => run(() => orientDigitalModel())} className="rounded border border-border px-1.5 py-0.5 disabled:opacity-40">{tx("Orient working copy")}</button>
    <button type="button" disabled={!canEdit} onClick={() => run(() => markDigitalModelFinalReview())} className="rounded border border-border px-1.5 py-0.5 disabled:opacity-40">{tx("Final mesh check")}</button>
    <button type="button" disabled={!canEdit} onClick={() => run(() => addRemovableDie())} className="rounded border border-border px-1.5 py-0.5 disabled:opacity-40">{tx("Add removable die")}</button>
    <button type="button" disabled={!canEdit} onClick={() => run(() => addModelAttachment())} className="rounded border border-border px-1.5 py-0.5 disabled:opacity-40">{tx("Add attachment")}</button>
    <span className="text-muted-foreground">{tx("Trim, delete, fill, smooth and cleanup use shared Mesh Edit on DESIGN. SOURCE stays locked.")}</span>
    {message && <span role="status" className="text-amber-700 dark:text-amber-300">{tx(message)}</span>}
  </div>;
}
