import type { FreeLabScenario } from "./types";

type Tooth = { x: number; y: number; rx: number; ry: number; rz: number; z: number; tilt: number };
type Triangle = [[number, number, number], [number, number, number], [number, number, number]];

function archTeeth(lower: boolean): Tooth[] {
  return Array.from({ length: 14 }, (_, index) => {
    const sideIndex = index < 7 ? index : index - 7;
    const side = index < 7 ? -1 : 1;
    const x = side * (5 + sideIndex * 3.35);
    const y = -17 + Math.abs(x) * 0.82;
    return { x, y: lower ? -y : y, rx: sideIndex > 4 ? 3.7 : 2.9, ry: sideIndex > 4 ? 3.1 : 2.3, rz: sideIndex > 4 ? 3.2 : 4, z: lower ? -2 : 2, tilt: side * sideIndex * 0.028 };
  });
}

function trianglesForTooth(tooth: Tooth, prepared = false): Triangle[] {
  const rows = 9, columns = 14;
  const points: [number, number, number][][] = [];
  for (let row = 0; row <= rows; row += 1) {
    const phi = (row / rows) * Math.PI;
    const ring: [number, number, number][] = [];
    for (let col = 0; col < columns; col += 1) {
      const theta = (col / columns) * Math.PI * 2;
      const cusp = !prepared && row > 2 && row < 6 ? 0.25 * Math.cos(theta * 4) * Math.sin(phi) ** 2 : 0;
      const rx = prepared ? tooth.rx * 0.84 : tooth.rx;
      const ry = prepared ? tooth.ry * 0.84 : tooth.ry;
      const rz = prepared ? tooth.rz * 0.74 : tooth.rz;
      const localX = rx * Math.sin(phi) * Math.cos(theta);
      const localY = ry * Math.sin(phi) * Math.sin(theta);
      const localZ = rz * Math.cos(phi) + cusp;
      ring.push([tooth.x + localX + localZ * tooth.tilt, tooth.y + localY, tooth.z + localZ] as [number, number, number]);
    }
    points.push(ring);
  }
  const triangles: Triangle[] = [];
  for (let row = 0; row < rows; row += 1) for (let col = 0; col < columns; col += 1) {
    const next = (col + 1) % columns;
    triangles.push([points[row][col], points[row + 1][col], points[row + 1][next]], [points[row][col], points[row + 1][next], points[row][next]]);
  }
  return triangles;
}

function toStl(name: string, triangles: Triangle[]) {
  const facets = triangles.map((triangle) => {
    const [[ax, ay, az], [bx, by, bz], [cx, cy, cz]] = triangle;
    const nx = (by - ay) * (cz - az) - (bz - az) * (cy - ay);
    const ny = (bz - az) * (cx - ax) - (bx - ax) * (cz - az);
    const nz = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
    const length = Math.hypot(nx, ny, nz) || 1;
    return ` facet normal ${nx / length} ${ny / length} ${nz / length}\n  outer loop\n   vertex ${ax} ${ay} ${az}\n   vertex ${bx} ${by} ${bz}\n   vertex ${cx} ${cy} ${cz}\n  endloop\n endfacet`;
  }).join("\n");
  return new File([`solid ${name}\n${facets}\nendsolid ${name}\n`], `${name}.stl`, { type: "model/stl" });
}

export function createScenarioAssetFiles(_scenario: FreeLabScenario) {
  const upper = archTeeth(false);
  const lower = archTeeth(true);
  const target = upper[5];
  return _scenario.assets.flatMap((asset) => {
    if (asset.id === "synthetic-upper-arch") return [toStl(asset.id, upper.flatMap((tooth, index) => trianglesForTooth(tooth, index === 5)))];
    if (asset.id === "synthetic-lower-arch") return [toStl(asset.id, lower.flatMap((tooth) => trianglesForTooth(tooth)))];
    if (asset.id === "synthetic-preparation-26") return [toStl(asset.id, trianglesForTooth({ ...target, z: 2 }, true))];
    return [];
  });
}
