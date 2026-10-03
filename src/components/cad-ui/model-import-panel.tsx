"use client";
import { useInterfaceCopy } from "@/lib/i18n";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Plus, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { geometryRegistry } from "@/cad/scene/geometry-registry";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import type { CadObjectRole } from "@/cad/types";
import { importModel } from "@/cad/import/import-model";
import { ModelImportError, validateImportFile } from "@/cad/import/model-importer";
import { storeRawModel } from "@/cad/import/store-raw-model";
import type { ImportErrorCode, ImportFileResult, ImportStage, ModelUnit } from "@/cad/import/types";

type FileRow = { file: File; role: CadObjectRole; unit: ModelUnit; visible: boolean; stage: ImportStage; error?: string; warnings?: string[]; done?: boolean };
type Props = { onFrame: (id: string) => void; initialOpen?: boolean; onImport?: (objects: { id: string; role: CadObjectRole; name: string }[]) => void };

const roles: CadObjectRole[] = ["maxilla", "mandible", "antagonist", "preop", "prepared_tooth", "tooth", "crown", "bridge", "pontic", "denture_tooth", "denture_base", "framework", "splint", "implant", "abutment", "model_base", "reference", "scan", "other"];
const units: ModelUnit[] = ["mm", "cm", "m", "unknown"];
const importErrorCopy: Record<ImportErrorCode, string> = {
  unsupported_format: "Choose a supported STL, OBJ, PLY, GLB, or glTF model file.",
  empty_file: "The selected file is empty.",
  file_too_large: "Model files must be 128 MB or smaller.",
  format_mismatch: "The file extension does not match its contents.",
  parse_failed: "The model file could not be parsed.",
  invalid_geometry: "The model does not contain valid geometry.",
  geometry_too_large: "The model exceeds the supported geometry limit.",
  invalid_coordinates: "The model contains invalid coordinates.",
};
const stageLabels: Record<ImportStage, string> = { idle: "Ready to import", reading: "Reading file", parsing: "Parsing model", normalizing: "Checking units and geometry", uploading: "Saving original to private storage", registering: "Adding to workspace", ready: "Ready", failed: "Import failed" };
const warningLabels = { unit_assumed: "Units are not encoded reliably; the selected scale was applied.", scale_suspicious: "Bounds are unusually small or large. Review units; this is not an anatomy check.", dense_mesh: "Dense mesh: viewport performance may be reduced.", orientation_unconfirmed: "Source orientation was preserved. Confirm and align it to Prostheia's Z-up axes.", source_colors_preserved: "Source vertex colors were retained.", raw_asset_upload_failed: "The model loaded for this session, but the original did not save to private storage." } as const;

export function ModelImportPanel({ onFrame, initialOpen = false, onImport }: Props) {
  const tx = useInterfaceCopy();
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const [open, setOpen] = useState(initialOpen);
  const [rows, setRows] = useState<FileRow[]>([]);
  const [working, setWorking] = useState(false);
  const [saveOriginal, setSaveOriginal] = useState(true);
  const [summary, setSummary] = useState<ImportFileResult[]>([]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const stageFiles = (files: FileList | File[]) => {
    const next = Array.from(files).map((file): FileRow => {
      try {
        const format = validateImportFile(file);
        return { file, role: "scan", unit: format === "glb" || format === "gltf" ? "m" : "mm", visible: true, stage: "idle" };
      } catch (error) {
        const message = error instanceof ModelImportError ? importErrorCopy[error.code] : "Could not import this file. Try a supported model format.";
        return { file, role: "scan", unit: "mm", visible: true, stage: "failed", error: message, done: true };
      }
    });
    setRows((current) => [...current, ...next]);
    setSummary([]);
    setOpen(true);
  };

  const updateRow = (index: number, update: Partial<FileRow>) => setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...update } : row));

  const runImports = async () => {
    if (working) return;
    setWorking(true);
    setSummary([]);
    const controller = new AbortController();
    abortRef.current = controller;
    const outcomes: ImportFileResult[] = [];
    const initialImportedCount = useWorkspaceStore.getState().objects.filter((object) => object.importSource).length;
    let firstImportedId: string | null = null;
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      if (row.done || controller.signal.aborted) continue;
      try {
        const imported = await importModel({ file: row.file, role: row.role, unit: row.unit }, (stage) => updateRow(index, { stage }), controller.signal);
        if (controller.signal.aborted) {
          geometryRegistry.disposeObject(imported.object);
          throw new DOMException("Import cancelled.", "AbortError");
        }
        let metadata = imported.metadata;
        if (saveOriginal) {
          updateRow(index, { stage: "uploading" });
          try { metadata.rawAsset = await storeRawModel(row.file, metadata, row.role, controller.signal); }
          catch { metadata = { ...metadata, warnings: [...metadata.warnings, "raw_asset_upload_failed"] }; }
        }
        if (controller.signal.aborted) {
          geometryRegistry.disposeObject(imported.object);
          throw new DOMException("Import cancelled.", "AbortError");
        }
        geometryRegistry.register({ id: imported.id, name: imported.name, role: imported.role, object: imported.object, ownsResources: true });
        try {
          useWorkspaceStore.getState().addImportedObject({ id: imported.id, name: imported.name, role: imported.role, editable: true, articulatorArch: imported.role === "maxilla" ? "upper" : imported.role === "mandible" || imported.role === "antagonist" ? "lower" : undefined, transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }, visible: row.visible, opacity: 1, importSource: metadata });
        } catch (error) {
          geometryRegistry.remove(imported.id);
          throw error;
        }
        if (!firstImportedId) firstImportedId = imported.id;
        updateRow(index, { stage: "ready", warnings: metadata.warnings.map((warning) => warningLabels[warning]), done: true });
        outcomes.push({ fileName: row.file.name, ok: true, value: { id: imported.id, name: imported.name, role: imported.role, metadata } });
      } catch (error) {
        const message = error instanceof ModelImportError ? importErrorCopy[error.code] : error instanceof DOMException && error.name === "AbortError" ? "Import cancelled." : "The model could not be added to the workspace.";
        updateRow(index, { stage: "failed", error: message, done: true });
        if (!(error instanceof DOMException && error.name === "AbortError")) outcomes.push({ fileName: row.file.name, ok: false, error: { fileName: row.file.name, code: (error instanceof ModelImportError ? error.code : "parse_failed") as ImportErrorCode, message } });
      }
    }
    if (firstImportedId && initialImportedCount === 0) onFrame(firstImportedId);
    if (outcomes.some((outcome) => outcome.ok)) onImport?.(outcomes.flatMap((outcome) => outcome.ok ? [{ id: outcome.value.id, role: outcome.value.role, name: outcome.value.name }] : []));
    setSummary(outcomes);
    setWorking(false);
    abortRef.current = null;
  };

  return <>
    <Button variant="default" size="sm" className="h-7 gap-1.5 px-2.5 text-[10px]" onClick={() => { setRows([]); setSummary([]); setOpen(true); }}><Upload className="size-3.5" />{tx("Import Model")}</Button>
    <input ref={inputRef} type="file" multiple accept=".stl,.obj,.ply,.glb,.gltf,model/stl,model/obj,model/ply,model/gltf-binary,model/gltf+json" className="hidden" onChange={(event) => { if (event.currentTarget.files?.length) stageFiles(event.currentTarget.files); event.currentTarget.value = ""; }} />
    {open && <div className="fixed inset-0 z-50 grid place-items-center bg-black/45 p-4" onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (!working && event.dataTransfer.files.length) stageFiles(event.dataTransfer.files); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="model-import-title" className="w-full max-w-2xl overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xl">
        <header className="flex items-start justify-between border-b border-border p-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">{tx("Model Import · Select → Configure → Review → Open Workspace")}</p><h2 id="model-import-title" className="mt-1 text-base font-semibold">{tx("Add dental geometry to this workspace")}</h2><p className="mt-1 text-[11px] text-muted-foreground">{tx("STL, OBJ, PLY, GLB and glTF · each file becomes a separate scene object.")}</p></div><button aria-label={tx("Close import dialog")} disabled={working} onClick={() => setOpen(false)} className="grid size-7 place-items-center rounded hover:bg-muted disabled:opacity-50"><X className="size-4" /></button></header>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto p-4">
          {rows.length === 0 && <button type="button" onClick={() => inputRef.current?.click()} onDragOver={(event) => event.preventDefault()} onDrop={(event) => { event.preventDefault(); if (event.dataTransfer.files.length) stageFiles(event.dataTransfer.files); }} className="grid min-h-36 w-full place-items-center rounded-lg border border-dashed border-border bg-muted/30 p-5 text-center hover:border-primary/60"><span><Upload className="mx-auto size-6 text-primary" /><span className="mt-2 block text-xs font-medium">{tx("Choose files or drop them here")}</span><span className="mt-1 block text-[10px] text-muted-foreground">{tx("Files are parsed locally in a Web Worker. Maximum 128 MB per file.")}</span></span></button>}
          {rows.length > 0 && <label className="flex items-start gap-2 rounded-md border border-border bg-muted/30 p-2.5 text-[10px] leading-4"><input type="checkbox" checked={saveOriginal} disabled={working} onChange={(event) => setSaveOriginal(event.target.checked)} className="mt-0.5 accent-primary" /><span><strong className="font-medium">{tx("Keep the untouched original in private Prostheia storage.")}</strong><span className="block text-muted-foreground">{tx("Uploads the raw file directly to your private account storage; the CAD workspace still uses normalized session geometry.")}</span></span></label>}
          {rows.map((row, index) => <article key={`${row.file.name}-${index}`} className="rounded-lg border border-border p-3">
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-xs font-medium" title={row.file.name}>{row.file.name}</p><p role="status" className={`mt-1 text-[10px] ${row.error ? "text-destructive" : "text-muted-foreground"}`}>{row.error ? tx(row.error) : `${tx(stageLabels[row.stage])}${row.stage === "ready" ? ` · ${(row.file.size / 1024 / 1024).toFixed(1)} MB` : ""}`}</p></div><span className="shrink-0 text-[10px] text-muted-foreground">{(row.file.size / 1024 / 1024).toFixed(1)} MB</span></div>
            <div className="mt-3 grid grid-cols-2 gap-2"><label className="text-[10px] text-muted-foreground">{tx("Object role")}<select aria-label={`Role for ${row.file.name}`} disabled={working || row.done} value={row.role} onChange={(event) => updateRow(index, { role: event.target.value as CadObjectRole })} className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-[11px] text-foreground">{roles.map((role) => <option key={role} value={role}>{role.replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase())}</option>)}</select></label><label className="text-[10px] text-muted-foreground">{tx("Source units")}<select aria-label={`Units for ${row.file.name}`} disabled={working || row.done} value={row.unit} onChange={(event) => updateRow(index, { unit: event.target.value as ModelUnit })} className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-[11px] text-foreground">{units.map((unit) => <option key={unit} value={unit}>{unit === "unknown" ? "Unknown (assume mm)" : unit}</option>)}</select></label></div>
            <div className="mt-3 grid grid-cols-2 gap-2"><label className="text-[10px] text-muted-foreground">{tx("Object role")}<select aria-label={`Role for ${row.file.name}`} disabled={working || row.done} value={row.role} onChange={(event) => updateRow(index, { role: event.target.value as CadObjectRole })} className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-[11px] text-foreground">{roles.map((role) => <option key={role} value={role}>{role.replaceAll("_", " ").replace(/^\w/, (letter) => letter.toUpperCase())}</option>)}</select></label><label className="text-[10px] text-muted-foreground">{tx("Source units")}<select aria-label={`Units for ${row.file.name}`} disabled={working || row.done} value={row.unit} onChange={(event) => updateRow(index, { unit: event.target.value as ModelUnit })} className="mt-1 h-8 w-full rounded-md border border-input bg-background px-2 text-[11px] text-foreground">{units.map((unit) => <option key={unit} value={unit}>{unit === "unknown" ? "Unknown (assume mm)" : unit}</option>)}</select></label></div>
            <label className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground"><input type="checkbox" aria-label={`Initially visible ${row.file.name}`} checked={row.visible} disabled={working || row.done} onChange={(event) => updateRow(index, { visible: event.target.checked })} className="accent-primary" />{tx("Initially visible")}</label>
            {row.warnings?.map((warning) => <p key={warning} className="mt-2 rounded bg-amber-500/10 px-2 py-1.5 text-[10px] leading-4 text-amber-800 dark:text-amber-200">{tx(warning)}</p>)}
            {row.stage === "ready" && <p className="mt-2 rounded bg-amber-500/10 p-2 text-[10px] leading-4 text-amber-800 dark:text-amber-200">{tx("Imported orientation is preserved. Inspect and align the model to Prostheia’s Z-up convention with the workspace rotation controls.")}</p>}
          </article>)}
          {summary.length > 0 && <p className="rounded-md bg-muted px-3 py-2 text-[10px]">{summary.filter((result) => result.ok).length} imported · {summary.filter((result) => !result.ok).length} failed. Successful models remain in the workspace if another file fails.</p>}
        </div>
        <footer className="flex items-center justify-between border-t border-border p-3"><Button variant="outline" size="sm" className="h-8 gap-1.5 text-[10px]" disabled={working} onClick={() => inputRef.current?.click()}><Plus className="size-3.5" />{tx("Add files")}</Button><div className="flex gap-2">{working ? <Button variant="outline" size="sm" className="h-8 text-[10px]" onClick={() => abortRef.current?.abort()}>{tx("Cancel import")}</Button> : <Button variant="outline" size="sm" className="h-8 text-[10px]" onClick={() => setOpen(false)}>{summary.some((result) => result.ok) ? "Open Workspace" : "Close"}</Button>}{rows.some((row) => !row.done) && <Button size="sm" className="h-8 gap-1.5 text-[10px]" disabled={working} onClick={() => void runImports()}>{working && <LoaderCircle className="size-3.5 animate-spin" />}Import {rows.filter((row) => !row.done).length} file{rows.filter((row) => !row.done).length === 1 ? "" : "s"}</Button>}</div></footer>
      </section>
    </div>}
  </>;
}
