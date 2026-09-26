"use client";

import dynamic from "next/dynamic";

const CadWorkspace = dynamic(() => import("./cad-workspace").then((module) => module.CadWorkspace), {
  ssr: false,
  loading: () => <div className="grid h-dvh place-items-center bg-background text-xs text-muted-foreground">Loading CAD workspace…</div>,
});

export function WorkspaceLoader({ caseId }: { caseId: string }) {
  return <CadWorkspace caseId={caseId} />;
}
