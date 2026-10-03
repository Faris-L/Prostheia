import { caseObjectRuntimeId } from "@/cad/case-packages/identity";
import { IMPLANT_R7_PACKAGES, IMPLANT_R7_CASE_STAGES } from "@/cad/case-packages/definitions/implant-r7";
import { lessonSchema, type PracticeLesson, type PracticeStep } from "./types";
import { normalizeImplantSerbianCopy } from "@/lib/dental-language";

const l = (en: string, sr: string) => ({ en, sr: normalizeImplantSerbianCopy(sr) });
const primaryPackage = IMPLANT_R7_PACKAGES[0];
const runtimeId = (localId: string) => caseObjectRuntimeId(primaryPackage.caseId, localId);

type StageCopy = {
  what: { en: string; sr: string };
  why: { en: string; sr: string };
  object: { en: string; sr: string };
  tool: string;
  action: { en: string; sr: string };
  target: { en: string; sr: string };
  check: { en: string; sr: string };
  objectIds: string[];
  tools: PracticeStep["allowedTools"];
};

const COPY: Record<(typeof IMPLANT_R7_CASE_STAGES)[number]["id"], StageCopy> = {
  inspect: {
    what: l("Identify the synthetic SOURCE scan body, implant reference, arch segment, gingiva/ridge, neighbors, and antagonist.", "Uo\u010dite sinteti\u010dki SOURCE scan body, referencu implantata, segment luka, gingivu/greben, susede i antagonistu."),
    why: l("The restorative design uses supplied references; the fixture position is already defined by the training case.", "Restaurativni dizajn koristi date reference; polo\u017eaj implantata je ve\u0107 odre\u0111en trena\u017enim slu\u010dajem."),
    object: l("SOURCE segment and scan body; separate DESIGN emergence, abutment, and Dundee crown proposal.", "SOURCE segment i scan body; zasebni DESIGN profil nicanja, abatment i predlog krunice Dundee."),
    tool: "Scene, Select, Camera",
    action: l("Orbit the case, identify SOURCE versus DESIGN colors and select each of the three DESIGN objects in the Scene.", "Rotirajte slu\u010daj, prepoznajte SOURCE i DESIGN boje i izaberite svaki od tri DESIGN objekta u Scene."),
    target: l("Target for this exercise: identify the source references and three independently editable design objects.", "Cilj ove ve\u017ebe: prepoznajte izvorne reference i tri nezavisna dizajn objekta koja mogu da se menjaju."),
    check: l("Confirm scan body, fixed implant reference, gingiva/ridge, neighboring teeth, antagonist, emergence, abutment, and crown are present.", "Potvrdite prisustvo scan body-ja, fiksne reference implantata, gingive/grebena, susednih zuba, antagoniste, profila nicanja, abatmenta i krunice."),
    objectIds: [runtimeId("source-scan-body"), runtimeId("source-implant-reference"), runtimeId("design-emergence-profile"), runtimeId("design-abutment"), runtimeId("design-implant-crown")],
    tools: ["select", "camera", "scene"],
  },
  scan_body: {
    what: l("Read the scan body seat, indexed head, flat orientation marker, and stable scan-body ID.", "Pregledajte dosed scan body-ja, indeksiranu glavu, ravnu oznaku orijentacije i stabilni ID scan body-ja."),
    why: l("Its indexed shape communicates which orientation resolves to the fixed synthetic implant reference.", "Indeksirani oblik prikazuje koja orijentacija odgovara fiksnoj sinteti\u010dkoj referenci implantata."),
    object: l("Locked SOURCE scan body and SOURCE implant reference.", "Zaklju\u010dani SOURCE scan body i SOURCE referenca implantata."),
    tool: "Select, Scene, Camera",
    action: l("Select the scan body, orbit to see its flat marker, then select the fixture reference and compare their aligned axes.", "Izaberite scan body, rotirajte prikaz da vidite ravnu oznaku, zatim izaberite referencu implantata i uporedite poravnate ose."),
    target: l("Target for this exercise: recognize the indexed flat and its scan-body ID.", "Cilj ove ve\u017ebe: prepoznajte indeksiranu ravnu povr\u0161inu i ID scan body-ja."),
    check: l("Design Check confirms the scan body is SOURCE data linked to the fixture reference and oriented on its axis.", "Design Check potvr\u0111uje da je scan body SOURCE podatak povezan sa referencom implantata i orijentisan po njenoj osi."),
    objectIds: [runtimeId("source-scan-body"), runtimeId("source-implant-reference")],
    tools: ["select", "camera", "scene"],
  },
  implant_axis: {
    what: l("Resolve the fixed implant/restorative axis from the indexed scan body and case reference.", "Odredite fiksnu osu implantata/restauracije preko indeksiranog scan body-ja i reference slu\u010daja."),
    why: l("The abutment, crown, and screw-access guide relate to this pre-defined restorative axis.", "Abatment, krunica i vodi\u010d pristupa zavrtnju odnose se prema ovoj unapred odre\u0111enoj restaurativnoj osi."),
    object: l("SOURCE scan body and implant reference; GUIDE implant axis and platform.", "SOURCE scan body i referenca implantata; GUIDE osa implantata i platforma."),
    tool: "Scene, Select, Camera",
    action: l("Toggle the implant-axis and interface guides, then trace the same direction through the scan body and restorative space.", "Uklju\u010dite vodi\u010de ose i interfejsa, zatim pratite isti smer kroz scan body i restaurativni prostor."),
    target: l("Target for this exercise: identify the supplied axis; do not move or place a surgical implant.", "Cilj ove ve\u017ebe: prepoznajte datu osu; ne pomerajte niti postavljajte hirur\u0161ki implantat."),
    check: l("Confirm the fixture is locked as SOURCE and the GUIDE axis resolves to the same synthetic reference.", "Potvrdite da je implantat zaklju\u010dan kao SOURCE i GUIDE osa odgovara istoj sinteti\u010dkoj referenci."),
    objectIds: [runtimeId("source-implant-reference"), runtimeId("guide-implant-axis"), runtimeId("guide-restorative-interface")],
    tools: ["select", "camera", "scene"],
  },
  emergence: {
    what: l("Inspect and refine the editable transition from the restorative platform through gingiva toward the crown.", "Pregledajte i doradite prelaz koji mo\u017ee da se menja od restaurativne platforme kroz gingivu ka krunici."),
    why: l("The profile makes the platform-to-crown contour visible as its own design object.", "Profil prikazuje konturu od platforme do krunice kao zaseban dizajn objekat."),
    object: l("DESIGN emergence profile and SOURCE gingiva/ridge.", "DESIGN profil nicanja i SOURCE gingiva/greben."),
    tool: "Select, Scale, Camera",
    action: l("Select the emergence profile and use Scale or the transform fields to make a modest exercise refinement while inspecting its tissue intersection.", "Izaberite profil nicanja i koristite Scale ili polja transformacije za blagu doradu ve\u017ebe uz pregled preseka sa tkivom."),
    target: l("Target for this exercise: a smooth visible transition across the gingival margin; no biological validation is implied.", "Cilj ove ve\u017ebe: gladak vidljiv prelaz preko gingivalne granice; biolo\u0161ka validacija se ne podrazumeva."),
    check: l("Confirm an editable DESIGN profile is distinct from the fixed source ridge and has registered geometry.", "Potvrdite da je DESIGN profil koji mo\u017ee da se menja odvojen od fiksnog izvornog grebena i ima registrovanu geometriju."),
    objectIds: [runtimeId("design-emergence-profile"), runtimeId("source-gingiva"), runtimeId("source-ridge-support")],
    tools: ["select", "scale", "camera", "scene"],
  },
  abutment: {
    what: l("Inspect the abutment's platform, axial relationship, height/form concept, and crown support surface.", "Pregledajte platformu abatmenta, aksijalni odnos, koncept visine/oblika i potpornu povr\u0161inu krunice."),
    why: l("The abutment is a separate design step between the fixed interface and editable crown.", "Abatment je zaseban korak dizajna izme\u0111u fiksnog interfejsa i krunice koja mo\u017ee da se menja."),
    object: l("DESIGN abutment; GUIDE restorative interface; DESIGN crown proposal.", "DESIGN abatment; GUIDE restaurativni interfejs; DESIGN predlog krunice."),
    tool: "Select, Move, Scale, Camera",
    action: l("Select the abutment, inspect its platform and crown seat, then adjust its displayed height or form with shared transform tools.", "Izaberite abatment, pregledajte platformu i le\u017ei\u0161te krunice, zatim prilagodite prikazanu visinu ili oblik zajedni\u010dkim alatima za transformaciju."),
    target: l("Target for this exercise: a distinct support object aligned with the synthetic interface and crown.", "Cilj ove ve\u017ebe: zaseban potporni objekat poravnat sa sinteti\u010dkim interfejsom i krunicom."),
    check: l("Confirm the abutment remains a separate editable DESIGN linked to the fixture and crown proposal.", "Potvrdite da abatment ostaje zaseban DESIGN koji mo\u017ee da se menja i povezan je sa implantatom i predlogom krunice."),
    objectIds: [runtimeId("design-abutment"), runtimeId("guide-restorative-interface"), runtimeId("design-implant-crown")],
    tools: ["select", "move", "scale", "camera", "scene"],
  },
  crown_proposal: {
    what: l("Inspect the anatomical crown proposal that starts from the private Dundee library.", "Pregledajte anatomski predlog krunice koji polazi od privatne biblioteke Dundee."),
    why: l("Recognizable tooth anatomy gives the restorative exercise a meaningful editable starting form.", "Prepoznatljiva anatomija zuba daje restaurativnoj ve\u017ebi smislen po\u010detni oblik koji mo\u017ee da se menja."),
    object: l("Editable DESIGN crown proposal and separate abutment.", "DESIGN predlog krunice koji mo\u017ee da se menja i zaseban abatment."),
    tool: "Scene, Select, Sculpt",
    action: l("Select the implant crown and inspect occlusal anatomy, proximal faces, cervical contour, and its seat over the abutment.", "Izaberite krunicu na implantatu i pregledajte okluzalnu anatomiju, proksimalne strane, cervikalnu konturu i le\u017ei\u0161te iznad abatmenta."),
    target: l("Target for this exercise: begin with recognizable dental anatomy; do not sculpt a primitive into a tooth.", "Cilj ove ve\u017ebe: po\u010dnite od prepoznatljive anatomije zuba; nemojte vajati zub od primitiva."),
    check: l("Confirm the crown is a separate editable DESIGN asset with the private Dundee provenance record.", "Potvrdite da je krunica zaseban DESIGN model koji mo\u017ee da se menja i ima zapis porekla iz privatne biblioteke Dundee."),
    objectIds: [runtimeId("design-implant-crown"), runtimeId("design-abutment"), runtimeId("reference-crown-envelope")],
    tools: ["select", "sculpt", "camera", "scene"],
  },
  crown_position: {
    what: l("Adapt the crown over its separate abutment and into the supplied restorative space.", "Prilagodite krunicu iznad zasebnog abatmenta i u dat restaurativni prostor."),
    why: l("The crown position affects its emergence, contacts, antagonist relationship, and screw-access path.", "Polo\u017eaj krunice uti\u010de na nicanje, kontakte, odnos sa antagonistom i putanju pristupa zavrtnju."),
    object: l("Editable DESIGN crown with neighboring SOURCE teeth and optional REFERENCE envelope.", "DESIGN krunica koja mo\u017ee da se menja, susedni SOURCE zubi i opciona REFERENCE kontura."),
    tool: "Move, Rotate, Scale, Sculpt",
    action: l("Position the crown while keeping its axis with the fixed implant reference, then sculpt small anatomical refinements.", "Postavite krunicu uz o\u010duvanje ose fiksne reference implantata, zatim vajajte sitne anatomske dorade."),
    target: l("Target for this exercise: maintain the crown/abutment relationship within the supplied restorative space.", "Cilj ove ve\u017ebe: odr\u017eite odnos krunice i abatmenta u okviru datog restaurativnog prostora."),
    check: l("Confirm the crown and abutment are separate, aligned DESIGN objects with the crown over the reference axis.", "Potvrdite da su krunica i abatment zasebni, poravnati DESIGN objekti i da je krunica iznad referentne ose."),
    objectIds: [runtimeId("design-implant-crown"), runtimeId("design-abutment"), runtimeId("source-neighbor-mesial"), runtimeId("source-neighbor-distal")],
    tools: ["select", "move", "rotate", "scale", "sculpt", "camera", "scene"],
  },
  contacts: {
    what: l("Review proximal proximity against the mesial and distal neighboring teeth.", "Pregledajte proksimalnu blizinu prema mezijalnom i distalnom susednom zubu."),
    why: l("Pairwise analysis makes the two crown-to-neighbor relationships inspectable.", "Analiza para omogu\u0107ava pregled oba odnosa krunice prema susednim zubima."),
    object: l("DESIGN crown and neighboring SOURCE teeth.", "DESIGN krunica i susedni SOURCE zubi."),
    tool: "Analysis · Proximity",
    action: l("Run current Proximity analysis for the crown against each neighboring tooth and inspect the color overlay.", "Pokrenite aktuelnu analizu blizine krunice prema svakom susednom zubu i pregledajte obojeni sloj."),
    target: l("Target for this exercise: inspect both proximal sides and their current spatial result.", "Cilj ove ve\u017ebe: pregledajte obe proksimalne strane i njihov aktuelni prostorni rezultat."),
    check: l("Design Check confirms a current Crown-to-neighbor analysis result.", "Design Check potvr\u0111uje aktuelan rezultat analize krunice i susednog zuba."),
    objectIds: [runtimeId("design-implant-crown"), runtimeId("source-neighbor-mesial"), runtimeId("source-neighbor-distal"), runtimeId("guide-proximal-contact-review")],
    tools: ["select", "analysis", "camera", "scene"],
  },
  occlusion: {
    what: l("Compare the crown with the supplied synthetic opposing tooth.", "Uporedite krunicu sa datim sinteti\u010dkim suprotnim zubom."),
    why: l("The static antagonist comparison reveals broad contact or intersection patterns for this exercise.", "Stati\u010dko pore\u0111enje sa antagonistom otkriva opšte obrasce kontakta ili preseka u ovoj ve\u017ebi."),
    object: l("DESIGN crown and opposing SOURCE tooth.", "DESIGN krunica i suprotni SOURCE zub."),
    tool: "Analysis · Proximity and Intersection",
    action: l("Run current Proximity analysis between crown and antagonist; inspect the contact result and gross overlap.", "Pokrenite aktuelnu analizu blizine krunice i antagoniste; pregledajte rezultat kontakta i grubo preklapanje."),
    target: l("Target for this exercise: review static geometry only; no functional or patient-specific occlusion is represented.", "Cilj ove ve\u017ebe: pregledajte samo stati\u010dku geometriju; nije prikazana funkcionalna ni pacijentu prilago\u0111ena okluzija."),
    check: l("Confirm a current crown-to-antagonist Proximity result in this checkpoint.", "Potvrdite aktuelan rezultat analize blizine krunice i antagoniste u ovoj kontrolnoj ta\u010dki."),
    objectIds: [runtimeId("design-implant-crown"), runtimeId("source-antagonist"), runtimeId("guide-occlusion-review")],
    tools: ["select", "analysis", "camera", "scene"],
  },
  screw_access: {
    what: l("Inspect the screw-access path through the crown relative to the fixed synthetic implant axis.", "Pregledajte putanju pristupa zavrtnju kroz krunicu u odnosu na fiksnu sinteti\u010dku osu implantata."),
    why: l("The axis overlay connects the implant reference to the restorative crown anatomy.", "Preklop ose povezuje referencu implantata sa anatomijom restaurativne krunice."),
    object: l("GUIDE screw-access path, fixed implant axis, DESIGN crown.", "GUIDE putanja pristupa zavrtnju, fiksna osa implantata i DESIGN krunica."),
    tool: "Scene, Select, Camera",
    action: l("Toggle screw access and implant-axis guides, then inspect how the path crosses the crown from the interface.", "Uklju\u010dite vodi\u010de pristupa zavrtnju i ose implantata, pa pregledajte kako putanja prolazi kroz krunicu od interfejsa."),
    target: l("Target for this exercise: the access path follows the supplied restorative axis within the exercise orientation limit.", "Cilj ove ve\u017ebe: putanja pristupa prati datu restaurativnu osu u granicama orijentacije za ovu ve\u017ebu."),
    check: l("Design Check reports only gross path-to-axis orientation and alignment; it does not approve a clinical restoration.", "Design Check prikazuje samo grubu orijentaciju i poravnanje putanje i ose; ne odobrava klini\u010dku nadoknadu."),
    objectIds: [runtimeId("guide-screw-access"), runtimeId("guide-implant-axis"), runtimeId("design-implant-crown")],
    tools: ["select", "camera", "scene"],
  },
  final: {
    what: l("Run final structural, alignment, access, proximity, gross-intersection, and crown-thickness checks.", "Pokrenite završne provere strukture, poravnanja, pristupa, blizine, grubog preseka i debljine krunice."),
    why: l("A final review brings the scan body, pre-defined reference, separate design objects, and current shared analysis together.", "Zavr\u0161ni pregled povezuje scan body, unapred odre\u0111enu referencu, zasebne dizajn objekte i aktuelnu zajedni\u010dku analizu."),
    object: l("Required SOURCE, DESIGN, GUIDE, and REFERENCE objects in the package.", "Obavezni SOURCE, DESIGN, GUIDE i REFERENCE objekti u paketu."),
    tool: "Analysis · Proximity, Intersection; Design Check",
    action: l("Run Proximity and Intersection analysis between the crown and antagonist, run Thickness analysis on the crown, then press Design Check. Use Section to inspect the profile if useful.", "Pokrenite analize blizine i preseka krunice i antagoniste, pokrenite analizu debljine krunice, zatim izaberite Design Check. Po potrebi koristite Section za pregled profila."),
    target: l("Target for this exercise: all restorative objects are separate and aligned, with current antagonist analysis.", "Cilj ove ve\u017ebe: svi restaurativni objekti su zasebni i poravnati, uz aktuelnu analizu antagoniste."),
    check: l("The final check confirms package objects and current geometry analysis only; it is not biological or clinical validation.", "Zavr\u0161na provera potvr\u0111uje samo objekte paketa i aktuelnu analizu geometrije; to nije biolo\u0161ka ni klini\u010dka validacija."),
    objectIds: [runtimeId("source-scan-body"), runtimeId("source-implant-reference"), runtimeId("design-emergence-profile"), runtimeId("design-abutment"), runtimeId("design-implant-crown"), runtimeId("guide-screw-access"), runtimeId("source-antagonist")],
    tools: ["select", "analysis", "camera", "scene"],
  },
};

function buildLesson(stage: (typeof IMPLANT_R7_CASE_STAGES)[number], order: number): PracticeLesson {
  const copy = COPY[stage.id];
  const step: PracticeStep = {
    id: stage.id,
    order: 1,
    title: stage.label,
    instructions: {
      en: `WHAT: ${copy.what.en}\nWHY: ${copy.why.en}\nOBJECT: ${copy.object.en}\nTOOL: ${copy.tool}\nACTION: ${copy.action.en}\nTARGET: ${copy.target.en}\nCHECK: ${copy.check.en}`,
      sr: `\u0160TA: ${copy.what.sr}\nZA\u0160TO: ${copy.why.sr}\nOBJEKAT: ${copy.object.sr}\nALAT: ${copy.tool}\nAKCIJA: ${copy.action.sr}\nCILJ: ${copy.target.sr}\nPROVERA: ${copy.check.sr}`,
    },
    theory: copy.why,
    allowedTools: copy.tools,
    targetObjectIds: copy.objectIds,
    hints: [{ id: `${stage.id}-scene`, title: l("Find the case object", "Prona\u0111ite objekat slu\u010daja"), body: l("Use the Scene list to select the named SOURCE, DESIGN, or GUIDE object. Numeric values are targets for this exercise only.", "Koristite listu Scene da izaberete imenovani SOURCE, DESIGN ili GUIDE objekat. Broj\u010dane vrednosti su samo ciljevi ove ve\u017ebe.") }],
    referenceModes: ["off", "outline", "transparent"],
    validators: [{ type: "r7_workflow", check: stage.id }],
    required: true,
  };
  const title = l(`Implant Restorative CAD · ${String(order).padStart(2, "0")} · ${stage.label.en}`, `Restaurativni Implant CAD · ${String(order).padStart(2, "0")} · ${stage.label.sr}`);
  return lessonSchema.parse({
    id: `r7-implant-${stage.id.replaceAll("_", "-")}`,
    databaseId: `e7000000-0000-4000-8000-${String(order).padStart(12, "0")}`,
    moduleId: "implant-r7-restorative-cad",
    title,
    summary: l(copy.what.en, copy.what.sr),
    goal: l(copy.check.en, copy.check.sr),
    difficulty: order <= 4 ? "beginner" : order <= 8 ? "intermediate" : "advanced",
    recommendedPrerequisites: order > 1 ? [IMPLANT_R7_CASE_STAGES.find((candidate) => candidate.id === IMPLANT_R7_CASE_STAGES[order - 2].id)!.label] : [],
    estimatedMinutes: order === 1 || order === IMPLANT_R7_CASE_STAGES.length ? 5 : 7,
    assets: [],
    caseSetup: { source: "implant-case", casePackageId: primaryPackage.packageId, checkpointId: stage.id, objectMappings: primaryPackage.objects.map((item) => ({ runtimeObjectId: runtimeId(item.id), semanticRole: `${item.caseRole}:${String(item.workflowMetadata.implantRole ?? item.id)}`, editable: item.editable })) },
    steps: [step],
  });
}

export const IMPLANT_R7_LESSONS: PracticeLesson[] = IMPLANT_R7_CASE_STAGES.map((stage, index) => buildLesson(stage, index + 1));
