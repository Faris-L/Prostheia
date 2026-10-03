import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { FreeLabScenario } from "./types";
import { RESTORATION_TYPES } from "@/cad/restorative/types";
import { KENNEDY_CLASSES } from "@/cad/partial-denture/types";
import { findCasePackageForScenarioSlug, getCasePackage } from "@/cad/case-packages/registry";
import { validateCasePackage } from "@/cad/case-packages/contract";
import { BITE_SPLINT_R6_SCENARIOS, DIGITAL_MODEL_R6_SCENARIOS, PARTIAL_DENTURE_R5_SCENARIOS, R3_FIXED_PROSTHETICS_SCENARIOS, R4_COMPLETE_DENTURE_SCENARIOS } from "./scenarios";
import { R7_IMPLANT_SCENARIOS } from "./implant-scenario";
import { resolveScenarioPackage } from "./package-resolution";

const categories = new Set(["crown", "bridge", "inlay_onlay", "veneer", "complete_denture", "partial_denture", "bite_splint", "digital_model", "implant"]);

export function mergeLocalFreeLabScenarios(databaseScenarios: readonly FreeLabScenario[]): FreeLabScenario[] {
  const localPackageScenarios = [
    ...R3_FIXED_PROSTHETICS_SCENARIOS,
    ...R4_COMPLETE_DENTURE_SCENARIOS,
    ...PARTIAL_DENTURE_R5_SCENARIOS,
    ...BITE_SPLINT_R6_SCENARIOS,
    ...DIGITAL_MODEL_R6_SCENARIOS,
    ...R7_IMPLANT_SCENARIOS,
  ];
  const localPackageIds = new Set(localPackageScenarios.flatMap((scenario) => scenario.casePackageId ? [scenario.casePackageId] : []));
  const locallyCoveredCategories = new Set(localPackageScenarios.map((scenario) => scenario.category));
  const scenariosByKey = new Map<string, FreeLabScenario>();
  for (const scenario of localPackageScenarios) {
    const key = scenario.casePackageId ? `package:${scenario.casePackageId}` : `scenario:${scenario.id}`;
    scenariosByKey.set(key, scenario);
  }
  for (const scenario of databaseScenarios) {
    if (scenario.category === "partial_denture" || scenario.category === "implant") continue;
    if (scenario.casePackageId && localPackageIds.has(scenario.casePackageId)) continue;
    if (locallyCoveredCategories.has(scenario.category) && !resolveScenarioPackage(scenario)) continue;
    const key = scenario.casePackageId ? `package:${scenario.casePackageId}` : `scenario:${scenario.id}`;
    if (!scenariosByKey.has(key)) scenariosByKey.set(key, scenario);
  }
  return [...scenariosByKey.values()];
}

export async function loadFreeLabScenarios(previewScenarioId?: string) {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.from("scenarios").select("*").eq("status", "published").order("updated_at", { ascending: false });
  if (error) throw new Error(`Free Lab scenarios could not be loaded: ${error.message}`);
  const rows = [...(data ?? [])];
  if (previewScenarioId) {
    const { data: preview, error: previewError } = await supabase.from("scenarios").select("*").eq("id", previewScenarioId).maybeSingle();
    if (previewError) throw new Error(`Scenario preview could not be loaded: ${previewError.message}`);
    if (preview && !rows.some((row) => row.id === preview.id)) rows.unshift(preview);
  }
  const results: FreeLabScenario[] = [];
  for (const row of rows) {
    const [{ data: domain }, { data: assetRows }] = await Promise.all([
      supabase.from("content_domains").select("slug").eq("id", row.domain_id).maybeSingle(),
      supabase.from("scenario_assets").select("asset_id, object_role, required, sort_order, assets(id, original_filename, bucket_id, object_path, status, model_assets(format, source_unit))").eq("scenario_id", row.id).order("sort_order"),
    ]);
    if (!domain || !categories.has(domain.slug)) continue;
    const metadata = row.additional_metadata && typeof row.additional_metadata === "object" ? row.additional_metadata as Record<string, unknown> : {};
    const material = metadata.material && typeof metadata.material === "object" ? metadata.material as { en?: string; sr?: string } : {};
    const supplied = metadata.supplied && typeof metadata.supplied === "object" ? metadata.supplied as { en?: string[]; sr?: string[] } : {};
    const notes = metadata.notes && typeof metadata.notes === "object" ? metadata.notes as { en?: string; sr?: string } : {};
    const casePackageId = typeof metadata.casePackageId === "string" ? metadata.casePackageId : findCasePackageForScenarioSlug(row.slug)?.packageId;
    const startingCheckpointId = typeof metadata.startingCheckpointId === "string" ? metadata.startingCheckpointId : undefined;
    const casePackage = metadata.casePackage && typeof metadata.casePackage === "object" ? validateCasePackage(metadata.casePackage) : undefined;
    const restorationType = RESTORATION_TYPES.includes(metadata.restorationType as (typeof RESTORATION_TYPES)[number]) ? metadata.restorationType as FreeLabScenario["restorationType"] : undefined;
    const partialDentureClass = KENNEDY_CLASSES.includes(metadata.kennedyClass as (typeof KENNEDY_CLASSES)[number]) ? metadata.kennedyClass as FreeLabScenario["partialDentureClass"] : undefined;
    const assets = (assetRows ?? []).flatMap((rowAsset) => {
      const asset = Array.isArray(rowAsset.assets) ? rowAsset.assets[0] : rowAsset.assets;
      const modelRow = asset && "model_assets" in asset ? asset.model_assets : null;
      const model = Array.isArray(modelRow) ? modelRow[0] : modelRow;
      if (!asset || asset.status !== "ready") return [];
      return [{ id: asset.id, label: asset.original_filename ?? asset.id, role: rowAsset.object_role, required: rowAsset.required, bucket: asset.bucket_id, path: asset.object_path, unit: model?.source_unit ?? "unknown" }];
    });
    results.push({
      id: row.id, slug: row.slug, title: { en: row.title_en, sr: row.title_sr }, description: { en: row.description_en ?? "", sr: row.description_sr ?? "" }, category: domain.slug as FreeLabScenario["category"], restorationType, partialDentureClass, caseInitializer: metadata.caseInitializer === "articulator" || metadata.caseInitializer === "implant" ? metadata.caseInitializer : undefined, difficulty: row.difficulty, status: row.status, randomEligible: row.random_eligible,
      brief: { patientCode: row.patient_code ?? "PT-0001", patientAge: row.patient_age ?? undefined, indication: { en: row.indication_en ?? "", sr: row.indication_sr ?? "" }, targetTeeth: row.tooth_numbers ?? [], material: { en: material.en ?? "Training preset", sr: material.sr ?? "Trening materijal" }, supplied: { en: supplied.en ?? assets.map((asset) => asset.label), sr: supplied.sr ?? assets.map((asset) => asset.label) }, requirements: { en: row.requirements_en, sr: row.requirements_sr }, notes: { en: notes.en ?? "Synthetic training case. No real patient data.", sr: notes.sr ?? "Sintetički slučaj za obuku. Nema podataka stvarnih pacijenata." } },
      assets, materialPreset: typeof metadata.materialPreset === "string" ? metadata.materialPreset : "", ...(casePackage && { casePackage }), ...(casePackageId && (getCasePackage(casePackageId) || casePackage?.packageId === casePackageId) ? { casePackageId } : casePackage ? { casePackageId: casePackage.packageId } : {}), ...(startingCheckpointId ? { startingCheckpointId } : {}),
    });
  }
  return mergeLocalFreeLabScenarios(results);
}
