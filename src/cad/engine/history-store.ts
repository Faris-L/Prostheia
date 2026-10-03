import { create } from "zustand";
import type { CadCommand } from "./commands";
import { useSaveStore } from "./save-store";
import { MAX_MESH_HISTORY_BYTES } from "../scene/geometry-registry";

type DisposableCommand = CadCommand & { historyBytes?: number; dispose?: () => void };

type HistoryState = {
  undoStack: CadCommand[];
  redoStack: CadCommand[];
  execute: (command: CadCommand) => void;
  recordApplied: (command: CadCommand) => void;
  undo: () => void;
  redo: () => void;
  clear: () => void;
};

export const useHistoryStore = create<HistoryState>((set, get) => ({
  undoStack: [], redoStack: [],
  execute: (command) => { command.execute(); get().recordApplied(command); },
  recordApplied: (command) => {
    const state = get();
    state.redoStack.forEach((entry) => (entry as DisposableCommand).dispose?.());
    const undoStack = [...state.undoStack, command];
    let bytes = undoStack.reduce((sum, entry) => sum + ((entry as DisposableCommand).historyBytes ?? 0), 0);
    while (undoStack.length > 12 || (bytes > MAX_MESH_HISTORY_BYTES && undoStack.length > 1)) {
      const removed = undoStack.shift() as DisposableCommand | undefined;
      if (!removed) break;
      bytes -= removed.historyBytes ?? 0;
      removed.dispose?.();
    }
    set({ undoStack, redoStack: [] });
    useSaveStore.getState().markDirty();
  },
  undo: () => {
    const command = get().undoStack.at(-1);
    if (!command) return;
    command.undo();
    set((state) => ({ undoStack: state.undoStack.slice(0, -1), redoStack: [...state.redoStack, command] }));
    useSaveStore.getState().markDirty();
  },
  redo: () => {
    const command = get().redoStack.at(-1);
    if (!command) return;
    if (command.redo) command.redo(); else command.execute();
    set((state) => ({ redoStack: state.redoStack.slice(0, -1), undoStack: [...state.undoStack, command] }));
    useSaveStore.getState().markDirty();
  },
  clear: () => { const state = get(); [...state.undoStack, ...state.redoStack].forEach((entry) => (entry as DisposableCommand).dispose?.()); set({ undoStack: [], redoStack: [] }); },
}));
