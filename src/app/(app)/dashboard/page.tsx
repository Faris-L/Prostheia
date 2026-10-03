import { AppShell } from "@/components/app-shell";
import { DashboardProgressView, ProgressLoadError } from "@/components/practice/learner-progress-pages";
import { loadLearnerProgress } from "@/practice/progress-data";
import type { LearnerProgress } from "@/practice/progress";
export default async function Page() {
  let progress: LearnerProgress | null = null;
  try {
    progress = await loadLearnerProgress();
  } catch { /* The learner facing error state is rendered below. */ }
  return <AppShell active="Dashboard">{progress ? <DashboardProgressView progress={progress} /> : <ProgressLoadError />}</AppShell>;
}
