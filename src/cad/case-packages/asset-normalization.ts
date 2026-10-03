import * as THREE from "three";

import type { CaseAssetMetadata } from "./contract";
import type { ResolvedCaseAsset } from "./asset-registry";

const IDENTITY = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

/** A database matrix maps raw source coordinates directly into Prostheia millimeters. */
export function validateOriginalToCanonical(matrix: unknown): number[] {
  if (!Array.isArray(matrix) || matrix.length !== 16 || !matrix.every((value) => typeof value === "number" && Number.isFinite(value))) {
    throw new TypeError("original_to_canonical must contain exactly 16 finite matrix values.");
  }
  const elements = matrix as number[];
  const affineTolerance = 1e-10;
  if (Math.abs(elements[3]) > affineTolerance || Math.abs(elements[7]) > affineTolerance || Math.abs(elements[11]) > affineTolerance || Math.abs(elements[15] - 1) > affineTolerance) {
    throw new TypeError("original_to_canonical must be an affine 4×4 transform.");
  }

  const transform = new THREE.Matrix4().fromArray(elements);
  const determinant = transform.determinant();
  const xScale = Math.hypot(elements[0], elements[1], elements[2]);
  const yScale = Math.hypot(elements[4], elements[5], elements[6]);
  const zScale = Math.hypot(elements[8], elements[9], elements[10]);
  const scaleProduct = xScale * yScale * zScale;
  if (!Number.isFinite(determinant) || !Number.isFinite(scaleProduct) || scaleProduct === 0 || Math.abs(determinant) <= scaleProduct * 1e-10) {
    throw new RangeError("original_to_canonical must be invertible and cannot collapse an axis.");
  }
  if (determinant < 0) throw new RangeError("original_to_canonical cannot contain a reflection because reflections reverse mesh winding.");
  return [...elements];
}

/**
 * Normalize one resolved source-space asset once, before the Case Package clones it
 * for multiple objects. The raw file and source geometry are retained unchanged.
 */
export function normalizeResolvedCaseAsset(asset: ResolvedCaseAsset) {
  if (asset.normalizationState === "canonical") return;
  const transform = validateOriginalToCanonical(asset.originalToCanonical ?? IDENTITY);
  const root = new THREE.Group();
  const normalization = new THREE.Group();
  normalization.matrixAutoUpdate = false;
  normalization.matrix.fromArray(transform);
  normalization.userData.prostheiaTransformKind = "original_to_canonical";
  normalization.userData.prostheiaOriginalToCanonicalApplied = true;
  normalization.add(asset.object);
  root.add(normalization);
  root.userData.prostheiaCoordinateSpace = "canonical";
  root.userData.prostheiaOriginalToCanonical = transform;

  // Assign the wrapper before measuring so a later failure can dispose the whole staged tree.
  asset.object = root;
  asset.normalizationState = "canonical";
  root.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(root);
  if (bounds.isEmpty()) throw new Error("The normalized Case Package asset has no measurable mesh bounds.");
  const min = bounds.min.toArray() as [number, number, number];
  const max = bounds.max.toArray() as [number, number, number];
  const dimensions = bounds.getSize(new THREE.Vector3()).toArray() as [number, number, number];
  if (![...min, ...max, ...dimensions].every(Number.isFinite) || Math.max(...dimensions) > 10_000) {
    throw new RangeError("original_to_canonical produced non-finite or unsupported canonical bounds.");
  }

  const statistics = geometryStatistics(root);
  if (!statistics.vertexCount || !statistics.triangleCount) throw new Error("The normalized Case Package asset has no triangle mesh geometry.");
  if (asset.metadata) {
    asset.metadata = {
      ...asset.metadata,
      bounds: { min, max, unit: "mm" },
      statistics,
      technicalMetadata: {
        ...asset.metadata.technicalMetadata,
        normalization: {
          originalToCanonical: transform,
          matrixIncludesUnitConversion: true,
          appliedOnceBy: "Case Package loader",
        },
      },
    } satisfies CaseAssetMetadata;
  }
  if (asset.importSource) {
    asset.importSource = {
      ...asset.importSource,
      ...(asset.metadata?.sourceUnit ? { sourceUnit: asset.metadata.sourceUnit } : {}),
      ...(asset.metadata?.unitScaleToMm ? { unitScale: asset.metadata.unitScaleToMm } : {}),
      originalToCanonical: transform,
      boundingDimensionsMm: dimensions,
    };
  }
}

export function originalToCanonicalFromRegistry(value: unknown, sourceUnit: CaseAssetMetadata["sourceUnit"]): number[] {
  if (value === null || value === undefined) {
    const unitScale = sourceUnit === "mm" ? 1 : sourceUnit === "cm" ? 10 : sourceUnit === "m" ? 1000 : null;
    if (unitScale === null) throw new Error("An asset needs known source units before a canonical millimeter transform can be constructed.");
    return validateOriginalToCanonical([
      unitScale, 0, 0, 0,
      0, unitScale, 0, 0,
      0, 0, unitScale, 0,
      0, 0, 0, 1,
    ]);
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new TypeError("model_assets.original_to_canonical must be a { matrix: number[16] } object.");
  const matrix = (value as { matrix?: unknown }).matrix;
  return validateOriginalToCanonical(matrix);
}

function geometryStatistics(root: THREE.Object3D) {
  let vertexCount = 0;
  let triangleCount = 0;
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || child.userData.prostheiaSelectionOverlay) return;
    const position = child.geometry.getAttribute("position");
    if (!position) return;
    vertexCount += position.count;
    triangleCount += child.geometry.index ? Math.floor(child.geometry.index.count / 3) : Math.floor(position.count / 3);
  });
  return { vertexCount, triangleCount };
}
