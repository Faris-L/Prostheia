import { AppShell } from "@/components/app-shell";
import { FreeLabPage } from "@/components/learner-pages";
import { loadFreeLabScenarios } from "@/free-lab/database-scenarios";
import { requireAuthenticatedUser } from "@/lib/auth/guards";
import { requireAdminUser } from "@/lib/auth/guards";
export default async function Page({ searchParams }: { searchParams: Promise<{ previewScenario?: string }> }) {
  await requireAuthenticatedUser();
  const { previewScenario } = await searchParams;
  if (previewScenario) await requireAdminUser();
  const scenarios = await loadFreeLabScenarios(previewScenario);
  return <AppShell active="Free Lab"><FreeLabPage scenarios={scenarios} previewScenarioId={previewScenario} /></AppShell>;
}
