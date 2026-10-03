import { AppShell } from "@/components/app-shell";
import { requireAdminUser } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AdminHeading, AdminNav } from "../../admin-nav";
import { LessonEditor } from "../lesson-editor";

export default async function NewAdminLessonPage() {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  const [modules, toolRows, platformAssets, models] = await Promise.all([
    supabase.from("practice_modules").select("id, slug, title_en, title_sr").order("sort_order"),
    supabase.from("tool_definitions").select("id, label_en, label_sr").eq("status", "published").order("category"),
    supabase.from("assets").select("id, original_filename, status").eq("scope", "platform").eq("kind", "model").eq("status", "ready"),
    supabase.from("model_assets").select("asset_id, default_role, technical_metadata"),
  ]);
  const modelMap = new Map((models.data ?? []).map((row) => [row.asset_id, row]));
  const assets = (platformAssets.data ?? []).map((asset) => { const model = modelMap.get(asset.id); const metadata = model?.technical_metadata && typeof model.technical_metadata === "object" ? model.technical_metadata as Record<string, unknown> : {}; return { id: asset.id, name: typeof metadata.displayName === "string" ? metadata.displayName : asset.original_filename ?? asset.id, role: model?.default_role ?? "other" }; });
  return <AppShell active="Admin"><AdminHeading eyebrow="PRACTICE CONTENT" title="New lesson" description="Start with a draft. Publication validates required content."/><AdminNav/><LessonEditor modules={modules.data ?? []} tools={toolRows.data ?? []} assets={assets}/></AppShell>;
}
