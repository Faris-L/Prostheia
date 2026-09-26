import { create } from "zustand";
import { demoObjects } from "../scene/demo-objects";
import type { CadObjectId, CadObjectMetadata, CadTransform, CameraMode, RotationStep, TransformMode, TranslationStep } from "../types";

type WorkspaceState = {
  objects: CadObjectMetadata[];
  selectedObjectId: CadObjectId | null;
  transformMode: TransformMode;
  cameraMode: CameraMode;
  translationStep: TranslationStep;
  rotationStep: RotationStep;
  transformDragging: boolean;
  select: (id: CadObjectId | null) => void;
  setTransformMode: (mode: TransformMode) => void;
  setCameraMode: (mode: CameraMode) => void;
  setTranslationStep: (step: TranslationStep) => void;
  setRotationStep: (step: RotationStep) => void;
  setTransformDragging: (dragging: boolean) => void;
  setTransform: (id: CadObjectId, transform: CadTransform) => void;
  setVisible: (id: CadObjectId, visible: boolean) => void;
  setOpacity: (id: CadObjectId, opacity: number) => void;
  isolate: (id: CadObjectId | null) => void;
  showAll: () => void;
  resetDemo: () => void;
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  objects: demoObjects.map((object) => ({ ...object, transform: { position: [...object.transform.position], rotation: [...object.transform.rotation], scale: [...object.transform.scale] } })),
  selectedObjectId: null,
  transformMode: "select",
  cameraMode: "perspective",
  translationStep: "free",
  rotationStep: "free",
  transformDragging: false,
  select: (id) => set({ selectedObjectId: id }),
  setTransformMode: (mode) => set({ transformMode: mode }),
  setCameraMode: (mode) => set({ cameraMode: mode }),
  setTranslationStep: (step) => set({ translationStep: step }),
  setRotationStep: (step) => set({ rotationStep: step }),
  setTransformDragging: (transformDragging) => set({ transformDragging }),
  setTransform: (id, transform) => set((state) => ({ objects: state.objects.map((object) => object.id === id ? { ...object, transform } : object) })),
  setVisible: (id, visible) => set((state) => ({ objects: state.objects.map((object) => object.id === id ? { ...object, visible } : object) })),
  setOpacity: (id, opacity) => set((state) => ({ objects: state.objects.map((object) => object.id === id ? { ...object, opacity: Math.max(0.15, Math.min(1, opacity)) } : object) })),
  isolate: (id) => set((state) => ({ objects: state.objects.map((object) => ({ ...object, visible: id === null || object.id === id })) })),
  showAll: () => set((state) => ({ objects: state.objects.map((object) => ({ ...object, visible: true })) })),
  resetDemo: () => set({ objects: demoObjects, selectedObjectId: null, transformMode: "select", cameraMode: "perspective", translationStep: "free", rotationStep: "free", transformDragging: false }),
}));
