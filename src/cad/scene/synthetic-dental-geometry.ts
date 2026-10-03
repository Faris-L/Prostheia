import * as THREE from "three";

/**
 * Procedural, internally created teaching geometry. These meshes are deliberately
 * simplified visual aids, not patient scans, commercial tooth-library data, or
 * production anatomy.
 */
export function createSyntheticTooth(kind: "preparation" | "restoration") {
  const group = new THREE.Group();
  group.name = kind === "preparation" ? "Synthetic prepared tooth" : "Synthetic restoration reference";
  const material = new THREE.MeshStandardMaterial({ color: kind === "preparation" ? "#d4b795" : "#e9d9b8", roughness: 0.58 });
  const shape = new THREE.Shape();
  shape.moveTo(-2.8, -2.1);
  shape.bezierCurveTo(-4.1, -0.9, -3.3, 2.7, -1.6, 3.1);
  shape.bezierCurveTo(-0.6, 3.4, -0.2, 2.2, 0.8, 2.4);
  shape.bezierCurveTo(2.0, 2.7, 2.8, 3.6, 3.4, 2.2);
  shape.bezierCurveTo(4.2, 0.5, 3.1, -1.9, 2.2, -2.5);
  shape.bezierCurveTo(0.8, -3.6, -1.8, -3.4, -2.8, -2.1);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: kind === "preparation" ? 5.5 : 7.2, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.55, bevelThickness: 0.75, curveSegments: 12 });
  geometry.computeBoundingBox();
  const bounds = geometry.boundingBox!;
  geometry.translate(0, 0, -(bounds.min.z + bounds.max.z) / 2);
  const tooth = new THREE.Mesh(geometry, material);
  tooth.castShadow = true;
  tooth.receiveShadow = true;
  group.add(tooth);

  // A narrow cervical collar and tapered roots make the model read as a tooth
  // in oblique views while keeping geometry lightweight for the browser.
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(2.65, 2.95, 1.3, 24, 1), new THREE.MeshStandardMaterial({ color: "#d0ad88", roughness: 0.72 }));
  collar.rotation.x = Math.PI / 2;
  collar.position.z = -3.6;
  group.add(collar);
  if (kind === "restoration") {
    for (const [x, y, z] of [[-1.4, -0.9, 3.05], [1.5, -0.8, 3.0], [-1.2, 1.0, 3.1], [1.25, 1.0, 3.05]] as const) {
      const cusp = new THREE.Mesh(new THREE.SphereGeometry(0.76, 12, 10), material);
      cusp.position.set(x, y, z);
      cusp.scale.set(1.05, 1.1, 0.82);
      group.add(cusp);
    }
  }
  return group;
}

export function createSyntheticDentalArch(upper: boolean) {
  const group = new THREE.Group();
  group.name = upper ? "Synthetic maxillary arch" : "Synthetic antagonist arch";
  const gumMaterial = new THREE.MeshStandardMaterial({ color: upper ? "#bd7f78" : "#a96868", roughness: 0.8 });
  const gum = new THREE.Mesh(new THREE.TorusGeometry(17, 2.5, 10, 64, Math.PI), gumMaterial);
  gum.rotation.z = Math.PI;
  gum.position.z = upper ? -4.5 : 9;
  gum.scale.set(1, 0.8, 1);
  group.add(gum);

  for (let index = 0; index < 14; index += 1) {
    const t = index / 13;
    const angle = Math.PI + t * Math.PI;
    const x = Math.cos(angle) * 17;
    const y = Math.sin(angle) * 14;
    const front = Math.abs(index - 6.5) < 2;
    const tooth = new THREE.Mesh(
      new THREE.SphereGeometry(front ? 2.5 : 2.9, 18, 14),
      new THREE.MeshStandardMaterial({ color: front ? "#eadfcf" : "#dfcfb9", roughness: 0.62 }),
    );
    tooth.position.set(x, y, (upper ? -1 : 7) + (front ? 0 : 0.4));
    tooth.scale.set(front ? 0.72 : 0.9, front ? 1.05 : 0.92, 1.22);
    tooth.rotation.z = (t - 0.5) * 0.42;
    tooth.castShadow = true;
    group.add(tooth);
  }
  return group;
}

/** Synthetic scan exercise with one deliberately open patch for Fill Hole practice. */
export function createSyntheticScanExercise() {
  const group = createSyntheticTooth("preparation");
  group.name = "Synthetic scan with a small open patch";
  group.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || !(child.geometry instanceof THREE.ExtrudeGeometry)) return;
    const source = child.geometry;
    const position = source.getAttribute("position");
    const sourceIndex = source.index;
    const triangles: number[] = [];
    const count = Math.floor((sourceIndex?.count ?? position.count) / 3);
    for (let triangle = 0; triangle < count; triangle += 1) {
      const ids = [0, 1, 2].map((corner) => sourceIndex ? sourceIndex.getX(triangle * 3 + corner) : triangle * 3 + corner);
      const points = ids.map((id) => new THREE.Vector3().fromBufferAttribute(position, id));
      const center = points[0].clone().add(points[1]).add(points[2]).multiplyScalar(1 / 3);
      // Remove a tiny piece of the exposed occlusal surface, simulating a scan void.
      if (center.z > 2.7 && center.x > -1.1 && center.x < 1.1 && center.y > -0.5 && center.y < 0.9) continue;
      triangles.push(...ids);
    }
    const repaired = new THREE.BufferGeometry();
    repaired.setAttribute("position", position.clone());
    repaired.setIndex(triangles);
    repaired.computeVertexNormals();
    child.geometry = repaired;
  });
  return group;
}
