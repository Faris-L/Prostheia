import { AppShell } from "@/components/app-shell";
import { ProgressLoadError, ProgressRecordView } from "@/components/practice/learner-progress-pages";
import { loadLearnerProgress } from "@/practice/progress-data";
import type { LearnerProgress } from "@/practice/progress";
export default async function Page() {
  let progress: LearnerProgress | null = null;
  try {
    progress = await loadLearnerProgress();
  } catch { /* The learner facing error state is rendered below. */ }
  return <AppShell active="Progress">{progress ? <ProgressRecordView progress={progress} /> : <ProgressLoadError />}</AppShell>;
}
