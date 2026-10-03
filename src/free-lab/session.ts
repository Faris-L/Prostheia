import type { FreeLabWorkspaceConfig } from "./types";

const SESSION_PREFIX = "prostheia:free-lab-session:";

function createId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `fl-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createFreeLabSession(input: Omit<FreeLabWorkspaceConfig, "workspaceId" | "createdAt">): FreeLabWorkspaceConfig {
  return { ...input, workspaceId: createId(), createdAt: new Date().toISOString() };
}

export function writeFreeLabSession(config: FreeLabWorkspaceConfig) {
  if (typeof window !== "undefined") window.sessionStorage.setItem(`${SESSION_PREFIX}${config.workspaceId}`, JSON.stringify(config));
}

export function readFreeLabSession(workspaceId: string): FreeLabWorkspaceConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.sessionStorage.getItem(`${SESSION_PREFIX}${workspaceId}`);
    if (!value) return null;
    const parsed = JSON.parse(value) as Partial<FreeLabWorkspaceConfig>;
    if (parsed.workspaceId !== workspaceId || !["scenario", "import", "blank", "random"].includes(String(parsed.origin)) || typeof parsed.title !== "string" || typeof parsed.createdAt !== "string") return null;
    return parsed as FreeLabWorkspaceConfig;
  } catch { return null; }
}

export function clearFreeLabSession(workspaceId: string) {
  if (typeof window !== "undefined") window.sessionStorage.removeItem(`${SESSION_PREFIX}${workspaceId}`);
}
