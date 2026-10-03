import { describe, expect, it } from "vitest";
import { moveAnnotation, normalizedPoint, normalizedToPixels, pixelsToNormalized, validateAnnotations, type ScreenshotAnnotation } from "@/cad/screenshots/model";

const annotation: ScreenshotAnnotation = {
  id: "ann-1", type: "arrow", createdAt: "2026-09-28T12:00:00.000Z",
  payload: { x: 0.2, y: 0.3, endX: 0.8, endY: 0.7, color: "#f04444", visible: true },
};

describe("screenshot annotation coordinates and validation", () => {
  it("converts between pixels and normalized image coordinates at different resolutions", () => {
    const position = pixelsToNormalized(320, 180, 1280, 720);
    expect(position).toEqual({ x: 0.25, y: 0.25 });
    expect(normalizedToPixels(position.x, position.y, 2560, 1440)).toEqual({ x: 640, y: 360 });
    expect(normalizedPoint(420, 270, new DOMRect(100, 90, 640, 360))).toEqual({ x: 0.5, y: 0.5 });
  });

  it("moves both arrow endpoints while keeping coordinates normalized", () => {
    const moved = moveAnnotation(annotation, 0.1, -0.1).payload;
    expect(moved.x).toBeCloseTo(0.3, 8); expect(moved.y).toBeCloseTo(0.2, 8);
    expect(moved.endX).toBeCloseTo(0.9, 8); expect(moved.endY).toBeCloseTo(0.6, 8);
    expect(moveAnnotation(annotation, 1, 1).payload).toMatchObject({ x: 1, y: 1, endX: 1, endY: 1 });
  });

  it("rejects out-of-range coordinates, invalid type, overlong text, and duplicate IDs", () => {
    expect(() => validateAnnotations([{ ...annotation, payload: { ...annotation.payload, x: -0.01 } }])).toThrow();
    expect(() => validateAnnotations([{ ...annotation, type: "mesh" as ScreenshotAnnotation["type"] }])).toThrow();
    expect(() => validateAnnotations([{ ...annotation, type: "text", payload: { x: 0.2, y: 0.3, text: "x".repeat(241), color: "#ffffff" } }])).toThrow();
    expect(() => validateAnnotations([annotation, annotation])).toThrow();
  });
});
