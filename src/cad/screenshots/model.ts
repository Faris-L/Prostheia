import type { CameraSnapshot } from "@/cad/camera/types";

export type AnnotationKind = "arrow" | "circle" | "text" | "highlight";
export type AnnotationPayload = {
  x: number;
  y: number;
  endX?: number;
  endY?: number;
  text?: string;
  color: string;
  visible?: boolean;
};
export type ScreenshotAnnotation = {
  id: string;
  type: AnnotationKind;
  payload: AnnotationPayload;
  createdAt: string;
};
export type CapturedScreenshot = {
  blob: Blob;
  width: number;
  height: number;
  camera: CameraSnapshot;
};

export const MAX_SCREENSHOT_BYTES = 12 * 1024 * 1024;
export const MAX_ANNOTATIONS = 100;
export const MAX_ANNOTATION_TEXT = 240;
export const ANNOTATION_COLORS = ["#f04444", "#f5c542", "#24b58a", "#3985f7", "#ffffff"] as const;

export function normalizedPoint(clientX: number, clientY: number, rect: DOMRect) {
  return {
    x: Math.min(1, Math.max(0, (clientX - rect.left) / rect.width)),
    y: Math.min(1, Math.max(0, (clientY - rect.top) / rect.height)),
  };
}

export function pixelsToNormalized(x: number, y: number, width: number, height: number) {
  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) throw new Error("Image coordinates need finite values and positive dimensions.");
  return { x: Math.min(1, Math.max(0, x / width)), y: Math.min(1, Math.max(0, y / height)) };
}

export function normalizedToPixels(x: number, y: number, width: number, height: number) {
  if (![x, y, width, height].every(Number.isFinite) || x < 0 || x > 1 || y < 0 || y > 1 || width <= 0 || height <= 0) throw new Error("Normalized image coordinates must be in range and dimensions positive.");
  return { x: x * width, y: y * height };
}

export function validateAnnotation(annotation: ScreenshotAnnotation) {
  if (!annotation.id || !["arrow", "circle", "text", "highlight"].includes(annotation.type)) throw new Error("Invalid annotation type or ID.");
  const values = [annotation.payload.x, annotation.payload.y, annotation.payload.endX, annotation.payload.endY].filter((value): value is number => value !== undefined);
  if (values.some((value) => !Number.isFinite(value) || value < 0 || value > 1)) throw new Error("Annotation coordinates must be normalized between 0 and 1.");
  if (annotation.payload.text !== undefined && annotation.payload.text.length > MAX_ANNOTATION_TEXT) throw new Error(`Annotation text is limited to ${MAX_ANNOTATION_TEXT} characters.`);
  if (!/^#[0-9a-f]{6}$/i.test(annotation.payload.color)) throw new Error("Invalid annotation color.");
  if ((annotation.type === "arrow" || annotation.type === "circle" || annotation.type === "highlight") && (annotation.payload.endX === undefined || annotation.payload.endY === undefined)) throw new Error("This annotation needs a start and end point.");
  return annotation;
}

export function validateAnnotations(annotations: ScreenshotAnnotation[]) {
  if (annotations.length > MAX_ANNOTATIONS) throw new Error(`A screenshot can have up to ${MAX_ANNOTATIONS} annotations.`);
  const ids = new Set<string>();
  for (const item of annotations) {
    validateAnnotation(item);
    if (ids.has(item.id)) throw new Error("Annotation IDs must be unique.");
    ids.add(item.id);
  }
  return annotations;
}

export function moveAnnotation(annotation: ScreenshotAnnotation, dx: number, dy: number): ScreenshotAnnotation {
  const clamp = (value: number) => Math.min(1, Math.max(0, value));
  const payload = { ...annotation.payload, x: clamp(annotation.payload.x + dx), y: clamp(annotation.payload.y + dy) };
  if (payload.endX !== undefined) payload.endX = clamp(payload.endX + dx);
  if (payload.endY !== undefined) payload.endY = clamp(payload.endY + dy);
  return { ...annotation, payload };
}
