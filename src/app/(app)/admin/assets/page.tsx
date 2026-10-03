import { AppShell } from "@/components/app-shell";
import { requireAdminUser } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AdminCopy, AdminHeading, AdminNav, AdminNotice } from "../admin-nav";
import { AssetUploader } from "./asset-uploader";

export default async function AdminAssetsPage() {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  const [{ data: assets, error }, { data: models }, { data: licenses }] = await Promise.all([
    supabase.from("assets").select("*").eq("scope", "platform").order("created_at", { ascending: false }),
    supabase.from("model_assets").select("*"),
    supabase.from("asset_licenses").select("*"),
  ]);
  const modelMap = new Map((models ?? []).map((model) => [model.asset_id, model]));
  const licenseMap = new Map((licenses ?? []).map((license) => [license.asset_id, license]));
  const reviewCount = (assets ?? []).filter((asset) => { const license = licenseMap.get(asset.id); return !license || license.commercial_use_allowed !== true || (!license.license_name && !license.source_url); }).length;
  return <AppShell active="Admin"><AdminHeading eyebrow="PLATFORM CONTENT" title="Assets and licenses" description="Register models in the platform asset registry and private Storage bucket."/><AdminNav/><p className="mb-3 text-xs text-muted-foreground">{assets?.length ?? 0} platform assets · {reviewCount} requiring license/provenance review</p><AssetUploader/>{error ? <div className="mt-4"><AdminNotice text="Unable to load platform assets." /></div> : <section className="app-surface mt-5 divide-y divide-border"><h2 className="p-4 text-sm font-semibold"><AdminCopy text="Registered platform assets" /></h2>{(assets ?? []).length ? assets!.map((asset) => {
    const model = modelMap.get(asset.id); const license = licenseMap.get(asset.id);
    const technical = model?.technical_metadata && typeof model.technical_metadata === "object" ? model.technical_metadata as Record<string, unknown> : {};
    const name = typeof technical.displayName === "string" ? technical.displayName : asset.original_filename ?? asset.id;
    const review = !license || license.commercial_use_allowed !== true || (!license.license_name && !license.source_url);
    return <article key={asset.id} className="flex flex-wrap items-start gap-3 p-4"><span className="min-w-0 flex-1"><strong className="block truncate text-xs">{name}</strong><span className="mt-1 block text-[10px] text-muted-foreground">{model?.format?.toUpperCase() ?? "Unknown format"} · {model?.default_role ?? "role not set"} · {asset.status} · {Math.round((asset.byte_size ?? 0) / 1024 / 1024)} MB</span><span className="mt-1 block text-[10px] text-muted-foreground">{license?.license_name ?? "License metadata missing"}{license?.source_url ? ` · ${license.source_url}` : ""}{license?.attribution_text ? ` · ${license.attribution_text}` : ""}</span></span><span className={`rounded-full border px-2 py-1 text-[9px] uppercase ${review ? "border-amber-500/35 text-amber-700" : "border-emerald-600/30 text-emerald-700"}`}>{review ? "Review provenance" : "License recorded"}</span></article>;
  }) : <p className="p-4 text-xs text-muted-foreground"><AdminCopy text="No platform assets uploaded yet." /></p>}</section>}</AppShell>;
}
