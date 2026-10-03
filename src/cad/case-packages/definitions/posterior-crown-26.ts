import { caseObjectRuntimeId } from "../identity";
import { casePackageManifestSchema } from "../contract";

const caseId = "crown26";
const caseObjectIds = {
  preparation: caseObjectRuntimeId(caseId, "preparation"),
  adjacent: caseObjectRuntimeId(caseId, "adjacent-25"),
  antagonist: caseObjectRuntimeId(caseId, "antagonist-36"),
  restoration: caseObjectRuntimeId(caseId, "restoration"),
  reference: caseObjectRuntimeId(caseId, "reference"),
  insertionAxis: caseObjectRuntimeId(caseId, "insertion-axis"),
} as const;

const transform = (position: [number, number, number], rotation: [number, number, number], scale: [number, number, number]) => ({ position, rotation, scale });

export const posteriorCrown26Package = casePackageManifestSchema.parse({
  schemaVersion: 1,
  packageId: "posterior-crown-26-v1",
  caseId,
  slug: "synthetic-posterior-crown-26",
  workflowType: "crown",
  difficulty: "beginner",
  metadata: {
    title: { en: "Posterior Crown · tooth 26", sr: "Bočna krunica · zub 26" },
    description: { en: "A synthetic case package proving the shared case-loading path.", sr: "Sintetički paket slučaja za proveru zajedničkog učitavanja." },
    indication: { en: "Training case for crown design tools.", sr: "Slučaj za vežbu alata za dizajn krunice." },
  },
  labOrder: {
    caseCode: "PT-SYN-0026",
    workflowType: "crown",
    restorationType: "crown",
    targetTeeth: [26],
    targetArch: "maxilla",
    indication: { en: "Synthetic posterior crown exercise.", sr: "Sintetička vežba izrade bočne krunice." },
    providedRecords: { en: ["Preparation 26", "Adjacent tooth 25", "Antagonist 36"], sr: ["Preparacija 26", "Susjedni zub 25", "Antagonist 36"] },
    requiredOutput: { en: ["Editable crown design for tooth 26"], sr: ["Izmenljiv dizajn krunice za zub 26"] },
    materialPreset: { en: "Synthetic training preset", sr: "Sintetički trening preset" },
    notes: { en: "Geometry is simplified teaching geometry with unknown external asset provenance because this proof package uses no external assets.", sr: "Geometrija je pojednostavljena za obuku; paket ne koristi spoljne modele." },
    educationalDisclaimer: { en: "Educational software only. Exercise criteria do not indicate clinical approval or manufacturing validity.", sr: "Samo za edukaciju. Kriterijumi vežbe ne potvrđuju kliničko odobrenje niti ispravnost za proizvodnju." },
  },
  assetRefs: [],
  objects: [
    { id: "preparation", name: { en: "Preparation · 26", sr: "Preparacija · 26" }, caseRole: "SOURCE", cadRole: "prepared_tooth", source: { kind: "procedural", factoryId: "synthetic.tooth", parameters: { kind: "preparation" } }, editable: false, visible: true, opacity: 1, transform: transform([0, 0, 0], [0, 0, 0], [0.86, 0.86, 0.82]), dental: { fdi: 26, arch: "maxilla" } },
    { id: "adjacent-25", name: { en: "Adjacent tooth · 25", sr: "Susjedni zub · 25" }, caseRole: "SOURCE", cadRole: "tooth", source: { kind: "procedural", factoryId: "synthetic.tooth", parameters: { kind: "restoration", geometryScale: [0.84, 0.84, 0.9] } }, editable: false, visible: true, opacity: 1, transform: transform([-8, 0, 0], [0, 0, -0.08], [0.82, 0.82, 0.86]), dental: { fdi: 25, arch: "maxilla" } },
    { id: "antagonist-36", name: { en: "Antagonist · 36", sr: "Antagonista · 36" }, caseRole: "SOURCE", cadRole: "antagonist", source: { kind: "procedural", factoryId: "synthetic.tooth", parameters: { kind: "restoration" } }, editable: false, visible: true, opacity: 1, transform: transform([0, 0, 11], [Math.PI, 0, 0], [0.8, 0.8, 0.8]), dental: { fdi: 36, arch: "mandible" } },
    { id: "restoration", name: { en: "Crown restoration · 26", sr: "Krunica · 26" }, caseRole: "DESIGN", cadRole: "crown", source: { kind: "procedural", factoryId: "synthetic.crown", parameters: { kind: "restoration" } }, editable: true, visible: true, opacity: 1, transform: transform([0, 0, 0], [0, 0, 0], [1, 1, 1]), parentId: "preparation", dental: { fdi: 26, arch: "maxilla" }, workflowMetadata: { restorationType: "crown", restorationUnitIds: ["crown-unit-26"] } },
    { id: "reference", name: { en: "Crown example · synthetic", sr: "Primer krunice · sintetički" }, caseRole: "REFERENCE", cadRole: "reference", source: { kind: "procedural", factoryId: "synthetic.crown", parameters: { kind: "reference" } }, editable: false, visible: false, opacity: 0.4, transform: transform([0, 0, 0], [0, 0, 0], [1, 1, 1]), parentId: "preparation", referenceState: { isExample: true, visibility: "hidden", access: "always" } },
    { id: "insertion-axis", name: { en: "Insertion axis · exercise guide", sr: "Osa insercije · vodič vežbe" }, caseRole: "GUIDE", cadRole: "other", source: { kind: "procedural", factoryId: "guide.axis", parameters: { length: 7, radius: 0.07, color: "#d99141" } }, editable: false, visible: true, opacity: 0.85, transform: transform([7, 0, -2], [0, 0, 0], [1, 1, 1]), parentId: "preparation" },
  ],
  initialWorkflowState: {
    resetTransientState: true,
    restorativeSetup: { restorationType: "crown", connectorWidthMm: 3, insertionDirection: [0, 0, 1], units: [{ id: "crown-unit-26", kind: "crown", toothNumber: 26 }] },
  },
  checkpoints: [{ id: "baseline", label: { en: "Package baseline", sr: "Početno stanje paketa" }, source: { kind: "package_baseline" } }],
  startingCheckpointId: "baseline",
  validationBindings: [
    { id: "preparation-26", objectIds: ["preparation"], binding: { kind: "inline", validatorType: "required_object", config: { requiredRole: "prepared_tooth" } } },
    { id: "crown-design-26", objectIds: ["restoration", "preparation"], binding: { kind: "inline", validatorType: "restorative_setup", config: { restorationType: "crown" } } },
  ],
  expectedOutput: { objectIds: ["restoration"], description: { en: "Editable synthetic crown design for tooth 26.", sr: "Izmenljiv sintetički dizajn krunice za zub 26." }, format: "prostheia-cad-object" },
  trainingNotes: [{ en: "This package is an architecture proof only. Its generated geometry is not realistic dental anatomy.", sr: "Ovaj paket samo proverava arhitekturu. Generisana geometrija nije realistična dentalna anatomija." }],
  review: { status: "unreviewed" },
  compatibility: { practiceSources: [{ source: "crown-case" }, { source: "restorative-case", restorationType: "crown" }], scenarioSlugs: ["synthetic_posterior_crown_26"] },
});

export const POSTERIOR_CROWN_26_OBJECT_IDS = caseObjectIds;
