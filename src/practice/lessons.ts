import { lessonSchema, type PracticeDifficulty, type PracticeLesson } from "./types";
import { COMPLETE_DENTURE_R4_LESSONS } from "./complete-denture-r4-lessons";
import { PARTIAL_DENTURE_R5_LESSONS } from "./partial-denture-r5-lessons";
import { DENTAL_REALISM_R6_LESSONS } from "./dental-realism-r6-lessons";
import { IMPLANT_R7_LESSONS } from "./implant-r7-lessons";

const developerLesson: PracticeLesson = {
  id: "developer-move-and-position",
  databaseId: "b7110000-0000-4000-8000-000000000001",
  moduleId: "cad-foundations",
  title: { en: "Move and position an object", sr: "Pomeranje i pozicioniranje objekta" },
  summary: { en: "Use the shared CAD Move tool to place a demo restoration at two exercise targets.", sr: "Koristite zajednički CAD alat Move da postavite probnu restauraciju na dva cilja vežbe." },
  goal: { en: "Practice object selection and precise movement in the CAD workspace.", sr: "Uvežbajte izbor objekta i precizno pomeranje u CAD radnom prostoru." },
  difficulty: "foundation",
  recommendedPrerequisites: [],
  estimatedMinutes: 3,
  assets: [],
  caseSetup: { source: "shared-demo-workspace", objectMappings: [
    { runtimeObjectId: "demo-prepared-tooth", semanticRole: "prepared_tooth", editable: true },
    { runtimeObjectId: "demo-crown", semanticRole: "restoration", editable: true },
    { runtimeObjectId: "demo-reference", semanticRole: "reference", editable: false },
  ] },
  steps: [
    {
      id: "position-restoration", order: 1,
      title: { en: "Move the restoration", sr: "Pomerite restauraciju" },
      instructions: { en: "Select Demo restoration and move it so its X position is 0 mm. The other axes can stay where they are.", sr: "Izaberite Demo restoration i pomerite je tako da X pozicija bude 0 mm. Ostale ose mogu ostati nepromenjene." },
      theory: { en: "Move changes an object's position while preserving its shape. The Properties panel shows the current coordinates in millimetres.", sr: "Move menja položaj objekta, a njegov oblik ostaje isti. Panel Properties prikazuje koordinate u milimetrima." },
      allowedTools: ["select", "move", "camera"], targetObjectIds: ["demo-crown"], referenceModes: ["off", "outline", "transparent", "full"], reference: { objectId: "demo-reference", position: [0, 0, 0] },
      hints: [{ id: "find-object", title: { en: "Find the object", sr: "Pronađite objekat" }, body: { en: "Choose Demo restoration in the Scene panel, then activate Move.", sr: "Izaberite Demo restoration u panelu Scene, zatim aktivirajte Move." } }, { id: "check-x", title: { en: "Check X", sr: "Proverite X" }, body: { en: "Set the X value in Properties to 0. The small step selector can help with fine movement.", sr: "U panelu Properties postavite X vrednost na 0. Mali korak pomeranja može pomoći pri preciznom pomeranju." } }],
      example: { label: { en: "Target outline", sr: "Kontura cilja" }, mode: "outline" },
      validators: [{ type: "transform_range", objectId: "demo-crown", position: [0, 0, 0], axes: ["x"], toleranceMm: 0.5 }], required: true,
    },
    {
      id: "raise-restoration", order: 2,
      title: { en: "Adjust the height", sr: "Podesite visinu" },
      instructions: { en: "Keep the restoration at X = 0 mm and set its Y position to 1 mm.", sr: "Zadržite restauraciju na X = 0 mm i postavite Y poziciju na 1 mm." },
      theory: { en: "A step target is checked when you press Design Check. You can inspect or retry the current step before continuing.", sr: "Cilj koraka proverava se kada pritisnete Design Check. Možete pregledati ili ponoviti trenutni korak pre nastavka." },
      allowedTools: ["select", "move", "camera"], targetObjectIds: ["demo-crown"], referenceModes: ["off", "outline", "transparent"], reference: { objectId: "demo-reference", position: [0, 1, 0] },
      hints: [{ id: "height", title: { en: "Use the Y field", sr: "Koristite polje Y" }, body: { en: "In Properties, set Y to 1. Keep the X coordinate at 0.", sr: "U panelu Properties postavite Y na 1. Zadržite X koordinatu na 0." } }],
      validators: [{ type: "transform_range", objectId: "demo-crown", position: [0, 1, 0], axes: ["x", "y"], toleranceMm: 0.5 }], required: true,
    },
  ],
};

export const PRACTICE_LESSONS: PracticeLesson[] = [lessonSchema.parse(developerLesson), ...COMPLETE_DENTURE_R4_LESSONS.map((lesson) => lessonSchema.parse(lesson)), ...PARTIAL_DENTURE_R5_LESSONS.map((lesson) => lessonSchema.parse(lesson)), ...DENTAL_REALISM_R6_LESSONS.map((lesson) => lessonSchema.parse(lesson)), ...IMPLANT_R7_LESSONS.map((lesson) => lessonSchema.parse(lesson))];
export const PRACTICE_LEVELS: { id: PracticeDifficulty; label: string }[] = [
  { id: "foundation", label: "Foundation" }, { id: "beginner", label: "Beginner" }, { id: "intermediate", label: "Intermediate" }, { id: "advanced", label: "Advanced" },
];
export function getPracticeLesson(id: string) { return PRACTICE_LESSONS.find((lesson) => lesson.id === id); }
