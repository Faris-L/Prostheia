"use client";
import { useInterfaceCopy } from "@/lib/i18n";
import { useMemo, useState } from "react";
import * as THREE from "three";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import { markPreviewDirty, recordAppliedTransform, runTransformCommand } from "@/cad/engine/cad-actions";
import { cloneTransform } from "@/cad/engine/commands";
import { useImplantStore, IMPLANT_FIXTURES } from "@/cad/implant/types";
import { axisAngleDegrees, implantAxisFromTransform } from "@/cad/implant/analysis";
import { IMPLANT_IDS } from "@/cad/implant/case";
import { addImplantFixture } from "@/cad/implant/case";
import { setImplantRestorativeAxis } from "@/cad/implant/operations";
import { cadObjectId } from "@/cad/types";
import { useAnalysisStore, analysisResultIsCurrent } from "@/cad/analysis/state";

export function ImplantWorkflowPanel({ canEdit = true }: { canEdit?: boolean }) {
  const tx = useInterfaceCopy();
  const setup = useImplantStore(); const objects = useWorkspaceStore((state) => state.objects);
  const [message, setMessage] = useState("");
  const [depthDraft, setDepthDraft] = useState<string | null>(null); const [angleDraft, setAngleDraft] = useState<string | null>(null);
  const fixture = objects.find((object) => object.implantPart === "fixture" && !object.implantReference);
  const selectedObjectId = useWorkspaceStore((state) => state.selectedObjectId);
  const selected = objects.find((object) => object.id === selectedObjectId);
  const axis = fixture ? implantAxisFromTransform(fixture.transform) : [0, 0, 1] as [number, number, number];
  const angle = axisAngleDegrees(axis, setup.restorativeAxis);
  const result = useAnalysisStore((state) => state.results.find((item) => item.kind === "contact" && item.targets.some((target) => target.objectId === cadObjectId(IMPLANT_IDS.fixture)) && item.targets.some((target) => target.objectId === cadObjectId(IMPLANT_IDS.risk))));
  const currentResult = result && analysisResultIsCurrent(result) && "minMm" in result ? result : undefined;
  const transform = (delta: { position?: [number, number, number]; rotation?: [number, number, number] }) => {
    if (!fixture) return;
    const before = fixture.transform; runTransformCommand(fixture.id, before, { ...before, ...delta }); setMessage("Fixture placement updated. Undo is available.");
  };
  const setDepth = (depth: number) => { if (!fixture) return; transform({ position: [fixture.transform.position[0], fixture.transform.position[1], (fixture.implantLengthMm ?? 8) - depth] }); };
  const setAngulation = (degrees: number) => { if (!fixture) return; transform({ rotation: [degrees * Math.PI / 180, fixture.transform.rotation[1], fixture.transform.rotation[2]] }); };
  const matchScanBody = () => {
    if (!fixture) return;
    const scan = objects.find((object) => object.implantPart === "scan_body"); if (!scan) return;
    const before = scan.transform; runTransformCommand(scan.id, before, { ...before, position: [...fixture.transform.position] }); setMessage("Synthetic scan body aligned to the selected fixture for this exercise.");
  };
  const scalePreview = (part: string, factor: number) => { const target = objects.find((object) => object.implantPart === part); if (!target) return; useWorkspaceStore.getState().previewTransform(target.id, { ...target.transform, scale: [factor, factor, target.transform.scale[2]] }); markPreviewDirty(); };
  const finishScale = (part: string) => { const operation = useWorkspaceStore.getState().finishTransformOperation(); if (!operation) return; const current = useWorkspaceStore.getState().objects.find((object) => object.id === operation.id); if (current) recordAppliedTransform(operation.id, cloneTransform(operation.before), cloneTransform(current.transform)); setMessage(part === "abutment" ? "Custom abutment geometry updated. Undo is available." : "Emergence profile geometry updated. Undo is available."); };
  const pickRole = (part: string) => { const target = objects.find((object) => object.implantPart === part); if (target) useWorkspaceStore.getState().select(target.id); };
  if (!fixture) return null;
  const depth = Math.max(0, (fixture.implantLengthMm ?? 8) - fixture.transform.position[2]);
  return <div className="flex min-h-9 shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-border bg-card px-2.5 py-1.5 text-[9px]" aria-label={tx("Implant educational workflow controls")}>
    <strong className="font-semibold uppercase tracking-wide text-primary">{tx("Implant · synthetic education")}</strong>
    <label className="flex items-center gap-1 text-muted-foreground">{tx("Training fixture")}<select aria-label={tx("Synthetic training fixture definition")} value={setup.selectedDefinitionId} disabled={!canEdit} onChange={(event) => useImplantStore.getState().setDefinition(event.currentTarget.value)} className="h-6 max-w-44 rounded border border-input bg-background px-1 text-foreground">{IMPLANT_FIXTURES.map((entry) => <option key={entry.id} value={entry.id}>{entry.name}</option>)}</select></label>
    <button type="button" className="rounded border border-border px-1.5 py-1 hover:bg-muted disabled:opacity-40" disabled={!canEdit} onClick={() => pickRole("fixture")}>{tx("Select fixture")}</button>
    <button type="button" className="rounded bg-primary/10 px-1.5 py-1 text-primary hover:bg-primary/15 disabled:opacity-40" disabled={!canEdit} onClick={() => { addImplantFixture(); setMessage("Synthetic training fixture added. Undo is available."); }}>{tx("Add fixture")}</button>
    <label className="flex items-center gap-1 text-muted-foreground">{tx("Depth · mm · Target for this exercise")}<input aria-label={tx("Implant depth in millimeters")} type="number" min="0" max="30" step="0.5" value={depthDraft ?? depth.toFixed(1)} disabled={!canEdit} onChange={(event) => setDepthDraft(event.currentTarget.value)} onBlur={() => { if (depthDraft !== null && depthDraft !== "" && Number.isFinite(Number(depthDraft))) setDepth(Number(depthDraft)); setDepthDraft(null); }} className="h-6 w-14 rounded border border-input bg-background px-1 text-foreground" /></label>
    <label className="flex items-center gap-1 text-muted-foreground">{tx("Angulation · ° · Target for this exercise")}<input aria-label={tx("Implant angulation in degrees")} type="number" min="-60" max="60" step="0.5" value={angleDraft ?? (fixture.transform.rotation[0] * 180 / Math.PI).toFixed(1)} disabled={!canEdit} onChange={(event) => setAngleDraft(event.currentTarget.value)} onBlur={() => { if (angleDraft !== null && angleDraft !== "" && Number.isFinite(Number(angleDraft))) setAngulation(Number(angleDraft)); setAngleDraft(null); }} className="h-6 w-14 rounded border border-input bg-background px-1 text-foreground" /></label>
    <span className="rounded bg-muted px-1.5 py-1 tabular-nums">Implant Axis [{axis.map((value) => value.toFixed(2)).join(", ")}]</span><label className="flex items-center gap-1">{tx("Restorative axis")}<select aria-label={tx("Restorative reference axis")} value={setup.restorativeAxis[0] === 0 ? "z" : "tilted"} onChange={(event) => setImplantRestorativeAxis(event.currentTarget.value === "z" ? [0, 0, 1] : [Math.sin(Math.PI / 12), 0, Math.cos(Math.PI / 12)])} className="h-6 rounded border border-input bg-background px-1"><option value="z">+Z</option><option value="tilted">{tx("Exercise reference 15°")}</option></select></label><span className="tabular-nums">Axis difference {angle.toFixed(1)}°</span>
    <button type="button" className="rounded border border-border px-1.5 py-1 hover:bg-muted" onClick={matchScanBody}>{tx("Match scan body")}</button>
    <button type="button" className="rounded border border-border px-1.5 py-1 hover:bg-muted" onClick={() => pickRole("abutment")}>{tx("Select abutment")}</button>
    <label className="flex items-center gap-1 text-muted-foreground">{tx("Custom abutment width")}<input aria-label={tx("Custom abutment exercise width")} type="range" min="0.75" max="1.4" step="0.05" value={objects.find((object) => object.implantPart === "abutment")?.transform.scale[0] ?? 1} disabled={!canEdit} onPointerDown={() => { const target = objects.find((object) => object.implantPart === "abutment"); if (target) useWorkspaceStore.getState().beginTransformOperation(target.id, target.transform); }} onPointerUp={() => finishScale("abutment")} onChange={(event) => scalePreview("abutment", Number(event.currentTarget.value))} className="w-14" /></label>
    <label className="flex items-center gap-1 text-muted-foreground">{tx("Emergence profile")}<input aria-label={tx("Emergence profile exercise width")} type="range" min="0.6" max="1.4" step="0.05" value={objects.find((object) => object.implantPart === "emergence_reference")?.transform.scale[0] ?? 1} disabled={!canEdit} onPointerDown={() => { const target = objects.find((object) => object.implantPart === "emergence_reference"); if (target) useWorkspaceStore.getState().beginTransformOperation(target.id, target.transform); }} onPointerUp={() => finishScale("emergence_reference")} onChange={(event) => scalePreview("emergence_reference", Number(event.currentTarget.value))} className="w-14" /></label>
    <button type="button" className="rounded border border-border px-1.5 py-1 hover:bg-muted" onClick={() => pickRole("restoration")}>{tx("Select shared crown")}</button>
    <button type="button" className="rounded border border-border px-1.5 py-1 hover:bg-muted" onClick={() => pickRole("screw_channel")}>{tx("Inspect screw channel")}</button>
    <button type="button" className="rounded border border-border px-1.5 py-1 hover:bg-muted" onClick={() => pickRole("reference_fixture")}>{tx("Show reference fixture")}</button>
    {currentResult && <span className="tabular-nums">Fixture to synthetic reference region {currentResult.minMm.toFixed(2)} mm · Target for this exercise {setup.exerciseDistanceTargetMm.toFixed(1)} mm</span>}
    {selected?.implantPart && <span className="text-muted-foreground">Selected: {selected.implantPart}</span>}
    <span className="text-muted-foreground">{tx("All geometry is synthetic. Values describe this exercise and do not support clinical or surgical decisions.")}</span>
    {message && <span role="status" className="text-muted-foreground">{tx(message)}</span>}
  </div>;
}

export function ImplantAxisVisual({ object }: { object: import("@/cad/types").CadObjectMetadata }) {
  const geometry = useMemo(() => {
    if (object.implantPart !== "fixture" && object.implantPart !== "reference_fixture") return null;
    const length = Math.max(2, object.implantLengthMm ?? 8);
    const value = new THREE.BufferGeometry(); value.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0.5, 0, 0, length * 1.3], 3)); return value;
  }, [object.implantPart, object.implantLengthMm]);
  if (!geometry) return null;
  return <lineSegments geometry={geometry}><lineBasicMaterial color={object.implantReference ? "#58a69e" : "#e46e48"} depthTest={false} /></lineSegments>;
}
