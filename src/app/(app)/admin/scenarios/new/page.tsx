import { AppShell } from "@/components/app-shell";
import { requireAdminUser } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AdminHeading, AdminNav } from "../../admin-nav";
import { emptyScenario, ScenarioEditor } from "../scenario-editor";

export default async function NewScenarioPage() {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  const [{ data: domains }, { data: assets }, { data: models }] = await Promise.all([
    supabase.from("content_domains").select("id, slug, name_en, name_sr, status").order("sort_order"),
    supabase.from("assets").select("id, original_filename, status, scope, kind").eq("scope", "platform").eq("kind", "model").order("created_at", { ascending: false }),
    supabase.from("model_assets").select("asset_id, default_role"),
  ]);
  const roles = new Map((models ?? []).map((row) => [row.asset_id, row.default_role ?? "other"]));
  const options = (assets ?? []).map((asset) => ({ id: asset.id, name: asset.original_filename ?? asset.id, status: asset.status, role: roles.get(asset.id) ?? "other" }));
  return <AppShell active="Admin"><AdminHeading eyebrow="FREE LAB CONTENT" title="New synthetic scenario" description="Draft case brief. Do not enter identifiable patient information."/><AdminNav/><ScenarioEditor initial={emptyScenario(domains?.[0]?.id ?? "")} domains={domains ?? []} assets={options}/></AppShell>;
}
