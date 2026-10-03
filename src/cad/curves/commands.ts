import { useCurveStore } from "./store";
import type { CadCurve, CurveSnapshot } from "./types";
import { useHistoryStore } from "../engine/history-store";
import { CompositeCommand } from "../engine/commands";
import { regeneratePartialDenturePath } from "../partial-denture/operations";

export class CurveStateCommand {
  readonly label = "Edit CAD curve";
  constructor(private readonly before: CurveSnapshot, private readonly after: CurveSnapshot) {}
  execute() { useCurveStore.getState().replace(this.after); }
  redo() { this.execute(); }
  undo() { useCurveStore.getState().replace(this.before); }
}

export function editCurve(update: () => void) {
  const before = useCurveStore.getState();
  const beforeSnapshot = { curves: before.curves.map(cloneCurve), activeCurveId: before.activeCurveId };
  update();
  const after = useCurveStore.getState();
  const afterSnapshot = { curves: after.curves.map(cloneCurve), activeCurveId: after.activeCurveId };
  const geometryCommands = after.curves.flatMap((curve) => {
    if (curve.kind !== "framework_path") return [];
    const previous = beforeSnapshot.curves.find((item) => item.id === curve.id);
    if (previous && JSON.stringify(previous.points) === JSON.stringify(curve.points)) return [];
    const command = regeneratePartialDenturePath(curve.id, curve.points);
    return command ? [command] : [];
  });
  const curveCommand = new CurveStateCommand(beforeSnapshot, afterSnapshot);
  useHistoryStore.getState().recordApplied(geometryCommands.length ? new CompositeCommand("Edit Partial Denture component path", [curveCommand, ...geometryCommands]) : curveCommand);
}

function cloneCurve(curve: CadCurve): CadCurve { return { ...curve, points: curve.points.map((point) => [...point] as [number, number, number]) }; }
