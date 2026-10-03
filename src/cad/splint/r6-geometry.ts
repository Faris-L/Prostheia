import * as THREE from "three";
import { createEdentulousArch, createSyntheticDentureTooth, fdiPositions, positionForTooth } from "../denture/geometry";
import { generateSplintGeometry } from "./geometry";

export type SplintTrainingCase = "stabilization" | "contact_challenge";

export function r6SplintBoundary(kind: SplintTrainingCase): [number, number, number][] {
  const front = kind === "stabilization" ? 15.5 : 14.2;
  const width = kind === "stabilization" ? 17.2 : 18.1;
  const inner = kind === "stabilization" ? 11.8 : 10.7;
  return [
    [-width, -3, 0], [-width + 1, 4, 0], [-13.3, 10.5, 0], [-7.2, 14.1, 0], [0, front, 0],
    [7.2, 14.1, 0], [13.3, 10.5, 0], [width - 1, 4, 0], [width, -3, 0],
    [12.2, 1, 0], [8.3, 6.4, 0], [4.2, inner, 0], [0, inner + 1.2, 0],
    [-4.2, inner, 0], [-8.3, 6.4, 0], [-12.2, 1, 0],
  ];
}

export function createR6BiteArch(arch: "upper" | "lower", challenge: SplintTrainingCase = "stabilization") {
  const root = createEdentulousArch(arch);
  root.name = arch === "upper" ? "Synthetic maxillary dentition · R6 training" : "Synthetic mandibular antagonist · R6 training";
  const toothSet = challenge === "contact_challenge" && arch === "lower" ? "broad" : "balanced";
  for (const number of fdiPositions(arch)) {
    const placement = positionForTooth(number, arch);
    const tooth = createSyntheticDentureTooth(number, toothSet);
    tooth.position.set(...placement.position);
    tooth.rotation.set(...placement.rotation);
    root.add(tooth);
  }
  return root;
}

export function createR6Splint(boundary: readonly [number, number, number][], thicknessMm: number) {
  const geometry = generateSplintGeometry({ boundary, thicknessMm, verticalOffsetMm: 0.25 });
  const material = new THREE.MeshStandardMaterial({ color: "#76c7c3", roughness: 0.34, metalness: 0.02, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "Editable arch-conforming bite splint · exercise geometry";
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

export function createSplintBoundaryGuide(points: readonly [number, number, number][]) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(point[0], point[1], point[2] + 0.18)), true, "centripetal");
  const root = new THREE.Group();
  root.name = "Editable splint boundary · GUIDE";
  root.add(new THREE.Mesh(new THREE.TubeGeometry(curve, Math.max(64, points.length * 8), 0.11, 7, true), new THREE.MeshStandardMaterial({ color: "#ffc75d", roughness: 0.42 })));
  return root;
}

export function createSplintThicknessGuide(thicknessMm: number) {
  const root = new THREE.Group();
  root.name = `Thickness target guide · ${thicknessMm.toFixed(1)} mm for this exercise`;
  const material = new THREE.MeshStandardMaterial({ color: "#67d6b4", roughness: 0.35 });
  for (const [x, y] of [[-10, 7], [-4.5, 12], [4.5, 12], [10, 7]] as const) {
    const marker = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, thicknessMm, 8), material);
    marker.position.set(x, y, thicknessMm / 2 + 0.25);
    marker.rotation.x = Math.PI / 2;
    marker.userData.thicknessTargetMm = thicknessMm;
    root.add(marker);
  }
  return root;
}

export function createSplintContactGuide(challenge: SplintTrainingCase) {
  const root = new THREE.Group();
  root.name = "Antagonist contact review locations · GUIDE";
  const material = new THREE.MeshStandardMaterial({ color: challenge === "contact_challenge" ? "#ed7d62" : "#73b9d5", roughness: 0.45 });
  const locations = challenge === "contact_challenge" ? [[-11, 5], [-5, 12], [6, 11], [12, 4]] : [[-8, 8], [0, 13], [8, 8]];
  for (const [x, y] of locations) {
    const marker = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 8), material);
    marker.position.set(x, y, 3.6);
    root.add(marker);
  }
  return root;
}

export function createSplintRelationReference() {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(43, 31), new THREE.MeshBasicMaterial({ color: "#739cbb", transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false }));
  mesh.name = "Synthetic jaw relation reference plane · exercise only";
  mesh.position.z = 5.2;
  return mesh;
}
