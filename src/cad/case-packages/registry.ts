import type { CasePackageManifest } from "./contract";
import { validateCasePackage } from "./contract";
import { posteriorCrown26Package } from "./definitions/posterior-crown-26";
import { FIXED_PROSTHETICS_R3_PACKAGES } from "./definitions/fixed-prosthetics-r3";
import { COMPLETE_DENTURE_R4_PACKAGES } from "./definitions/complete-denture-r4";
import { PARTIAL_DENTURE_R5_PACKAGES } from "./definitions/partial-denture-r5";
import { DENTAL_REALISM_R6_PACKAGES } from "./definitions/dental-realism-r6";
import { IMPLANT_R7_PACKAGES } from "./definitions/implant-r7";

const builtInPackages = [posteriorCrown26Package, ...FIXED_PROSTHETICS_R3_PACKAGES, ...COMPLETE_DENTURE_R4_PACKAGES, ...PARTIAL_DENTURE_R5_PACKAGES, ...DENTAL_REALISM_R6_PACKAGES, ...IMPLANT_R7_PACKAGES] as const;
const packageById = new Map<string, CasePackageManifest>();
const packageByCaseId = new Map<string, string>();
const packageFingerprints = new Map<string, string>();

export function registerCasePackageManifest(input: unknown) {
  const manifest = validateCasePackage(input);
  const fingerprint = JSON.stringify(manifest);
  const existingManifest = packageById.get(manifest.packageId);
  if (existingManifest) {
    if (packageFingerprints.get(manifest.packageId) === fingerprint) return existingManifest;
    throw new Error(`Case Package id "${manifest.packageId}" already refers to different manifest content; publish a new versioned package id.`);
  }
  const existing = packageByCaseId.get(manifest.caseId);
  if (existing && existing !== manifest.packageId) throw new Error(`Case identity namespace "${manifest.caseId}" is used by both "${existing}" and "${manifest.packageId}".`);
  packageById.set(manifest.packageId, manifest);
  packageByCaseId.set(manifest.caseId, manifest.packageId);
  packageFingerprints.set(manifest.packageId, fingerprint);
  return manifest;
}

for (const rawPackage of builtInPackages) registerCasePackageManifest(rawPackage);

export const CASE_PACKAGES = [...packageById.values()];

export function getCasePackage(packageId: string) {
  return packageById.get(packageId);
}

export function findCasePackageForScenarioSlug(slug: string) {
  return [...packageById.values()].find((manifest) => manifest.compatibility.scenarioSlugs.includes(slug));
}

export function findCasePackageForPracticeSetup(source: string, restorationType?: string) {
  return [...packageById.values()].find((manifest) => !manifest.packageId.startsWith("r3-")
    && manifest.compatibility.practiceSources.some((candidate) => candidate.source === source && (candidate.restorationType === undefined || candidate.restorationType === restorationType)));
}
