"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { ArrowDownToLine, ArrowUpRight, Camera, Circle, Highlighter, MessageSquareText, Save, Trash2, Eye, EyeOff, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n, translateWorkspace } from "@/lib/i18n";
import type { CameraSnapshot, ViewportApi } from "@/cad/camera/types";
import { ANNOTATION_COLORS, MAX_ANNOTATIONS, MAX_SCREENSHOT_BYTES, MAX_ANNOTATION_TEXT, moveAnnotation, normalizedPoint, validateAnnotations, type AnnotationKind, type CapturedScreenshot, type ScreenshotAnnotation } from "@/cad/screenshots/model";
import { listCaseScreenshots, loadScreenshotImage, replaceScreenshotAnnotations, saveScreenshot, type SavedScreenshot } from "@/cad/screenshots/persistence";

type ImageRecord = CapturedScreenshot & { id: string; saved: boolean; path?: string; revisionId: string | null; createdAt: string };
type Tool = AnnotationKind | "select";

function newId() { return crypto.randomUUID(); }
function normalizedSvg(x: number) { return x * 1000; }

function SavedScreenshotCard({ item, caseTitle, onOpen, locale }: { item: SavedScreenshot; caseTitle: string; onOpen: () => void; locale: "en" | "sr" }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let objectUrl: string | null = null; let active = true;
    void loadScreenshotImage(item.asset.object_path).then((blob) => { if (!active) return; objectUrl = URL.createObjectURL(blob); setSrc(objectUrl); }).catch(() => undefined);
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [item.asset.object_path]);
  return <button type="button" className="overflow-hidden rounded-md border border-border text-left hover:border-primary" onClick={onOpen}><div className="relative grid aspect-video place-items-center bg-muted">{src ? <Image src={src} alt={translateWorkspace(locale, "savedCadView")} fill unoptimized className="object-contain"/> : <span className="text-[10px] text-muted-foreground">{translateWorkspace(locale, "savedScreenshot")}</span>}</div><span className="block truncate px-2 py-1.5 text-[10px]">{item.revision_id ? `${translateWorkspace(locale, "revision")} ${item.revision_id.slice(0, 8)}` : caseTitle} · {new Date(item.created_at).toLocaleString()}</span></button>;
}

function AnnotationShapes({ items, selected, onSelect, onMove, locale }: { items: ScreenshotAnnotation[]; selected: string | null; onSelect: (id: string) => void; onMove: (id: string, dx: number, dy: number) => void; locale: "en" | "sr" }) {
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null);
  return <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-label={translateWorkspace(locale, "screenshotAnnotations")}>
    <defs><marker id="screenshot-arrow-head" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="context-stroke" /></marker></defs>
    {items.filter((item) => item.payload.visible !== false).map((item) => {
      const { x, y, endX = x, endY = y, text, color } = item.payload;
      const common = { stroke: color, strokeWidth: item.id === selected ? 5 : 3, vectorEffect: "non-scaling-stroke" as const, onPointerDown: (event: React.PointerEvent<SVGElement>) => { event.stopPropagation(); onSelect(item.id); setDrag({ id: item.id, x: event.clientX, y: event.clientY }); event.currentTarget.setPointerCapture(event.pointerId); }, onPointerMove: (event: React.PointerEvent<SVGElement>) => { if (!drag || drag.id !== item.id) return; const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect(); if (!bounds) return; const dx = (event.clientX - drag.x) / bounds.width; const dy = (event.clientY - drag.y) / bounds.height; if (dx || dy) { onMove(item.id, dx, dy); setDrag({ id: item.id, x: event.clientX, y: event.clientY }); } }, onPointerUp: () => setDrag(null), onPointerCancel: () => setDrag(null), style: { cursor: "move", pointerEvents: "stroke" as const } };
      if (item.type === "arrow") return <g key={item.id}><line x1={normalizedSvg(x)} y1={normalizedSvg(y)} x2={normalizedSvg(endX)} y2={normalizedSvg(endY)} markerEnd="url(#screenshot-arrow-head)" {...common} />{text && <text x={normalizedSvg(x)} y={normalizedSvg(y) - 10} fill={color} stroke="none" className="select-none text-[28px] font-semibold">{text}</text>}</g>;
      if (item.type === "circle") return <ellipse key={item.id} cx={(normalizedSvg(x) + normalizedSvg(endX)) / 2} cy={(normalizedSvg(y) + normalizedSvg(endY)) / 2} rx={Math.max(4, Math.abs(normalizedSvg(endX) - normalizedSvg(x)) / 2)} ry={Math.max(4, Math.abs(normalizedSvg(endY) - normalizedSvg(y)) / 2)} fill="none" {...common} />;
      if (item.type === "highlight") return <rect key={item.id} x={Math.min(normalizedSvg(x), normalizedSvg(endX))} y={Math.min(normalizedSvg(y), normalizedSvg(endY))} width={Math.max(5, Math.abs(normalizedSvg(endX) - normalizedSvg(x)))} height={Math.max(5, Math.abs(normalizedSvg(endY) - normalizedSvg(y)))} fill={color} fillOpacity="0.18" {...common} />;
      return <g key={item.id} onPointerDown={(event) => { event.stopPropagation(); onSelect(item.id); setDrag({ id: item.id, x: event.clientX, y: event.clientY }); event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={(event) => { if (!drag || drag.id !== item.id) return; const bounds = event.currentTarget.ownerSVGElement?.getBoundingClientRect(); if (!bounds) return; const dx = (event.clientX - drag.x) / bounds.width; const dy = (event.clientY - drag.y) / bounds.height; if (dx || dy) { onMove(item.id, dx, dy); setDrag({ id: item.id, x: event.clientX, y: event.clientY }); } }} onPointerUp={() => setDrag(null)} style={{ cursor: "move" }}><circle cx={normalizedSvg(x)} cy={normalizedSvg(y)} r="7" fill={color} stroke="#fff" strokeWidth="2" vectorEffect="non-scaling-stroke"/><text x={normalizedSvg(x) + 12} y={normalizedSvg(y) - 8} fill={color} stroke="#111" strokeWidth="1" paintOrder="stroke" className="select-none text-[30px] font-semibold">{text}</text></g>;
    })}
  </svg>;
}

export function ScreenshotStudio({ apiRef, caseId, revisionId, caseTitle }: { apiRef: React.MutableRefObject<ViewportApi | null>; caseId: string | null; revisionId: string | null; caseTitle: string }) {
  const { locale, t } = useI18n();
  const tx = useCallback((key: Parameters<typeof translateWorkspace>[1], values?: Record<string, string | number>) => translateWorkspace(locale, key, values), [locale]);
  const [open, setOpen] = useState(false);
  const [records, setRecords] = useState<SavedScreenshot[]>([]);
  const [record, setRecord] = useState<ImageRecord | null>(null);
  const [annotations, setAnnotations] = useState<ScreenshotAnnotation[]>([]);
  const [tool, setTool] = useState<Tool>("select");
  const [color, setColor] = useState<string>(ANNOTATION_COLORS[0]);
  const [text, setText] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const selected = useMemo(() => annotations.find((item) => item.id === selectedId) ?? null, [annotations, selectedId]);
  useEffect(() => {
    if (!record) return;
    let url: string | null = null; let active = true;
    void Promise.resolve().then(() => { if (!active) return; url = URL.createObjectURL(record.blob); setImageUrl(url); });
    return () => { active = false; if (url) URL.revokeObjectURL(url); };
  }, [record]);

  const openStudio = useCallback(async () => {
    setOpen(true); setMessage(""); setRecords([]); setRecord(null); setAnnotations([]);
    if (!caseId) return;
    try { setRecords(await listCaseScreenshots(caseId)); }
    catch { setMessage(tx("screenshotLoadingFailed")); }
  }, [caseId, tx]);
  useEffect(() => { if (!open) return; const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); setRecord(null); } }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [open]);

  const capture = async () => {
    setBusy(true); setMessage("");
    try {
      const shot = await apiRef.current?.capture();
      if (!shot) throw new Error("not_ready");
      if (shot.blob.type !== "image/webp" || shot.blob.size > MAX_SCREENSHOT_BYTES) throw new Error("format");
      if (shot.width < 1 || shot.height < 1 || shot.width > 8192 || shot.height > 8192) throw new Error("dimensions");
      setRecord({ ...shot, id: newId(), saved: false, revisionId, createdAt: new Date().toISOString() });
      setAnnotations([]); setSelectedId(null); setTool("select");
    } catch (error) { setMessage(error instanceof Error && error.message === "format" ? tx("screenshotFormatLimit") : error instanceof Error && error.message === "dimensions" ? tx("screenshotDimensionLimit") : tx("screenshotCaptureFailed")); }
    finally { setBusy(false); }
  };

  const openSaved = async (item: SavedScreenshot) => {
    setBusy(true); setMessage("");
    try {
      const blob = await loadScreenshotImage(item.asset.object_path);
      const bitmap = await createImageBitmap(blob); const { width, height } = bitmap; bitmap.close();
      setRecord({ id: item.id, blob, width, height, camera: item.camera_state as unknown as CameraSnapshot, saved: true, path: item.asset.object_path, revisionId: item.revision_id, createdAt: item.created_at });
      setAnnotations(item.annotations); setSelectedId(null); setTool("select");
    } catch { setMessage(tx("screenshotOpenFailed")); }
    finally { setBusy(false); }
  };

  const updateAnnotation = (id: string, transform: (item: ScreenshotAnnotation) => ScreenshotAnnotation) => setAnnotations((items) => items.map((item) => item.id === id ? transform(item) : item));
  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (tool === "select" || !record) return;
    event.stopPropagation();
    const point = normalizedPoint(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
    if (tool === "text") {
      const content = text.trim();
      if (!content) { setMessage(tx("enterShortNote")); return; }
      if (content.length > MAX_ANNOTATION_TEXT) { setMessage(tx("textCharacterLimit", { count: MAX_ANNOTATION_TEXT })); return; }
      const annotation = { id: newId(), type: "text" as const, payload: { ...point, text: content, color }, createdAt: new Date().toISOString() };
      setAnnotations((items) => [...items, annotation]); setSelectedId(annotation.id); setText(""); return;
    }
    setStartPoint(point); event.currentTarget.setPointerCapture(event.pointerId);
  };
  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!startPoint || tool === "select" || tool === "text") return;
    const end = normalizedPoint(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
    if (annotations.length >= MAX_ANNOTATIONS) { setMessage(tx("annotationLimit", { count: MAX_ANNOTATIONS })); setStartPoint(null); return; }
    const annotation: ScreenshotAnnotation = { id: newId(), type: tool, payload: { ...startPoint, endX: end.x, endY: end.y, color, visible: true }, createdAt: new Date().toISOString() };
    try { validateAnnotations([...annotations, annotation]); setAnnotations((items) => [...items, annotation]); setSelectedId(annotation.id); }
    catch { setMessage(tx("annotationAddFailed")); }
    setStartPoint(null);
  };

  const saveNew = async () => {
    if (!record || !caseId) return;
    setBusy(true); setMessage("");
    try {
      const result = await saveScreenshot({ caseId, revisionId: record.revisionId, id: record.id, blob: record.blob, width: record.width, height: record.height, camera: record.camera, annotations });
      setRecord((previous) => previous ? { ...previous, saved: true, path: result.path } : previous);
      setRecords(await listCaseScreenshots(caseId)); setMessage(tx("screenshotSaved"));
    } catch { setMessage(tx("screenshotSaveFailed")); }
    finally { setBusy(false); }
  };
  const saveEdits = async () => {
    if (!record?.saved) return;
    setBusy(true); setMessage("");
    try { await replaceScreenshotAnnotations(record.id, annotations); if (caseId) setRecords(await listCaseScreenshots(caseId)); setMessage(tx("annotationsSaved")); }
    catch { setMessage(tx("annotationsSaveFailed")); }
    finally { setBusy(false); }
  };
  const downloadRaw = () => {
    if (!record) return;
    const url = URL.createObjectURL(record.blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `prostheia-screenshot-${record.id}.webp`; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const downloadAnnotated = async () => {
    if (!record) return;
    setBusy(true);
    try {
      const bitmap = await createImageBitmap(record.blob); const canvas = document.createElement("canvas"); canvas.width = record.width; canvas.height = record.height;
      const context = canvas.getContext("2d"); if (!context) throw new Error(tx("annotatedRenderFailed"));
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height); bitmap.close();
      for (const item of annotations.filter((entry) => entry.payload.visible !== false)) {
        const { x, y, endX = x, endY = y, color: ink, text: note } = item.payload; const x1 = x * canvas.width, y1 = y * canvas.height, x2 = endX * canvas.width, y2 = endY * canvas.height;
        context.strokeStyle = ink; context.fillStyle = ink; context.lineWidth = Math.max(2, canvas.width / 500); context.font = `600 ${Math.max(18, canvas.width / 45)}px sans-serif`;
        if (item.type === "arrow") { const a = Math.atan2(y2 - y1, x2 - x1), head = Math.max(10, canvas.width / 60); context.beginPath(); context.moveTo(x1, y1); context.lineTo(x2, y2); context.stroke(); context.beginPath(); context.moveTo(x2, y2); context.lineTo(x2 - head * Math.cos(a - Math.PI / 6), y2 - head * Math.sin(a - Math.PI / 6)); context.lineTo(x2 - head * Math.cos(a + Math.PI / 6), y2 - head * Math.sin(a + Math.PI / 6)); context.closePath(); context.fill(); if (note) context.fillText(note, x1, y1 - 8); }
        else if (item.type === "circle") { context.beginPath(); context.ellipse((x1 + x2) / 2, (y1 + y2) / 2, Math.max(3, Math.abs(x2 - x1) / 2), Math.max(3, Math.abs(y2 - y1) / 2), 0, 0, Math.PI * 2); context.stroke(); }
        else if (item.type === "highlight") { context.globalAlpha = 0.22; context.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1)); context.globalAlpha = 1; context.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1)); }
        else { context.beginPath(); context.arc(x1, y1, Math.max(5, canvas.width / 250), 0, Math.PI * 2); context.fill(); context.lineWidth = 2; context.strokeStyle = "#ffffff"; context.stroke(); context.fillStyle = ink; context.fillText(note ?? "", x1 + 14, y1 - 8); }
      }
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error(tx("imageExportFailed"))), "image/png"));
      const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = `prostheia-annotated-${record.id}.png`; anchor.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setMessage(tx("annotatedExportFailed")); }
    finally { setBusy(false); }
  };

  const closeEditor = () => { setRecord(null); setAnnotations([]); setOpen(false); };
  return <>
    <Button variant="outline" size="sm" className="h-6 gap-1 px-2 text-[9px]" onClick={() => void openStudio()}><Camera className="size-3" />{tx("screenshots")}</Button>
    {open && <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4" onPointerDown={(event) => { if (event.target === event.currentTarget) closeEditor(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="screenshot-studio-title" className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-2xl">
        <header className="flex items-center justify-between border-b border-border px-4 py-3"><div><p className="page-eyebrow">{t("workspace").toUpperCase()}</p><h2 id="screenshot-studio-title" className="text-sm font-semibold">{tx("screenshotStudio")}</h2></div><button type="button" aria-label={tx("closeScreenshotStudio")} className="rounded p-1 hover:bg-muted" onClick={closeEditor}><X className="size-4"/></button></header>
        {!record ? <div className="grid min-h-64 gap-4 overflow-y-auto p-4 md:grid-cols-[220px_1fr]">
          <div className="space-y-2"><Button className="w-full" disabled={busy} onClick={() => void capture()}><Camera className="mr-2 size-4"/>{tx("captureViewport")}</Button><p className="text-[10px] leading-4 text-muted-foreground">{tx("captureDescription")}</p>{!caseId && <p className="text-[10px] text-amber-700 dark:text-amber-300">{tx("unsavedScreenshotCase")}</p>}</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{records.map((item) => <SavedScreenshotCard key={item.id} item={item} caseTitle={caseTitle} locale={locale} onOpen={() => void openSaved(item)}/>)}{records.length === 0 && caseId && <p className="text-xs text-muted-foreground">{tx("noScreenshots")}</p>}</div>
        </div> : <>
          <div className="flex flex-wrap items-center gap-1.5 border-b border-border px-3 py-2">
            <Button variant={tool === "select" ? "secondary" : "ghost"} size="sm" className="h-7 px-2 text-[10px]" onClick={() => setTool("select")}>{tx("selectMove")}</Button>
            {([{ type: "arrow", icon: ArrowUpRight }, { type: "circle", icon: Circle }, { type: "text", icon: MessageSquareText }, { type: "highlight", icon: Highlighter }] as const).map(({ type, icon: Icon }) => <Button key={type} variant={tool === type ? "secondary" : "ghost"} size="sm" className="h-7 gap-1 px-2 text-[10px]" onClick={() => { setTool(type); if (type === "text") { setSelectedId(null); setText(""); } }}><Icon className="size-3.5"/>{tx(type)}</Button>)}
            {(tool === "text" || selected?.type === "text") && <input value={selected?.type === "text" ? selected.payload.text ?? "" : text} onChange={(event) => { const value = event.currentTarget.value.slice(0, MAX_ANNOTATION_TEXT); if (selected?.type === "text") updateAnnotation(selected.id, (item) => ({ ...item, payload: { ...item.payload, text: value } })); else setText(value); }} maxLength={MAX_ANNOTATION_TEXT} placeholder={tx("shortNote")} aria-label={tx("textAnnotation")} className="h-7 w-40 rounded border border-input bg-background px-2 text-[10px]"/>}
            <div className="flex items-center gap-1 pl-1" aria-label={tx("annotationColor")}>{ANNOTATION_COLORS.map((swatch) => <button key={swatch} type="button" aria-label={tx("chooseColor", { color: swatch })} aria-pressed={color === swatch} onClick={() => setColor(swatch)} className={`size-5 rounded-full border ${color === swatch ? "ring-2 ring-primary ring-offset-1" : "border-border"}`} style={{ backgroundColor: swatch }}/>)}</div>
            <span className="ml-auto flex gap-1"><Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[10px]" disabled={!selected} onClick={() => selected && updateAnnotation(selected.id, (item) => ({ ...item, payload: { ...item.payload, visible: item.payload.visible === false } }))}>{selected?.payload.visible === false ? <Eye className="size-3"/> : <EyeOff className="size-3"/>}{tx("visibility")}</Button><Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-[10px] text-destructive" disabled={!selected} onClick={() => { setAnnotations((items) => items.filter((item) => item.id !== selectedId)); setSelectedId(null); }}><Trash2 className="size-3"/>{tx("deleteAnnotation")}</Button></span>
          </div>
          <div className="min-h-0 flex-1 overflow-auto bg-muted/40 p-3"><div className="relative mx-auto overflow-hidden bg-black" style={{ aspectRatio: `${record.width} / ${record.height}`, maxHeight: "62vh", width: "100%", maxWidth: `${62 * record.width / record.height}vh` }} onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}>
            {imageUrl && <Image src={imageUrl} alt={tx("capturedCadViewport")} fill unoptimized className="select-none object-fill" draggable={false}/>}
            <AnnotationShapes items={annotations} selected={selectedId} onSelect={setSelectedId} onMove={(id, dx, dy) => updateAnnotation(id, (item) => moveAnnotation(item, dx, dy))} locale={locale}/>
          </div></div>
          <footer className="flex flex-wrap items-center gap-2 border-t border-border px-3 py-2.5"><span className="mr-auto text-[10px] text-muted-foreground">{tx("screenshotWidthHeight", { width: record.width, height: record.height })} · {annotations.length}/{MAX_ANNOTATIONS} {tx("annotations")} {record.revisionId ? `· ${tx("revision")} ${record.revisionId.slice(0, 8)}` : `· ${tx("unsavedCaseView")}`}</span><Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-[10px]" onClick={downloadRaw}><ArrowDownToLine className="size-3"/>{tx("rawImage")}</Button><Button variant="outline" size="sm" className="h-7 gap-1 px-2 text-[10px]" disabled={busy} onClick={() => void downloadAnnotated()}><ArrowDownToLine className="size-3"/>{tx("annotatedPng")}</Button>{record.saved ? <Button size="sm" className="h-7 gap-1 px-2 text-[10px]" disabled={busy} onClick={() => void saveEdits()}><Save className="size-3"/>{tx("saveAnnotations")}</Button> : caseId && <Button size="sm" className="h-7 gap-1 px-2 text-[10px]" disabled={busy} onClick={() => void saveNew()}><Save className="size-3"/>{tx("saveToCase")}</Button>}<Button variant="ghost" size="sm" className="h-7 px-2 text-[10px]" onClick={() => { setRecord(null); setAnnotations([]); setMessage(""); }}>{tx("back")}</Button></footer>
        </>}
        {message && <p role="status" className="border-t border-border px-4 py-2 text-[10px] text-muted-foreground">{message}</p>}
      </section>
    </div>}
  </>;
}
