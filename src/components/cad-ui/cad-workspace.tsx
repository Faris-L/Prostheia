"use client";
import { useInterfaceCopy } from "@/lib/i18n";
import { useI18n } from "@/lib/i18n";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { ArrowLeft, Box, BriefcaseBusiness, CircleHelp, Crosshair, Eye, EyeOff, Focus, Grid2X2, Layers3, Move3D, Rotate3D, Scaling, Scan, SlidersHorizontal, SquareMousePointer, X, Undo2, Redo2, Save, Trash2, Scissors, Sparkles, CircleDashed, Wrench, FlipHorizontal2, Copy, Download, Brush, Minus, Waves, Hand, Circle, RotateCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CadViewport } from "./cad-viewport";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import type { CadObjectId, CadObjectMetadata, CameraMode, TransformMode, ViewPreset } from "@/cad/types";
import type { ViewportApi } from "@/cad/camera/types";
import { fromDisplayTransform, toDisplayTransform } from "@/cad/transform/units";
import { useHistoryStore } from "@/cad/engine/history-store";
import { useSaveStore } from "@/cad/engine/save-store";
import { useCadUiStore } from "@/cad/engine/ui-store";
import { markPreviewDirty, runIsolateCommand, runTransformCommand, runTransparencyCommand, runVisibilityCommand } from "@/cad/engine/cad-actions";
import { cloneTransform, DuplicateObjectCommand, MeshOperationCommand } from "@/cad/engine/commands";
import { discardRecovery, persistRecovery, readRecovery, RecoveryValidationError, restoreCloudRecovery, restoreRecovery } from "@/cad/recovery/recovery";
import type { RecoverySnapshot } from "@/cad/recovery/database";
import { isEditableTarget, resolveCadShortcut } from "@/cad/engine/shortcuts";
import { toast } from "sonner";
import { ModelImportPanel } from "./model-import-panel";
import { cadObjectId } from "@/cad/types";
import { useMeshSelectionStore } from "@/cad/mesh/selection-store";
import { duplicateImportedObject, runMeshOperation } from "@/cad/mesh/run-operation";
import { geometryRegistry } from "@/cad/scene/geometry-registry";
import { exportCadObject } from "@/cad/import/export-model";
import { createCheckpoint, listCaseRevisions, loadCaseRevision, saveCloudCase, type RevisionInfo } from "@/cad/persistence/cloud-cases";
import { useCasePersistenceStore } from "@/cad/persistence/store";
import type { SculptTool } from "@/cad/sculpt/brush";
import { SCULPT_CONFIG } from "@/cad/sculpt/brush";
import { AnalysisControls, type MeasurePoint, type SectionSettings } from "./analysis-controls";
import { ArticulatorPanel } from "./articulator-panel";
import type { AnalysisResult } from "@/cad/analysis/types";
import type { PracticeLesson } from "@/practice/types";
import { canRunShortcut, canUsePracticeTool, getActivePracticeStep } from "@/practice/permissions";
import { usePracticeSessionStore } from "@/practice/session-store";
import { LanguageToggle } from "@/components/language-toggle";
import { PracticeGuidancePanel } from "@/practice/practice-guidance-panel";
import { RightPanelModeControl, ToolCategoryBar, WorkflowProgress, defaultRightPanelMode, localeText, toolGroupForPracticeStep, toolGroupLabels, type ToolGroup } from "./workspace-ux";
import { persistPracticeAttempt } from "@/practice/persist-attempt";
import type { PracticeToolId } from "@/practice/types";
import { readFreeLabSession } from "@/free-lab/session";
import type { FreeLabWorkspaceConfig } from "@/free-lab/types";
import { initializeFreeLabWorkspace } from "@/free-lab/initialize-workspace";
import { cleanupPracticeLesson, initializePracticeLesson } from "@/practice/initialize-assets";
import { useCurveStore } from "@/cad/curves/store";
import { placeCrownFromLibrary } from "@/cad/crown/tooth-library";
import { CROWN_CASE_OBJECTS } from "@/cad/crown/case";
import { DentureWorkflowPanel } from "./denture-workflow-panel";
import { restoreDentureSetup } from "@/cad/denture/setup-store";
import { restoreRestorativeSetup } from "@/cad/restorative/types";
import { RestorativeWorkflowPanel } from "./restorative-workflow-panel";
import { PartialDentureWorkflowPanel } from "./partial-denture-workflow-panel";
import { restorePartialDentureSetup } from "@/cad/partial-denture/types";
import { BiteSplintWorkflowPanel } from "./bite-splint-workflow-panel";
import { DigitalModelWorkflowPanel } from "./digital-model-workflow-panel";
import { restoreBiteSplintSetup } from "@/cad/splint/types";
import { restoreDigitalModelSetup } from "@/cad/digital-model/types";
import { restoreArticulatorSetup } from "@/cad/articulator/persistence";
import { useArticulatorStore } from "@/cad/articulator/store";
import { restoreImplantSetup } from "@/cad/implant/types";
import { ImplantWorkflowPanel } from "./implant-workflow-panel";
import { ImplantR7WorkflowPanel } from "./implant-r7-workflow-panel";
import { ScreenshotStudio } from "./screenshot-studio";
import type { PracticeAttemptResume } from "./workspace-loader";

const viewPresets: { id: ViewPreset; label: string }[] = [
  { id: "front", label: "Front" }, { id: "back", label: "Back" }, { id: "left", label: "Left" }, { id: "right", label: "Right" }, { id: "top", label: "Top" }, { id: "bottom", label: "Bottom" },
];
const toolModes: { id: TransformMode; label: string; icon: typeof SquareMousePointer }[] = [
  { id: "select", label: "Select", icon: SquareMousePointer }, { id: "translate", label: "Move", icon: Move3D }, { id: "rotate", label: "Rotate", icon: Rotate3D }, { id: "scale", label: "Scale", icon: Scaling },
];
const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
let cadWorkspaceGeneration = 0;
let activeCadWorkspaceGeneration = 0;

function SelectField({ label, value, options, onChange }: { label: string; value: string | number; options: (string | number)[]; onChange: (value: string) => void }) {
  return <label className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground"><span>{label}</span><select className="h-7 min-w-24 rounded-md border border-input bg-background px-2 text-[11px] text-foreground" value={String(value)} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={String(option)} value={option}>{option === "free" ? "Free" : `${option}${label === "Rotation step" ? "°" : " mm"}`}</option>)}</select></label>;
}

function ScenePanel({ objects, selectedId, onSelect, onSelectMesh, allowSceneTools, collapsed, onToggle, highlightedId, locale }: { objects: CadObjectMetadata[]; selectedId: CadObjectId | null; onSelect: (id: CadObjectId) => void; onSelectMesh: (id: CadObjectId, key: string) => void; allowSceneTools: boolean; collapsed: boolean; onToggle: () => void; highlightedId: string | null; locale: "en" | "sr" }) {
  const tx = useInterfaceCopy();
  if (collapsed) return <aside className="flex w-10 shrink-0 flex-col items-center border-r border-border bg-card/70 py-2"><button type="button" aria-label={localeText(locale, "Expand Scene", "Proširi scenu")} aria-expanded={false} onClick={onToggle} title={localeText(locale, "Expand Scene", "Proširi scenu")} className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-muted"><Layers3 className="size-4" /></button></aside>;
  return <aside className="cad-scene-panel flex min-h-0 w-[220px] shrink-0 flex-col border-r border-border bg-card/70">
    <div className="flex h-10 items-center justify-between border-b border-border px-3"><span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{tx("Scene")}</span><div className="flex items-center gap-2"><span className="text-[10px] text-muted-foreground">{objects.length} {tx("objects")}</span><button type="button" aria-label={localeText(locale, "Collapse Scene", "Skupi scenu")} aria-expanded={true} onClick={onToggle} className="rounded px-1 text-[9px] text-muted-foreground hover:bg-muted">{localeText(locale, "Hide", "Sakrij")}</button></div></div>
    <div className="min-h-0 flex-1 overflow-y-auto p-2">
      <div className="mb-1 flex items-center gap-2 px-2 py-1.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground"><Layers3 className="size-3.5" /> {localeText(locale, "Case objects", "Objekti slučaja")}</div>
      {objects.map((object) => {
        const isReference = object.role === "reference" || object.role.includes("reference");
        const isPreparation = object.role === "prepared_tooth" || object.role.includes("preparation");
        const isAntagonist = object.role === "antagonist" || object.role.includes("antagonist");
        const isRestoration = object.role.includes("restoration") || object.role.includes("crown");
        const isHelper = object.syntheticMesh || object.role.includes("helper") || object.role.includes("synthetic");
        const category = isReference ? "reference" : isPreparation ? "preparation" : isRestoration ? "restoration" : isAntagonist ? "antagonist" : isHelper ? "helper" : object.editable ? "work" : "source";
        const categoryLabel = localeText(locale, category === "reference" ? "Reference" : category === "preparation" ? "Preparation" : category === "restoration" ? "Restoration" : category === "antagonist" ? "Antagonist" : category === "helper" ? "Helper mesh" : category === "work" ? "Work" : "Source", category === "reference" ? "Referenca" : category === "preparation" ? "Preparacija" : category === "restoration" ? "Restauracija" : category === "antagonist" ? "Antagonista" : category === "helper" ? "Pomoćna mreža" : category === "work" ? "Rad" : "Izvor");
        const kind = isReference ? localeText(locale, "Example · locked", "Primer · zaključan") : isPreparation ? localeText(locale, "Preparation", "Preparacija") : isAntagonist ? localeText(locale, "Opposing tooth", "Zub antagonista") : object.editable ? localeText(locale, "Your work · editable", "Vaš rad · može da se uređuje") : localeText(locale, "Source · inspect only", "Izvor · samo pregled");
        return <div key={object.id} data-category={category} data-selected={selectedId === object.id} className={`cad-scene-object group flex min-h-10 items-center gap-1 rounded-md px-1 transition-colors ${selectedId === object.id ? "bg-primary/10 text-foreground ring-1 ring-primary/25" : "text-muted-foreground hover:bg-muted/70"} ${highlightedId === object.id ? "ring-2 ring-amber-400 bg-amber-500/10" : ""}`}>
        <button type="button" onClick={() => onSelect(object.id)} className="flex min-w-0 flex-1 items-center gap-2 px-1.5 py-1 text-left" aria-pressed={selectedId === object.id}>
          <Box className={`size-3.5 shrink-0 ${selectedId === object.id ? "text-primary" : isReference ? "text-sky-500" : ""}`} />
          <span className="min-w-0 flex-1"><span className="flex min-w-0 items-center gap-1"><span className="block min-w-0 flex-1 truncate text-[11px]">{object.name}</span><span className="cad-scene-category" data-category={category}>{categoryLabel}</span></span><span className="block truncate text-[9px] opacity-75">{kind}</span></span>
        </button>
        <button type="button" className="grid size-7 shrink-0 place-items-center rounded hover:bg-background" aria-label={`${tx(object.visible ? "Hide" : "Show")} ${object.name}`} disabled={!allowSceneTools} title={!allowSceneTools ? tx("Available in a later step.") : object.visible ? tx("Hide object") : tx("Show object")} onClick={() => runVisibilityCommand([{ id: object.id, visible: !object.visible }])}>{object.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}</button>
        <button type="button" className="grid size-7 shrink-0 place-items-center rounded opacity-0 hover:bg-background group-hover:opacity-100 focus:opacity-100" aria-label={`${tx("Isolate")} ${object.name}`} disabled={!allowSceneTools} title={!allowSceneTools ? tx("Available in a later step.") : tx("Isolate object")} onClick={() => runIsolateCommand(object.id)}><Focus className="size-3.5" /></button>
      </div>;
      })}
      {objects.filter((object) => (object.importSource || object.syntheticMesh) && selectedId === object.id).flatMap((object) => geometryRegistry.getMeshes(object.id).map(({ key }, index) => <button key={`${object.id}-${key}`} type="button" onClick={() => onSelectMesh(object.id, key)} className={`cad-mesh-child ml-5 flex h-7 w-[calc(100%-1.25rem)] items-center gap-2 rounded px-2 text-left text-[9px] ${useMeshSelectionStore.getState().meshKey === key ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"}`}><Box className="size-3" /><span className="truncate">{tx("Mesh child")} {index + 1}</span></button>))}
      {objects.every((object) => !object.importSource && !object.syntheticMesh) && <p className="mt-4 rounded-md border border-dashed border-border p-2.5 text-[10px] leading-4 text-muted-foreground">{tx("Synthetic dental training geometry is available in this workspace. Import your own scan in Free Lab.")}</p>}
    </div>
  </aside>;
}

function TransformVector({ id, transform, label, values, field, step = 0.1, disabled, onChange }: { id: CadObjectId; transform: CadObjectMetadata["transform"]; label: string; values: [number, number, number]; field: "position" | "rotation" | "scale"; step?: number; disabled?: boolean; onChange: (axis: number, value: number) => void }) {
  const before = useRef<(typeof transform) | null>(null);
  return <div className="space-y-1.5"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p><div className="grid grid-cols-3 gap-1.5">{values.map((value, axis) => <label key={axis} className="min-w-0"><span className="mb-1 block text-[9px] text-muted-foreground">{["X", "Y", "Z"][axis]}</span><Input aria-label={`${label} ${["X", "Y", "Z"][axis]}`} type="number" step={step} value={Number.isFinite(value) ? Number(value.toFixed(field === "rotation" ? 2 : 3)) : 0} disabled={disabled} onFocus={() => { before.current = cloneTransform(transform); }} onBlur={() => { const initial = before.current; before.current = null; if (initial) runTransformCommand(id, initial, useWorkspaceStore.getState().objects.find((object) => object.id === id)?.transform ?? initial); }} onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); if (event.key === "Escape" && before.current) { useWorkspaceStore.getState().applyTransform(id, before.current); event.currentTarget.blur(); } }} onChange={(event) => { const next = Number(event.currentTarget.value); if (Number.isFinite(next)) onChange(axis, next); }} className="h-7 px-1.5 text-[10px] tabular-nums" /></label>)}</div></div>;
}

function PropertiesPanel({ selected, trimAxis, setTrimAxis, trimOffset, setTrimOffset, mirrorAxis, setMirrorAxis, canMove, canRotate, canScale, canSceneTools, activeToolGroup, transformMode, locale }: { selected: CadObjectMetadata | undefined; trimAxis: "x" | "y" | "z"; setTrimAxis: (axis: "x" | "y" | "z") => void; trimOffset: number; setTrimOffset: (offset: number) => void; mirrorAxis: "x" | "y" | "z"; setMirrorAxis: (axis: "x" | "y" | "z") => void; canMove: boolean; canRotate: boolean; canScale: boolean; canSceneTools: boolean; activeToolGroup: ToolGroup; transformMode: TransformMode; locale: "en" | "sr" }) {
  const tx = useInterfaceCopy();
  const selectedMeshKey = useMeshSelectionStore((state) => state.meshKey);
  const previewTransform = useWorkspaceStore((state) => state.previewTransform);
  const previewOpacity = useWorkspaceStore((state) => state.previewOpacity);
  const translationStep = useWorkspaceStore((state) => state.translationStep);
  const setTranslationStep = useWorkspaceStore((state) => state.setTranslationStep);
  const rotationStep = useWorkspaceStore((state) => state.rotationStep);
  const setRotationStep = useWorkspaceStore((state) => state.setRotationStep);
  const transparencyBefore = useRef<number | null>(null);
  const display = useMemo(() => selected ? toDisplayTransform(selected.transform) : null, [selected]);
  if (!selected || !display) return <div className="cad-properties-empty grid min-h-0 flex-1 place-items-center p-6 text-center"><div><div className="mx-auto mb-3 grid size-10 place-items-center rounded-lg bg-muted text-muted-foreground"><SlidersHorizontal className="size-5" /></div><p className="text-xs font-medium">{tx("No object selected")}</p><p className="mt-1 text-[10px] leading-4 text-muted-foreground">{tx("Select an object in the viewport or Scene panel to inspect its properties.")}</p></div></div>;
  const update = (field: "position" | "rotation" | "scale", axis: number, value: number) => { previewTransform(selected.id, fromDisplayTransform(useWorkspaceStore.getState().objects.find((object) => object.id === selected.id)!.transform, field, axis, value)); markPreviewDirty(); };
  const commitTransparency = () => { if (transparencyBefore.current === null) return; const before = transparencyBefore.current; transparencyBefore.current = null; const after = useWorkspaceStore.getState().objects.find((object) => object.id === selected.id)?.opacity ?? before; runTransparencyCommand(selected.id, before, after); };
  return <div className="cad-properties-panel min-h-0 flex-1 overflow-y-auto p-3" data-tool-group={activeToolGroup}>
      <div className="mb-3 rounded-md border border-border bg-background/50 p-2.5"><p className="text-xs font-semibold">{selected.name}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{selected.editable ? tx("Editable object") : tx("Reference · inspect only")}</p></div>
      <section><div className="mt-3 flex items-center justify-between"><span className="text-[10px] text-muted-foreground">{tx("Visibility")}</span><Button variant="outline" size="sm" className="h-7 gap-1.5 px-2 text-[10px]" disabled={!canSceneTools} onClick={() => runVisibilityCommand([{ id: selected.id, visible: !selected.visible }])}>{selected.visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}{selected.visible ? localeText(locale, "Visible", "Vidljiv") : localeText(locale, "Hidden", "Skriven")}</Button></div><div className="mt-3"><label className="flex items-center justify-between text-[10px] text-muted-foreground" htmlFor="object-opacity">{tx("Transparency")} <span className="tabular-nums">{Math.round((1 - selected.opacity) * 100)}%</span></label><input id="object-opacity" aria-label={tx("Transparency")} type="range" disabled={!canSceneTools} min="0.15" max="1" step="0.05" value={selected.opacity} onFocus={() => { transparencyBefore.current = selected.opacity; }} onPointerDown={() => { transparencyBefore.current = selected.opacity; }} onPointerUp={commitTransparency} onBlur={commitTransparency} onChange={(event) => { previewOpacity(selected.id, Number(event.currentTarget.value)); markPreviewDirty(); }} className="mt-2 w-full accent-primary" /></div></section>
      {selected.importSource && <details className="rounded-md border border-border bg-muted/30 p-2.5"><summary className="cursor-pointer text-[10px] font-semibold">{tx("Advanced geometry details")}</summary><div className="mt-2 space-y-1.5"><MetadataLine label={tx("Source")} value={selected.importSource.sourceFileName} /><MetadataLine label={tx("Format")} value={selected.importSource.format.toUpperCase()} /><MetadataLine label={tx("File size")} value={`${(selected.importSource.byteSize / 1024 / 1024).toFixed(2)} MB`} /><MetadataLine label={tx("Editing child")} value={selectedMeshKey ?? "Select a child mesh"} /><MetadataLine label={tx("Geometry")} value={`${(selected.geometryStats?.vertexCount ?? selected.importSource.vertexCount).toLocaleString()} vertices · ${(selected.geometryStats?.triangleCount ?? selected.importSource.triangleCount).toLocaleString()} triangles`} /><MetadataLine label={tx("Bounds (mm)")} value={(selected.geometryStats?.boundsMm ?? selected.importSource.boundingDimensionsMm).map((dimension) => dimension.toFixed(2)).join(" ×")} /><MetadataLine label={tx("Geometry revision")} value={`${selected.geometryStats?.revision ?? 0}${selected.geometryStats?.dirty ? " · dirty" : " · original"}`} /><MetadataLine label={tx("Source bounds")} value={`min ${selected.importSource.sourceBounds.min.map((value) => value.toFixed(2)).join(", ")} · max ${selected.importSource.sourceBounds.max.map((value) => value.toFixed(2)).join(", ")}`} /><MetadataLine label={tx("Source origin")} value={selected.importSource.sourceOrigin.map((value) => value.toFixed(2)).join(", ")} /><MetadataLine label={tx("Units")} value={`${selected.importSource.sourceUnit} · ×${selected.importSource.unitScale} to mm`} /><MetadataLine label={tx("Coordinate status")} value="Source orientation and origin preserved" /><MetadataLine label={tx("Raw asset")} value={selected.importSource.rawAsset ? "Saved in private storage" : "Not saved to cloud"} /><MetadataLine label={tx("Recovery")} value={selected.cloudGeometryVersionId ? "Internal geometry snapshot is saved in this case revision." : `Mesh is session-only; ${selected.importSource.rawAsset ? "re-import from your original file after reload." : "keep the source file to re-import."}`} />{selected.importSource.warnings.map((warning) => <p key={warning} className="text-[9px] leading-4 text-amber-700 dark:text-amber-300">{warning.replaceAll("_", " ")}</p>)}</div></details>}
      {selected.importSource && activeToolGroup === "mesh" && <section className="space-y-2 rounded-md border border-border p-2.5"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{tx("Mesh operation parameters")}</p><SelectField label={tx("Trim axis")} value={trimAxis.toUpperCase()} options={["X", "Y", "Z"]} onChange={(value) => setTrimAxis(value.toLowerCase() as "x" | "y" | "z")} /><label className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground">{tx("Trim offset · mm")}<Input aria-label={tx("Trim offset in millimeters")} type="number" step="0.1" value={trimOffset} onChange={(event) => setTrimOffset(Number(event.target.value))} className="h-7 w-24 px-2 text-[10px]" /></label><SelectField label={tx("Mirror axis")} value={mirrorAxis.toUpperCase()} options={["X", "Y", "Z"]} onChange={(value) => setMirrorAxis(value.toLowerCase() as "x" | "y" | "z")} /><p className="text-[9px] leading-4 text-muted-foreground">{tx("Trim keeps the side at or below the selected local-axis offset. Mirror reflects geometry through the local origin.")}</p></section>}
      {activeToolGroup === "edit" && <><div className="h-px bg-border" /><TransformVector id={selected.id} transform={selected.transform} label={tx("Position · mm")} field="position" values={display.position} disabled={!selected.editable || !canMove} onChange={(axis, value) => update("position", axis, value)} /><TransformVector id={selected.id} transform={selected.transform} label={tx("Rotation · degrees")} field="rotation" step={0.5} values={display.rotation} disabled={!selected.editable || !canRotate} onChange={(axis, value) => update("rotation", axis, value)} /><TransformVector id={selected.id} transform={selected.transform} label={tx("Scale")} field="scale" step={0.01} values={display.scale} disabled={!selected.editable || !canScale} onChange={(axis, value) => update("scale", axis, value)} /></>}
      {activeToolGroup === "edit" && transformMode === "translate" && <div className="border-t border-border pt-3"><SelectField label={tx("Translation step")} value={translationStep} options={["free", 0.1, 0.5, 1]} onChange={(value) => setTranslationStep(value === "free" ? "free" : Number(value) as 0.1 | 0.5 | 1)} /></div>}
      {activeToolGroup === "edit" && transformMode === "rotate" && <div className="border-t border-border pt-3"><SelectField label={tx("Rotation step")} value={rotationStep} options={["free", 0.5, 1, 5]} onChange={(value) => setRotationStep(value === "free" ? "free" : Number(value) as 0.5 | 1 | 5)} /></div>}
      {activeToolGroup !== "edit" && <p className="rounded-md border border-border bg-muted/30 p-2.5 text-[10px] leading-4 text-muted-foreground">{localeText(locale, "Choose Edit / Transform to adjust object position, rotation, or scale.", "Izaberite Uređivanje / Transformacija da podesite položaj, rotaciju ili razmeru objekta.")}</p>}
      {!selected.editable && <p className="rounded-md bg-muted p-2 text-[10px] leading-4 text-muted-foreground">{tx("Reference objects can be inspected and shown transparently, but cannot be transformed.")}</p>}
  </div>;
}

function MetadataLine({ label, value }: { label: string; value: string }) { return <p className="flex justify-between gap-2 text-[9px] leading-4"><span className="shrink-0 text-muted-foreground">{label}</span><span className="min-w-0 break-words text-right tabular-nums">{value}</span></p>; }
function operationLabel(kind: "delete" | "trim" | "smooth" | "fill-hole" | "cleanup" | "mirror") { return ({ delete: "Delete Selected", trim: "Trim Mesh", smooth: "Smooth Mesh", "fill-hole": "Fill Hole", cleanup: "Cleanup Mesh", mirror: "Mirror Mesh" } as const)[kind]; }

export function CadWorkspace({ caseId, practiceLessonId, freeLabSessionId, practiceLesson: suppliedPracticeLesson, practiceAttemptResume, newPracticeAttemptId, preview = false }: { caseId: string; practiceLessonId?: string; freeLabSessionId?: string; practiceLesson?: PracticeLesson; practiceAttemptResume?: PracticeAttemptResume; newPracticeAttemptId?: string; preview?: boolean }) {
  const tx = useInterfaceCopy();
  const txRef = useRef(tx);
  useEffect(() => { txRef.current = tx; }, [tx]);
  const { locale } = useI18n();
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === "dark";
  const rootRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<ViewportApi | null>(null);
  const meshAbort = useRef<AbortController | null>(null);
  const previousSculptMode = useRef(false);
  const guideHighlightTimeout = useRef<number | null>(null);
  const objects = useWorkspaceStore((state) => state.objects);
  const selectedObjectId = useWorkspaceStore((state) => state.selectedObjectId);
  const select = useWorkspaceStore((state) => state.select);
  const transformMode = useWorkspaceStore((state) => state.transformMode);
  const setTransformModeRaw = useWorkspaceStore((state) => state.setTransformMode);
  const cameraMode = useWorkspaceStore((state) => state.cameraMode);
  const setCameraMode = useWorkspaceStore((state) => state.setCameraMode);
  const transformOperation = useWorkspaceStore((state) => state.transformOperation);
  const resetDemo = useWorkspaceStore((state) => state.resetDemo);
  const undo = useHistoryStore((state) => state.undo);
  const redo = useHistoryStore((state) => state.redo);
  const canUndo = useHistoryStore((state) => state.undoStack.length > 0);
  const canRedo = useHistoryStore((state) => state.redoStack.length > 0);
  const clearHistory = useHistoryStore((state) => state.clear);
  const status = useSaveStore((state) => state.status);
  const saveRevision = useSaveStore((state) => state.revision);
  const lastRecoveryAt = useSaveStore((state) => state.lastRecoveryAt);
  const markClean = useSaveStore((state) => state.markClean);
  const markSaving = useSaveStore((state) => state.markSaving);
  const markCloudSaved = useSaveStore((state) => state.markCloudSaved);
  const cloudTitle = useCasePersistenceStore((state) => state.title);
  const cloudCaseId = useCasePersistenceStore((state) => state.caseId);
  const cloudLoadedRevisionId = useCasePersistenceStore((state) => state.loadedRevisionId);
  const cloudRevisionNumber = useCasePersistenceStore((state) => state.revisionNumber);
  const applyCloudSave = useCasePersistenceStore((state) => state.applySave);
  const setNewCloudSession = useCasePersistenceStore((state) => state.setNewSession);
  const resetCloudSession = useCasePersistenceStore((state) => state.reset);
  const setLoadedCloudCase = useCasePersistenceStore((state) => state.setLoadedCase);
  const setLoadedRevision = useCasePersistenceStore((state) => state.setLoadedRevision);
  const helpOpen = useCadUiStore((state) => state.helpOpen);
  const setHelpOpen = useCadUiStore((state) => state.setHelpOpen);
  const sculptTool = useCadUiStore((state) => state.sculptTool);
  const setSculptTool = useCadUiStore((state) => state.setSculptTool);
  const brushRadiusMm = useCadUiStore((state) => state.brushRadiusMm);
  const setBrushRadiusMm = useCadUiStore((state) => state.setBrushRadiusMm);
  const brushStrength = useCadUiStore((state) => state.brushStrength);
  const setBrushStrength = useCadUiStore((state) => state.setBrushStrength);
  const meshMode = useMeshSelectionStore((state) => state.mode);
  const setMeshMode = useMeshSelectionStore((state) => state.setMode);
  const faceIndices = useMeshSelectionStore((state) => state.faceIndices);
  const meshKey = useMeshSelectionStore((state) => state.meshKey);
  const clearFaceSelection = useMeshSelectionStore((state) => state.clearSelection);
  const operationState = useMeshSelectionStore((state) => state.operation);
  const operationError = useMeshSelectionStore((state) => state.error);
  const setOperationState = useMeshSelectionStore((state) => state.setProcessing);
  const setOperationError = useMeshSelectionStore((state) => state.setError);
  const [trimAxis, setTrimAxis] = useState<"x" | "y" | "z">("z");
  const [trimOffset, setTrimOffset] = useState(0);
  const [mirrorAxis, setMirrorAxis] = useState<"x" | "y" | "z">("x");
  const [desktop, setDesktop] = useState(true);
  const [recovery, setRecovery] = useState<RecoverySnapshot | null>(null);
  const [recoveryChecked, setRecoveryChecked] = useState(true);
  const [freeLabSession, setFreeLabSession] = useState<FreeLabWorkspaceConfig | null>(null);
  const [freeLabReady, setFreeLabReady] = useState(!freeLabSessionId && !isUuid(caseId));
  const [caseBriefOpen, setCaseBriefOpen] = useState(false);
  const [toolGroupPreference, setToolGroupPreference] = useState<{ stepId: string | null; group: ToolGroup } | null>(null);
  const [sceneCollapsed, setSceneCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<"guide" | "properties">(defaultRightPanelMode(Boolean(practiceLessonId)));
  const [highlightedObjectId, setHighlightedObjectId] = useState<string | null>(null);
  const [highlightedToolGroup, setHighlightedToolGroup] = useState<ToolGroup | null>(null);
  const [highlightedSubtool, setHighlightedSubtool] = useState<string | null>(null);
  const [persistenceStage, setPersistenceStage] = useState<string | null>(null);
  const [revisionPanelOpen, setRevisionPanelOpen] = useState(false);
  const [revisions, setRevisions] = useState<RevisionInfo[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(false);
  const [autoOpenImport, setAutoOpenImport] = useState(false);
  const [importDialogKey, setImportDialogKey] = useState(0);
  const initialObjects = useRef<CadObjectMetadata[]>([]);
  const [measureActive, setMeasureActive] = useState(false);
  const [marginActive, setMarginActive] = useState(false);
  const [measurePoints, setMeasurePoints] = useState<MeasurePoint[]>([]);
  const [sectionSettings, setSectionSettings] = useState<SectionSettings>({ enabled: false, axis: "z", offset: 0 });
  const [scalarAnalysis, setScalarAnalysis] = useState<Extract<AnalysisResult, { values: Float32Array }> | null>(null);
  const setScalar = useCallback((result: Extract<AnalysisResult, { values: Float32Array }> | null) => setScalarAnalysis(result), []);
  const hasImportedModels = objects.some((object) => object.importSource);
  const practiceLesson = practiceLessonId ? suppliedPracticeLesson : undefined;
  const practiceSession = usePracticeSessionStore((state) => state.session);
  const practiceStep = practiceLesson?.steps.find((step) => step.id === practiceSession?.currentStepId) ?? null;
  const currentPracticeStepId = practiceStep?.id ?? null;
  const activeToolGroup = toolGroupPreference?.stepId === currentPracticeStepId
    ? toolGroupPreference.group
    : practiceStep ? toolGroupForPracticeStep(practiceStep) : "navigation";
  const selectToolGroup = useCallback((group: ToolGroup) => {
    setToolGroupPreference({ stepId: currentPracticeStepId, group });
  }, [currentPracticeStepId]);
  useEffect(() => () => { if (guideHighlightTimeout.current !== null) window.clearTimeout(guideHighlightTimeout.current); }, []);
  const showObjectInScene = useCallback((targetId: string) => {
    const mapping = practiceLesson?.caseSetup.objectMappings.find((entry) => entry.runtimeObjectId === targetId || entry.semanticRole === targetId);
    const match = objects.find((object) => object.id === targetId || object.id === mapping?.runtimeObjectId || object.role === mapping?.semanticRole);
    if (!match) return;
    setSceneCollapsed(false);
    setHighlightedObjectId(match.id);
    if (guideHighlightTimeout.current !== null) window.clearTimeout(guideHighlightTimeout.current);
    guideHighlightTimeout.current = window.setTimeout(() => setHighlightedObjectId(null), 2200);
  }, [objects, practiceLesson]);
  const showRequiredTools = useCallback(() => {
    const group = toolGroupForPracticeStep(practiceStep);
    setToolGroupPreference({ stepId: currentPracticeStepId, group });
    setHighlightedToolGroup(group);
    const suggested = practiceStep?.validators.some((validator) => validator.type === "curve_closed" || validator.type === "margin_complete") ? "Place points"
      : practiceStep?.allowedTools.includes("move") ? "Move"
        : practiceStep?.allowedTools.includes("rotate") ? "Rotate"
          : practiceStep?.allowedTools.includes("sculpt") ? "Sculpt"
            : practiceStep?.allowedTools.includes("mesh-edit") ? "Face / Region"
              : practiceStep?.allowedTools.includes("analysis") ? "Run analysis" : "Select";
    setHighlightedSubtool(suggested);
    if (guideHighlightTimeout.current !== null) window.clearTimeout(guideHighlightTimeout.current);
    guideHighlightTimeout.current = window.setTimeout(() => { setHighlightedToolGroup(null); setHighlightedSubtool(null); }, 2200);
  }, [currentPracticeStepId, practiceStep]);
  const allowed = useCallback((tool: PracticeToolId) => !practiceLessonId || (!!practiceStep && canUsePracticeTool(practiceStep, tool)), [practiceLessonId, practiceStep]);
  const targetAllowed = useCallback((objectId: CadObjectId | null) => !practiceLessonId || (!!practiceStep && practiceStep.targetObjectIds.includes(objectId ?? "")), [practiceLessonId, practiceStep]);
  const setTransformMode = useCallback((mode: TransformMode) => {
    const tool = mode === "translate" ? "move" : mode;
    if (!allowed(tool)) { toast.message(tx("This tool is available in a later step.")); return; }
    if (mode !== "select" && !targetAllowed(useWorkspaceStore.getState().selectedObjectId)) { toast.message(tx("Select a target object for this step first.")); return; }
    setTransformModeRaw(mode);
  }, [allowed, targetAllowed, setTransformModeRaw, tx]);
  const saveNow = useCallback(async (titleOverride?: string) => {
    if (freeLabSession?.preview) { toast.message(tx("Admin preview sessions cannot be saved to My Cases.")); return false; }
    if (practiceLessonId) { toast.message(tx("Practice attempts stay separate from My Cases.")); return false; }
    const persistence = useCasePersistenceStore.getState();
    if (useSaveStore.getState().status === "clean" && persistence.caseId) { toast.message(tx("This case is already saved.")); return true; }
    const title = titleOverride?.trim() || persistence.title || freeLabSession?.title || "Untitled case";
    markSaving(); setPersistenceStage("Preparing geometry");
    try {
      const result = await saveCloudCase({ caseId: persistence.caseId, expectedHeadId: persistence.headRevisionId, title, sourceType: persistence.sourceType, sourceSnapshot: persistence.sourceSnapshot, sourceRevisionId: persistence.loadedRevisionId, bindings: persistence.bindings, onStage: setPersistenceStage });
      applyCloudSave({ caseId: result.case_id, title, revisionId: result.revision_id, revisionNumber: result.revision_number, bindings: result.bindings });
      markCloudSaved(result.revision_id);
      await discardRecovery(persistence.caseId ?? caseId).catch(() => undefined);
      setRecovery(null);
      toast.success(`${tx("Cloud revision")} ${result.revision_number} ${tx("saved.")}`);
      if (caseId !== result.case_id) router.replace(`/workspace/${result.case_id}`);
      return true;
    } catch {
      const message = tx("Cloud save failed.");
      useSaveStore.getState().markSaveFailed(message);
      toast.error(message);
      return false;
    } finally { setPersistenceStage(null); }
  }, [applyCloudSave, caseId, freeLabSession?.preview, freeLabSession?.title, markCloudSaved, markSaving, practiceLessonId, router, tx]);
  const applyMeshOperation = useCallback(async (kind: "delete" | "trim" | "smooth" | "fill-hole" | "cleanup" | "mirror") => {
    if (!allowed("mesh-edit")) { toast.message(tx("Mesh editing is available in a later step.")); return; }
    if (useMeshSelectionStore.getState().operation === "processing") return;
    const current = useWorkspaceStore.getState(); const selected = current.objects.find((entry) => entry.id === current.selectedObjectId);
    if (!selected || (!selected.importSource && !selected.syntheticMesh)) { toast.message(tx("Select a mesh object to edit its geometry.")); return; }
    const meshEntry = geometryRegistry.getMeshes(selected.id).find((entry) => entry.key === meshKey) ?? geometryRegistry.getMeshes(selected.id)[0];
    if (!meshEntry) { toast.error(tx("This operation could not start because the object has no editable mesh child.")); return; }
    if (kind === "delete" && !faceIndices.length) { toast.message(tx("Select one or more faces before deleting.")); return; }
    setOperationState(true);
    const controller = new AbortController(); meshAbort.current = controller;
    try {
      const parameters: Record<string, string | number> | undefined = kind === "trim" ? { nx: trimAxis === "x" ? 1 : 0, ny: trimAxis === "y" ? 1 : 0, nz: trimAxis === "z" ? 1 : 0, offset: trimOffset } : kind === "mirror" ? { axis: mirrorAxis } : undefined;
      const { beforeRevision, afterRevision } = await runMeshOperation({ objectId: selected.id, meshKey: meshEntry.key, kind, selectedFaces: kind === "delete" ? faceIndices : undefined, parameters, signal: controller.signal });
      const refreshStats = (id: CadObjectId) => useWorkspaceStore.getState().setGeometryStats(id, geometryRegistry.stats(id));
      refreshStats(selected.id);
      useHistoryStore.getState().recordApplied(new MeshOperationCommand(selected.id, beforeRevision, afterRevision, operationLabel(kind), refreshStats));
      if (kind === "delete" || kind === "trim" || kind === "cleanup") clearFaceSelection();
      setOperationState(false);
      toast.success(`${tx(operationLabel(kind))} ${tx("completed.")}`);
    } catch {
      const message = tx("Operation failed. Try again.");
      setOperationError(message);
      toast.error(message);
    } finally { meshAbort.current = null; }
  }, [allowed, clearFaceSelection, faceIndices, meshKey, mirrorAxis, setOperationError, setOperationState, trimAxis, trimOffset, tx]);
  const duplicateSelectedObject = useCallback(() => {
    const source = useWorkspaceStore.getState().objects.find((entry) => entry.id === useWorkspaceStore.getState().selectedObjectId);
    if (!source?.importSource) { toast.message(tx("Select an imported mesh object before duplicating.")); return; }
    try {
      const id = cadObjectId(`cad-${crypto.randomUUID()}`);
      const name = `${source.name} ${tx("copy")}`;
      const object = duplicateImportedObject(source.id);
      const metadata: CadObjectMetadata = { ...source, id, name, geometryStats: undefined, transform: { position: [...source.transform.position], rotation: [...source.transform.rotation], scale: [...source.transform.scale] } };
      useHistoryStore.getState().execute(new DuplicateObjectCommand(metadata, object));
      useWorkspaceStore.getState().select(id);
      clearFaceSelection();
    } catch { toast.error(tx("Duplicate object failed.")); }
  }, [clearFaceSelection, tx]);
  const captureImportedBaseline = useCallback((imported: { id: string; role: CadObjectMetadata["role"]; name: string }[]) => {
    if (!freeLabSessionId) return;
    const baseline = new Map(initialObjects.current.map((object) => [object.id, object]));
    const current = new Map(useWorkspaceStore.getState().objects.map((object) => [object.id, object]));
    for (const item of imported) {
      const object = current.get(cadObjectId(item.id));
      if (object && !baseline.has(object.id)) baseline.set(object.id, { ...object, transform: cloneTransform(object.transform) });
    }
    initialObjects.current = [...baseline.values()];
  }, [freeLabSessionId]);
  const restartFreeLab = useCallback(async () => {
    if (!freeLabSessionId || !freeLabSession) return;
    if (!window.confirm(tx("Start over and restore this Free Lab session to its original state?"))) return;
    clearHistory();
    useMeshSelectionStore.getState().clearSelection();
    setSculptTool(null);
    setMeasureActive(false);
    setMeasurePoints([]);
    setSectionSettings({ enabled: false, axis: "z", offset: 0 });
    setScalarAnalysis(null);
    markClean();
    try {
      if (freeLabSession.origin === "scenario" || freeLabSession.origin === "random") {
        const ids = await initializeFreeLabWorkspace(freeLabSession);
        initialObjects.current = useWorkspaceStore.getState().objects.map((object) => ({ ...object, transform: cloneTransform(object.transform) }));
        if (ids[0]) window.requestAnimationFrame(() => apiRef.current?.frameSelected(ids[0]));
      } else if (freeLabSession.origin === "blank") {
        geometryRegistry.clear();
        useWorkspaceStore.getState().initializeWorkspace("free-lab");
        initialObjects.current = [];
      } else {
        const baseline = initialObjects.current;
        const baselineIds = new Set(baseline.map((object) => object.id));
        for (const object of useWorkspaceStore.getState().objects) {
          if (!baselineIds.has(object.id)) geometryRegistry.remove(object.id);
          else {
            const runtime = geometryRegistry.get(object.id);
            if (runtime) { try { geometryRegistry.setRevision(object.id, runtime.originalRevision); } catch { /* The object will be reported below if its original mesh was discarded. */ } }
          }
        }
        useWorkspaceStore.getState().initializeWorkspace("free-lab", baseline);
        const missing = baseline.filter((object) => object.importSource && !geometryRegistry.get(object.id));
        if (missing.length) { toast.error(tx("An imported source mesh was removed from this session. Select its original file again to restore it.")); setAutoOpenImport(true); setImportDialogKey((value) => value + 1); }
      }
      clearHistory();
      markClean();
      toast.success(tx("Free Lab session restarted."));
    } catch { toast.error(tx("The Free Lab session could not be restarted.")); }
  }, [clearHistory, freeLabSession, freeLabSessionId, markClean, setSculptTool, tx]);
  const [exportFormat, setExportFormat] = useState<"stl" | "obj" | "glb">("glb");
  const exportSelectedObject = useCallback(async () => {
    const source = useWorkspaceStore.getState().objects.find((entry) => entry.id === useWorkspaceStore.getState().selectedObjectId);
    if (!source || !geometryRegistry.getMeshes(source.id).length) { toast.message(tx("Select a mesh object before exporting.")); return; }
    try { await exportCadObject(source.id, source.name, exportFormat); toast.success(`${tx("Current geometry exported as")} ${exportFormat.toUpperCase()}.`); }
    catch { toast.error(tx("Export failed.")); }
  }, [exportFormat, tx]);
  const saveAs = useCallback(async () => {
    if (freeLabSession?.preview) { toast.message(tx("Admin preview sessions cannot be saved to My Cases.")); return; }
    const title = window.prompt(tx("Save a separate copy as"), `${tx("Copy of")} ${useCasePersistenceStore.getState().title}`);
    if (!title?.trim()) return;
    if (!useCasePersistenceStore.getState().caseId) { await saveNow(title); return; }
    const persistence = useCasePersistenceStore.getState();
    markSaving(); setPersistenceStage("Preparing geometry");
    try {
      const copy = await saveCloudCase({ caseId: null, expectedHeadId: null, title: title.trim(), sourceType: persistence.sourceType, sourceSnapshot: { ...persistence.sourceSnapshot, savedAsFromCase: persistence.caseId }, sourceRevisionId: persistence.loadedRevisionId, bindings: {}, onStage: setPersistenceStage });
      applyCloudSave({ caseId: copy.case_id, title: title.trim(), revisionId: copy.revision_id, revisionNumber: copy.revision_number, bindings: copy.bindings });
      markCloudSaved(copy.revision_id);
      await discardRecovery(persistence.caseId ?? caseId).catch(() => undefined);
      router.replace(`/workspace/${copy.case_id}`);
      toast.success(tx("Independent case copy created."));
    } catch { const message = tx("Save As failed."); useSaveStore.getState().markSaveFailed(message); toast.error(message); }
    finally { setPersistenceStage(null); }
  }, [applyCloudSave, caseId, freeLabSession?.preview, markCloudSaved, markSaving, router, saveNow, tx]);
  const makeCheckpoint = useCallback(async () => {
    if (useSaveStore.getState().status !== "clean" || !useCasePersistenceStore.getState().caseId) if (!(await saveNow())) return;
    const persistence = useCasePersistenceStore.getState();
    if (!persistence.caseId || !persistence.headRevisionId) { toast.message(tx("Save a cloud revision before creating a checkpoint.")); return; }
    const name = window.prompt(tx("Checkpoint name"), tx("Before occlusion adjustment"));
    if (!name?.trim()) return;
    try { await createCheckpoint(persistence.caseId, persistence.headRevisionId, name); toast.success(tx("Checkpoint created.")); }
    catch { toast.error(tx("Checkpoint could not be created.")); }
  }, [saveNow, tx]);
  const refreshRevisions = useCallback(async () => {
    const id = useCasePersistenceStore.getState().caseId;
    if (!id) return;
    setRevisionsLoading(true);
    try { setRevisions(await listCaseRevisions(id)); }
    catch { toast.error(tx("Revision history could not be loaded.")); }
    finally { setRevisionsLoading(false); }
  }, [tx]);
  const openHistoricalRevision = useCallback(async (revisionId: string) => {
    const id = useCasePersistenceStore.getState().caseId;
    if (!id) return;
    if (useSaveStore.getState().status !== "clean" && !(await saveNow())) return;
    try {
      const loaded = await loadCaseRevision(id, revisionId);
      geometryRegistry.clear();
      for (const entry of loaded.objects) geometryRegistry.register({ id: entry.metadata.id, role: entry.metadata.role, name: entry.metadata.name, object: entry.runtime, ownsResources: true });
      useWorkspaceStore.getState().initializeWorkspace("free-lab", loaded.objects.map((entry) => entry.metadata));
      useCurveStore.getState().replace(loaded.workspaceState.curves && typeof loaded.workspaceState.curves === "object" ? loaded.workspaceState.curves as { curves: never[]; activeCurveId: string | null } : { curves: [], activeCurveId: null });
      restoreDentureSetup(loaded.workspaceState.dentureSetup);
      restoreRestorativeSetup(loaded.workspaceState.restorativeSetup);
      restorePartialDentureSetup(loaded.workspaceState.partialDentureSetup);
      restoreBiteSplintSetup(loaded.workspaceState.biteSplintSetup);
      restoreDigitalModelSetup(loaded.workspaceState.digitalModelSetup);
      restoreArticulatorSetup(loaded.workspaceState.articulatorSetup);
      restoreImplantSetup(loaded.workspaceState.implantSetup);
      if (typeof loaded.workspaceState.selectedObjectId === "string" && loaded.objects.some((entry) => entry.metadata.id === loaded.workspaceState.selectedObjectId)) useWorkspaceStore.getState().select(cadObjectId(loaded.workspaceState.selectedObjectId));
      if (["select", "translate", "rotate", "scale"].includes(String(loaded.workspaceState.transformMode))) useWorkspaceStore.setState({ transformMode: loaded.workspaceState.transformMode as TransformMode });
      setLoadedCloudCase({ caseId: loaded.caseId, title: loaded.title, sourceType: loaded.sourceType === "scenario" || loaded.sourceType === "import" ? loaded.sourceType : "blank", sourceSnapshot: loaded.sourceSnapshot, headRevisionId: loaded.headRevisionId, loadedRevisionId: loaded.loadedRevisionId, revisionNumber: loaded.revisionNumber, bindings: Object.fromEntries(loaded.objects.map((entry) => [entry.metadata.id, entry.binding])) });
      setLoadedRevision(loaded.loadedRevisionId);
      clearHistory(); markCloudSaved(loaded.headRevisionId ?? loaded.loadedRevisionId);
      toast.success(`${tx("Revision")} ${loaded.revisionNumber} ${tx("opened. Saving will create a new revision.")}`);
    } catch { toast.error(tx("This revision could not be reconstructed.")); }
  }, [clearHistory, markCloudSaved, saveNow, setLoadedCloudCase, setLoadedRevision, tx]);
  useEffect(() => { const query = window.matchMedia("(min-width: 1280px)"); const update = () => setDesktop(query.matches); update(); query.addEventListener("change", update); return () => query.removeEventListener("change", update); }, []);
  useEffect(() => () => meshAbort.current?.abort(), []);
  useEffect(() => {
    const workspaceGeneration = ++cadWorkspaceGeneration;
    activeCadWorkspaceGeneration = workspaceGeneration;
    clearHistory(); markClean();
    useArticulatorStore.getState().reset();
    if (practiceLessonId) {
      const usesCaseScene = Boolean(practiceLesson && (practiceLesson.caseSetup.source !== "shared-demo-workspace" || practiceLesson.caseSetup.casePackageId || practiceLesson.caseSetup.packageManifest));
      if (usesCaseScene) {
        geometryRegistry.clear();
        useWorkspaceStore.getState().initializeWorkspace("practice", []);
      } else resetDemo();
      useWorkspaceStore.setState({ mode: "practice" });
      let active = true;
      let loadedAssets: string[] = [];
      if (practiceLesson) void initializePracticeLesson(practiceLesson).then((ids) => {
        if (active) {
          loadedAssets = ids;
          if (ids.length) window.requestAnimationFrame(() => apiRef.current?.frameAll());
        } else if (activeCadWorkspaceGeneration === 0) cleanupPracticeLesson(practiceLesson, ids);
      }).catch(() => { if (active) toast.error(txRef.current("Lesson model assets could not be loaded.")); });
      return () => { active = false; if (activeCadWorkspaceGeneration === workspaceGeneration) activeCadWorkspaceGeneration = 0; if (practiceLesson) cleanupPracticeLesson(practiceLesson, loadedAssets); resetDemo(); clearHistory(); };
    }
    if (!freeLabSessionId && isUuid(caseId)) {
      let active = true;
      geometryRegistry.clear();
      useMeshSelectionStore.getState().clearSelection();
      useCadUiStore.getState().setSculptTool(null);
      useWorkspaceStore.getState().initializeWorkspace("free-lab");
      loadCaseRevision(caseId).then(async (loaded) => {
        if (!active) return;
        for (const entry of loaded.objects) geometryRegistry.register({ id: entry.metadata.id, role: entry.metadata.role, name: entry.metadata.name, object: entry.runtime, ownsResources: true });
        const workspaceState = loaded.workspaceState;
        useWorkspaceStore.getState().initializeWorkspace("free-lab", loaded.objects.map((entry) => entry.metadata));
        useCurveStore.getState().replace(workspaceState.curves && typeof workspaceState.curves === "object" ? workspaceState.curves as { curves: never[]; activeCurveId: string | null } : { curves: [], activeCurveId: null });
        restoreDentureSetup(workspaceState.dentureSetup);
        restoreRestorativeSetup(workspaceState.restorativeSetup);
        restorePartialDentureSetup(workspaceState.partialDentureSetup);
        restoreBiteSplintSetup(workspaceState.biteSplintSetup);
        restoreDigitalModelSetup(workspaceState.digitalModelSetup);
        restoreArticulatorSetup(workspaceState.articulatorSetup);
        restoreImplantSetup(workspaceState.implantSetup);
        if (workspaceState.cameraMode === "perspective" || workspaceState.cameraMode === "orthographic") useWorkspaceStore.setState({ cameraMode: workspaceState.cameraMode });
        if (typeof workspaceState.selectedObjectId === "string" && loaded.objects.some((entry) => entry.metadata.id === workspaceState.selectedObjectId)) useWorkspaceStore.getState().select(cadObjectId(workspaceState.selectedObjectId));
        if (["select", "translate", "rotate", "scale"].includes(String(workspaceState.transformMode))) useWorkspaceStore.setState({ transformMode: workspaceState.transformMode as TransformMode });
        const bindings = Object.fromEntries(loaded.objects.map((entry) => [entry.metadata.id, entry.binding]));
        setLoadedCloudCase({ caseId: loaded.caseId, title: loaded.title, sourceType: loaded.sourceType === "scenario" || loaded.sourceType === "import" ? loaded.sourceType : "blank", sourceSnapshot: loaded.sourceSnapshot, headRevisionId: loaded.headRevisionId, loadedRevisionId: loaded.loadedRevisionId, revisionNumber: loaded.revisionNumber, bindings });
        initialObjects.current = loaded.objects.map((entry) => ({ ...entry.metadata, transform: cloneTransform(entry.metadata.transform) }));
        markCloudSaved(loaded.headRevisionId ?? loaded.loadedRevisionId);
        if (loaded.objects[0]) window.requestAnimationFrame(() => apiRef.current?.frameAll());
        const recoverySnapshot = await readRecovery(caseId).catch(() => null);
        if (active && recoverySnapshot && recoverySnapshot.lastCloudRevision === loaded.headRevisionId && recoverySnapshot.timestamp > Date.parse(loaded.createdAt)) setRecovery(recoverySnapshot);
      }).catch((error) => {
        console.error("Saved case could not be reconstructed.", error);
        if (active) toast.error(txRef.current("Saved case could not be reconstructed."));
      }).finally(() => { if (active) { setRecoveryChecked(true); setFreeLabReady(true); } });
      return () => { active = false; geometryRegistry.clear(); clearHistory(); };
    }
    if (freeLabSessionId) {
      let active = true;
      geometryRegistry.clear();
      useMeshSelectionStore.getState().clearSelection();
      useCadUiStore.getState().setSculptTool(null);
      useWorkspaceStore.getState().initializeWorkspace("free-lab");
      const config = readFreeLabSession(freeLabSessionId);
      if (!config) {
        Promise.resolve().then(() => { if (active) setFreeLabReady(true); });
        toast.error(txRef.current("This Free Lab session could not be loaded. Start a new case from Free Lab."));
        return () => { active = false; resetDemo(); clearHistory(); };
      }
      Promise.resolve().then(() => { if (active) { setFreeLabSession(config); if (config.preview) resetCloudSession(); else setNewCloudSession(config); } });
      initializeFreeLabWorkspace(config).then((ids) => {
        if (!active) return;
        initialObjects.current = useWorkspaceStore.getState().objects.map((object) => ({ ...object, transform: cloneTransform(object.transform) }));
        if (ids[0]) window.requestAnimationFrame(() => apiRef.current?.frameAll());
      }).catch(() => {
        if (active) toast.error(txRef.current("Supplied scenario files could not be loaded."));
      }).finally(() => {
        if (!active) return;
        setFreeLabReady(true);
      });
      return () => { active = false; geometryRegistry.clear(); resetDemo(); clearHistory(); };
    }
    resetDemo();
    useWorkspaceStore.setState({ mode: "developer" });
    let active = true;
    readRecovery(caseId).then((snapshot) => { if (active) setRecovery(snapshot); }).catch((error) => {
      if (!active) return;
      console.error("Local recovery could not be opened.", error);
      toast.error(error instanceof RecoveryValidationError ? txRef.current("Saved local recovery is incompatible and was ignored.") : txRef.current("Local recovery could not be opened. The workspace started normally."));
    }).finally(() => { if (active) setRecoveryChecked(true); });
    return () => { active = false; resetDemo(); clearHistory(); };
  }, [caseId, clearHistory, freeLabSessionId, markClean, markCloudSaved, resetDemo, practiceLessonId, practiceLesson, resetCloudSession, setLoadedCloudCase, setNewCloudSession]);
  useEffect(() => {
    if (!practiceLesson) return;
    if (practiceAttemptResume) {
      usePracticeSessionStore.getState().restore(practiceLesson, {
        id: practiceAttemptResume.id,
        startedAt: practiceAttemptResume.startedAt,
        completedAt: practiceAttemptResume.completedAt,
        status: practiceAttemptResume.status,
        completedStepIds: practiceAttemptResume.completedStepIds,
      }, practiceAttemptResume.stepResults);
    } else if (newPracticeAttemptId) {
      usePracticeSessionStore.getState().restart(practiceLesson, newPracticeAttemptId);
    } else {
      usePracticeSessionStore.getState().initialize(practiceLesson);
    }
    const session = usePracticeSessionStore.getState().session;
    if (session && !preview) void persistPracticeAttempt(practiceLesson, session);
  }, [practiceLesson, practiceAttemptResume, newPracticeAttemptId, preview]);
  useEffect(() => {
    if (practiceLessonId && practiceStep && sculptTool && !allowed("sculpt")) setSculptTool(null);
  }, [allowed, practiceLessonId, practiceStep, sculptTool, setSculptTool]);
  useEffect(() => {
    if (practiceLessonId || status !== "dirty") return;
    const persistence = useCasePersistenceStore.getState();
    const geometryMatchesCloud = !!persistence.caseId && objects.every((object) => {
      const binding = persistence.bindings[object.id];
      const runtime = geometryRegistry.get(object.id);
      return !!binding && !!runtime && binding.geometryRevision === runtime.geometryRevision;
    });
    if (hasImportedModels && !geometryMatchesCloud) return;
    const timer = window.setTimeout(() => { void persistRecovery(caseId).catch(() => toast.error("Local recovery could not be saved.")); }, 900);
    return () => window.clearTimeout(timer);
  }, [caseId, hasImportedModels, objects, saveRevision, status, practiceLessonId]);
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const root = rootRef.current;
      if (!root || !root.contains(document.activeElement) || isEditableTarget(event.target) || !recoveryChecked || recovery) return;
      const shortcut = resolveCadShortcut(event);
      if (!shortcut) return;
      const activePracticeStep = getActivePracticeStep();
      if (practiceLessonId && (!activePracticeStep || !canRunShortcut(activePracticeStep, shortcut))) { event.preventDefault(); toast.message("This tool is available in a later step."); return; }
      if (shortcut === "undo" || shortcut === "redo" || shortcut === "save") event.preventDefault();
      switch (shortcut) {
        case "undo": undo(); break;
        case "redo": redo(); break;
        case "save": void saveNow(); break;
        case "move": setToolGroupPreference({ stepId: currentPracticeStepId, group: "edit" }); useCadUiStore.getState().setSculptTool(null); setTransformMode("translate"); break;
        case "rotate": setToolGroupPreference({ stepId: currentPracticeStepId, group: "edit" }); useCadUiStore.getState().setSculptTool(null); setTransformMode("rotate"); break;
        case "scale": setToolGroupPreference({ stepId: currentPracticeStepId, group: "edit" }); useCadUiStore.getState().setSculptTool(null); setTransformMode("scale"); break;
        case "toggle-visibility": { const selected = useWorkspaceStore.getState().objects.find((object) => object.id === useWorkspaceStore.getState().selectedObjectId); if (selected) runVisibilityCommand([{ id: selected.id, visible: !selected.visible }]); break; }
        case "show-all": runIsolateCommand(null); break;
        case "reserved-delete": event.preventDefault(); if (useMeshSelectionStore.getState().mode === "face" && useMeshSelectionStore.getState().faceIndices.length) void applyMeshOperation("delete"); else toast.message(tx("Switch to Face / Region mode and select mesh faces before pressing Delete.")); break;
        case "cancel-operation": if (meshAbort.current) { meshAbort.current.abort(); event.preventDefault(); } if (transformOperation) { useWorkspaceStore.getState().cancelTransformOperation(); event.preventDefault(); } if (useCadUiStore.getState().sculptTool) { useCadUiStore.getState().setSculptTool(null); event.preventDefault(); } break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [applyMeshOperation, currentPracticeStepId, redo, recovery, recoveryChecked, saveNow, setTransformMode, transformOperation, undo, practiceLessonId, tx]);
  const selectedObject = objects.find((object) => object.id === selectedObjectId);
  const selected = useMemo(() => {
    const reference = practiceStep?.reference;
    if (!selectedObject || !reference || selectedObject.id !== reference.objectId) return selectedObject;
    return { ...selectedObject, transform: { ...selectedObject.transform, position: reference.position } };
  }, [practiceStep, selectedObject]);
  useEffect(() => {
    const active = sculptTool !== null;
    if (active && !previousSculptMode.current && (selected?.importSource || selected?.syntheticMesh)) {
      const stats = selected.geometryStats ?? geometryRegistry.stats(selected.id);
      if (stats.vertexCount > 0 && stats.vertexCount < SCULPT_CONFIG.lowDensityVertexThreshold) toast.warning(tx("This model has limited mesh density. Large sculpt changes may reduce surface quality."));
    }
    previousSculptMode.current = active;
  }, [sculptTool, selected, tx]);
  const hiddenCount = objects.filter((object) => !object.visible).length;
  const activeToolLabel = sculptTool ? `${tx("Sculpt")} · ${tx(sculptTool)}` : meshMode === "face" ? tx("Face / Region") : marginActive ? localeText(locale, "Margin curve", "Kriva margine") : measureActive ? tx("Measure") : sectionSettings.enabled ? tx("Section") : transformMode === "translate" ? tx("Move") : transformMode === "rotate" ? tx("Rotate") : transformMode === "scale" ? tx("Scale") : tx("Select");
  const setView = useCallback((preset: ViewPreset) => apiRef.current?.setView(preset), []);
  if ((freeLabSessionId || isUuid(caseId)) && !freeLabReady) return <div className="grid h-dvh place-items-center bg-background text-xs text-muted-foreground"><span role="status">{freeLabSessionId ? tx("Preparing Free Lab workspace…") : tx("Loading saved case and geometry…")}</span></div>;
  return <div ref={rootRef} tabIndex={0} data-cad-workspace data-cad-mode={practiceLessonId ? "practice" : "free-lab"} className="cad-workspace flex h-dvh min-h-[560px] flex-col overflow-hidden bg-background text-foreground outline-none" onPointerDownCapture={(event) => { if (!isEditableTarget(event.target) && !(event.target instanceof Element && event.target.closest("button, a"))) rootRef.current?.focus({ preventScroll: true }); }}>
    <header className="relative z-30 flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-3">
      <div className="flex min-w-0 items-center gap-2.5"><Link href={practiceLessonId ? "/practice" : freeLabSessionId ? "/free-lab" : "/dashboard"} aria-label={tx("Back to workspace selection")} className="grid size-8 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-muted"><ArrowLeft className="size-4" /></Link><span className="flex shrink-0 items-center gap-2 text-[12px] font-semibold"><Scan className="size-4 text-primary" /> Prostheia CAD</span><span className="hidden min-w-0 max-w-56 truncate text-[11px] text-muted-foreground xl:block">{cloudCaseId ? cloudTitle : freeLabSession?.title ?? "Untitled case"}</span><span className="shrink-0 rounded border border-border bg-background px-2 py-1 text-[9px] font-medium">{practiceLessonId ? tx("Practice") : cloudCaseId ? `${tx("Cloud case")} · r${cloudRevisionNumber}` : freeLabSessionId ? tx("Free Lab") : tx("Developer workspace")}</span><LanguageToggle /></div>
      <div className="flex shrink-0 items-center gap-1">
        {!practiceLessonId && <details className="relative"><summary className="flex h-8 cursor-pointer list-none items-center rounded-md border border-border px-2.5 text-[10px] font-medium hover:bg-muted">{tx("File")}</summary><div className="absolute right-0 top-full mt-1 w-60 rounded-lg border border-border bg-card p-2 shadow-xl"><div className="flex flex-col gap-1">{<ModelImportPanel key={`${freeLabSession?.origin === "import" ? "import" : "regular"}-${importDialogKey}`} initialOpen={Boolean(freeLabSessionId && (freeLabSession?.origin === "import" || autoOpenImport))} onImport={captureImportedBaseline} onFrame={(id) => window.requestAnimationFrame(() => apiRef.current?.frameSelected(cadObjectId(id)))} />}<label className="flex items-center justify-between gap-2 px-2 py-1 text-[10px] text-muted-foreground">{tx("Export format")}<select aria-label={tx("Export format")} className="h-7 rounded border border-border bg-background px-1.5 text-[10px] text-foreground" value={exportFormat} onChange={(event) => setExportFormat(event.currentTarget.value as "stl" | "obj" | "glb")}><option value="stl">STL</option><option value="obj">OBJ</option><option value="glb">GLB</option></select></label><Button variant="ghost" size="sm" className="justify-start gap-2 px-2 text-[10px]" disabled={!selected || !geometryRegistry.getMeshes(selected.id).length} onClick={() => void exportSelectedObject()}><Download className="size-3.5" />{tx("Export")}</Button>{freeLabSessionId && <Button variant="ghost" size="sm" className="justify-start gap-2 px-2 text-[10px]" onClick={() => void restartFreeLab()}><RotateCcw className="size-3.5" />{tx("Start Over")}</Button>}{cloudCaseId && <><Button variant="ghost" size="sm" className="justify-start px-2 text-[10px]" onClick={() => void makeCheckpoint()}>{tx("Checkpoint")}</Button><Button variant="ghost" size="sm" className="justify-start px-2 text-[10px]" onClick={() => { setRevisionPanelOpen(!revisionPanelOpen); if (!revisionPanelOpen) void refreshRevisions(); }}>{tx("History")}</Button></>}{!freeLabSession?.preview && <Button variant="ghost" size="sm" className="justify-start px-2 text-[10px]" disabled={Boolean(persistenceStage)} onClick={() => void saveAs()}>{tx("Save As")}</Button>}</div></div></details>}
        {freeLabSessionId && <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2.5 text-[10px]" onClick={() => setCaseBriefOpen(true)}><BriefcaseBusiness className="size-3.5" />{tx("Case Brief")}</Button>}
        <Button variant="ghost" size="icon-sm" title={tx("Undo (Ctrl+Z)")} aria-label={tx("Undo")} disabled={!canUndo} onClick={undo}><Undo2 className="size-4" /></Button><Button variant="ghost" size="icon-sm" title={tx("Redo (Ctrl+Shift+Z or Ctrl+Y)")} aria-label={tx("Redo")} disabled={!canRedo} onClick={redo}><Redo2 className="size-4" /></Button>
        <ScreenshotStudio apiRef={apiRef} caseId={cloudCaseId} revisionId={cloudLoadedRevisionId} caseTitle={cloudTitle} />
        {!freeLabSession?.preview && !practiceLessonId && <Button variant="default" size="sm" className="h-8 gap-1.5 px-2.5 text-[10px]" disabled={Boolean(persistenceStage) || (status === "clean" && Boolean(cloudCaseId))} onClick={() => void saveNow()} title={tx("Save to cloud (Ctrl+S)")}><Save className="size-3.5" />{tx("Save")}</Button>}
        <Button variant="ghost" size="icon" className="size-8" aria-label={tx("Workspace help")} onClick={() => setHelpOpen(!helpOpen)}><CircleHelp className="size-4" /></Button><Link href={practiceLessonId ? "/practice" : freeLabSessionId ? "/free-lab" : "/dashboard"} className="rounded-md px-2.5 py-1.5 text-[10px] text-muted-foreground hover:bg-muted">{tx("Exit")}</Link>
      </div>
    </header>
    {freeLabSession?.preview && <div role="status" className="border-b border-amber-600/30 bg-amber-500/10 px-3 py-2 text-center text-[10px] text-amber-900 dark:text-amber-100">{tx("Admin scenario preview · workspace changes and completion will not be saved to user records.")}</div>}
    {practiceLesson && practiceSession && <WorkflowProgress lesson={practiceLesson} currentStepId={practiceSession.currentStepId} completedStepIds={practiceSession.completedStepIds} locale={locale} />}
    {!desktop ? <main className="grid flex-1 place-items-center p-8"><div className="max-w-md rounded-xl border border-border bg-card p-6 text-center shadow-sm"><div className="mx-auto mb-4 grid size-11 place-items-center rounded-lg bg-muted text-muted-foreground"><Scan className="size-5" /></div><h1 className="text-sm font-semibold">{tx("CAD workspace requires a desktop display")}</h1><p className="mt-2 text-xs leading-5 text-muted-foreground">{tx("Open this workspace at 1280 pixels wide or more to use the viewport and its mouse controls.")}</p><Link href="/dashboard" className="mt-4 inline-block rounded-md bg-primary px-3 py-2 text-xs text-primary-foreground">{tx("Return to dashboard")}</Link></div></main> : <>
      <main className="flex min-h-0 flex-1">
        <ScenePanel objects={objects} selectedId={selectedObjectId} allowSceneTools={allowed("scene")} onSelect={(id) => { select(id); useMeshSelectionStore.getState().selectMesh(null); if (!targetAllowed(id)) { setTransformMode("select"); setSculptTool(null); } }} onSelectMesh={(id, key) => { setToolGroupPreference({ stepId: currentPracticeStepId, group: "mesh" }); select(id); useMeshSelectionStore.getState().selectMesh(key); setMeshMode("face"); }} collapsed={sceneCollapsed} onToggle={() => setSceneCollapsed(!sceneCollapsed)} highlightedId={highlightedObjectId} locale={locale} />
      <section className="cad-viewport-shell relative flex min-w-0 flex-1 flex-col bg-muted/40" aria-label={tx("3D viewport")}>
        <ArticulatorPanel objects={objects} canUse={allowed("articulator")} canAnalyze={allowed("analysis")} />
        {objects.some((object) => object.partialDentureClass) && <PartialDentureWorkflowPanel canEdit={allowed("scene")} />}
        {practiceLessonId !== "r6-virtual-articulator" && objects.some((object) => object.biteSplintPart) && <BiteSplintWorkflowPanel canEdit={allowed("scene")} />}
        {objects.some((object) => object.digitalModelPart) && <DigitalModelWorkflowPanel canEdit={allowed("scene")} />}
        {objects.some((object) => object.casePackageId?.startsWith("r7-implant-")) && <ImplantR7WorkflowPanel />}
        {!objects.some((object) => object.casePackageId?.startsWith("r7-implant-")) && objects.some((object) => object.implantPart) && <ImplantWorkflowPanel canEdit={allowed("scene") && allowed("move") && allowed("rotate")} />}
          <DentureWorkflowPanel canMove={allowed("move")} canScene={allowed("scene")} />
          {objects.some((object) => object.restorationType) && <RestorativeWorkflowPanel canEdit={allowed("scene")} />}
          {revisionPanelOpen && <div className="max-h-48 shrink-0 overflow-y-auto border-b border-border bg-card px-3 py-2"><div className="mb-1 flex items-center justify-between"><p className="text-[10px] font-semibold">{tx("Revision history")} · {cloudTitle} · {tx("head")} r{cloudRevisionNumber}</p><button type="button" className="text-[10px] text-primary" onClick={() => void refreshRevisions()}>{revisionsLoading ? tx("Loading…") : tx("Refresh")}</button></div>{revisions.length ? revisions.map((revision) => <div key={revision.id} className="flex items-center gap-2 border-t border-border/70 py-1.5 text-[9px]"><span className="w-12 font-semibold">r{revision.revision_number}{revision.current ? ` · ${tx("head")}` : ""}</span><span className="flex-1 text-muted-foreground">{new Date(revision.created_at).toLocaleString()}{revision.checkpointNames.length ? ` · ${revision.checkpointNames.join(", ")}` : ""}</span><Button variant="outline" size="sm" className="h-6 px-2 text-[9px]" disabled={revision.id === cloudLoadedRevisionId || Boolean(persistenceStage)} onClick={() => void openHistoricalRevision(revision.id)}>{tx("Open revision")}</Button></div>) : <p className="py-2 text-[9px] text-muted-foreground">{revisionsLoading ? tx("Loading revisions…") : tx("No saved revisions yet.")}</p>}</div>}
          <div className="relative min-h-0 flex-1"><CadViewport apiRef={apiRef} dark={dark} measureActive={measureActive} marginActive={marginActive} measurePoints={measurePoints} section={sectionSettings} scalar={scalarAnalysis} referenceMode={practiceLessonId ? practiceSession?.referenceMode : undefined} editableTargetIds={practiceLessonId ? practiceStep?.targetObjectIds ?? [] : undefined} practiceReferenceObjectId={practiceStep?.reference?.objectId} practiceReferencePosition={practiceStep?.reference?.position} />{scalarAnalysis && <div className="pointer-events-none absolute right-3 top-3 z-10 rounded border border-border/70 bg-background/85 px-2.5 py-2 text-[9px] shadow-sm"><strong className="block">{scalarAnalysis.kind === "contact" ? "Proximity distance" : scalarAnalysis.kind === "deviation" ? "Unsigned surface deviation" : scalarAnalysis.kind === "thickness" ? "Thickness · exercise inspection" : "Insertion direction preview · not clinical undercut detection"}</strong><span className="text-muted-foreground">{scalarAnalysis.kind === "undercut" ? "Direction-based face orientation" : `0 mm · near ${scalarAnalysis.thresholdMm.toFixed(2)} mm · far`}</span><span className="block text-muted-foreground">{scalarAnalysis.kind === "undercut" ? `${Math.round(scalarAnalysis.maxMm * 100)}% directional face score` : `Range ${scalarAnalysis.minMm.toFixed(3)}–${scalarAnalysis.maxMm.toFixed(3)} mm · ${scalarAnalysis.kind === "thickness" ? "ray thickness samples" : "nearest point distances"}`}</span></div>}{hiddenCount > 0 && <Button variant="secondary" size="sm" className="absolute bottom-3 left-1/2 z-10 h-7 -translate-x-1/2 gap-1.5 text-[10px] shadow" onClick={() => runIsolateCommand(null)}><Eye className="size-3.5" />{tx("Show all objects")} <span className="opacity-60">({hiddenCount})</span></Button>}{helpOpen && <div className="absolute right-3 top-3 z-10 w-64 rounded-lg border border-border bg-card p-3 shadow-lg"><div className="flex items-center justify-between"><p className="flex items-center gap-1.5 text-xs font-semibold"><CircleHelp className="size-3.5 text-primary" /> {tx("Viewport navigation")}</p><button aria-label={tx("Close help")} onClick={() => setHelpOpen(false)}><X className="size-3.5" /></button></div><p className="mt-2 text-[10px] leading-5 text-muted-foreground">{tx("Left drag orbits · right drag pans · scroll wheel zooms. Select an object, then choose Move, Rotate, or Scale to edit it.")}</p></div>}<div className="pointer-events-none absolute bottom-3 left-3 rounded border border-border/60 bg-background/75 px-2 py-1 text-[9px] text-muted-foreground">Z up · mm · {cameraMode}</div></div>
        </section>
        <aside data-panel-mode={rightPanelTab} className={"cad-right-panel flex min-h-0 shrink-0 flex-col border-l border-border bg-card/80 " + (rightCollapsed ? "w-10" : "w-[282px] xl:w-[300px]")}>
          <div className={"cad-right-panel-header flex h-10 shrink-0 items-center border-b border-border " + (rightCollapsed ? "justify-center" : "justify-between px-2")}>
            {rightCollapsed ? <button type="button" aria-label={localeText(locale, "Expand task panel", "Prosiri panel zadatka")} aria-expanded={false} onClick={() => setRightCollapsed(false)} className="grid size-8 place-items-center rounded text-muted-foreground hover:bg-muted"><SlidersHorizontal className="size-4" /></button> : <><RightPanelModeControl practice={Boolean(practiceLessonId)} mode={rightPanelTab} locale={locale} onOpenProperties={() => setRightPanelTab("properties")} onBackToTask={() => setRightPanelTab("guide")} /><button type="button" aria-label={localeText(locale, "Collapse right panel", "Skupi desni panel")} aria-expanded={true} onClick={() => setRightCollapsed(true)} className="rounded px-1.5 py-1 text-[9px] text-muted-foreground hover:bg-muted">{localeText(locale, "Hide", "Sakrij")}</button></>}
          </div>
          <div className={"flex min-h-0 flex-1 flex-col " + (rightCollapsed ? "hidden" : "")}>
            {practiceLesson && <PracticeGuidancePanel lesson={practiceLesson} preview={preview} hidden={rightPanelTab !== "guide"} onShowObject={showObjectInScene} onShowTools={showRequiredTools} />}
            <div className={"flex min-h-0 flex-1 flex-col " + (rightPanelTab !== "properties" ? "hidden" : "")}><PropertiesPanel selected={selected} trimAxis={trimAxis} setTrimAxis={setTrimAxis} trimOffset={trimOffset} setTrimOffset={setTrimOffset} mirrorAxis={mirrorAxis} setMirrorAxis={setMirrorAxis} canMove={allowed("move") && targetAllowed(selectedObjectId)} canRotate={allowed("rotate") && targetAllowed(selectedObjectId)} canScale={allowed("scale") && targetAllowed(selectedObjectId)} canSceneTools={allowed("scene")} activeToolGroup={activeToolGroup} transformMode={transformMode} locale={locale} /></div>
          </div>
        </aside>
      </main>
      <ToolCategoryBar active={activeToolGroup} onChange={selectToolGroup} highlighted={highlightedToolGroup} activeToolLabel={activeToolLabel} locale={locale} />
        {allowed("analysis") && <AnalysisControls hidden={activeToolGroup !== "margin" && activeToolGroup !== "analysis"} highlightedSubtool={highlightedSubtool} panel={activeToolGroup === "margin" ? "margin" : "analysis"} objects={objects} selectedObjectId={selectedObjectId} canPlaceCrown={activeToolGroup === "margin" && allowed("scene") && objects.some((object) => object.id === cadObjectId(CROWN_CASE_OBJECTS.restoration)) && (!practiceLesson || (!!practiceStep?.targetObjectIds.includes(CROWN_CASE_OBJECTS.restoration) && practiceStep.validators.some((validator) => validator.type === "transform_range" && validator.objectId === CROWN_CASE_OBJECTS.restoration)))} onPlaceCrown={() => { const id = cadObjectId(CROWN_CASE_OBJECTS.restoration); try { placeCrownFromLibrary(id); useWorkspaceStore.getState().select(id); setTransformMode("select"); setMeshMode("object"); toast.success(tx("Synthetic posterior crown preset placed. Undo is available.")); } catch { toast.error(tx("Tooth library placement failed.")); } }} onEnterAnalysis={() => { setSculptTool(null); setTransformMode("select"); setMeshMode("object"); }} onMeasureMode={setMeasureActive} onMarginMode={setMarginActive} onMeasurePoints={setMeasurePoints} onSection={setSectionSettings} onScalar={setScalar} />}
      {activeToolGroup === "navigation" && <div aria-label={tx("Viewport navigation tools")} className="flex min-h-11 shrink-0 flex-wrap items-center gap-1 border-b border-border bg-card/60 px-3 py-1.5">{viewPresets.map((preset) => <Button key={preset.id} variant="ghost" size="sm" className="h-8 px-2.5 text-[10px]" onClick={() => setView(preset.id)}>{tx(preset.label)}</Button>)}<Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2.5 text-[10px]" onClick={() => setView("reset")}><Crosshair className="size-3.5" />{tx("Reset")}</Button><Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2.5 text-[10px]" onClick={() => apiRef.current?.frameAll()}><Focus className="size-3.5" />{tx("Frame All")}</Button><Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2.5 text-[10px]" disabled={!selected} onClick={() => selected && apiRef.current?.frameSelected(selected.id)}><Focus className="size-3.5" />{tx("Frame Selected")}</Button><div className="ml-auto flex items-center rounded-md border border-border bg-background p-0.5">{(["perspective", "orthographic"] as CameraMode[]).map((camera) => <Button key={camera} variant={cameraMode === camera ? "secondary" : "ghost"} size="sm" className="h-7 px-2.5 text-[10px] capitalize" aria-pressed={cameraMode === camera} onClick={() => setCameraMode(camera)}>{tx(camera)}</Button>)}</div></div>}
      <div className={`cad-tool-shelf flex max-h-24 min-h-12 shrink-0 flex-wrap items-center gap-1 overflow-y-auto border-b border-border bg-card/60 px-2.5 py-1 ${activeToolGroup === "sculpt" || activeToolGroup === "mesh" ? "" : "hidden"}`} aria-label={tx(activeToolGroup === "sculpt" ? "Sculpt tools" : "Mesh editing tools")}>
        <span className="mr-1 shrink-0 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{toolGroupLabels[activeToolGroup][locale]}</span>
        {activeToolGroup === "sculpt" && <>
        <Button variant={sculptTool ? "secondary" : "ghost"} size="sm" className="h-7 shrink-0 gap-1 px-2 text-[9px]" aria-pressed={Boolean(sculptTool)} disabled={!(selected?.importSource || selected?.syntheticMesh) || !allowed("sculpt") || !targetAllowed(selectedObjectId)} title={!allowed("sculpt") ? tx("Available in a later step.") : undefined} onClick={() => { setMeshMode("object"); setTransformMode("select"); setSculptTool(sculptTool ? null : "add"); clearFaceSelection(); }}><Brush className="size-3" />{tx("Sculpt")}</Button>
        <>
          {(selected?.importSource || selected?.syntheticMesh) && geometryRegistry.getMeshes(selected.id).length > 1 && !meshKey && <span role="status" className="px-1 text-[9px] text-amber-600 dark:text-amber-400">{tx("Select an editable mesh child in the Scene panel.")}</span>}
          {([{ id: "add", label: "Add", icon: Brush }, { id: "remove", label: "Remove", icon: Minus }, { id: "smooth", label: "Smooth", icon: Waves }, { id: "flatten", label: "Flatten", icon: Circle }, { id: "morph", label: "Morph", icon: Hand }] as { id: SculptTool; label: string; icon: typeof Brush }[]).map(({ id, label, icon: Icon }) => <Button key={id} variant={sculptTool === id ? "secondary" : "ghost"} size="sm" className={`h-8 shrink-0 gap-1.5 px-2.5 text-[10px] ${highlightedSubtool === label ? "ring-2 ring-amber-400" : ""}`} aria-pressed={sculptTool === id} disabled={!(selected?.importSource || selected?.syntheticMesh) || !allowed("sculpt") || !targetAllowed(selectedObjectId)} onClick={() => { setMeshMode("object"); setTransformMode("select"); setSculptTool(id); clearFaceSelection(); }}><Icon className="size-3.5" />{tx(label)}</Button>)}
          <label className="ml-1 flex shrink-0 items-center gap-1.5 text-[10px] text-muted-foreground">{tx("Size")} <Input aria-label={tx("Brush size in millimeters")} type="number" min={SCULPT_CONFIG.minRadiusMm} max={SCULPT_CONFIG.maxRadiusMm} step="0.25" value={brushRadiusMm} disabled={!sculptTool} onChange={(event) => setBrushRadiusMm(Number(event.currentTarget.value))} className="h-7 w-16 px-1.5 text-[10px]" />mm</label>
          <input aria-label={tx("Brush size slider in millimeters")} type="range" min={SCULPT_CONFIG.minRadiusMm} max={SCULPT_CONFIG.maxRadiusMm} step="0.25" value={brushRadiusMm} disabled={!sculptTool} onChange={(event) => setBrushRadiusMm(Number(event.currentTarget.value))} className="w-20 accent-primary" />
          <label className="ml-1 flex shrink-0 items-center gap-1.5 text-[10px] text-muted-foreground">{tx("Strength")} <input aria-label={tx("Brush strength")} type="range" min="0" max="1" step="0.01" value={brushStrength} disabled={!sculptTool} onChange={(event) => setBrushStrength(Number(event.currentTarget.value))} className="w-20 accent-primary" /><span className="w-8 tabular-nums">{Math.round(brushStrength * 100)}%</span></label>
        </>
        </>}
        {activeToolGroup === "mesh" && <>
        <Button variant={meshMode === "face" ? "secondary" : "ghost"} size="sm" className="h-7 shrink-0 gap-1 px-2 text-[9px]" aria-pressed={meshMode === "face"} disabled={!allowed("mesh-edit") || !targetAllowed(selectedObjectId)} title={!allowed("mesh-edit") ? tx("Available in a later step.") : tx("Click a face; Shift-click to add faces")} onClick={() => { if (meshMode === "face") setMeshMode("object"); else { setTransformMode("select"); setMeshMode("face"); } }}><SquareMousePointer className="size-3" />{tx("Face / Region")}</Button>
        <Button variant="ghost" size="sm" className="h-7 shrink-0 px-2 text-[9px]" disabled={!faceIndices.length || operationState === "processing" || !allowed("mesh-edit") || !targetAllowed(selectedObjectId)} onClick={clearFaceSelection}>{tx("Clear")} ({faceIndices.length})</Button>
        <Button variant="ghost" size="sm" className="h-7 shrink-0 gap-1 px-2 text-[9px]" disabled={!faceIndices.length || operationState === "processing" || !allowed("mesh-edit") || !targetAllowed(selectedObjectId)} onClick={() => void applyMeshOperation("delete")}><Trash2 className="size-3" />{tx("Delete Selected")}</Button>
        <Button variant="ghost" size="sm" className="h-7 shrink-0 gap-1 px-2 text-[9px]" disabled={operationState === "processing" || !allowed("mesh-edit") || !targetAllowed(selectedObjectId)} onClick={() => void applyMeshOperation("trim")}><Scissors className="size-3" />{tx("Trim")}</Button>
        <Button variant="ghost" size="sm" className="h-7 shrink-0 gap-1 px-2 text-[9px]" disabled={operationState === "processing" || !allowed("mesh-edit") || !targetAllowed(selectedObjectId)} onClick={() => void applyMeshOperation("fill-hole")}><CircleDashed className="size-3" />{tx("Fill Hole")}</Button>
        <Button variant="ghost" size="sm" className="h-7 shrink-0 gap-1 px-2 text-[9px]" disabled={operationState === "processing" || !allowed("mesh-edit") || !targetAllowed(selectedObjectId)} onClick={() => void applyMeshOperation("smooth")}><Sparkles className="size-3" />{tx("Smooth")}</Button>
        <Button variant="ghost" size="sm" className="h-7 shrink-0 gap-1 px-2 text-[9px]" disabled={operationState === "processing" || !allowed("mesh-edit") || !targetAllowed(selectedObjectId)} onClick={() => void applyMeshOperation("cleanup")}><Wrench className="size-3" />{tx("Cleanup")}</Button>
        <Button variant="ghost" size="sm" className="h-7 shrink-0 gap-1 px-2 text-[9px]" disabled={operationState === "processing" || !allowed("mesh-edit") || !targetAllowed(selectedObjectId)} onClick={() => void applyMeshOperation("mirror")}><FlipHorizontal2 className="size-3" />{tx("Apply")}</Button>
        <Button variant="ghost" size="sm" className="h-7 shrink-0 gap-1 px-2 text-[9px]" disabled={operationState === "processing" || !selected?.importSource || !allowed("mesh-edit") || !targetAllowed(selectedObjectId)} onClick={duplicateSelectedObject}><Copy className="size-3" />{tx("Duplicate")}</Button>
        <span role="status" aria-live="polite" className="ml-auto shrink-0 text-[9px] text-destructive">{operationState === "processing" ? tx("Processing mesh…") : operationError ? tx("Operation failed. Try again.") : ""}</span>
        </>}
      </div>
      <footer className="flex h-9 shrink-0 items-center justify-between border-t border-border bg-card px-2.5"><div className="flex items-center gap-1">{activeToolGroup === "edit" && toolModes.map(({ id, label, icon: Icon }) => <Button key={id} variant={!sculptTool && transformMode === id ? "secondary" : "ghost"} size="sm" className={`h-7 gap-1.5 px-2.5 text-[10px] ${highlightedSubtool === label ? "ring-2 ring-amber-400" : ""}`} aria-pressed={!sculptTool && transformMode === id} disabled={!allowed(id === "translate" ? "move" : id) || (id !== "select" && !targetAllowed(selectedObjectId))} title={!allowed(id === "translate" ? "move" : id) ? tx("Available in a later step.") : id === "translate" ? tx("Move (G)") : id === "rotate" ? tx("Rotate (R)") : id === "scale" ? tx("Scale (S)") : tx("Select")} onClick={() => { setSculptTool(null); setMeshMode("object"); setTransformMode(id); }}><Icon className="size-3.5" />{tx(label)}</Button>)}</div><div className="flex items-center gap-2 text-[9px] text-muted-foreground"><span role="status" aria-live="polite" title={status === "save_failed" ? tx("Cloud save failed.") : undefined} className={status === "save_failed" ? "text-destructive" : status === "dirty" || status === "saving" ? "text-amber-600 dark:text-amber-400" : cloudCaseId && status === "saved" ? "text-emerald-700 dark:text-emerald-400" : ""}>{persistenceStage ? `${tx(persistenceStage)}…` : status === "save_failed" ? tx("Cloud save failed · retry available") : cloudCaseId && status === "saved" ? `${tx("Cloud saved")} · ${tx("revision")} ${cloudRevisionNumber}` : status === "dirty" ? tx("Unsaved changes") : status === "saving" ? tx("Saving…") : hasImportedModels && !cloudCaseId ? tx("Imported geometry · not saved to cloud") : status === "saved" ? `${tx("Recovered locally ·")} ${lastRecoveryAt ? new Date(lastRecoveryAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : tx("saved")}` : tx("No unsaved changes")}</span><span className="hidden sm:inline">{cloudCaseId ? tx("Private cloud case · local recovery protects unsaved transforms") : hasImportedModels ? tx("Save uploads editable mesh snapshots") : freeLabSessionId ? tx("Free Lab local session") : tx("Local workspace")}</span><span className="flex items-center gap-1"><Grid2X2 className="size-3" />{selected?.name ?? tx("No selection")}</span></div></footer>
      </>}
    {recovery && recoveryChecked && <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4"><div role="dialog" aria-modal="true" aria-labelledby="recovery-title" className="w-full max-w-md rounded-xl border border-border bg-card p-5 text-card-foreground shadow-2xl"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">{tx("Workspace recovery")}</p><h2 id="recovery-title" className="mt-2 text-lg font-semibold">{tx("Unsaved work was found.")}</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">{tx("A local recovery snapshot for this workspace was saved")} {new Date(recovery.timestamp).toLocaleString()}. {tx("Would you like to restore it?")}</p><div className="mt-5 flex justify-end gap-2"><Button variant="outline" size="sm" onClick={() => { void discardRecovery(caseId).then(() => { setRecovery(null); markClean(); }).catch(() => toast.error(tx("Recovery could not be discarded."))); }}>{tx("Discard")}</Button><Button size="sm" onClick={() => { try { if (isUuid(caseId)) restoreCloudRecovery(recovery, caseId); else restoreRecovery(recovery, caseId); clearHistory(); setRecovery(null); toast.success(tx("Local recovery restored.")); } catch (error) { console.error("Unable to restore CAD recovery.", error); toast.error(tx("This recovery could not be restored. The workspace is still available.")); } }}>{tx("Restore")}</Button></div></div></div>}
    {!recoveryChecked && <div className="fixed inset-0 z-40 grid place-items-center bg-background/75"><div role="status" className="rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground shadow-sm">{tx("Checking local recovery…")}</div></div>}
    {caseBriefOpen && freeLabSession?.caseBrief && <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setCaseBriefOpen(false); }}><section role="dialog" aria-modal="true" aria-labelledby="workspace-case-brief-title" className="w-full max-w-lg rounded-xl border border-border bg-card p-5 text-card-foreground shadow-2xl"><div className="flex items-start justify-between gap-3"><div><p className="page-eyebrow">{tx("FREE LAB · CASE BRIEF")}</p><h2 id="workspace-case-brief-title" className="mt-1 text-lg font-semibold">{freeLabSession.title}</h2></div><button type="button" aria-label={tx("Close Case Brief")} onClick={() => setCaseBriefOpen(false)}><X className="size-4" /></button></div><dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><MetadataLine label={tx("Origin")} value={tx(freeLabSession.origin)} /><MetadataLine label={tx("Workspace ID")} value={freeLabSession.workspaceId} />{freeLabSession.scenarioId && <MetadataLine label={tx("Scenario ID")} value={freeLabSession.scenarioId} />}{freeLabSession.category && <MetadataLine label={tx("Category")} value={tx(freeLabSession.category.replaceAll("_", " "))} />}{freeLabSession.difficulty && <MetadataLine label={tx("Difficulty")} value={tx(freeLabSession.difficulty)} />}<MetadataLine label={tx("Patient ID")} value={freeLabSession.caseBrief.patientCode} />{freeLabSession.caseBrief.patientAge !== undefined && <MetadataLine label={tx("Age")} value={String(freeLabSession.caseBrief.patientAge)} />}<MetadataLine label={tx("Indication")} value={freeLabSession.caseBrief.indication[locale]} /><MetadataLine label={tx("Target teeth")} value={freeLabSession.caseBrief.targetTeeth.join(", ")} /><MetadataLine label={tx("Material")} value={freeLabSession.caseBrief.material[locale]} /><MetadataLine label={tx("Supplied files")} value={freeLabSession.caseBrief.supplied[locale].join(", ")} /></dl><div className="mt-4 border-t border-border pt-3"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{tx("Requirements")}</p><ul className="mt-2 space-y-1 text-[11px]">{freeLabSession.caseBrief.requirements[locale].map((item) => <li key={item}>· {item}</li>)}</ul></div><p className="mt-4 text-[10px] leading-4 text-muted-foreground">{freeLabSession.caseBrief.notes?.[locale] ?? tx("Educational simulated content.")} {tx("Requirements describe the case and do not restrict tools or work order.")}</p></section></div>}
  </div>;
}
