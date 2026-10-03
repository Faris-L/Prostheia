import * as THREE from "three";

/** Internally generated synthetic teaching geometry; not a clinical tooth library or validated anatomy. */
export function createSyntheticCrownMesh() {
  const radialSegments = 48;
  const rings = 20;
  const positions: number[] = [];
  const indices: number[] = [];
  for (let ring = 0; ring <= rings; ring += 1) {
    const t = ring / rings;
    const z = -2.8 + 5.7 * t;
    const profile = 0.72 + 0.28 * Math.sin(Math.PI * t) ** 0.65;
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const angle = (segment / radialSegments) * Math.PI * 2;
      const cusp = 0.32 * Math.cos(angle * 4 + Math.PI / 4) * Math.sin(Math.PI * t) ** 1.8;
      const lobes = 1 + 0.035 * Math.cos(angle * 4) * Math.sin(Math.PI * t);
      positions.push(Math.cos(angle) * 4.05 * profile * lobes, Math.sin(angle) * 3.25 * profile * lobes, z + cusp);
    }
  }
  const bottomCenter = positions.length / 3;
  positions.push(0, 0, -2.8);
  const topCenter = positions.length / 3;
  positions.push(0, 0, 2.9);
  for (let ring = 0; ring < rings; ring += 1) {
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const next = (segment + 1) % radialSegments;
      const a = ring * radialSegments + segment;
      const b = ring * radialSegments + next;
      const c = (ring + 1) * radialSegments + segment;
      const d = (ring + 1) * radialSegments + next;
      indices.push(a, b, d, a, d, c);
    }
  }
  const lastRing = rings * radialSegments;
  for (let segment = 0; segment < radialSegments; segment += 1) {
    const next = (segment + 1) % radialSegments;
    indices.push(bottomCenter, next, segment);
    indices.push(topCenter, lastRing + segment, lastRing + next);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  return geometry;
}

export function createSyntheticCrownObject(kind: "restoration" | "reference" = "restoration") {
  const root = new THREE.Group();
  root.name = kind === "restoration" ? "Synthetic training crown" : "Synthetic crown example";
  const material = new THREE.MeshStandardMaterial({ color: kind === "restoration" ? "#f0dfbf" : "#64c9bf", roughness: 0.42, metalness: kind === "restoration" ? 0.02 : 0 });
  const outer = new THREE.Mesh(createSyntheticCrownMesh(), material);
  outer.castShadow = true;
  outer.receiveShadow = true;
  root.add(outer);
  return root;
}
