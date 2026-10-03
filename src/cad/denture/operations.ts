import type { CadTransform } from "../types";
import { CompositeCommand, TransformCommand, cloneTransform } from "../engine/commands";
import { useHistoryStore } from "../engine/history-store";
import { useWorkspaceStore } from "../engine/workspace-store";
import { dentureToothId } from "./case";
import { toothIdsForSetup, type DentureSegment, type DentureSetupMode } from "./setup-store";
import type { DentureArch } from "./geometry";

function same(a: CadTransform, b: CadTransform) { return (["position", "rotation", "scale"] as const).every((key) => a[key].every((value, index) => value === b[key][index])); }

export function transformDentureGroup(input: { mode: DentureSetupMode; arch: DentureArch; segment: DentureSegment; selectedObjectId: string | null; axis: "x" | "y" | "z"; amount: number; rotate?: boolean }) {
  const selectedIds = input.mode === "arch"
    ? toothIdsForSetup(input.arch, input.segment).map(dentureToothId)
    : (() => {
      const number = useWorkspaceStore.getState().objects.find((object) => object.id === input.selectedObjectId)?.dentalPosition;
      const all = toothIdsForSetup(input.arch, "all");
      const selected = useWorkspaceStore.getState().objects.find((object) => object.id === input.selectedObjectId);
      if (!number || selected?.dentureArch !== input.arch) return toothIdsForSetup(input.arch, input.segment === "all" ? "anterior" : input.segment).map(dentureToothId);
      const index = all.indexOf(number);
      return all.slice(Math.max(0, index - 1), index + 2).map(dentureToothId);
    })();
  const targets = useWorkspaceStore.getState().objects.filter((object) => selectedIds.includes(object.id));
  if (!targets.length) return 0;
  const center = targets.reduce((sum, object) => [sum[0] + object.transform.position[0] / targets.length, sum[1] + object.transform.position[1] / targets.length, sum[2] + object.transform.position[2] / targets.length], [0, 0, 0]);
  const axisIndex = input.axis === "x" ? 0 : input.axis === "y" ? 1 : 2;
  const commands = targets.flatMap((object) => {
    const before = cloneTransform(object.transform);
    const after = cloneTransform(before);
    if (input.rotate) {
      after.rotation[2] += input.amount;
      const x = before.position[0] - center[0], y = before.position[1] - center[1];
      after.position[0] = center[0] + x * Math.cos(input.amount) - y * Math.sin(input.amount);
      after.position[1] = center[1] + x * Math.sin(input.amount) + y * Math.cos(input.amount);
    } else after.position[axisIndex] += input.amount;
    if (same(before, after)) return [];
    return [new TransformCommand(object.id, before, after, (id, transform) => useWorkspaceStore.getState().applyTransform(id, transform))];
  });
  if (commands.length) useHistoryStore.getState().execute(new CompositeCommand(input.mode === "arch" ? "Transform denture arch" : "Transform linked tooth chain", commands));
  return commands.length;
}
