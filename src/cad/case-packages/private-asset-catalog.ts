import manifest from "./private-v1/asset-manifest.json";
import r4Manifest from "./private-v1/r4-asset-manifest.json";

export type PrivateTrainingAsset = (typeof manifest.assets)[number] | (typeof r4Manifest.assets)[number];

export const PRIVATE_FIXED_ASSET_IDS = {
  intact24: "d4000000-0000-5000-8000-000000000001",
  intact25: "d4000000-0000-5000-8000-000000000002",
  intact26: "d4000000-0000-5000-8000-000000000003",
  intact27: "d4000000-0000-5000-8000-000000000004",
  intact36: "d4000000-0000-5000-8000-000000000005",
  intact21: "d4000000-0000-5000-8000-000000000006",
  intact22: "d4000000-0000-5000-8000-000000000007",
  intact34: "d4000000-0000-5000-8000-000000000008",
  intact35: "d4000000-0000-5000-8000-000000000009",
  intact31: "d4000000-0000-5000-8000-000000000010",
  intact32: "d4000000-0000-5000-8000-000000000011",
  intact23: "d4000000-0000-5000-8000-000000000012",
  intact37: "d4000000-0000-5000-8000-000000000013",
  prepCrown26: "d4000000-0000-5000-8000-000000000101",
  prepCrown36: "d4000000-0000-5000-8000-000000000102",
  prepBridge24: "d4000000-0000-5000-8000-000000000103",
  prepInlay36: "d4000000-0000-5000-8000-000000000104",
  prepOnlay26: "d4000000-0000-5000-8000-000000000105",
  prepVeneer21: "d4000000-0000-5000-8000-000000000106",
  crown26: "d4000000-0000-5000-8000-000000000107",
  crown36: "d4000000-0000-5000-8000-000000000108",
  bridge2426: "d4000000-0000-5000-8000-000000000109",
  inlay36: "d4000000-0000-5000-8000-000000000110",
  onlay26: "d4000000-0000-5000-8000-000000000111",
  veneer21: "d4000000-0000-5000-8000-000000000112",
  prepBridge26: "d4000000-0000-5000-8000-000000000113",
  crown26Placement: "d4000000-0000-5000-8000-000000000114",
  crown26NearFinal: "d4000000-0000-5000-8000-000000000115",
  mirrored13: "d4000000-0000-5000-8000-000000001000",
  mirrored47: "d4000000-0000-5000-8000-000000001001",
} as const;

export const PRIVATE_FIXED_ASSETS = manifest.assets as PrivateTrainingAsset[];
export const PRIVATE_DENTURE_TOOTH_ASSETS = r4Manifest.assets as PrivateTrainingAsset[];
export const PRIVATE_DENTURE_TOOTH_ASSET_IDS = Object.fromEntries(r4Manifest.assets.map((asset) => [asset.r4ToothLibraryKey, asset.id])) as Record<string, string>;
const assetsById = new Map([...PRIVATE_FIXED_ASSETS, ...PRIVATE_DENTURE_TOOTH_ASSETS].map((asset) => [asset.id, asset]));

export function getPrivateTrainingAsset(assetId: string) {
  return assetsById.get(assetId);
}

export const PRIVATE_FIXED_ASSET_SCOPE = {
  scope: manifest.scope,
  sourceUnitStatus: manifest.sourceUnitStatus,
  patientAndSourceImageProvenanceStatus: manifest.patientAndSourceImageProvenanceStatus,
  expertReviewStatus: manifest.expertReviewStatus,
  publicProductionApproval: manifest.publicProductionApproval,
} as const;
