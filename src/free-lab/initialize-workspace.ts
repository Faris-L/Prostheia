import { importModel } from "@/cad/import/import-model";
import { geometryRegistry } from "@/cad/scene/geometry-registry";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import type { CadObjectMetadata } from "@/cad/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { createScenarioAssetFiles } from "./scenario-assets";
import { FREE_LAB_SCENARIOS } from "./scenarios";
import type { FreeLabWorkspaceConfig } from "./types";
import { createCrownCase } from "@/cad/crown/case";
import { createDentureCase } from "@/cad/denture/case";
import { createRestorativeCase } from "@/cad/restorative/case";
import { createPartialDentureCase } from "@/cad/partial-denture/case";
import type { KennedyClass } from "@/cad/partial-denture/types";
import { createBiteSplintCase } from "@/cad/splint/case";
import { createDigitalModelCase } from "@/cad/digital-model/case";
import { createArticulatorCase } from "@/cad/articulator/case";
import { createImplantCase } from "@/cad/implant/case";
import { findCasePackageForScenarioSlug } from "@/cad/case-packages/registry";
import { loadCasePackage, loadRegisteredCasePackage } from "@/cad/case-packages/loader";

export async function initializeFreeLabWorkspace(config: FreeLabWorkspaceConfig) {
  const selectedScenario = FREE_LAB_SCENARIOS.find((entry) => entry.id === config.scenarioId);
  const casePackage = config.casePackage ?? selectedScenario?.casePackage;
  const casePackageId = config.casePackageId ?? casePackage?.packageId
    ?? findCasePackageForScenarioSlug(selectedScenario?.slug ?? config.scenarioId ?? "")?.packageId;
  if ((config.origin === "scenario" || config.origin === "random") && casePackage) {
    return (await loadCasePackage(casePackage, { mode: "free-lab", checkpointId: config.checkpointId ?? selectedScenario?.startingCheckpointId })).ids;
  }
  if ((config.origin === "scenario" || config.origin === "random") && casePackageId) {
    return (await loadRegisteredCasePackage(casePackageId, { mode: "free-lab", checkpointId: config.checkpointId })).ids;
  }
  geometryRegistry.clear();
  useWorkspaceStore.getState().initializeWorkspace("free-lab");
  if (config.origin !== "scenario" && config.origin !== "random") return [];
  if (config.caseInitializer === "articulator" || FREE_LAB_SCENARIOS.find((entry) => entry.id === config.scenarioId)?.caseInitializer === "articulator") return createArticulatorCase("free-lab");
  if (config.caseInitializer === "implant" || FREE_LAB_SCENARIOS.find((entry) => entry.id === config.scenarioId)?.caseInitializer === "implant" || config.category === "implant") return createImplantCase("free-lab");
  if (config.category === "crown") return createCrownCase("free-lab");
  if (config.category === "complete_denture") return createDentureCase("free-lab");
  if (config.category === "bite_splint") return createBiteSplintCase("free-lab");
  if (config.category === "digital_model") return createDigitalModelCase("free-lab");
  if (config.category === "partial_denture") {
    const scenario = FREE_LAB_SCENARIOS.find((entry) => entry.id === config.scenarioId);
    const kennedyClass = (config.partialDentureClass ?? scenario?.partialDentureClass ?? "I") as KennedyClass;
    return createPartialDentureCase(kennedyClass, "free-lab");
  }
  if (config.restorationType) return createRestorativeCase(config.restorationType, "free-lab");

  const scenario = FREE_LAB_SCENARIOS.find((entry) => entry.id === config.scenarioId);
  const assets = config.scenarioAssets ?? scenario?.assets;
  if (!assets) throw new Error("This scenario is no longer available. Return to Free Lab and choose a published case.");
  const syntheticFiles = scenario && !config.scenarioAssets?.some((asset) => asset.bucket && asset.path) ? createScenarioAssetFiles(scenario) : [];
  const storage = createBrowserSupabaseClient();
  const metadata: CadObjectMetadata[] = [];
  const failures: string[] = [];
  for (let index = 0; index < assets.length; index += 1) {
    const reference = assets[index];
    let file = syntheticFiles[index];
    if (reference.bucket && reference.path) {
      const { data, error } = await storage.storage.from(reference.bucket).download(reference.path);
      if (error || !data) { if (reference.required) failures.push(reference.label); continue; }
      file = new File([data], reference.label, { type: data.type || "application/octet-stream" });
    }
    if (!file) { if (reference.required) failures.push(reference.label); continue; }
    try {
      const result = await importModel({ file, role: reference.role, unit: reference.unit ?? "unknown" });
      result.name = reference.label;
      geometryRegistry.register({ id: result.id, role: result.role, name: result.name, object: result.object, ownsResources: true });
      const object = { id: result.id, name: result.name, role: result.role, editable: true, transform: { position: [0, 0, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], scale: [1, 1, 1] as [number, number, number] }, visible: true, opacity: 1, importSource: result.metadata };
      useWorkspaceStore.getState().addImportedObject(object);
      metadata.push(object);
    } catch (error) {
      if (reference.required) failures.push(reference.label);
      console.error("Synthetic scenario asset could not be loaded.", error);
    }
  }
  if (failures.length) throw new Error(`Some supplied scenario files could not be loaded: ${failures.join(", ")}.`);
  return metadata.map((object) => object.id);
}
