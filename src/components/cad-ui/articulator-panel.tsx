"use client";
import { useInterfaceCopy } from "@/lib/i18n";

import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, RotateCcw, Activity, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { snapshotMesh } from "@/cad/analysis/geometry";
import { runAnalysis, cancelAnalysis } from "@/cad/analysis/jobs";
import type { AnalysisResult } from "@/cad/analysis/types";
import { sampleMotion, validateArticulatorConfig } from "@/cad/articulator/kinematics";
import { useArticulatorStore } from "@/cad/articulator/store";
import type { ArticulatorConfig, ArticulatorMotion } from "@/cad/articulator/types";
import type { CadObjectMetadata } from "@/cad/types";
import { analysisResultIsCurrent, useAnalysisStore } from "@/cad/analysis/state";
import { useSaveStore } from "@/cad/engine/save-store";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";

const motionLabels: Record<ArticulatorMotion, string> = { open_close: "Open / Close", protrusive: "Protrusive", left_lateral: "Left lateral", right_lateral: "Right lateral" };
const numberInputs: { key: "maxOpeningDeg" | "protrusiveTravelMm" | "lateralTravelMm" | "contactThresholdMm" | "sampleCount"; label: string; unit: string; min: number; max: number; step: number }[] = [
  { key: "maxOpeningDeg", label: "Opening range", unit: "°", min: 0, max: 45, step: 1 },
  { key: "protrusiveTravelMm", label: "Protrusive travel", unit: "mm", min: 0, max: 20, step: 0.5 },
  { key: "lateralTravelMm", label: "Lateral travel", unit: "mm", min: 0, max: 20, step: 0.5 },
  { key: "contactThresholdMm", label: "Contact threshold", unit: "mm", min: 0.05, max: 5, step: 0.05 },
  { key: "sampleCount", label: "Motion samples", unit: "poses", min: 2, max: 64, step: 1 },
];

function SelectPair({ label, value, candidates, onChange }: { label: string; value: string; candidates: CadObjectMetadata[]; onChange: (id: string) => void }) {
  return <label className="grid grid-cols-[70px_1fr] items-center gap-2 text-[10px]"><span className="text-muted-foreground">{label}</span><select aria-label={label} value={value} onChange={(event) => onChange(event.currentTarget.value)} className="h-7 min-w-0 rounded border border-border bg-background px-1.5 text-[10px]">{candidates.map((object) => <option key={object.id} value={object.id}>{object.name}</option>)}</select></label>;
}

export function ArticulatorPanel({ objects, canUse = true, canAnalyze = true }: { objects: CadObjectMetadata[]; canUse?: boolean; canAnalyze?: boolean }) {
  const tx = useInterfaceCopy();
  const config = useArticulatorStore((state) => state.config);
  const motion = useArticulatorStore((state) => state.motion);
  const t = useArticulatorStore((state) => state.t);
  const playing = useArticulatorStore((state) => state.playing);
  const configure = useArticulatorStore((state) => state.configure);
  const setMotion = useArticulatorStore((state) => state.setMotion);
  const setPosition = useArticulatorStore((state) => state.setPosition);
  const setPlaying = useArticulatorStore((state) => state.setPlaying);
  const result = useAnalysisStore((state) => state.results.find((entry) => entry.kind === "dynamic_contact"));
  const record = useAnalysisStore((state) => state.record);
  const [upperId, setUpperId] = useState("");
  const [lowerId, setLowerId] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const requestId = useRef<string | null>(null);
  const uppers = useMemo(() => objects.filter((object) => object.articulatorArch === "upper" && object.visible && geometryExists(object)), [objects]);
  const lowers = useMemo(() => objects.filter((object) => object.articulatorArch === "lower" && object.visible && geometryExists(object)), [objects]);
  const upper = uppers.find((object) => object.id === upperId) ?? uppers[0];
  const lower = lowers.find((object) => object.id === lowerId) ?? lowers[0];
  const current = result?.kind === "dynamic_contact" && result.targets[0]?.objectId === upper?.id && result.targets[1]?.objectId === lower?.id && analysisResultIsCurrent(result);

  useEffect(() => {
    if (!playing) return;
    let position = t;
    const timer = window.setInterval(() => {
      position = Math.min(1, position + 0.025);
      useArticulatorStore.setState({ t: position, playing: position < 1 });
      if (position >= 1) window.clearInterval(timer);
    }, 40);
    return () => window.clearInterval(timer);
  }, [playing, t]);
  useEffect(() => () => { if (requestId.current) cancelAnalysis(requestId.current); }, []);
  if (!canUse || !uppers.length || !lowers.length) return null;

  const updateConfig = (key: (typeof numberInputs)[number]["key"], value: number) => {
    try {
      const next = validateArticulatorConfig({ ...config, [key]: value } as ArticulatorConfig);
      configure(next);
      if (useWorkspaceStore.getState().mode === "free-lab") useSaveStore.getState().markDirty();
      setError("");
    } catch { setError("Invalid articulator setting."); }
  };
  const analyze = async () => {
    if (!upper || !lower) return;
    if (requestId.current) { cancelAnalysis(requestId.current); requestId.current = null; setBusy(false); return; }
    const id = crypto.randomUUID(); requestId.current = id; setBusy(true); setProgress(0); setError("");
    const signature = JSON.stringify({ config, motion });
    try {
      const targets = [snapshotMesh(upper.id, undefined, true), snapshotMesh(lower.id, undefined, true)] as const;
      const samples = sampleMotion(motion, config);
      const response: AnalysisResult = await runAnalysis({ type: "ANALYSIS_REQUEST", requestId: id, kind: "dynamic_contact", targets: [targets[0], targets[1]], samples, thresholdMm: config.contactThresholdMm, configSignature: signature }, setProgress);
      if (requestId.current !== id) return;
      if (response.kind !== "dynamic_contact") throw new Error("The analysis worker returned an unexpected result.");
      record(response);
    } catch (reason) {
      if (requestId.current === id && !(reason instanceof DOMException && reason.name === "AbortError")) setError("Dynamic analysis failed.");
    } finally { if (requestId.current === id) { requestId.current = null; setBusy(false); } }
  };
  const reset = () => { setPlaying(false); setPosition(0); };
  return <section className="shrink-0 border-b border-border bg-card/80 px-3 py-2" aria-label={tx("Virtual Articulator")}>
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <div className="flex items-center gap-2 text-[10px] font-semibold"><Activity className="size-3.5 text-primary" />{tx("Virtual Articulator")} <span className="font-normal text-muted-foreground">{tx("Educational kinematic preview · upper fixed · lower moving")}</span></div>
      <label className="sr-only" htmlFor="articulator-motion">{tx("Motion type")}</label><select id="articulator-motion" aria-label={tx("Motion type")} value={motion} onChange={(event) => { setMotion(event.currentTarget.value as ArticulatorMotion); }} className="h-7 rounded border border-border bg-background px-2 text-[10px]">{Object.entries(motionLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select>
      <Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-[10px]" onClick={() => setPlaying(!playing)}>{playing ? <Pause className="size-3" /> : <Play className="size-3" />}{playing ? "Pause" : "Play"}</Button>
      <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[10px]" onClick={reset}><RotateCcw className="size-3" />{tx("Reset reference")}</Button>
      <input aria-label={tx("Motion position")} type="range" min="0" max="1" step="0.01" value={t} onChange={(event) => setPosition(Number(event.currentTarget.value))} className="w-28 accent-primary" /><span className="w-8 text-right text-[9px] tabular-nums text-muted-foreground">{Math.round(t * 100)}%</span>
      {canAnalyze && <Button variant="default" size="sm" className="h-7 gap-1 px-2 text-[10px]" onClick={() => void analyze()}>{busy ? <X className="size-3" /> : <Activity className="size-3" />}{busy ? "Cancel analysis" : "Analyze motion"}</Button>}
      {busy && <span role="status" className="text-[9px] text-muted-foreground">{Math.round(progress * 100)}% · sampled BVH contact</span>}
    </div>
    <div className="mt-2 grid gap-2 xl:grid-cols-[minmax(250px,1fr)_minmax(380px,2fr)_minmax(240px,1fr)]">
      <div className="space-y-1.5"><SelectPair label={tx("Fixed upper")} value={upper?.id ?? ""} candidates={uppers} onChange={setUpperId} /><SelectPair label={tx("Moving lower")} value={lower?.id ?? ""} candidates={lowers} onChange={setLowerId} /><p className="text-[9px] leading-4 text-muted-foreground">{tx("Axes: X left/right, Y anterior/posterior, Z superior/inferior · mm · right-handed. Hinge axis X through the configured pivot.")}</p></div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 lg:grid-cols-3">{numberInputs.map((field) => <label key={field.key} className="flex items-center justify-between gap-2 text-[9px]"><span className="text-muted-foreground">{field.label} · exercise configuration</span><span className="flex items-center gap-1"><input aria-label={field.label} type="number" min={field.min} max={field.max} step={field.step} value={config[field.key]} onChange={(event) => updateConfig(field.key, Number(event.currentTarget.value))} className="h-6 w-16 rounded border border-border bg-background px-1.5 text-right text-[9px] tabular-nums" /><span>{field.unit}</span></span></label>)}</div>
      <div className="min-h-12 rounded border border-border/70 bg-background/70 p-2 text-[9px] leading-4" aria-live="polite"><strong className="block">{current ? "Dynamic sampled contact" : result ? "Previous analysis is stale" : "No motion analysis yet"}</strong>{current && result?.kind === "dynamic_contact" ? <><span>{result.samples.length} poses · threshold {result.thresholdMm.toFixed(2)} mm · {result.motion.replaceAll("_", " ")}</span><span className="block">Current sample: {result.samples[Math.round(t * (result.samples.length - 1))]?.state ?? "not sampled"} · {result.samples[Math.round(t * (result.samples.length - 1))]?.distanceMm.toFixed(3) ?? "—"} mm</span><span className="block">First sampled contact: {result.firstContactT === null ? "none in sampled path" : `pose ${result.firstContactSample! + 1} at ${Math.round(result.firstContactT * 100)}%`} · discrete sampling, not continuous collision timing.</span><span className="block">{tx("This analysis is educational and uses supplied synthetic geometry where present.")}</span></> : <span className="text-muted-foreground">{tx("Run analysis to compare opposing surfaces over multiple deterministic poses. Contact and surface intersection are reported separately.")}</span>}</div>
    </div>
    {error && <p role="alert" className="mt-1 text-[9px] text-destructive">{tx(error)}</p>}
    {busy && <div className="mt-1 h-1 overflow-hidden rounded bg-muted"><div className="h-full bg-primary transition-[width]" style={{ width: `${progress * 100}%` }} /></div>}
  </section>;
}

function geometryExists(object: CadObjectMetadata) { return Boolean(object.syntheticMesh || object.importSource || object.geometryStats); }
