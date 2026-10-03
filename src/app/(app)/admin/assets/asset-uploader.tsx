"use client";
import { useInterfaceCopy } from "@/lib/i18n";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
import { geometryRegistry } from "@/cad/scene/geometry-registry";
import { importModel } from "@/cad/import/import-model";
import type { CadObjectRole } from "@/cad/types";

const roles = ["maxilla", "mandible", "antagonist", "preop", "prepared_tooth", "tooth", "crown", "bridge", "pontic", "denture_tooth", "denture_base", "framework", "splint", "implant", "abutment", "model_base", "reference", "scan", "other"];
const MAX_ASSET_FILE_BYTES = 128 * 1024 * 1024;

export function AssetUploader() {
  const tx = useInterfaceCopy();
  const router = useRouter();
  const validationAbort = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [kind, setKind] = useState("synthetic");
  const [file, setFile] = useState<File | null>(null);
  const [role, setRole] = useState("maxilla");
  const [unit, setUnit] = useState<"mm" | "cm" | "m" | "unknown">("mm");
  const [displayName, setDisplayName] = useState("");
  const [licenseName, setLicenseName] = useState("Synthetic, created for Prostheia training");
  const [sourceUrl, setSourceUrl] = useState("");
  const [attribution, setAttribution] = useState("");
  const [commercial, setCommercial] = useState(true);
  const [modify, setModify] = useState(true);
  const [redistribute, setRedistribute] = useState(true);
  useEffect(() => () => validationAbort.current?.abort(), []);
  const upload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError("");
    if (!file) { setError("Choose a model file first."); return; }
    if (file.size === 0) { setError("The selected file is empty."); return; }
    if (file.size > MAX_ASSET_FILE_BYTES) { setError("Model files must be 128 MB or smaller."); return; }
    const extension = file.name.split(".").pop()?.toLowerCase();
    if (!extension || !["stl", "obj", "ply", "glb"].includes(extension)) { setError("Use a supported STL, OBJ, PLY, or GLB model file."); return; }
    if (!displayName.trim() || !licenseName.trim()) { setError("Display name and provenance/license are required."); return; }
    if (kind !== "synthetic" && !sourceUrl.trim()) { setError("Add the source link for externally sourced assets."); return; }
    setBusy(true);
    const controller = new AbortController();
    validationAbort.current = controller;
    let parsedModel: Awaited<ReturnType<typeof importModel>>;
    try {
      parsedModel = await importModel({ file, role: role as CadObjectRole, unit }, undefined, controller.signal);
    } catch {
      if (!controller.signal.aborted) { setBusy(false); setError("The file contents could not be validated as supported dental geometry."); }
      if (validationAbort.current === controller) validationAbort.current = null;
      return;
    }
    geometryRegistry.disposeObject(parsedModel.object);
    if (controller.signal.aborted) { setBusy(false); return; }
    if (validationAbort.current === controller) validationAbort.current = null;
    const supabase = createBrowserSupabaseClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) { setBusy(false); setError("Sign in again before uploading platform content."); return; }
    const assetId = crypto.randomUUID();
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `platform/${assetId}/${cleanName}`;
    const { error: uploadError } = await supabase.storage.from("practice-assets").upload(path, file, { upsert: false, contentType: file.type || "application/octet-stream" });
    if (uploadError) { setBusy(false); setError("Storage upload failed: Check the file and try again."); return; }
    const metadataResult = await supabase.from("assets").insert({ id: assetId, scope: "platform", visibility: "authenticated", kind: "model", bucket_id: "practice-assets", object_path: path, original_filename: file.name, mime_type: file.type || null, byte_size: file.size, status: "ready", created_by: authData.user.id }).select("id").single();
    if (metadataResult.error) { await supabase.storage.from("practice-assets").remove([path]); setBusy(false); setError("Asset registry entry could not be saved."); return; }
    const modelResult = await supabase.from("model_assets").insert({ asset_id: assetId, format: extension as "stl" | "obj" | "ply" | "glb", default_role: role as never, source_unit: unit, technical_metadata: { displayName: displayName.trim(), provenance: kind } });
    if (modelResult.error) { await supabase.from("assets").delete().eq("id", assetId); await supabase.storage.from("practice-assets").remove([path]); setBusy(false); setError("Model metadata could not be saved."); return; }
    const licenseResult = await supabase.from("asset_licenses").insert({ asset_id: assetId, license_name: licenseName.trim(), source_url: sourceUrl.trim() || null, attribution_text: attribution.trim() || null, commercial_use_allowed: commercial, modification_allowed: modify, redistribution_allowed: redistribute, verified_at: new Date().toISOString(), verified_by: authData.user.id });
    if (licenseResult.error) { await supabase.from("assets").delete().eq("id", assetId); await supabase.storage.from("practice-assets").remove([path]); setBusy(false); setError("License metadata could not be saved."); return; }
    const auditResult = await supabase.rpc("record_admin_content_audit", { p_action: "create", p_entity_type: "asset", p_entity_id: assetId, p_metadata: { format: extension } });
    if (auditResult.error) console.warn("Asset was saved, but its audit row failed.", auditResult.error.message);
    setBusy(false); setFile(null); setDisplayName(""); router.refresh();
  };
  return <form onSubmit={(event) => void upload(event)} className="app-surface grid gap-3 p-5 md:grid-cols-2">
    <h2 className="text-sm font-semibold md:col-span-2">{tx("Upload platform model")}</h2>
    <p className="text-[10px] leading-5 text-muted-foreground md:col-span-2">{tx("The browser uploads directly to the private practice-assets bucket. Do not upload proprietary exocad, 3Shape, or Medit libraries, unclear-license tooth libraries, or identifiable patient data.")}</p>
    <label className="text-[10px] text-muted-foreground">{tx("Model file")}<input type="file" accept=".stl,.obj,.ply,.glb" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="mt-1 block w-full text-xs" /></label>
    <label className="text-[10px] text-muted-foreground">{tx("Display name")}<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="mt-1 block h-9 w-full rounded-md border border-input bg-background px-2 text-xs" /></label>
    <label className="text-[10px] text-muted-foreground">{tx("Provenance kind")}<select value={kind} onChange={(event) => setKind(event.target.value)} className="mt-1 block h-9 w-full rounded-md border border-input bg-background px-2 text-xs"><option value="synthetic">{tx("Synthetic training model")}</option><option value="internal">{tx("Internally created")}</option><option value="public_domain">{tx("Public domain")}</option><option value="open_license">{tx("Open/permissive license")}</option><option value="commercial_license">{tx("Commercially compatible license")}</option></select></label>
    <label className="text-[10px] text-muted-foreground">{tx("License / provenance description")}<input value={licenseName} onChange={(event) => setLicenseName(event.target.value)} className="mt-1 block h-9 w-full rounded-md border border-input bg-background px-2 text-xs" /></label>
    <label className="text-[10px] text-muted-foreground">{tx("Source URL (required for external assets)")}<input value={sourceUrl} onChange={(event) => setSourceUrl(event.target.value)} className="mt-1 block h-9 w-full rounded-md border border-input bg-background px-2 text-xs" /></label>
    <label className="text-[10px] text-muted-foreground">{tx("Attribution")}<input value={attribution} onChange={(event) => setAttribution(event.target.value)} className="mt-1 block h-9 w-full rounded-md border border-input bg-background px-2 text-xs" /></label>
    <label className="text-[10px] text-muted-foreground">{tx("Default object role")}<select value={role} onChange={(event) => setRole(event.target.value)} className="mt-1 block h-9 w-full rounded-md border border-input bg-background px-2 text-xs">{roles.map((item) => <option key={item}>{item}</option>)}</select></label>
    <label className="text-[10px] text-muted-foreground">{tx("Source unit")}<select value={unit} onChange={(event) => setUnit(event.target.value as typeof unit)} className="mt-1 block h-9 w-full rounded-md border border-input bg-background px-2 text-xs">{["mm", "cm", "m", "unknown"].map((item) => <option key={item}>{item}</option>)}</select></label>
    <fieldset className="flex flex-wrap gap-3 text-[10px] text-muted-foreground md:col-span-2"><legend>{tx("Record declared license permissions; confirm these from source materials.")}</legend>{[["Commercial use allowed", commercial, setCommercial], ["Modification allowed", modify, setModify], ["Redistribution allowed", redistribute, setRedistribute]].map(([label, checked, setter]) => <label key={String(label)} className="flex items-center gap-1"><input type="checkbox" checked={checked as boolean} onChange={(event) => (setter as (value: boolean) => void)(event.target.checked)} />{String(label)}</label>)}</fieldset>
    {error && <p role="alert" className="text-xs text-destructive md:col-span-2">{tx(error)}</p>}
    <div className="md:col-span-2"><Button type="submit" disabled={busy}>{tx(busy ? "Validating and uploading model…" : "Upload and register model")}</Button></div>
  </form>;
}
