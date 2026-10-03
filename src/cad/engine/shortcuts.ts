export type CadShortcut = "undo" | "redo" | "save" | "move" | "rotate" | "scale" | "toggle-visibility" | "show-all" | "reserved-delete" | "cancel-operation";

export function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || Boolean(target.closest("input, textarea, select, [contenteditable='true'], [role='textbox']"));
}

export function resolveCadShortcut(event: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "shiftKey" | "altKey">): CadShortcut | null {
  const key = event.key.toLowerCase();
  const command = event.ctrlKey || event.metaKey;
  if (command && !event.altKey && key === "z") return event.shiftKey ? "redo" : "undo";
  if (command && !event.altKey && key === "y") return "redo";
  if (command && !event.altKey && key === "s") return "save";
  if (!command && !event.altKey && event.shiftKey && key === "h") return "show-all";
  if (command || event.altKey || event.shiftKey) return null;
  if (key === "g") return "move";
  if (key === "r") return "rotate";
  if (key === "s") return "scale";
  if (key === "h") return "toggle-visibility";
  if (key === "delete" || key === "backspace") return "reserved-delete";
  if (key === "escape") return "cancel-operation";
  return null;
}
