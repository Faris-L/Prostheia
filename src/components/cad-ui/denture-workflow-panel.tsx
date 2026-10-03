"use client";
import { useInterfaceCopy } from "@/lib/i18n";

import { cadObjectId } from "@/cad/types";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import { useDentureSetupStore } from "@/cad/denture/setup-store";
import { DENTURE_IDS } from "@/cad/denture/case";
import { transformDentureGroup } from "@/cad/denture/operations";
import { applyDentureToothSet, DENTURE_TOOTH_SETS, regenerateDentureBase } from "@/cad/denture/tooth-library";
import { toast } from "sonner";

export function DentureWorkflowPanel({ canMove, canScene }: { canMove: boolean; canScene: boolean }) {
  const tx = useInterfaceCopy();
  const objects = useWorkspaceStore((state) => state.objects);
  const mode = useDentureSetupStore((state) => state.mode);
  const arch = useDentureSetupStore((state) => state.arch);
  const segment = useDentureSetupStore((state) => state.segment);
  const toothSet = useDentureSetupStore((state) => state.toothSet);
  const setMode = useDentureSetupStore((state) => state.setMode);
  const setArch = useDentureSetupStore((state) => state.setArch);
  const setSegment = useDentureSetupStore((state) => state.setSegment);
  const denture = objects.some((object) => object.denturePart === "tooth");
  if (!denture) return null;

  function applyGroupTransform(axis: "x" | "y" | "z", amount: number, rotate = false) {
    if (!canMove || mode === "individual") return;
    transformDentureGroup({ mode, arch, segment, selectedObjectId: useWorkspaceStore.getState().selectedObjectId, axis, amount, rotate });
  }

  const upper = arch === "upper";
  const activeBaseId = cadObjectId(upper ? DENTURE_IDS.upperBase : DENTURE_IDS.lowerBase);
  const selectBase = () => useWorkspaceStore.getState().select(activeBaseId);
  const selectArch = () => useWorkspaceStore.getState().select(cadObjectId(upper ? DENTURE_IDS.upperArch : DENTURE_IDS.lowerArch));
  return <div className="flex min-h-9 shrink-0 flex-wrap items-center gap-1.5 border-b border-border/80 bg-card/55 px-2.5 py-1" aria-label={tx("Complete denture setup tools")}>
    <span className="mr-1 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{tx("Denture setup")}</span>
    <select aria-label={tx("Denture arch")} value={arch} onChange={(event) => setArch(event.target.value as "upper" | "lower")} className="h-6 rounded border border-border bg-background px-1.5 text-[9px]"><option value="upper">{tx("Upper")}</option><option value="lower">{tx("Lower")}</option></select>
    <select aria-label={tx("Setup segment")} value={segment} onChange={(event) => setSegment(event.target.value as "all" | "anterior" | "posterior")} className="h-6 rounded border border-border bg-background px-1.5 text-[9px]"><option value="all">{tx("Full arch")}</option><option value="anterior">{tx("Anterior · FDI 1–3")}</option><option value="posterior">{tx("Posterior · FDI 4–8")}</option></select>
    <select aria-label={tx("Tooth manipulation mode")} value={mode} onChange={(event) => setMode(event.target.value as "arch" | "chain" | "individual")} className="h-6 rounded border border-border bg-background px-1.5 text-[9px]"><option value="arch">{tx("Arch Mode")}</option><option value="chain">{tx("Chain Mode")}</option><option value="individual">{tx("Individual Mode")}</option></select>
    <select aria-label={tx("Educational tooth set")} value={toothSet} disabled={!canScene} onChange={(event) => applyDentureToothSet(event.target.value as "balanced" | "broad")} className="h-6 max-w-44 rounded border border-border bg-background px-1.5 text-[9px]">{DENTURE_TOOTH_SETS.map((set) => <option key={set.id} value={set.id}>{set.label}</option>)}</select>
    <span className="mx-0.5 h-4 border-l border-border" />
    <button type="button" disabled={!canMove || mode === "individual"} onClick={() => applyGroupTransform("x", -0.5)} className="rounded px-1.5 py-1 text-[9px] hover:bg-muted disabled:opacity-40">← 0.5 mm</button>
    <button type="button" disabled={!canMove || mode === "individual"} onClick={() => applyGroupTransform("x", 0.5)} className="rounded px-1.5 py-1 text-[9px] hover:bg-muted disabled:opacity-40">→ 0.5 mm</button>
    <button type="button" disabled={!canMove || mode === "individual"} onClick={() => applyGroupTransform("z", 0.5)} className="rounded px-1.5 py-1 text-[9px] hover:bg-muted disabled:opacity-40">↑ 0.5 mm</button>
    <button type="button" disabled={!canMove || mode === "individual"} onClick={() => applyGroupTransform("z", -0.5)} className="rounded px-1.5 py-1 text-[9px] hover:bg-muted disabled:opacity-40">↓ 0.5 mm</button>
    <button type="button" disabled={!canMove || mode === "individual"} onClick={() => applyGroupTransform("y", 0.5)} className="rounded px-1.5 py-1 text-[9px] hover:bg-muted disabled:opacity-40">{tx("Forward 0.5 mm")}</button>
    <button type="button" disabled={!canMove || mode === "individual"} onClick={() => applyGroupTransform("y", -0.5)} className="rounded px-1.5 py-1 text-[9px] hover:bg-muted disabled:opacity-40">{tx("Back 0.5 mm")}</button>
    <button type="button" disabled={!canMove || mode === "individual"} onClick={() => applyGroupTransform("z", Math.PI / 180, true)} className="rounded px-1.5 py-1 text-[9px] hover:bg-muted disabled:opacity-40">{tx("Rotate 1°")}</button>
    <span className="hidden text-[9px] text-muted-foreground xl:inline">{mode === "chain" ? tx("Selected tooth + adjacent teeth move together.") : mode === "arch" ? tx("Group edits affect the selected arch segment.") : tx("Select one FDI tooth and use shared CAD transforms.")}</span>
    <span className="ml-auto flex items-center gap-1"><button type="button" disabled={!canScene} onClick={selectArch} className="rounded border border-border px-2 py-1 text-[9px] hover:bg-muted disabled:opacity-40">{tx("Select arch")}</button><button type="button" disabled={!canScene} onClick={selectBase} className="rounded border border-border px-2 py-1 text-[9px] hover:bg-muted disabled:opacity-40">{tx("Select base")}</button><button type="button" disabled={!canScene} onClick={() => { try { regenerateDentureBase(arch); toast.success(tx("Synthetic base regenerated. Undo is available.")); } catch { toast.error(tx("Base generation failed.")); } }} className="rounded border border-border px-2 py-1 text-[9px] hover:bg-muted disabled:opacity-40">{tx("Regenerate base")}</button></span>
  </div>;
}
