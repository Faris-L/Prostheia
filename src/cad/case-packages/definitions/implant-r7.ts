import { PRIVATE_FIXED_ASSET_IDS } from "../private-asset-catalog";
import { mapSerbianFields, normalizeImplantSerbianCopy } from "@/lib/dental-language";
import { casePackageManifestSchema, type CaseCheckpoint, type CaseObjectDescriptor, type CasePackageManifest } from "../contract";

const identity = { position: [0, 0, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], scale: [1, 1, 1] as [number, number, number] };
const text = (en: string, sr: string) => ({ en, sr: normalizeImplantSerbianCopy(sr) });
const transform = (position: [number, number, number], rotation: [number, number, number] = [0, 0, 0], scale: [number, number, number] = [1, 1, 1]) => ({ position, rotation, scale });
const procedural = (factoryId: string, parameters: Record<string, unknown> = {}) => ({ kind: "procedural" as const, factoryId, parameters });
const object = (input: Omit<CaseObjectDescriptor, "required" | "transform" | "opacity" | "segmentation"> & Partial<Pick<CaseObjectDescriptor, "transform" | "opacity" | "segmentation">>): CaseObjectDescriptor => ({ required: true, transform: structuredClone(identity), opacity: 1, segmentation: [], ...input });

const IDS = {
  ridge: "source-ridge-support",
  gingiva: "source-gingiva",
  mesial: "source-neighbor-mesial",
  distal: "source-neighbor-distal",
  antagonist: "source-antagonist",
  scanBody: "source-scan-body",
  fixture: "source-implant-reference",
  emergence: "design-emergence-profile",
  abutment: "design-abutment",
  crown: "design-implant-crown",
  axis: "guide-implant-axis",
  interface: "guide-restorative-interface",
  access: "guide-screw-access",
  contacts: "guide-proximal-contact-review",
  occlusion: "guide-occlusion-review",
  crownTarget: "reference-crown-envelope",
} as const;

const CASE_STAGES = [
  { id: "inspect", label: text("Inspect the restorative case", "Pregledajte restaurativni slu\u010daj"), visible: ["ridge", "gingiva", "mesial", "distal", "antagonist", "scanBody", "fixture", "emergence", "abutment", "crown", "axis", "interface", "access"] },
  { id: "scan_body", label: text("Identify the scan body", "Prepoznajte scan body"), visible: ["ridge", "gingiva", "mesial", "distal", "scanBody", "fixture", "axis", "interface"] },
  { id: "implant_axis", label: text("Resolve the fixed restorative axis", "Odredite fiksnu restaurativnu osu"), visible: ["ridge", "gingiva", "scanBody", "fixture", "axis", "interface"] },
  { id: "emergence", label: text("Review the emergence profile", "Pregledajte profil nicanja"), visible: ["ridge", "gingiva", "fixture", "emergence", "axis", "interface"] },
  { id: "abutment", label: text("Inspect and adjust the abutment", "Pregledajte i prilagodite abatment"), visible: ["gingiva", "fixture", "emergence", "abutment", "crown", "axis", "interface"] },
  { id: "crown_proposal", label: text("Load the anatomical crown proposal", "U\u010ditajte anatomski predlog krunice"), visible: ["gingiva", "fixture", "emergence", "abutment", "crown", "axis", "interface", "crownTarget"] },
  { id: "crown_position", label: text("Position and adapt the crown", "Postavite i prilagodite krunicu"), visible: ["gingiva", "mesial", "distal", "fixture", "emergence", "abutment", "crown", "axis", "interface", "crownTarget"] },
  { id: "contacts", label: text("Review proximal contacts", "Pregledajte proksimalne kontakte"), visible: ["gingiva", "mesial", "distal", "fixture", "emergence", "abutment", "crown", "axis", "contacts"] },
  { id: "occlusion", label: text("Review antagonist and occlusion", "Pregledajte antagonistu i okluziju"), visible: ["gingiva", "mesial", "distal", "antagonist", "fixture", "abutment", "crown", "axis", "occlusion"] },
  { id: "screw_access", label: text("Inspect the screw-access path", "Pregledajte putanju pristupa zavrtnju"), visible: ["gingiva", "fixture", "abutment", "crown", "axis", "access", "interface"] },
  { id: "final", label: text("Final Design Check", "Zavr\u0161na provera dizajna"), visible: ["ridge", "gingiva", "mesial", "distal", "antagonist", "fixture", "scanBody", "emergence", "abutment", "crown", "axis", "interface", "access", "contacts", "occlusion"] },
] as const;

type ImplantPlan = {
  packageId: string;
  caseId: string;
  slug: string;
  scenarioSlug: string;
  challenge: "centered" | "offset";
  title: string;
  titleSr: string;
  description: string;
  descriptionSr: string;
  difficulty: "intermediate" | "advanced";
  tooth: number;
  arch: "upper" | "lower";
  mesialFdi: number;
  distalFdi: number;
  antagonistFdi: number;
  crownAssetId: string;
  scanBodyId: string;
  orientation: "flat-a" | "flat-b";
  angleDeg: number;
  antagonistHeight: number;
  targetEmergenceRadiusMm: number;
};

function createImplantPackage(plan: ImplantPlan): CasePackageManifest {
  const axisRotation = [0, plan.angleDeg * Math.PI / 180, 0] as [number, number, number];
  const axis = [Math.sin(axisRotation[1]), 0, Math.cos(axisRotation[1])] as [number, number, number];
  const system = {
    name: "Synthetic Training Implant System",
    systemId: "prostheia-synthetic-training-implant-v1",
    platformType: "Training platform · P4",
    restorativeInterface: "Synthetic indexed interface · SI-4",
    restorativeConnection: "Fictional internal index · RCI-4",
    scanBodyId: plan.scanBodyId,
    platformDiameterMm: 4,
    noCommercialCompatibilityClaim: true,
  };
  const objects: CaseObjectDescriptor[] = [
    object({ id: IDS.ridge, name: text("SOURCE · Synthetic ridge support", "IZVOR · Sinteti\u010dka potpora grebena"), caseRole: "SOURCE", cadRole: plan.arch === "upper" ? "maxilla" : "mandible", source: procedural("implant.r7-support-ridge", { challenge: plan.challenge }), editable: false, visible: true, opacity: 1, dental: { arch: plan.arch }, workflowMetadata: { implantRole: "ridge_support", syntheticEducationalGeometry: true, biologicalValidation: false } }),
    object({ id: IDS.gingiva, name: text("SOURCE · Synthetic gingiva and local arch segment", "IZVOR · Sinteti\u010dka gingiva i lokalni segment luka"), caseRole: "SOURCE", cadRole: "tooth", source: procedural("implant.r7-gingiva", { challenge: plan.challenge }), editable: false, visible: true, opacity: 1, dental: { arch: plan.arch, fdi: plan.tooth }, workflowMetadata: { implantRole: "gingiva", syntheticEducationalGeometry: true, tissueIntersectionIsGrossOnly: true } }),
    object({ id: IDS.mesial, name: text(`SOURCE · Neighboring tooth · ${plan.mesialFdi}`, `IZVOR · Susedni zub · ${plan.mesialFdi}`), caseRole: "SOURCE", cadRole: "tooth", source: procedural("implant.r7-neighbor", { arch: plan.arch, fdi: plan.mesialFdi, position: "mesial", challenge: plan.challenge }), editable: false, visible: true, dental: { arch: plan.arch, fdi: plan.mesialFdi }, transform: transform([-8.3, 0, 5.3], [0, plan.arch === "upper" ? 0.025 : -0.025, -0.02]), workflowMetadata: { implantRole: "neighbor", neighborSide: "mesial", syntheticEducationalGeometry: true } }),
    object({ id: IDS.distal, name: text(`SOURCE · Neighboring tooth · ${plan.distalFdi}`, `IZVOR · Susedni zub · ${plan.distalFdi}`), caseRole: "SOURCE", cadRole: "tooth", source: procedural("implant.r7-neighbor", { arch: plan.arch, fdi: plan.distalFdi, position: "distal", challenge: plan.challenge }), editable: false, visible: true, dental: { arch: plan.arch, fdi: plan.distalFdi }, transform: transform([8.6, plan.challenge === "offset" ? 0.9 : 0, 5.25], [0, plan.challenge === "offset" ? -0.06 : 0.02, 0.025]), workflowMetadata: { implantRole: "neighbor", neighborSide: "distal", syntheticEducationalGeometry: true } }),
    object({ id: IDS.antagonist, name: text(`SOURCE · Opposing tooth · ${plan.antagonistFdi}`, `IZVOR · Suprotni zub · ${plan.antagonistFdi}`), caseRole: "SOURCE", cadRole: "antagonist", source: procedural("implant.r7-antagonist", { arch: plan.arch === "upper" ? "lower" : "upper", fdi: plan.antagonistFdi, challenge: plan.challenge }), editable: false, visible: true, transform: transform(plan.challenge === "offset" ? [1.8, -1.2, plan.antagonistHeight] : [0.6, -0.8, plan.antagonistHeight], [Math.PI, 0, plan.challenge === "offset" ? -0.08 : 0.03], [0.9, 0.9, 0.91]), dental: { arch: plan.arch === "upper" ? "lower" : "upper", fdi: plan.antagonistFdi }, workflowMetadata: { implantRole: "antagonist", syntheticEducationalGeometry: true, staticContactReviewOnly: true } }),
    object({ id: IDS.fixture, name: text("SOURCE · Synthetic training implant reference · pre-defined case axis", "IZVOR · Referenca sinteti\u010dkog implantata za obuku · unapred odre\u0111ena osa slu\u010daja"), caseRole: "SOURCE", cadRole: "implant", source: procedural("implant.r7-fixture", { diameterMm: 4, lengthMm: 9 }), editable: false, visible: true, transform: transform([0, 0, 0], axisRotation), dental: { arch: plan.arch, fdi: plan.tooth }, workflowMetadata: { implantRole: "fixture", implantPart: "reference_fixture", ...system, implantAxis: axis, axisSource: "synthetic_case_reference", surgicallyPositionable: false, noCommercialDimensionalCompatibility: true } }),
    object({ id: IDS.scanBody, name: text("SOURCE · Indexed synthetic scan body", "IZVOR · Indeksirani sinteti\u010dki scan body"), caseRole: "SOURCE", cadRole: "scan", source: procedural("implant.r7-scan-body", { orientation: plan.orientation }), editable: false, visible: true, transform: transform([0, 0, 0], axisRotation), dental: { arch: plan.arch, fdi: plan.tooth }, workflowMetadata: { implantRole: "scan_body", implantPart: "scan_body", orientationMarker: plan.orientation, indexedFlatOrientation: true, resolvesFixtureObjectId: IDS.fixture, implantAxis: axis, syntheticEducationalGeometry: true, commercialMatch: false, ...system } }),
    object({ id: IDS.emergence, name: text("DESIGN · Editable emergence profile · target for this exercise", "DIZAJN · Profil nicanja koji mo\u017ee da se menja · cilj ove ve\u017ebe"), caseRole: "DESIGN", cadRole: "other", source: procedural("implant.r7-emergence", { baseRadiusMm: 2.4, crownRadiusMm: plan.targetEmergenceRadiusMm, heightMm: 4.1 }), editable: true, visible: true, transform: transform([0, 0, 0], axisRotation), dental: { arch: plan.arch, fdi: plan.tooth }, parentId: IDS.fixture, workflowMetadata: { implantRole: "emergence", implantPart: "emergence_reference", parentFixtureObjectId: IDS.fixture, parentAbutmentObjectId: IDS.abutment, targetForThisExercise: true, targetCrownRadiusMm: plan.targetEmergenceRadiusMm, editableForm: true, biologicalValidation: false, syntheticEducationalGeometry: true } }),
    object({ id: IDS.abutment, name: text("DESIGN · Synthetic training abutment concept", "DIZAJN · Koncept sinteti\u010dkog abatmenta za obuku"), caseRole: "DESIGN", cadRole: "abutment", source: procedural("implant.r7-abutment", { diameterMm: 4, heightMm: 4.1 }), editable: true, visible: true, transform: transform([0, 0, 0], axisRotation), dental: { arch: plan.arch, fdi: plan.tooth }, parentId: IDS.fixture, workflowMetadata: { implantRole: "abutment", implantPart: "abutment", parentFixtureObjectId: IDS.fixture, syntheticSystemId: system.systemId, restorativeConnection: system.restorativeConnection, supportsCrownObjectId: IDS.crown, heightFormTargetMm: 4.1, targetForThisExercise: true, manufacturingReadyGeometry: false, syntheticEducationalGeometry: true } }),
    object({ id: IDS.crown, name: text(`DESIGN · Dundee anatomical implant crown proposal · ${plan.tooth}`, `DIZAJN · Anatomski predlog krunice implantata Dundee · ${plan.tooth}`), caseRole: "DESIGN", cadRole: "crown", source: { kind: "asset", assetRefId: "dundee-crown" }, editable: true, visible: true, transform: transform([0, 0, 4.25], axisRotation), dental: { arch: plan.arch, fdi: plan.tooth }, parentId: IDS.abutment, workflowMetadata: { implantRole: "crown", implantPart: "restoration", restorationType: "crown", parentAbutmentObjectId: IDS.abutment, sourceLibrary: "private-dundee-anatomy", sourceAssetId: plan.crownAssetId, sourceAssetKind: "anatomical crown proposal", initialPosition: [0, 0, 4.25], syntheticImplantSystemId: system.systemId, screwAccessGuideObjectId: IDS.access, sculptToolsEnabled: true, patientFitValidated: false, manufacturingReadyGeometry: false } }),
    object({ id: IDS.axis, name: text("GUIDE · Fixed implant/restorative reference axis", "VODI\u010c · Fiksna referentna osa implantata/restauracije"), caseRole: "GUIDE", cadRole: "other", source: procedural("implant.r7-axis-guide", { lengthMm: 20 }), editable: false, visible: true, opacity: 0.9, transform: transform([0, 0, 0], axisRotation), parentId: IDS.fixture, dental: { arch: plan.arch, fdi: plan.tooth }, workflowMetadata: { implantRole: "implant_axis", implantPart: "reference_fixture", axisForObjectId: IDS.fixture, axis: axis, referenceOnly: true, noSurgicalPositioning: true } }),
    object({ id: IDS.interface, name: text("GUIDE · Synthetic restorative platform/interface", "VODI\u010c · Sinteti\u010dka restaurativna platforma/interfejs"), caseRole: "GUIDE", cadRole: "other", source: procedural("implant.r7-interface-guide", { diameterMm: 4 }), editable: false, visible: true, opacity: 0.92, transform: transform([0, 0, 0.12], axisRotation), parentId: IDS.fixture, workflowMetadata: { implantRole: "restorative_interface", syntheticSystemId: system.systemId, platformType: system.platformType, interfaceType: system.restorativeInterface, referenceOnly: true, commercialCompatibility: false } }),
    object({ id: IDS.access, name: text("GUIDE · Screw-access axis/path", "VODI\u010c · Osa/putanja pristupa zavrtnju"), caseRole: "GUIDE", cadRole: "other", source: procedural("implant.r7-screw-access-guide", { lengthMm: 18, radiusMm: 0.64 }), editable: false, visible: true, opacity: 1, transform: transform([0, 0, 0.3], axisRotation), parentId: IDS.fixture, dental: { arch: plan.arch, fdi: plan.tooth }, workflowMetadata: { implantRole: "screw_access", implantPart: "screw_channel", axis: axis, axisSourceObjectId: IDS.fixture, crownObjectId: IDS.crown, exerciseOrientationLimitDeg: 10, grossOrientationCheckOnly: true, clinicalApproval: false } }),
    object({ id: IDS.contacts, name: text("GUIDE · Proximal contact review locations", "VODI\u010c · Mesta za pregled proksimalnih kontakata"), caseRole: "GUIDE", cadRole: "other", source: procedural("implant.r7-contact-guide", { kind: "proximal" }), editable: false, visible: false, transform: transform([0, 0, 4.25], axisRotation), workflowMetadata: { implantRole: "proximal_contact_review", reviewWithSharedAnalysis: true, targetForThisExercise: true, notPatientSpecific: true } }),
    object({ id: IDS.occlusion, name: text("GUIDE · Antagonist/occlusion review zone", "VODI\u010c · Zona za pregled antagoniste/okluzije"), caseRole: "GUIDE", cadRole: "other", source: procedural("implant.r7-contact-guide", { kind: "occlusal" }), editable: false, visible: false, workflowMetadata: { implantRole: "occlusion_review", reviewWithSharedAnalysis: true, targetForThisExercise: true, staticOnly: true, notPatientSpecific: true } }),
    object({ id: IDS.crownTarget, name: text("REFERENCE · Crown silhouette target for this exercise", "REFERENCA · Ciljna silueta krunice za ovu ve\u017ebu"), caseRole: "REFERENCE", cadRole: "reference", source: procedural("implant.r7-crown-target"), editable: false, visible: false, opacity: 0.6, transform: transform([0, 0, 9.3], axisRotation), dental: { arch: plan.arch, fdi: plan.tooth }, referenceState: { isExample: true, visibility: "available_on_request", access: "always" }, workflowMetadata: { implantRole: "crown_target", targetForThisExercise: true, anatomicalTarget: false, notClinicalGuidance: true } }),
  ];

  const checkpoints: CaseCheckpoint[] = CASE_STAGES.map((stage) => ({
    id: stage.id,
    label: stage.label,
    source: { kind: "asset_snapshot", objects: objects.map((entry) => ({ objectId: entry.id, visible: (stage.visible as readonly string[]).includes(Object.entries(IDS).find(([, id]) => id === entry.id)?.[0] ?? "") })) },
    workflowState: {},
  }));
  const packageId = plan.packageId;
  const caseId = plan.caseId;

  return casePackageManifestSchema.parse({
    schemaVersion: 1,
    packageId,
    caseId,
    slug: plan.slug,
    workflowType: "implant",
    difficulty: plan.difficulty,
    metadata: { title: text(plan.title, plan.titleSr), description: text(plan.description, plan.descriptionSr), indication: text("Fictional restorative implant CAD teaching case with a fixed synthetic reference", "Izmi\u0161ljeni edukativni slu\u010daj restaurativnog implant CAD-a sa fiksnom sinteti\u010dkom referencom") },
    labOrder: {
      caseCode: plan.challenge === "centered" ? "EDU-R7-IR-01" : "EDU-R7-IR-02",
      workflowType: "implant",
      restorationType: "crown",
      targetTeeth: [plan.tooth],
      targetArch: plan.arch === "upper" ? "maxilla" : "mandible",
      indication: text("Design one synthetic implant-supported crown from the supplied scan-body and restorative references.", "Oblikujte jednu sinteti\u010dku krunicu no\u0161enu implantatom na osnovu datog scan body-ja i restaurativnih referenci."),
      providedRecords: {
        en: ["Synthetic local arch and neighboring teeth", "Synthetic gingiva and ridge support", "Pre-defined implant reference and axis", "Indexed supplied scan body", "Synthetic opposing tooth", "Dundee anatomical crown proposal", "Fictional training interface metadata"],
        sr: ["Sinteti\u010dki lokalni luk i susedni zubi", "Sinteti\u010dka gingiva i potpora grebena", "Unapred odre\u0111ena referenca implantata i osa", "Dati indeksirani scan body", "Sinteti\u010dki suprotni zub", "Anatomski predlog krunice Dundee", "Izmi\u0161ljeni metapodaci trena\u017enog interfejsa"],
      },
      requiredOutput: {
        en: ["Separate editable abutment concept", "Adapted anatomical implant crown proposal", "Reviewed emergence, contacts, antagonist, and screw-access relationship"],
        sr: ["Zaseban koncept abatmenta koji mo\u017ee da se menja", "Prilago\u0111en anatomski predlog krunice na implantatu", "Pregledani odnosi nicanja, kontakata, antagoniste i pristupa zavrtnju"],
      },
      materialPreset: text("Synthetic training materials · display only", "Sinteti\u010dki materijali za obuku · samo za prikaz"),
      notes: text("Fictional package-backed educational case. The implant fixture and axis are pre-defined restorative references. Do not position an implant surgically from this case.", "Izmi\u0161ljeni edukativni slu\u010daj iz paketa. Implant i njegova osa su unapred odre\u0111ene restaurativne reference. Ne postavljajte hirur\u0161ki implantat na osnovu ovog slu\u010daja."),
      educationalDisclaimer: text("Synthetic educational CAD only. The fixture system is fictional and dimensionally incompatible by design with commercial systems. Exercise targets are not biological validation, clinical approval, or manufacturing-ready geometry.", "Samo sinteti\u010dki edukativni CAD. Sistem implantata je izmi\u0161ljen i namenski nije dimenzionalno kompatibilan sa komercijalnim sistemima. Ciljevi ve\u017ebe nisu biolo\u0161ka provera, klini\u010dko odobrenje niti geometrija spremna za proizvodnju."),
    },
    assetRefs: [{ id: "dundee-crown", assetId: plan.crownAssetId, required: true }],
    objects,
    initialWorkflowState: { resetTransientState: true },
    checkpoints,
    startingCheckpointId: "inspect",
    validationBindings: [{ id: "r7-implant-final-design-check", objectIds: [IDS.fixture, IDS.scanBody, IDS.emergence, IDS.abutment, IDS.crown, IDS.axis, IDS.access], binding: { kind: "inline", validatorType: "r7_workflow", config: { check: "final" } } }],
    expectedOutput: { objectIds: [IDS.abutment, IDS.crown], description: text("Separate synthetic abutment concept and editable anatomical crown proposal.", "Zaseban sinteti\u010dki koncept abatmenta i anatomski predlog krunice koji mo\u017ee da se menja."), format: "prostheia-cad-object" },
    trainingNotes: [
      text("System, dimensions, axes, and component identifiers are fictional educational metadata. They make no commercial fit or compatibility claim.", "Sistem, dimenzije, ose i identifikatori komponenti su izmi\u0161ljeni edukativni metapodaci. Ne tvrde naleganje ni kompatibilnost sa komercijalnim sistemima."),
      text("The anatomy asset is a private Dundee library crown proposal. Its display coordinates and scale are training content, not a measured patient model.", "Anatomski model je predlog krunice iz privatne biblioteke Dundee. Njegove koordinate prikaza i razmera su trena\u017eni sadr\u017eaj, a ne izmeren model pacijenta."),
      text("Any numeric value is a target for this exercise. No biological validation, patient fit, or clinical outcome is represented.", "Svaka broj\u010dana vrednost je cilj ove ve\u017ebe. Nisu prikazani biolo\u0161ka validacija, naleganje na pacijenta niti klini\u010dki ishod."),
    ],
    review: { status: "unreviewed" },
    compatibility: { practiceSources: [{ source: "implant-case" }], scenarioSlugs: [plan.scenarioSlug] },
  });
}

export const IMPLANT_R7_PACKAGES: CasePackageManifest[] = mapSerbianFields([
  createImplantPackage({ packageId: "r7-implant-posterior-v1", caseId: "r7implanta", slug: "r7-posterior-implant-restoration", scenarioSlug: "synthetic_implant_training_case", challenge: "centered", title: "Posterior implant crown · restorative CAD · R7", titleSr: "Bo\u010dna krunica na implantatu · restaurativni CAD · R7", description: "A fictional lower first-molar package for scan-body recognition, abutment design, and anatomical crown adaptation.", descriptionSr: "Izmi\u0161ljeni paket donjeg prvog molara za prepoznavanje scan body-ja, dizajn abatmenta i prilago\u0111avanje anatomske krunice.", difficulty: "intermediate", tooth: 36, arch: "lower", mesialFdi: 35, distalFdi: 37, antagonistFdi: 26, crownAssetId: PRIVATE_FIXED_ASSET_IDS.crown36, scanBodyId: "stis-scanbody-indexed-a", orientation: "flat-a", angleDeg: 0, antagonistHeight: 17.5, targetEmergenceRadiusMm: 4.5 }),
  createImplantPackage({ packageId: "r7-implant-axis-contact-v1", caseId: "r7implantb", slug: "r7-implant-axis-contact-challenge", scenarioSlug: "r7_implant_axis_contact_challenge", challenge: "offset", title: "Implant crown · axis and contact challenge · R7", titleSr: "Krunica na implantatu · izazov ose i kontakata · R7", description: "A distinct upper first-molar case with an indexed scan body, angled fixed reference, asymmetric emergence contour, and tighter distal contact review.", descriptionSr: "Drugačiji slučaj gornjeg prvog molara sa indeksiranim scan body-jem, zakošenom fiksnom referencom, asimetričnom konturom nicanja i zahtevnijim distalnim kontaktom.", difficulty: "advanced", tooth: 26, arch: "upper", mesialFdi: 25, distalFdi: 27, antagonistFdi: 36, crownAssetId: PRIVATE_FIXED_ASSET_IDS.crown26, scanBodyId: "stis-scanbody-indexed-b", orientation: "flat-b", angleDeg: 14, antagonistHeight: 16.7, targetEmergenceRadiusMm: 5.1 }),
], normalizeImplantSerbianCopy);

export const IMPLANT_R7_OBJECT_IDS = IDS;
export const IMPLANT_R7_CASE_STAGES = CASE_STAGES;
