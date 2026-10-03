import { AppShell } from "@/components/app-shell";
import { PracticePage } from "@/components/learner-pages";
import { loadPracticeCatalog } from "@/practice/database-catalog";
import { loadLearnerProgress } from "@/practice/progress-data";
export default async function Page() {
  const [lessons, progress] = await Promise.all([loadPracticeCatalog(), loadLearnerProgress().catch(() => null)]);
  return <AppShell active="Practice"><PracticePage lessons={lessons} progress={progress?.lessons ?? []} /></AppShell>;
}
