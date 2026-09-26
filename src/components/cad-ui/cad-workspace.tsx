"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { ArrowLeft, Box, CircleHelp, Crosshair, Eye, EyeOff, Focus, Grid2X2, Layers3, Move3D, Rotate3D, Scaling, Scan, SlidersHorizontal, SquareMousePointer, X } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CadViewport } from "./cad-viewport";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import type { CadObjectId, CadObjectMetadata, CameraMode, TransformMode, ViewPreset } from "@/cad/types";
import type { ViewportApi } from "@/cad/camera/types";
import { fromDisplayTransform, toDisplayTransform } from "@/cad/transform/units";

const viewPresets: { id: ViewPreset; label: string }[] = [
  { id: "front", label: "Front" }, { id: "back", label: "Back" }, { id: "left", label: "Left" }, { id: "right", label: "Right" }, { id: "top", label: "Top" }, { id: "bottom", label: "Bottom" },
];
const toolModes: { id: TransformMode; label: string; icon: typeof SquareMousePointer }[] = [
  { id: "select", label: "Select", icon: SquareMousePointer }, { id: "translate", label: "Move", icon: Move3D }, { id: "rotate", label: "Rotate", icon: Rotate3D }, { id: "scale", label: "Scale", icon: Scaling },
];

function SelectField({ label, value, options, onChange }: { label: string; value: string | number; options: (string | number)[]; onChange: (value: string) => void }) {
  return <label className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground"><span>{label}</span><select className="h-7 min-w-24 rounded-md border border-input bg-background px-2 text-[11px] text-foreground" value={String(value)} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={String(option)} value={option}>{option === "free" ? "Free" : `${option}${label === "Rotation step" ? "°" : " mm"}`}</option>)}</select></label>;
}

function ScenePanel({ objects, selectedId, onSelect }: { objects: CadObjectMetadata[]; selectedId: CadObjectId | null; onSelect: (id: CadObjectId) => void }) {
  const setVisible = useWorkspaceStore((state) => state.setVisible);
  const isolate = useWorkspaceStore((state) => state.isolate);
  return <aside className="flex min-h-0 w-[218px] shrink-0 flex-col border-r border-border bg-card/70">
    <div className="flex h-10 items-center justify-between border-b border-border px-3"><span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Scene</span><span className="text-[10px] text-muted-foreground">{objects.length} objects</span></div>
    <div className="min-h-0 flex-1 overflow-y-auto p-2">
      <div className="mb-1 flex items-center gap-2 px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"><Layers3 className="size-3.5" /> Demo geometry</div>
      {objects.map((object) => <div key={object.id} className={`group flex min-h-9 items-center gap-1 rounded-md px-1 ${selectedId === object.id ? "bg-primary/10 text-foreground ring-1 ring-primary/25" : "text-muted-foreground hover:bg-muted/70"}`}>
        <button type="button" onClick={() => onSelect(object.id)} className="flex min-w-0 flex-1 items-center gap-2 px-1.5 py-1 text-left" aria-pressed={selectedId === object.id}>
          <Box className={`size-3.5 shrink-0 ${selectedId === object.id ? "text-primary" : ""}`} />
          <span className="min-w-0"><span className="block truncate text-[11px]">{object.name}</span><span className="block text-[9px] opacity-60">{object.role.replaceAll("_", " ")}</span></span>
        </button>
        <button type="button" className="grid size-7 shrink-0 place-items-center rounded hover:bg-background" title={object.visible ? "Hide object" : "Show object"} aria-label={`${object.visible ? "Hide" : "Show"} ${object.name}`} onClick={() => setVisible(object.id, !object.visible)}>{object.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}</button>
        <button type="button" className="grid size-7 shrink-0 place-items-center rounded opacity-0 hover:bg-background group-hover:opacity-100 focus:opacity-100" title="Isolate object" aria-label={`Isolate ${object.name}`} onClick={() => isolate(object.id)}><Focus className="size-3.5" /></button>
      </div>)}
      <p className="mt-4 rounded-md border border-dashed border-border p-2.5 text-[10px] leading-4 text-muted-foreground">Temporary geometry for CAD workspace development.</p>
    </div>
  </aside>;
}

function TransformVector({ label, values, field, step = 0.1, disabled, onChange }: { label: string; values: [number, number, number]; field: "position" | "rotation" | "scale"; step?: number; disabled?: boolean; onChange: (axis: number, value: number) => void }) {
  return <div className="space-y-1.5"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p><div className="grid grid-cols-3 gap-1.5">{values.map((value, axis) => <label key={axis} className="min-w-0"><span className="mb-1 block text-[9px] text-muted-foreground">{["X", "Y", "Z"][axis]}</span><Input aria-label={`${label} ${["X", "Y", "Z"][axis]}`} type="number" step={step} value={Number.isFinite(value) ? Number(value.toFixed(field === "rotation" ? 2 : 3)) : 0} disabled={disabled} onChange={(event) => { const next = Number(event.currentTarget.value); if (Number.isFinite(next)) onChange(axis, next); }} className="h-7 px-1.5 text-[10px] tabular-nums" /></label>)}</div></div>;
}

function PropertiesPanel({ selected }: { selected: CadObjectMetadata | undefined }) {
  const setTransform = useWorkspaceStore((state) => state.setTransform);
  const setOpacity = useWorkspaceStore((state) => state.setOpacity);
  const setVisible = useWorkspaceStore((state) => state.setVisible);
  const translationStep = useWorkspaceStore((state) => state.translationStep);
  const setTranslationStep = useWorkspaceStore((state) => state.setTranslationStep);
  const rotationStep = useWorkspaceStore((state) => state.rotationStep);
  const setRotationStep = useWorkspaceStore((state) => state.setRotationStep);
  const display = useMemo(() => selected ? toDisplayTransform(selected.transform) : null, [selected]);
  if (!selected || !display) return <aside className="flex min-h-0 w-[282px] shrink-0 flex-col border-l border-border bg-card/70"><div className="flex h-10 items-center border-b border-border px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Properties</div><div className="grid flex-1 place-items-center p-6 text-center"><div><div className="mx-auto mb-3 grid size-10 place-items-center rounded-lg bg-muted text-muted-foreground"><SlidersHorizontal className="size-5" /></div><p className="text-xs font-medium">No object selected</p><p className="mt-1 text-[10px] leading-4 text-muted-foreground">Select an object in the viewport or Scene panel to inspect its properties.</p></div></div></aside>;
  const update = (field: "position" | "rotation" | "scale", axis: number, value: number) => setTransform(selected.id, fromDisplayTransform(selected.transform, field, axis, value));
  return <aside className="flex min-h-0 w-[282px] shrink-0 flex-col border-l border-border bg-card/70">
    <div className="flex h-10 items-center border-b border-border px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Properties</div>
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
      <section><p className="text-xs font-semibold">{selected.name}</p><p className="mt-1 font-mono text-[10px] text-muted-foreground">{selected.role.replaceAll("_", " ")}</p><div className="mt-3 flex items-center justify-between"><span className="text-[10px] text-muted-foreground">Visibility</span><Button variant="outline" size="sm" className="h-7 gap-1.5 px-2 text-[10px]" onClick={() => setVisible(selected.id, !selected.visible)}>{selected.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}{selected.visible ? "Visible" : "Hidden"}</Button></div><div className="mt-3"><label className="flex items-center justify-between text-[10px] text-muted-foreground" htmlFor="object-opacity">Transparency <span className="tabular-nums">{Math.round((1 - selected.opacity) * 100)}%</span></label><input id="object-opacity" aria-label="Transparency" type="range" min="0.15" max="1" step="0.05" value={selected.opacity} onChange={(event) => setOpacity(selected.id, Number(event.currentTarget.value))} className="mt-2 w-full accent-primary" /></div></section>
      <div className="h-px bg-border" />
      <TransformVector label="Position · mm" field="position" values={display.position} disabled={!selected.editable} onChange={(axis, value) => update("position", axis, value)} />
      <TransformVector label="Rotation · degrees" field="rotation" step={0.5} values={display.rotation} disabled={!selected.editable} onChange={(axis, value) => update("rotation", axis, value)} />
      <TransformVector label="Scale" field="scale" step={0.01} values={display.scale} disabled={!selected.editable} onChange={(axis, value) => update("scale", axis, value)} />
      <div className="h-px bg-border" />
      <div className="space-y-2"><SelectField label="Translation step" value={translationStep} options={["free", 0.1, 0.5, 1]} onChange={(value) => setTranslationStep(value === "free" ? "free" : Number(value) as 0.1 | 0.5 | 1)} /><SelectField label="Rotation step" value={rotationStep} options={["free", 0.5, 1, 5]} onChange={(value) => setRotationStep(value === "free" ? "free" : Number(value) as 0.5 | 1 | 5)} /></div>
      {!selected.editable && <p className="rounded-md bg-muted p-2 text-[10px] leading-4 text-muted-foreground">Reference objects can be inspected and shown transparently, but cannot be transformed.</p>}
    </div>
  </aside>;
}

export function CadWorkspace({ caseId }: { caseId: string }) {
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const apiRef = useRef<ViewportApi | null>(null);
  const objects = useWorkspaceStore((state) => state.objects);
  const selectedObjectId = useWorkspaceStore((state) => state.selectedObjectId);
  const select = useWorkspaceStore((state) => state.select);
  const transformMode = useWorkspaceStore((state) => state.transformMode);
  const setTransformMode = useWorkspaceStore((state) => state.setTransformMode);
  const cameraMode = useWorkspaceStore((state) => state.cameraMode);
  const setCameraMode = useWorkspaceStore((state) => state.setCameraMode);
  const showAll = useWorkspaceStore((state) => state.showAll);
  const resetDemo = useWorkspaceStore((state) => state.resetDemo);
  const [desktop, setDesktop] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  useEffect(() => { const query = window.matchMedia("(min-width: 1280px)"); const update = () => setDesktop(query.matches); update(); query.addEventListener("change", update); return () => query.removeEventListener("change", update); }, []);
  useEffect(() => () => resetDemo(), [resetDemo]);
  const selected = objects.find((object) => object.id === selectedObjectId);
  const hiddenCount = objects.filter((object) => !object.visible).length;
  const setView = useCallback((preset: ViewPreset) => apiRef.current?.setView(preset), []);
  return <div className="flex h-dvh min-h-[560px] flex-col overflow-hidden bg-background text-foreground">
    <header className="flex h-11 shrink-0 items-center justify-between border-b border-border bg-card px-3">
      <div className="flex min-w-0 items-center gap-3"><Link href="/dashboard" aria-label="Back to dashboard" className="grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted"><ArrowLeft className="size-4" /></Link><span className="flex items-center gap-2 text-[12px] font-semibold"><Scan className="size-4 text-primary" /> Prostheia CAD</span><span className="hidden truncate text-[10px] text-muted-foreground sm:block">Untitled case · {caseId}</span><span className="rounded border border-primary/20 bg-primary/5 px-1.5 py-0.5 text-[9px] text-primary">Shared workspace</span></div>
      <div className="flex items-center gap-1"><div className="hidden items-center gap-0.5 md:flex"><Button variant="ghost" size="sm" className="h-7 px-2 text-[10px]" disabled>File</Button><Button variant="ghost" size="sm" className="h-7 px-2 text-[10px]" disabled>Edit</Button><Button variant="ghost" size="sm" className="h-7 px-2 text-[10px]" disabled>View</Button></div><Button variant="ghost" size="icon" className="size-7" aria-label="Workspace help" onClick={() => setHelpOpen((open) => !open)}><CircleHelp className="size-4" /></Button><Link href="/dashboard" className="rounded-md px-2 py-1 text-[10px] text-muted-foreground hover:bg-muted">Exit</Link></div>
    </header>
    {!desktop ? <main className="grid flex-1 place-items-center p-8"><div className="max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm"><div className="mx-auto mb-4 grid size-11 place-items-center rounded-lg bg-muted text-muted-foreground"><Scan className="size-5" /></div><h1 className="text-sm font-semibold">CAD workspace requires a desktop display</h1><p className="mt-2 text-xs leading-5 text-muted-foreground">Open this workspace at 1280 pixels wide or more to use the viewport and its mouse controls.</p><Link href="/dashboard" className="mt-4 inline-block rounded-md bg-primary px-3 py-2 text-xs text-primary-foreground">Return to dashboard</Link></div></main> : <>
      <main className="flex min-h-0 flex-1">
        <ScenePanel objects={objects} selectedId={selectedObjectId} onSelect={select} />
        <section className="relative flex min-w-0 flex-1 flex-col bg-muted/40" aria-label="3D viewport">
          <div className="flex h-9 shrink-0 items-center justify-between border-b border-border/80 px-2.5">
            <div className="flex items-center gap-1">{viewPresets.map((preset) => <Button key={preset.id} variant="ghost" size="sm" className="h-6 px-2 text-[9px]" onClick={() => setView(preset.id)}>{preset.label}</Button>)}<Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-[9px]" onClick={() => setView("reset")}><Crosshair className="size-3" />Reset</Button><Button variant="ghost" size="sm" className="h-6 gap-1 px-2 text-[9px]" disabled={!selected} onClick={() => apiRef.current?.frameSelected(selectedObjectId)}><Focus className="size-3" />Frame</Button></div>
            <div className="flex items-center rounded-md border border-border bg-background p-0.5">{(["perspective", "orthographic"] as CameraMode[]).map((camera) => <Button key={camera} variant={cameraMode === camera ? "secondary" : "ghost"} size="sm" className="h-6 px-2 text-[9px] capitalize" aria-pressed={cameraMode === camera} onClick={() => setCameraMode(camera)}>{camera}</Button>)}</div>
          </div>
          <div className="relative min-h-0 flex-1"><CadViewport apiRef={apiRef} dark={dark} />{hiddenCount > 0 && <Button variant="secondary" size="sm" className="absolute bottom-3 left-1/2 z-10 h-7 -translate-x-1/2 gap-1.5 text-[10px] shadow" onClick={showAll}><Eye className="size-3.5" />Show all objects <span className="opacity-60">({hiddenCount})</span></Button>}{helpOpen && <div className="absolute right-3 top-3 z-10 w-64 rounded-lg border border-border bg-card p-3 shadow-lg"><div className="flex items-center justify-between"><p className="flex items-center gap-1.5 text-xs font-semibold"><CircleHelp className="size-3.5 text-primary" /> Viewport navigation</p><button aria-label="Close help" onClick={() => setHelpOpen(false)}><X className="size-3.5" /></button></div><p className="mt-2 text-[10px] leading-5 text-muted-foreground">Left drag orbits · right drag pans · scroll wheel zooms. Select an object, then choose Move, Rotate, or Scale to edit it.</p></div>}<div className="pointer-events-none absolute bottom-3 left-3 rounded border border-border/60 bg-background/75 px-2 py-1 text-[9px] text-muted-foreground">Z up · mm · {cameraMode}</div></div>
        </section>
        <PropertiesPanel selected={selected} />
      </main>
      <footer className="flex h-9 shrink-0 items-center justify-between border-t border-border bg-card px-2.5"><div className="flex items-center gap-1">{toolModes.map(({ id, label, icon: Icon }) => <Button key={id} variant={transformMode === id ? "secondary" : "ghost"} size="sm" className="h-7 gap-1.5 px-2.5 text-[10px]" aria-pressed={transformMode === id} onClick={() => setTransformMode(id)}><Icon className="size-3.5" />{label}</Button>)}</div><div className="flex items-center gap-2 text-[9px] text-muted-foreground"><span className="hidden sm:inline">Demo geometry · Changes are temporary</span><span className="flex items-center gap-1"><Grid2X2 className="size-3" />{selected?.name ?? "No selection"}</span></div></footer>
      </>}
  </div>;
}
