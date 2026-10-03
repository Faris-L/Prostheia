"use client";

import { useInterfaceCopy } from "@/lib/i18n";
import { useState } from "react";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import { useRestorativeSetupStore } from "@/cad/restorative/types";
import { useAnalysisStore } from "@/cad/analysis/state";
import { cadObjectId } from "@/cad/types";
import { addPartialDentureComponent } from "@/cad/partial-denture/operations";
import { usePartialDentureStore, type PartialComponentKind } from "@/cad/partial-denture/types";

const options: { kind: PartialComponentKind; label: string }[] = [
  { kind: "blockout", label: "Blockout" }, { kind: "major_connector", label: "Major connector" },
  { kind: "lingual_bar", label: "Lingual bar" }, { kind: "rest", label: "Rest" }, { kind: "clasp", label: "Clasp" },
  { kind: "minor_connector", label: "Minor connector" }, { kind: "guide_plane", label: "Guide plane" },
  { kind: "saddle", label: "Saddle" }, { kind: "retention_mesh", label: "Retention mesh" },
  { kind: "finish_line", label: "Finish line" }, { kind: "relief", label: "Relief" },
];

export function PartialDentureWorkflowPanel({ canEdit = true }: { canEdit?: boolean }) {
  const tx = useInterfaceCopy();
  const setup = usePartialDentureStore();
  const objects = useWorkspaceStore((state) => state.objects);
  const insertionDirection = useRestorativeSetupStore((state) => state.insertionDirection);
  const [kind, setKind] = useState<PartialComponentKind>("rest");
  const [tooth, setTooth] = useState("");
  const hasCurrentUndercut = useAnalysisStore((state) => state.getCurrent("undercut")?.targets.some((target) => setup.abutmentObjectIds.includes(target.objectId)) ?? false);
  if (!setup.kennedyClass) return null;
  const packageObjects = setup.packageId ? objects.filter((object) => object.casePackageId === setup.packageId) : [];
  const isR5 = setup.packageId?.startsWith("r5-partial-denture-kennedy-") === true;
  const abutments = setup.abutmentObjectIds.flatMap((id) => {
    const object = objects.find((candidate) => candidate.id === cadObjectId(id));
    return object ? [{ id, label: object.name, toothNumber: object.partialDentureToothNumber ?? object.dentalPosition }] : [];
  });
  const selectedAbutment = abutments.some((item) => String(item.toothNumber) === tooth) ? tooth : String(abutments[0]?.toothNumber ?? "");
  const axis = Math.abs(insertionDirection[0]) > Math.abs(insertionDirection[2]) ? "x" : Math.abs(insertionDirection[1]) > Math.abs(insertionDirection[2]) ? "y" : "z";
  const showParts = (parts: string[], visible = true) => {
    useWorkspaceStore.getState().applyVisibility(packageObjects.filter((object) => parts.includes(String(object.partialDenturePart))).map((object) => ({ id: object.id, visible })));
  };
  const setAxis = (value: string) => {
    const direction: [number, number, number] = value === "x" ? [1, 0, 0] : value === "y" ? [0, 1, 0] : [0, 0, 1];
    useRestorativeSetupStore.getState().setInsertionDirection(direction);
    if (isR5) {
      setup.setStageFlag("insertionPathSelected", false);
      setup.setStageFlag("contoursReviewed", false);
      setup.setStageFlag("undercutsReviewed", false);
      setup.setStageFlag("blockoutApplied", false);
      showParts(["blockout"], false);
    }
  };
  const markSurvey = () => {
    showParts(["survey_line"]);
    setup.setStageFlag("surveyCompleted", true);
  };
  const confirmPath = () => setup.setStageFlag("insertionPathSelected", true);
  const markContours = () => setup.setStageFlag("contoursReviewed", true);
  const toggleBlockout = () => {
    const next = !setup.blockoutApplied;
    showParts(["blockout"], next);
    setup.setStageFlag("blockoutApplied", next);
  };
  const showDesign = (part: string | string[]) => {
    const parts = Array.isArray(part) ? part : [part];
    showParts(parts);
    const object = packageObjects.find((candidate) => parts.includes(String(candidate.partialDenturePart)) && candidate.editable);
    if (object) useWorkspaceStore.getState().select(object.id);
  };
  const add = () => {
    try {
      const needsTooth = ["rest", "clasp", "minor_connector", "guide_plane", "finish_line", "relief"].includes(kind);
      const id = addPartialDentureComponent(kind, needsTooth ? Number(selectedAbutment) || undefined : undefined, setup.components.filter((component) => component.kind === kind).length);
      const object = objects.find((candidate) => candidate.id === cadObjectId(id));
      if (object) useWorkspaceStore.getState().applyVisibility([{ id: object.id, visible: true }]);
      useWorkspaceStore.getState().select(cadObjectId(id));
    } catch { /* Invalid component relationships leave the case unchanged. */ }
  };
  const needsTooth = ["rest", "clasp", "minor_connector", "guide_plane", "finish_line", "relief"].includes(kind);
  const pathStatus = axis.toUpperCase();
  return <div className="flex min-h-8 shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-border bg-card px-2.5 py-1.5 text-[9px]" aria-label={tx("Partial Denture workflow controls")}>
    <strong className="font-semibold uppercase tracking-wide text-primary">RPD · Kennedy {setup.kennedyClass}{setup.arch ? ` · ${tx(setup.arch === "upper" ? "Maxillary" : "Mandibular")}` : ""}</strong>
    <button type="button" className="rounded border border-border px-1.5 py-0.5 hover:bg-muted" onClick={() => setup.archObjectId && useWorkspaceStore.getState().select(cadObjectId(setup.archObjectId))}>{tx("Select arch")}</button>
    <label className="flex items-center gap-1 text-muted-foreground">{tx("Insertion direction")}<select aria-label={tx("Partial Denture insertion direction")} value={axis} disabled={!canEdit} onChange={(event) => setAxis(event.target.value)} className="h-6 rounded border border-input bg-background px-1 text-foreground"><option value="z">+Z</option><option value="x">+X</option><option value="y">+Y</option></select></label>
    {isR5 && <>
      <button type="button" disabled={!canEdit} onClick={confirmPath} className={`rounded px-1.5 py-0.5 ${setup.insertionPathSelected ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border border-border hover:bg-muted"}`}>{tx("Confirm path")} · {pathStatus}</button>
      <button type="button" disabled={!canEdit} onClick={markSurvey} className={`rounded px-1.5 py-0.5 ${setup.surveyCompleted ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border border-border hover:bg-muted"}`}>{tx("Show survey lines")}</button>
      <button type="button" disabled={!canEdit || !setup.insertionPathSelected} onClick={markContours} className={`rounded px-1.5 py-0.5 ${setup.contoursReviewed ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "border border-border hover:bg-muted disabled:opacity-40"}`}>{tx("Mark contours reviewed")}</button>
      <button type="button" disabled={!canEdit} onClick={toggleBlockout} className={`rounded px-1.5 py-0.5 ${setup.blockoutApplied ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300" : "border border-border hover:bg-muted"}`}>{tx(setup.blockoutApplied ? "Hide blockout" : "Apply blockout")}</button>
      <span className="text-muted-foreground">{hasCurrentUndercut ? tx("Current directional preview found") : tx("No current preview · use Analysis")}</span>
      <span className="mx-0.5 h-4 border-l border-border" />
      {["rest", "major_connector", "minor_connector", "clasp", "saddle", "retention_mesh", "finish_line"].map((part) => <button type="button" key={part} disabled={!canEdit} onClick={() => showDesign(part)} className="rounded border border-border px-1.5 py-0.5 hover:bg-muted disabled:opacity-40">{tx(`Show ${part.replaceAll("_", " ")}`)}</button>)}
    </>}
    <span className="mx-0.5 h-4 border-l border-border" />
    <select aria-label={tx("Partial Denture component type")} value={kind} onChange={(event) => setKind(event.target.value as PartialComponentKind)} className="h-6 rounded border border-input bg-background px-1">{options.map((item) => <option key={item.kind} value={item.kind}>{tx(item.label)}</option>)}</select>
    {needsTooth && <select aria-label={tx("Partial Denture abutment")} value={selectedAbutment} onChange={(event) => setTooth(event.target.value)} className="h-6 max-w-40 rounded border border-input bg-background px-1">{abutments.map(({ id, label, toothNumber }) => <option key={id} value={String(toothNumber ?? "")}>{label}</option>)}</select>}
    <button type="button" disabled={!canEdit} onClick={add} className="rounded bg-primary/10 px-2 py-1 text-primary disabled:opacity-40">{tx("Add component")}</button>
    <span className="text-muted-foreground">{setup.components.length} {tx("components · stable IDs · synthetic educational geometry")}</span>
  </div>;
}
