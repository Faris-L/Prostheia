"use client";
import { useInterfaceCopy } from "@/lib/i18n";
import { useState } from "react";
import { cadObjectId } from "@/cad/types";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import { useRestorativeSetupStore } from "@/cad/restorative/types";
import { useBiteSplintStore } from "@/cad/splint/types";
import { generateBiteSplint } from "@/cad/splint/operations";

export function BiteSplintWorkflowPanel({ canEdit = true }: { canEdit?: boolean }) {
  const tx = useInterfaceCopy();
  const setup = useBiteSplintStore();
  const direction = useRestorativeSetupStore((state) => state.insertionDirection);
  const axis = Math.abs(direction[0]) > Math.abs(direction[2]) ? "x" : Math.abs(direction[1]) > Math.abs(direction[2]) ? "y" : "z";
  const [message, setMessage] = useState("");
  if (!setup.upperArchId) return null;
  const thicknessGuideId = setup.splintId?.endsWith(":design-splint") ? setup.splintId.replace(/design-splint$/, "guide-thickness") : undefined;
  const thicknessGuide = thicknessGuideId ? useWorkspaceStore.getState().objects.find((object) => object.id === cadObjectId(thicknessGuideId)) : undefined;
  const setThicknessGuideVisible = () => { if (thicknessGuide) useWorkspaceStore.getState().applyVisibility([{ id: thicknessGuide.id, visible: !thicknessGuide.visible }]); };
  return <div className="flex min-h-8 shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-border bg-card px-2.5 py-1.5 text-[9px]" aria-label={tx("Bite Splint workflow controls")}>
    <strong className="font-semibold uppercase tracking-wide text-primary">{tx("Bite Splint")}</strong>
    <button type="button" className="rounded border border-border px-1.5 py-0.5 hover:bg-muted" onClick={() => useWorkspaceStore.getState().select(cadObjectId(setup.upperArchId!))}>{tx("SOURCE · upper arch / boundary")}</button>
    <button type="button" className="rounded border border-border px-1.5 py-0.5 hover:bg-muted" onClick={() => useWorkspaceStore.getState().select(cadObjectId(setup.antagonistId!))}>{tx("Select antagonist")}</button>
    <label className="flex items-center gap-1 text-muted-foreground">{tx("Insertion direction")}<select aria-label={tx("Bite Splint insertion direction")} disabled={!canEdit} value={axis} onChange={(event) => useRestorativeSetupStore.getState().setInsertionDirection(event.target.value === "x" ? [1, 0, 0] : event.target.value === "y" ? [0, 1, 0] : [0, 0, 1])} className="h-6 rounded border border-input bg-background px-1 text-foreground"><option value="z">+Z</option><option value="x">+X</option><option value="y">+Y</option></select></label>
    <label className="flex items-center gap-1 text-muted-foreground">{tx("Target for this exercise")} <input aria-label={tx("Target for this exercise thickness in millimeters")} type="number" min="0.5" max="8" step="0.1" value={setup.targetThicknessMm} disabled={!canEdit} onChange={(event) => useBiteSplintStore.getState().setThickness(Number(event.target.value))} className="h-6 w-14 rounded border border-input bg-background px-1 text-foreground" />mm</label>
    <button type="button" disabled={!canEdit} onClick={() => { try { generateBiteSplint(); setMessage("Editable arch-conforming shell rebuilt; mesh history is available."); } catch { setMessage("Splint generation failed."); } }} className="rounded bg-primary/10 px-2 py-1 text-primary disabled:opacity-40">{setup.splintId ? tx("Build / update splint") : tx("Generate splint")}</button>
    {thicknessGuide && <button type="button" disabled={!canEdit} aria-pressed={thicknessGuide.visible} onClick={setThicknessGuideVisible} className="rounded border border-border px-1.5 py-0.5 disabled:opacity-40">{tx(thicknessGuide.visible ? "Hide thickness guide" : "Show thickness guide")}</button>}
    <button type="button" className="rounded border border-border px-1.5 py-0.5 hover:bg-muted" onClick={() => { if (setup.splintId) useWorkspaceStore.getState().select(cadObjectId(setup.splintId)); }}>{tx("DESIGN · splint shell")}</button>
    <span role="status" className="text-muted-foreground">{tx("Edit the closed boundary in Analysis · Boundary. Use Proximity / Intersection for educational contacts and clearance.")}</span>
    {message && <span role="status" className="text-amber-700 dark:text-amber-300">{tx(message)}</span>}
  </div>;
}
