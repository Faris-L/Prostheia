import { caseObjectRuntimeId } from "@/cad/case-packages/identity";
import { PARTIAL_DENTURE_R5_PACKAGES } from "@/cad/case-packages/definitions/partial-denture-r5";
import type { KennedyClass } from "@/cad/partial-denture/types";
import { lessonSchema, type PracticeLesson } from "./types";

type Stage = {
  id: string; checkpoint: string; check: "survey" | "insertion_path" | "contours" | "undercuts" | "blockout" | "rests" | "major_connector" | "minor_connectors" | "clasps" | "saddle_mesh" | "finish_lines" | "complete_case";
  title: { en: string; sr: string }; what: { en: string; sr: string }; why: { en: string; sr: string };
  object: { en: string; sr: string }; tool: string; action: { en: string; sr: string };
  target: { en: string; sr: string }; verify: { en: string; sr: string }; objects: string[];
};

const stages: Stage[] = [
  {
    id: "inspect", checkpoint: "case_inspection", check: "survey", title: { en: "Inspect the Kennedy case", sr: "Pregledajte Kennedy slučaj" },
    what: { en: "Identify the arch, remaining teeth, missing-tooth sites, and support ridge." , sr: "Utvrdite vilicu, preostale zube, bezube prostore i potporni greben." },
    why: { en: "Tooth distribution distinguishes a distal extension from a bounded space or an anterior saddle crossing the midline.", sr: "Raspored zuba razlikuje slobodno sedlo od ograničenog prostora ili prednjeg sedla preko srednje linije." },
    object: { en: "SOURCE arch, natural-tooth forms, and the pink residual ridge.", sr: "IZVORNA vilica, oblici prirodnih zuba i ružičasti rezidualni greben." },
    tool: "Scene, Select, Camera", action: { en: "Orbit the arch and compare the visible FDI teeth with the case brief's missing-tooth list. Identify each saddle and its support tissue.", sr: "Rotirajte vilicu i uporedite vidljive FDI zube sa listom nedostajućih zuba u nalogu. Uočite svako sedlo i potporno tkivo." },
    target: { en: "Target for this exercise: describe whether the space is bilateral, unilateral, bounded, or anterior and crosses the midline.", sr: "Cilj ove vežbe: utvrdite da li je prostor obostran, jednostran, ograničen ili prednji i prelazi srednju liniju." },
    verify: { en: "Confirm the tooth distribution and tissue support match the Kennedy label shown in the Free Lab brief.", sr: "Potvrdite da se raspored zuba i potpora tkiva poklapaju sa Kennedy oznakom u Free Lab nalogu." }, objects: ["source-arch", "guide-insertion-axis"],
  },
  {
    id: "survey", checkpoint: "case_inspection", check: "survey", title: { en: "Survey the abutment contours", sr: "Odredite ekvatore zuba nosača" },
    what: { en: "Inspect the visible contour guides around each designated abutment.", sr: "Pregledajte vidljive vodiče konture oko svakog označenog zuba nosača." },
    why: { en: "Survey contours help explain where a clasp path meets the tooth in relation to an insertion direction.", sr: "Konture pomažu da razumete gde se putanja kukice oslanja na zub u odnosu na smer insercije." },
    object: { en: "SOURCE abutment teeth and GUIDE survey lines.", sr: "IZVORNI zubi nosači i VODIČI ekvatora." },
    tool: "Select, Camera, Partial Denture controls", action: { en: "Show the survey lines, inspect both sides of each abutment, then mark the survey reviewed in the RPD controls.", sr: "Prikažite linije ekvatora, pregledajte obe strane svakog nosača, pa označite pregled u RPD kontrolama." },
    target: { en: "Target for this exercise: relate each contour line to the abutment and nearby saddle.", sr: "Cilj ove vežbe: povežite svaku liniju konture sa nosačem i susednim sedlom." },
    verify: { en: "Design Check should confirm a reviewed survey and a guide for every abutment. This guide is educational, not a clinical survey.", sr: "Design Check treba da potvrdi pregled ekvatora i vodič za svaki zub nosač. Ovo je edukativni, ne klinički prikaz." }, objects: ["guide-survey", "source-arch"],
  },
  {
    id: "insertion-path", checkpoint: "survey", check: "insertion_path", title: { en: "Choose an insertion path", sr: "Izaberite put insercije" },
    what: { en: "Choose the shared insertion direction used to interpret contours and undercut regions.", sr: "Izaberite zajednički smer insercije za tumačenje kontura i podminiranih područja." },
    why: { en: "Changing the path changes which surfaces appear retentive in the directional preview.", sr: "Promena puta menja koje površine izgledaju retentivno u smernom prikazu." },
    object: { en: "GUIDE insertion axis and the selected SOURCE abutments.", sr: "VODIČ ose insercije i izabrani IZVORNI zubi nosači." },
    tool: "Partial Denture controls, Select", action: { en: "Choose an axis in the RPD controls, compare it with the survey view, and confirm the path for this exercise.", sr: "Izaberite osu u RPD kontrolama, uporedite je sa prikazom ekvatora i potvrdite put za ovu vežbu." },
    target: { en: "Target for this exercise: one selected non-zero insertion direction shared with the CAD analysis tools.", sr: "Cilj ove vežbe: izabran nenulti smer insercije koji dele CAD alati za analizu." },
    verify: { en: "The path axis guide remains visible and Design Check reports a selected insertion direction.", sr: "Vodič ose ostaje vidljiv, a Design Check prijavljuje izabran smer insercije." }, objects: ["guide-insertion-axis", "source-arch"],
  },
  {
    id: "contours", checkpoint: "insertion_path", check: "contours", title: { en: "Review tooth contours", sr: "Pregledajte konture zuba" },
    what: { en: "Compare the survey guides on each abutment using the chosen insertion path.", sr: "Uporedite vodiče ekvatora na svakom nosaču prema izabranom putu insercije." },
    why: { en: "The contour relationship informs clasp approach and the location of a useful exercise undercut preview.", sr: "Odnos kontura pomaže pri izboru pristupa kukice i mesta za koristan smerni prikaz podminiranja." },
    object: { en: "SOURCE teeth, GUIDE survey lines, and GUIDE insertion axis.", sr: "IZVORNI zubi, VODIČI ekvatora i VODIČ ose insercije." },
    tool: "Select, Camera, Partial Denture controls", action: { en: "Inspect the survey lines from an occlusal and buccal view, then mark the contour review complete.", sr: "Pregledajte linije ekvatora iz okluzalnog i bukalnog pogleda, pa označite pregled kontura kao završen." },
    target: { en: "Target for this exercise: identify the tooth surfaces that the chosen path approaches on each abutment.", sr: "Cilj ove vežbe: prepoznajte površine svakog nosača kojima se izabrani put približava." },
    verify: { en: "Confirm that contour review is recorded for this package and that the guides remain associated with their abutment teeth.", sr: "Potvrdite da je pregled kontura zabeležen i da su vodiči povezani sa odgovarajućim zubima nosačima." }, objects: ["guide-survey", "guide-insertion-axis"],
  },
  {
    id: "undercuts", checkpoint: "contours", check: "undercuts", title: { en: "Inspect directional undercut preview", sr: "Pregledajte smerni prikaz podminiranja" },
    what: { en: "Run the shared directional surface preview on a designated abutment.", sr: "Pokrenite zajednički smerni prikaz površine na označenom zubu nosaču." },
    why: { en: "A directional preview helps compare surface orientation for the selected path; it does not establish clinical survey accuracy.", sr: "Smerni prikaz pomaže da uporedite orijentaciju površina za izabrani put; ne utvrđuje kliničku tačnost ekvatora." },
    object: { en: "A SOURCE abutment tooth and the active insertion direction.", sr: "IZVORNI zub nosač i aktivni smer insercije." },
    tool: "Inspect → Analysis → Insertion direction → Preview path", action: { en: "Select an abutment tooth, choose Insertion direction analysis, and run Preview path. Compare the directional result with the survey line.", sr: "Izaberite zub nosač, u analizi izaberite Smer insercije i pokrenite Pregledaj put. Uporedite rezultat sa linijom ekvatora." },
    target: { en: "Target for this exercise: a current shared preview for one abutment using the selected path.", sr: "Cilj ove vežbe: aktuelni zajednički prikaz za jedan zub nosač uz izabrani put." },
    verify: { en: "Design Check must find a current directional preview. The face-orientation score is an educational measure, not a clinical undercut value.", sr: "Design Check mora da pronađe aktuelni smerni prikaz. Ocena orijentacije je edukativna mera, ne klinička vrednost podminiranja." }, objects: ["source-arch", "guide-survey"],
  },
  {
    id: "blockout", checkpoint: "undercuts", check: "blockout", title: { en: "Block out useful undercut regions", sr: "Blokirajte korisna podminirana područja" },
    what: { en: "Inspect and show the editable blockout surfaces on the abutments.", sr: "Pregledajte i prikažite izmenjive površine blokiranja na zubima nosačima." },
    why: { en: "Blockout represents an insertion-path-related design decision where the framework should not engage an unwanted undercut.", sr: "Blokiranje predstavlja odluku o dizajnu u odnosu na put insercije gde skelet ne treba da zahvati neželjeno podminiranje." },
    object: { en: "GUIDE blockout patches linked to SOURCE abutment teeth.", sr: "VODIČI blokiranja povezani sa IZVORNIM zubima nosačima." },
    tool: "Scene, Select, Partial Denture controls", action: { en: "Use Apply blockout to show the surface patches, select each patch in Scene, and inspect its linked tooth and insertion path.", sr: "Pomoću Primeni blokiranje prikažite površinske zone, izaberite svaku u Scene i proverite povezani zub i put insercije." },
    target: { en: "Target for this exercise: one inspectable blockout surface for every planned abutment.", sr: "Cilj ove vežbe: pregledna površina blokiranja za svaki planirani zub nosač." },
    verify: { en: "Check that each patch sits at an abutment contour and the RPD state records blockout as applied.", sr: "Proverite da svaka zona prati konturu nosača i da je stanje RPD zabeležilo primenjeno blokiranje." }, objects: ["guide-blockout", "guide-survey"],
  },
  {
    id: "rests", checkpoint: "blockout", check: "rests", title: { en: "Define tooth-associated rests", sr: "Definišite upirače povezane sa zubima" },
    what: { en: "Review the editable occlusal or cingulum rest concepts on the selected abutments.", sr: "Pregledajte izmenjive okluzalne ili cingulum upirače na izabranim zubima nosačima." },
    why: { en: "Rests show where the framework is intended to receive support from an abutment in this exercise model.", sr: "Upirači prikazuju gde skelet u ovom modelu treba da dobije potporu od zuba nosača." },
    object: { en: "DESIGN rest objects with stable IDs and explicit abutment assignments.", sr: "DIZAJN upirači sa stabilnim ID oznakama i jasnom vezom sa zubima nosačima." },
    tool: "Scene, Select, Move", action: { en: "Select each rest object and inspect its tooth number and rest-surface label. Kennedy IV uses cingulum rest concepts; posterior cases use occlusal concepts.", sr: "Izaberite svaki upirač i proverite broj zuba i oznaku površine. Kennedy IV koristi cingulum koncepte, a bočni slučajevi okluzalne." },
    target: { en: "Target for this exercise: at least one editable rest concept assigned to every abutment.", sr: "Cilj ove vežbe: najmanje jedan izmenjiv koncept upirača povezan sa svakim zubom nosačem." },
    verify: { en: "Design Check confirms registered rest geometry and stable tooth relationships. It does not validate clinical tooth preparation.", sr: "Design Check potvrđuje registrovanu geometriju i stabilne veze sa zubima. Ne potvrđuje kliničku preparaciju zuba." }, objects: ["design-rest", "source-arch"],
  },
  {
    id: "major-connector", checkpoint: "rests", check: "major_connector", title: { en: "Review the major connector", sr: "Pregledajte glavni konektor" },
    what: { en: "Inspect the arch-appropriate major connector concept.", sr: "Pregledajte koncept glavnog konektora prilagođen vilici." },
    why: { en: "The connector links the framework across the arch while respecting the selected training anatomy.", sr: "Konektor povezuje skelet preko vilice uz odnos prema izabranoj trenažnoj anatomiji." },
    object: { en: "Editable DESIGN major connector: mandibular lingual bar, maxillary palatal strap, or horseshoe form.", sr: "Izmenjivi DIZAJN glavni konektor: mandibularna lingvalna prečka, maksilarna palatinalna traka ili potkovasti oblik." },
    tool: "Scene, Select, Move, Camera", action: { en: "Select the major connector and inspect how its path follows the lingual or palatal side and clears the saddle regions.", sr: "Izaberite glavni konektor i pregledajte kako putanja prati lingvalnu ili palatinalnu stranu i prolazi uz sedla." },
    target: { en: "Target for this exercise: one editable connector with an explicit arch-specific form.", sr: "Cilj ove vežbe: jedan izmenjiv konektor sa jasnim oblikom za datu vilicu." },
    verify: { en: "Confirm the connector is registered as DESIGN and stays related to the case framework.", sr: "Potvrdite da je konektor registrovan kao DIZAJN i povezan sa skeletom slučaja." }, objects: ["design-major-connector"],
  },
  {
    id: "minor-connectors", checkpoint: "major_connector", check: "minor_connectors", title: { en: "Review the minor connectors", sr: "Pregledajte male konektore" },
    what: { en: "Follow each minor connector from the major connector to its saddle region.", sr: "Pratite svaki mali konektor od glavnog konektora do odgovarajućeg sedla." },
    why: { en: "Minor connectors make the relationship between rests, saddles, and the major connector easy to inspect.", sr: "Mali konektori jasno prikazuju vezu između upirača, sedla i glavnog konektora." },
    object: { en: "DESIGN minor connectors with stable parent and abutment relationships.", sr: "DIZAJN mali konektori sa stabilnim vezama roditeljskog objekta i zuba nosača." },
    tool: "Scene, Select, Camera", action: { en: "Select each minor connector and trace its path to the matching saddle and major connector.", sr: "Izaberite svaki mali konektor i ispratite putanju do odgovarajućeg sedla i glavnog konektora." },
    target: { en: "Target for this exercise: one connected minor connector per saddle region.", sr: "Cilj ove vežbe: po jedan povezani mali konektor za svako sedlo." },
    verify: { en: "Design Check compares connector count, registered meshes, and parent links with the package saddle regions.", sr: "Design Check upoređuje broj konektora, registrovane mreže i veze sa roditeljskim objektom prema sedlima paketa." }, objects: ["design-minor-connector", "design-major-connector"],
  },
  {
    id: "clasps", checkpoint: "minor_connectors", check: "clasps", title: { en: "Review clasp paths", sr: "Pregledajte putanje kukica" },
    what: { en: "Inspect each editable clasp path on its assigned abutment.", sr: "Pregledajte svaku izmenjivu putanju kukice na dodeljenom zubu nosaču." },
    why: { en: "The path should make its tooth relationship and relation to the chosen insertion direction understandable.", sr: "Putanja treba da jasno pokaže vezu sa zubom i odnos prema izabranom smeru insercije." },
    object: { en: "DESIGN clasps, GUIDE survey contours, and abutment teeth.", sr: "DIZAJN kukice, VODIČI ekvatora i zubi nosači." },
    tool: "Scene, Select, Move, Camera", action: { en: "Select each clasp and trace it from the framework origin, around the buccal contour, to its retentive tip.", sr: "Izaberite svaku kukicu i ispratite je od skeleta, oko bukalne konture, do retencionog vrha." },
    target: { en: "Target for this exercise: a registered clasp path for every planned abutment, linked to the same tooth ID.", sr: "Cilj ove vežbe: registrovana putanja kukice za svaki planirani nosač, povezana sa istim ID oznakama zuba." },
    verify: { en: "Confirm assignment, stable semantic ID, and current path geometry. This is not a clinical clasp-design approval.", sr: "Potvrdite dodelu, stabilan semantički ID i aktuelnu geometriju putanje. Ovo nije kliničko odobrenje dizajna kukice." }, objects: ["design-clasp", "guide-survey"],
  },
  {
    id: "saddle-mesh", checkpoint: "clasps", check: "saddle_mesh", title: { en: "Review saddle and retention mesh", sr: "Pregledajte sedlo i retencionu mrežicu" },
    what: { en: "Inspect each saddle surface over its missing-tooth support region and the matching retention lattice.", sr: "Pregledajte površinu svakog sedla iznad potpornog područja nedostajućih zuba i odgovarajuću retencionu mrežicu." },
    why: { en: "The pairing makes the relationship between edentulous ridge, acrylic saddle concept, and framework retention region visible.", sr: "Uparivanje čini vidljivom vezu bezubog grebena, koncepta akrilatnog sedla i retencione zone skeleta." },
    object: { en: "SOURCE residual ridge and paired DESIGN saddle and retention-mesh objects.", sr: "IZVORNI rezidualni greben i upareni DIZAJN objekti sedla i retencione mrežice." },
    tool: "Scene, Select, Camera", action: { en: "Toggle the SOURCE ridge for comparison, then inspect the saddle outline and the metal mesh inside its footprint.", sr: "Uključite i isključite IZVORNI greben radi poređenja, pa pregledajte obris sedla i metalnu mrežicu unutar njega." },
    target: { en: "Target for this exercise: matching editable saddle and mesh regions for every Kennedy space.", sr: "Cilj ove vežbe: uparene izmenjive zone sedla i mrežice za svaki Kennedy prostor." },
    verify: { en: "Design Check confirms the saddle and retention mesh share missing-tooth metadata and registered geometry.", sr: "Design Check potvrđuje da sedlo i mrežica dele metapodatke nedostajućih zuba i registrovanu geometriju." }, objects: ["design-saddle", "design-retention-mesh", "source-arch"],
  },
  {
    id: "finish-lines", checkpoint: "saddle_mesh", check: "finish_lines", title: { en: "Review finish-line concepts", sr: "Pregledajte koncepte završnih linija" },
    what: { en: "Inspect the finish-line guides around the saddle margins.", sr: "Pregledajte vodiče završnih linija oko ivica sedla." },
    why: { en: "A visible border helps explain where the framework and saddle material meet in this teaching model.", sr: "Vidljiva granica objašnjava gde se skelet i materijal sedla spajaju u ovom edukativnom modelu." },
    object: { en: "GUIDE finish lines and DESIGN saddle surfaces.", sr: "VODIČI završnih linija i DIZAJN površine sedla." },
    tool: "Scene, Select, Camera", action: { en: "Show each finish-line guide and compare its course with the matching saddle edge and missing-tooth region.", sr: "Prikažite svaki vodič završne linije i uporedite ga sa ivicom sedla i odgovarajućim bezubim područjem." },
    target: { en: "Target for this exercise: one inspectable finish-line concept for every saddle region.", sr: "Cilj ove vežbe: pregledan koncept završne linije za svako sedlo." },
    verify: { en: "Confirm finish-line guides are editable GUIDE objects tied to the saddle regions; they are not clinical margin validation.", sr: "Potvrdite da su vodiči izmenjivi VODIČ objekti povezani sa sedlima; nisu klinička provera margine." }, objects: ["guide-finish-line", "design-saddle"],
  },
  {
    id: "final", checkpoint: "finish_lines", check: "complete_case", title: { en: "Final RPD Design Check", sr: "Završni Design Check za RPD" },
    what: { en: "Review all source anatomy, workflow flags, design objects, and relationships.", sr: "Pregledajte izvornu anatomiju, stanje postupka, dizajn objekte i njihove veze." },
    why: { en: "A final structure review catches missing components and disconnected educational design relationships.", sr: "Završni pregled strukture otkriva nedostajuće komponente i nepovezane edukativne elemente dizajna." },
    object: { en: "All SOURCE, DESIGN, GUIDE, and REFERENCE objects in this Kennedy package.", sr: "Svi IZVORNI, DIZAJN, VODIČ i REFERENTNI objekti ovog Kennedy paketa." },
    tool: "Scene, Select, Analysis, Design Check", action: { en: "Review the insertion path and prior directional preview, then run Design Check for rests, connector, clasps, saddle coverage, mesh, and finish lines.", sr: "Pregledajte put insercije i prethodni smerni prikaz, pa pokrenite Design Check za upirače, konektor, kukice, sedla, mrežicu i završne linije." },
    target: { en: "Target for this exercise: a complete package-backed design structure with the correct Kennedy missing-tooth distribution.", sr: "Cilj ove vežbe: potpuna struktura dizajna iz paketa sa ispravnim Kennedy rasporedom nedostajućih zuba." },
    verify: { en: "Review each check result and resolve missing design objects or links. The result is an educational structure check, not clinical correctness.", sr: "Pregledajte svaki rezultat i rešite nedostajuće objekte ili veze. Rezultat je edukativna provera strukture, ne kliničke ispravnosti." }, objects: ["source-arch", "design-major-connector", "design-saddle", "design-clasp"],
  },
];

const stageStarts = [
  "case_inspection", "survey", "insertion_path", "contours", "undercuts", "undercuts", "rests", "major_connector", "minor_connectors", "clasps", "saddle_mesh", "finish_lines", "final_review",
];

function createLesson(klass: KennedyClass, stage: Stage, order: number): PracticeLesson {
  const manifest = PARTIAL_DENTURE_R5_PACKAGES.find((item) => item.packageId.endsWith(`kennedy-${klass.toLowerCase()}-v1`))!;
  const getId = (localId: string) => caseObjectRuntimeId(manifest.caseId, localId);
  const targetIds = manifest.objects.filter((object) => stage.objects.some((prefix) => object.id === prefix || object.id.startsWith(prefix))).map((object) => getId(object.id));
  const validators = stage.id === "inspect"
    ? [{ type: "required_object" as const, objectId: getId("source-arch"), visible: true }]
    : [{ type: "partial_denture_setup" as const, check: stage.check, kennedyClass: klass }];
  return lessonSchema.parse({
    id: `r5-partial-denture-${klass.toLowerCase()}-${stage.id}`,
    databaseId: `e5000000-0000-4000-8000-${String(("I" === klass ? 1 : "II" === klass ? 2 : "III" === klass ? 3 : 4) * 100 + order).padStart(12, "0")}`,
    moduleId: `partial-denture-r5-kennedy-${klass.toLowerCase()}`,
    title: stage.title,
    summary: { en: stage.what.en, sr: stage.what.sr },
    goal: { en: stage.target.en, sr: stage.target.sr },
    difficulty: order <= 6 ? "intermediate" : "advanced",
    recommendedPrerequisites: order <= 1 ? [] : [{ en: stages[order - 2].title.en, sr: stages[order - 2].title.sr }],
    estimatedMinutes: order === 13 ? 8 : 5,
    assets: [],
    caseSetup: { source: "partial-denture-case", kennedyClass: klass, casePackageId: manifest.packageId, checkpointId: stageStarts[order - 1], objectMappings: manifest.objects.map((object) => ({ runtimeObjectId: getId(object.id), semanticRole: object.caseRole.toLowerCase(), editable: object.editable })) },
    steps: [{
      id: `${klass.toLowerCase()}-${stage.id}-review`, order: 1,
      title: stage.title,
      instructions: {
        en: `WHAT: ${stage.what.en}\nWHY: ${stage.why.en}\nOBJECT: ${stage.object.en}\nTOOL: ${stage.tool}.\nACTION: ${stage.action.en}\nTARGET: ${stage.target.en}\nCHECK: ${stage.verify.en}`,
        sr: `ŠTA: ${stage.what.sr}\nZAŠTO: ${stage.why.sr}\nOBJEKAT: ${stage.object.sr}\nALAT: ${stage.tool}.\nAKCIJA: ${stage.action.sr}\nCILJ: ${stage.target.sr}\nPROVERA: ${stage.verify.sr}`,
      },
      theory: stage.why,
      allowedTools: stage.id === "undercuts" || stage.id === "final" ? ["select", "analysis", "camera", "scene"] : ["select", "move", "camera", "scene"],
      targetObjectIds: targetIds,
      hints: [{ id: `${stage.id}-rpd-scene`, title: { en: "Find the package objects", sr: "Pronađite objekte paketa" }, body: { en: "The Scene labels use SOURCE, DESIGN, and GUIDE roles. Select a named object to inspect its semantic ID and tooth relationship.", sr: "Oznake Scene koriste uloge SOURCE, DESIGN i GUIDE. Izaberite objekat da biste pregledali njegov semantički ID i vezu sa zubom." } }],
      referenceModes: ["off", "outline", "transparent"],
      validators, required: true,
    }],
  });
}

export const PARTIAL_DENTURE_R5_LESSONS: PracticeLesson[] = PARTIAL_DENTURE_R5_PACKAGES.flatMap((manifest) => {
  const klass = manifest.packageId.endsWith("kennedy-i-v1") ? "I" : manifest.packageId.endsWith("kennedy-ii-v1") ? "II" : manifest.packageId.endsWith("kennedy-iii-v1") ? "III" : "IV";
  return stages.map((stage, index) => createLesson(klass, stage, index + 1));
});
