import * as THREE from "three";
import { validateMeshData, toMeshData } from "../mesh/geometry";

export type SplintGenerationInput = { boundary: readonly [number, number, number][]; thicknessMm: number; verticalOffsetMm?: number };
/** Arch-following, editable teaching shell. This is synthetic geometry, not a patient-fit or manufacturing surface. */
export function generateSplintGeometry(input: SplintGenerationInput) {
  if (input.boundary.length < 3 || input.boundary.some((point) => point.length !== 3 || point.some((value) => !Number.isFinite(value)))) throw new Error("A splint needs at least three finite boundary points.");
  if (!Number.isFinite(input.thicknessMm) || input.thicknessMm <= 0 || input.thicknessMm > 8) throw new Error("Thickness must be a positive exercise value no greater than 8 mm.");
  const shape = new THREE.Shape();
  shape.moveTo(input.boundary[0][0], input.boundary[0][1]);
  for (let segment = 0; segment < input.boundary.length; segment += 1) {
    const from = input.boundary[segment];
    const to = input.boundary[(segment + 1) % input.boundary.length];
    const divisions = Math.max(1, Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]) / 1.6));
    for (let step = 1; step <= divisions; step += 1) {
      const t = step / divisions;
      shape.lineTo(from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t);
    }
  }
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: input.thicknessMm, bevelEnabled: false, curveSegments: 8 });
  const position = geometry.getAttribute("position");
  const origin = input.verticalOffsetMm ?? 0;
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const depth = position.getZ(index);
    let cusp = 0;
    for (const [toothX, toothY] of toothCenters) {
      const distanceSquared = (x - toothX) ** 2 + (y - toothY) ** 2;
      cusp = Math.max(cusp, Math.exp(-distanceSquared / 5.2) * 0.46);
    }
    const archCurve = 0.12 * Math.cos(x * 0.42) + 0.08 * Math.sin(y * 0.36);
    position.setZ(index, origin + cusp + archCurve - depth);
  }
  position.needsUpdate = true;
  geometry.scale(1, 1, 1);
  geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  const invalid = validateMeshData(toMeshData(geometry));
  if (invalid) { geometry.dispose(); throw new Error(`Generated splint geometry is invalid: ${invalid}`); }
  return geometry;
}

const toothCenters: readonly [number, number][] = [
  [-15.5, -0.5], [-13, 4], [-10, 8], [-6.5, 11.2], [-3, 13.1], [0, 13.8],
  [3, 13.1], [6.5, 11.2], [10, 8], [13, 4], [15.5, -0.5],
];
