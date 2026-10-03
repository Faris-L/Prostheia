"use client";

import { useInterfaceCopy } from "@/lib/i18n";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";

const STAGES: Record<string, string> = {
  inspect: "Inspect the restorative case",
  scan_body: "Identify the scan body",
  implant_axis: "Resolve the fixed restorative axis",
  emergence: "Review the emergence profile",
  abutment: "Inspect and adjust the abutment",
  crown_proposal: "Load the anatomical crown proposal",
  crown_position: "Position and adapt the crown",
  contacts: "Review proximal contacts",
  occlusion: "Review antagonist and occlusion",
  screw_access: "Inspect the screw-access path",
  final: "Final Design Check",
};

const PART_LABELS: Record<string, string> = {
  ridge_support: "Synthetic ridge support",
  gingiva: "Gingiva / local arch segment",
  neighbor: "Neighboring tooth",
  antagonist: "Opposing tooth",
  fixture: "Fixed implant reference",
  scan_body: "Indexed scan body",
  emergence: "Editable emergence profile",
  abutment: "Separate abutment concept",
  crown: "Editable anatomical crown",
  implant_axis: "Fixed implant axis",
  restorative_interface: "Restorative interface",
  screw_access: "Screw-access path",
  proximal_contact_review: "Proximal review guide",
  occlusion_review: "Occlusion review guide",
  crown_target: "Crown envelope reference",
};

const ROLE_STYLE: Record<string, string> = {
  SOURCE: "bg-sky-500/10 text-sky-700 dark:text-sky-300",
  DESIGN: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
  GUIDE: "bg-teal-500/10 text-teal-700 dark:text-teal-300",
  REFERENCE: "bg-violet-500/10 text-violet-700 dark:text-violet-300",
};

export function ImplantR7WorkflowPanel() {
  const tx = useInterfaceCopy();
  const objects = useWorkspaceStore((state) => state.objects);
  const selectedObjectId = useWorkspaceStore((state) => state.selectedObjectId);
  const packageId = objects.find((object) => object.casePackageId?.startsWith("r7-implant-"))?.casePackageId;
  if (!packageId) return null;
  const caseObjects = objects.filter((object) => object.casePackageId === packageId);
  const currentStage = caseObjects.find((object) => object.caseCheckpointId)?.caseCheckpointId ?? "inspect";
  const activeName = objects.find((object) => object.id === selectedObjectId)?.caseWorkflowMetadata?.implantRole;
  const objectName = (object: (typeof caseObjects)[number]) => {
    const role = String(object.caseWorkflowMetadata?.implantRole ?? object.caseObjectId ?? "");
    return PART_LABELS[role] ?? object.name;
  };
  const select = (id: (typeof caseObjects)[number]["id"]) => useWorkspaceStore.getState().select(id);

  return <section aria-label={tx("Implant restorative workflow")} className="flex min-h-11 shrink-0 flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border bg-card px-3 py-2 text-[10px]">
    <div className="flex min-w-40 flex-col">
      <strong className="font-semibold uppercase tracking-wide text-primary">{tx("Synthetic Training Implant System")}</strong>
      <span className="text-muted-foreground">{tx("Restorative CAD · case axis pre-defined")}</span>
    </div>
    <div className="flex min-w-40 flex-col">
      <span className="font-medium">{tx("Current stage")}</span>
      <span className="text-muted-foreground">{tx(STAGES[currentStage] ?? STAGES.inspect)}</span>
    </div>
    <div className="flex flex-1 flex-wrap items-center gap-1">
      {caseObjects.filter((object) => object.caseRole && PART_LABELS[String(object.caseWorkflowMetadata?.implantRole ?? "")]).map((object) => {
        const isSelected = object.id === selectedObjectId;
        return <button key={object.id} type="button" onClick={() => select(object.id)} aria-pressed={isSelected} className={`inline-flex items-center gap-1 rounded border border-border px-1.5 py-1 text-[9px] hover:bg-muted ${isSelected ? "ring-1 ring-primary" : ""}`}>
          <span className={`rounded px-1 font-semibold ${ROLE_STYLE[object.caseRole ?? ""] ?? ""}`}>{object.caseRole}</span>
          <span>{tx(objectName(object))}</span>
        </button>;
      })}
    </div>
    <span className="max-w-64 text-muted-foreground">{activeName ? `${tx("Selected")}: ${tx(PART_LABELS[String(activeName)] ?? String(activeName))}` : tx("Use shared CAD transforms, sculpt tools, and analysis controls for the selected design object.")}</span>
    <span className="w-full text-[9px] text-muted-foreground">{tx("Fixture position is supplied by the educational case. System identifiers are fictional; no commercial compatibility, biological validation, clinical approval, or manufacturing readiness is claimed.")}</span>
  </section>;
}
