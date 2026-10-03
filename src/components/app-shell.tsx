import type { ReactNode } from "react";
import { getSessionSummary } from "@/lib/auth/guards";
import { AppShellClient } from "@/components/app-shell-client";

export async function AppShell({ children, active }: { children: ReactNode; active: string }) {
  const session = await getSessionSummary();
  return <AppShellClient active={active} displayName={session?.displayName ?? null} email={session?.email ?? null} isAdmin={!!session?.isAdmin}>{children}</AppShellClient>;
}
