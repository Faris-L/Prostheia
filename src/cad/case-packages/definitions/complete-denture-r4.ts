import { caseObjectRuntimeId } from "../identity";
import { casePackageManifestSchema, type CaseObjectDescriptor, type CaseCheckpoint } from "../contract";
import { PRIVATE_DENTURE_TOOTH_ASSET_IDS } from "../private-asset-catalog";
import { completeDentureToothPosition, type CompleteDentureArch, type CompleteDentureMorphology } from "@/cad/denture/r4-geometry";

const transform = (position: [number, number, number] = [0, 0, 0], rotation: [number, number, number] = [0, 0, 0], scale: [number, number, number] = [1, 1, 1]) => ({ position, rotation, scale });
const ALL_TEETH = [
  ...Array.from({ length: 7 }, (_, index) => 11 + index), ...Array.from({ length: 7 }, (_, index) => 21 + index),
  ...Array.from({ length: 7 }, (_, index) => 31 + index), ...Array.from({ length: 7 }, (_, index) => 41 + index),
];
const toothAssetKeys: Record<string, string> = {
  "upper-central": PRIVATE_DENTURE_TOOTH_ASSET_IDS["upper-central"],
  "upper-lateral": PRIVATE_DENTURE_TOOTH_ASSET_IDS["upper-lateral"],
  "upper-canine-left": PRIVATE_DENTURE_TOOTH_ASSET_IDS["upper-canine-left"],
  "upper-canine-right": PRIVATE_DENTURE_TOOTH_ASSET_IDS["upper-canine-right"],
  "upper-first-premolar": PRIVATE_DENTURE_TOOTH_ASSET_IDS["upper-first-premolar"],
  "upper-second-premolar": PRIVATE_DENTURE_TOOTH_ASSET_IDS["upper-second-premolar"],
  "upper-first-molar": PRIVATE_DENTURE_TOOTH_ASSET_IDS["upper-first-molar"],
  "upper-second-molar": PRIVATE_DENTURE_TOOTH_ASSET_IDS["upper-second-molar"],
  "lower-central": PRIVATE_DENTURE_TOOTH_ASSET_IDS["lower-central"],
  "lower-lateral": PRIVATE_DENTURE_TOOTH_ASSET_IDS["lower-lateral"],
  "lower-canine-approximation": PRIVATE_DENTURE_TOOTH_ASSET_IDS["lower-canine-approximation"],
  "lower-first-premolar": PRIVATE_DENTURE_TOOTH_ASSET_IDS["lower-first-premolar"],
  "lower-second-premolar": PRIVATE_DENTURE_TOOTH_ASSET_IDS["lower-second-premolar"],
  "lower-first-molar": PRIVATE_DENTURE_TOOTH_ASSET_IDS["lower-first-molar"],
  "lower-second-molar-left": PRIVATE_DENTURE_TOOTH_ASSET_IDS["lower-second-molar-left"],
  "lower-second-molar-right": PRIVATE_DENTURE_TOOTH_ASSET_IDS["lower-second-molar-right"],
};
const assetRef = (id: string, assetId: string) => ({ id, runtimeAssetId: assetId, required: true });
const R4_CROWN_CERVICAL_CUT_Z = -0.35;
const R4_MAX_RIDGE_EXPANSION = 1.182;
const R4_DENTURE_TOOTH_SEAT_Z = 9;
const R4_BASE_RIDGE_CROWNWARD_EXTENT = 0.65 + 3.25 * R4_MAX_RIDGE_EXPANSION;
const R4_BASE_RIDGE_ROOTWARD_DEPTH = 3.25 * R4_MAX_RIDGE_EXPANSION - 0.65;

function toothLibraryKey(fdi: number) {
  const quadrant = Math.floor(fdi / 10); const position = fdi % 10;
  if (quadrant <= 2) {
    if (position === 1) return "upper-central";
    if (position === 2) return "upper-lateral";
    if (position === 3) return quadrant === 1 ? "upper-canine-right" : "upper-canine-left";
    if (position === 4) return "upper-first-premolar";
    if (position === 5) return "upper-second-premolar";
    if (position === 6) return "upper-first-molar";
    return "upper-second-molar";
  }
  if (position === 1) return "lower-central";
  if (position === 2) return "lower-lateral";
  if (position === 3) return "lower-canine-approximation";
  if (position === 4) return "lower-first-premolar";
  if (position === 5) return "lower-second-premolar";
  if (position === 6) return "lower-first-molar";
  return quadrant === 3 ? "lower-second-molar-left" : "lower-second-molar-right";
}

function toothClassLabel(position: number, arch: CompleteDentureArch) {
  const labels: Record<number, string> = { 1: "central incisor", 2: "lateral incisor", 3: "canine", 4: "first premolar", 5: "second premolar", 6: "first molar", 7: "second molar" };
  return `${arch === "upper" ? "Upper" : "Lower"} ${labels[position]}`;
}

function assetTooth(fdi: number, morphology: CompleteDentureMorphology, lowerOffset: [number, number, number], approximationNotice?: string): CaseObjectDescriptor {
  const arch: CompleteDentureArch = fdi < 30 ? "upper" : "lower";
  const local = completeDentureToothPosition(fdi, arch, morphology);
  // R4 crown-only assets have their cervical cut at local Z=-0.35 and crown
  // anatomy toward +Z. The upper tooth flips around X; the lower stays upright.
  const baseSeatOffset = R4_DENTURE_TOOTH_SEAT_Z;
  const position: [number, number, number] = [local.position[0] + lowerOffset[0], local.position[1] + lowerOffset[1], local.position[2] + lowerOffset[2] + baseSeatOffset];
  const key = toothLibraryKey(fdi);
  const id = `tooth-${fdi}`;
  const classLabel = toothClassLabel(fdi % 10, arch);
  return {
    id, name: { en: `DESIGN · Individual denture tooth · FDI ${fdi}`, sr: `DIZAJN · Pojedinačni zub proteze · FDI ${fdi}` },
    caseRole: "DESIGN", cadRole: "denture_tooth", source: { kind: "asset", assetRefId: key }, required: true,
    editable: true, visible: false, opacity: 1, transform: transform(position, local.rotation, local.scale),
    dental: { fdi, arch },
    workflowMetadata: {
      denturePart: "tooth", dentureArch: arch, toothSetId: `r4-${morphology}`, toothClass: classLabel,
      initialPosition: position, individualPositioning: true, exerciseOnly: true,
      ...(approximationNotice ? { trainingApproximation: approximationNotice } : {}),
    },
    segmentation: [],
  };
}

function procedural(args: {
  id: string; name: string; caseRole: CaseObjectDescriptor["caseRole"]; cadRole: CaseObjectDescriptor["cadRole"];
  factoryId: string; parameters: Record<string, unknown>; editable?: boolean; visible?: boolean; opacity?: number;
  position?: [number, number, number]; rotation?: [number, number, number]; workflowMetadata?: Record<string, unknown>;
}): CaseObjectDescriptor {
  return {
    id: args.id, name: { en: args.name, sr: args.name }, caseRole: args.caseRole, cadRole: args.cadRole,
    source: { kind: "procedural", factoryId: args.factoryId, parameters: args.parameters }, required: true,
    editable: args.editable ?? false, visible: args.visible ?? true, opacity: args.opacity ?? 1,
    transform: transform(args.position, args.rotation), workflowMetadata: args.workflowMetadata ?? {}, segmentation: [],
  };
}

function caseObjects(morphology: CompleteDentureMorphology, lowerOffset: [number, number, number]) {
  const upperCervicalPlaneZ = R4_DENTURE_TOOTH_SEAT_Z - R4_CROWN_CERVICAL_CUT_Z;
  const lowerCervicalOffsetZ = R4_DENTURE_TOOTH_SEAT_Z + R4_CROWN_CERVICAL_CUT_Z;
  // The maxillary residual ridge and base sit above the tooth cervical plane;
  // the mandibular support stays below it. Keep each full support mesh rootward.
  const upperArchPosition: [number, number, number] = [0, 0, upperCervicalPlaneZ + 5.1 * R4_MAX_RIDGE_EXPANSION];
  const lowerArchPosition: [number, number, number] = [lowerOffset[0], lowerOffset[1], lowerOffset[2] + lowerCervicalOffsetZ - 4.6 * R4_MAX_RIDGE_EXPANSION];
  const upperBasePosition: [number, number, number] = [0, 0, upperCervicalPlaneZ + R4_BASE_RIDGE_ROOTWARD_DEPTH];
  const lowerBasePosition: [number, number, number] = [lowerOffset[0], lowerOffset[1], lowerOffset[2] + lowerCervicalOffsetZ - R4_BASE_RIDGE_CROWNWARD_EXTENT];
  const objects: CaseObjectDescriptor[] = [
    procedural({ id: "source-upper-arch", name: "SOURCE · Synthetic edentulous maxilla · residual ridge and palate", caseRole: "SOURCE", cadRole: "maxilla", factoryId: "complete-denture.r4-edentulous-arch", parameters: { arch: "upper", morphology }, position: upperArchPosition, workflowMetadata: { denturePart: "arch", dentureArch: "upper", morphology, syntheticEducationalGeometry: true } }),
    procedural({ id: "source-lower-arch", name: "SOURCE · Synthetic edentulous mandible · residual ridge and lingual contour", caseRole: "SOURCE", cadRole: "mandible", factoryId: "complete-denture.r4-edentulous-arch", parameters: { arch: "lower", morphology }, position: lowerArchPosition, workflowMetadata: { denturePart: "arch", dentureArch: "lower", morphology, syntheticEducationalGeometry: true } }),
    procedural({ id: "base-upper", name: "DESIGN · Upper denture base · tissue and polished surfaces", caseRole: "DESIGN", cadRole: "denture_base", factoryId: "complete-denture.r4-base", parameters: { arch: "upper", morphology }, editable: true, visible: false, position: upperBasePosition, workflowMetadata: { denturePart: "base", dentureArch: "upper", morphology, surfaceConcepts: ["tissue-side", "polished-surface"], borderGuideId: "guide-upper-border" } }),
    procedural({ id: "base-lower", name: "DESIGN · Lower denture base · tissue and polished surfaces", caseRole: "DESIGN", cadRole: "denture_base", factoryId: "complete-denture.r4-base", parameters: { arch: "lower", morphology }, editable: true, visible: false, position: lowerBasePosition, workflowMetadata: { denturePart: "base", dentureArch: "lower", morphology, surfaceConcepts: ["tissue-side", "polished-surface"], borderGuideId: "guide-lower-border" } }),
    procedural({ id: "guide-occlusal-plane", name: "GUIDE · Occlusal plane · synthetic relation target", caseRole: "GUIDE", cadRole: "other", factoryId: "complete-denture.r4-guide", parameters: { kind: "occlusal-plane" }, editable: true, visible: false, position: [0, 0, 7], rotation: [0.035, 0, 0], workflowMetadata: { denturePart: "plane", targetPosition: [0, 0, 9], targetRotation: [0, 0, 0], numericTargetsAreExerciseOnly: true } }),
    procedural({ id: "guide-midline-upper", name: "GUIDE · Maxillary midline", caseRole: "GUIDE", cadRole: "other", factoryId: "complete-denture.r4-guide", parameters: { kind: "midline-upper" }, editable: true, visible: true, opacity: 0.88, workflowMetadata: { denturePart: "midline", dentureArch: "upper" } }),
    procedural({ id: "guide-midline-lower", name: "GUIDE · Mandibular midline", caseRole: "GUIDE", cadRole: "other", factoryId: "complete-denture.r4-guide", parameters: { kind: "midline-lower" }, editable: true, visible: true, opacity: 0.88, position: lowerOffset, workflowMetadata: { denturePart: "midline", dentureArch: "lower" } }),
    procedural({ id: "guide-upper-border", name: "GUIDE · Maxillary denture border", caseRole: "GUIDE", cadRole: "other", factoryId: "complete-denture.r4-guide", parameters: { kind: "border-upper" }, editable: true, visible: false, opacity: 0.92, workflowMetadata: { denturePart: "border", dentureArch: "upper" } }),
    procedural({ id: "guide-lower-border", name: "GUIDE · Mandibular denture border", caseRole: "GUIDE", cadRole: "other", factoryId: "complete-denture.r4-guide", parameters: { kind: "border-lower" }, editable: true, visible: false, position: lowerOffset, opacity: 0.92, workflowMetadata: { denturePart: "border", dentureArch: "lower" } }),
    procedural({ id: "reference-relation-plane", name: "REFERENCE · Synthetic exercise relation target", caseRole: "REFERENCE", cadRole: "reference", factoryId: "complete-denture.r4-guide", parameters: { kind: "occlusal-plane" }, editable: false, visible: false, opacity: 0.1, position: [0, 0, 9], workflowMetadata: { denturePart: "reference", syntheticEducationalRelation: true } }),
  ];
  for (const fdi of ALL_TEETH) {
    const arch: CompleteDentureArch = fdi < 30 ? "upper" : "lower";
    const effectiveOffset: [number, number, number] = arch === "lower" ? lowerOffset : [0, 0, 0];
    const approximation = fdi % 10 === 3 && arch === "lower"
      ? "Training denture canine derived from maxillary canine morphology because no clearly identified, structurally passing mandibular canine source is promoted. This is not a mandibular natural-tooth identity claim."
      : undefined;
    objects.push(assetTooth(fdi, morphology, effectiveOffset, approximation));
  }
  return objects;
}

function guideCurves(caseId: string) {
  const points = (z: number, yOffset = 0): [number, number, number][] => [[-24, -10 + yOffset, z], [-15, 7 + yOffset, z], [0, 13 + yOffset, z], [15, 7 + yOffset, z], [24, -10 + yOffset, z]];
  return {
    curveState: {
      activeCurveId: null,
      curves: [
        { id: "r4-arch-guide-upper", kind: "denture_arch_guide", coordinateSpace: "object-local", objectId: caseObjectRuntimeId(caseId, "source-upper-arch"), points: points(0), closed: false },
        { id: "r4-midline-upper", kind: "denture_midline", coordinateSpace: "object-local", objectId: caseObjectRuntimeId(caseId, "guide-midline-upper"), points: [[0, -34, 0], [0, -18, 0], [0, 0, 0], [0, 15, 0]], closed: false },
        { id: "r4-arch-guide-lower", kind: "denture_arch_guide", coordinateSpace: "object-local", objectId: caseObjectRuntimeId(caseId, "source-lower-arch"), points: points(0), closed: false },
        { id: "r4-midline-lower", kind: "denture_midline", coordinateSpace: "object-local", objectId: caseObjectRuntimeId(caseId, "guide-midline-lower"), points: [[0, -31, 0], [0, -16, 0], [0, 0, 0], [0, 15, 0]], closed: false },
      ],
    },
  };
}

function assetRefsForCase() {
  return Object.entries(toothAssetKeys).map(([key, id]) => assetRef(key, id));
}

function stageCheckpoint(id: string, labelEn: string, labelSr: string, states: { objectId: string; visible?: boolean; opacity?: number }[]): CaseCheckpoint {
  return { id, label: { en: labelEn, sr: labelSr }, source: { kind: "asset_snapshot", objects: states }, workflowState: {} };
}

function makePackage(config: { packageId: string; caseId: string; slug: string; code: string; morphology: CompleteDentureMorphology; lowerOffset: [number, number, number]; title: string; titleSr: string; description: string; descriptionSr: string; indication: string; indicationSr: string; difficulty: "beginner" | "intermediate" | "advanced" }) {
  const { packageId, caseId, slug, code, morphology, lowerOffset } = config;
  const objects = caseObjects(morphology, lowerOffset);
  const allToothIds = ALL_TEETH.map((tooth) => `tooth-${tooth}`);
  const anterior = ALL_TEETH.filter((tooth) => tooth % 10 <= 3).map((tooth) => `tooth-${tooth}`);
  const guides = ["guide-occlusal-plane", "reference-relation-plane"];
  const anteriorCheckpointStates = [...guides.map((objectId) => ({ objectId, visible: objectId === "guide-occlusal-plane" })), ...anterior.map((objectId) => ({ objectId, visible: true }))];
  const posteriorCheckpointStates = [...guides.map((objectId) => ({ objectId, visible: objectId === "guide-occlusal-plane" })), ...allToothIds.map((objectId) => ({ objectId, visible: true }))];
  const allDesignVisible = [...allToothIds.map((objectId) => ({ objectId, visible: true })), { objectId: "base-upper", visible: true }, { objectId: "base-lower", visible: true }];
  const checkpoints: CaseCheckpoint[] = [
    { id: "case_inspection", label: { en: "Inspect edentulous arches", sr: "Pregledajte bezube vilice" }, source: { kind: "package_baseline" }, workflowState: {} },
    stageCheckpoint("occlusal_plane", "Set the occlusal plane", "Postavite okluzalnu ravan", [{ objectId: "guide-occlusal-plane", visible: true }, { objectId: "reference-relation-plane", visible: true }]),
    stageCheckpoint("anterior_setup", "Position anterior teeth", "Pozicionirajte prednje zube", anteriorCheckpointStates),
    stageCheckpoint("posterior_setup", "Arrange posterior teeth", "Postavite bočne zube", posteriorCheckpointStates),
    stageCheckpoint("static_occlusion", "Review static occlusion", "Pregledajte statičku okluziju", [...posteriorCheckpointStates, { objectId: "guide-midline-upper", visible: true }, { objectId: "guide-midline-lower", visible: true }]),
    stageCheckpoint("borders", "Trace denture borders", "Označite granice proteza", [...posteriorCheckpointStates, { objectId: "guide-upper-border", visible: true }, { objectId: "guide-lower-border", visible: true }]),
    stageCheckpoint("base", "Adapt denture bases", "Prilagodite baze proteza", [...allDesignVisible, { objectId: "guide-upper-border", visible: true }, { objectId: "guide-lower-border", visible: true }]),
    stageCheckpoint("polished_surface", "Shape tissue and polished surfaces", "Oblikujte tkivnu i poliranu površinu", [...allDesignVisible, { objectId: "guide-upper-border", visible: true }, { objectId: "guide-lower-border", visible: true }]),
    stageCheckpoint("final_occlusion", "Final occlusion and Design Check", "Završna okluzija i Design Check", allDesignVisible),
    stageCheckpoint("full_denture_case", "Complete denture case · Free Lab", "Slučaj kompletne proteze · Free Lab", allDesignVisible),
  ];
  return casePackageManifestSchema.parse({
    schemaVersion: 1, packageId, caseId, slug, workflowType: "complete_denture", difficulty: config.difficulty,
    metadata: {
      title: { en: config.title, sr: config.titleSr },
      description: { en: config.description, sr: config.descriptionSr },
      indication: { en: config.indication, sr: config.indicationSr },
    },
    labOrder: {
      caseCode: code, workflowType: "complete_denture", targetTeeth: ALL_TEETH, targetArch: "both",
      indication: { en: config.indication, sr: config.indicationSr },
      providedRecords: {
        en: ["Synthetic edentulous maxilla with residual ridge and palatal vault", "Synthetic edentulous mandible with residual ridge and lingual/retromolar contours", "Synthetic jaw relation and editable occlusal-plane guide", "Individually positionable denture-tooth training library", "Local synthetic soft-tissue and base context"],
        sr: ["Sintetička bezuba maksila sa rezidualnim grebenom i nepcem", "Sintetička bezuba mandibula sa rezidualnim grebenom i lingvalnim/retromolarnim konturama", "Sintetički odnos vilica i pomerljivi vodič okluzalne ravni", "Biblioteka pojedinačno pozicioniranih trenažnih zuba proteze", "Lokalni sintetički kontekst mekih tkiva i baze"],
      },
      requiredOutput: { en: ["Upper and lower editable denture bases", "Complete 28-tooth setup with individual tooth objects", "Closed upper and lower exercise borders", "Final static relationship review"], sr: ["Pomerljive gornja i donja baza proteze", "Potpun raspored od 28 zuba kao pojedinačnih objekata", "Zatvorene gornja i donja granica za vežbu", "Završni pregled statičkog odnosa"] },
      materialPreset: { en: "Synthetic ivory teeth · warm pink base training preset", sr: "Sintetički zubi boje slonovače · trenažni preset tople ružičaste baze" },
      notes: { en: "Fictional synthetic educational case. No patient scan, patient jaw relation, commercial denture-tooth system, or clinical prescription is represented.", sr: "Izmišljeni sintetički edukativni slučaj. Nisu prikazani snimak pacijenta, odnos vilica konkretnog pacijenta, komercijalni sistem zuba proteze niti klinički propis." },
      educationalDisclaimer: {
        en: "PRIVATE EDUCATIONAL V1 ONLY. Synthetic training anatomy and exercise geometry; not patient-specific, clinically validated, expert reviewed, or manufacturing ready. The Dundee-derived denture-tooth library retains attribution and source provenance; a lower canine shape is marked as a training approximation.",
        sr: "SAMO PRIVATNA EDUKATIVNA V1 VERZIJA. Sintetička anatomija i geometrija za vežbu; nije prilagođena pacijentu, klinički validirana, stručno pregledana niti spremna za proizvodnju. Biblioteka trenažnih zuba izvedena iz Dundee izvora čuva atribuciju i poreklo; oblik donjeg očnjaka označen je kao aproksimacija za obuku.",
      },
    },
    assetRefs: assetRefsForCase(), objects,
    initialWorkflowState: { resetTransientState: true, ...guideCurves(caseId) },
    checkpoints, startingCheckpointId: "case_inspection",
    validationBindings: [
      { id: "denture-tooth-count", objectIds: allToothIds, binding: { kind: "inline", validatorType: "denture_setup", config: { check: "tooth_setup" } } },
      { id: "denture-base-pair", objectIds: ["base-upper", "base-lower"], binding: { kind: "inline", validatorType: "denture_setup", config: { check: "base" } } },
      { id: "complete-denture-design-check", objectIds: ["source-upper-arch", "source-lower-arch", "base-upper", "base-lower", ...allToothIds], binding: { kind: "inline", validatorType: "denture_setup", config: { check: "complete_case" } } },
    ],
    expectedOutput: { objectIds: ["base-upper", "base-lower"], description: { en: "Editable upper and lower synthetic complete denture bases with separate individual tooth setup and exercise guides.", sr: "Pomerljive sintetičke gornja i donja baze kompletne proteze sa pojedinačnim zubima i vodičima za vežbu." }, format: "prostheia-cad-object" },
    trainingNotes: [
      { en: "Target for this exercise: keep all 28 tooth identities and object transforms independently editable. The setup and jaw relation are synthetic training references.", sr: "Cilj ove vežbe: zadržite svih 28 identiteta zuba i transformacije objekata nezavisno izmenjivim. Raspored i odnos vilica su sintetičke trenažne reference." },
      { en: "Target for this exercise: compare the tissue-side and polished-surface concepts on each base. The displayed border and relation are not universal dimensions or patient-specific anatomy.", sr: "Cilj ove vežbe: uporedite tkivnu i poliranu površinu svake baze. Prikazane granice i odnosi nisu univerzalne dimenzije niti anatomija konkretnog pacijenta." },
    ],
    review: { status: "unreviewed" },
    compatibility: { practiceSources: [], scenarioSlugs: [slug.replaceAll("-", "_")] },
  });
}

export const completeDentureBalancedR4Package = makePackage({
  packageId: "r4-complete-denture-balanced-v1", caseId: "r4cd1", slug: "r4-complete-denture-balanced", code: "PT-EDU-R4-CD01", morphology: "balanced", lowerOffset: [0, 0, -18],
  title: "Balanced complete denture setup · R4", titleSr: "Raspored uravnotežene kompletne proteze · R4",
  description: "Conventional synthetic edentulous ridges, palatal form and a balanced educational jaw relation.", descriptionSr: "Konvencionalni sintetički bezubi grebeni, nepčani oblik i uravnotežen edukativni odnos vilica.",
  indication: "Fictional conventional full denture setup training case.", indicationSr: "Izmišljeni slučaj za obuku rasporeda konvencionalne totalne proteze.", difficulty: "intermediate",
});

export const completeDentureResorbedR4Package = makePackage({
  packageId: "r4-complete-denture-resorbed-v1", caseId: "r4cd2", slug: "r4-complete-denture-resorbed", code: "PT-EDU-R4-CD02", morphology: "resorbed", lowerOffset: [0, 0, -18],
  title: "Resorbed ridge setup · R4", titleSr: "Raspored na resorbovanom grebenu · R4",
  description: "A clearly synthetic narrower, lower residual-ridge morphology for comparing tooth support and border presentation.", descriptionSr: "Jasno sintetička uža i niža morfologija rezidualnog grebena za poređenje potpore zuba i granica.",
  indication: "Fictional resorbed-ridge denture setup exercise; no patient anatomy is represented.", indicationSr: "Izmišljena vežba rasporeda proteze na resorbovanom grebenu; nije prikazana anatomija pacijenta.", difficulty: "advanced",
});

export const completeDentureRelationR4Package = makePackage({
  packageId: "r4-complete-denture-relation-v1", caseId: "r4cd3", slug: "r4-complete-denture-relation", code: "PT-EDU-R4-CD03", morphology: "balanced", lowerOffset: [3, 1, -19],
  title: "Jaw relation setup challenge · R4", titleSr: "Izazov postavljanja odnosa vilica · R4",
  description: "A distinct synthetic relation challenge with a laterally and vertically shifted lower reference for educational plane and static-contact review.", descriptionSr: "Zaseban sintetički izazov odnosa sa bočno i vertikalno pomerenom donjom referencom za edukativni pregled ravni i statičkih kontakata.",
  indication: "Fictional jaw relation and tooth setup exercise; not a patient-specific record.", indicationSr: "Izmišljena vežba odnosa vilica i rasporeda zuba; nije zapis za konkretnog pacijenta.", difficulty: "advanced",
});

export const COMPLETE_DENTURE_R4_PACKAGES = [completeDentureBalancedR4Package, completeDentureResorbedR4Package, completeDentureRelationR4Package];
