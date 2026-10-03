import { caseObjectRuntimeId } from "../identity";
import { casePackageManifestSchema, type CaseObjectDescriptor } from "../contract";
import { PRIVATE_FIXED_ASSET_IDS } from "../private-asset-catalog";
import { mapSerbianFields, normalizeR3SerbianCopy } from "@/lib/dental-language";

const V = PRIVATE_FIXED_ASSET_IDS;
const transform = (position: [number, number, number] = [0, 0, 0], rotation: [number, number, number] = [0, 0, 0]) => ({ position, rotation, scale: [1, 1, 1] as [number, number, number] });

function serbianR3ObjectName(name: string) {
  return name
    .replace(/\bSOURCE\b/g, "IZVOR")
    .replace(/\bDESIGN\b/g, "DIZAJN")
    .replace(/\bGUIDE\b/g, "VODIČ")
    .replace(/\bREFERENCE\b/g, "REFERENCA")
    .replace("Prepared abutment", "Preparisani nosač")
    .replace("Prepared tooth", "Preparisani zub")
    .replace("Adjacent lateral incisor", "Susedni lateralni sekutić")
    .replace("Adjacent tooth", "Susedni zub")
    .replace("Neighboring tooth", "Susedni zub")
    .replace("Neighbor tooth", "Susedni zub")
    .replace("Opposing incisor", "Suprotni sekutić")
    .replace("Antagonist", "Antagonista")
    .replace("Synthetic local gingiva/support", "Lokalna sintetička gingiva/potpora")
    .replace("synthetic relation", "sintetički odnos")
    .replace("Margin location", "Položaj margine")
    .replace("Common insertion direction", "Zajednički smer insercije")
    .replace("Facial shell insertion direction", "Smer insercije facijalne ljuske")
    .replace("Insertion direction", "Smer insercije")
    .replace("Intact pre-op morphology", "Intaktna preoperativna morfologija")
    .replace("Intact tooth morphology", "Morfologija intaktnog zuba")
    .replace("Intact occlusal morphology", "Intaktna okluzalna morfologija")
    .replace("Pontic target morphology", "Ciljna morfologija međučlana")
    .replace("Connected Bridge", "Povezani most")
    .replace("units and connectors", "jedinice i konektori")
    .replace("Broad cuspal preparation", "Šira preparacija kvržica")
    .replace("Intracoronal preparation", "Intrakoronalna preparacija")
    .replace("Anterior preparation", "Prednja preparacija")
    .replace("Thin facial Veneer shell", "Tanka facijalna ljuska fasete")
    .replace("Occlusal Inlay", "Okluzalni inlej")
    .replace("Cuspal Onlay", "Onlej preko kvržica")
    .replace("Crown proposal", "Predlog krunice")
    .replace("exercise only", "samo za vežbu")
    .replace("· exercise", "· vežba")
    .replace("Veneer", "faseta")
    .replace("Inlay", "inlej")
    .replace("Onlay", "onlej")
    .replace("Crown", "krunica")
    .replace("pre-op", "preoperativni");
}

function assetObject(args: {
  id: string; name: string; caseRole: CaseObjectDescriptor["caseRole"]; cadRole: CaseObjectDescriptor["cadRole"];
  assetRefId: string; fdi?: number; arch?: "maxilla" | "mandible"; editable?: boolean; visible?: boolean; opacity?: number;
  position?: [number, number, number]; rotation?: [number, number, number]; parentId?: string;
  restorationType?: "crown" | "bridge" | "inlay" | "onlay" | "veneer";
  restorationUnitIds?: string[]; coverage?: string; reference?: boolean;
}): CaseObjectDescriptor {
  const { id, name, caseRole, cadRole, assetRefId, fdi, arch, editable = false, visible = true, opacity = 1, position, rotation, parentId, restorationType, restorationUnitIds, coverage, reference } = args;
  return {
    id, name: { en: name, sr: serbianR3ObjectName(name) }, caseRole, cadRole, source: { kind: "asset", assetRefId }, required: true,
    editable, visible, opacity, transform: transform(position, rotation), ...(parentId ? { parentId } : {}),
    ...(fdi ? { dental: { fdi, arch } } : {}),
    workflowMetadata: {}, segmentation: [],
    ...(restorationType ? { workflowMetadata: { restorationType, restorationUnitIds, ...(coverage ? { coverage } : {}) } } : {}),
    ...(reference ? { referenceState: { isExample: true, visibility: "available_on_request", access: "always" } } : {}),
  };
}

function proceduralObject(args: {
  id: string; name: string; caseRole: CaseObjectDescriptor["caseRole"]; cadRole: CaseObjectDescriptor["cadRole"];
  factoryId: string; parameters: Record<string, unknown>; visible?: boolean; opacity?: number;
  position?: [number, number, number]; rotation?: [number, number, number]; parentId?: string;
}): CaseObjectDescriptor {
  const { id, name, caseRole, cadRole, factoryId, parameters, visible = true, opacity = 1, position, rotation, parentId } = args;
  return {
    id, name: { en: name, sr: serbianR3ObjectName(name) }, caseRole, cadRole, source: { kind: "procedural", factoryId, parameters }, required: true,
    editable: false, visible, opacity, transform: transform(position, rotation), ...(parentId ? { parentId } : {}),
    workflowMetadata: {}, segmentation: [],
  };
}

const ref = (id: string, assetId: string) => ({ id, runtimeAssetId: assetId, required: true });
const curvePoints = (xRadius: number, yRadius: number, z = 0.08) => Array.from({ length: 10 }, (_, index) => {
  const angle = Math.PI * 2 * index / 10;
  return [xRadius * Math.cos(angle), yRadius * Math.sin(angle), z] as [number, number, number];
});
function seededMargins(caseId: string, preparations: { id: string; xRadius: number; yRadius: number; position?: [number, number, number] }[]) {
  const curves = preparations.map((prep, index) => ({
    id: `r3-margin-${index + 1}`,
    kind: "margin" as const,
    coordinateSpace: "object-local" as const,
    objectId: caseObjectRuntimeId(caseId, prep.id),
    points: curvePoints(prep.xRadius, prep.yRadius),
    closed: true,
  }));
  return { curveState: { curves, activeCurveId: curves.at(-1)?.id ?? null } };
}
function setup(type: "crown" | "bridge" | "inlay" | "onlay" | "veneer", units: { id: string; kind: "crown" | "abutment" | "pontic" | "connector" | "inlay" | "onlay" | "veneer"; toothNumber?: number }[], connectorWidthMm = 2.8) {
  return { resetTransientState: true, restorativeSetup: { restorationType: type, connectorWidthMm, insertionDirection: [0, 0, 1], units } };
}
function checkpoint(id: string, label: string, overrides: { objectId: string; assetRefId?: string; visible?: boolean; opacity?: number; transform?: ReturnType<typeof transform> }[], workflowState: Record<string, unknown> = {}) {
  return {
    id, label: { en: label, sr: label }, source: { kind: "asset_snapshot" as const, objects: overrides }, workflowState,
  };
}
function visibility(objectId: string, assetRefId: string, visible: boolean, position?: [number, number, number], replaceAsset = false) {
  return { objectId, ...(replaceAsset ? { assetRefId } : {}), visible, ...(position ? { transform: transform(position) } : {}) };
}
function marginGuide(id: string, parentId: string, xRadius: number, yRadius: number, position: [number, number, number] = [0, 0, 0]) {
  return proceduralObject({ id, name: "GUIDE · Margin location · exercise only", caseRole: "GUIDE", cadRole: "other", factoryId: "guide.margin-loop", parameters: { radiusX: xRadius, radiusY: yRadius, color: "#4db8ae" }, visible: false, opacity: 0.95, position, parentId });
}
function gingiva(width: number, thickness = 8, opacity = 0.92, positionZ = 0) {
  return proceduralObject({ id: "gingiva", name: "SOURCE · Synthetic local gingiva/support", caseRole: "SOURCE", cadRole: "model_base", factoryId: "training.gingiva", parameters: { width, thickness }, opacity, position: [0, 0, positionZ] });
}
const disclaimer = {
  en: "Private educational training case. Tooth geometry is used under CC BY attribution and transformed for an exercise display frame. Source units, source-image authorization, patient provenance, expert review, and clinical suitability are not established. No patient-specific jaw relation is represented.",
  sr: "Privatni edukativni slučaj za obuku. Geometrija zuba koristi se uz CC BY atribuciju i transformiše se za prikaz vežbe. Izvorne jedinice, odobrenje za izvorne snimke, poreklo podataka pacijenta, stručna revizija i klinička podobnost nisu utvrđeni. Nije prikazan odnos vilica konkretnog pacijenta.",
};

const crown26Units = [{ id: "crown-unit-26", kind: "crown" as const, toothNumber: 26 }];
const crown36Units = [{ id: "crown-unit-36", kind: "crown" as const, toothNumber: 36 }];
const bridgeUnits = [
  { id: "bridge-unit-abutment-24", kind: "abutment" as const, toothNumber: 24 },
  { id: "bridge-unit-pontic-25", kind: "pontic" as const, toothNumber: 25 },
  { id: "bridge-unit-abutment-26", kind: "abutment" as const, toothNumber: 26 },
  { id: "bridge-connector-24-25", kind: "connector" as const },
  { id: "bridge-connector-25-26", kind: "connector" as const },
];
const inlayUnits = [{ id: "inlay-unit-36", kind: "inlay" as const, toothNumber: 36 }];
const onlayUnits = [{ id: "onlay-unit-26", kind: "onlay" as const, toothNumber: 26 }];
const veneerUnits = [{ id: "veneer-unit-21", kind: "veneer" as const, toothNumber: 21 }];

const crown26Refs = [ref("prep26", V.prepCrown26), ref("tooth25", V.intact25), ref("tooth27", V.intact27), ref("antagonist36", V.intact36), ref("design26", V.crown26), ref("design26-placement", V.crown26Placement), ref("design26-near-final", V.crown26NearFinal), ref("reference26", V.intact26)];
const crown36Refs = [ref("prep36", V.prepCrown36), ref("tooth35", V.intact35), ref("tooth34", V.intact34), ref("antagonist26", V.intact26), ref("design36", V.crown36), ref("reference36", V.intact36)];

const margin26 = seededMargins("r3c26", [{ id: "preparation", xRadius: 3.1, yRadius: 3.0 }]);
const margin36 = seededMargins("r3c36", [{ id: "preparation", xRadius: 3.0, yRadius: 3.0 }]);
const marginBridge = seededMargins("r3bridge246", [{ id: "preparation-24", xRadius: 2.7, yRadius: 2.9, position: [-8.1, 0, 0] }, { id: "preparation-26", xRadius: 3.1, yRadius: 3.0, position: [8.6, 0, 0] }]);
const marginInlay = seededMargins("r3inlay36", [{ id: "preparation", xRadius: 3.0, yRadius: 3.0 }]);
const marginOnlay = seededMargins("r3onlay26", [{ id: "preparation", xRadius: 3.1, yRadius: 3.0 }]);
const marginVeneer = seededMargins("r3veneer21", [{ id: "preparation", xRadius: 2.3, yRadius: 3.8 }]);

export const fixedCrown26R3Package = casePackageManifestSchema.parse({
  schemaVersion: 1, packageId: "r3-crown-26-v1", caseId: "r3c26", slug: "r3-crown-26", workflowType: "crown", difficulty: "intermediate",
  metadata: { title: { en: "Posterior Crown · tooth 26", sr: "Bočna krunica · zub 26" }, description: { en: "A private fixed-prosthetics exercise with a source-derived posterior preparation and an editable anatomical crown proposal.", sr: "Privatna vežba fiksne protetike sa preparacijom izvedenom iz izvornog posteriornog zuba i anatomskim predlogom krunice koji se može uređivati." }, indication: { en: "Single-unit posterior crown training case.", sr: "Vežba za pojedinačnu bočnu krunicu." } },
  labOrder: { caseCode: "PT-EDU-R3-C26", workflowType: "crown", restorationType: "crown", targetTeeth: [26], targetArch: "maxilla", indication: { en: "Single posterior Crown 26; fictional educational order.", sr: "Pojedinačna bočna krunica 26; izmišljeni edukativni nalog." }, providedRecords: { en: ["Prepared source tooth 26", "Adjacent teeth 25 and 27", "Opposing tooth 36", "Synthetic local gingiva/support", "Intact morphology reference 26"], sr: ["Preparisani izvorni zub 26", "Susedni zubi 25 i 27", "Suprotni zub 36", "Sintetička lokalna gingiva/potpora", "Referenca intaktne morfologije 26"] }, requiredOutput: { en: ["Editable anatomical Crown proposal for tooth 26"], sr: ["Anatomski predlog krunice za zub 26 koji se može uređivati"] }, materialPreset: { en: "Ivory ceramic training preset", sr: "Trenažni preset keramike boje slonovače" }, notes: { en: "Synthetic educational case assembled from anatomy assets and exercise-derived geometry; not a patient record.", sr: "Sintetički edukativni slučaj sastavljen od anatomskih sredstava i geometrije izvedene za vežbu; nije zapis pacijenta." }, educationalDisclaimer: disclaimer },
  assetRefs: crown26Refs,
  objects: [
    assetObject({ id: "preparation", name: "SOURCE · Prepared tooth · 26", caseRole: "SOURCE", cadRole: "prepared_tooth", assetRefId: "prep26", fdi: 26, arch: "maxilla" }),
    assetObject({ id: "adjacent-25", name: "SOURCE · Adjacent tooth · 25", caseRole: "SOURCE", cadRole: "tooth", assetRefId: "tooth25", fdi: 25, arch: "maxilla", position: [-9.1, 0, 0] }),
    assetObject({ id: "adjacent-27", name: "SOURCE · Adjacent tooth · 27", caseRole: "SOURCE", cadRole: "tooth", assetRefId: "tooth27", fdi: 27, arch: "maxilla", position: [9.8, 0, 0] }),
    assetObject({ id: "antagonist-36", name: "SOURCE · Antagonist · 36 · synthetic relation", caseRole: "SOURCE", cadRole: "antagonist", assetRefId: "antagonist36", fdi: 36, arch: "mandible", opacity: 0.42, rotation: [Math.PI, 0, 0], position: [0, 0, 5] }),
    gingiva(13.5, 2.4, 0.46, -0.8),
    proceduralObject({ id: "insertion-axis", name: "GUIDE · Insertion direction · exercise", caseRole: "GUIDE", cadRole: "other", factoryId: "guide.axis", parameters: { length: 7, radius: 0.07, color: "#d89145" }, visible: false, opacity: 0.88 }),
    marginGuide("margin-guide", "preparation", 3.1, 3.0),
    assetObject({ id: "restoration", name: "DESIGN · Crown proposal · 26", caseRole: "DESIGN", cadRole: "crown", assetRefId: "design26", fdi: 26, arch: "maxilla", editable: true, visible: false, parentId: "preparation", restorationType: "crown", restorationUnitIds: crown26Units.map((unit) => unit.id) }),
    assetObject({ id: "reference", name: "REFERENCE · Intact tooth morphology · 26", caseRole: "REFERENCE", cadRole: "reference", assetRefId: "reference26", fdi: 26, arch: "maxilla", visible: false, opacity: 0.5, reference: true }),
  ],
  initialWorkflowState: setup("crown", crown26Units),
  checkpoints: [
    { id: "case_start", label: { en: "Case baseline", sr: "Početno stanje slučaja" }, source: { kind: "package_baseline" } },
    { id: "margin", label: { en: "Raw prepared case · trace the margin", sr: "Sirovo stanje preparacije · iscrtajte marginu" }, source: { kind: "package_baseline" }, workflowState: setup("crown", crown26Units) },
    checkpoint("insertion_path", "Margin available · review insertion", [visibility("insertion-axis", "design26", false), visibility("margin-guide", "design26", true)], margin26),
    checkpoint("placement", "Crown proposal ready for positioning", [visibility("insertion-axis", "design26", true), visibility("margin-guide", "design26", true), visibility("restoration", "design26-placement", true, undefined, true)], margin26),
    checkpoint("contacts", "Crown positioned for contact review", [visibility("insertion-axis", "design26", true), visibility("margin-guide", "design26", true), visibility("restoration", "design26", true)], margin26),
    checkpoint("sculpt", "Crown positioned with reference for morphology work", [visibility("insertion-axis", "design26", true), visibility("margin-guide", "design26", true), visibility("restoration", "design26", true), visibility("reference", "reference26", true)], margin26),
    checkpoint("thickness", "Near-final crown for section and thickness", [visibility("insertion-axis", "design26", true), visibility("margin-guide", "design26", true), visibility("restoration", "design26-near-final", true, undefined, true)], margin26),
    checkpoint("proposal_ready", "Free Lab · anatomical proposal ready", [visibility("insertion-axis", "design26", true), visibility("margin-guide", "design26", true), visibility("restoration", "design26-placement", true, [0, 0, -1.15], true)], margin26),
  ],
  startingCheckpointId: "case_start",
  validationBindings: [
    { id: "crown-preparation", objectIds: ["preparation"], binding: { kind: "inline", validatorType: "required_object", config: { requiredRole: "prepared_tooth", editable: false } } },
    { id: "crown-proposal", objectIds: ["restoration", "preparation"], binding: { kind: "inline", validatorType: "restorative_setup", config: { restorationType: "crown" } } },
  ],
  expectedOutput: { objectIds: ["restoration"], description: { en: "Editable source-derived anatomical Crown proposal for the tooth 26 exercise.", sr: "Anatomski predlog krunice izveden iz izvornog zuba za vežbu zuba 26." }, format: "prostheia-cad-object" },
  trainingNotes: [
    { en: "Private educational v1 only. Source units and original anatomical coordinates remain unknown; runtime scaling and orientation are training-display assumptions.", sr: "Samo privatna edukativna verzija 1. Izvorne jedinice i anatomske koordinate ostaju nepoznate; razmera i orijentacija u runtime-u su pretpostavke za prikaz vežbe." },
    { en: "Target for this exercise: use the margin and insertion guides, then adapt the anatomical proposal with the shared CAD tools.", sr: "Cilj ove vežbe: koristite vodiče margine i insercije, zatim prilagodite anatomski predlog zajedničkim CAD alatima." },
  ],
  review: { status: "unreviewed" }, compatibility: { practiceSources: [{ source: "crown-case" }, { source: "restorative-case", restorationType: "crown" }], scenarioSlugs: ["r3_crown_26_case"] },
});

export const fixedCrown36R3Package = casePackageManifestSchema.parse({
  schemaVersion: 1, packageId: "r3-crown-36-v1", caseId: "r3c36", slug: "r3-crown-36", workflowType: "crown", difficulty: "intermediate",
  metadata: { title: { en: "Posterior Crown · tooth 36", sr: "Bočna krunica · zub 36" }, description: { en: "A distinct mandibular first-molar crown case with an anatomical proposal and an upper antagonist.", sr: "Zaseban slučaj krunice donjeg prvog molara sa anatomskim predlogom i gornjim antagonistom." }, indication: { en: "Single-unit mandibular posterior crown training case.", sr: "Vežba za pojedinačnu bočnu krunicu donjeg zuba." } },
  labOrder: { caseCode: "PT-EDU-R3-C36", workflowType: "crown", restorationType: "crown", targetTeeth: [36], targetArch: "mandible", indication: { en: "Single posterior Crown 36; fictional educational order.", sr: "Pojedinačna bočna krunica 36; izmišljeni edukativni nalog." }, providedRecords: { en: ["Prepared source tooth 36", "Adjacent teeth 34 and 35", "Opposing tooth 26", "Synthetic local gingiva/support", "Intact morphology reference 36"], sr: ["Preparisani izvorni zub 36", "Susedni zubi 34 i 35", "Suprotni zub 26", "Sintetička lokalna gingiva/potpora", "Referenca intaktne morfologije 36"] }, requiredOutput: { en: ["Editable anatomical Crown proposal for tooth 36"], sr: ["Anatomski predlog krunice za zub 36 koji se može uređivati"] }, materialPreset: { en: "Ivory ceramic training preset", sr: "Trenažni preset keramike boje slonovače" }, notes: { en: "Fictional educational case built from private training assets; not a patient record.", sr: "Izmišljeni edukativni slučaj napravljen od privatnih trenažnih sredstava; nije zapis pacijenta." }, educationalDisclaimer: disclaimer },
  assetRefs: crown36Refs,
  objects: [
    assetObject({ id: "preparation", name: "SOURCE · Prepared tooth · 36", caseRole: "SOURCE", cadRole: "prepared_tooth", assetRefId: "prep36", fdi: 36, arch: "mandible" }),
    assetObject({ id: "adjacent-35", name: "SOURCE · Adjacent tooth · 35", caseRole: "SOURCE", cadRole: "tooth", assetRefId: "tooth35", fdi: 35, arch: "mandible", position: [-9.3, 0, 0] }),
    assetObject({ id: "adjacent-34", name: "SOURCE · Neighboring tooth · 34", caseRole: "SOURCE", cadRole: "tooth", assetRefId: "tooth34", fdi: 34, arch: "mandible", position: [-17.1, 0, 0] }),
    assetObject({ id: "antagonist-26", name: "SOURCE · Antagonist · 26 · synthetic relation", caseRole: "SOURCE", cadRole: "antagonist", assetRefId: "antagonist26", fdi: 26, arch: "maxilla", rotation: [Math.PI, 0, 0], position: [0, 0, 12] }),
    gingiva(20),
    proceduralObject({ id: "insertion-axis", name: "GUIDE · Insertion direction · exercise", caseRole: "GUIDE", cadRole: "other", factoryId: "guide.axis", parameters: { length: 7, radius: 0.07, color: "#d89145" }, visible: false, opacity: 0.88 }),
    marginGuide("margin-guide", "preparation", 3.0, 3.0),
    assetObject({ id: "restoration", name: "DESIGN · Crown proposal · 36", caseRole: "DESIGN", cadRole: "crown", assetRefId: "design36", fdi: 36, arch: "mandible", editable: true, visible: false, parentId: "preparation", restorationType: "crown", restorationUnitIds: crown36Units.map((unit) => unit.id) }),
    assetObject({ id: "reference", name: "REFERENCE · Intact tooth morphology · 36", caseRole: "REFERENCE", cadRole: "reference", assetRefId: "reference36", fdi: 36, arch: "mandible", visible: false, opacity: 0.5, reference: true }),
  ],
  initialWorkflowState: setup("crown", crown36Units),
  checkpoints: [
    { id: "case_start", label: { en: "Case baseline", sr: "Početno stanje slučaja" }, source: { kind: "package_baseline" } },
    checkpoint("insertion_path", "Margin available · review insertion", [visibility("insertion-axis", "design36", false), visibility("margin-guide", "design36", true)], margin36),
    checkpoint("proposal_ready", "Free Lab · anatomical proposal ready", [visibility("insertion-axis", "design36", true), visibility("margin-guide", "design36", true), visibility("restoration", "design36", true)], margin36),
  ],
  startingCheckpointId: "case_start",
  validationBindings: [{ id: "crown-proposal-36", objectIds: ["restoration", "preparation"], binding: { kind: "inline", validatorType: "restorative_setup", config: { restorationType: "crown" } } }],
  expectedOutput: { objectIds: ["restoration"], description: { en: "Editable anatomical Crown proposal for the tooth 36 exercise.", sr: "Anatomski predlog krunice izveden iz izvornog zuba za vežbu zuba 36." }, format: "prostheia-cad-object" },
  trainingNotes: [{ en: "Target for this exercise: use the source-specific anatomy and the shared CAD tools; numeric settings are exercise targets only.", sr: "Cilj ove vežbe: koristite anatomiju ovog izvora i zajedničke CAD alate; numerička podešavanja su samo ciljevi vežbe." }],
  review: { status: "unreviewed" }, compatibility: { practiceSources: [{ source: "crown-case" }], scenarioSlugs: ["r3_crown_36_case"] },
});

export const fixedBridge2426R3Package = casePackageManifestSchema.parse({
  schemaVersion: 1, packageId: "r3-bridge-24-26-v1", caseId: "r3bridge246", slug: "r3-bridge-24-26", workflowType: "bridge", difficulty: "advanced",
  metadata: { title: { en: "Three-unit Bridge · teeth 24–26", sr: "Most od tri jedinice · zubi 24–26" }, description: { en: "Two prepared abutments, a pontic site, local support, anatomical units, and two connector relationships.", sr: "Dva preparisana nosača, mesto međučlana, lokalna potpora, anatomske jedinice i dva odnosa spojnica." }, indication: { en: "Educational replacement of tooth 25 between source teeth 24 and 26.", sr: "Edukativna nadoknada zuba 25 između izvornih zuba 24 i 26." } },
  labOrder: { caseCode: "PT-EDU-R3-B246", workflowType: "bridge", restorationType: "bridge", targetTeeth: [24, 25, 26], targetArch: "maxilla", indication: { en: "Three-unit connected Bridge for the tooth 25 space; fictional educational order.", sr: "Povezani most od tri jedinice za prostor zuba 25; izmišljeni edukativni nalog." }, providedRecords: { en: ["Prepared abutments 24 and 26", "Edentulous pontic site 25", "Neighbor tooth 27", "Opposing segment tooth 36", "Synthetic local gingiva/support", "Intact anatomy references 24–26"], sr: ["Preparisani nosači 24 i 26", "Bezubi prostor međučlana 25", "Susedni zub 27", "Suprotni segment zub 36", "Sintetička lokalna gingiva/potpora", "Reference intaktne anatomije 24–26"] }, requiredOutput: { en: ["Connected bridge with abutment crowns 24 and 26, pontic 25, and two connectors"], sr: ["Povezani most sa krunicama nosača 24 i 26, međučlanom 25 i dve spojnice"] }, materialPreset: { en: "Ivory ceramic training preset", sr: "Trenažni preset keramike boje slonovače" }, notes: { en: "The pontic/gingiva relation and connector dimensions are synthetic exercise geometry.", sr: "Odnos međučlana i gingive i dimenzije spojnica su sintetička geometrija vežbe." }, educationalDisclaimer: disclaimer },
  assetRefs: [ref("prep24", V.prepBridge24), ref("prep26", V.prepBridge26), ref("tooth27", V.intact27), ref("antagonist36", V.intact36), ref("bridgeDesign", V.bridge2426), ref("reference24", V.intact24), ref("reference25", V.intact25), ref("reference26", V.intact26)],
  objects: [
    assetObject({ id: "preparation-24", name: "SOURCE · Prepared abutment · 24", caseRole: "SOURCE", cadRole: "prepared_tooth", assetRefId: "prep24", fdi: 24, arch: "maxilla", position: [-8.1, 0, 0] }),
    assetObject({ id: "preparation-26", name: "SOURCE · Prepared abutment · 26", caseRole: "SOURCE", cadRole: "prepared_tooth", assetRefId: "prep26", fdi: 26, arch: "maxilla", position: [8.6, 0, 0] }),
    assetObject({ id: "adjacent-27", name: "SOURCE · Neighbor tooth · 27", caseRole: "SOURCE", cadRole: "tooth", assetRefId: "tooth27", fdi: 27, arch: "maxilla", position: [17.9, 0, 0] }),
    assetObject({ id: "antagonist-36", name: "SOURCE · Antagonist · 36 · synthetic relation", caseRole: "SOURCE", cadRole: "antagonist", assetRefId: "antagonist36", fdi: 36, arch: "mandible", opacity: 0.42, rotation: [Math.PI, 0, 0], position: [0, 0, 5] }),
    gingiva(17, 2.4, 0.46, -0.8),
    proceduralObject({ id: "insertion-axis", name: "GUIDE · Common insertion direction · exercise", caseRole: "GUIDE", cadRole: "other", factoryId: "guide.axis", parameters: { length: 8, radius: 0.07, color: "#d89145" }, visible: false, opacity: 0.88 }),
    marginGuide("margin-guide-24", "preparation-24", 2.7, 2.9, [-8.1, 0, 0]),
    marginGuide("margin-guide-26", "preparation-26", 3.1, 3.0, [8.6, 0, 0]),
    assetObject({ id: "bridge-design", name: "DESIGN · Connected Bridge · units and connectors", caseRole: "DESIGN", cadRole: "bridge", assetRefId: "bridgeDesign", editable: true, visible: false, restorationType: "bridge", restorationUnitIds: bridgeUnits.map((unit) => unit.id), coverage: "two-abutments-one-pontic-two-connectors" }),
    assetObject({ id: "reference-24", name: "REFERENCE · Intact tooth morphology · 24", caseRole: "REFERENCE", cadRole: "reference", assetRefId: "reference24", fdi: 24, arch: "maxilla", position: [-8.1, 0, 0], visible: false, opacity: 0.5, reference: true }),
    assetObject({ id: "reference-25", name: "REFERENCE · Pontic target morphology · 25", caseRole: "REFERENCE", cadRole: "reference", assetRefId: "reference25", fdi: 25, arch: "maxilla", visible: false, opacity: 0.5, reference: true }),
    assetObject({ id: "reference-26", name: "REFERENCE · Intact tooth morphology · 26", caseRole: "REFERENCE", cadRole: "reference", assetRefId: "reference26", fdi: 26, arch: "maxilla", position: [8.6, 0, 0], visible: false, opacity: 0.5, reference: true }),
  ],
  initialWorkflowState: setup("bridge", bridgeUnits),
  checkpoints: [
    { id: "case_start", label: { en: "Prepared bridge case", sr: "Preparisan slučaj mosta" }, source: { kind: "package_baseline" } },
    checkpoint("margins_path", "Margins ready · common path", [visibility("insertion-axis", "bridgeDesign", true), visibility("margin-guide-24", "bridgeDesign", true), visibility("margin-guide-26", "bridgeDesign", true)], marginBridge),
    checkpoint("pontic_connectors", "Units and connectors ready", [visibility("insertion-axis", "bridgeDesign", true), visibility("margin-guide-24", "bridgeDesign", true), visibility("margin-guide-26", "bridgeDesign", true), visibility("bridge-design", "bridgeDesign", true)], marginBridge),
    checkpoint("contacts_thickness", "Bridge positioned for contact and connector review", [visibility("insertion-axis", "bridgeDesign", true), visibility("margin-guide-24", "bridgeDesign", true), visibility("margin-guide-26", "bridgeDesign", true), visibility("bridge-design", "bridgeDesign", true)], marginBridge),
    checkpoint("proposal_ready", "Free Lab · connected anatomical Bridge ready", [visibility("insertion-axis", "bridgeDesign", true), visibility("margin-guide-24", "bridgeDesign", true), visibility("margin-guide-26", "bridgeDesign", true), visibility("bridge-design", "bridgeDesign", true)], marginBridge),
  ], startingCheckpointId: "case_start",
  validationBindings: [
    { id: "bridge-units", objectIds: ["bridge-design", "preparation-24", "preparation-26"], binding: { kind: "inline", validatorType: "restorative_setup", config: { check: "bridge_design", restorationType: "bridge" } } },
  ],
  expectedOutput: { objectIds: ["bridge-design"], description: { en: "One editable connected Bridge design with two abutment units, a pontic, and two connector members.", sr: "Jedan povezan dizajn mosta koji se može uređivati, sa dva nosača, međučlanom i dve spojnice." }, format: "prostheia-cad-object" },
  trainingNotes: [
    { en: "The bridge remains one editable scene object while the GLB nodes and restorative setup keep abutment, pontic and connector identities.", sr: "Most ostaje jedan objekat scene koji se može menjati, dok GLB čvorovi i postavka nadoknade čuvaju identitete nosača, međučlana i spojnica." },
    { en: "Target for this exercise: inspect the synthetic connector form and the pontic-to-gingiva relationship; these are not clinical connector prescriptions.", sr: "Cilj ove vežbe: pregledajte sintetički oblik spojnica i odnos međučlana i gingive; ovo nisu klinički propisi za spojnice." },
  ],
  review: { status: "unreviewed" }, compatibility: { practiceSources: [{ source: "restorative-case", restorationType: "bridge" }], scenarioSlugs: ["r3_bridge_24_26_case"] },
});

export const fixedInlay36R3Package = casePackageManifestSchema.parse({
  schemaVersion: 1, packageId: "r3-inlay-36-v1", caseId: "r3inlay36", slug: "r3-inlay-36", workflowType: "inlay", difficulty: "intermediate",
  metadata: { title: { en: "Inlay · tooth 36", sr: "Inlay · zub 36" }, description: { en: "A central intracoronal preparation with an occlusal restoration patch derived from the same molar anatomy.", sr: "Centralna intrakoronalna preparacija sa okluzalnom nadoknadom izvedenom iz iste morfologije molara." }, indication: { en: "Posterior Inlay training case.", sr: "Vežba za bočni Inlay." } },
  labOrder: { caseCode: "PT-EDU-R3-I36", workflowType: "inlay", restorationType: "inlay", targetTeeth: [36], targetArch: "mandible", indication: { en: "Fictional intracoronal Inlay exercise for tooth 36.", sr: "Izmišljena vežba intrakoronalnog Inlay-a za zub 36." }, providedRecords: { en: ["Source-derived intracoronal preparation 36", "Neighbor teeth 34 and 35", "Opposing tooth 26", "Synthetic local gingiva/support", "Intact occlusal morphology reference 36"], sr: ["Intrakoronalna preparacija 36 izvedena iz izvora", "Susedni zubi 34 i 35", "Suprotni zub 26", "Sintetička lokalna gingiva/potpora", "Referenca intaktne okluzalne morfologije 36"] }, requiredOutput: { en: ["Editable partial intracoronal Inlay design"], sr: ["Dizajn delimičnog intrakoronalnog Inlay-a koji se može uređivati"] }, materialPreset: { en: "Warm ceramic training preset", sr: "Trenažni preset keramike toplog tona" }, notes: { en: "A central surface patch is an educational visual proposal, not a verified internal fit.", sr: "Centralna površinska ljuska je edukativni vizuelni predlog, a ne potvrđeno unutrašnje naleganje." }, educationalDisclaimer: disclaimer },
  assetRefs: [ref("prep36", V.prepInlay36), ref("tooth35", V.intact35), ref("tooth34", V.intact34), ref("antagonist26", V.intact26), ref("design36", V.inlay36), ref("reference36", V.intact36)],
  objects: [
    assetObject({ id: "preparation", name: "SOURCE · Intracoronal preparation · 36", caseRole: "SOURCE", cadRole: "prepared_tooth", assetRefId: "prep36", fdi: 36, arch: "mandible" }),
    assetObject({ id: "adjacent-35", name: "SOURCE · Adjacent tooth · 35", caseRole: "SOURCE", cadRole: "tooth", assetRefId: "tooth35", fdi: 35, arch: "mandible", position: [-9.4, 0, 0] }),
    assetObject({ id: "neighbor-34", name: "SOURCE · Neighboring tooth · 34", caseRole: "SOURCE", cadRole: "tooth", assetRefId: "tooth34", fdi: 34, arch: "mandible", position: [-17, 0, 0] }),
    assetObject({ id: "antagonist-26", name: "SOURCE · Antagonist · 26 · synthetic relation", caseRole: "SOURCE", cadRole: "antagonist", assetRefId: "antagonist26", fdi: 26, arch: "maxilla", rotation: [Math.PI, 0, 0], position: [0, 0, 12] }),
    gingiva(20),
    proceduralObject({ id: "insertion-axis", name: "GUIDE · Insertion direction · exercise", caseRole: "GUIDE", cadRole: "other", factoryId: "guide.axis", parameters: { length: 7, radius: 0.07, color: "#d89145" }, visible: false, opacity: 0.88 }),
    marginGuide("margin-guide", "preparation", 3.0, 3.0),
    assetObject({ id: "restoration", name: "DESIGN · Occlusal Inlay · 36", caseRole: "DESIGN", cadRole: "crown", assetRefId: "design36", fdi: 36, arch: "mandible", editable: true, visible: false, parentId: "preparation", restorationType: "inlay", restorationUnitIds: inlayUnits.map((unit) => unit.id), coverage: "central-intracoronal-patch" }),
    assetObject({ id: "reference", name: "REFERENCE · Intact occlusal morphology · 36", caseRole: "REFERENCE", cadRole: "reference", assetRefId: "reference36", fdi: 36, arch: "mandible", visible: false, opacity: 0.5, reference: true }),
  ],
  initialWorkflowState: setup("inlay", inlayUnits),
  checkpoints: [
    { id: "case_start", label: { en: "Prepared Inlay case", sr: "Preparisan slučaj za Inlay" }, source: { kind: "package_baseline" } },
    checkpoint("design_ready", "Inlay proposal ready for adaptation", [visibility("insertion-axis", "design36", true), visibility("margin-guide", "design36", true), visibility("restoration", "design36", true)], marginInlay),
    checkpoint("proposal_ready", "Free Lab · occlusal Inlay proposal ready", [visibility("insertion-axis", "design36", true), visibility("margin-guide", "design36", true), visibility("restoration", "design36", true)], marginInlay),
  ], startingCheckpointId: "case_start",
  validationBindings: [{ id: "inlay-partial-design", objectIds: ["preparation", "restoration"], binding: { kind: "inline", validatorType: "restorative_setup", config: { restorationType: "inlay" } } }],
  expectedOutput: { objectIds: ["restoration"], description: { en: "Editable central Inlay patch with partial-coverage semantics.", sr: "Centralni Inlay sa semantikom delimične pokrivenosti koji se može uređivati." }, format: "prostheia-cad-object" },
  trainingNotes: [{ en: "The Inlay surface follows the source tooth topography and is limited to a compact central area. Target for this exercise: compare this coverage with the broader Onlay package.", sr: "Površina Inlay-a prati topografiju izvornog zuba i ograničena je na kompaktnu centralnu zonu. Cilj ove vežbe: uporedite ovu pokrivenost sa širim Onlay paketom." }],
  review: { status: "unreviewed" }, compatibility: { practiceSources: [{ source: "restorative-case", restorationType: "inlay" }], scenarioSlugs: ["r3_inlay_36_case"] },
});

export const fixedOnlay26R3Package = casePackageManifestSchema.parse({
  schemaVersion: 1, packageId: "r3-onlay-26-v1", caseId: "r3onlay26", slug: "r3-onlay-26", workflowType: "onlay", difficulty: "intermediate",
  metadata: { title: { en: "Onlay · tooth 26", sr: "Onlay · zub 26" }, description: { en: "A broader cuspal reduction and an anatomical occlusal surface patch for partial coverage.", sr: "Šira redukcija kvržica i anatomska okluzalna ljuska za delimičnu pokrivenost." }, indication: { en: "Posterior Onlay training case.", sr: "Vežba za bočni Onlay." } },
  labOrder: { caseCode: "PT-EDU-R3-O26", workflowType: "onlay", restorationType: "onlay", targetTeeth: [26], targetArch: "maxilla", indication: { en: "Fictional partial-cuspal-coverage Onlay exercise for tooth 26.", sr: "Izmišljena vežba Onlay-a sa delimičnom pokrivenošću kvržica za zub 26." }, providedRecords: { en: ["Broad cuspal preparation 26", "Adjacent teeth 25 and 27", "Opposing tooth 36", "Synthetic local gingiva/support", "Intact tooth 26 reference"], sr: ["Šira preparacija kvržica 26", "Susedni zubi 25 i 27", "Suprotni zub 36", "Sintetička lokalna gingiva/potpora", "Referenca intaktnog zuba 26"] }, requiredOutput: { en: ["Editable broad partial-coverage Onlay"], sr: ["Širi Onlay sa delimičnom pokrivenošću koji se može uređivati"] }, materialPreset: { en: "Ivory ceramic training preset", sr: "Trenažni preset keramike boje slonovače" }, notes: { en: "The exercise uses a broader cusp envelope than the separate Inlay case; no automatic fit is asserted.", sr: "Vežba koristi širi obuhvat kvržica od zasebnog slučaja Inlay-a; ne tvrdi se automatsko naleganje." }, educationalDisclaimer: disclaimer },
  assetRefs: [ref("prep26", V.prepOnlay26), ref("tooth25", V.intact25), ref("tooth27", V.intact27), ref("antagonist36", V.intact36), ref("design26", V.onlay26), ref("reference26", V.intact26)],
  objects: [
    assetObject({ id: "preparation", name: "SOURCE · Broad cuspal preparation · 26", caseRole: "SOURCE", cadRole: "prepared_tooth", assetRefId: "prep26", fdi: 26, arch: "maxilla" }),
    assetObject({ id: "adjacent-25", name: "SOURCE · Adjacent tooth · 25", caseRole: "SOURCE", cadRole: "tooth", assetRefId: "tooth25", fdi: 25, arch: "maxilla", position: [-9.1, 0, 0] }),
    assetObject({ id: "adjacent-27", name: "SOURCE · Adjacent tooth · 27", caseRole: "SOURCE", cadRole: "tooth", assetRefId: "tooth27", fdi: 27, arch: "maxilla", position: [9.8, 0, 0] }),
    assetObject({ id: "antagonist-36", name: "SOURCE · Antagonist · 36 · synthetic relation", caseRole: "SOURCE", cadRole: "antagonist", assetRefId: "antagonist36", fdi: 36, arch: "mandible", rotation: [Math.PI, 0, 0], position: [0, 0, 12] }),
    gingiva(19),
    proceduralObject({ id: "insertion-axis", name: "GUIDE · Insertion direction · exercise", caseRole: "GUIDE", cadRole: "other", factoryId: "guide.axis", parameters: { length: 7, radius: 0.07, color: "#d89145" }, visible: false, opacity: 0.88 }),
    marginGuide("margin-guide", "preparation", 3.1, 3.0),
    assetObject({ id: "restoration", name: "DESIGN · Cuspal Onlay · 26", caseRole: "DESIGN", cadRole: "crown", assetRefId: "design26", fdi: 26, arch: "maxilla", editable: true, visible: false, parentId: "preparation", restorationType: "onlay", restorationUnitIds: onlayUnits.map((unit) => unit.id), coverage: "broad-partial-cuspal-coverage" }),
    assetObject({ id: "reference", name: "REFERENCE · Intact occlusal morphology · 26", caseRole: "REFERENCE", cadRole: "reference", assetRefId: "reference26", fdi: 26, arch: "maxilla", visible: false, opacity: 0.5, reference: true }),
  ],
  initialWorkflowState: setup("onlay", onlayUnits),
  checkpoints: [
    { id: "case_start", label: { en: "Prepared Onlay case", sr: "Preparisan slučaj za Onlay" }, source: { kind: "package_baseline" } },
    checkpoint("design_ready", "Onlay proposal ready for cusp reconstruction", [visibility("insertion-axis", "design26", true), visibility("margin-guide", "design26", true), visibility("restoration", "design26", true)], marginOnlay),
    checkpoint("proposal_ready", "Free Lab · broad Onlay proposal ready", [visibility("insertion-axis", "design26", true), visibility("margin-guide", "design26", true), visibility("restoration", "design26", true)], marginOnlay),
  ], startingCheckpointId: "case_start",
  validationBindings: [{ id: "onlay-coverage", objectIds: ["preparation", "restoration"], binding: { kind: "inline", validatorType: "restorative_setup", config: { restorationType: "onlay" } } }],
  expectedOutput: { objectIds: ["restoration"], description: { en: "Editable broad partial-coverage Onlay with occlusal anatomy derived from the tooth surface.", sr: "Široki Onlay sa delimičnom pokrivenošću i okluzalnom anatomijom izvedenom iz površine zuba." }, format: "prostheia-cad-object" },
  trainingNotes: [{ en: "Target for this exercise: inspect the wider cusp coverage and compare it with the separate central Inlay. Any dimensions shown are exercise targets, not clinical prescriptions.", sr: "Cilj ove vežbe: pregledajte širu pokrivenost kvržica i uporedite je sa zasebnim centralnim Inlay-om. Sve prikazane dimenzije su ciljevi vežbe, ne klinički propisi." }],
  review: { status: "unreviewed" }, compatibility: { practiceSources: [{ source: "restorative-case", restorationType: "onlay" }], scenarioSlugs: ["r3_onlay_26_case"] },
});

export const fixedVeneer21R3Package = casePackageManifestSchema.parse({
  schemaVersion: 1, packageId: "r3-veneer-21-v1", caseId: "r3veneer21", slug: "r3-veneer-21", workflowType: "veneer", difficulty: "intermediate",
  metadata: { title: { en: "Anterior Veneer · tooth 21", sr: "Prednja faseta · zub 21" }, description: { en: "A thin anterior facial shell with adjacent anatomy and an intact pre-op reference.", sr: "Tanka prednja fasetna ljuska sa susednom anatomijom i intaktnom preoperativnom referencom." }, indication: { en: "Single anterior Veneer training case.", sr: "Vežba za pojedinačnu prednju fasetu." } },
  labOrder: { caseCode: "PT-EDU-R3-V21", workflowType: "veneer", restorationType: "veneer", targetTeeth: [21], targetArch: "maxilla", indication: { en: "Fictional anterior facial-shell Veneer exercise for tooth 21.", sr: "Izmišljena vežba prednje fasetne ljuske za zub 21." }, providedRecords: { en: ["Source-derived anterior preparation 21", "Adjacent lateral incisor 22", "Opposing incisor segment 31–32", "Synthetic local gingiva/support", "Intact pre-op morphology reference 21"], sr: ["Prednja preparacija 21 izvedena iz izvora", "Susedni lateralni sekutić 22", "Suprotni segment sekutića 31–32", "Sintetička lokalna gingiva/potpora", "Referenca intaktne preoperativne morfologije 21"] }, requiredOutput: { en: ["Editable thin facial Veneer shell for tooth 21"], sr: ["Tanka prednja fasetna ljuska za zub 21 koja se može uređivati"] }, materialPreset: { en: "Translucent ivory training preset", sr: "Trenažni preset prozirne slonovače" }, notes: { en: "Educational anterior CAD only. This case is not a smile-design or patient-specific treatment plan.", sr: "Samo edukativni prednji CAD. Ovaj slučaj nije digitalni dizajn osmeha niti plan terapije za konkretnog pacijenta." }, educationalDisclaimer: disclaimer },
  assetRefs: [ref("prep21", V.prepVeneer21), ref("tooth22", V.intact22), ref("antagonist31", V.intact31), ref("antagonist32", V.intact32), ref("design21", V.veneer21), ref("reference21", V.intact21)],
  objects: [
    assetObject({ id: "preparation", name: "SOURCE · Anterior preparation · 21", caseRole: "SOURCE", cadRole: "prepared_tooth", assetRefId: "prep21", fdi: 21, arch: "maxilla" }),
    assetObject({ id: "adjacent-22", name: "SOURCE · Adjacent lateral incisor · 22", caseRole: "SOURCE", cadRole: "tooth", assetRefId: "tooth22", fdi: 22, arch: "maxilla", position: [-8.2, 0, 0] }),
    assetObject({ id: "antagonist-31", name: "SOURCE · Opposing incisor · 31 · synthetic relation", caseRole: "SOURCE", cadRole: "antagonist", assetRefId: "antagonist31", fdi: 31, arch: "mandible", rotation: [Math.PI, 0, 0], position: [0, 0, 11.5] }),
    assetObject({ id: "antagonist-32", name: "SOURCE · Opposing incisor · 32 · synthetic relation", caseRole: "SOURCE", cadRole: "antagonist", assetRefId: "antagonist32", fdi: 32, arch: "mandible", rotation: [Math.PI, 0, 0], position: [7.2, 0, 11.5] }),
    gingiva(10),
    proceduralObject({ id: "insertion-axis", name: "GUIDE · Facial shell insertion direction · exercise", caseRole: "GUIDE", cadRole: "other", factoryId: "guide.axis", parameters: { length: 7, radius: 0.06, color: "#d89145" }, visible: false, opacity: 0.88, position: [0, 0, 0] }),
    marginGuide("margin-guide", "preparation", 2.3, 3.8),
    assetObject({ id: "restoration", name: "DESIGN · Thin facial Veneer shell · 21", caseRole: "DESIGN", cadRole: "crown", assetRefId: "design21", fdi: 21, arch: "maxilla", editable: true, visible: false, parentId: "preparation", restorationType: "veneer", restorationUnitIds: veneerUnits.map((unit) => unit.id), coverage: "thin-facial-and-incisal-shell" }),
    assetObject({ id: "reference", name: "REFERENCE · Intact pre-op morphology · 21", caseRole: "REFERENCE", cadRole: "preop", assetRefId: "reference21", fdi: 21, arch: "maxilla", visible: false, opacity: 0.48, reference: true }),
  ],
  initialWorkflowState: setup("veneer", veneerUnits),
  checkpoints: [
    { id: "case_start", label: { en: "Anterior reference case", sr: "Prednji slučaj sa referencom" }, source: { kind: "package_baseline" } },
    checkpoint("reference_review", "Review the pre-op reference and prepared anterior tooth", [visibility("reference", "reference21", true)], setup("veneer", veneerUnits)),
    checkpoint("design_ready", "Reference and margins available · shell ready", [visibility("reference", "reference21", true), visibility("insertion-axis", "design21", true), visibility("margin-guide", "design21", true), visibility("restoration", "design21", true)], marginVeneer),
    checkpoint("proposal_ready", "Free Lab · thin anterior shell ready", [visibility("reference", "reference21", true), visibility("insertion-axis", "design21", true), visibility("margin-guide", "design21", true), visibility("restoration", "design21", true)], marginVeneer),
  ], startingCheckpointId: "case_start",
  validationBindings: [{ id: "veneer-shell", objectIds: ["preparation", "restoration", "reference"], binding: { kind: "inline", validatorType: "restorative_setup", config: { check: "veneer_position", restorationType: "veneer" } } }],
  expectedOutput: { objectIds: ["restoration"], description: { en: "Editable source-surface facial shell with thin-shell Veneer semantics.", sr: "Prednja ljuska izvedena iz izvorne površine sa semantikom tanke fasetne ljuske." }, format: "prostheia-cad-object" },
  trainingNotes: [{ en: "Target for this exercise: review the intact reference, facial contour, incisal edge and proximal outline. The shell depth is an exercise target, not a clinical thickness prescription.", sr: "Cilj ove vežbe: pregledajte intaktnu referencu, prednju konturu, incizalnu ivicu i proksimalni obris. Dubina ljuske je cilj vežbe, ne klinički propis debljine." }],
  review: { status: "unreviewed" }, compatibility: { practiceSources: [{ source: "restorative-case", restorationType: "veneer" }], scenarioSlugs: ["r3_veneer_21_case"] },
});

export const FIXED_PROSTHETICS_R3_PACKAGES = mapSerbianFields([
  fixedCrown26R3Package, fixedCrown36R3Package, fixedBridge2426R3Package, fixedInlay36R3Package, fixedOnlay26R3Package, fixedVeneer21R3Package,
] as const, normalizeR3SerbianCopy);
