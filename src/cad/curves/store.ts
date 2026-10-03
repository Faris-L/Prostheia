import { create } from "zustand";
import type { CadObjectId } from "../types";
import type { CadCurve, CurveSnapshot } from "./types";

type CurveState = CurveSnapshot & {
  active: (objectId: CadObjectId, kind?: CadCurve["kind"]) => CadCurve | undefined;
  addPoint: (objectId: CadObjectId, point: [number, number, number], curveId?: string) => string;
  movePoint: (objectId: CadObjectId, index: number, point: [number, number, number]) => void;
  close: (objectId: CadObjectId) => boolean;
  clearObject: (objectId: CadObjectId) => void;
  removeCurve: (curveId: string) => void;
  replace: (snapshot: CurveSnapshot) => void;
  setKind: (curveId: string, kind: CadCurve["kind"]) => void;
  setActiveCurve: (curveId: string | null) => void;
};

const cloneCurve = (curve: CadCurve): CadCurve => ({ ...curve, points: curve.points.map((point) => [...point] as [number, number, number]) });
const pointIsValid = (point: [number, number, number]) => point.length === 3 && point.every(Number.isFinite);

export const useCurveStore = create<CurveState>((set, get) => ({
  curves: [], activeCurveId: null,
  active: (objectId, kind) => get().curves.find((curve) => curve.objectId === objectId && (kind === undefined || curve.kind === kind)),
  addPoint: (objectId, point, curveId) => {
    if (!pointIsValid(point)) throw new Error("Curve point coordinates must be finite.");
    const curve = get().curves.find((item) => item.id === curveId) ?? get().curves.find((item) => item.objectId === objectId && !item.closed && item.id === get().activeCurveId);
    if (curve && curve.objectId !== objectId) throw new Error("A curve cannot move to an unrelated CAD object.");
    const id = curve?.id ?? `margin-${objectId}`;
    set((state) => ({ curves: curve ? state.curves.map((item) => item.id === id ? { ...item, points: [...item.points, [...point]], closed: false } : item) : [...state.curves, { id, kind: "margin", coordinateSpace: "object-local", objectId, points: [[...point]], closed: false }], activeCurveId: id }));
    return id;
  },
  movePoint: (objectId, index, point) => {
    if (!pointIsValid(point)) throw new Error("Curve point coordinates must be finite.");
    const curve = get().curves.find((item) => item.objectId === objectId && item.id === get().activeCurveId);
    if (!curve || !Number.isInteger(index) || index < 0 || index >= curve.points.length) throw new Error("Choose an existing point on the active curve.");
    set((state) => ({ curves: state.curves.map((item) => item.id === curve.id ? { ...item, points: item.points.map((existing, pointIndex) => pointIndex === index ? [...point] : existing) } : item) }));
  },
  close: (objectId) => {
    const curve = get().curves.find((item) => item.objectId === objectId && item.id === get().activeCurveId);
    if (!curve || curve.closed || curve.points.length < 3) return false;
    set((state) => ({ curves: state.curves.map((item) => item.id === curve.id ? { ...item, closed: true } : item) }));
    return true;
  },
  clearObject: (objectId) => set((state) => ({ curves: state.curves.filter((curve) => curve.objectId !== objectId), activeCurveId: state.curves.some((curve) => curve.id === state.activeCurveId && curve.objectId !== objectId) ? state.activeCurveId : null })),
  removeCurve: (curveId) => set((state) => ({ curves: state.curves.filter((curve) => curve.id !== curveId), activeCurveId: state.activeCurveId === curveId ? null : state.activeCurveId })),
  replace: (snapshot) => set({ curves: snapshot.curves.map(cloneCurve), activeCurveId: snapshot.activeCurveId }),
  setKind: (curveId, kind) => set((state) => ({ curves: state.curves.map((curve) => curve.id === curveId ? { ...curve, kind } : curve) })),
  setActiveCurve: (activeCurveId) => set({ activeCurveId }),
}));

export function curveSnapshot(): CurveSnapshot {
  const state = useCurveStore.getState();
  return { curves: state.curves.map(cloneCurve), activeCurveId: state.activeCurveId };
}

export function validateClosedCurve(curve: CadCurve | undefined, label = "Margin Line") {
  if (!curve) return { valid: false, reason: `No ${label} curve is defined.` };
  if (curve.points.length < 3) return { valid: false, reason: `A closed ${label} needs at least three surface points.` };
  if (!curve.closed) return { valid: false, reason: `The ${label} is still open. Close the loop before Design Check.` };
  if (curve.points.some((point) => !pointIsValid(point))) return { valid: false, reason: "The margin contains invalid point coordinates." };
  return { valid: true, reason: "The margin is closed and has at least three points." };
}
