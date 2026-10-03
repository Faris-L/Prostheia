import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { AttemptResultView } from "@/components/practice/learner-progress-pages";
import { loadAttemptDetail } from "@/practice/progress-data";

export default async function AttemptResultPage({ params }: { params: Promise<{ attemptId: string }> }) {
  const { attemptId } = await params;
  const detail = await loadAttemptDetail(attemptId);
  if (!detail) notFound();
  return <AppShell active="Progress"><AttemptResultView detail={detail} /></AppShell>;
}
