import * as THREE from "three";
import { createSyntheticImplantFixture } from "./geometry";

/** Lightweight internally authored geometry for restorative implant teaching cases. */
export function createR7ImplantFixture(diameterMm: number, lengthMm: number) {
  const fixture = createSyntheticImplantFixture(diameterMm, lengthMm);
  fixture.name = "Synthetic training implant reference · fixed case axis";
  fixture.traverse((child) => {
    if (child instanceof THREE.Mesh) child.userData.prostheiaMeshId = `r7-${String(child.userData.prostheiaMeshId ?? "fixture")}`;
  });
  return fixture;
}

export function createR7SupportRidge(challenge: "centered" | "offset") {
  void challenge;
  const root = new THREE.Group();
  root.name = "Synthetic gingival ridge support · educational geometry";
  const geometry = new THREE.SphereGeometry(1, 36, 20);
  const ridge = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: "#d5b79c", roughness: 0.88, transparent: true, opacity: 0.38 }));
  ridge.scale.set(17.5, 9.4, 4.2);
  ridge.position.set(0, 0, -2.4);
  ridge.userData.prostheiaMeshId = "r7-synthetic-ridge-support";
  root.add(ridge);

  return root;
}

export function createR7Gingiva(challenge: "centered" | "offset") {
  const columns = 48;
  const rows = 28;
  const thickness = 1.5;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let layer = 0; layer < 2; layer += 1) {
    const zOffset = layer === 0 ? 0 : -thickness;
    for (let ix = 0; ix <= columns; ix += 1) {
      const u = ix / columns * 2 - 1;
      const x = u * 16;
      const archCurve = 0.009 * x * x;
      for (let iy = 0; iy <= rows; iy += 1) {
        const v = iy / rows * 2 - 1;
        const y = v * 8.4;
        const crest = 1.05 * Math.exp(-((y + (challenge === "offset" ? 0.9 : 0.1)) ** 2) / 15);
        const contour = 0.28 * Math.cos(u * Math.PI * 1.6) - 0.12 * u * u;
        positions.push(x, y + archCurve, -1.15 + crest + contour + zOffset);
        if (ix < columns && iy < rows) {
          const a = layer * (columns + 1) * (rows + 1) + ix * (rows + 1) + iy;
          const b = a + rows + 1;
          if (layer === 0) indices.push(a, b, a + 1, a + 1, b, b + 1);
          else indices.push(a, a + 1, b, a + 1, b + 1, b);
        }
      }
    }
  }
  const topCount = (columns + 1) * (rows + 1);
  for (let ix = 0; ix < columns; ix += 1) for (const iy of [0, rows]) {
    const a = ix * (rows + 1) + iy;
    const b = a + rows + 1;
    indices.push(a, b, b + topCount, a, b + topCount, a + topCount);
  }
  for (let iy = 0; iy < rows; iy += 1) for (const ix of [0, columns]) {
    const a = ix * (rows + 1) + iy;
    const b = a + 1;
    indices.push(a, b, b + topCount, a, b + topCount, a + topCount);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  const surface = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: "#bd777e", roughness: 0.8, side: THREE.DoubleSide }));
  surface.castShadow = true;
  surface.receiveShadow = true;
  surface.userData.prostheiaMeshId = "r7-synthetic-gingiva-surface";
  const root = new THREE.Group();
  root.name = "Synthetic gingiva and local arch segment";
  root.add(surface);
  return root;
}

export function createR7NeighborTooth(arch: "upper" | "lower", fdi: number, position: "mesial" | "distal", challenge: "centered" | "offset") {
  const root = createNaturalizedTrainingTooth(arch === "upper" ? "#eee2ce" : "#e8dbc7");
  root.name = `Synthetic neighboring ${arch} molar · FDI ${fdi}`;
  void position;
  void challenge;
  root.scale.set(0.94, 0.92, 0.98);
  return root;
}

export function createR7AntagonistTooth(arch: "upper" | "lower", fdi: number, challenge: "centered" | "offset") {
  const root = createNaturalizedTrainingTooth("#e8ddcd");
  root.name = `Synthetic opposing tooth · FDI ${fdi}`;
  void arch;
  void challenge;
  root.scale.set(0.9, 0.9, 0.91);
  return root;
}

function createNaturalizedTrainingTooth(color: string) {
  const root = new THREE.Group();
  const enamel = new THREE.MeshStandardMaterial({ color, roughness: 0.48 });
  const dentin = new THREE.MeshStandardMaterial({ color: "#cfae91", roughness: 0.72 });
  const outline = new THREE.Shape();
  outline.moveTo(-3.15, -2.25);
  outline.bezierCurveTo(-4.15, -0.95, -3.3, 2.45, -1.7, 2.85);
  outline.bezierCurveTo(-0.7, 3.45, -0.25, 2.15, 0.65, 2.3);
  outline.bezierCurveTo(1.8, 2.6, 2.95, 3.3, 3.55, 1.85);
  outline.bezierCurveTo(4.0, 0.5, 3.25, -1.8, 2.0, -2.55);
  outline.bezierCurveTo(0.7, -3.25, -1.9, -3.25, -3.15, -2.25);
  const crownGeometry = new THREE.ExtrudeGeometry(outline, { depth: 4.7, bevelEnabled: true, bevelSegments: 3, bevelSize: 0.42, bevelThickness: 0.55, curveSegments: 10 });
  crownGeometry.translate(0, 0, 0.45);
  crownGeometry.computeVertexNormals();
  const crown = new THREE.Mesh(crownGeometry, enamel);
  crown.userData.prostheiaMeshId = "r7-neighbor-crown-contour";
  crown.castShadow = true;
  crown.receiveShadow = true;
  root.add(crown);

  const cuspPoints: [number, number, number, number, number][] = [
    [-1.75, -1.15, 4.72, 0.92, 0.78], [1.55, -1.1, 4.62, 0.9, 0.77],
    [-1.55, 1.1, 4.75, 0.86, 0.74], [1.62, 1.04, 4.65, 0.82, 0.72],
  ];
  cuspPoints.forEach(([x, y, z, radius, height], index) => {
    const cusp = new THREE.Mesh(new THREE.SphereGeometry(radius, 14, 10), enamel);
    cusp.position.set(x, y, z);
    cusp.scale.set(1, 1, height);
    cusp.userData.prostheiaMeshId = `r7-neighbor-cusp-${index + 1}`;
    root.add(cusp);
  });
  const cervical = new THREE.Mesh(new THREE.CylinderGeometry(2.55, 2.9, 1.3, 24, 1), dentin);
  cervical.rotation.x = Math.PI / 2;
  cervical.position.z = -0.55;
  cervical.userData.prostheiaMeshId = "r7-neighbor-cervical-collar";
  root.add(cervical);
  for (const [index, x] of [-1.45, 1.45].entries()) {
    const geometry = new THREE.ConeGeometry(1.12, 6.3, 16, 1);
    geometry.rotateX(Math.PI / 2);
    geometry.translate(x, 0, -3.65);
    const rootMesh = new THREE.Mesh(geometry, dentin);
    rootMesh.userData.prostheiaMeshId = `r7-neighbor-root-${index + 1}`;
    rootMesh.castShadow = true;
    root.add(rootMesh);
  }
  return root;
}

export function createR7ScanBody(orientation: "flat-a" | "flat-b") {
  const root = new THREE.Group();
  root.name = `Synthetic scan body · orientation ${orientation}`;
  const alloy = new THREE.MeshStandardMaterial({ color: "#71aaa5", roughness: 0.42, metalness: 0.18 });
  const marker = new THREE.MeshStandardMaterial({ color: "#ebbb72", roughness: 0.38, metalness: 0.12 });
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.55, 32), alloy);
  collar.rotation.x = Math.PI / 2;
  collar.position.z = 0.3;
  collar.userData.prostheiaMeshId = "r7-scan-body-seat-collar";
  root.add(collar);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(1.35, 1.7, 1.15, 24, 1), alloy);
  neck.rotation.x = Math.PI / 2;
  neck.position.z = 1.05;
  neck.userData.prostheiaMeshId = "r7-scan-body-neck";
  root.add(neck);
  const indexedBody = new THREE.Mesh(new THREE.CylinderGeometry(1.88, 1.72, 3.35, 7, 1), alloy);
  indexedBody.rotation.x = Math.PI / 2;
  indexedBody.position.z = 3.15;
  indexedBody.userData.prostheiaMeshId = "r7-scan-body-indexed-head";
  root.add(indexedBody);
  const flat = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.2, 2.05), marker);
  const flatAngle = orientation === "flat-a" ? 0 : Math.PI * 0.5;
  flat.position.set(Math.cos(flatAngle) * 1.8, Math.sin(flatAngle) * 1.8, 3.2);
  flat.rotation.z = flatAngle;
  flat.userData.prostheiaMeshId = "r7-scan-body-indexing-flat";
  root.add(flat);
  const topMark = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.11, 18), marker);
  topMark.rotation.x = Math.PI / 2;
  topMark.position.z = 4.83;
  topMark.userData.prostheiaMeshId = "r7-scan-body-top-marker";
  root.add(topMark);
  return root;
}

export function createR7Abutment(diameterMm: number, heightMm: number) {
  const root = new THREE.Group();
  root.name = "Synthetic training abutment · editable concept geometry";
  const material = new THREE.MeshStandardMaterial({ color: "#c4a77f", roughness: 0.48, metalness: 0.28 });
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(diameterMm * 0.54, diameterMm * 0.54, 0.52, 32), material);
  platform.rotation.x = Math.PI / 2;
  platform.position.z = 0.27;
  platform.userData.prostheiaMeshId = "r7-abutment-interface-platform";
  root.add(platform);
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(diameterMm * 0.39, diameterMm * 0.48, Math.max(1.4, heightMm * 0.64), 28, 1), material);
  neck.rotation.x = Math.PI / 2;
  neck.position.z = 0.52 + Math.max(1.4, heightMm * 0.64) / 2;
  neck.userData.prostheiaMeshId = "r7-abutment-tapered-neck";
  root.add(neck);
  const crownSeat = new THREE.Mesh(new THREE.CylinderGeometry(diameterMm * 0.58, diameterMm * 0.42, 0.7, 28), material);
  crownSeat.rotation.x = Math.PI / 2;
  crownSeat.position.z = 0.52 + Math.max(1.4, heightMm * 0.64) + 0.24;
  crownSeat.userData.prostheiaMeshId = "r7-abutment-crown-seat";
  root.add(crownSeat);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(diameterMm * 0.58, diameterMm * 0.58, 0.24, 28), material);
  top.rotation.x = Math.PI / 2;
  top.position.z = crownSeat.position.z + 0.47;
  top.userData.prostheiaMeshId = "r7-abutment-support-face";
  root.add(top);
  return root;
}

export function createR7EmergenceProfile(baseRadiusMm: number, crownRadiusMm: number, heightMm: number) {
  const root = new THREE.Group();
  root.name = "Editable synthetic emergence profile · exercise target only";
  const radialSteps = 40;
  const levels = [
    { z: 0, radius: baseRadiusMm },
    { z: heightMm * 0.18, radius: baseRadiusMm * 0.94 },
    { z: heightMm * 0.62, radius: crownRadiusMm * 0.82 },
    { z: heightMm, radius: crownRadiusMm },
  ];
  const positions: number[] = [];
  const indices: number[] = [];
  levels.forEach((level) => {
    for (let step = 0; step <= radialSteps; step += 1) {
      const angle = step / radialSteps * Math.PI * 2;
      positions.push(Math.cos(angle) * level.radius, Math.sin(angle) * level.radius * 0.86, level.z);
    }
  });
  for (let level = 0; level < levels.length - 1; level += 1) for (let step = 0; step < radialSteps; step += 1) {
    const a = level * (radialSteps + 1) + step;
    const b = a + radialSteps + 1;
    indices.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: "#d58a91", roughness: 0.64, transparent: true, opacity: 0.76, side: THREE.DoubleSide }));
  mesh.userData.prostheiaMeshId = "r7-editable-emergence-profile";
  root.add(mesh);
  return root;
}

export function createR7ImplantAxisGuide(lengthMm: number, color = "#ef7d53") {
  const root = new THREE.Group();
  root.name = "Fixed implant reference axis · educational guide";
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.4, transparent: true, opacity: 0.86 });
  const shaftLength = lengthMm * 0.86;
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, shaftLength, 8), material);
  shaft.rotation.x = Math.PI / 2;
  shaft.position.z = shaftLength / 2;
  shaft.userData.prostheiaMeshId = "r7-implant-axis-shaft";
  root.add(shaft);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.18, lengthMm - shaftLength, 10), material);
  tip.rotation.x = Math.PI / 2;
  tip.position.z = shaftLength + (lengthMm - shaftLength) / 2;
  tip.userData.prostheiaMeshId = "r7-implant-axis-arrow";
  root.add(tip);
  return root;
}

export function createR7ScrewAccessGuide(lengthMm: number, radiusMm: number) {
  const root = new THREE.Group();
  root.name = "Screw access axis path · educational overlay";
  const channel = new THREE.Mesh(new THREE.CylinderGeometry(radiusMm, radiusMm, lengthMm, 20, 1, true), new THREE.MeshStandardMaterial({ color: "#54aeb4", transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }));
  channel.rotation.x = Math.PI / 2;
  channel.position.z = lengthMm / 2;
  channel.userData.prostheiaMeshId = "r7-screw-access-path";
  root.add(channel);
  const centerline = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, lengthMm, 8), new THREE.MeshStandardMaterial({ color: "#39aeb4", depthTest: false, depthWrite: false }));
  centerline.rotation.x = Math.PI / 2;
  centerline.position.z = lengthMm / 2;
  centerline.userData.prostheiaMeshId = "r7-screw-access-centerline";
  root.add(centerline);
  return root;
}

export function createR7InterfaceGuide(diameterMm: number) {
  const root = new THREE.Group();
  root.name = "Synthetic restorative platform reference";
  const ring = new THREE.Mesh(new THREE.TorusGeometry(diameterMm * 0.61, 0.09, 8, 32), new THREE.MeshStandardMaterial({ color: "#e2b56b", roughness: 0.4, metalness: 0.12 }));
  ring.userData.prostheiaMeshId = "r7-restorative-platform-reference";
  root.add(ring);
  const cross = new THREE.Group();
  const lineMaterial = new THREE.MeshStandardMaterial({ color: "#e2b56b", roughness: 0.45 });
  for (let index = 0; index < 2; index += 1) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(diameterMm * 0.78, 0.07, 0.07), lineMaterial);
    line.rotation.z = index * Math.PI / 2;
    line.userData.prostheiaMeshId = `r7-interface-index-${index + 1}`;
    cross.add(line);
  }
  root.add(cross);
  return root;
}

export function createR7ContactGuide(kind: "proximal" | "occlusal") {
  const root = new THREE.Group();
  root.name = kind === "proximal" ? "Proximal contact review locations · guide only" : "Antagonist contact review zone · guide only";
  const material = new THREE.MeshStandardMaterial({ color: kind === "proximal" ? "#e5aa59" : "#59b6b2", transparent: true, opacity: 0.72, roughness: 0.48, depthWrite: false });
  if (kind === "proximal") {
    for (const [index, x] of [-4.8, 4.8].entries()) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.08, 6, 24), material);
      ring.rotation.y = Math.PI / 2;
      ring.position.set(x, 0, 2.8);
      ring.userData.prostheiaMeshId = `r7-proximal-review-ring-${index + 1}`;
      root.add(ring);
    }
  } else {
    const target = new THREE.Mesh(new THREE.TorusGeometry(4.1, 0.08, 6, 32), material);
    target.position.z = 8.8;
    target.userData.prostheiaMeshId = "r7-antagonist-review-ring";
    root.add(target);
  }
  return root;
}

export function createR7CrownTarget() {
  const root = new THREE.Group();
  root.name = "Exercise crown silhouette reference · optional overlay";
  const points = Array.from({ length: 24 }, (_, index) => {
    const angle = index / 24 * Math.PI * 2;
    const lobedRadius = 5.2 + 0.34 * Math.cos(angle * 4);
    return new THREE.Vector3(Math.cos(angle) * lobedRadius, Math.sin(angle) * lobedRadius * 0.8, 0.35 * Math.cos(angle * 2));
  });
  const curve = new THREE.CatmullRomCurve3(points, true, "centripetal");
  const outline = new THREE.Mesh(new THREE.TubeGeometry(curve, 96, 0.085, 6, true), new THREE.MeshStandardMaterial({ color: "#edc47e", roughness: 0.48, transparent: true, opacity: 0.76 }));
  outline.userData.prostheiaMeshId = "r7-crown-silhouette-target";
  root.add(outline);
  return root;
}
