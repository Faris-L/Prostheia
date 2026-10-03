import { create } from "zustand";

export type SaveStatus = "clean" | "dirty" | "saving" | "saved" | "save_failed";
type SaveState = {
  status: SaveStatus;
  hasUnsavedChanges: boolean;
  revision: number;
  lastRecoveryAt: number | null;
  lastCloudRevision: string | null;
  errorMessage: string | null;
  markDirty: () => void;
  markSaving: () => void;
  markLocallySaved: (timestamp: number) => void;
  markSaveFailed: (message: string) => void;
  markCloudSaved: (revisionId: string) => void;
  markClean: () => void;
};

export const useSaveStore = create<SaveState>((set) => ({
  status: "clean", hasUnsavedChanges: false, revision: 0, lastRecoveryAt: null, lastCloudRevision: null, errorMessage: null,
  markDirty: () => set((state) => ({ status: "dirty", hasUnsavedChanges: true, revision: state.revision + 1, errorMessage: null })),
  markSaving: () => set({ status: "saving", hasUnsavedChanges: true, errorMessage: null }),
  markLocallySaved: (lastRecoveryAt) => set({ status: "saved", hasUnsavedChanges: true, lastRecoveryAt, errorMessage: null }),
  markSaveFailed: (errorMessage) => set({ status: "save_failed", hasUnsavedChanges: true, errorMessage }),
  markCloudSaved: (revisionId) => set((state) => ({ status: "saved", hasUnsavedChanges: false, lastCloudRevision: revisionId, errorMessage: null, revision: state.revision })),
  markClean: () => set({ status: "clean", hasUnsavedChanges: false, errorMessage: null }),
}));
