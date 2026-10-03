import { createBiteSplintCase } from "../splint/case";
import { generateBiteSplint } from "../splint/operations";
import { useHistoryStore } from "../engine/history-store";
import { useWorkspaceStore } from "../engine/workspace-store";
import { cadObjectId, type WorkspaceMode } from "../types";

/** Reuses the real Phase 20 synthetic splint mesh and the shared upper/lower case. */
export function createArticulatorCase(mode: WorkspaceMode = "free-lab") {
  const ids = createBiteSplintCase(mode);
  const splintId = generateBiteSplint();
  useHistoryStore.getState().clear();
  useWorkspaceStore.getState().select(cadObjectId(ids[0]));
  return [...ids, splintId];
}
