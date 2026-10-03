import type { FreeLabScenario } from "./types";
import { mapSerbianFields, normalizeImplantSerbianCopy } from "@/lib/dental-language";

const rawR7ImplantScenarios: FreeLabScenario[] = [
  {
    id: "scenario-synthetic-implant-practice",
    slug: "synthetic_implant_training_case",
    title: { en: "Posterior implant crown · restorative CAD · R7", sr: "Bočna krunica na implantatu · restaurativni CAD · R7" },
    description: { en: "A package-backed lower first-molar case for scan-body recognition, emergence, abutment, crown, contacts, and screw access.", sr: "Slučaj donjeg prvog molara iz paketa za prepoznavanje scan body-ja, nicanje, abatment, krunicu, kontakte i pristup zavrtnju." },
    category: "implant",
    casePackageId: "r7-implant-posterior-v1",
    startingCheckpointId: "inspect",
    difficulty: "intermediate",
    status: "published",
    randomEligible: true,
    brief: {
      patientCode: "PT-EDU-R7-IR01",
      indication: { en: "Fictional lower left first-molar single implant restorative CAD exercise · FDI 36.", sr: "Izmišljena restaurativna CAD vežba pojedinačne krunice na implantatu za donji levi prvi molar · FDI 36." },
      targetTeeth: [36],
      material: { en: "Synthetic training crown and interface display presets", sr: "Sintetički prikazni materijali krunice i interfejsa za obuku" },
      supplied: {
        en: ["Indexed synthetic scan body and pre-defined implant reference", "Synthetic 35–37 local arch segment with gingiva and ridge support", "Synthetic opposing tooth 26", "Dundee anatomical crown proposal", "Fictional synthetic implant-system metadata"],
        sr: ["Indeksirani sintetički scan body i unapred određena referenca implantata", "Sintetički lokalni segment luka 35–37 sa gingivom i potporom grebena", "Sintetički suprotni zub 26", "Anatomski predlog krunice Dundee", "Izmišljeni metapodaci sintetičkog sistema implantata"],
      },
      requirements: {
        en: ["Resolve the scan-body orientation to the fixed restorative axis", "Refine emergence and inspect the separate abutment concept", "Adapt the anatomical crown and review proximal contacts", "Compare the crown with the antagonist and inspect screw access", "Run final educational Design Check"],
        sr: ["Odredite orijentaciju scan body-ja prema fiksnoj restaurativnoj osi", "Doradite nicanje i pregledajte zaseban koncept abatmenta", "Prilagodite anatomsku krunicu i pregledajte proksimalne kontakte", "Uporedite krunicu sa antagonistom i pregledajte pristup zavrtnju", "Pokrenite završnu edukativnu Design Check proveru"],
      },
      notes: { en: "Fictional synthetic restorative CAD case only. Implant position is pre-defined. No surgery, patient data, commercial system compatibility, biological validation, or clinical approval is represented.", sr: "Samo izmišljeni sintetički slučaj restaurativnog CAD-a. Položaj implantata je unapred određen. Nisu prikazani hirurgija, podaci pacijenta, kompatibilnost sa komercijalnim sistemom, biološka validacija ni kliničko odobrenje." },
    },
    assets: [],
    materialPreset: "r7-synthetic-implant-restorative",
  },
  {
    id: "scenario-r7-implant-axis-contact",
    slug: "r7_implant_axis_contact_challenge",
    title: { en: "Implant crown · axis and contact challenge · R7", sr: "Krunica na implantatu · izazov ose i kontakata · R7" },
    description: { en: "A package-backed upper first-molar case with an angled fixed axis, rotated scan-body index, asymmetric emergence, and a tighter distal contact review.", sr: "Slučaj gornjeg prvog molara iz paketa sa zakošenom fiksnom osom, zarotiranim indeksom scan body-ja, asimetričnim nicanjem i zahtevnijim distalnim kontaktom." },
    category: "implant",
    casePackageId: "r7-implant-axis-contact-v1",
    startingCheckpointId: "inspect",
    difficulty: "advanced",
    status: "published",
    randomEligible: true,
    brief: {
      patientCode: "PT-EDU-R7-IR02",
      indication: { en: "Fictional upper left first-molar restorative CAD challenge · FDI 26.", sr: "Izmišljeni restaurativni CAD izazov gornjeg levog prvog molara · FDI 26." },
      targetTeeth: [26],
      material: { en: "Synthetic training crown and interface display presets", sr: "Sintetički prikazni materijali krunice i interfejsa za obuku" },
      supplied: {
        en: ["Indexed scan body type B and fixed synthetic reference axis (Target for this exercise: 14°)", "Synthetic 25–27 local arch segment with shifted ridge contour", "Synthetic opposing tooth 36", "Dundee anatomical crown proposal", "Fictional synthetic implant-system metadata"],
        sr: ["Indeksirani scan body tipa B i fiksna sintetička osa implantata (Cilj za ovu vežbu: 14°)", "Sintetički lokalni segment luka 25–27 sa pomerenom konturom grebena", "Sintetički suprotni zub 36", "Anatomski predlog krunice Dundee", "Izmišljeni metapodaci sintetičkog sistema implantata"],
      },
      requirements: {
        en: ["Read the rotated scan-body index and fixed restorative axis", "Inspect asymmetric emergence and abutment support", "Adapt the crown anatomy to its neighbors", "Review the distal contact and synthetic antagonist", "Inspect screw access against the supplied axis and run final Design Check"],
        sr: ["Pročitajte zarotirani indeks scan body-ja i fiksnu restaurativnu osu", "Pregledajte asimetrično nicanje i potporu abatmenta", "Prilagodite anatomiju krunice susednim zubima", "Pregledajte distalni kontakt i sintetičkog antagonistu", "Uporedite pristup zavrtnju sa datom osom i pokrenite završnu Design Check proveru"],
      },
      notes: { en: "Synthetic educational challenge only. The fixed angle and all numeric values are targets for this exercise; they are not a placement recommendation, patient-specific anatomy, biological validation, or clinical result.", sr: "Samo sintetički edukativni izazov. Fiksni ugao i sve brojčane vrednosti su ciljevi ove vežbe; nisu preporuka pozicioniranja, anatomija konkretnog pacijenta, biološka validacija niti klinički rezultat." },
    },
    assets: [],
    materialPreset: "r7-synthetic-implant-axis-contact",
  },
];

export const R7_IMPLANT_SCENARIOS = mapSerbianFields(rawR7ImplantScenarios, normalizeImplantSerbianCopy);

export const SYNTHETIC_IMPLANT_SCENARIO = R7_IMPLANT_SCENARIOS[0];
