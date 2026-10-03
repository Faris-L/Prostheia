import * as THREE from "three";

export type CompleteDentureArch = "upper" | "lower";
export type CompleteDentureMorphology = "balanced" | "resorbed";

type RidgeFrame = { x: number; y: number; tangentX: number; tangentY: number; normalX: number; normalY: number };

function bezier(p0: THREE.Vector2, p1: THREE.Vector2, p2: THREE.Vector2, p3: THREE.Vector2, t: number) {
  const s = 1 - t;
  return new THREE.Vector2(
    s ** 3 * p0.x + 3 * s ** 2 * t * p1.x + 3 * s * t ** 2 * p2.x + t ** 3 * p3.x,
    s ** 3 * p0.y + 3 * s ** 2 * t * p1.y + 3 * s * t ** 2 * p2.y + t ** 3 * p3.y,
  );
}

function ridgeFrame(arch: CompleteDentureArch, t: number): RidgeFrame {
  const left = [new THREE.Vector2(-31, 18), new THREE.Vector2(-33, -7), new THREE.Vector2(-20, -31), new THREE.Vector2(0, -33)];
  const right = [new THREE.Vector2(0, -33), new THREE.Vector2(20, -31), new THREE.Vector2(33, -7), new THREE.Vector2(31, 18)];
  const curve = t < 0.5 ? left : right;
  const localT = t < 0.5 ? t * 2 : (t - 0.5) * 2;
  const point = bezier(curve[0], curve[1], curve[2], curve[3], localT);
  const before = bezier(curve[0], curve[1], curve[2], curve[3], Math.max(0, localT - 0.002));
  const after = bezier(curve[0], curve[1], curve[2], curve[3], Math.min(1, localT + 0.002));
  const tangent = after.sub(before).normalize();
  const direction = arch === "upper" ? 1 : -1;
  const normal = new THREE.Vector2(-tangent.y * direction, tangent.x * direction);
  return { x: point.x, y: point.y, tangentX: tangent.x, tangentY: tangent.y, normalX: normal.x, normalY: normal.y };
}

function archFactors(morphology: CompleteDentureMorphology) {
  return morphology === "balanced" ? { width: 1, height: 1, arch: 1 } : { width: 0.86, height: 0.48, arch: 0.91 };
}

function sweptRidgeGeometry(arch: CompleteDentureArch, morphology: CompleteDentureMorphology, centerZ: number, widthRadius: number, heightRadius: number, segmentCount = 112, ringCount = 24) {
  const factors = archFactors(morphology);
  const positions: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= segmentCount; i += 1) {
    const t = i / segmentCount;
    const frame = ridgeFrame(arch, t);
    const endpointPad = 1 + 0.16 * Math.exp(-(((t - 0.02) / 0.09) ** 2)) + 0.16 * Math.exp(-(((t - 0.98) / 0.09) ** 2));
    const smoothVariation = 1 + 0.018 * Math.sin(t * Math.PI * 6) ** 2;
    const width = widthRadius * factors.width * endpointPad * smoothVariation;
    const height = heightRadius * factors.height * endpointPad * smoothVariation;
    for (let j = 0; j < ringCount; j += 1) {
      const angle = Math.PI * 2 * j / ringCount;
      const sideOffset = Math.sin(angle) * width;
      positions.push(
        (frame.x + frame.normalX * sideOffset) * factors.arch,
        frame.y + frame.normalY * sideOffset,
        centerZ + Math.cos(angle) * height,
      );
    }
  }
  for (let i = 0; i < segmentCount; i += 1) for (let j = 0; j < ringCount; j += 1) {
    const nextJ = (j + 1) % ringCount;
    const a = i * ringCount + j;
    const b = (i + 1) * ringCount + j;
    const c = (i + 1) * ringCount + nextJ;
    const d = i * ringCount + nextJ;
    indices.push(a, b, d, b, c, d);
  }
  const first = ridgeFrame(arch, 0); const last = ridgeFrame(arch, 1);
  const firstCenter = positions.length / 3;
  positions.push(first.x, first.y, centerZ);
  const lastCenter = positions.length / 3;
  positions.push(last.x, last.y, centerZ);
  const lastRing = segmentCount * ringCount;
  for (let j = 0; j < ringCount; j += 1) {
    const next = (j + 1) % ringCount;
    indices.push(firstCenter, next, j);
    indices.push(lastCenter, lastRing + j, lastRing + next);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}

function palateGeometry(morphology: CompleteDentureMorphology, centerZ: number, lift: number, thickness = 0) {
  const rows = 42; const columns = 48;
  const positions: number[] = []; const indices: number[] = [];
  const factors = archFactors(morphology);
  for (let i = 0; i <= rows; i += 1) {
    const v = i / rows;
    const y = -29 + v * 45;
    const ellipse = Math.sqrt(Math.max(0, 1 - ((y + 6) / 27) ** 2));
    const halfWidth = 21 * ellipse * factors.arch;
    for (let j = 0; j <= columns; j += 1) {
      const u = j / columns * 2 - 1;
      const x = halfWidth * u;
      const edgeFalloff = Math.max(0, 1 - u * u) * ellipse;
      const z = centerZ + lift * edgeFalloff - thickness * 0.5;
      positions.push(x, y, z);
      if (i < rows && j < columns) {
        const a = i * (columns + 1) + j; const b = a + columns + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}

function lingualSupportGeometry(morphology: CompleteDentureMorphology, centerZ: number, width: number) {
  const rows = 112; const columns = 12;
  const positions: number[] = []; const indices: number[] = [];
  const factors = archFactors(morphology);
  for (let i = 0; i <= rows; i += 1) {
    const t = i / rows;
    const frame = ridgeFrame("lower", t);
    const endEase = Math.min(1, t * 8, (1 - t) * 8);
    for (let j = 0; j <= columns; j += 1) {
      const across = j / columns;
      const offset = (4.2 + across * width) * endEase;
      const z = centerZ + 0.52 * Math.sin(across * Math.PI) * endEase;
      positions.push(frame.x - frame.normalX * offset * factors.arch, frame.y - frame.normalY * offset, z);
      if (i < rows && j < columns) {
        const a = i * (columns + 1) + j; const b = a + columns + 1;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}

function supportPadGeometry(centerX: number, centerY: number, centerZ: number, radiusX: number, radiusY: number, height: number) {
  const segments = 36; const rows = 12;
  const positions: number[] = []; const indices: number[] = [];
  for (let row = 0; row <= rows; row += 1) {
    const polar = row / rows * Math.PI / 2;
    const ringRadius = Math.sin(polar);
    for (let segment = 0; segment < segments; segment += 1) {
      const angle = segment / segments * Math.PI * 2;
      positions.push(centerX + Math.cos(angle) * radiusX * ringRadius, centerY + Math.sin(angle) * radiusY * ringRadius, centerZ + Math.cos(polar) * height);
    }
  }
  for (let row = 0; row < rows; row += 1) for (let segment = 0; segment < segments; segment += 1) {
    const next = (segment + 1) % segments;
    const a = row * segments + segment; const b = row * segments + next;
    const c = (row + 1) * segments + segment; const d = (row + 1) * segments + next;
    indices.push(a, c, b, b, c, d);
  }
  const baseCenter = positions.length / 3;
  positions.push(centerX, centerY, centerZ);
  const baseRing = rows * segments;
  for (let segment = 0; segment < segments; segment += 1) indices.push(baseCenter, baseRing + (segment + 1) % segments, baseRing + segment);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  return geometry;
}

function mesh(geometry: THREE.BufferGeometry, name: string, color: string, opacity = 1) {
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.78, metalness: 0, side: THREE.DoubleSide, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
  const object = new THREE.Mesh(geometry, material);
  object.name = name; object.castShadow = true; object.receiveShadow = true;
  return object;
}

export function createR4EdentulousArch(
  arch: CompleteDentureArch,
  morphology: CompleteDentureMorphology,
  options: { cervicalPlaneZ?: number } = {},
) {
  const upper = arch === "upper";
  const name = upper ? "Synthetic edentulous maxilla · residual ridge and palatal vault" : "Synthetic edentulous mandible · residual ridge and lingual contour";
  const group = new THREE.Group(); group.name = name;
  const ridgeHeight = upper ? 5.1 : 4.6;
  // Keep the RPD gingival crest at the cervical plane, entirely on the root side.
  // Include the ridge's endpoint expansion when choosing the center so it never
  // crosses the crownward side of that plane.
  const maximumRidgeHeight = ridgeHeight * archFactors(morphology).height * 1.182;
  const ridgeCenterZ = options.cervicalPlaneZ === undefined
    ? 0
    : options.cervicalPlaneZ + (upper ? maximumRidgeHeight : -maximumRidgeHeight);
  const ridge = sweptRidgeGeometry(arch, morphology, ridgeCenterZ, upper ? 6.6 : 6, ridgeHeight);
  group.add(mesh(ridge, upper ? "Maxillary residual ridge · vestibular and crest form" : "Mandibular residual ridge · buccal and lingual form", upper ? "#c98780" : "#bc827d"));
  if (upper) {
    group.add(mesh(palateGeometry(morphology, -2.1, 4.8), "Palatal vault · synthetic educational surface", "#d49a91"));
    group.add(mesh(supportPadGeometry(-27, 15.4, -2, 5.2, 3.3, 2), "Paired maxillary tuberosity context · exercise geometry", "#c88780"));
    group.add(mesh(supportPadGeometry(27, 15.4, -2, 5.2, 3.3, 2), "Paired maxillary tuberosity context · exercise geometry", "#c88780"));
  } else {
    group.add(mesh(lingualSupportGeometry(morphology, -3.2, 6.4), "Lingual support shelf · synthetic tissue form", "#bd847e"));
    group.add(mesh(supportPadGeometry(-26, 17.5, -2.3, 5.4, 4.2, 2.7), "Retromolar support region · left exercise geometry", "#b77773"));
    group.add(mesh(supportPadGeometry(26, 17.5, -2.3, 5.4, 4.2, 2.7), "Retromolar support region · right exercise geometry", "#b77773"));
  }
  return group;
}

export function createR4DentureBase(arch: CompleteDentureArch, morphology: CompleteDentureMorphology) {
  const upper = arch === "upper";
  const group = new THREE.Group();
  group.name = `${upper ? "Upper" : "Lower"} synthetic denture base · tissue and polished surfaces`;
  group.add(mesh(sweptRidgeGeometry(arch, morphology, 0.65, upper ? 7.1 : 6.5, 3.25), "Polished external surface · simplified shell", "#db938c"));
  group.add(mesh(sweptRidgeGeometry(arch, morphology, -0.7, upper ? 5.7 : 5.3, 1.9), "Tissue-side adaptation surface · exercise representation", "#bf7975"));
  if (upper) {
    group.add(mesh(palateGeometry(morphology, -0.1, 5.0), "Palatal base plate · polished surface", "#dc9a91"));
    group.add(mesh(palateGeometry(morphology, -1.5, 4.2), "Palatal base plate · tissue side", "#bd7774"));
  } else {
    group.add(mesh(lingualSupportGeometry(morphology, -0.2, 6.4), "Lower denture lingual flange · polished surface", "#d88d85"));
    group.add(mesh(lingualSupportGeometry(morphology, -1.5, 6.4), "Lower denture lingual flange · tissue-side adaptation surface", "#bd7774"));
  }
  return group;
}

export function createR4DentureGuide(kind: "occlusal-plane" | "midline-upper" | "midline-lower" | "border-upper" | "border-lower") {
  const group = new THREE.Group(); group.name = `Complete denture guide · ${kind} · exercise only`;
  if (kind === "occlusal-plane") {
    const plane = new THREE.Mesh(
      new THREE.PlaneGeometry(98, 68, 24, 18),
      new THREE.MeshBasicMaterial({ color: "#45b7b0", transparent: true, opacity: 0.17, side: THREE.DoubleSide, depthWrite: false }),
    );
    plane.name = "Occlusal plane reference · synthetic jaw relation";
    group.add(plane);
    return group;
  }
  const upper = kind.endsWith("upper");
  const material = new THREE.MeshStandardMaterial({ color: kind.startsWith("border") ? "#42b8ad" : "#e49a53", roughness: 0.45, metalness: 0.05 });
  const points: THREE.Vector3[] = [];
  if (kind.startsWith("midline")) {
    points.push(new THREE.Vector3(0, -36, 0), new THREE.Vector3(0, -24, 0), new THREE.Vector3(0, -10, 0), new THREE.Vector3(0, 5, 0), new THREE.Vector3(0, 18, 0));
  } else {
    for (let i = 0; i <= 48; i += 1) {
      const frame = ridgeFrame(upper ? "upper" : "lower", i / 48);
      points.push(new THREE.Vector3(frame.x + frame.normalX * (upper ? 6.8 : 6.2), frame.y + frame.normalY * (upper ? 6.8 : 6.2), 0.2));
    }
  }
  const curve = new THREE.CatmullRomCurve3(points, kind.startsWith("border"), "centripetal");
  const guide = new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(48, points.length * 3), kind.startsWith("border") ? 0.19 : 0.16, 8, kind.startsWith("border")), material);
  guide.name = kind.startsWith("border") ? `${upper ? "Upper" : "Lower"} denture border guide` : `${upper ? "Upper" : "Lower"} midline guide`;
  group.add(guide);
  return group;
}

export function completeDentureToothPosition(fdi: number, arch: CompleteDentureArch, morphology: CompleteDentureMorphology) {
  const position = fdi % 10;
  const quadrant = Math.floor(fdi / 10);
  // FDI right quadrants are 1 and 4; left quadrants are 2 and 3.
  const side = quadrant === 1 || quadrant === 4 ? -1 : 1;
  const upper = arch === "upper";
  const upperX = [0, 4.4, 11.2, 18.1, 23, 27.5, 30.5, 31];
  const lowerX = [0, 4.0, 10, 16.1, 21, 26, 29, 30];
  const upperY = [0, -34, -31.5, -26, -19, -10, 0, 10];
  const lowerY = [0, -30, -27.5, -22.5, -15.2, -6.2, 2.5, 14];
  const factor = archFactors(morphology);
  const x = side * (upper ? upperX[position] : lowerX[position]) * factor.arch;
  const y = upper ? upperY[position] : lowerY[position];
  const curvature = Math.atan2(Math.abs(x) * 0.32, 42);
  return {
    position: [x, y, 0] as [number, number, number],
    // Crown-only R4 assets grow from the cervical cut toward local +Z.
    // Upper crowns point down into the mouth; lower crowns point up.
    rotation: [upper ? Math.PI : 0, 0, side * curvature] as [number, number, number],
    scale: [1, 1, 1] as [number, number, number],
  };
}
