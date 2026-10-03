import { PRIVATE_FIXED_ASSET_IDS } from "../private-asset-catalog";
import { caseObjectRuntimeId } from "../identity";
import { casePackageManifestSchema, type CaseCheckpoint, type CaseObjectDescriptor } from "../contract";
import { rpdArchTeeth, rpdComponentPath, rpdToothPosition, RPD_CASE_PLANS, type RpdArch, type RpdCasePlan } from "@/cad/partial-denture/r5-geometry";
import type { KennedyClass, PartialComponent, PartialComponentKind } from "@/cad/partial-denture/types";

const V = PRIVATE_FIXED_ASSET_IDS;
const transform = (position: [number, number, number] = [0, 0, 0], rotation: [number, number, number] = [0, 0, 0], scale: [number, number, number] = [1, 1, 1]) => ({ position, rotation, scale });
const asset = (id: string, runtimeAssetId: string) => ({ id, runtimeAssetId, required: true });

function trainingToothAsset(fdi: number) {
  const number = fdi % 10;
  const quadrant = Math.floor(fdi / 10);
  const rightSide = quadrant === 1 || quadrant === 4;
  if (fdi < 30) {
    const key = number === 1 ? "intact21" : number === 2 ? "intact22" : number === 3 ? rightSide ? "mirrored13" : "intact23" : `intact${number + 20}`;
    return { refId: `tooth-form-${key}`, assetId: V[key as keyof typeof V], mirrored: rightSide && number !== 1 && number !== 3 };
  }
  if (number === 1) return { refId: "tooth-form-intact31", assetId: V.intact31, mirrored: false };
  if (number === 2) return { refId: "tooth-form-intact32", assetId: V.intact32, mirrored: rightSide };
  if (number === 3) return { refId: `tooth-form-${rightSide ? "mirrored13" : "intact23"}`, assetId: rightSide ? V.mirrored13 : V.intact23, mirrored: false, approximation: "Upper canine source form used as an explicitly marked mandibular canine training approximation; it does not establish mandibular natural-tooth identity." };
  const key = number === 4 ? "intact34" : number === 5 ? "intact35" : number === 6 ? "intact36" : rightSide ? "mirrored47" : "intact37";
  return { refId: `tooth-form-${key}`, assetId: V[key as keyof typeof V], mirrored: rightSide && number !== 7 };
}

function toothObject(fdi: number, arch: RpdArch, plan: RpdCasePlan): CaseObjectDescriptor {
  const source = trainingToothAsset(fdi);
  const placement = rpdToothPosition(fdi, arch);
  const rotation: [number, number, number] = [...placement.rotation];
  const scale: [number, number, number] = [...(placement.rotation ? [1, 1, 1] as const : [1, 1, 1] as const)];
  if (source.mirrored) scale[0] = -1;
  const approximation = source.approximation ?? (source.mirrored ? "Contralateral training display is mirrored across the arch midline from the listed private Dundee tooth form." : undefined);
  return {
    id: `tooth-${fdi}`, name: { en: `SOURCE · Remaining tooth · FDI ${fdi}`, sr: `IZVOR · Preostali zub · FDI ${fdi}` },
    caseRole: "SOURCE", cadRole: "tooth", source: { kind: "asset", assetRefId: source.refId }, required: true,
    editable: false, visible: true, opacity: 1,
    transform: transform(placement.position, rotation, scale), dental: { fdi, arch },
    workflowMetadata: {
      partialDenturePart: "tooth", partialDentureClass: plan.kennedyClass, partialDentureArch: arch,
      partialDentureToothNumber: fdi,
      ...(plan.abutments.includes(fdi) ? { partialDentureAbutment: true } : {}),
      ...(approximation ? { trainingApproximation: approximation } : {}),
      syntheticEducationalCase: true,
    }, segmentation: [],
  };
}

function procedural(args: {
  id: string; nameEn: string; nameSr: string; caseRole: CaseObjectDescriptor["caseRole"]; cadRole: CaseObjectDescriptor["cadRole"];
  factoryId: string; parameters: Record<string, unknown>; visible?: boolean; editable?: boolean; opacity?: number;
  workflowMetadata?: Record<string, unknown>;
}): CaseObjectDescriptor {
  return {
    id: args.id, name: { en: args.nameEn, sr: args.nameSr }, caseRole: args.caseRole, cadRole: args.cadRole,
    source: { kind: "procedural", factoryId: args.factoryId, parameters: args.parameters }, required: true,
    editable: args.editable ?? false, visible: args.visible ?? true, opacity: args.opacity ?? 1,
    transform: transform(), workflowMetadata: args.workflowMetadata ?? {}, segmentation: [],
  };
}

type ComponentSpec = {
  id: string; kind: PartialComponentKind; toothNumber?: number; regionTeeth?: number[];
  restSurface?: "occlusal" | "cingulum"; guide?: boolean;
};

function componentSpecs(plan: RpdCasePlan): ComponentSpec[] {
  const specs: ComponentSpec[] = [{ id: "design-major-connector", kind: "major_connector" }];
  for (const abutment of plan.abutments) {
    specs.push({ id: `design-rest-${abutment}`, kind: "rest", toothNumber: abutment, restSurface: plan.kennedyClass === "IV" ? "cingulum" : "occlusal" });
    specs.push({ id: `design-guide-plane-${abutment}`, kind: "guide_plane", toothNumber: abutment });
    specs.push({ id: `design-clasp-${abutment}`, kind: "clasp", toothNumber: abutment });
    specs.push({ id: `guide-blockout-${abutment}`, kind: "blockout", toothNumber: abutment, guide: true });
  }
  plan.saddleRegions.forEach((teeth, index) => {
    const linkedAbutment = plan.abutments.reduce((best, candidate) => Math.abs(candidate - teeth[0]) < Math.abs(best - teeth[0]) ? candidate : best, plan.abutments[0]);
    specs.push({ id: `design-minor-connector-${index + 1}`, kind: "minor_connector", toothNumber: linkedAbutment, regionTeeth: teeth });
    specs.push({ id: `design-saddle-${index + 1}`, kind: "saddle", regionTeeth: teeth });
    specs.push({ id: `design-retention-mesh-${index + 1}`, kind: "retention_mesh", regionTeeth: teeth });
    specs.push({ id: `guide-finish-line-${index + 1}`, kind: "finish_line", toothNumber: linkedAbutment, regionTeeth: teeth, guide: true });
  });
  return specs;
}

function componentObject(spec: ComponentSpec, plan: RpdCasePlan, caseId: string): { descriptor: CaseObjectDescriptor; component: PartialComponent; points: [number, number, number][] } {
  const parentId = spec.kind === "major_connector" ? undefined : "design-major-connector";
  const points = rpdComponentPath({ kind: spec.kind, arch: plan.arch, classPlan: plan, toothNumber: spec.toothNumber, restSurface: spec.restSurface, regionTeeth: spec.regionTeeth });
  const componentId = caseObjectRuntimeId(caseId, spec.id);
  const abutmentObjectId = spec.toothNumber ? caseObjectRuntimeId(caseId, `tooth-${spec.toothNumber}`) : undefined;
  const parentComponentId = parentId ? caseObjectRuntimeId(caseId, parentId) : undefined;
  const baseKind = spec.kind.replaceAll("_", " ");
  const descriptor = procedural({
    id: spec.id,
    nameEn: `${spec.guide ? "GUIDE" : "DESIGN"} · ${baseKind}${spec.toothNumber ? ` · FDI ${spec.toothNumber}` : ""}`,
    nameSr: `${spec.guide ? "VODIČ" : "DIZAJN"} · ${baseKind}${spec.toothNumber ? ` · FDI ${spec.toothNumber}` : ""}`,
    caseRole: spec.guide ? "GUIDE" : "DESIGN", cadRole: spec.guide ? "other" : "framework",
    factoryId: "partial-denture.r5-component",
    parameters: { kind: spec.kind, arch: plan.arch, connectorForm: plan.connectorForm, ...(spec.restSurface ? { restSurface: spec.restSurface } : {}), ...(spec.toothNumber ? { toothNumber: spec.toothNumber } : {}), ...(spec.regionTeeth ? { regionTeeth: spec.regionTeeth } : {}), points },
    visible: false, editable: true, opacity: spec.kind === "blockout" ? 0.7 : 1,
    workflowMetadata: {
      partialDenturePart: spec.kind,
      partialDentureClass: plan.kennedyClass,
      partialDentureArch: plan.arch,
      partialDentureConnectorForm: spec.kind === "major_connector" ? plan.connectorForm : undefined,
      ...(spec.toothNumber ? { partialDentureToothNumber: spec.toothNumber, partialDentureAbutmentObjectId: abutmentObjectId } : {}),
      ...(parentComponentId ? { partialDentureParentComponentId: parentComponentId } : {}),
      ...(spec.restSurface ? { partialDentureRestSurface: spec.restSurface } : {}),
      ...(spec.regionTeeth ? { missingToothNumbers: spec.regionTeeth } : {}),
      insertionDirectionDependency: spec.kind === "clasp" || spec.kind === "blockout",
      syntheticEducationalGeometry: true,
    },
  });
  const curveId = `${componentId}-path`;
  const component: PartialComponent = {
    id: componentId, kind: spec.kind, curveId, arch: plan.arch,
    ...(spec.toothNumber ? { toothNumber: spec.toothNumber, abutmentObjectId } : {}),
    ...(parentComponentId ? { parentComponentId } : {}),
    ...(spec.restSurface ? { restSurface: spec.restSurface } : {}),
    ...(spec.kind === "major_connector" ? { connectorForm: plan.connectorForm } : {}),
  };
  return { descriptor, component, points };
}

function allObjects(plan: RpdCasePlan, caseId: string) {
  const objects: CaseObjectDescriptor[] = [procedural({
    id: "source-arch", nameEn: `SOURCE · Synthetic ${plan.arch === "upper" ? "maxillary" : "mandibular"} gingiva and residual ridge`,
    nameSr: `IZVOR · Sintetička ${plan.arch === "upper" ? "maksilarna" : "mandibularna"} gingiva i rezidualni greben`,
    caseRole: "SOURCE", cadRole: plan.arch === "upper" ? "maxilla" : "mandible", factoryId: "partial-denture.r5-arch", parameters: { arch: plan.arch },
    workflowMetadata: { partialDenturePart: "arch", partialDentureClass: plan.kennedyClass, partialDentureArch: plan.arch, missingToothNumbers: plan.missingTeeth, abutmentToothNumbers: plan.abutments, syntheticEducationalGeometry: true },
  })];
  const presentTeeth = rpdArchTeeth(plan.arch).filter((tooth) => !plan.missingTeeth.includes(tooth));
  for (const tooth of presentTeeth) objects.push(toothObject(tooth, plan.arch, plan));
  objects.push(procedural({
    id: "guide-insertion-axis", nameEn: "GUIDE · Insertion direction · exercise reference", nameSr: "VODIČ · Smer insercije · referenca vežbe",
    caseRole: "GUIDE", cadRole: "other", factoryId: "partial-denture.r5-insertion-guide", parameters: {}, visible: true, opacity: 0.9,
    workflowMetadata: { partialDenturePart: "insertion_axis", partialDentureClass: plan.kennedyClass, targetDirection: [0, 0, 1], targetForThisExercise: true, notClinicalSurvey: true },
  }));
  for (const toothNumber of plan.abutments) objects.push(procedural({
    id: `guide-survey-${toothNumber}`, nameEn: `GUIDE · Survey contour · FDI ${toothNumber}`, nameSr: `VODIČ · Kontura ekvatora · FDI ${toothNumber}`,
    caseRole: "GUIDE", cadRole: "other", factoryId: "partial-denture.r5-survey-guide", parameters: { arch: plan.arch, toothNumber }, visible: false, editable: true, opacity: 0.9,
    workflowMetadata: { partialDenturePart: "survey_line", partialDentureClass: plan.kennedyClass, partialDentureArch: plan.arch, partialDentureToothNumber: toothNumber, abutmentObjectId: caseObjectRuntimeId(caseId, `tooth-${toothNumber}`), insertionDirectionDependency: true, targetForThisExercise: true },
  }));
  const components = componentSpecs(plan).map((spec) => componentObject(spec, plan, caseId));
  objects.push(...components.map((item) => item.descriptor));
  return { objects, components };
}

function checkpointFlags(klass: KennedyClass, checkpointId: string): Record<string, unknown> {
  const order = ["case_inspection", "survey", "insertion_path", "contours", "undercuts", "blockout", "rests", "major_connector", "minor_connectors", "clasps", "saddle_mesh", "finish_lines", "final_review"];
  const stage = Math.max(0, order.indexOf(checkpointId));
  const plan = RPD_CASE_PLANS[klass];
  return {
    kennedyClass: klass,
    archObjectId: caseObjectRuntimeId(`r5rpd${klass.toLowerCase()}`, "source-arch"),
    packageId: `r5-partial-denture-kennedy-${klass.toLowerCase()}-v1`,
    arch: plan.arch,
    missingToothNumbers: plan.missingTeeth,
    abutmentObjectIds: plan.abutments.map((tooth) => caseObjectRuntimeId(`r5rpd${klass.toLowerCase()}`, `tooth-${tooth}`)),
    components: [] as PartialComponent[],
    surveyCompleted: stage >= 1,
    insertionPathSelected: stage >= 2,
    contoursReviewed: stage >= 3,
    undercutsReviewed: stage >= 4,
    blockoutApplied: stage >= 5,
  };
}

function buildPackage(klass: KennedyClass) {
  const plan = RPD_CASE_PLANS[klass];
  const packageId = `r5-partial-denture-kennedy-${klass.toLowerCase()}-v1`;
  const caseId = `r5rpd${klass.toLowerCase()}`;
  const slug = `r5-kennedy-${klass.toLowerCase()}`;
  const presentTeeth = rpdArchTeeth(plan.arch).filter((tooth) => !plan.missingTeeth.includes(tooth));
  const { objects, components } = allObjects(plan, caseId);
  const assetRefs = [...new Map(presentTeeth.map((tooth) => {
    const source = trainingToothAsset(tooth);
    return [source.refId, asset(source.refId, source.assetId)];
  })).values()];
  const toothObjectIds = presentTeeth.map((tooth) => `tooth-${tooth}`);
  const guideIds = objects.filter((object) => object.caseRole === "GUIDE").map((object) => object.id);
  const sourceIds = objects.filter((object) => object.caseRole === "SOURCE").map((object) => object.id);
  const designIds = objects.filter((object) => object.caseRole === "DESIGN").map((object) => object.id);
  const componentStore = components.map(({ component }) => component);
  const componentCurves = components.map(({ component, points }) => ({
    id: component.curveId, kind: "framework_path" as const, coordinateSpace: "object-local" as const,
    objectId: component.id, points, closed: component.kind === "saddle" || component.kind === "retention_mesh",
  }));
  const initialSetup = {
    ...checkpointFlags(klass, "case_inspection"),
    components: componentStore,
  };

  const visibilityByStage: Record<string, Set<string>> = {
    case_inspection: new Set([...sourceIds, "guide-insertion-axis"]),
    survey: new Set([...sourceIds, "guide-insertion-axis", ...guideIds.filter((id) => id.startsWith("guide-survey-"))]),
    insertion_path: new Set([...sourceIds, "guide-insertion-axis", ...guideIds.filter((id) => id.startsWith("guide-survey-"))]),
    contours: new Set([...sourceIds, "guide-insertion-axis", ...guideIds.filter((id) => id.startsWith("guide-survey-"))]),
    undercuts: new Set([...sourceIds, "guide-insertion-axis", ...guideIds.filter((id) => id.startsWith("guide-survey-") || id.startsWith("guide-blockout-"))]),
    blockout: new Set([...sourceIds, "guide-insertion-axis", ...guideIds.filter((id) => id.startsWith("guide-survey-") || id.startsWith("guide-blockout-"))]),
    rests: new Set([...sourceIds, "guide-insertion-axis", ...designIds.filter((id) => id.startsWith("design-rest-") || id.startsWith("design-guide-plane-"))]),
    major_connector: new Set([...sourceIds, ...designIds.filter((id) => id === "design-major-connector" || id.startsWith("design-rest-") || id.startsWith("design-guide-plane-"))]),
    minor_connectors: new Set([...sourceIds, ...designIds.filter((id) => id.startsWith("design-minor-connector") || id.startsWith("design-major-connector") || id.startsWith("design-rest-") || id.startsWith("design-guide-plane-"))]),
    clasps: new Set([...sourceIds, ...designIds.filter((id) => id.startsWith("design-clasp-") || id.startsWith("design-minor-connector") || id.startsWith("design-major-connector") || id.startsWith("design-rest-") || id.startsWith("design-guide-plane-"))]),
    saddle_mesh: new Set([...sourceIds, ...designIds.filter((id) => !id.startsWith("design-") || id.startsWith("design-saddle-") || id.startsWith("design-retention-mesh-") || id.startsWith("design-major-connector") || id.startsWith("design-minor-connector") || id.startsWith("design-rest-") || id.startsWith("design-clasp-") || id.startsWith("design-guide-plane-"))]),
    finish_lines: new Set([...sourceIds, ...designIds, ...guideIds.filter((id) => id.startsWith("guide-finish-line-"))]),
    final_review: new Set([...sourceIds, ...guideIds, ...designIds]),
  };
  const checkpointNames: Record<string, { en: string; sr: string }> = {
    case_inspection: { en: "Inspect case anatomy", sr: "Pregled anatomije slučaja" },
    survey: { en: "Survey abutment contours", sr: "Odredite ekvatore zuba nosača" },
    insertion_path: { en: "Choose insertion path", sr: "Izaberite put insercije" },
    contours: { en: "Review tooth contours", sr: "Pregledajte konture zuba" },
    undercuts: { en: "Review directional undercut preview", sr: "Pregledajte smerni prikaz podminiranja" },
    blockout: { en: "Block out useful undercuts", sr: "Blokirajte korisna podminirana područja" },
    rests: { en: "Define rests", sr: "Definišite upirače" },
    major_connector: { en: "Review major connector", sr: "Pregledajte glavni konektor" },
    minor_connectors: { en: "Review minor connectors", sr: "Pregledajte male konektore" },
    clasps: { en: "Review clasp paths", sr: "Pregledajte putanje kukica" },
    saddle_mesh: { en: "Review saddle and retention mesh", sr: "Pregledajte sedlo i retencionu mrežicu" },
    finish_lines: { en: "Review finish lines", sr: "Pregledajte završne linije" },
    final_review: { en: "Final Design Check", sr: "Završna provera dizajna" },
  };
  const checkpoints: CaseCheckpoint[] = Object.entries(visibilityByStage).map(([id, visibleIds]) => {
    const workflowState = { partialDentureSetup: { ...checkpointFlags(klass, id), components: componentStore } };
    if (id === "case_inspection") return { id, label: checkpointNames[id], source: { kind: "package_baseline" }, workflowState };
    return {
      id, label: checkpointNames[id],
      source: { kind: "asset_snapshot", objects: objects.map((object) => ({ objectId: object.id, visible: visibleIds.has(object.id) })) },
      workflowState,
    };
  });

  const title = `Kennedy Class ${klass} · ${plan.arch === "upper" ? "Maxillary" : "Mandibular"} RPD`;
  return casePackageManifestSchema.parse({
    schemaVersion: 1,
    packageId, caseId, slug, workflowType: "partial_denture", difficulty: klass === "I" || klass === "II" ? "intermediate" : "advanced",
    metadata: {
      title: { en: title, sr: `Kennedy klasa ${klass} · parcijalna proteza · ${plan.arch === "upper" ? "maksila" : "mandibula"}` },
      description: { en: `${plan.description} Synthetic educational case with Dundee-derived private tooth forms and a swept residual-ridge tissue surface.`, sr: `${plan.description} Sintetički edukativni slučaj sa privatnim oblicima zuba izvedenim iz Dundee izvora i glatkom površinom rezidualnog grebena.` },
      indication: { en: `Fictional removable partial denture order · Kennedy ${klass}.`, sr: `Izmišljeni nalog za parcijalnu protezu · Kennedy ${klass}.` },
    },
    labOrder: {
      caseCode: `PT-EDU-R5-RPD${klass}`, workflowType: "partial_denture", targetTeeth: plan.missingTeeth, targetArch: plan.arch === "upper" ? "maxilla" : "mandible",
      indication: { en: `Fictional synthetic training request for a Kennedy Class ${klass} removable partial denture.`, sr: `Izmišljeni sintetički edukativni zahtev za parcijalnu protezu Kennedy klase ${klass}.` },
      providedRecords: {
        en: [`Synthetic ${plan.arch === "upper" ? "maxillary" : "mandibular"} arch with gingiva and residual ridge`, "Private Dundee-derived intact tooth training forms with source attribution", "Exercise insertion-axis and survey-contour guides", "Visible edentulous spaces and their support region"],
        sr: [`Sintetička ${plan.arch === "upper" ? "maksilarna" : "mandibularna"} vilica sa gingivom i rezidualnim grebenom`, "Privatni intaktni oblici zuba za obuku izvedeni iz Dundee izvora uz atribuciju", "Vodiči ose insercije i kontura ekvatora za vežbu", "Vidljivi bezubi prostori i njihove potporne regije"],
      },
      requiredOutput: {
        en: ["Major connector appropriate to the training arch", "Abutment-associated rests, guide planes, and clasp paths", "Minor connectors linking the framework to the saddle regions", "Saddle coverage, retention mesh concept, and finish-line guides"],
        sr: ["Glavni konektor prilagođen trenažnoj vilici", "Upirači, vodeće površine i putanje kukica povezane sa zubima nosačima", "Mali konektori koji povezuju skelet sa sedlima", "Površina sedla, koncept retencione mrežice i vodiči završnih linija"],
      },
      materialPreset: { en: "Metal framework · translucent warm-pink saddle teaching preset", sr: "Metalni skelet · providni toplo-roze edukativni preset sedla" },
      notes: { en: `${plan.description} All records and anatomy are fictional synthetic training content.`, sr: `${plan.description} Svi zapisi i anatomija su izmišljeni sintetički sadržaj za obuku.` },
      educationalDisclaimer: {
        en: "PRIVATE EDUCATIONAL V1 ONLY. The anatomy is synthetic training context with private Dundee-derived tooth forms. Source coordinate orientation and source-image patient provenance remain unconfirmed. No patient-specific anatomy, clinical correctness, clinical survey accuracy, or preparation validation is claimed.",
        sr: "SAMO PRIVATNA EDUKATIVNA V1 VERZIJA. Anatomija je sintetički trenažni kontekst sa privatnim oblicima zuba izvedenim iz Dundee izvora. Orijentacija izvornih koordinata i poreklo pacijenta iz izvornih snimaka nisu potvrđeni. Ne tvrdi se da je anatomija prilagođena pacijentu, klinički ispravna ili klinički pregledana.",
      },
    },
    assetRefs, objects,
    initialWorkflowState: {
      resetTransientState: true,
      partialDentureSetup: initialSetup,
      restorativeSetup: { restorationType: null, connectorWidthMm: 3, insertionDirection: [0, 0, 1], units: [] },
      curveState: { activeCurveId: componentCurves.at(-1)?.id ?? null, curves: componentCurves },
    },
    checkpoints, startingCheckpointId: "case_inspection",
    validationBindings: [
      ...(["survey", "insertion_path", "contours", "undercuts", "blockout", "rests", "major_connector", "minor_connectors", "clasps", "saddle_mesh", "finish_lines", "framework", "complete_case"] as const).map((check) => ({ id: `rpd-${check}`, objectIds: check === "complete_case" ? ["source-arch", "design-major-connector", ...toothObjectIds] : ["source-arch", ...toothObjectIds], binding: { kind: "inline" as const, validatorType: "partial_denture_setup", config: { check, kennedyClass: klass } } })),
    ],
    expectedOutput: {
      objectIds: ["design-major-connector", ...designIds.filter((id) => id.startsWith("design-saddle-") || id.startsWith("design-clasp-"))],
      description: { en: `Editable educational Kennedy ${klass} framework with source-linked teeth, rests, clasps, connector, and supported saddle concepts.`, sr: `Pomerljiv edukativni skelet Kennedy klase ${klass} sa zubima iz izvora, upiračima, kukicama, konektorom i potpomognutim sedlima.` },
      format: "prostheia-cad-object",
    },
    trainingNotes: [
      { en: "Target for this exercise: distinguish bilateral or unilateral distal extension, bounded posterior space, and anterior space crossing the midline by inspecting the missing-tooth distribution.", sr: "Cilj ove vežbe: razlikujte obostrano ili jednostrano slobodno sedlo, ograničen bočni prostor i prednji prostor preko srednje linije pregledom rasporeda nedostajućih zuba." },
      { en: "Target for this exercise: use the shared directional preview and the selected insertion path to understand contours. This display is not a clinical survey or a clinical undercut measurement.", sr: "Cilj ove vežbe: koristite zajednički smerni prikaz i izabrani put insercije za razumevanje kontura. Ovaj prikaz nije kliničko određivanje ekvatora niti kliničko merenje podminiranja." },
    ],
    review: { status: "unreviewed" },
    compatibility: { practiceSources: [], scenarioSlugs: [`r5_kennedy_${klass.toLowerCase()}`] },
  });
}

export const PARTIAL_DENTURE_R5_PACKAGES = (["I", "II", "III", "IV"] as const).map(buildPackage);

export function r5ComponentStoreForPackage(manifestPackage: (typeof PARTIAL_DENTURE_R5_PACKAGES)[number]) {
  const plan = RPD_CASE_PLANS[manifestPackage.packageId.includes("-ii-") ? "II" : manifestPackage.packageId.includes("-iii-") ? "III" : manifestPackage.packageId.includes("-iv-") ? "IV" : "I"];
  return manifestPackage.objects.flatMap((object): PartialComponent[] => {
    const kind = object.workflowMetadata.partialDenturePart;
    if (typeof kind !== "string" || !["blockout", "major_connector", "lingual_bar", "retention_mesh", "saddle", "clasp", "minor_connector", "rest", "guide_plane", "finish_line", "relief"].includes(kind)) return [];
    const id = caseObjectRuntimeId(manifestPackage.caseId, object.id);
    const toothNumber = typeof object.workflowMetadata.partialDentureToothNumber === "number" ? object.workflowMetadata.partialDentureToothNumber : undefined;
    const surface = object.workflowMetadata.partialDentureRestSurface;
    const parent = object.workflowMetadata.partialDentureParentComponentId;
    return [{ id, kind: kind as PartialComponentKind, curveId: `${id}-path`, arch: plan.arch, ...(toothNumber ? { toothNumber, abutmentObjectId: caseObjectRuntimeId(manifestPackage.caseId, `tooth-${toothNumber}`) } : {}), ...(typeof parent === "string" ? { parentComponentId: parent } : {}), ...(surface === "occlusal" || surface === "cingulum" ? { restSurface: surface } : {}), ...(kind === "major_connector" ? { connectorForm: plan.connectorForm } : {}) }];
  });
}
