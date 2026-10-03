import { WorkspaceLoader } from "@/components/cad-ui/workspace-loader";

export default async function FreeLabWorkspacePage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = await params;
  return <WorkspaceLoader caseId={workspaceId} freeLabSessionId={workspaceId} />;
}
