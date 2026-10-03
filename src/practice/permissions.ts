import type { PracticeToolId, PracticeStep } from "./types";
import type { CadShortcut } from "@/cad/engine/shortcuts";
import { usePracticeSessionStore } from "./session-store";

export const TOOL_LABELS: Record<PracticeToolId, string> = { select: "Select", move: "Move", rotate: "Rotate", scale: "Scale", sculpt: "Sculpt", "mesh-edit": "Mesh Edit", analysis: "Analysis", articulator: "Virtual Articulator", camera: "Camera", scene: "Scene" };
export function canUsePracticeTool(step: PracticeStep | null | undefined, tool: PracticeToolId) { return !step || step.allowedTools.includes(tool); }
export function toolForShortcut(shortcut: CadShortcut): PracticeToolId | null {
  if (shortcut === "move") return "move";
  if (shortcut === "rotate") return "rotate";
  if (shortcut === "scale") return "scale";
  if (shortcut === "reserved-delete") return "mesh-edit";
  if (shortcut === "toggle-visibility" || shortcut === "show-all") return "scene";
  return null;
}
export function canRunShortcut(step: PracticeStep | null | undefined, shortcut: CadShortcut) {
  const tool = toolForShortcut(shortcut);
  return !tool || canUsePracticeTool(step, tool);
}
export function getActivePracticeStep() {
  const session = usePracticeSessionStore.getState().session;
  const lesson = usePracticeSessionStore.getState().lesson;
  return session && lesson ? lesson.steps.find((step) => step.id === session.currentStepId) ?? null : null;
}
