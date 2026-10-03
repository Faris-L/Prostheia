import type { CadObjectRole } from "@/cad/types";
import type { RestorationType } from "@/cad/restorative/types";
import type { KennedyClass } from "@/cad/partial-denture/types";
import type { CasePackageManifest } from "@/cad/case-packages/contract";

export const FREE_LAB_DIFFICULTIES = ["foundation", "beginner", "intermediate", "advanced"] as const;
export type FreeLabDifficulty = (typeof FREE_LAB_DIFFICULTIES)[number];
export type FreeLabOrigin = "scenario" | "import" | "blank" | "random";
export type FreeLabCategory =
  | "crown" | "bridge" | "inlay_onlay" | "veneer" | "complete_denture"
  | "partial_denture" | "bite_splint" | "digital_model" | "implant";

export type ScenarioAssetRef = { id: string; label: string; role: CadObjectRole; required: boolean; bucket?: string; path?: string; unit?: "mm" | "cm" | "m" | "unknown" };
export type FreeLabCaseBrief = {
  patientCode: string;
  patientAge?: number;
  indication: { en: string; sr: string };
  targetTeeth: number[];
  material: { en: string; sr: string };
  supplied: { en: string[]; sr: string[] };
  requirements: { en: string[]; sr: string[] };
  notes?: { en: string; sr: string };
};
export type FreeLabScenario = {
  id: string;
  slug: string;
  title: { en: string; sr: string };
  description: { en: string; sr: string };
  category: FreeLabCategory;
  restorationType?: RestorationType;
  partialDentureClass?: KennedyClass;
  caseInitializer?: "articulator" | "implant";
  casePackageId?: string;
  casePackage?: CasePackageManifest;
  startingCheckpointId?: string;
  difficulty: FreeLabDifficulty;
  status: "draft" | "published" | "archived";
  randomEligible: boolean;
  brief: FreeLabCaseBrief;
  assets: ScenarioAssetRef[];
  materialPreset: string;
};

export type FreeLabWorkspaceConfig = {
  workspaceId: string;
  origin: FreeLabOrigin;
  scenarioId?: string;
  scenarioAssets?: ScenarioAssetRef[];
  title: string;
  category?: FreeLabCategory;
  restorationType?: RestorationType;
  partialDentureClass?: KennedyClass;
  difficulty?: FreeLabDifficulty;
  createdAt: string;
  caseBrief?: FreeLabCaseBrief;
  materialPreset?: string;
  caseInitializer?: "articulator" | "implant";
  casePackageId?: string;
  casePackage?: CasePackageManifest;
  checkpointId?: string;
  preview?: boolean;
};
