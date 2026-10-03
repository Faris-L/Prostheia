import { create } from "zustand";
import { demoObjects } from "../scene/demo-objects";
import type { CadObjectId, CadObjectMetadata, CadTransform, CameraMode, RotationStep, TransformMode, TranslationStep, WorkspaceMode } from "../types";

export type WorkspaceSnapshot = Pick<WorkspaceState, "objects" | "selectedObjectId" | "transformMode" | "cameraMode" | "translationStep" | "rotationStep">;
type TransformOperation = { id: CadObjectId; before: CadTransform } | null;

type WorkspaceState = {
  objects: CadObjectMetadata[];
  mode: WorkspaceMode;
  selectedObjectId: CadObjectId | null;
  transformMode: TransformMode;
  cameraMode: CameraMode;
  translationStep: TranslationStep;
  rotationStep: RotationStep;
  transformDragging: boolean;
  transformOperation: TransformOperation;
  select: (id: CadObjectId | null) => void;
  setTransformMode: (mode: TransformMode) => void;
  setCameraMode: (mode: CameraMode) => void;
  setTranslationStep: (step: TranslationStep) => void;
  setRotationStep: (step: RotationStep) => void;
  previewTransform: (id: CadObjectId, transform: CadTransform) => void;
  applyTransform: (id: CadObjectId, transform: CadTransform) => void;
  beginTransformOperation: (id: CadObjectId, before: CadTransform) => void;
  finishTransformOperation: () => TransformOperation;
  cancelTransformOperation: () => TransformOperation;
  previewOpacity: (id: CadObjectId, opacity: number) => void;
  applyVisibility: (changes: { id: CadObjectId; visible: boolean }[]) => void;
  applyOpacity: (id: CadObjectId, opacity: number) => void;
  addImportedObject: (object: CadObjectMetadata) => void;
  initializeWorkspace: (mode: WorkspaceMode, objects?: CadObjectMetadata[]) => void;
  removeObject: (id: CadObjectId) => void;
  setGeometryStats: (id: CadObjectId, stats: NonNullable<CadObjectMetadata["geometryStats"]>) => void;
  restoreSnapshot: (snapshot: WorkspaceSnapshot) => void;
  resetDemo: () => void;
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  objects: demoObjects.map((object) => ({ ...object, transform: { position: [...object.transform.position], rotation: [...object.transform.rotation], scale: [...object.transform.scale] } })),
  mode: "developer",
  selectedObjectId: null,
  transformMode: "select",
  cameraMode: "perspective",
  translationStep: "free",
  rotationStep: "free",
  transformDragging: false,
  transformOperation: null,
  select: (id) => set({ selectedObjectId: id }),
  setTransformMode: (mode) => set({ transformMode: mode }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  setTranslationStep: (step) => set({ translationStep: step }),
  setRotationStep: (step) => set({ rotationStep: step }),
  previewTransform: (id, transform) => set((state) => ({ objects: state.objects.map((object) => object.id === id ? { ...object, transform } : object) })),
  applyTransform: (id, transform) => set((state) => ({ objects: state.objects.map((object) => object.id === id ? { ...object, transform: cloneTransform(transform) } : object) })),
  beginTransformOperation: (id, before) => set({ transformDragging: true, transformOperation: { id, before: cloneTransform(before) } }),
  finishTransformOperation: () => { let operation: TransformOperation = null; set((state) => { operation = state.transformOperation; return { transformDragging: false, transformOperation: null }; }); return operation; },
  cancelTransformOperation: () => { let operation: TransformOperation = null; set((state) => { operation = state.transformOperation; if (state.transformOperation) return { transformDragging: false, transformOperation: null, objects: state.objects.map((object) => object.id === state.transformOperation?.id ? { ...object, transform: cloneTransform(state.transformOperation.before) } : object) }; return { transformDragging: false }; }); return operation; },
  previewOpacity: (id, opacity) => set((state) => ({ objects: state.objects.map((object) => object.id === id ? { ...object, opacity: Math.max(0.15, Math.min(1, opacity)) } : object) })),
  applyVisibility: (changes) => { const byId = new Map(changes.map(({ id, visible }) => [id, visible])); set((state) => ({ objects: state.objects.map((object) => byId.has(object.id) ? { ...object, visible: byId.get(object.id)! } : object) })); },
  applyOpacity: (id, opacity) => set((state) => ({ objects: state.objects.map((object) => object.id === id ? { ...object, opacity: Math.max(0.15, Math.min(1, opacity)) } : object) })),
  addImportedObject: (object) => set((state) => ({ objects: [...state.objects, { ...object, transform: cloneTransform(object.transform) }] })),
  initializeWorkspace: (mode, objects = []) => set({ mode, objects: cloneObjects(objects), selectedObjectId: null, transformMode: "select", cameraMode: "perspective", translationStep: "free", rotationStep: "free", transformDragging: false, transformOperation: null }),
  removeObject: (id) => set((state) => ({ objects: state.objects.filter((object) => object.id !== id), selectedObjectId: state.selectedObjectId === id ? null : state.selectedObjectId })),
  setGeometryStats: (id, geometryStats) => set((state) => ({ objects: state.objects.map((object) => object.id === id ? { ...object, geometryStats } : object) })),
  restoreSnapshot: (snapshot) => set({ ...snapshot, objects: snapshot.objects.map((object) => ({ ...object, transform: cloneTransform(object.transform) })), transformDragging: false, transformOperation: null }),
  resetDemo: () => set({ objects: cloneObjects(demoObjects), selectedObjectId: null, transformMode: "select", cameraMode: "perspective", translationStep: "free", rotationStep: "free", transformDragging: false, transformOperation: null }),
}));

function cloneTransform(transform: CadTransform): CadTransform { return { position: [...transform.position], rotation: [...transform.rotation], scale: [...transform.scale] }; }
function cloneObjects(objects: CadObjectMetadata[]) { return objects.map((object) => ({ ...object, transform: cloneTransform(object.transform) })); }
