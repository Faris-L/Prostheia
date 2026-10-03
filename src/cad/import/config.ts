export const MODEL_IMPORT_LIMITS = {
  maxFileBytes: 128 * 1024 * 1024,
  maxVertices: 15_000_000,
  maxTriangles: 5_000_000,
  denseMeshWarningTriangles: 2_500_000,
  maxDimensionMm: 10_000,
  suspiciousTinyDimensionMm: 0.1,
  suspiciousLargeDimensionMm: 500,
} as const;

export const UNIT_TO_MILLIMETERS = { mm: 1, cm: 10, m: 1000, unknown: 1 } as const;
