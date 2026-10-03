import type { FreeLabCategory, FreeLabDifficulty, FreeLabScenario } from "./types";
import { R7_IMPLANT_SCENARIOS } from "./implant-scenario";
import { PARTIAL_DENTURE_R5_PACKAGES } from "@/cad/case-packages/definitions/partial-denture-r5";
import { BITE_SPLINT_R6_PACKAGES, DIGITAL_MODEL_R6_PACKAGES } from "@/cad/case-packages/definitions/dental-realism-r6";
import { resolveScenarioPackage } from "./package-resolution";
import { mapSerbianFields, normalizeR3SerbianCopy } from "@/lib/dental-language";

export const BITE_SPLINT_R6_SCENARIOS: FreeLabScenario[] = BITE_SPLINT_R6_PACKAGES.map((manifest, index) => ({
  id: `scenario-${manifest.caseId}`,
  slug: index === 0 ? "r6_bite_splint_stabilization" : "r6_bite_splint_contact_challenge",
  title: manifest.metadata.title,
  description: manifest.metadata.description,
  category: "bite_splint",
  casePackageId: manifest.packageId,
  startingCheckpointId: "final",
  difficulty: manifest.difficulty === "beginner" ? "beginner" : "intermediate",
  status: "published",
  randomEligible: true,
  brief: {
    patientCode: index === 0 ? "PT-EDU-R6-BS01" : "PT-EDU-R6-BS02",
    indication: manifest.labOrder.indication ?? manifest.metadata.indication!,
    targetTeeth: [],
    material: { en: "Synthetic educational splint material", sr: "Sintetički edukativni materijal udlage" },
    supplied: manifest.labOrder.providedRecords,
    requirements: manifest.labOrder.requiredOutput,
    notes: manifest.labOrder.educationalDisclaimer,
  },
  assets: [],
  materialPreset: "synthetic-educational-splint",
}));

export const DIGITAL_MODEL_R6_SCENARIOS: FreeLabScenario[] = DIGITAL_MODEL_R6_PACKAGES.map((manifest, index) => ({
  id: `scenario-${manifest.caseId}`,
  slug: ["r6_digital_model_maxillary", "r6_digital_model_mandibular", "r6_digital_model_noisy_partial"][index],
  title: manifest.metadata.title,
  description: manifest.metadata.description,
  category: "digital_model",
  casePackageId: manifest.packageId,
  startingCheckpointId: "raw_scan",
  difficulty: manifest.difficulty,
  status: "published",
  randomEligible: true,
  brief: {
    patientCode: ["PT-EDU-R6-DM01", "PT-EDU-R6-DM02", "PT-EDU-R6-DM03"][index],
    indication: manifest.labOrder.indication ?? manifest.metadata.indication!,
    targetTeeth: [],
    material: { en: "Synthetic educational model", sr: "Sintetički edukativni model" },
    supplied: manifest.labOrder.providedRecords,
    requirements: manifest.labOrder.requiredOutput,
    notes: manifest.labOrder.educationalDisclaimer,
  },
  assets: [],
  materialPreset: "synthetic-digital-model",
}));

export const PARTIAL_DENTURE_R5_SCENARIOS: FreeLabScenario[] = PARTIAL_DENTURE_R5_PACKAGES.map((manifest, index) => {
  const order = manifest.labOrder!;
  const klass = (["I", "II", "III", "IV"] as const)[index];
  const material = order.materialPreset ?? { en: "Metal framework and pink saddle training preset", sr: "Trenažni preset metalnog skeleta i roze baze" };
  const indication = order.indication ?? manifest.metadata.indication ?? { en: `Fictional Kennedy Class ${klass} partial denture training order`, sr: `Izmišljeni edukativni nalog za parcijalnu protezu Kennedy klase ${klass}` };
  return {
    id: `scenario-r5-kennedy-${klass.toLowerCase()}`,
    slug: `r5_kennedy_${klass.toLowerCase()}`,
    title: manifest.metadata.title,
    description: manifest.metadata.description,
    category: "partial_denture",
    partialDentureClass: klass,
    casePackageId: manifest.packageId,
    startingCheckpointId: "final_review",
    difficulty: index < 2 ? "intermediate" : "advanced",
    status: "published",
    randomEligible: true,
    brief: {
      patientCode: order.caseCode ?? `PT-EDU-R5-RPD${klass}`,
      indication,
      targetTeeth: order.targetTeeth,
      material,
      supplied: order.providedRecords,
      requirements: order.requiredOutput,
      notes: order.educationalDisclaimer,
    },
    assets: [],
    materialPreset: material.en,
  };
});

const rawR3FixedProstheticsScenarios: FreeLabScenario[] = [
  {
    id: "scenario-r3-crown-26", slug: "r3_crown_26_case", title: { en: "Posterior Crown · tooth 26 · R3", sr: "Bočna krunica · zub 26 · R3" },
    description: { en: "A private educational posterior Crown case with a prepared molar, adjacent teeth, opposing tooth and anatomical proposal.", sr: "Privatni edukativni slučaj bočne krunice sa preparisanim molarom, susednim zubima, antagonistom i anatomskim predlogom." },
    category: "crown", restorationType: "crown", casePackageId: "r3-crown-26-v1", startingCheckpointId: "proposal_ready", difficulty: "intermediate", status: "published", randomEligible: true,
    brief: { patientCode: "PT-EDU-R3-C26", indication: { en: "Fictional single posterior Crown exercise for tooth 26.", sr: "Izmišljena vežba pojedinačne bočne krunice za zub 26." }, targetTeeth: [26], material: { en: "Ivory ceramic training preset", sr: "Trenažni preset keramike boje slonovače" }, supplied: { en: ["Prepared source tooth 26", "Adjacent teeth 25 and 27", "Synthetic opposing tooth 36", "Local synthetic gingiva/support", "Intact tooth reference"], sr: ["Preparisani izvorni zub 26", "Susedni zubi 25 i 27", "Sintetički suprotni zub 36", "Lokalna sintetička gingiva/potpora", "Referenca intaktnog zuba"] }, requirements: { en: ["Adapt the anatomical Crown proposal", "Review proximal and opposing relationships", "Inspect a section and thickness for this exercise"], sr: ["Prilagodite anatomski predlog krunice", "Pregledajte proksimalne i suprotne odnose", "Pregledajte presek i debljinu za ovu vežbu"] }, notes: { en: "Synthetic private educational case. Training targets are not clinical recommendations; source units and patient provenance are unknown.", sr: "Sintetički privatni edukativni slučaj. Ciljevi vežbe nisu kliničke preporuke; izvorne jedinice i poreklo podataka pacijenta nisu poznati." } },
    assets: [], materialPreset: "r3-ivory-ceramic",
  },
  {
    id: "scenario-r3-crown-36", slug: "r3_crown_36_case", title: { en: "Mandibular Crown · tooth 36 · R3", sr: "Mandibularna krunica · zub 36 · R3" },
    description: { en: "A distinct lower first-molar Crown package with a different tooth and upper antagonist.", sr: "Zaseban paket krunice donjeg prvog molara sa drugim zubom i gornjim antagonistom." },
    category: "crown", restorationType: "crown", casePackageId: "r3-crown-36-v1", startingCheckpointId: "proposal_ready", difficulty: "advanced", status: "published", randomEligible: true,
    brief: { patientCode: "PT-EDU-R3-C36", indication: { en: "Fictional single mandibular posterior Crown exercise for tooth 36.", sr: "Izmišljena vežba pojedinačne mandibularne bočne krunice za zub 36." }, targetTeeth: [36], material: { en: "Ivory ceramic training preset", sr: "Trenažni preset keramike boje slonovače" }, supplied: { en: ["Prepared source tooth 36", "Neighboring teeth 34 and 35", "Synthetic opposing tooth 26", "Local synthetic gingiva/support", "Intact tooth reference"], sr: ["Preparisani izvorni zub 36", "Susedni zubi 34 i 35", "Sintetički suprotni zub 26", "Lokalna sintetička gingiva/potpora", "Referenca intaktnog zuba"] }, requirements: { en: ["Adapt the anatomical proposal to the preparation", "Review proximal and opposing relationships", "Run the available exercise checks"], sr: ["Prilagodite anatomski predlog preparaciji", "Pregledajte proksimalne i suprotne odnose", "Pokrenite dostupne provere za vežbu"] }, notes: { en: "Fictional private training order, not a patient record or patient-specific jaw relation.", sr: "Izmišljeni privatni trenažni nalog, nije zapis pacijenta niti odnos vilica konkretnog pacijenta." } },
    assets: [], materialPreset: "r3-ivory-ceramic",
  },
  {
    id: "scenario-r3-bridge-24-26", slug: "r3_bridge_24_26_case", title: { en: "Three-unit Bridge · teeth 24–26 · R3", sr: "Most od tri jedinice · zubi 24–26 · R3" },
    description: { en: "Two prepared abutments flank a tooth 25 pontic site; the connected proposal retains unit and connector semantics.", sr: "Dva preparisana nosača okružuju mesto međučlana 25; povezani predlog čuva semantiku jedinica i spojnica." },
    category: "bridge", restorationType: "bridge", casePackageId: "r3-bridge-24-26-v1", startingCheckpointId: "proposal_ready", difficulty: "advanced", status: "published", randomEligible: true,
    brief: { patientCode: "PT-EDU-R3-B246", indication: { en: "Fictional three-unit Bridge exercise replacing tooth 25.", sr: "Izmišljena vežba mosta od tri jedinice za nadoknadu zuba 25." }, targetTeeth: [24, 25, 26], material: { en: "Ivory ceramic training preset", sr: "Trenažni preset keramike boje slonovače" }, supplied: { en: ["Prepared abutments 24 and 26", "Pontic site 25", "Neighbor 27", "Synthetic antagonist 36", "Gingiva/support and anatomy references"], sr: ["Preparisani nosači 24 i 26", "Mesto međučlana 25", "Susedni zub 27", "Sintetički antagonist 36", "Gingiva/potpora i anatomske reference"] }, requirements: { en: ["Review two margins and a common insertion path", "Preserve two abutments, pontic and connector relationships", "Review pontic support, contacts, occlusion and thickness"], sr: ["Pregledajte dve margine i zajednički put insercije", "Sačuvajte odnose dva nosača, međučlana i spojnica", "Pregledajte potporu međučlana, kontakte, okluziju i debljinu"] }, notes: { en: "Connector and pontic/support geometry is synthetic and does not encode a clinical prescription.", sr: "Geometrija spojnica i međučlana/potpore je sintetička i ne predstavlja klinički propis." } },
    assets: [], materialPreset: "r3-ivory-ceramic",
  },
  {
    id: "scenario-r3-inlay-36", slug: "r3_inlay_36_case", title: { en: "Posterior Inlay · tooth 36 · R3", sr: "Bočni Inlay · zub 36 · R3" },
    description: { en: "An intracoronal tooth preparation with a central partial restoration proposal.", sr: "Intrakoronalna preparacija zuba sa predlogom centralne parcijalne nadoknade." },
    category: "inlay_onlay", restorationType: "inlay", casePackageId: "r3-inlay-36-v1", startingCheckpointId: "proposal_ready", difficulty: "beginner", status: "published", randomEligible: true,
    brief: { patientCode: "PT-EDU-R3-I36", indication: { en: "Fictional posterior intracoronal Inlay exercise for tooth 36.", sr: "Izmišljena vežba bočnog intrakoronalnog Inlay-a za zub 36." }, targetTeeth: [36], material: { en: "Warm ceramic training preset", sr: "Trenažni preset keramike toplog tona" }, supplied: { en: ["Intracoronal preparation 36", "Adjacent teeth 34 and 35", "Synthetic antagonist 26", "Gingiva/support and intact reference"], sr: ["Intrakoronalna preparacija 36", "Susedni zubi 34 i 35", "Sintetički antagonist 26", "Gingiva/potpora i intaktna referenca"] }, requirements: { en: ["Inspect the central partial-coverage extent", "Adapt the Inlay surface and proximal relationship", "Review insertion, antagonist and section"], sr: ["Pregledajte centralni obim parcijalne pokrivenosti", "Prilagodite površinu Inlay-a i proksimalni odnos", "Pregledajte inserciju, antagonistu i presek"] }, notes: { en: "The central surface patch is an educational proposal, not a verified internal fit.", sr: "Centralna površinska ljuska je edukativni predlog, a ne potvrđeno unutrašnje naleganje." } },
    assets: [], materialPreset: "r3-warm-ceramic",
  },
  {
    id: "scenario-r3-onlay-26", slug: "r3_onlay_26_case", title: { en: "Partial-cuspal Onlay · tooth 26 · R3", sr: "Onlay sa delimičnom pokrivenošću kvržica · zub 26 · R3" },
    description: { en: "A broader cuspal preparation supports an anatomical partial-coverage Onlay distinct from the Inlay case.", sr: "Šira preparacija kvržica podržava anatomski Onlay sa parcijalnom pokrivenošću, različit od slučaja Inlay-a." },
    category: "inlay_onlay", restorationType: "onlay", casePackageId: "r3-onlay-26-v1", startingCheckpointId: "proposal_ready", difficulty: "intermediate", status: "published", randomEligible: true,
    brief: { patientCode: "PT-EDU-R3-O26", indication: { en: "Fictional partial-cuspal-coverage Onlay exercise for tooth 26.", sr: "Izmišljena vežba Onlay-a sa delimičnom pokrivenošću kvržica za zub 26." }, targetTeeth: [26], material: { en: "Ivory ceramic training preset", sr: "Trenažni preset keramike boje slonovače" }, supplied: { en: ["Broad cuspal preparation 26", "Adjacent teeth 25 and 27", "Synthetic antagonist 36", "Gingiva/support and intact reference"], sr: ["Šira preparacija kvržica 26", "Susedni zubi 25 i 27", "Sintetički antagonist 36", "Gingiva/potpora i intaktna referenca"] }, requirements: { en: ["Review broader cusp coverage", "Reconstruct occlusal form with Sculpt", "Check proximal and opposing surfaces and thickness"], sr: ["Pregledajte širu pokrivenost kvržica", "Obnovite okluzalni oblik Sculpt alatom", "Proverite proksimalne i suprotne površine i debljinu"] }, notes: { en: "Coverage is a training distinction; numeric targets are for this exercise only.", sr: "Pokrivenost je razlika za vežbu; numerički ciljevi važe samo za ovu vežbu." } },
    assets: [], materialPreset: "r3-ivory-ceramic",
  },
  {
    id: "scenario-r3-veneer-21", slug: "r3_veneer_21_case", title: { en: "Anterior Veneer · tooth 21 · R3", sr: "Prednja faseta · zub 21 · R3" },
    description: { en: "A thin facial-shell proposal with adjacent tooth 22, synthetic opposing incisors and intact pre-op reference.", sr: "Predlog tanke facijalne ljuske sa susednim zubom 22, sintetičkim suprotnim sekutićima i intaktnom preoperativnom referencom." },
    category: "veneer", restorationType: "veneer", casePackageId: "r3-veneer-21-v1", startingCheckpointId: "proposal_ready", difficulty: "intermediate", status: "published", randomEligible: true,
    brief: { patientCode: "PT-EDU-R3-V21", indication: { en: "Fictional single anterior facial-shell Veneer exercise for tooth 21.", sr: "Izmišljena vežba pojedinačne prednje fasetne ljuske za zub 21." }, targetTeeth: [21], material: { en: "Translucent ivory training preset", sr: "Trenažni preset prozirne slonovače" }, supplied: { en: ["Prepared anterior tooth 21", "Adjacent tooth 22", "Synthetic opposing incisors 31–32", "Gingiva/support and intact pre-op reference"], sr: ["Preparisani prednji zub 21", "Susedni zub 22", "Sintetički suprotni sekutići 31–32", "Gingiva/potpora i intaktna preoperativna referenca"] }, requirements: { en: ["Compare the shell with its pre-op reference", "Adapt facial and incisal contours", "Review proximal relationships and exercise thickness"], sr: ["Uporedite ljusku sa preoperativnom referencom", "Prilagodite facijalne i incizalne konture", "Pregledajte proksimalne odnose i debljinu za vežbu"] }, notes: { en: "Educational veneer CAD only; this is not full smile design or a patient-specific treatment plan.", sr: "Samo edukativni CAD fasete; ovo nije potpuni dizajn osmeha niti plan terapije za konkretnog pacijenta." } },
    assets: [], materialPreset: "r3-translucent-ivory",
  },
];

export const R3_FIXED_PROSTHETICS_SCENARIOS = mapSerbianFields(rawR3FixedProstheticsScenarios, normalizeR3SerbianCopy);

export const R4_COMPLETE_DENTURE_SCENARIOS: FreeLabScenario[] = [
  {
    id: "scenario-r4-denture-balanced", slug: "r4_complete_denture_balanced",
    title: { en: "Balanced complete denture setup · R4", sr: "Raspored uravnotežene kompletne proteze · R4" },
    description: { en: "Work independently from paired synthetic edentulous arches, an exercise jaw relation, and a complete individual tooth proposal.", sr: "Samostalno radite sa uparenim sintetičkim bezubim vilicama, trenažnim odnosom vilica i potpunim predlogom pojedinačnih zuba." },
    category: "complete_denture", casePackageId: "r4-complete-denture-balanced-v1", startingCheckpointId: "full_denture_case", difficulty: "intermediate", status: "published", randomEligible: true,
    brief: {
      patientCode: "PT-EDU-R4-CD01", indication: { en: "Fictional conventional complete denture setup exercise for both arches.", sr: "Izmišljena vežba rasporeda konvencionalne kompletne proteze za obe vilice." }, targetTeeth: [11,12,13,14,15,16,17,21,22,23,24,25,26,27,31,32,33,34,35,36,37,41,42,43,44,45,46,47],
      material: { en: "Synthetic ivory denture teeth · warm pink training base", sr: "Sintetički zubi proteze boje slonovače · topla ružičasta trenažna baza" },
      supplied: { en: ["Synthetic maxillary ridge and palate", "Synthetic mandibular ridge and retromolar support", "Exercise jaw relation and plane reference", "16 separate denture-tooth training morphology assets", "Upper and lower editable base proposals"], sr: ["Sintetički maksilarni greben i nepce", "Sintetički mandibularni greben i retromolarna potpora", "Trenažni odnos vilica i referenca ravni", "16 zasebnih trenažnih morfologija zuba proteze", "Predlozi pomerljivih gornje i donje baze"] },
      requirements: { en: ["Review the arch and relation setup", "Refine anterior and posterior individual tooth positions", "Complete upper and lower borders", "Shape both base surfaces and review static contacts"], sr: ["Pregledajte raspored vilica i njihov odnos", "Doradite pojedinačni položaj prednjih i bočnih zuba", "Dovršite gornju i donju granicu", "Oblikujte obe površine baze i pregledajte statičke kontakte"] },
      notes: { en: "Synthetic fictional training case. No patient record, patient-specific jaw relation, commercial tooth system, or clinical result is represented.", sr: "Sintetički izmišljeni trenažni slučaj. Nije prikazan zapis pacijenta, odnos vilica konkretnog pacijenta, komercijalni sistem zuba niti klinički rezultat." },
    },
    assets: [], materialPreset: "r4-warm-pink-ivory-training",
  },
  {
    id: "scenario-r4-denture-resorbed", slug: "r4_complete_denture_resorbed",
    title: { en: "Resorbed ridge setup · R4", sr: "Raspored na resorbovanom grebenu · R4" },
    description: { en: "A distinct lower, narrower synthetic ridge form for studying border and base presentation around a changed support contour.", sr: "Zaseban niži i uži sintetički greben za proučavanje granice i baze oko promenjene potporne konture." },
    category: "complete_denture", casePackageId: "r4-complete-denture-resorbed-v1", startingCheckpointId: "full_denture_case", difficulty: "advanced", status: "published", randomEligible: true,
    brief: {
      patientCode: "PT-EDU-R4-CD02", indication: { en: "Fictional resorbed-ridge complete denture exercise using synthetic anatomy.", sr: "Izmišljena vežba kompletne proteze na resorbovanom grebenu sa sintetičkom anatomijom." }, targetTeeth: [11,12,13,14,15,16,17,21,22,23,24,25,26,27,31,32,33,34,35,36,37,41,42,43,44,45,46,47],
      material: { en: "Synthetic ivory denture teeth · warm pink training base", sr: "Sintetički zubi proteze boje slonovače · topla ružičasta trenažna baza" },
      supplied: { en: ["Narrow synthetic maxillary residual ridge and palatal form", "Lower synthetic mandibular residual ridge and lingual support", "Synthetic paired relation reference", "Individually editable denture-tooth forms", "Separate tissue-side and polished-side base objects"], sr: ["Uži sintetički maksilarni rezidualni greben i nepčani oblik", "Niži sintetički mandibularni rezidualni greben i lingvalna potpora", "Sintetička uparena referenca odnosa vilica", "Pojedinačno izmenjivi oblici zuba proteze", "Zasebni objekti tkivne i polirane strane baze"] },
      requirements: { en: ["Inspect the altered ridge form", "Check tooth support and arch continuity", "Trace each exercise border", "Review base adaptation concepts and static contacts"], sr: ["Pregledajte izmenjeni oblik grebena", "Proverite potporu zuba i kontinuitet luka", "Označite svaku granicu za vežbu", "Pregledajte koncepte prilagođavanja baze i statičke kontakte"] },
      notes: { en: "Fictional synthetic training case. The narrower ridge does not represent a measured patient condition. Any numeric value is a target for this exercise only.", sr: "Izmišljeni sintetički slučaj za obuku. Uži greben ne predstavlja izmereno stanje pacijenta. Svaka numerička vrednost predstavlja samo cilj ove vežbe." },
    },
    assets: [], materialPreset: "r4-warm-pink-ivory-training",
  },
  {
    id: "scenario-r4-denture-relation", slug: "r4_complete_denture_relation",
    title: { en: "Jaw relation setup challenge · R4", sr: "Izazov postavljanja odnosa vilica · R4" },
    description: { en: "A separate synthetic lower-arch offset challenges plane alignment, midline comparison, and static setup review.", sr: "Zasebno sintetičko pomeranje donje vilice izaziva poravnanje ravni, poređenje sredine i pregled statičkog rasporeda." },
    category: "complete_denture", casePackageId: "r4-complete-denture-relation-v1", startingCheckpointId: "full_denture_case", difficulty: "advanced", status: "published", randomEligible: true,
    brief: {
      patientCode: "PT-EDU-R4-CD03", indication: { en: "Fictional jaw-relation and complete denture setup exercise.", sr: "Izmišljena vežba odnosa vilica i rasporeda kompletne proteze." }, targetTeeth: [11,12,13,14,15,16,17,21,22,23,24,25,26,27,31,32,33,34,35,36,37,41,42,43,44,45,46,47],
      material: { en: "Synthetic ivory denture teeth · warm pink training base", sr: "Sintetički zubi proteze boje slonovače · topla ružičasta trenažna baza" },
      supplied: { en: ["Synthetic paired edentulous arches", "Intentionally offset lower relation reference", "Editable plane, midline and border guides", "Individual artificial tooth training set", "Separate upper and lower base proposals"], sr: ["Sintetičke uparene bezube vilice", "Namerno pomerena referenca donjeg odnosa", "Pomerljivi vodiči ravni, sredine i granica", "Pojedinačni trenažni set veštačkih zuba", "Zasebni predlozi gornje i donje baze"] },
      requirements: { en: ["Compare upper and lower midlines", "Align the exercise occlusal plane", "Review static proximal and opposing relationships", "Check that all teeth and both bases remain independently editable"], sr: ["Uporedite gornju i donju srednju liniju", "Poravnajte okluzalnu ravan za vežbu", "Pregledajte statičke proksimalne i suprotne odnose", "Proverite da svi zubi i obe baze ostanu nezavisno izmenjivi"] },
      notes: { en: "Fictional synthetic educational challenge. The offset is not a patient-specific jaw relation or treatment recommendation.", sr: "Izmišljeni sintetički edukativni izazov. Pomeranje nije odnos vilica konkretnog pacijenta niti preporuka terapije." },
    },
    assets: [], materialPreset: "r4-warm-pink-ivory-training",
  },
];

// The catalog shape follows public.scenarios and public.scenario_assets in DB.md.
// Patient codes and bundled geometry are synthetic educational content.
export const FREE_LAB_SCENARIOS: FreeLabScenario[] = [
  {
    id: "scenario-synthetic-crown-26",
    slug: "synthetic_posterior_crown_26",
    title: { en: "Posterior crown · tooth 26", sr: "Bočna krunica · zub 26" },
    description: { en: "Independent review of a supplied preparation and opposing scans.", sr: "Samostalni pregled preparacije i suprotnih skenova." },
    category: "crown",
    difficulty: "beginner",
    status: "published",
    randomEligible: true,
    brief: {
      patientCode: "PT-2041",
      patientAge: 54,
      indication: { en: "Single posterior crown", sr: "Pojedinačna bočna krunica" },
      targetTeeth: [26],
      material: { en: "Zirconia", sr: "Cirkonijum" },
      supplied: { en: ["Upper scan", "Lower scan", "Preparation"], sr: ["Sken gornje vilice", "Sken donje vilice", "Preparacija"] },
      requirements: { en: ["Inspect the preparation", "Design independently", "Review proximity and contact"], sr: ["Pregledajte preparaciju", "Samostalno oblikujte nadoknadu", "Proverite blizinu i kontakte"] },
      notes: { en: "Synthetic practice geometry. No clinical patient data is present.", sr: "Sintetička geometrija za vežbu. Nisu korišćeni klinički podaci pacijenta." },
    },
    assets: [
      { id: "synthetic-upper-arch", label: "Upper scan", role: "maxilla", required: true },
      { id: "synthetic-lower-arch", label: "Lower scan", role: "mandible", required: true },
      { id: "synthetic-preparation-26", label: "Preparation · 26", role: "prepared_tooth", required: true },
    ],
    materialPreset: "zirconia",
  },
  ...PARTIAL_DENTURE_R5_SCENARIOS,
  ...BITE_SPLINT_R6_SCENARIOS,
  ...DIGITAL_MODEL_R6_SCENARIOS,
  {
    id: "scenario-synthetic-bite-splint", slug: "synthetic_bite_splint",
    title: { en: "Bite splint · synthetic arches", sr: "Okluzalna udlaga · sintetičke vilice" },
    description: { en: "Inspect a synthetic upper arch and antagonist with the shared CAD analysis tools.", sr: "Pregledajte sintetičku gornju vilicu i antagonist koristeći zajedničke CAD alate za analizu." },
    category: "bite_splint", difficulty: "beginner", status: "archived", randomEligible: false,
    brief: { patientCode: "PT-BS-20", indication: { en: "Educational bite splint design exercise", sr: "Edukativna vežba dizajna okluzalne udlage" }, targetTeeth: [], material: { en: "Synthetic educational geometry", sr: "Sintetička edukativna geometrija" }, supplied: { en: ["Synthetic upper arch", "Synthetic lower antagonist", "Starter boundary"], sr: ["Sintetička gornja vilica", "Sintetički donji antagonist", "Početna granica"] }, requirements: { en: ["Inspect insertion direction and undercuts", "Generate and edit the splint", "Review thickness and static proximity"], sr: ["Pregledajte put insercije i podminirana područja", "Generišite i uredite udlagu", "Proverite debljinu i statičku blizinu"] }, notes: { en: "Synthetic educational case. Exercise thickness is not clinical guidance.", sr: "Sintetički edukativni slučaj. Debljina za vežbu nije klinička smernica." } },
    assets: [], materialPreset: "educational-splint",
  },
  {
    id: "scenario-synthetic-digital-model", slug: "synthetic_digital_model",
    title: { en: "Digital model · upper scan", sr: "Digitalni model · gornji sken" },
    description: { en: "Orient a working copy, trim it with the shared mesh tools and create an editable base.", sr: "Orijentišite radnu kopiju, obrežite je zajedničkim alatima za mrežu i napravite osnovu koja se može uređivati." },
    category: "digital_model", difficulty: "beginner", status: "archived", randomEligible: false,
    brief: { patientCode: "PT-DM-20", indication: { en: "Educational digital model preparation", sr: "Edukativna priprema digitalnog modela" }, targetTeeth: [], material: { en: "Synthetic educational geometry", sr: "Sintetička edukativna geometrija" }, supplied: { en: ["Immutable synthetic raw scan", "Editable working model"], sr: ["Neizmenjivi sintetički izvorni sken", "Radni model koji se može uređivati"] }, requirements: { en: ["Orient the working copy", "Trim and inspect the mesh", "Create a model base and optional attachments"], sr: ["Orijentišite radnu kopiju", "Obrežite i pregledajte mrežu", "Napravite osnovu modela i dodatke po izboru"] }, notes: { en: "Synthetic educational case. Base and attachments are simplified editable geometry.", sr: "Sintetički edukativni slučaj. Osnova i dodaci su pojednostavljena geometrija koja se može uređivati." } },
    assets: [], materialPreset: "educational-model",
  },
  ...R3_FIXED_PROSTHETICS_SCENARIOS,
  ...R4_COMPLETE_DENTURE_SCENARIOS,
  ...R7_IMPLANT_SCENARIOS,
];

export function validateFreeLabScenario(value: unknown): value is FreeLabScenario {
  if (!value || typeof value !== "object") return false;
  const scenario = value as Partial<FreeLabScenario>;
  return typeof scenario.id === "string"
    && typeof scenario.slug === "string" && /^[a-z0-9]+(?:_[a-z0-9]+)*$/.test(scenario.slug)
    && !!scenario.title && typeof scenario.title.en === "string" && typeof scenario.title.sr === "string"
    && !!scenario.description && typeof scenario.description.en === "string" && typeof scenario.description.sr === "string"
    && ["crown", "bridge", "inlay_onlay", "veneer", "complete_denture", "partial_denture", "bite_splint", "digital_model", "implant"].includes(String(scenario.category))
    && ["foundation", "beginner", "intermediate", "advanced"].includes(String(scenario.difficulty))
    && ["draft", "published", "archived"].includes(String(scenario.status))
    && typeof scenario.randomEligible === "boolean"
    && typeof scenario.brief?.patientCode === "string" && /^PT-[A-Z0-9-]+$/.test(scenario.brief.patientCode)
    && (scenario.brief.patientAge === undefined || (Number.isInteger(scenario.brief.patientAge) && scenario.brief.patientAge >= 0 && scenario.brief.patientAge <= 120))
    && !!scenario.brief.indication && typeof scenario.brief.indication.en === "string" && typeof scenario.brief.indication.sr === "string"
    && !!scenario.brief.material && typeof scenario.brief.material.en === "string" && typeof scenario.brief.material.sr === "string"
    && Array.isArray(scenario.brief?.targetTeeth) && scenario.brief.targetTeeth.every((tooth) => Number.isInteger(tooth) && tooth > 0)
    && !!scenario.brief.supplied && Array.isArray(scenario.brief.supplied.en) && Array.isArray(scenario.brief.supplied.sr)
    && !!scenario.brief.requirements && Array.isArray(scenario.brief.requirements.en) && Array.isArray(scenario.brief.requirements.sr)
    && Array.isArray(scenario.assets)
    && typeof scenario.materialPreset === "string"
    && scenario.assets.every((asset) => typeof asset.id === "string" && typeof asset.role === "string" && typeof asset.label === "string" && typeof asset.required === "boolean");
}

export function selectRandomScenario<T extends { category: FreeLabCategory; difficulty: FreeLabDifficulty; status: string; randomEligible: boolean; casePackageId?: string; casePackage?: FreeLabScenario["casePackage"]; startingCheckpointId?: string }>(
  scenarios: readonly T[], category: FreeLabCategory, difficulty: FreeLabDifficulty, random: () => number = Math.random,
): T | undefined {
  const eligible = scenarios.filter((scenario) => scenario.category === category && scenario.difficulty === difficulty && scenario.status === "published" && scenario.randomEligible && resolveScenarioPackage(scenario));
  if (!eligible.length) return undefined;
  const value = Math.min(Math.max(random(), 0), 0.999999999999);
  return eligible[Math.floor(value * eligible.length)];
}

export const FREE_LAB_CATEGORIES: { id: FreeLabCategory; label: string }[] = [
  { id: "crown", label: "Crown" }, { id: "bridge", label: "Bridge" }, { id: "inlay_onlay", label: "Inlay / Onlay / Veneer" },
  { id: "complete_denture", label: "Complete Denture" }, { id: "partial_denture", label: "Partial Denture" }, { id: "bite_splint", label: "Bite Splint" },
  { id: "digital_model", label: "Digital Model" }, { id: "implant", label: "Implant Practice" },
];
export const FREE_LAB_DIFFICULTY_LABELS: Record<FreeLabDifficulty, string> = { foundation: "Foundation", beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" };

export function scenariosFor(category?: FreeLabCategory, difficulty?: FreeLabDifficulty) {
  return FREE_LAB_SCENARIOS.filter((scenario) => scenario.status === "published" && (!category || scenario.category === category) && (!difficulty || scenario.difficulty === difficulty));
}
