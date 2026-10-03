import { validateCasePackage, type CasePackageManifest } from "@/cad/case-packages/contract";
import { getCasePackage } from "@/cad/case-packages/registry";
import type { FreeLabScenario } from "./types";

export type ResolvedScenarioPackage = {
  manifest: CasePackageManifest;
  checkpointId: string;
};

export function resolveScenarioPackage(scenario: Pick<FreeLabScenario, "casePackageId" | "casePackage" | "startingCheckpointId">): ResolvedScenarioPackage | undefined {
  const candidate = scenario.casePackage ?? (scenario.casePackageId ? getCasePackage(scenario.casePackageId) : undefined);
  if (!candidate) return undefined;

  try {
    const manifest = validateCasePackage(candidate);
    if (scenario.casePackageId && manifest.packageId !== scenario.casePackageId) return undefined;
    const checkpointId = scenario.startingCheckpointId ?? manifest.startingCheckpointId;
    if (!manifest.checkpoints.some((checkpoint) => checkpoint.id === checkpointId)) return undefined;
    return { manifest, checkpointId };
  } catch {
    return undefined;
  }
}
