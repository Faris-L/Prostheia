import { AppShell } from "@/components/app-shell";
import { requireAdminUser } from "@/lib/auth/guards";

export default async function AdminPage() {
  await requireAdminUser();
  return <AppShell active="Admin"><div className="space-y-3"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">ADMINISTRATION</p><h1 className="text-3xl font-semibold tracking-tight">Admin access verified</h1><p className="max-w-xl text-sm leading-6 text-muted-foreground">Your account has the administrator role. Content management tools are planned for Phase 14.</p></div></AppShell>;
}
