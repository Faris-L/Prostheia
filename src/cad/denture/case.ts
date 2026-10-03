import * as THREE from "three";
import { cadObjectId, type CadObjectMetadata, type WorkspaceMode } from "../types";
import { geometryRegistry } from "../scene/geometry-registry";
import { useWorkspaceStore } from "../engine/workspace-store";
import { useCurveStore } from "../curves/store";
import { useAnalysisStore } from "../analysis/state";
import { useHistoryStore } from "../engine/history-store";
import { createDentureBase, createEdentulousArch, createOcclusalPlaneGuide, createSyntheticDentureTooth, fdiPositions, positionForTooth, type DentureArch } from "./geometry";
import { useDentureSetupStore } from "./setup-store";
import { usePartialDentureStore } from "../partial-denture/types";

export const DENTURE_IDS = { upperArch: "denture-upper-edentulous-arch", lowerArch: "denture-lower-edentulous-arch", upperBase: "denture-upper-base", lowerBase: "denture-lower-base", plane: "denture-occlusal-plane", upperMidline: "denture-upper-midline", lowerMidline: "denture-lower-midline", reference: "denture-synthetic-reference" } as const;
export const dentureToothId = (number: number) => `denture-tooth-${number}`;
const zeroTransform: CadObjectMetadata["transform"] = { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] };

function register(idValue: string, name: string, role: CadObjectMetadata["role"], editable: boolean, object: THREE.Object3D, extra: Partial<CadObjectMetadata> = {}) {
  const id = cadObjectId(idValue);
  object.name = name;
  geometryRegistry.register({ id, role, name, object, ownsResources: true });
  return { id, name, role, editable, syntheticMesh: true, transform: structuredClone(zeroTransform), visible: true, opacity: 1, geometryStats: geometryRegistry.stats(id), ...extra } satisfies CadObjectMetadata;
}

export function createDentureCase(mode: WorkspaceMode = "free-lab") {
  geometryRegistry.clear();
  useHistoryStore.getState().clear();
  useCurveStore.getState().replace({ curves: [], activeCurveId: null });
  useAnalysisStore.getState().clear();
  useDentureSetupStore.getState().reset();
  usePartialDentureStore.getState().reset();
  const objects: CadObjectMetadata[] = [];
  for (const arch of ["upper", "lower"] as DentureArch[]) {
    objects.push(register(arch === "upper" ? DENTURE_IDS.upperArch : DENTURE_IDS.lowerArch, `${arch === "upper" ? "Upper" : "Lower"} edentulous arch · synthetic`, arch === "upper" ? "maxilla" : "mandible", false, createEdentulousArch(arch), { dentureArch: arch, articulatorArch: arch, denturePart: "arch" }));
    const baseId = arch === "upper" ? DENTURE_IDS.upperBase : DENTURE_IDS.lowerBase;
    objects.push(register(baseId, `${arch === "upper" ? "Upper" : "Lower"} denture base · synthetic`, "denture_base", true, createDentureBase(arch), { dentureArch: arch, articulatorArch: arch, denturePart: "base" }));
    for (const number of fdiPositions(arch)) {
      const placement = positionForTooth(number, arch);
      objects.push(register(dentureToothId(number), `Artificial tooth · FDI ${number}`, "denture_tooth", true, createSyntheticDentureTooth(number), { transform: { ...zeroTransform, position: placement.position, rotation: placement.rotation }, dentalPosition: number, dentureArch: arch, articulatorArch: arch, denturePart: "tooth", toothSetId: "balanced" }));
    }
  }
  for (const arch of ["upper", "lower"] as DentureArch[]) {
    const id = arch === "upper" ? DENTURE_IDS.upperMidline : DENTURE_IDS.lowerMidline;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.24, 25, 0.16), new THREE.MeshBasicMaterial({ color: "#e94b72", transparent: true, opacity: 0.78, depthTest: false }));
    objects.push(register(id, `${arch === "upper" ? "Upper" : "Lower"} midline reference · editable`, "other", true, mesh, { transform: { ...zeroTransform, position: [0, 1.5, arch === "upper" ? -1.4 : 9.4] }, dentureArch: arch, denturePart: "midline", opacity: 0.78 }));
  }
  objects.push(register(DENTURE_IDS.plane, "Occlusal plane guide · editable", "other", true, createOcclusalPlaneGuide(), { transform: { ...zeroTransform, position: [0, 0, 4] }, denturePart: "plane", opacity: 0.5 }));
  const reference = new THREE.Group();
  reference.name = "Synthetic anterior setup example · temporary reference";
  for (const number of [11, 21, 12, 22, 13, 23]) {
    const placement = positionForTooth(number, "upper");
    const tooth = createSyntheticDentureTooth(number);
    tooth.position.set(...placement.position); tooth.rotation.set(...placement.rotation);
    tooth.traverse((child) => { if (child instanceof THREE.Mesh) { const material = child.material as THREE.MeshStandardMaterial; material.color.set("#58b8af"); material.transparent = true; material.opacity = 0.65; } });
    reference.add(tooth);
  }
  objects.push(register(DENTURE_IDS.reference, reference.name, "reference", false, reference, { editable: false, denturePart: "reference", opacity: 0.45, visible: false }));
  useWorkspaceStore.getState().initializeWorkspace(mode, objects);
  useWorkspaceStore.getState().select(cadObjectId(dentureToothId(11)));
  useCurveStore.getState().replace({ activeCurveId: null, curves: [
    { id: "denture-midline-upper", kind: "denture_midline", coordinateSpace: "object-local", objectId: cadObjectId(DENTURE_IDS.upperMidline), points: [[0, -12, 0], [0, 12, 0]], closed: false },
    { id: "denture-arch-guide-upper", kind: "denture_arch_guide", coordinateSpace: "object-local", objectId: cadObjectId(DENTURE_IDS.upperArch), points: [[-16, 2, -1], [-12, 10, -1], [-6, 14, -1], [0, 15, -1], [6, 14, -1], [12, 10, -1], [16, 2, -1]], closed: false },
    { id: "denture-midline-lower", kind: "denture_midline", coordinateSpace: "object-local", objectId: cadObjectId(DENTURE_IDS.lowerMidline), points: [[0, -12, 0], [0, 12, 0]], closed: false },
    { id: "denture-arch-guide-lower", kind: "denture_arch_guide", coordinateSpace: "object-local", objectId: cadObjectId(DENTURE_IDS.lowerArch), points: [[-16, 2, 9], [-12, 10, 9], [-6, 14, 9], [0, 15, 9], [6, 14, 9], [12, 10, 9], [16, 2, 9]], closed: false },
  ] });
  return objects.map((object) => object.id);
}
