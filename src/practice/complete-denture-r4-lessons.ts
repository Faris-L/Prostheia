import { caseObjectRuntimeId } from "@/cad/case-packages/identity";
import { completeDentureBalancedR4Package } from "@/cad/case-packages/definitions/complete-denture-r4";
import { lessonSchema, type PracticeLesson, type ValidatorConfig } from "./types";

type Stage = {
  id: string; checkpoint: string; title: { en: string; sr: string }; summary: { en: string; sr: string }; goal: { en: string; sr: string };
  difficulty: "beginner" | "intermediate" | "advanced"; minutes: number; targetIds: string[]; tools: PracticeLesson["steps"][number]["allowedTools"];
  what: { en: string; sr: string }; why: { en: string; sr: string }; object: { en: string; sr: string }; action: { en: string; sr: string };
  target: { en: string; sr: string }; check: { en: string; sr: string }; validators: ValidatorConfig[];
};

const objectId = (id: string) => caseObjectRuntimeId(completeDentureBalancedR4Package.caseId, id);
const teeth = completeDentureBalancedR4Package.objects.filter((object) => object.workflowMetadata.denturePart === "tooth");
const upperTeeth = teeth.filter((object) => object.dental?.arch === "upper");
const lowerTeeth = teeth.filter((object) => object.dental?.arch === "lower");
const anterior = teeth.filter((object) => Number(object.dental?.fdi ?? 0) % 10 <= 3);
const posterior = teeth.filter((object) => Number(object.dental?.fdi ?? 0) % 10 >= 4);
const allPackageMappings = completeDentureBalancedR4Package.objects.map((object) => ({
  runtimeObjectId: objectId(object.id), semanticRole: object.cadRole, editable: object.editable,
}));

const stages: Stage[] = [
  {
    id: "case-inspection", checkpoint: "case_inspection", title: { en: "Inspect edentulous arches", sr: "Pregledajte bezube vilice" },
    summary: { en: "Read the synthetic maxillary palate, residual ridges and paired jaw relation before tooth setup.", sr: "Pregledajte sintetičko maksilarno nepce, rezidualne grebene i upareni odnos vilica pre rasporeda zuba." },
    goal: { en: "Identify support, midline and available setup references in both arches.", sr: "Prepoznajte potporu, srednju liniju i dostupne vodiče za raspored obe vilice." }, difficulty: "beginner", minutes: 7,
    targetIds: ["source-upper-arch", "source-lower-arch", "reference-relation-plane"].map(objectId), tools: ["select", "camera", "scene"],
    what: { en: "Inspect the edentulous maxilla and mandible as one synthetic educational case.", sr: "Pregledajte bezubu maksilu i mandibulu kao jedan sintetički edukativni slučaj." },
    why: { en: "Tooth setup depends on the ridge contour, palate, retromolar support and the supplied exercise relation.", sr: "Raspored zuba zavisi od konture grebena, nepca, retromolarne potpore i zadatog odnosa za vežbu." },
    object: { en: "SOURCE upper arch, SOURCE lower arch and REFERENCE relation plane.", sr: "IZVORNA gornja vilica, IZVORNA donja vilica i REFERENTNA ravan odnosa." },
    action: { en: "Select each object, orbit to the occlusal and side views, and compare the two midline guides.", sr: "Izaberite svaki objekat, okrenite prikaz ka okluzalnom i bočnom pogledu i uporedite vodiče sredine." },
    target: { en: "Target for this exercise: describe where the residual ridge, palatal vault and lower lingual contour sit relative to the plane guide.", sr: "Cilj ove vežbe: opišite gde se rezidualni greben, nepčani svod i donja lingvalna kontura nalaze u odnosu na vodič ravni." },
    check: { en: "Confirm both SOURCE arches and the REFERENCE are visible and independently selectable in Scene.", sr: "Proverite da su oba IZVORNA luka i REFERENCA vidljivi i nezavisno izbirljivi u Scene panelu." }, validators: [],
  },
  {
    id: "occlusal-plane", checkpoint: "occlusal_plane", title: { en: "Set the occlusal plane", sr: "Postavite okluzalnu ravan" },
    summary: { en: "Adjust the shared plane guide against both synthetic arches.", sr: "Podesite zajednički vodič ravni prema obe sintetičke vilice." },
    goal: { en: "Use the shared CAD transform tools to align an exercise plane reference.", sr: "Koristite zajedničke CAD alate za transformaciju da poravnate referentnu ravan za vežbu." }, difficulty: "beginner", minutes: 8,
    targetIds: ["guide-occlusal-plane", "reference-relation-plane"].map(objectId), tools: ["select", "move", "rotate", "camera"],
    what: { en: "Position and level the GUIDE occlusal plane between the upper and lower tooth rows.", sr: "Postavite i poravnajte VODIČ okluzalne ravni između gornjeg i donjeg reda zuba." },
    why: { en: "A shared plane gives a consistent reference for anterior and posterior tooth setup.", sr: "Zajednička ravan daje doslednu referencu za raspored prednjih i bočnih zuba." },
    object: { en: "GUIDE occlusal plane; compare it with REFERENCE relation plane.", sr: "VODIČ okluzalne ravni; uporedite ga sa REFERENTNOM ravni odnosa." },
    action: { en: "Use Move to bring the plane to its target height, then Rotate until it reads level across both arches.", sr: "Koristite Move da postavite ravan na ciljnu visinu, zatim Rotate da bude ravna preko obe vilice." },
    target: { en: "Target for this exercise: plane position Z = 9 mm with zero tilt. This is an exercise target, not a clinical dimension.", sr: "Cilj za ovu vežbu: Z položaj ravni = 9 mm bez nagiba. To je cilj vežbe, a ne klinička dimenzija." },
    check: { en: "Run Design Check and confirm the GUIDE plane reaches the exercise position and rotation.", sr: "Pokrenite Design Check i proverite da VODIČ ravan dostiže položaj i rotaciju zadate vežbom." },
    validators: [{ type: "denture_setup", check: "model_analysis" }],
  },
  {
    id: "anterior-setup", checkpoint: "anterior_setup", title: { en: "Position anterior teeth", sr: "Pozicionirajte prednje zube" },
    summary: { en: "Refine the 12 individually editable incisors and canines against the midline and plane.", sr: "Doradite 12 nezavisno izmenjivih sekutića i očnjaka prema srednjoj liniji i ravni." },
    goal: { en: "Create an even educational anterior setup while preserving left and right tooth identities.", sr: "Napravite ujednačen edukativni prednji raspored i sačuvajte identitete levih i desnih zuba." }, difficulty: "intermediate", minutes: 12,
    targetIds: anterior.map((object) => objectId(object.id)), tools: ["select", "move", "rotate", "scale", "camera"],
    what: { en: "Adjust the individual upper and lower central incisors, lateral incisors and canines.", sr: "Podesite pojedinačne gornje i donje centralne sekutiće, lateralne sekutiće i očnjake." },
    why: { en: "Anterior positions set the midline, arch transition and visible incisal relationship.", sr: "Prednji položaji određuju srednju liniju, prelaz luka i vidljivi odnos incizalnih ivica." },
    object: { en: "DESIGN tooth objects FDI 11–13, 21–23, 31–33 and 41–43.", sr: "DIZAJN objekti zuba FDI 11–13, 21–23, 31–33 i 41–43." },
    action: { en: "Select one tooth at a time. Use Move for spacing and Rotate for its local arch angle; keep the guide midlines in view.", sr: "Izaberite jedan po jedan zub. Koristite Move za razmake, a Rotate za lokalni ugao luka; držite vodiče sredine vidljivim." },
    target: { en: "Target for this exercise: keep 12 anterior teeth as separate objects and refine at least one transform on each arch.", sr: "Cilj ove vežbe: zadržite 12 prednjih zuba kao zasebne objekte i doradite bar jednu transformaciju na svakoj vilici." },
    check: { en: "Design Check confirms all anterior FDI identities remain present and one upper and one lower position changed.", sr: "Design Check potvrđuje da su sačuvani svi prednji FDI identiteti i da su promenjeni bar jedan gornji i jedan donji položaj." },
    validators: [
      { type: "denture_setup", check: "tooth_setup", arch: "upper", segment: "anterior" },
      { type: "denture_setup", check: "tooth_setup", arch: "lower", segment: "anterior" },
    ],
  },
  {
    id: "posterior-setup", checkpoint: "posterior_setup", title: { en: "Arrange posterior teeth", sr: "Postavite bočne zube" },
    summary: { en: "Refine premolar and molar positions individually along both residual ridges.", sr: "Doradite pojedinačne položaje premolara i molara duž oba rezidualna grebena." },
    goal: { en: "Continue the arch form while keeping posterior teeth separately editable.", sr: "Nastavite oblik luka i zadržite bočne zube zasebno izmenjivim." }, difficulty: "intermediate", minutes: 12,
    targetIds: posterior.map((object) => objectId(object.id)), tools: ["select", "move", "rotate", "scale", "camera"],
    what: { en: "Refine the premolars and molars from FDI positions 14–17, 24–27, 34–37 and 44–47.", sr: "Doradite premolare i molare na FDI položajima 14–17, 24–27, 34–37 i 44–47." },
    why: { en: "Posterior position controls arch continuity and the synthetic support relationship between the two rows.", sr: "Bočni položaji kontrolišu kontinuitet luka i sintetički odnos potpore između dva reda." },
    object: { en: "DESIGN posterior tooth objects; SOURCE residual ridges remain locked.", sr: "DIZAJN bočnih zuba; IZVORNI rezidualni grebeni ostaju zaključani." },
    action: { en: "Use Move and Rotate on individual teeth to follow each ridge. Keep the last molars inside the visible retromolar/tuberosity context.", sr: "Koristite Move i Rotate na pojedinačnim zubima da prate svaki greben. Zadržite poslednje molare unutar vidljivog retromolarnog/tuberoznog konteksta." },
    target: { en: "Target for this exercise: preserve 16 separate posterior objects and refine at least one position per arch.", sr: "Cilj ove vežbe: sačuvajte 16 zasebnih bočnih objekata i doradite bar jedan položaj po vilici." },
    check: { en: "Confirm every posterior FDI object is still present and individually selectable; then inspect the arch from above.", sr: "Proverite da su svi bočni FDI objekti prisutni i pojedinačno izbirljivi, zatim pregledajte luk odozgo." },
    validators: [
      { type: "denture_setup", check: "tooth_setup", arch: "upper", segment: "posterior" },
      { type: "denture_setup", check: "tooth_setup", arch: "lower", segment: "posterior" },
    ],
  },
  {
    id: "static-occlusion", checkpoint: "static_occlusion", title: { en: "Review static occlusion", sr: "Pregledajte statičku okluziju" },
    summary: { en: "Use the shared Proximity analysis to inspect the synthetic upper/lower tooth relationship.", sr: "Koristite zajedničku analizu blizine da pregledate sintetički odnos gornjih i donjih zuba." },
    goal: { en: "Find and review where opposing tooth proposals approach each other.", sr: "Pronađite i pregledajte gde se suprotni predlozi zuba približavaju." }, difficulty: "intermediate", minutes: 10,
    targetIds: ["tooth-16", "tooth-46", "guide-occlusal-plane"].map(objectId), tools: ["select", "analysis", "camera", "scene"],
    what: { en: "Run static Proximity between one upper and one lower posterior tooth, then inspect the remaining row.", sr: "Pokrenite statičku analizu blizine između jednog gornjeg i jednog donjeg bočnog zuba, zatim pregledajte ostatak reda." },
    why: { en: "A visible, measurable opposing relationship helps reveal gross gaps and intersections in this synthetic setup.", sr: "Vidljiv i merljiv suprotni odnos pomaže da uočite velike razmake i preseke u ovom sintetičkom rasporedu." },
    object: { en: "DESIGN FDI 16 and FDI 46 with the GUIDE plane visible.", sr: "DIZAJN FDI 16 i FDI 46 uz vidljivi VODIČ ravan." },
    action: { en: "Select the upper and lower tooth pair, choose Contact/Proximity analysis, run it, and orbit to inspect highlighted regions.", sr: "Izaberite par gornjeg i donjeg zuba, pokrenite analizu Contact/Proximity i okrenite prikaz da pregledate istaknute regije." },
    target: { en: "Target for this exercise: use a current shared analysis result to identify the closest opposing region; do not treat it as patient-specific occlusion.", sr: "Cilj ove vežbe: koristite aktuelni rezultat zajedničke analize da prepoznate najbližu suprotnu regiju; ne tumačite ga kao okluziju konkretnog pacijenta." },
    check: { en: "Confirm the analysis result is current for these two DESIGN objects and review the displayed minimum distance.", sr: "Proverite da je rezultat analize aktuelan za ova dva DIZAJN objekta i pregledajte prikazano minimalno rastojanje." },
    validators: [{ type: "analysis_target", kind: "contact", objectIds: [objectId("tooth-16"), objectId("tooth-46")] }],
  },
  {
    id: "denture-borders", checkpoint: "borders", title: { en: "Trace denture borders", sr: "Označite granice proteza" },
    summary: { en: "Create separate closed exercise borders on the maxillary and mandibular support surfaces.", sr: "Napravite zasebne zatvorene granice za vežbu na maksilarnoj i mandibularnoj potpornoj površini." },
    goal: { en: "Store upper and lower borders as editable curves without changing the source arches.", sr: "Sačuvajte gornju i donju granicu kao izmenjive krive bez promene izvornih vilica." }, difficulty: "intermediate", minutes: 10,
    targetIds: ["source-upper-arch", "source-lower-arch", "guide-upper-border", "guide-lower-border"].map(objectId), tools: ["select", "mesh-edit", "camera", "scene"],
    what: { en: "Trace one closed border curve on each SOURCE edentulous arch.", sr: "Nacrtajte po jednu zatvorenu graničnu krivu na svakoj IZVORNOJ bezuboj vilici." },
    why: { en: "The borders define the exercise extent of each base while leaving the source tissue geometry intact.", sr: "Granice određuju obim baze za vežbu i ostavljaju izvornu geometriju tkiva neizmenjenom." },
    object: { en: "SOURCE upper arch and SOURCE lower arch; GUIDE border loops are references.", sr: "IZVORNA gornja vilica i IZVORNA donja vilica; VODIČ granične petlje su reference." },
    action: { en: "Use the shared curve tool on the upper support, close the loop, then repeat on the lower support.", sr: "Koristite zajednički alat za krive na gornjoj potpori, zatvorite petlju, pa ponovite na donjoj potpori." },
    target: { en: "Target for this exercise: one closed curve with at least three points per arch.", sr: "Cilj ove vežbe: po jedna zatvorena kriva sa najmanje tri tačke na svakoj vilici." },
    check: { en: "Run Design Check for both arches and confirm each stored boundary is closed.", sr: "Pokrenite Design Check za obe vilice i proverite da je svaka sačuvana granica zatvorena." },
    validators: [
      { type: "denture_setup", check: "boundary", arch: "upper" },
      { type: "denture_setup", check: "boundary", arch: "lower" },
    ],
  },
  {
    id: "denture-bases", checkpoint: "base", title: { en: "Adapt the denture bases", sr: "Prilagodite baze proteza" },
    summary: { en: "Inspect and edit the separate upper and lower base proposals against the stored borders.", sr: "Pregledajte i izmenite zasebne predloge gornje i donje baze prema sačuvanim granicama." },
    goal: { en: "Relate each editable base to its matching support arch and border curve.", sr: "Povežite svaku izmenjivu bazu sa odgovarajućom potpornom vilicom i graničnom krivom." }, difficulty: "intermediate", minutes: 11,
    targetIds: ["base-upper", "base-lower"].map(objectId), tools: ["select", "sculpt", "mesh-edit", "camera", "scene"],
    what: { en: "Review and shape the two DESIGN denture bases above their corresponding SOURCE arches.", sr: "Pregledajte i oblikujte dve DIZAJN baze iznad odgovarajućih IZVORNIH vilica." },
    why: { en: "The base connects the tooth setup to the synthetic support surface and carries the exercise border.", sr: "Baza povezuje raspored zuba sa sintetičkom potpornom površinom i prati granicu vežbe." },
    object: { en: "DESIGN upper base and DESIGN lower base; SOURCE arches remain reference anatomy.", sr: "DIZAJN gornja baza i DIZAJN donja baza; IZVORNE vilice ostaju anatomska referenca." },
    action: { en: "Select each base separately. Use Sculpt or mesh edit to adjust the shell toward its support and closed border.", sr: "Izaberite svaku bazu zasebno. Koristite Sculpt ili mesh edit da prilagodite ljusku potpori i zatvorenoj granici." },
    target: { en: "Target for this exercise: retain two independent base objects with more than 100 surface triangles each.", sr: "Cilj ove vežbe: zadržite dva nezavisna objekta baze sa više od 100 površinskih trouglova svaki." },
    check: { en: "Confirm both bases are editable and present, then inspect the border relationship in section and from the tissue side.", sr: "Proverite da su obe baze izmenjive i prisutne, zatim pregledajte odnos granica u preseku i sa tkivne strane." },
    validators: [{ type: "denture_setup", check: "base" }],
  },
  {
    id: "polished-surface", checkpoint: "polished_surface", title: { en: "Shape tissue and polished surfaces", sr: "Oblikujte tkivnu i poliranu površinu" },
    summary: { en: "Compare the simplified tissue-side adaptation and external polished contours on both bases.", sr: "Uporedite pojednostavljeno prilagođavanje tkivnoj strani i spoljne polirane konture obe baze." },
    goal: { en: "Use shared sculpt tools to refine the educational soft-tissue-facing and polished surfaces.", sr: "Koristite zajedničke Sculpt alate da doradite edukativne tkivne i polirane površine." }, difficulty: "advanced", minutes: 10,
    targetIds: ["base-upper", "base-lower"].map(objectId), tools: ["select", "sculpt", "mesh-edit", "camera", "scene"],
    what: { en: "Shape the base contours on the tissue side and polished external side.", sr: "Oblikujte konture baze sa tkivne i spoljne polirane strane." },
    why: { en: "The two surfaces have different roles and should remain understandable as separate concepts in the training case.", sr: "Dve površine imaju različite uloge i treba da ostanu razumljive kao zasebni koncepti u trenažnom slučaju." },
    object: { en: "DESIGN upper and lower denture bases; GUIDE border loops remain visible.", sr: "DIZAJN gornja i donja baza proteze; VODIČ granične petlje ostaju vidljive." },
    action: { en: "Toggle the two camera sides, select each base, and make a small Sculpt or mesh-edit refinement where the surface transition reads uneven.", sr: "Promenite dva pogleda kamere, izaberite svaku bazu i napravite malu Sculpt ili mesh-edit doradu gde prelaz površine deluje neravno." },
    target: { en: "Target for this exercise: keep the tissue-side and polished-surface forms continuous with the displayed exercise borders.", sr: "Cilj ove vežbe: održite kontinuitet tkivne i polirane površine sa prikazanim granicama vežbe." },
    check: { en: "Run the base check and visually confirm both base objects remain separate from the locked SOURCE arches.", sr: "Pokrenite proveru baze i vizuelno potvrdite da oba objekta baze ostaju odvojena od zaključanih IZVORNIH vilica." },
    validators: [{ type: "denture_setup", check: "base" }],
  },
  {
    id: "final-occlusion", checkpoint: "final_occlusion", title: { en: "Final occlusion and Design Check", sr: "Završna okluzija i Design Check" },
    summary: { en: "Verify the full tooth set, two bases, two borders and a current static relationship analysis.", sr: "Proverite kompletan set zuba, dve baze, dve granice i aktuelnu analizu statičkog odnosa." },
    goal: { en: "Complete the educational denture case with the shared analysis and validation tools.", sr: "Završite edukativni slučaj proteze koristeći zajedničke alate za analizu i validaciju." }, difficulty: "advanced", minutes: 12,
    targetIds: ["base-upper", "base-lower", ...upperTeeth.slice(-2).map((object) => object.id), ...lowerTeeth.slice(-2).map((object) => object.id)].map(objectId), tools: ["select", "analysis", "camera", "scene"],
    what: { en: "Run the final object, border and static-contact checks across both arches.", sr: "Pokrenite završne provere objekata, granica i statičkih kontakata obe vilice." },
    why: { en: "This catches missing setup objects, open borders and stale or absent contact measurements in the synthetic case.", sr: "Ovim se otkrivaju nedostajući objekti rasporeda, otvorene granice i zastarela ili nedostajuća merenja kontakta u sintetičkom slučaju." },
    object: { en: "All 28 DESIGN teeth, both DESIGN bases, both SOURCE arches and both border curves.", sr: "Svih 28 DIZAJN zuba, obe DIZAJN baze, obe IZVORNE vilice i obe granične krive." },
    action: { en: "Run Proximity on an opposing posterior pair, inspect a section, then run Design Check for completeness.", sr: "Pokrenite Proximity na paru suprotnih bočnih zuba, pregledajte presek, pa pokrenite Design Check za potpunost." },
    target: { en: "Target for this exercise: 28 separate tooth objects, two editable bases, two closed borders and a current analysis result.", sr: "Cilj ove vežbe: 28 zasebnih objekata zuba, dve izmenjive baze, dve zatvorene granice i aktuelan rezultat analize." },
    check: { en: "Review each Design Check result and resolve missing objects, open borders or gross intersections before marking the exercise complete.", sr: "Pregledajte svaki Design Check rezultat i rešite nedostajuće objekte, otvorene granice ili velike preseke pre završetka vežbe." },
    validators: [{ type: "denture_setup", check: "complete_case" }],
  },
  {
    id: "full-denture-case", checkpoint: "full_denture_case", title: { en: "Complete denture case · full review", sr: "Kompletna proteza · završni pregled" },
    summary: { en: "Review the whole synthetic setup as a connected but individually editable CAD case.", sr: "Pregledajte ceo sintetički raspored kao povezan, ali pojedinačno izmenjiv CAD slučaj." },
    goal: { en: "Show that the arches, teeth, guides and bases remain independently addressable in the shared workspace.", sr: "Pokažite da su vilice, zubi, vodiči i baze nezavisno dostupni u zajedničkom radnom prostoru." }, difficulty: "advanced", minutes: 8,
    targetIds: completeDentureBalancedR4Package.objects.filter((object) => object.caseRole === "DESIGN" && object.editable).map((object) => objectId(object.id)), tools: ["select", "analysis", "camera", "scene"],
    what: { en: "Review the complete 28-tooth setup, both bases and the synthetic upper/lower relation.", sr: "Pregledajte kompletan raspored od 28 zuba, obe baze i sintetički odnos gornje i donje vilice." },
    why: { en: "The final package check confirms that tooth identity and design semantics survive case switching and edit operations.", sr: "Završna provera paketa potvrđuje da identitet zuba i semantika dizajna opstaju pri promeni slučaja i izmenama." },
    object: { en: "All SOURCE, DESIGN, GUIDE and REFERENCE objects in the R4 package.", sr: "Svi IZVOR, DIZAJN, VODIČ i REFERENTNI objekti u R4 paketu." },
    action: { en: "Select a tooth, a base and each arch object in Scene; verify their role labels and editable state before final analysis.", sr: "Izaberite zub, bazu i svaki objekat vilice u Scene panelu; proverite oznake uloga i izmenjivo stanje pre završne analize." },
    target: { en: "Target for this exercise: every FDI tooth and each base remain a separate object, with synthetic anatomy and relation clearly labeled.", sr: "Cilj ove vežbe: svaki FDI zub i svaka baza ostaju zaseban objekat, a sintetička anatomija i odnos su jasno označeni." },
    check: { en: "Run complete-case Design Check and verify the 28 identities, both bases, two borders and current analysis are reported.", sr: "Pokrenite Design Check za ceo slučaj i proverite da su prijavljena 28 identiteta, obe baze, dve granice i aktuelna analiza." },
    validators: [{ type: "denture_setup", check: "complete_case" }],
  },
];

function createLesson(stage: Stage, index: number): PracticeLesson {
  const targetIds = stage.targetIds;
  return lessonSchema.parse({
    id: `r4-complete-denture-${stage.id}`,
    databaseId: `e4000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    moduleId: "complete-denture-r4",
    title: stage.title,
    summary: stage.summary,
    goal: stage.goal,
    difficulty: stage.difficulty,
    recommendedPrerequisites: index === 0 ? [] : [{ en: stages[index - 1].title.en, sr: stages[index - 1].title.sr }],
    estimatedMinutes: stage.minutes,
    assets: [],
    caseSetup: { source: "denture-case", casePackageId: completeDentureBalancedR4Package.packageId, checkpointId: stage.checkpoint, objectMappings: allPackageMappings },
    steps: [{
      id: `${stage.id}-design-check`, order: 1,
      title: stage.title,
      instructions: {
        en: `WHAT: ${stage.what.en}\nWHY: ${stage.why.en}\nOBJECT: ${stage.object.en}\nTOOL: ${stage.tools.join(", ")} in the shared CAD workspace.\nACTION: ${stage.action.en}\nTARGET: ${stage.target.en}\nCHECK: ${stage.check.en}`,
        sr: `ŠTA: ${stage.what.sr}\nZAŠTO: ${stage.why.sr}\nOBJEKAT: ${stage.object.sr}\nALAT: ${stage.tools.join(", ")} u zajedničkom CAD radnom prostoru.\nAKCIJA: ${stage.action.sr}\nCILJ: ${stage.target.sr}\nPROVERA: ${stage.check.sr}`,
      },
      theory: { en: stage.why.en, sr: stage.why.sr },
      allowedTools: stage.tools,
      targetObjectIds: targetIds,
      hints: [{ id: `${stage.id}-scene`, title: { en: "Find the objects", sr: "Pronađite objekte" }, body: { en: "Use the SOURCE, DESIGN, GUIDE and REFERENCE prefixes in Scene to choose the object named above.", sr: "Koristite prefikse SOURCE, DESIGN, GUIDE i REFERENCE u Scene panelu da izaberete navedeni objekat." } }],
      referenceModes: ["off", "outline", "transparent"],
      validators: stage.validators,
      required: true,
    }],
  });
}

export const COMPLETE_DENTURE_R4_LESSONS: PracticeLesson[] = stages.map(createLesson);
