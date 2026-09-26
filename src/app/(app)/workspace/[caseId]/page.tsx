import { WorkspaceLoader } from "@/components/cad-ui/workspace-loader";

export default async function WorkspacePage({ params }: { params: Promise<{ caseId: string }> }) {
  const { caseId } = await params;
  return <WorkspaceLoader caseId={caseId} />;
}
