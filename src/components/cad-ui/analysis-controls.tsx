"use client";
import { useInterfaceCopy } from "@/lib/i18n";

import { useEffect, useMemo, useState } from "react";
import { Check, Crosshair, Hand, Play, ScanLine, Scissors, Trash2 } from "lucide-react";
import * as THREE from "three";
import { geometryRegistry } from "@/cad/scene/geometry-registry";
import { snapshotMesh, pointDistanceMm } from "@/cad/analysis/geometry";
import { cancelAnalysis, runAnalysis, scalarRequest } from "@/cad/analysis/jobs";
import { analysisResultIsCurrent, useAnalysisStore } from "@/cad/analysis/state";
import type { AnalysisResult, AnalysisState } from "@/cad/analysis/types";
import type { CadObjectId, CadObjectMetadata } from "@/cad/types";
import { cadObjectId } from "@/cad/types";
import { editCurve } from "@/cad/curves/commands";
import { useCurveStore, validateClosedCurve } from "@/cad/curves/store";
import { useRestorativeSetupStore } from "@/cad/restorative/types";

export type SectionSettings = { enabled: boolean; axis: "x" | "y" | "z"; offset: number };
export type MeasurePoint = { position: [number, number, number]; objectId: CadObjectId; meshId: string };
type ScalarResult = Extract<AnalysisResult, { values: Float32Array }>;
type Props = { objects: CadObjectMetadata[]; selectedObjectId: CadObjectId | null; panel: "margin" | "analysis"; hidden?: boolean; highlightedSubtool?: string | null; canPlaceCrown?: boolean; onPlaceCrown?: () => void; onEnterAnalysis: () => void; onMeasureMode: (active: boolean) => void; onMarginMode: (active: boolean) => void; onMeasurePoints: (points: MeasurePoint[]) => void; onSection: (section: SectionSettings) => void; onScalar: (result: ScalarResult | null) => void };
type PickEvent = { position: [number, number, number]; objectId: string };
type CurveMode = "off" | "draw" | "edit";
type AnalysisKind = "contact" | "deviation" | "thickness" | "undercut";

export function AnalysisControls({ objects, selectedObjectId, panel, hidden = false, highlightedSubtool, canPlaceCrown = false, onPlaceCrown, onEnterAnalysis, onMeasureMode, onMarginMode, onMeasurePoints, onSection, onScalar }: Props) {
  const tx = useInterfaceCopy();
  const imported = useMemo(() => objects.filter((object) => geometryRegistry.getMeshes(object.id).length), [objects]);
  const preparations = useMemo(() => objects.filter((object) => object.role === "prepared_tooth" || object.denturePart === "arch" || object.biteSplintPart === "upper_arch" || object.digitalModelPart === "working_model" || ["blockout", "major_connector", "lingual_bar", "retention_mesh", "clasp", "minor_connector", "rest", "guide_plane", "finish_line", "relief"].includes(String(object.partialDenturePart))), [objects]);
  const [a, setA] = useState(""); const [b, setB] = useState("");
  const [meshA, setMeshA] = useState(""); const [meshB, setMeshB] = useState("");
  const [tool, setTool] = useState<"none" | "measure" | "section">("none");
  const [section, setSection] = useState<SectionSettings>({ enabled: false, axis: "z", offset: 0 });
  const [kind, setKind] = useState<AnalysisKind>("contact"); const [threshold, setThreshold] = useState(1);
  const insertionDirection = useRestorativeSetupStore((store) => store.insertionDirection);
  const initialAxis = Math.abs(insertionDirection[0]) > Math.abs(insertionDirection[2]) ? "x" : Math.abs(insertionDirection[1]) > Math.abs(insertionDirection[2]) ? "y" : "z";
  const insertionAxis = initialAxis;
  const [state, setState] = useState<AnalysisState>("idle"); const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null); const [message, setMessage] = useState(""); const [pointCount, setPointCount] = useState(0);
  const [activeRequest, setActiveRequest] = useState<string | null>(null);
  const [measurePoints, setMeasurePoints] = useState<MeasurePoint[]>([]);
  const [curveMode, setCurveMode] = useState<CurveMode>("off");
  const [curveObject, setCurveObject] = useState("");
  const [curvePointIndex, setCurvePointIndex] = useState(0);
  const [curveMessage, setCurveMessage] = useState("");
  const activeCurveObject = curveObject || (preparations.some((object) => object.id === selectedObjectId) ? selectedObjectId! : preparations[0]?.id || "");
  const activeMetadata = objects.find((object) => object.id === cadObjectId(activeCurveObject));
  const activeCurveKind = activeMetadata?.biteSplintPart === "upper_arch" ? "splint_boundary" : activeMetadata?.digitalModelPart === "working_model" ? "model_trim_boundary" : activeMetadata?.denturePart === "arch" ? "boundary" : activeMetadata?.partialDenturePart && activeMetadata.partialDenturePart !== "arch" && activeMetadata.partialDenturePart !== "tooth" && activeMetadata.partialDenturePart !== "missing_region" && activeMetadata.partialDenturePart !== "reference" ? "framework_path" : "margin";
  const curveLabel = tx(activeCurveKind === "boundary" ? "Denture Border" : activeCurveKind === "splint_boundary" ? "Splint Boundary" : activeCurveKind === "model_trim_boundary" ? "Trim Boundary" : activeCurveKind === "framework_path" ? "Framework Path" : "Margin Line");
  const curve = useCurveStore((current) => current.curves.find((entry) => entry.objectId === cadObjectId(activeCurveObject) && entry.kind === activeCurveKind));
  const curveStatus = validateClosedCurve(curve, activeCurveKind === "boundary" ? "Denture Border" : activeCurveKind === "splint_boundary" ? "Splint Boundary" : activeCurveKind === "model_trim_boundary" ? "Trim Boundary" : activeCurveKind === "framework_path" ? "Framework Path" : "Margin Line");
  const curveStatusText = !curve ? tx("No curve is defined.") : curve.points.length < 3 ? tx("A closed curve needs at least three surface points.") : !curve.closed ? tx("Curve is still open. Close the loop before Design Check.") : curve.points.some((point) => !point.every(Number.isFinite)) ? tx("Curve contains invalid point coordinates.") : tx("Curve is closed and has at least three points.");
  const sectionBounds = useMemo(() => {
    const axis = section.axis === "x" ? 0 : section.axis === "y" ? 1 : 2;
    let minimum = Infinity, maximum = -Infinity;
    for (const object of objects) {
      const runtime = geometryRegistry.get(object.id); if (!runtime || !object.visible) continue;
      runtime.object.updateWorldMatrix(true, true);
      const bounds = new THREE.Box3().setFromObject(runtime.object); if (bounds.isEmpty()) continue;
      minimum = Math.min(minimum, bounds.min.getComponent(axis)); maximum = Math.max(maximum, bounds.max.getComponent(axis));
    }
    if (!Number.isFinite(minimum) || !Number.isFinite(maximum)) return { min: -100, max: 100 };
    const margin = Math.max((maximum - minimum) * 0.05, 2);
    return { min: Math.floor(minimum - margin), max: Math.ceil(maximum + margin) };
  }, [objects, section.axis]);
  const selectedA = a || imported.find((item) => item.id === selectedObjectId)?.id || imported[0]?.id || "";
  const selectedB = b || imported.find((item) => item.id !== selectedA)?.id || imported[1]?.id || "";
  const isStale = !!result && !analysisResultIsCurrent(result);
  useEffect(() => { if (isStale) onScalar(null); }, [isStale, onScalar]);
  const targetMeshes = (id: string) => id ? geometryRegistry.getMeshes(cadObjectId(id)) : [];
  const meshOptions = (id: string, value: string, setter: (value: string) => void) => { const meshes = targetMeshes(id); return meshes.length > 1 ? <select aria-label={tx("Mesh child")} value={value} onChange={(event) => setter(event.target.value)} className="h-6 rounded border border-input bg-background px-1 text-[9px]"><option value="">{tx("Choose child")}</option>{meshes.map((mesh, index) => <option key={mesh.key} value={mesh.key}>Mesh {index + 1}</option>)}</select> : null; };
  const run = async (analysisKind: AnalysisKind | "intersection") => {
    const single = analysisKind === "thickness" || analysisKind === "undercut";
    if (!selectedA || (!single && (!selectedB || selectedA === selectedB))) { setState("failed"); setMessage(tx("Choose the required CAD object or object pair.")); return; }
    try {
      setState("preparing"); setMessage(""); setResult(null); onScalar(null);
      const first = snapshotMesh(selectedA, meshA || undefined);
      const targets = single ? [first] as [typeof first] : [first, snapshotMesh(selectedB, meshB || undefined)] as [typeof first, typeof first];
      setState("processing"); setProgress(0);
      const requestId = crypto.randomUUID(); setActiveRequest(requestId);
      const request = analysisKind === "intersection" ? { type: "ANALYSIS_REQUEST" as const, requestId, kind: analysisKind, targets: targets as [typeof first, typeof first] }
        : analysisKind === "undercut" ? { type: "ANALYSIS_REQUEST" as const, requestId, kind: analysisKind, targets: [first] as [typeof first], insertionDirection }
          : analysisKind === "thickness" ? { type: "ANALYSIS_REQUEST" as const, requestId, kind: analysisKind, targets: [first] as [typeof first], thresholdMm: threshold }
            : scalarRequest(requestId, analysisKind as "contact" | "deviation", targets as [typeof first, typeof first], threshold);
      const next = await runAnalysis(request, setProgress);
      setActiveRequest(null);
      if (!analysisResultIsCurrent(next)) { setState("stale"); setMessage(tx("Geometry or insertion direction changed while analysis was running. Run it again.")); return; }
      setResult(next); setState("ready"); useAnalysisStore.getState().record(next); onScalar("values" in next ? next : null);
      if (next.kind === "intersection") setMessage(tx(next.intersects ? "Intersection detected between the selected meshes." : "No intersection detected between the selected meshes."));
      else if (next.kind === "undercut") setMessage(tx("Direction-based surface orientation preview complete. This is not a clinical undercut determination."));
      else if (next.kind === "dynamic_contact") setMessage(`${next.samples.length} ${tx("motion poses · first sampled contact")} ${next.firstContactT === null ? tx("not found") : `${Math.round(next.firstContactT * 100)}%`}`);
      else setMessage(`${next.sampleCount.toLocaleString()} ${tx("samples")} · ${next.minMm.toFixed(3)}–${next.maxMm.toFixed(3)} mm`);
    } catch (error) { setActiveRequest(null); if (error instanceof DOMException && error.name === "AbortError") { setState("cancelled"); setMessage(tx("Analysis cancelled.")); return; } console.error("Analysis could not be completed.", error); setState("failed"); setMessage(tx("Analysis could not be completed.")); }
  };
  const setToolMode = (next: "none" | "measure" | "section") => { if (next !== "none") onEnterAnalysis(); setTool(next); onMeasureMode(next === "measure"); if (next !== "none" && curveMode !== "off") { setCurveMode("off"); onMarginMode(false); } if (next !== "measure") { setMeasurePoints([]); onMeasurePoints([]); } if (next !== "section") { const disabled = { ...section, enabled: false }; setSection(disabled); onSection(disabled); } };
  const receiveMeasurePoint = (point: MeasurePoint) => { const next = measurePoints.length >= 2 ? [point] : [...measurePoints, point]; setMeasurePoints(next); setPointCount(next.length); onMeasurePoints(next); };
  useEffect(() => { const listener = (event: Event) => receiveMeasurePoint((event as CustomEvent<MeasurePoint>).detail); window.addEventListener("cad-analysis-point", listener); return () => window.removeEventListener("cad-analysis-point", listener); });
  useEffect(() => {
    const listener = (event: Event) => {
      const picked = (event as CustomEvent<PickEvent>).detail;
      if (curveMode === "off" || !activeCurveObject) return;
       if (picked.objectId !== activeCurveObject) { setCurveMessage(tx("Pick points directly on the selected surface.")); return; }
      const root = geometryRegistry.get(cadObjectId(activeCurveObject))?.object;
       if (!root) { setCurveMessage(tx("Preparation geometry is no longer available.")); return; }
      root.updateWorldMatrix(true, true);
      const point = root.worldToLocal(new THREE.Vector3(...picked.position)).toArray().map((value) => Number(value.toFixed(4))) as [number, number, number];
      try {
        if (curveMode === "draw") editCurve(() => { const state = useCurveStore.getState(); const id = state.addPoint(cadObjectId(activeCurveObject), point, curve?.id); state.setKind(id, activeCurveKind); });
        else editCurve(() => useCurveStore.getState().movePoint(cadObjectId(activeCurveObject), curvePointIndex, point));
         setCurveMessage(curveMode === "draw" ? `${tx("Surface point")} ${((curve?.points.length ?? 0) + 1)} ${tx("placed.")}` : `${tx("Point")} ${curvePointIndex + 1} ${tx("moved.")}`);
       } catch (error) { console.error("Curve point could not be edited.", error); setCurveMessage(tx("The curve point could not be edited.")); }
    };
    window.addEventListener("cad-margin-pick", listener);
    return () => window.removeEventListener("cad-margin-pick", listener);
   }, [curveMode, activeCurveObject, activeCurveKind, curvePointIndex, curve?.id, curve?.points.length, tx]);
  const distance = measurePoints.length === 2 ? pointDistanceMm(measurePoints[0].position, measurePoints[1].position) : null;
  const sectionUpdate = (patch: Partial<SectionSettings>) => { const next = { ...section, ...patch }; setSection(next); onSection(next); };
   const setCurveTool = (mode: CurveMode) => { if (mode !== "off") onEnterAnalysis(); if (curve) useCurveStore.getState().setActiveCurve(curve.id); setCurveMode(mode); onMarginMode(mode !== "off"); if (mode !== "off") { onMeasureMode(false); setTool("none"); } setCurveMessage(mode === "draw" ? tx("Click points directly on the selected surface.") : mode === "edit" ? tx("Choose a point, then click its surface to move it.") : ""); };
   const closeCurve = () => { if (!curve || curve.points.length < 3) { setCurveMessage(tx("Place at least three surface points before closing the curve.")); return; } editCurve(() => useCurveStore.getState().close(cadObjectId(activeCurveObject))); setCurveMessage(tx("Curve closed for this exercise.")); };
   const clearCurve = () => { if (!curve) return; editCurve(() => useCurveStore.getState().removeCurve(curve.id)); setCurveMessage(tx("Curve cleared. Source geometry is unchanged.")); };
  return <div hidden={hidden} data-tool-panel={panel} className={`cad-analysis-controls min-h-11 max-h-24 shrink-0 overflow-y-auto border-t border-border bg-card px-3 py-2 ${hidden ? "hidden" : ""}`} aria-label={tx(panel === "margin" ? "Margin and curve tools" : "Spatial analysis tools")}><div className="flex flex-wrap items-center gap-1.5">
    {panel === "analysis" && <>
    <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{tx("Inspect")}</span>
    <button type="button" aria-pressed={tool === "measure"} className={`inline-flex items-center gap-1.5 rounded border px-2 py-1.5 text-[10px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${tool === "measure" ? "border-primary/40 bg-primary/10 text-foreground" : "border-transparent hover:bg-muted"} ${highlightedSubtool === "Measure" ? "ring-2 ring-amber-400" : ""}`} onClick={() => setToolMode(tool === "measure" ? "none" : "measure")}><Crosshair aria-hidden="true" className="size-3.5" />{tx("Measure")}</button>
    <button type="button" aria-pressed={tool === "section"} className={`inline-flex items-center gap-1.5 rounded border px-2 py-1.5 text-[10px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${tool === "section" ? "border-primary/40 bg-primary/10 text-foreground" : "border-transparent hover:bg-muted"} ${highlightedSubtool === "Section" ? "ring-2 ring-amber-400" : ""}`} onClick={() => setToolMode(tool === "section" ? "none" : "section")}><ScanLine aria-hidden="true" className="size-3.5" />{tx("Section")}</button>
     {tool === "measure" && <><span role="status" className="text-[9px] text-muted-foreground">{tx("Click two mesh points")} ({pointCount}/2)</span>{distance !== null && <strong className="text-[10px] tabular-nums">{distance.toFixed(3)} mm</strong>}<button className="inline-flex items-center gap-1 text-[9px] text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring" onClick={() => { setMeasurePoints([]); onMeasurePoints([]); setPointCount(0); }}><Trash2 aria-hidden="true" className="size-3" />{tx("Clear")}</button></>}
     {tool === "section" && <><label className="flex items-center gap-1 text-[9px]">{tx("Plane")} <select aria-label={tx("Section plane orientation")} value={section.axis} onChange={(event) => sectionUpdate({ axis: event.target.value as SectionSettings["axis"] })} className="h-6 rounded border border-input bg-background px-1"><option value="x">YZ</option><option value="y">XZ</option><option value="z">XY</option></select></label><label className="flex items-center gap-1 text-[9px]">{tx("Position")} <input aria-label={tx("Section plane position in millimeters")} type="range" min={sectionBounds.min} max={sectionBounds.max} step="0.1" value={Math.max(sectionBounds.min, Math.min(sectionBounds.max, section.offset))} onChange={(event) => sectionUpdate({ offset: Number(event.currentTarget.value) })} /><span>{section.offset.toFixed(1)} mm</span></label><button className="text-[9px] text-primary" onClick={() => sectionUpdate({ enabled: !section.enabled })}>{section.enabled ? tx("Disable") : tx("Enable")}</button><button className="text-[9px] text-primary" onClick={() => { sectionUpdate({ enabled: false, axis: "z", offset: 0 }); setToolMode("none"); }}>{tx("Reset")}</button></>}
    </>}
    {panel === "margin" && <>
    <span className="shrink-0 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{curveLabel}</span>
    {canPlaceCrown && onPlaceCrown && <button type="button" className="rounded border border-primary/30 bg-primary/10 px-2 py-1.5 text-[10px] text-primary" onClick={onPlaceCrown}>{tx("Place from tooth library")}</button>}
    <select aria-label={tx(activeCurveKind === "boundary" ? "Denture border arch" : activeCurveKind === "framework_path" ? "Framework component path" : "Margin preparation")} value={activeCurveObject} onChange={(event) => { setCurveObject(event.target.value); setCurvePointIndex(0); }} className="h-6 max-w-32 rounded border border-input bg-background px-1 text-[9px]">{preparations.map((object) => <option key={object.id} value={object.id}>{object.name}</option>)}</select>
    <button type="button" aria-pressed={curveMode === "draw"} className={`inline-flex items-center gap-1.5 rounded border px-2 py-1.5 text-[10px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${curveMode === "draw" ? "border-primary/40 bg-primary/10 text-foreground" : "border-transparent hover:bg-muted"} ${highlightedSubtool === "Place points" ? "ring-2 ring-amber-400" : ""}`} disabled={!preparations.length} onClick={() => setCurveTool(curveMode === "draw" ? "off" : "draw")}><Crosshair aria-hidden="true" className="size-3.5" />{tx("Place points")}</button>
    <button type="button" aria-pressed={curveMode === "edit"} className={`inline-flex items-center gap-1.5 rounded border px-2 py-1.5 text-[10px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${curveMode === "edit" ? "border-primary/40 bg-primary/10 text-foreground" : "border-transparent hover:bg-muted"} ${highlightedSubtool === "Edit point" ? "ring-2 ring-amber-400" : ""}`} disabled={!curve?.points.length} onClick={() => setCurveTool(curveMode === "edit" ? "off" : "edit")}><Hand aria-hidden="true" className="size-3.5" />{tx("Edit point")}</button>
    {curve?.points.length ? <><select aria-label={`${curveLabel} ${tx("point")}`} value={curvePointIndex} onChange={(event) => setCurvePointIndex(Number(event.target.value))} className="h-7 rounded border border-input bg-background px-1.5 text-[10px]">{curve.points.map((_, index) => <option key={index} value={index}>{tx("Point")} {index + 1}</option>)}</select>{activeCurveKind !== "framework_path" && <><button className={`inline-flex items-center gap-1 rounded border px-2 py-1.5 text-[10px] text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${highlightedSubtool === "Close" ? "ring-2 ring-amber-400" : "border-transparent"}`} disabled={curve.closed} onClick={closeCurve}><Check aria-hidden="true" className="size-3" />{tx("Close")}</button><button className={`inline-flex items-center gap-1 rounded border px-2 py-1.5 text-[10px] text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring ${highlightedSubtool === "Clear" ? "ring-2 ring-amber-400" : "border-transparent"}`} onClick={clearCurve}><Trash2 aria-hidden="true" className="size-3" />{tx("Clear")}</button></>}</> : null}
    <span role="status" className={`max-w-52 truncate text-[9px] ${curve && !curveStatus.valid ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground"}`}>{curveMessage || (curve ? curveStatusText : tx("Pick only on the selected surface. Source geometry is not modified."))}</span>
    </>}
    {panel === "analysis" && <>
    <select aria-label={tx("Analysis type")} value={kind} onChange={(event) => setKind(event.target.value as AnalysisKind)} className="h-6 rounded border border-input bg-background px-1 text-[9px]"><option value="contact">{tx("Proximity map")}</option><option value="deviation">{tx("Reference deviation")}</option><option value="thickness">{tx("Thickness")}</option><option value="undercut">{tx("Insertion direction")}</option></select>
    <select aria-label={tx("First analysis object")} value={selectedA} onChange={(event) => { setA(event.target.value); setMeshA(""); }} className="h-6 max-w-32 rounded border border-input bg-background px-1 text-[9px]">{imported.map((object) => <option key={object.id} value={object.id}>{object.name}</option>)}</select>{meshOptions(selectedA, meshA, setMeshA)}
    {kind !== "thickness" && kind !== "undercut" && <><select aria-label={tx("Second analysis object")} value={selectedB} onChange={(event) => { setB(event.target.value); setMeshB(""); }} className="h-6 max-w-32 rounded border border-input bg-background px-1 text-[9px]">{imported.filter((object) => object.id !== selectedA).map((object) => <option key={object.id} value={object.id}>{object.name}</option>)}</select>{meshOptions(selectedB, meshB, setMeshB)}</>}
    {kind === "undercut" && <label className="flex items-center gap-1 text-[9px]">{tx("Path axis")} <select aria-label={tx("Insertion direction axis")} value={insertionAxis} onChange={(event) => { const axis = event.target.value as typeof insertionAxis; useRestorativeSetupStore.getState().setInsertionDirection(axis === "x" ? [1, 0, 0] : axis === "y" ? [0, 1, 0] : [0, 0, 1]); }} className="h-6 rounded border border-input bg-background px-1"><option value="z">+Z</option><option value="x">+X</option><option value="y">+Y</option></select></label>}
    {kind !== "undercut" && <label className="flex shrink-0 items-center gap-1 text-[9px] text-muted-foreground">{tx("Exercise target")} <input aria-label={tx("Analysis target in millimeters")} type="number" min="0.01" step="0.1" value={threshold} onChange={(event) => setThreshold(Math.max(0.01, Number(event.currentTarget.value)))} className="h-6 w-12 rounded border border-input bg-background px-1" />mm</label>}
    <button className={`inline-flex items-center gap-1.5 rounded border border-primary/30 bg-primary/10 px-2 py-1.5 text-[10px] text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40 ${highlightedSubtool === "Run analysis" ? "ring-2 ring-amber-400" : ""}`} disabled={state === "processing" || !selectedA || (kind !== "thickness" && kind !== "undercut" && (!selectedB || selectedA === selectedB)) || (!!(targetMeshes(selectedA).length > 1 && !meshA) || (kind !== "thickness" && kind !== "undercut" && !!(targetMeshes(selectedB).length > 1 && !meshB)))} onClick={() => void run(kind)}><Play aria-hidden="true" className="size-3.5" />{kind === "undercut" ? tx("Preview path") : tx("Run analysis")}</button>
    <button className="inline-flex items-center gap-1 rounded px-2 py-1 text-[9px] hover:bg-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-40" disabled={state === "processing" || !selectedA || !selectedB || selectedA === selectedB} onClick={() => void run("intersection")}><Scissors aria-hidden="true" className="size-3" />{tx("Intersection")}</button>
    {state === "processing" && <span role="status" className="text-[9px] text-muted-foreground">{tx("Analyzing")} {Math.round(progress * 100)}%</span>}
    {state === "processing" && activeRequest && <button className="text-[9px] text-primary" onClick={() => cancelAnalysis(activeRequest)}>{tx("Cancel")}</button>}
    {(message || isStale) && <span role="status" className={`max-w-64 truncate text-[9px] ${state === "failed" || isStale ? "text-amber-600" : "text-muted-foreground"}`}>{isStale ? tx("Stale · Geometry or object transform changed. Run again.") : message}</span>}
    {state === "ready" && result && !isStale && "values" in result && <button className="text-[9px] text-primary" onClick={() => { setResult(null); setState("idle"); setMessage(""); onScalar(null); useAnalysisStore.getState().clear(result.kind); }}>{tx("Clear map")}</button>}
    </>}
  </div></div>;
}
