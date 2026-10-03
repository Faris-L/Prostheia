import * as THREE from "three";
import { createSyntheticTooth } from "../scene/synthetic-dental-geometry";
import { geometryRegistry } from "../scene/geometry-registry";
import { useWorkspaceStore } from "../engine/workspace-store";
import { useHistoryStore } from "../engine/history-store";
import { useAnalysisStore } from "../analysis/state";
import { cadObjectId, type CadObjectMetadata, type WorkspaceMode } from "../types";
import { createSyntheticImplantAbutment, createSyntheticImplantFixture, createSyntheticImplantSite } from "./geometry";
import { IMPLANT_FIXTURES, useImplantStore } from "./types";
import { AddImplantFixtureCommand } from "./operations";

export const IMPLANT_IDS = {
  site: "implant-synthetic-site", fixture: "implant-training-fixture-primary", reference: "implant-training-fixture-reference",
  scanBody: "implant-synthetic-scan-body", abutment: "implant-training-abutment", restoration: "implant-training-restoration", risk: "implant-synthetic-reference-region",
  emergence: "implant-training-emergence-reference", screwChannel: "implant-training-screw-channel-reference",
} as const;
const zero = { position: [0, 0, 0] as [number, number, number], rotation: [0, 0, 0] as [number, number, number], scale: [1, 1, 1] as [number, number, number] };
function register(id: string, name: string, role: CadObjectMetadata["role"], part: NonNullable<CadObjectMetadata["implantPart"]>, object: THREE.Object3D, extra: Partial<CadObjectMetadata> = {}) {
  const key = cadObjectId(id); geometryRegistry.register({ id: key, role, name, object, ownsResources: true });
  return { id: key, name, role, editable: part !== "site" && part !== "synthetic_risk" && part !== "reference_fixture", syntheticMesh: true, transform: structuredClone(zero), visible: true, opacity: 1, geometryStats: geometryRegistry.stats(key), implantPart: part, ...extra } satisfies CadObjectMetadata;
}
export function createImplantCase(mode: WorkspaceMode = "free-lab") {
  geometryRegistry.clear(); useHistoryStore.getState().clear(); useAnalysisStore.getState().clear();
  const definition = IMPLANT_FIXTURES.find((entry) => entry.id === useImplantStore.getState().selectedDefinitionId) ?? IMPLANT_FIXTURES[0];
  const site = register(IMPLANT_IDS.site, "Synthetic implant site reference", "maxilla", "site", createSyntheticImplantSite());
  const fixture = register(IMPLANT_IDS.fixture, definition.name, "implant", "fixture", createSyntheticImplantFixture(definition.diameterMm, definition.lengthMm), { implantDefinitionId: definition.id, implantDiameterMm: definition.diameterMm, implantLengthMm: definition.lengthMm, implantDepthMm: definition.lengthMm, implantReference: false });
  fixture.transform.position = [0, 0, 0];
  const referenceDefinition = IMPLANT_FIXTURES[0];
  const reference = register(IMPLANT_IDS.reference, "Synthetic reference fixture · exercise only", "reference", "reference_fixture", createSyntheticImplantFixture(referenceDefinition.diameterMm, referenceDefinition.lengthMm), { editable: false, implantDefinitionId: referenceDefinition.id, implantDiameterMm: referenceDefinition.diameterMm, implantLengthMm: referenceDefinition.lengthMm, implantReference: true });
  reference.transform.position = [-5.5, 0, 0]; reference.opacity = 0.55;
  const scanBodyRoot = new THREE.Group(); scanBodyRoot.name = "Synthetic scan body";
  const scanMesh = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.05, 4, 12), new THREE.MeshStandardMaterial({ color: "#62aaa5", roughness: 0.45 })); scanMesh.rotation.x = Math.PI / 2; scanMesh.position.z = 1.7; scanMesh.userData.prostheiaMeshId = "scan-body-marker"; scanBodyRoot.add(scanMesh);
  const scanBody = register(IMPLANT_IDS.scanBody, "Synthetic scan body", "scan", "scan_body", scanBodyRoot, { implantFixtureObjectId: fixture.id }); scanBody.transform.position = [0, 0, 1.3];
  const abutment = register(IMPLANT_IDS.abutment, "Synthetic educational abutment", "abutment", "abutment", createSyntheticImplantAbutment(definition.diameterMm), { implantFixtureObjectId: fixture.id });
  abutment.transform.position = [0, 0, 0.4];
  const restorationRoot = createSyntheticTooth("restoration"); restorationRoot.name = "Synthetic implant crown · shared crown geometry";
  const restoration = register(IMPLANT_IDS.restoration, "Synthetic implant crown · shared crown geometry", "crown", "restoration", restorationRoot, { implantParentObjectId: abutment.id, restorationType: "crown" }); restoration.transform.position = [0, 0, 3.2]; restoration.transform.scale = [0.72, 0.72, 0.72];
  const emergenceRoot = new THREE.Group(); emergenceRoot.name = "Simplified emergence profile reference";
  const emergenceRing = new THREE.Mesh(new THREE.TorusGeometry(definition.diameterMm * 0.8, 0.12, 6, 24), new THREE.MeshStandardMaterial({ color: "#c9828d", transparent: true, opacity: 0.62 })); emergenceRing.position.z = 2; emergenceRing.userData.prostheiaMeshId = "emergence-profile-ring"; emergenceRoot.add(emergenceRing);
  const emergence = register(IMPLANT_IDS.emergence, "Emergence profile reference · simplified", "other", "emergence_reference", emergenceRoot, { implantParentObjectId: abutment.id }); emergence.transform.position = [0, 0, 0.5];
  const channelRoot = new THREE.Group(); channelRoot.name = "Screw channel axis reference";
  const channelMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 7, 12, 1, true), new THREE.MeshStandardMaterial({ color: "#63aeb0", transparent: true, opacity: 0.45, side: THREE.DoubleSide })); channelMesh.rotation.x = Math.PI / 2; channelMesh.position.z = 1; channelMesh.userData.prostheiaMeshId = "screw-channel-axis-marker"; channelRoot.add(channelMesh);
  const screwChannel = register(IMPLANT_IDS.screwChannel, "Screw channel axis reference · visual only", "other", "screw_channel", channelRoot, { implantParentObjectId: restoration.id }); screwChannel.transform.position = [0, 0, 2.5];
  const riskRoot = new THREE.Group(); riskRoot.name = "Synthetic reference structure";
  const torus = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.25, 6, 28), new THREE.MeshStandardMaterial({ color: "#d58a69", transparent: true, opacity: 0.7 })); torus.position.z = -11; torus.userData.prostheiaMeshId = "synthetic-risk-ring"; riskRoot.add(torus);
  const risk = register(IMPLANT_IDS.risk, "Synthetic reference region · not diagnostic anatomy", "other", "synthetic_risk", riskRoot, { editable: false });
  useImplantStore.getState().configure({ ...useImplantStore.getState(), selectedDefinitionId: definition.id, fixtureIds: [fixture.id] }, false);
  const objects = [site, risk, reference, fixture, scanBody, abutment, restoration, emergence, screwChannel];
  useWorkspaceStore.getState().initializeWorkspace(mode, objects);
  useWorkspaceStore.getState().select(fixture.id);
  return objects.map((object) => object.id);
}

export function addImplantFixture() {
  const state = useImplantStore.getState();
  const definition = IMPLANT_FIXTURES.find((entry) => entry.id === state.selectedDefinitionId) ?? IMPLANT_FIXTURES[0];
  const nextIndex = Math.max(1, ...state.fixtureIds.map((entry) => Number(entry.match(/-(\d+)$/)?.[1] ?? 1))) + 1;
  const id = cadObjectId(`implant-training-fixture-${nextIndex}`);
  const name = `${definition.name} · ${nextIndex}`;
  const object = createSyntheticImplantFixture(definition.diameterMm, definition.lengthMm);
  const metadata: CadObjectMetadata = { id, name, role: "implant", editable: true, syntheticMesh: true, transform: { ...zero, position: [nextIndex * 4, 0, 0] }, visible: true, opacity: 1, implantPart: "fixture", implantDefinitionId: definition.id, implantDiameterMm: definition.diameterMm, implantLengthMm: definition.lengthMm, implantDepthMm: definition.lengthMm, implantReference: false };
  useHistoryStore.getState().execute(new AddImplantFixtureCommand(metadata, object));
  useWorkspaceStore.getState().select(id);
  return id;
}
