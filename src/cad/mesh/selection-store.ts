import { create } from "zustand";

type MeshSelectionState = {
  mode: "object" | "face";
  meshKey: string | null;
  faceIndices: number[];
  operation: "idle" | "processing" | "failed";
  error: string | null;
  setMode: (mode: "object" | "face") => void;
  selectMesh: (meshKey: string | null) => void;
  selectFace: (meshKey: string, faceIndex: number, extend: boolean) => void;
  clearSelection: () => void;
  setProcessing: (processing: boolean) => void;
  setError: (error: string | null) => void;
};

export const useMeshSelectionStore = create<MeshSelectionState>((set) => ({
  mode: "object", meshKey: null, faceIndices: [], operation: "idle", error: null,
  setMode: (mode) => set({ mode, faceIndices: mode === "face" ? [] : [], error: null }),
  selectMesh: (meshKey) => set({ meshKey, faceIndices: [] }),
  selectFace: (meshKey, faceIndex, extend) => set((state) => ({ meshKey, faceIndices: extend ? [...new Set([...state.faceIndices, faceIndex])] : [faceIndex], error: null })),
  clearSelection: () => set({ faceIndices: [], error: null }),
  setProcessing: (processing) => set({ operation: processing ? "processing" : "idle", error: null }),
  setError: (error) => set({ operation: error ? "failed" : "idle", error }),
}));
