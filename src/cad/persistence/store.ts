import { create } from "zustand";
import type { FreeLabWorkspaceConfig } from "@/free-lab/types";

export type CloudObjectBinding = { caseObjectId: string; objectVersionId: string; geometryRevision: number; versionNumber: number };
type PersistenceState = {
  caseId: string | null;
  title: string;
  sourceType: "scenario" | "import" | "blank";
  sourceSnapshot: Record<string, unknown>;
  headRevisionId: string | null;
  loadedRevisionId: string | null;
  revisionNumber: number;
  bindings: Record<string, CloudObjectBinding>;
  setNewSession: (session: FreeLabWorkspaceConfig) => void;
  setLoadedCase: (value: Pick<PersistenceState, "caseId" | "title" | "sourceType" | "sourceSnapshot" | "headRevisionId" | "loadedRevisionId" | "revisionNumber" | "bindings">) => void;
  applySave: (value: { caseId: string; title: string; revisionId: string; revisionNumber: number; bindings: Record<string, CloudObjectBinding> }) => void;
  setLoadedRevision: (id: string) => void;
  reset: () => void;
};

const initial = { caseId: null, title: "Untitled case", sourceType: "blank" as const, sourceSnapshot: {}, headRevisionId: null, loadedRevisionId: null, revisionNumber: 0, bindings: {} };

export const useCasePersistenceStore = create<PersistenceState>((set) => ({
  ...initial,
  setNewSession: (session) => set({ ...initial, title: session.title, sourceType: session.origin === "scenario" || session.origin === "random" ? "scenario" : session.origin === "import" ? "import" : "blank", sourceSnapshot: { origin: session.origin, workspaceId: session.workspaceId, category: session.category, difficulty: session.difficulty, scenarioId: session.scenarioId, casePackageId: session.casePackageId, checkpointId: session.checkpointId, caseBrief: session.caseBrief, materialPreset: session.materialPreset } }),
  setLoadedCase: (value) => set(value),
  applySave: ({ caseId, title, revisionId, revisionNumber, bindings }) => set((state) => ({ ...state, caseId, title, headRevisionId: revisionId, loadedRevisionId: revisionId, revisionNumber, bindings })),
  setLoadedRevision: (loadedRevisionId) => set({ loadedRevisionId }),
  reset: () => set(initial),
}));
