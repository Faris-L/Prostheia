import * as THREE from "three";

/** Procedural educational teeth and arches; no patient or third-party library data. */
export type DentureArch = "upper" | "lower";

export function fdiPositions(arch: DentureArch) {
  const quadrants = arch === "upper" ? [1, 2] : [3, 4];
  return quadrants.flatMap((quadrant) => Array.from({ length: 8 }, (_, index) => quadrant * 10 + index + 1));
}

export function positionForTooth(tooth: number, arch: DentureArch) {
  const quadrant = Math.floor(tooth / 10);
  const toothIndex = tooth % 10;
  const side = quadrant % 2 === 1 ? -1 : 1;
  const angle = (toothIndex - 4) * 0.205;
  const radiusX = toothIndex <= 3 ? 12.7 : 16.1;
  const radiusY = toothIndex <= 3 ? 9.3 : 11.9;
  const x = Math.sin(angle) * radiusX;
  const y = Math.cos(angle) * radiusY + (toothIndex <= 3 ? 2.2 : -0.9);
  const rotation = -angle * (quadrant % 2 === 1 ? 1 : -1);
  return { position: [side * Math.abs(x), y, arch === "upper" ? 0 : 8] as [number, number, number], rotation: [0, 0, rotation] as [number, number, number] };
}

export function createSyntheticDentureTooth(toothNumber: number, toothSet: "balanced" | "broad" = "balanced") {
  const posterior = toothNumber % 10 >= 4;
  const width = posterior ? 3.35 : 2.45;
  const length = posterior ? 3.2 : 3.65;
  const shape = new THREE.Shape();
  shape.moveTo(-width * 0.8, -length * 0.48);
  shape.bezierCurveTo(-width * 1.1, -length * 0.08, -width, length * 0.45, -width * 0.35, length * 0.5);
  shape.bezierCurveTo(0, length * 0.63, width * 0.35, length * 0.5, width * 0.45, length * 0.46);
  shape.bezierCurveTo(width * 1.06, length * 0.18, width * 0.86, -length * 0.38, width * 0.25, -length * 0.52);
  shape.bezierCurveTo(-width * 0.1, -length * 0.61, -width * 0.48, -length * 0.62, -width * 0.8, -length * 0.48);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: posterior ? 3.6 : 4.2, bevelEnabled: true, bevelSegments: 3, bevelSize: 0.45, bevelThickness: 0.45, curveSegments: 10 });
  if (toothSet === "broad") {
    const position = geometry.getAttribute("position");
    for (let i = 0; i < position.count; i++) position.setX(i, position.getX(i) * 1.09);
    geometry.computeVertexNormals();
  }
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox!;
  geometry.translate(0, 0, -(bounds.min.z + bounds.max.z) / 2);
  const material = new THREE.MeshStandardMaterial({ color: posterior ? "#f2e6d4" : "#f5ead9", roughness: 0.46 });
  const root = new THREE.Group();
  root.name = `Synthetic artificial tooth · FDI ${toothNumber}`;
  const crown = new THREE.Mesh(geometry, material);
  crown.castShadow = true;
  crown.receiveShadow = true;
  root.add(crown);
  if (posterior) {
    for (const [x, y] of [[-0.85, -0.75], [0.85, -0.75], [-0.85, 0.75], [0.85, 0.75]]) {
      const cusp = new THREE.Mesh(new THREE.SphereGeometry(0.72, 10, 8), material);
      cusp.position.set(x, y, 1.95);
      cusp.scale.set(1.08, 1, 0.7);
      root.add(cusp);
    }
  }
  return root;
}

function archPoint(arch: DentureArch, t: number, offset: number, z: number) {
  const angle = Math.PI * (0.08 + t * 0.84);
  const centerlineX = Math.cos(angle) * 17.5;
  const centerlineY = Math.sin(angle) * 13.4 - 1.5;
  const tangent = new THREE.Vector2(-Math.sin(angle) * 17.5, Math.cos(angle) * 13.4).normalize();
  const normal = new THREE.Vector2(-tangent.y, tangent.x);
  const side = arch === "upper" ? 1 : -1;
  return [centerlineX + normal.x * offset, centerlineY + normal.y * offset, z + side * 0.36 * Math.sin(t * Math.PI * 14) ** 2] as [number, number, number];
}

export function createEdentulousArch(arch: DentureArch) {
  const shape = new THREE.Shape();
  shape.moveTo(-16, -1);
  shape.bezierCurveTo(-23, 9, -15, 18, 0, 17);
  shape.bezierCurveTo(15, 18, 23, 9, 16, -1);
  shape.bezierCurveTo(11, 4, 8, 9, 0, 9);
  shape.bezierCurveTo(-8, 9, -11, 4, -16, -1);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 2.7, bevelEnabled: true, bevelSegments: 3, bevelSize: 1, bevelThickness: 0.8, curveSegments: 16 });
  geometry.computeBoundingBox();
  const z = arch === "upper" ? -3.4 : 8;
  geometry.translate(0, 0, z - geometry.boundingBox!.min.z);
  const group = new THREE.Group();
  group.name = arch === "upper" ? "Synthetic edentulous maxillary arch" : "Synthetic edentulous mandibular arch";
  group.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: arch === "upper" ? "#c98780" : "#ad716d", roughness: 0.73 })));
  return group;
}

/** Editable solid arch base with shallow, deterministic tooth seat depressions. */
export function createDentureBaseGeometry(arch: DentureArch) {
  const samples = 84;
  const across = 10;
  const positions: number[] = [];
  const indices: number[] = [];
  const upper = arch === "upper";
  const top = upper ? -0.7 : 8.7;
  const bottom = upper ? -3.5 : 6.1;
  for (let layer = 0; layer < 2; layer++) {
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      for (let j = 0; j <= across; j++) {
        const u = j / across;
        const width = -2.5 + u * 5;
        const p = archPoint(arch, t, width, layer === 0 ? top : bottom);
        if (layer === 0) {
          let socket = 0;
          for (const tooth of fdiPositions(arch)) {
            const target = positionForTooth(tooth, arch).position;
            const d2 = (p[0] - target[0]) ** 2 + (p[1] - target[1]) ** 2;
            socket = Math.max(socket, Math.exp(-d2 / 3.5));
          }
          p[2] += (upper ? 1 : -1) * 1.05 * socket;
        }
        positions.push(...p);
      }
    }
  }
  const grid = (samples + 1) * (across + 1);
  const addFace = (offset: number, reverse = false) => {
    for (let i = 0; i < samples; i++) for (let j = 0; j < across; j++) {
      const a = offset + i * (across + 1) + j, b = a + across + 1, c = b + 1, d = a + 1;
      if (reverse) indices.push(a, c, b, a, d, c); else indices.push(a, b, c, a, c, d);
    }
  };
  addFace(0, !upper);
  addFace(grid, upper);
  for (let i = 0; i < samples; i++) for (const j of [0, across]) {
    const a = i * (across + 1) + j, b = a + across + 1;
    indices.push(a, b, b + grid, a, b + grid, a + grid);
  }
  for (let j = 0; j < across; j++) {
    for (const i of [0, samples]) {
      const a = i * (across + 1) + j, b = a + 1;
      indices.push(a, a + grid, b + grid, a, b + grid, b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

export function createDentureBase(arch: DentureArch) {
  const root = new THREE.Group();
  root.name = `Synthetic ${arch} denture base with educational tooth seats`;
  const mesh = new THREE.Mesh(createDentureBaseGeometry(arch), new THREE.MeshStandardMaterial({ color: "#d7837c", roughness: 0.66, side: THREE.DoubleSide }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  root.add(mesh);
  return root;
}

export function createOcclusalPlaneGuide() {
  const geometry = new THREE.PlaneGeometry(39, 29);
  const material = new THREE.MeshBasicMaterial({ color: "#52bbb2", transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "Editable occlusal plane guide";
  return mesh;
}
