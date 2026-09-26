import type { Database } from "@/types/database.types";

export type CadObjectId = string & { readonly __cadObjectId: unique symbol };
export type CadObjectRole = Database["public"]["Enums"]["cad_object_role"];
export type TransformMode = "select" | "translate" | "rotate" | "scale";
export type CameraMode = "perspective" | "orthographic";
export type CadTransform = {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: [number, number, number];
};
export type CadObjectMetadata = {
  id: CadObjectId;
  name: string;
  role: CadObjectRole;
  editable: boolean;
  transform: CadTransform;
  visible: boolean;
  opacity: number;
};
export type ViewPreset = "front" | "back" | "left" | "right" | "top" | "bottom" | "reset";
export type TranslationStep = "free" | 0.1 | 0.5 | 1;
export type RotationStep = "free" | 0.5 | 1 | 5;

export const cadObjectId = (value: string) => value as CadObjectId;
