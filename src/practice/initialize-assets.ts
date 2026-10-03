import { importModel } from "@/cad/import/import-model";
import { cadObjectId, type CadObjectMetadata } from "@/cad/types";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import type { PracticeLesson } from "./types";
import { geometryRegistry } from "@/cad/scene/geometry-registry";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import { createCrownCase } from "@/cad/crown/case";
import { createDentureCase } from "@/cad/denture/case";
import { createRestorativeCase } from "@/cad/restorative/case";
import { createPartialDentureCase } from "@/cad/partial-denture/case";
import { createBiteSplintCase } from "@/cad/splint/case";
import { createDigitalModelCase } from "@/cad/digital-model/case";
import { createArticulatorCase } from "@/cad/articulator/case";
import { createImplantCase } from "@/cad/implant/case";
import { findCasePackageForPracticeSetup } from "@/cad/case-packages/registry";
import { loadCasePackage, loadRegisteredCasePackage } from "@/cad/case-packages/loader";

export async function initializePracticeAssets(lesson: PracticeLesson) {
  const supabase = createBrowserSupabaseClient();
  const failures: string[] = [];
  const loaded: string[] = [];
  for (const reference of lesson.assets) {
    if (!reference.bucket || !reference.path) { if (reference.required) failures.push(reference.runtimeObjectId); continue; }
    const { data, error } = await supabase.storage.from(reference.bucket).download(reference.path);
    if (error || !data) { if (reference.required) failures.push(reference.runtimeObjectId); continue; }
    try {
      const file = new File([data], reference.name ?? reference.runtimeObjectId, { type: data.type || "application/octet-stream" });
      const result = await importModel({ file, role: reference.semanticRole as CadObjectMetadata["role"], unit: reference.unit ?? "unknown" });
      const id = cadObjectId(reference.runtimeObjectId);
      result.id = id;
      result.name = file.name;
      geometryRegistry.register({ id, role: result.role, name: result.name, object: result.object, ownsResources: true });
      useWorkspaceStore.getState().addImportedObject({ id, name: result.name, role: result.role, editable: !reference.isReference, transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] }, visible: true, opacity: 1, importSource: result.metadata });
      loaded.push(id);
    } catch (cause) {
      console.error("Practice model asset could not be initialized.", cause);
      if (reference.required) failures.push(reference.runtimeObjectId);
    }
  }
  if (failures.length) { cleanupPracticeAssets(loaded); throw new Error(`Required lesson models could not be loaded: ${failures.join(", ")}.`); }
  return loaded;
}

export async function initializePracticeLesson(lesson: PracticeLesson) {
  if (lesson.caseSetup.packageManifest) return (await loadCasePackage(lesson.caseSetup.packageManifest, { mode: "practice", checkpointId: lesson.caseSetup.checkpointId })).ids;
  const casePackage = lesson.caseSetup.casePackageId
    ? { packageId: lesson.caseSetup.casePackageId }
    : findCasePackageForPracticeSetup(lesson.caseSetup.source, lesson.caseSetup.restorationType);
  if (casePackage) return (await loadRegisteredCasePackage(casePackage.packageId, { mode: "practice", checkpointId: lesson.caseSetup.checkpointId })).ids;
  if (lesson.caseSetup.source === "crown-case") return createCrownCase("practice");
  if (lesson.caseSetup.source === "denture-case") return createDentureCase("practice");
  if (lesson.caseSetup.source === "restorative-case") return lesson.caseSetup.restorationType === "crown" ? createCrownCase("practice") : createRestorativeCase(lesson.caseSetup.restorationType ?? "bridge", "practice");
  if (lesson.caseSetup.source === "partial-denture-case") return createPartialDentureCase(lesson.caseSetup.kennedyClass ?? "I", "practice");
  if (lesson.caseSetup.source === "bite-splint-case") return createBiteSplintCase("practice");
  if (lesson.caseSetup.source === "digital-model-case") return createDigitalModelCase("practice");
  if (lesson.caseSetup.source === "articulator-case") return createArticulatorCase("practice");
  if (lesson.caseSetup.source === "implant-case") return createImplantCase("practice");
  if (lesson.assets.length) return initializePracticeAssets(lesson);
  return [];
}

export function cleanupPracticeLesson(lesson: PracticeLesson, ids: readonly string[] = []) {
  if (lesson.caseSetup.packageManifest || lesson.caseSetup.casePackageId || findCasePackageForPracticeSetup(lesson.caseSetup.source, lesson.caseSetup.restorationType)) {
    geometryRegistry.clear();
    useWorkspaceStore.getState().resetDemo();
    return;
  }
  if (["crown-case", "denture-case", "restorative-case", "partial-denture-case", "bite-splint-case", "digital-model-case", "articulator-case", "implant-case"].includes(lesson.caseSetup.source)) {
    geometryRegistry.clear();
    useWorkspaceStore.getState().resetDemo();
    return;
  }
  cleanupPracticeAssets(ids);
}

export function cleanupPracticeAssets(ids: readonly string[]) {
  for (const rawId of ids) { const id = cadObjectId(rawId); useWorkspaceStore.getState().removeObject(id); geometryRegistry.remove(id); }
}
