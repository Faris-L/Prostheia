import { casePackageManifestSchema, type CaseCheckpoint, type CaseObjectDescriptor, type CasePackageManifest } from "../contract";
import { caseObjectRuntimeId } from "../identity";
import { DEFAULT_ARTICULATOR_CONFIG } from "@/cad/articulator/types";
import { digitalModelTrimBoundary } from "@/cad/digital-model/r6-geometry";
import { r6SplintBoundary, type SplintTrainingCase } from "@/cad/splint/r6-geometry";

const identity = { position: [0, 0, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], scale: [1, 1, 1] as [number, number, number] };
const text = (en: string, sr: string) => ({ en, sr });
const procedural = (factoryId: string, parameters: Record<string, unknown> = {}) => ({ kind: "procedural" as const, factoryId, parameters });
const object = (input: Omit<CaseObjectDescriptor, "required" | "transform" | "opacity" | "segmentation"> & Partial<Pick<CaseObjectDescriptor, "transform" | "opacity" | "segmentation">>): CaseObjectDescriptor => ({ required: true, transform: structuredClone(identity), opacity: 1, segmentation: [], ...input });

const SPLINT_IDS = { upper: "source-upper-arch", lower: "source-lower-arch", boundary: "guide-boundary", shell: "design-splint", thickness: "guide-thickness", contacts: "guide-contact-locations", relation: "reference-relation" } as const;
const SPLINT_CHECKPOINTS = [
  { id: "inspect", label: text("Inspect upper and lower scans", "Pregledajte gornji i donji snimak"), visible: [SPLINT_IDS.upper, SPLINT_IDS.lower] },
  { id: "alignment", label: text("Verify jaw relation", "Proverite odnos vilica"), visible: [SPLINT_IDS.upper, SPLINT_IDS.lower, SPLINT_IDS.relation] },
  { id: "boundary", label: text("Review the editable splint boundary", "Pregledajte granicu udlage koja može da se menja"), visible: [SPLINT_IDS.upper, SPLINT_IDS.boundary] },
  { id: "inner_surface", label: text("Generate the inner surface", "Napravite unutrašnju površinu"), visible: [SPLINT_IDS.upper, SPLINT_IDS.shell] },
  { id: "outer_form", label: text("Inspect the outer splint form", "Pregledajte spoljašnji oblik udlage"), visible: [SPLINT_IDS.upper, SPLINT_IDS.shell, SPLINT_IDS.boundary] },
  { id: "thickness", label: text("Review exercise thickness", "Pregledajte debljinu za vežbu"), visible: [SPLINT_IDS.upper, SPLINT_IDS.shell, SPLINT_IDS.thickness] },
  { id: "contacts", label: text("Review contact distribution", "Pregledajte raspored kontakata"), visible: [SPLINT_IDS.upper, SPLINT_IDS.lower, SPLINT_IDS.shell, SPLINT_IDS.contacts] },
  { id: "occlusion", label: text("Review antagonist clearance", "Pregledajte zazor antagonista"), visible: [SPLINT_IDS.upper, SPLINT_IDS.lower, SPLINT_IDS.shell, SPLINT_IDS.contacts, SPLINT_IDS.relation] },
  { id: "refinement", label: text("Refine the external surface", "Doradite spoljašnju površinu"), visible: [SPLINT_IDS.upper, SPLINT_IDS.shell, SPLINT_IDS.boundary, SPLINT_IDS.thickness] },
  { id: "final", label: text("Final Design Check", "Završna provera dizajna"), visible: [SPLINT_IDS.upper, SPLINT_IDS.lower, SPLINT_IDS.shell, SPLINT_IDS.boundary, SPLINT_IDS.contacts] },
] as const;

function createSplintPackage(input: { packageId: string; caseId: string; slug: string; challenge: SplintTrainingCase; title: string; titleSr: string; description: string; descriptionSr: string; difficulty: "beginner" | "intermediate"; scenarioSlug: string }) {
  const boundary = r6SplintBoundary(input.challenge);
  const curveId = `${input.caseId}-boundary`;
  const objects: CaseObjectDescriptor[] = [
    object({ id: SPLINT_IDS.upper, name: text("SOURCE · Upper dental arch", "IZVOR · Gornji zubni luk"), caseRole: "SOURCE", cadRole: "maxilla", source: procedural("bite-splint.r6-arch", { arch: "upper", challenge: input.challenge }), editable: false, visible: true, dental: { arch: "upper" }, workflowMetadata: { articulatorArch: "upper", biteSplintPart: "upper_arch", splintCase: input.challenge } }),
    object({ id: SPLINT_IDS.lower, name: text("SOURCE · Lower antagonist arch", "IZVOR · Donji luk antagonista"), caseRole: "SOURCE", cadRole: "antagonist", source: procedural("bite-splint.r6-arch", { arch: "lower", challenge: input.challenge }), editable: false, visible: true, transform: { ...structuredClone(identity), position: [0, 0, 12], rotation: [Math.PI, 0, 0] }, dental: { arch: "lower" }, workflowMetadata: { articulatorArch: "lower", biteSplintPart: "antagonist", splintCase: input.challenge } }),
    object({ id: SPLINT_IDS.boundary, name: text("GUIDE · Splint boundary", "VODIČ · Granica udlage"), caseRole: "GUIDE", cadRole: "other", source: procedural("bite-splint.r6-boundary-guide", { challenge: input.challenge }), editable: false, visible: false, workflowMetadata: { biteSplintPart: "reference", boundaryCurveId: curveId, selectedArchObjectId: SPLINT_IDS.upper, editableCurve: true, targetForThisExercise: true } }),
    object({ id: SPLINT_IDS.shell, name: text("DESIGN · Arch-conforming bite splint", "DIZAJN · Udlaga prilagođena zubnom luku"), caseRole: "DESIGN", cadRole: "splint", source: procedural("bite-splint.r6-shell", { challenge: input.challenge, thicknessMm: 2 }), editable: true, visible: false, workflowMetadata: { biteSplintPart: "splint", articulatorArch: "upper", exerciseThicknessTargetMm: 2, syntheticEducationalGeometry: true, patientFitValidated: false } }),
    object({ id: SPLINT_IDS.thickness, name: text("GUIDE · Thickness target for this exercise", "VODIČ · Cilj debljine za ovu vežbu"), caseRole: "GUIDE", cadRole: "other", source: procedural("bite-splint.r6-thickness-guide", { thicknessMm: 2 }), editable: false, visible: false, workflowMetadata: { targetForThisExercise: true, targetThicknessMm: 2 } }),
    object({ id: SPLINT_IDS.contacts, name: text("GUIDE · Contact review locations", "VODIČ · Mesta za pregled kontakata"), caseRole: "GUIDE", cadRole: "other", source: procedural("bite-splint.r6-contact-guide", { challenge: input.challenge }), editable: false, visible: false, workflowMetadata: { contactGuideOnly: true, notPatientSpecificOcclusion: true } }),
    object({ id: SPLINT_IDS.relation, name: text("REFERENCE · Synthetic jaw relation plane", "REFERENCA · Sintetička ravan odnosa vilica"), caseRole: "REFERENCE", cadRole: "reference", source: procedural("bite-splint.r6-relation-reference"), editable: false, visible: false, opacity: 0.45, referenceState: { isExample: true, visibility: "available_on_request", access: "always" }, workflowMetadata: { educationalRelationOnly: true } }),
  ];
  const upperId = caseObjectRuntimeId(input.caseId, SPLINT_IDS.upper);
  const lowerId = caseObjectRuntimeId(input.caseId, SPLINT_IDS.lower);
  const shellId = caseObjectRuntimeId(input.caseId, SPLINT_IDS.shell);
  const curvePoints = boundary.map(([x, y]) => [x, y, 0] as [number, number, number]);
  const checkpoints: CaseCheckpoint[] = SPLINT_CHECKPOINTS.map((stage) => ({
    id: stage.id,
    label: stage.label,
    source: { kind: "asset_snapshot", objects: objects.map((item) => ({ objectId: item.id, visible: (stage.visible as readonly string[]).includes(item.id) })) },
    workflowState: {},
  }));
  return casePackageManifestSchema.parse({
    schemaVersion: 1,
    packageId: input.packageId,
    caseId: input.caseId,
    slug: input.slug,
    workflowType: "bite_splint",
    difficulty: input.difficulty,
    metadata: { title: text(input.title, input.titleSr), description: text(input.description, input.descriptionSr), indication: text("Fictional stabilization splint exercise", "Izmišljena vežba stabilizacione udlage") },
    labOrder: { caseCode: input.challenge === "stabilization" ? "EDU-R6-SPL-01" : "EDU-R6-SPL-02", workflowType: "bite_splint", targetArch: "maxilla", targetTeeth: [], indication: text("Synthetic educational bite-splint design and contact review", "Sintetički edukativni dizajn udlage i pregled kontakata"), providedRecords: { en: ["Synthetic upper dentition", "Synthetic lower antagonist", "Editable upper-arch boundary", "Synthetic jaw relation reference"], sr: ["Sintetički gornji zubi", "Sintetički donji antagonist", "Granica gornjeg luka koja može da se menja", "Sintetička referenca odnosa vilica"] }, requiredOutput: { en: ["Editable arch-conforming splint design", "Boundary and thickness review", "Educational antagonist contact and clearance review"], sr: ["Udlaga koja može da se menja i prati zubni luk", "Pregled granice i debljine", "Edukativni pregled kontakta i zazora antagonista"] }, educationalDisclaimer: text("Synthetic teaching model only. No patient-fit, manufacturing, or functional-occlusion validation is represented.", "Samo sintetički model za obuku. Ne predstavlja proveru naleganja, proizvodnje ili funkcionalne okluzije pacijenta.") },
    objects,
    initialWorkflowState: {
      resetTransientState: true,
      curveState: { activeCurveId: curveId, curves: [{ id: curveId, kind: "splint_boundary", coordinateSpace: "object-local", objectId: upperId, points: curvePoints, closed: true }] },
      biteSplintSetup: { upperArchId: upperId, antagonistId: lowerId, splintId: shellId, boundaryCurveId: curveId, targetThicknessMm: 2 },
      articulatorSetup: { config: DEFAULT_ARTICULATOR_CONFIG, motion: "open_close" },
    },
    checkpoints,
    startingCheckpointId: "inspect",
    validationBindings: [{ id: "r6-splint-final", objectIds: [SPLINT_IDS.upper, SPLINT_IDS.lower, SPLINT_IDS.shell], binding: { kind: "inline", validatorType: "r6_workflow", config: { workflow: "bite_splint", check: "final" } } }],
    expectedOutput: { objectIds: [SPLINT_IDS.shell], description: text("Editable synthetic bite splint and reviewed case relationship", "Udlaga koja može da se menja i pregledani odnosi slučaja") },
    trainingNotes: [text("Targets are for this exercise. Contact maps and motion are educational previews, not patient-specific functional analysis.", "Ciljevi važe za ovu vežbu. Mape kontakata i pokreti su edukativni prikazi, ne funkcionalna analiza pacijenta.")],
    review: { status: "unreviewed" },
    compatibility: { practiceSources: [{ source: "bite-splint-case" }, { source: "articulator-case" }], scenarioSlugs: [input.scenarioSlug, "r6_virtual_articulator"] },
  });
}

export const BITE_SPLINT_R6_PACKAGES: CasePackageManifest[] = [
  createSplintPackage({ packageId: "r6-bite-splint-stabilization-v1", caseId: "r6splint1", slug: "r6-bite-splint-upper-stabilization", challenge: "stabilization", title: "Upper stabilization splint · R6", titleSr: "Gornja stabilizaciona udlaga · R6", description: "A fictional synthetic upper/lower case for boundary, shell, thickness, and antagonist review.", descriptionSr: "Izmišljeni sintetički slučaj gornje i donje vilice za pregled granice, udlage, debljine i antagonista.", difficulty: "beginner", scenarioSlug: "r6_bite_splint_stabilization" }),
  createSplintPackage({ packageId: "r6-bite-splint-contact-challenge-v1", caseId: "r6splint2", slug: "r6-bite-splint-contact-challenge", challenge: "contact_challenge", title: "Bite splint · contact challenge · R6", titleSr: "Udlaga · izazov kontakata · R6", description: "A second synthetic arch setup with a broader lower antagonist and asymmetric review locations.", descriptionSr: "Drugo sintetičko podešavanje lukova sa širim donjim antagonistom i asimetričnim mestima za pregled.", difficulty: "intermediate", scenarioSlug: "r6_bite_splint_contact_challenge" }),
];

type ModelPlan = { packageId: string; caseId: string; slug: string; scenarioSlug: string; arch: "upper" | "lower"; challenge: "routine" | "noisy_partial"; title: string; titleSr: string; description: string; descriptionSr: string; difficulty: "beginner" | "intermediate" | "advanced"; tilted: boolean };
const MODEL_STAGES = [
  { id: "raw_scan", label: text("Inspect the raw scan", "Pregledajte sirovi snimak"), sourceStage: "raw", tilted: true, base: false },
  { id: "trim", label: text("Trim peripheral scan excess", "Odsecite višak sa periferije snimka"), sourceStage: "trimmed", tilted: true, base: false },
  { id: "cleanup", label: text("Clean noise and components", "Očistite šum i komponente"), sourceStage: "cleaned", tilted: true, base: false },
  { id: "hole_fill", label: text("Review the repaired scan patch", "Pregledajte popravljenu zonu snimka"), sourceStage: "filled", tilted: true, base: false },
  { id: "orientation", label: text("Orient the working model", "Orijentišite radni model"), sourceStage: "filled", tilted: false, base: false },
  { id: "base", label: text("Create the arch support base", "Napravite noseću bazu luka"), sourceStage: "filled", tilted: false, base: true },
  { id: "final", label: text("Final mesh review", "Završni pregled mreže"), sourceStage: "filled", tilted: false, base: true },
] as const;

function createDigitalModelPackage(plan: ModelPlan) {
  const archName = plan.arch === "upper" ? "maxillary" : "mandibular";
  const ids = { raw: "source-raw-scan", working: "design-working-copy", trim: "guide-trim-boundary", base: "design-model-base" };
  const trimCurveId = `${plan.caseId}-trim-boundary`;
  const points = digitalModelTrimBoundary(plan.arch);
  const rawSource = procedural("digital-model.r6-scan", { arch: plan.arch, stage: "raw", challenge: plan.challenge, tilted: plan.tilted });
  const modelObjects: CaseObjectDescriptor[] = [
    object({ id: ids.raw, name: text(`SOURCE · Raw ${archName} scan · locked`, `IZVOR · Sirovi ${plan.arch === "upper" ? "maksilarni" : "mandibularni"} snimak · zaključan`), caseRole: "SOURCE", cadRole: "scan", source: rawSource, editable: false, visible: true, opacity: 0.42, dental: { arch: plan.arch }, workflowMetadata: { digitalModelPart: "raw_scan", scanArch: plan.arch, immutableSource: true, syntheticScanLikeMesh: true, digitalModelChallenge: plan.challenge } }),
    object({ id: ids.working, name: text(`DESIGN · Editable ${archName} working copy`, `DIZAJN · Radna kopija ${plan.arch === "upper" ? "maksilarnog" : "mandibularnog"} modela koja može da se menja`), caseRole: "DESIGN", cadRole: "scan", source: procedural("digital-model.r6-scan", { arch: plan.arch, stage: "raw", challenge: plan.challenge, tilted: false }), editable: true, visible: true, transform: plan.tilted ? { position: [1.5, -1, 1.1], rotation: [0.12, -0.06, 0.09], scale: [1, 1, 1] } : structuredClone(identity), dental: { arch: plan.arch }, workflowMetadata: { digitalModelPart: "working_model", digitalModelParentId: ids.raw, scanArch: plan.arch, sourceCopy: true, digitalModelChallenge: plan.challenge } }),
    object({ id: ids.trim, name: text("GUIDE · Editable trim boundary", "VODIČ · Granica trimovanja koja može da se menja"), caseRole: "GUIDE", cadRole: "other", source: procedural("digital-model.r6-trim-guide", { arch: plan.arch }), editable: false, visible: false, workflowMetadata: { digitalModelPart: "working_model", trimCurveId, trimGuide: true } }),
    object({ id: ids.base, name: text("DESIGN · Arch-support model base", "DIZAJN · Noseća baza zubnog luka"), caseRole: "DESIGN", cadRole: "model_base", source: procedural("digital-model.r6-base", { arch: plan.arch, heightMm: 8 }), editable: true, visible: false, workflowMetadata: { digitalModelPart: "base", digitalModelParentId: ids.working, scanArch: plan.arch, distinctDesignObject: true } }),
  ];
  const rawId = caseObjectRuntimeId(plan.caseId, ids.raw);
  const workingId = caseObjectRuntimeId(plan.caseId, ids.working);
  const baseId = caseObjectRuntimeId(plan.caseId, ids.base);
  const checkpoints: CaseCheckpoint[] = MODEL_STAGES.map((stage) => {
    const challenge = plan.challenge;
    const workingSource = procedural("digital-model.r6-scan", { arch: plan.arch, stage: stage.sourceStage, challenge, tilted: false });
    return {
      id: stage.id,
      label: stage.label,
      source: { kind: "asset_snapshot", objects: [
        { objectId: ids.working, source: workingSource, transform: stage.tilted ? { position: [1.5, -1, 1.1], rotation: [0.12, -0.06, 0.09], scale: [1, 1, 1] } : structuredClone(identity) },
        { objectId: ids.trim, visible: stage.id === "trim" || stage.id === "cleanup" },
        { objectId: ids.base, visible: stage.base },
      ] },
      workflowState: {
        digitalModelSetup: { rawScanId: rawId, workingModelId: workingId, baseId, trimBoundaryCurveId: trimCurveId, baseHeightMm: 8, dieIds: [], attachmentIds: [], stage: stage.id },
      },
    };
  });
  const curve = { id: trimCurveId, kind: "model_trim_boundary", coordinateSpace: "object-local", objectId: workingId, points, closed: true };
  return casePackageManifestSchema.parse({
    schemaVersion: 1,
    packageId: plan.packageId,
    caseId: plan.caseId,
    slug: plan.slug,
    workflowType: "digital_model",
    difficulty: plan.difficulty,
    metadata: { title: text(plan.title, plan.titleSr), description: text(plan.description, plan.descriptionSr), indication: text("Synthetic scan preparation for an educational digital model", "Priprema sintetičkog snimka za edukativni digitalni model") },
    labOrder: { caseCode: plan.challenge === "noisy_partial" ? "EDU-R6-DM-03" : plan.arch === "upper" ? "EDU-R6-DM-01" : "EDU-R6-DM-02", workflowType: "digital_model", targetArch: plan.arch === "upper" ? "maxilla" : "mandible", targetTeeth: [], indication: text("Prepare a synthetic scan for a clear educational model", "Pripremite sintetički snimak za jasan edukativni model"), providedRecords: { en: ["Immutable raw scan-like SOURCE", "Separate editable working copy", "Trim boundary guide", "Arch-shaped support-base design"], sr: ["Nepromjenjivi sirovi izvorni snimak", "Odvojena radna kopija koja može da se menja", "Vodič granice trimovanja", "Dizajn noseće baze u obliku luka"] }, requiredOutput: { en: ["Clean working model", "Reviewed orientation and scan holes", "Separate arch-support base", "Final mesh check"], sr: ["Čist radni model", "Pregledana orijentacija i rupe snimka", "Odvojena noseća baza luka", "Završna provera mreže"] }, educationalDisclaimer: text("Synthetic scan-preparation lesson. The base is a separate presentation/support object; no clinical or manufacturing validation is represented.", "Sintetička vežba pripreme snimka. Baza je zaseban objekat za prikaz i potporu; ne predstavlja kliničku ni proizvodnu proveru.") },
    objects: modelObjects,
    initialWorkflowState: { resetTransientState: true, curveState: { activeCurveId: trimCurveId, curves: [curve] }, digitalModelSetup: { rawScanId: rawId, workingModelId: workingId, baseId, trimBoundaryCurveId: trimCurveId, baseHeightMm: 8, dieIds: [], attachmentIds: [], stage: "raw_scan" } },
    checkpoints,
    startingCheckpointId: "raw_scan",
    validationBindings: [{ id: "r6-digital-model-final", objectIds: [ids.raw, ids.working, ids.base], binding: { kind: "inline", validatorType: "r6_workflow", config: { workflow: "digital_model", check: "final" } } }],
    expectedOutput: { objectIds: [ids.working, ids.base], description: text("An editable prepared working model with the raw SOURCE preserved and a separate arch support base", "Radni model koji može da se menja, sa sačuvanim sirovim IZVOROM i zasebnom nosećom bazom luka") },
    trainingNotes: [text("Delete, trim, smooth, fill and cleanup operations apply to the editable working copy. Keep the locked SOURCE unchanged.", "Brisanje, trimovanje, zaglađivanje, popunjavanje i čišćenje primenjuju se na radnu kopiju. Zaključani IZVOR ostaje neizmenjen.")],
    review: { status: "unreviewed" },
    compatibility: { practiceSources: [{ source: "digital-model-case" }], scenarioSlugs: [plan.scenarioSlug] },
  });
}

export const DIGITAL_MODEL_R6_PACKAGES: CasePackageManifest[] = [
  createDigitalModelPackage({ packageId: "r6-digital-model-maxillary-v1", caseId: "r6dmmx", slug: "r6-digital-model-maxillary", scenarioSlug: "r6_digital_model_maxillary", arch: "upper", challenge: "routine", title: "Maxillary scan cleanup · R6", titleSr: "Čišćenje maksilarnog snimka · R6", description: "Prepare a synthetic upper-arch scan with a peripheral flange, a small open patch, and a tilted working copy.", descriptionSr: "Pripremite sintetički snimak gornjeg luka sa perifernim viškom, malim otvorenim delom i nagnutom radnom kopijom.", difficulty: "beginner", tilted: true }),
  createDigitalModelPackage({ packageId: "r6-digital-model-mandibular-v1", caseId: "r6dmmd", slug: "r6-digital-model-mandibular", scenarioSlug: "r6_digital_model_mandibular", arch: "lower", challenge: "routine", title: "Mandibular scan cleanup · R6", titleSr: "Čišćenje mandibularnog snimka · R6", description: "Prepare a synthetic lower-arch scan with different ridge contours and an orientation that needs correction.", descriptionSr: "Pripremite sintetički snimak donjeg luka sa drugačijim konturama grebena i orijentacijom koju treba ispraviti.", difficulty: "intermediate", tilted: true }),
  createDigitalModelPackage({ packageId: "r6-digital-model-noisy-partial-v1", caseId: "r6dmpc", slug: "r6-digital-model-noisy-partial", scenarioSlug: "r6_digital_model_noisy_partial", arch: "upper", challenge: "noisy_partial", title: "Noisy partial scan preparation · R6", titleSr: "Priprema delimičnog snimka sa šumom · R6", description: "A more difficult partial maxillary scan with missing regions, a peripheral scan flare, a detached fragment, and a small scan hole.", descriptionSr: "Zahtevniji delimični maksilarni snimak sa nedostajućim regijama, perifernim viškom, odvojenim fragmentom i malom rupom u snimku.", difficulty: "advanced", tilted: true }),
];

export const DENTAL_REALISM_R6_PACKAGES = [...BITE_SPLINT_R6_PACKAGES, ...DIGITAL_MODEL_R6_PACKAGES];
