import * as THREE from "three";

import { createR4EdentulousArch, completeDentureToothPosition } from "@/cad/denture/r4-geometry";
import type { KennedyClass, PartialComponentKind } from "./types";

export type RpdArch = "upper" | "lower";
export type RpdConnectorForm = "lingual_bar" | "palatal_strap" | "horseshoe";
export type RpdRestSurface = "occlusal" | "cingulum";
export type RpdPoint = [number, number, number];

export type RpdCasePlan = {
  kennedyClass: KennedyClass;
  arch: RpdArch;
  missingTeeth: number[];
  abutments: number[];
  connectorForm: RpdConnectorForm;
  saddleRegions: number[][];
  description: string;
};

export const RPD_CASE_PLANS: Record<KennedyClass, RpdCasePlan> = {
  I: { kennedyClass: "I", arch: "lower", missingTeeth: [36, 37, 46, 47], abutments: [35, 45], connectorForm: "lingual_bar", saddleRegions: [[36, 37], [46, 47]], description: "Bilateral mandibular distal-extension saddles behind the last remaining premolars." },
  II: { kennedyClass: "II", arch: "lower", missingTeeth: [46, 47], abutments: [35, 45], connectorForm: "lingual_bar", saddleRegions: [[46, 47]], description: "One right mandibular distal-extension saddle, with a continuous contralateral tooth segment." },
  III: { kennedyClass: "III", arch: "upper", missingTeeth: [24, 25], abutments: [23, 26], connectorForm: "palatal_strap", saddleRegions: [[24, 25]], description: "A bounded left maxillary posterior space between teeth 23 and 26." },
  IV: { kennedyClass: "IV", arch: "upper", missingTeeth: [11, 12, 21, 22], abutments: [13, 23], connectorForm: "horseshoe", saddleRegions: [[11, 12, 21, 22]], description: "An anterior maxillary space crossing the midline, bounded by the canines." },
};

const identity = new THREE.Matrix4();

export function rpdToothPosition(fdi: number, arch: RpdArch): { position: RpdPoint; rotation: RpdPoint } {
  const placed = completeDentureToothPosition(fdi, arch, "balanced");
  return { position: [...placed.position] as RpdPoint, rotation: [...placed.rotation] as RpdPoint };
}

export function rpdArchTeeth(arch: RpdArch) {
  const quadrants = arch === "upper" ? [1, 2] : [3, 4];
  return quadrants.flatMap((quadrant) => Array.from({ length: 7 }, (_, index) => quadrant * 10 + index + 1));
}

function material(color: string, metalness = 0, roughness = 0.52, opacity = 1) {
  return new THREE.MeshStandardMaterial({ color, metalness, roughness, transparent: opacity < 1, opacity, side: THREE.DoubleSide, depthWrite: opacity >= 1 });
}

function tube(points: RpdPoint[], radius: number, tubularSegments = 40) {
  const path = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)), false, "centripetal", 0.35);
  return new THREE.TubeGeometry(path, Math.max(tubularSegments, points.length * 8), radius, 8, false);
}

function ribbon(points: RpdPoint[], width: number, zOffset = 0) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)), false, "centripetal", 0.35);
  const samples = Math.max(48, points.length * 10);
  const vertices: number[] = [];
  const indices: number[] = [];
  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples;
    const center = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();
    const side = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
    const ease = Math.min(1, (t * 12) + 0.04, ((1 - t) * 12) + 0.04);
    const half = width * Math.max(0.68, ease) / 2;
    vertices.push(center.x + side.x * half, center.y + side.y * half, center.z + zOffset);
    vertices.push(center.x - side.x * half, center.y - side.y * half, center.z + zOffset);
    if (index < samples) {
      const a = index * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}

function archConnectorPath(arch: RpdArch, form: RpdConnectorForm): RpdPoint[] {
  if (form === "palatal_strap") return [[-22, 4.5, -0.8], [-17, 7.8, -0.8], [-9, 9.6, -0.8], [0, 10.2, -0.8], [9, 9.6, -0.8], [17, 7.8, -0.8], [22, 4.5, -0.8]];
  if (form === "horseshoe") return [[-22, 7.8, -0.8], [-18.4, -2, -0.8], [-12, -14.7, -0.8], [-5.8, -22.1, -0.8], [0, -24.2, -0.8], [5.8, -22.1, -0.8], [12, -14.7, -0.8], [18.4, -2, -0.8], [22, 7.8, -0.8]];
  const vertical = arch === "lower" ? -4.6 : -3.8;
  return [[-22, 8, vertical], [-19, 1, vertical], [-14, -8, vertical], [-8, -15, vertical], [0, -18, vertical], [8, -15, vertical], [14, -8, vertical], [19, 1, vertical], [22, 8, vertical]];
}

function buccalDirection(fdi: number): THREE.Vector2 {
  const position = fdi % 10;
  if (position <= 3) return new THREE.Vector2(0, -1);
  const quadrant = Math.floor(fdi / 10);
  return new THREE.Vector2(quadrant % 2 === 1 ? -1 : 1, 0);
}

function restPoint(fdi: number, surface: RpdRestSurface, missing: number[]): RpdPoint {
  const { position } = rpdToothPosition(fdi, fdi < 30 ? "upper" : "lower");
  const direction = buccalDirection(fdi);
  const x = position[0];
  const y = position[1];
  const isNearGap = missing.some((tooth) => Math.abs(tooth - fdi) === 1 || Math.abs(tooth - fdi) === 2);
  const gapSide = fdi % 10 >= 4 ? 1 : -1;
  if (surface === "cingulum") return [x - direction.x * 0.35, y - direction.y * 0.35 + 0.9, 0.2];
  return [x + (isNearGap ? direction.x * -0.25 : 0), y + (isNearGap ? gapSide * 1.0 : 0), 1.35];
}

export function rpdComponentPath(args: {
  kind: PartialComponentKind;
  arch: RpdArch;
  classPlan: RpdCasePlan;
  toothNumber?: number;
  restSurface?: RpdRestSurface;
  regionTeeth?: number[];
}): RpdPoint[] {
  const { kind, arch, classPlan, toothNumber, restSurface = "occlusal", regionTeeth = [] } = args;
  if (kind === "major_connector" || kind === "lingual_bar") return archConnectorPath(arch, classPlan.connectorForm);
  if (kind === "rest" && toothNumber) return [restPoint(toothNumber, restSurface, classPlan.missingTeeth)];
  if ((kind === "clasp" || kind === "guide_plane" || kind === "blockout") && toothNumber) {
    const { position } = rpdToothPosition(toothNumber, arch);
    const outward = buccalDirection(toothNumber);
    const angle = Math.atan2(outward.y, outward.x);
    if (kind === "blockout") return [
      [position[0] + outward.x * 1.55, position[1] + outward.y * 1.55, 0.05],
      [position[0] + outward.x * 1.8, position[1] + outward.y * 1.8, -1.1],
      [position[0] + outward.x * 1.4, position[1] + outward.y * 1.4, -2.2],
    ];
    if (kind === "guide_plane") return [
      [position[0] - Math.sin(angle) * 1.5, position[1] + Math.cos(angle) * 1.5, 1.4],
      [position[0] + Math.sin(angle) * 1.5, position[1] - Math.cos(angle) * 1.5, 1.4],
    ];
    return [
      [position[0] - outward.x * 1.4, position[1] - outward.y * 1.4, 1.45],
      [position[0] - outward.x * 1.9, position[1] - outward.y * 1.9, 1.0],
      [position[0] - outward.x * 2.05, position[1] - outward.y * 2.05, -0.1],
      [position[0] - outward.x * 1.35, position[1] - outward.y * 1.35, -1.2],
      [position[0] - outward.x * 0.72, position[1] - outward.y * 0.72, -0.9],
    ];
  }
  if (kind === "minor_connector" && toothNumber) {
    const rest = restPoint(toothNumber, restSurface, classPlan.missingTeeth);
    const base = archConnectorPath(arch, classPlan.connectorForm);
    const frame = rpdToothPosition(toothNumber, arch).position;
    const nearest = base.reduce((best, point) => Math.hypot(point[0] - frame[0], point[1] - frame[1]) < Math.hypot(best[0] - frame[0], best[1] - frame[1]) ? point : best, base[0]);
    return [rest, [rest[0] * 0.75 + nearest[0] * 0.25, rest[1] * 0.75 + nearest[1] * 0.25, 0.15], [rest[0] * 0.42 + nearest[0] * 0.58, rest[1] * 0.42 + nearest[1] * 0.58, 0], nearest];
  }
  if (kind === "finish_line" || kind === "retention_mesh" || kind === "saddle") {
    const centers = regionTeeth.map((tooth) => rpdToothPosition(tooth, arch).position);
    if (!centers.length) return [[-4, -4, 0], [4, -4, 0], [4, 4, 0], [-4, 4, 0]];
    const center = centers.reduce((sum, point) => [sum[0] + point[0] / centers.length, sum[1] + point[1] / centers.length, sum[2] + point[2] / centers.length] as RpdPoint, [0, 0, 0] as RpdPoint);
    const minX = Math.min(...centers.map((point) => point[0])); const maxX = Math.max(...centers.map((point) => point[0]));
    const minY = Math.min(...centers.map((point) => point[1])); const maxY = Math.max(...centers.map((point) => point[1]));
    const width = Math.max(4.6, (maxX - minX) / 2 + 2.8); const height = Math.max(4.6, (maxY - minY) / 2 + 3.2);
    const z = kind === "finish_line" ? 1.0 : kind === "retention_mesh" ? 0.55 : 0.25;
    return [[center[0] - width, center[1], z], [center[0] - width * 0.72, center[1] - height * 0.62, z], [center[0], center[1] - height, z], [center[0] + width * 0.72, center[1] - height * 0.62, z], [center[0] + width, center[1], z], [center[0] + width * 0.72, center[1] + height * 0.62, z], [center[0], center[1] + height, z], [center[0] - width * 0.72, center[1] + height * 0.62, z]];
  }
  if (kind === "relief") {
    const { position } = rpdToothPosition(toothNumber ?? classPlan.abutments[0], arch);
    return [[position[0], position[1], -1.6]];
  }
  return [[-7, 0, -1], [0, 2, -1], [7, 0, -1]];
}

function ellipsePatch(points: RpdPoint[], zLift: number, color: string, opacity: number) {
  const x0 = Math.min(...points.map((point) => point[0])); const x1 = Math.max(...points.map((point) => point[0]));
  const y0 = Math.min(...points.map((point) => point[1])); const y1 = Math.max(...points.map((point) => point[1]));
  const cx = (x0 + x1) / 2; const cy = (y0 + y1) / 2;
  const rx = Math.max(1.3, (x1 - x0) / 2); const ry = Math.max(1.3, (y1 - y0) / 2);
  const shape = new THREE.Shape();
  for (let i = 0; i <= 32; i += 1) {
    const angle = i / 32 * Math.PI * 2;
    const x = cx + Math.cos(angle) * rx; const y = cy + Math.sin(angle) * ry;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape, 24);
  const position = geometry.getAttribute("position");
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i); const y = position.getY(i);
    const dome = Math.max(0, 1 - (((x - cx) / rx) ** 2) - (((y - cy) / ry) ** 2));
    position.setZ(i, zLift + 0.42 * dome);
  }
  geometry.computeVertexNormals(); geometry.computeBoundingBox();
  return new THREE.Mesh(geometry, material(color, 0, 0.72, opacity));
}

function saddleSurface(points: RpdPoint[]) {
  const patch = ellipsePatch(points, 0.32, "#d08a83", 0.88);
  patch.name = "Edentulous saddle · tissue-adjacent resin concept";
  patch.userData.prostheiaMeshId = "partial-saddle-surface";
  return patch;
}

function retentionGrid(points: RpdPoint[]) {
  const x0 = Math.min(...points.map((point) => point[0])); const x1 = Math.max(...points.map((point) => point[0]));
  const y0 = Math.min(...points.map((point) => point[1])); const y1 = Math.max(...points.map((point) => point[1]));
  const cx = (x0 + x1) / 2; const cy = (y0 + y1) / 2; const rx = Math.max(2, (x1 - x0) / 2); const ry = Math.max(2, (y1 - y0) / 2);
  const objects: THREE.BufferGeometry[] = [];
  const span = Math.max(rx, ry) * 2;
  for (let i = -3; i <= 3; i += 1) {
    const offset = i * span / 7;
    for (const sign of [-1, 1]) {
      const p0: RpdPoint = [cx - rx * 0.76, cy + offset, 0.58];
      const p1: RpdPoint = [cx + rx * 0.76, cy + offset + sign * 1.3, 0.58];
      objects.push(tube([p0, p1], 0.09, 16));
    }
  }
  const merged = BufferGeometryMerge(objects);
  for (const geometry of objects) geometry.dispose();
  const mesh = new THREE.Mesh(merged, material("#b7c1cb", 0.66, 0.35));
  mesh.name = "Saddle retention lattice · framework mesh concept";
  mesh.userData.prostheiaMeshId = "partial-retention-lattice";
  return mesh;
}

function BufferGeometryMerge(geometries: THREE.BufferGeometry[]) {
  const position: number[] = []; const normal: number[] = []; const indices: number[] = [];
  let offset = 0;
  for (const geometry of geometries) {
    const p = geometry.getAttribute("position"); const n = geometry.getAttribute("normal");
    for (let index = 0; index < p.count; index += 1) {
      position.push(p.getX(index), p.getY(index), p.getZ(index));
      normal.push(n.getX(index), n.getY(index), n.getZ(index));
    }
    const sourceIndex = geometry.index;
    if (sourceIndex) for (let index = 0; index < sourceIndex.count; index += 1) indices.push(sourceIndex.getX(index) + offset);
    else for (let index = 0; index < p.count; index += 1) indices.push(index + offset);
    offset += p.count;
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.Float32BufferAttribute(position, 3));
  merged.setAttribute("normal", new THREE.Float32BufferAttribute(normal, 3));
  merged.setIndex(indices); merged.computeBoundingBox(); merged.computeBoundingSphere();
  return merged;
}

export function createR5ResidualArch(arch: RpdArch) {
  // Natural RPD teeth stay at their source cervical plane. Keep synthetic
  // gingiva entirely on the root side so its closed ridge volume cannot cover
  // the visible crowns.
  const group = createR4EdentulousArch(arch, "balanced", { cervicalPlaneZ: 0 });
  group.name = `${arch === "upper" ? "Synthetic maxilla" : "Synthetic mandible"} · gingiva and residual ridge · RPD case`;
  group.userData.rpdArch = arch;
  return group;
}

export function createR5SurveyGuide(arch: RpdArch, toothNumber: number) {
  const { position } = rpdToothPosition(toothNumber, arch);
  const points: RpdPoint[] = Array.from({ length: 17 }, (_, index) => {
    const angle = index / 16 * Math.PI * 2;
    return [position[0] + Math.cos(angle) * 1.9, position[1] + Math.sin(angle) * 2.15, position[2] + 1.12];
  });
  const mesh = new THREE.Mesh(tube(points, 0.11, 48), material("#f0b65f", 0.12, 0.4));
  mesh.name = `Survey contour guide · tooth ${toothNumber} · exercise display`;
  mesh.userData.prostheiaMeshId = `survey-contour-${toothNumber}`;
  const group = new THREE.Group(); group.add(mesh); group.name = mesh.name;
  return group;
}

export function createR5InsertionGuide() {
  const start = new THREE.Vector3(31, -22, -8);
  const direction = new THREE.Vector3(0, 0, 1);
  const arrow = new THREE.ArrowHelper(direction, start, 13, "#dc9b4b", 2.1, 1.1);
  arrow.name = "Insertion direction · selected path for this exercise";
  arrow.line.userData.prostheiaMeshId = "insertion-axis-line";
  arrow.cone.userData.prostheiaMeshId = "insertion-axis-head";
  const group = new THREE.Group(); group.name = "Insertion direction guide · exercise"; group.add(arrow);
  return group;
}

export function createR5PartialComponent(args: {
  kind: PartialComponentKind;
  arch: RpdArch;
  points: RpdPoint[];
  connectorForm?: RpdConnectorForm;
  restSurface?: RpdRestSurface;
  toothNumber?: number;
}): THREE.Group {
  const { kind, arch, points, connectorForm = "lingual_bar", restSurface = "occlusal", toothNumber } = args;
  const group = new THREE.Group();
  group.name = `RPD ${kind.replaceAll("_", " ")} · ${arch} · educational design`;
  const add = (geometry: THREE.BufferGeometry, mat: THREE.Material, name: string, meshId: string) => {
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.name = name; mesh.userData.prostheiaMeshId = meshId; mesh.castShadow = true; mesh.receiveShadow = true;
    group.add(mesh);
  };
  if (kind === "major_connector" || kind === "lingual_bar") {
    if (connectorForm === "lingual_bar") add(tube(points, 0.88, 72), material("#b4bec9", 0.74, 0.29), "Lingual bar · swept metal major connector", "major-connector-lingual-bar");
    else add(ribbon(points, connectorForm === "horseshoe" ? 5.6 : 7.2, 0), material("#b4bec9", 0.72, 0.3), connectorForm === "horseshoe" ? "Horseshoe palatal major connector · exercise form" : "Palatal strap · exercise major connector", "major-connector-palatal-plate");
  } else if (kind === "rest") {
    const point = points[0] ?? [0, 0, 0];
    const geometry = new THREE.SphereGeometry(1, 18, 12);
    geometry.scale(restSurface === "cingulum" ? 1.02 : 1.42, restSurface === "cingulum" ? 0.72 : 1.08, 0.45);
    const mesh = new THREE.Mesh(geometry, material("#c0cad2", 0.78, 0.26));
    mesh.position.set(...point); mesh.name = `${restSurface === "cingulum" ? "Cingulum" : "Occlusal"} rest concept · tooth ${toothNumber ?? "—"}`;
    mesh.userData.prostheiaMeshId = "rpd-rest-seat"; mesh.castShadow = true; group.add(mesh);
  } else if (kind === "clasp" || kind === "minor_connector" || kind === "guide_plane" || kind === "finish_line") {
    const color = kind === "finish_line" || kind === "guide_plane" ? "#d9a24e" : "#b5c0ca";
    const radius = kind === "clasp" ? 0.28 : kind === "finish_line" ? 0.16 : kind === "guide_plane" ? 0.24 : 0.48;
    add(tube(points, radius, kind === "clasp" ? 64 : 44), material(color, kind === "finish_line" || kind === "guide_plane" ? 0.16 : 0.74, 0.34), `${kind.replaceAll("_", " ")} · linked framework path`, `rpd-${kind}-path`);
  } else if (kind === "saddle") {
    group.add(saddleSurface(points));
  } else if (kind === "retention_mesh") {
    group.add(retentionGrid(points));
  } else if (kind === "blockout") {
    const point = points[1] ?? points[0] ?? [0, 0, 0];
    const geometry = new THREE.SphereGeometry(1, 20, 14);
    geometry.scale(1.8, 1.15, 0.62);
    const mesh = new THREE.Mesh(geometry, material("#59b6c2", 0, 0.55, 0.5));
    mesh.position.set(...point); mesh.name = `Insertion-path related blockout surface · tooth ${toothNumber ?? "—"}`;
    mesh.userData.prostheiaMeshId = "rpd-blockout-surface"; mesh.castShadow = false; group.add(mesh);
  } else if (kind === "relief") {
    const patch = ellipsePatch(points, 0.12, "#4db8c2", 0.38); patch.name = "Local relief guide · exercise"; patch.userData.prostheiaMeshId = "rpd-relief-guide"; group.add(patch);
  }
  group.traverse((child) => { if (child instanceof THREE.Mesh) child.receiveShadow = true; });
  return group;
}

export function rpdComponentGeometry(args: {
  kind: PartialComponentKind;
  arch: RpdArch;
  connectorForm?: RpdConnectorForm;
  restSurface?: RpdRestSurface;
  toothNumber?: number;
  regionTeeth?: number[];
  points?: RpdPoint[];
}) {
  const classPlan = Object.values(RPD_CASE_PLANS).find((plan) => plan.arch === args.arch && plan.connectorForm === (args.connectorForm ?? "lingual_bar")) ?? RPD_CASE_PLANS[args.arch === "upper" ? "III" : "I"];
  const points = args.points ?? rpdComponentPath({ ...args, classPlan });
  return createR5PartialComponent({ ...args, points, connectorForm: args.connectorForm ?? classPlan.connectorForm });
}

export const RPD_IDENTITY_MATRIX = identity;
