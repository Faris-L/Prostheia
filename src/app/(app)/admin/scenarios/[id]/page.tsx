import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { requireAdminUser } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AdminHeading, AdminNav } from "../../admin-nav";
import { ScenarioEditor, emptyScenario } from "../scenario-editor";

export default async function ScenarioEditorPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminUser();
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const [{ data: scenario }, { data: domains }, { data: assets }, { data: models }, { data: assetLinks }] = await Promise.all([
    supabase.from("scenarios").select("*").eq("id", id).maybeSingle(),
    supabase.from("content_domains").select("id, slug, name_en, name_sr, status").order("sort_order"),
    supabase.from("assets").select("id, original_filename, status, scope, kind").eq("scope", "platform").eq("kind", "model").order("created_at", { ascending: false }),
    supabase.from("model_assets").select("asset_id, default_role"),
    supabase.from("scenario_assets").select("asset_id, object_role, required").eq("scenario_id", id),
  ]);
  if (!scenario) notFound();
  const metadata = scenario.additional_metadata && typeof scenario.additional_metadata === "object" ? scenario.additional_metadata as Record<string, unknown> : {};
  const storedMaterial = metadata.material && typeof metadata.material === "object" ? metadata.material as { en?: string; sr?: string } : {};
  const storedSupplied = metadata.supplied && typeof metadata.supplied === "object" ? metadata.supplied as { en?: string[]; sr?: string[] } : {};
  const storedNotes = metadata.notes && typeof metadata.notes === "object" ? metadata.notes as { en?: string; sr?: string } : {};
  const base = emptyScenario(scenario.domain_id);
  const caseInitializer = metadata.caseInitializer === "implant" || metadata.caseInitializer === "articulator" ? metadata.caseInitializer as "implant" | "articulator" : undefined;
  const initial = { ...base, id: scenario.id, updatedAt: scenario.updated_at, slug: scenario.slug, title: { en: scenario.title_en, sr: scenario.title_sr }, description: { en: scenario.description_en ?? "", sr: scenario.description_sr ?? "" }, difficulty: scenario.difficulty, caseInitializer, restorationType: ["crown", "bridge", "inlay", "onlay", "veneer"].includes(String(metadata.restorationType)) ? metadata.restorationType as "crown" | "bridge" | "inlay" | "onlay" | "veneer" : undefined, patientCode: scenario.patient_code ?? "", age: scenario.patient_age, indication: { en: scenario.indication_en ?? "", sr: scenario.indication_sr ?? "" }, toothNumbers: scenario.tooth_numbers ?? [], material: { en: storedMaterial.en ?? "", sr: storedMaterial.sr ?? "" }, requirements: { en: scenario.requirements_en, sr: scenario.requirements_sr }, notes: { en: storedNotes.en ?? base.notes.en, sr: storedNotes.sr ?? base.notes.sr }, supplied: { en: storedSupplied.en ?? [], sr: storedSupplied.sr ?? [] }, randomEligible: scenario.random_eligible, assets: (assetLinks ?? []).map((link) => ({ assetId: link.asset_id, role: link.object_role, required: link.required })) };
  const roleMap = new Map((models ?? []).map((row) => [row.asset_id, row.default_role ?? "other"]));
  const options = (assets ?? []).map((asset) => ({ id: asset.id, name: asset.original_filename ?? asset.id, status: asset.status, role: roleMap.get(asset.id) ?? "other" }));
  return <AppShell active="Admin"><AdminHeading eyebrow="FREE LAB CONTENT" title={scenario.title_en || "Untitled scenario"} description={`Edit ${scenario.slug} · updated ${new Date(scenario.updated_at).toLocaleString()}`} /><AdminNav/><ScenarioEditor initial={initial} domains={domains ?? []} assets={options} status={scenario.status}/></AppShell>;
}
