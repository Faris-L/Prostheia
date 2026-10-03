"use client";
import { useInterfaceCopy } from "@/lib/i18n";

import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import { cadObjectId } from "@/cad/types";
import { setBridgeConnectorWidth } from "@/cad/restorative/operations";
import { restorativeCaseIds } from "@/cad/restorative/case";
import { useRestorativeSetupStore, type RestorationType } from "@/cad/restorative/types";

const labels: Record<RestorationType, string> = { crown: "Crown", bridge: "Bridge", inlay: "Inlay", onlay: "Onlay", veneer: "Veneer" };

export function RestorativeWorkflowPanel({ canEdit = true }: { canEdit?: boolean }) {
  const tx = useInterfaceCopy();
  const setup = useRestorativeSetupStore();
  if (!setup.restorationType) return null;
  const ids = restorativeCaseIds(setup.restorationType);
  const commitWidth = (width: number) => { try { setBridgeConnectorWidth(width); } catch { /* Invalid range values are ignored by the operation. */ } };
  return <div className="flex min-h-8 shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-card px-2.5 py-1.5" aria-label={tx("Restorative workflow controls")}>
    <span className="text-[9px] font-semibold uppercase tracking-wide text-primary">{tx(labels[setup.restorationType])} · {tx("shared restorative workflow")}</span>
    <div className="flex flex-wrap items-center gap-1">{ids.preparations.map((id, index) => <button key={id} type="button" className="rounded border border-border px-1.5 py-0.5 text-[9px] hover:bg-muted" onClick={() => useWorkspaceStore.getState().select(cadObjectId(id))}>{setup.restorationType === "bridge" ? tx(index === 0 ? "Select abutment 14" : "Select abutment 16") : tx("Select preparation")}</button>)}</div>
    {setup.restorationType === "bridge" && <label className="flex items-center gap-1.5 text-[9px] text-muted-foreground">{tx("Connector diameter · Target for this exercise")}
      <input key={setup.connectorWidthMm} aria-label={tx("Bridge connector diameter exercise target")} type="range" min="1" max="8" step="0.25" defaultValue={setup.connectorWidthMm} disabled={!canEdit} onPointerUp={(event) => commitWidth(Number(event.currentTarget.value))} onBlur={(event) => commitWidth(Number(event.currentTarget.value))} onKeyUp={(event) => { if (event.key.startsWith("Arrow") || event.key === "Enter") commitWidth(Number(event.currentTarget.value)); }} className="w-20 accent-primary" />
      <span className="w-8 tabular-nums">{setup.connectorWidthMm.toFixed(2)} mm</span>
    </label>}
    <span className="ml-auto text-[9px] text-muted-foreground">{setup.units.map((unit) => `${unit.kind}${unit.toothNumber ? ` ${unit.toothNumber}` : ""}`).join(" · ")}</span>
    {setup.restorationType !== "bridge" && <span className="w-full text-[9px] text-muted-foreground">{tx("Edit with shared Move, Rotate, Sculpt, Section, Measure and Design Check tools. Synthetic geometry is educational only.")}</span>}
  </div>;
}
