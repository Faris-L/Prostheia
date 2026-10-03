import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { demoObjects } from "@/cad/scene/demo-objects";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import { PRACTICE_LESSONS } from "@/practice/lessons";
import { usePracticeSessionStore } from "@/practice/session-store";
import type { PracticeLesson, PracticeStep } from "@/practice/types";
import { guideCheckState, PracticeGuidancePanel } from "@/practice/practice-guidance-panel";
import { defaultRightPanelMode, RightPanelModeControl, ToolCategoryBar, WorkflowProgress, toolGroupForPracticeStep, workflowItems, type RightPanelMode, type ToolGroup } from "@/components/cad-ui/workspace-ux";
import { validationFingerprint } from "@/practice/validators";
import type { ValidationResult } from "@/practice/types";

afterEach(() => {
  cleanup();
  useWorkspaceStore.getState().resetDemo();
  usePracticeSessionStore.setState({ locale: "en", session: null, lesson: null });
});

describe("CAD workspace learning UX", () => {
  it("opens Practice on the Learning Guide and makes Properties a secondary inspector", () => {
    expect(defaultRightPanelMode(true)).toBe("guide");
    expect(defaultRightPanelMode(false)).toBe("properties");

    function PanelModeProbe() {
      const [mode, setMode] = useState<RightPanelMode>(defaultRightPanelMode(true));
      return <>
        <RightPanelModeControl practice mode={mode} locale="en" onOpenProperties={() => setMode("properties")} onBackToTask={() => setMode("guide")} />
        <output data-testid="sidebar-mode">{mode}</output>
      </>;
    }

    render(<PanelModeProbe />);
    expect(screen.getByText("Learning Guide")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Properties" }));
    expect(screen.getByTestId("sidebar-mode").textContent).toBe("properties");
    fireEvent.click(screen.getByRole("button", { name: "Back to task" }));
    expect(screen.getByTestId("sidebar-mode").textContent).toBe("guide");
  });

  it("keeps Free Lab on the Properties inspector without Practice controls and supports Serbian labels", () => {
    render(<RightPanelModeControl practice={false} mode="properties" locale="en" onOpenProperties={vi.fn()} onBackToTask={vi.fn()} />);
    expect(screen.getByText("Properties")).toBeTruthy();
    expect(screen.queryByText("Learning Guide")).toBeNull();
    expect(screen.queryByRole("button", { name: "Back to task" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Check step" })).toBeNull();
    cleanup();

    render(<RightPanelModeControl practice mode="guide" locale="sr" onOpenProperties={vi.fn()} onBackToTask={vi.fn()} />);
    expect(screen.getByText("Vodič za učenje")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Svojstva" })).toBeTruthy();
  });

  it("localizes the Practice inspector and guide actions in Serbian", () => {
    function SerbianPanelModeProbe() {
      const [mode, setMode] = useState<RightPanelMode>("guide");
      return <RightPanelModeControl practice mode={mode} locale="sr" onOpenProperties={() => setMode("properties")} onBackToTask={() => setMode("guide")} />;
    }

    render(<SerbianPanelModeProbe />);
    expect(screen.getByText("Vodič za učenje")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Svojstva" }));
    expect(screen.getByRole("button", { name: "Nazad na zadatak" })).toBeTruthy();

    cleanup();
    usePracticeSessionStore.setState({ locale: "sr" });
    usePracticeSessionStore.getState().initialize(PRACTICE_LESSONS[0]);
    render(<PracticeGuidancePanel lesson={PRACTICE_LESSONS[0]} preview />);
    expect(screen.getByRole("button", { name: "Proveri korak" })).toBeTruthy();
    expect(screen.getByText("Napredak")).toBeTruthy();
  });

  it("keeps current, upcoming, and completed checklist states distinct", () => {
    expect(guideCheckState(false, true)).toBe("current");
    expect(guideCheckState(false, false)).toBe("upcoming");
    expect(guideCheckState(true, false)).toBe("complete");
  });

  it("derives ordered workflow progress from any lesson's real step data", () => {
    const source = PRACTICE_LESSONS[0];
    const template = source.steps[0];
    const lesson: PracticeLesson = {
      ...source,
      steps: [
        { ...template, id: "ux-progress-1", order: 1 },
        { ...template, id: "ux-progress-2", order: 2 },
        { ...template, id: "ux-progress-3", order: 3 },
      ],
    };
    const [complete, current, upcoming] = lesson.steps;
    const items = workflowItems(lesson, current.id, [complete.id]);

    expect(items.map(({ id }) => id)).toEqual([...lesson.steps].sort((a, b) => a.order - b.order).map(({ id }) => id));
    expect(items.find((item) => item.id === complete.id)?.status).toBe("complete");
    expect(items.find((item) => item.id === current.id)?.status).toBe("current");
    expect(items.find((item) => item.id === upcoming.id)?.status).toBe("upcoming");

    render(<WorkflowProgress lesson={lesson} currentStepId={current.id} completedStepIds={[complete.id]} locale="en" />);
    expect(screen.getByRole("listitem", { current: "step" }).textContent).toContain(current.title.en);
  });

  it("maps practice steps to a tool category without hardcoding a workflow", () => {
    const template = PRACTICE_LESSONS[0].steps[0];
    const sculptStep: PracticeStep = { ...template, validators: [], allowedTools: ["sculpt"] };
    expect(toolGroupForPracticeStep(sculptStep)).toBe("sculpt");
    expect(toolGroupForPracticeStep(undefined)).toBe("navigation");
  });

  it("changes tool category locally without selecting or changing CAD objects", () => {
    const selectedId = demoObjects[0].id;
    useWorkspaceStore.getState().select(selectedId);
    const beforeObjects = useWorkspaceStore.getState().objects;

    function CategoryProbe() {
      const [active, setActive] = useState<ToolGroup>("navigation");
      return <><ToolCategoryBar active={active} onChange={setActive} activeToolLabel="Select" locale="en" /><output data-testid="active-category">{active}</output></>;
    }

    render(<CategoryProbe />);
    fireEvent.click(screen.getByRole("button", { name: "Sculpt" }));

    expect(screen.getByTestId("active-category").textContent).toBe("sculpt");
    expect(useWorkspaceStore.getState().selectedObjectId).toBe(selectedId);
    expect(useWorkspaceStore.getState().objects).toBe(beforeObjects);
  });

  it("lets Show me identify the target without changing the selection, lesson step, or geometry", () => {
    const source = PRACTICE_LESSONS[0];
    const targetId = demoObjects[0].id;
    const lesson: PracticeLesson = {
      ...source,
      steps: [{ ...source.steps[0], targetObjectIds: [targetId] }],
    };
    const selectedId = demoObjects[1].id;
    useWorkspaceStore.getState().select(selectedId);
    usePracticeSessionStore.getState().initialize(lesson);
    const sessionBefore = usePracticeSessionStore.getState().session;
    const objectsBefore = useWorkspaceStore.getState().objects;
    const onShowObject = vi.fn();
    const onShowTools = vi.fn();

    render(<PracticeGuidancePanel lesson={lesson} onShowObject={onShowObject} onShowTools={onShowTools} />);
    fireEvent.click(screen.getByRole("button", { name: "Show Demo preparation" }));

    expect(onShowObject).toHaveBeenCalledWith(targetId);
    expect(onShowTools).not.toHaveBeenCalled();
    expect(usePracticeSessionStore.getState().session).toBe(sessionBefore);
    expect(useWorkspaceStore.getState().selectedObjectId).toBe(selectedId);
    expect(useWorkspaceStore.getState().objects).toBe(objectsBefore);
  });

  it("shows dynamic target coordinates and uses a compact target checklist", () => {
    const source = PRACTICE_LESSONS[0];
    const step = { ...source.steps[0], targetObjectIds: [demoObjects[0].id, demoObjects[1].id, demoObjects[2].id] };
    const lesson: PracticeLesson = { ...source, steps: [step] };
    usePracticeSessionStore.getState().initialize(lesson);
    useWorkspaceStore.getState().select(demoObjects[1].id);

    render(<PracticeGuidancePanel lesson={lesson} preview />);

    expect(screen.getByRole("listitem", { current: "step" }).textContent).toContain("Demo restoration");
    const rows = screen.getAllByRole("listitem");
    expect(rows.find((row) => row.textContent?.includes("Demo preparation"))?.getAttribute("data-check-state")).toBe("upcoming");
    expect(rows.find((row) => row.textContent?.includes("Demo restoration"))?.getAttribute("data-check-state")).toBe("current");
    expect(rows.find((row) => row.textContent?.includes("Demo reference"))?.getAttribute("data-check-state")).toBe("upcoming");
    expect(screen.getByTestId("guide-current-position").textContent).toBe("X = 8.0 mm");
    expect(screen.getByTestId("guide-target-position").textContent).toBe("X = 0.0 mm");
  });

  it("collapses optional help and keeps the step check available after completion", () => {
    const source = PRACTICE_LESSONS[0];
    const lesson: PracticeLesson = { ...source, steps: [source.steps[0]] };
    usePracticeSessionStore.getState().initialize(lesson);
    const step = lesson.steps[0];
    const session = usePracticeSessionStore.getState().session!;
    const fingerprint = validationFingerprint(useWorkspaceStore.getState().objects, step.targetObjectIds);
    const passed: ValidationResult = { id: "passed", validatorType: "transform_range", outcome: "pass", title: { en: "Position within target", sr: "Položaj je unutar cilja" }, message: { en: "Position is in range.", sr: "Položaj je u cilju." } };
    usePracticeSessionStore.setState({ session: { ...session, completedStepIds: [step.id], resultsByStep: { [step.id]: [passed] }, validationFingerprintByStep: { [step.id]: fingerprint }, isComplete: true, completedAt: new Date().toISOString() } });

    render(<PracticeGuidancePanel lesson={lesson} preview />);

    const helpSummary = screen.getByText("Help");
    const helpDetails = helpSummary.closest("details");
    expect(helpDetails?.open).toBe(false);
    fireEvent.click(helpSummary);
    expect(helpDetails?.open).toBe(true);
    expect(screen.getByText("Why does this matter?").closest("details")?.open).toBe(false);
    expect(screen.getByRole("button", { name: "Check step" })).toBeTruthy();
    expect(screen.getByRole("status", { name: "Design Check result" }).getAttribute("data-result-state")).toBe("success");
    expect(screen.getByText("Result").parentElement?.textContent).toContain("100");
    expect(screen.getAllByRole("listitem").find((row) => row.textContent?.includes("Demo restoration"))?.getAttribute("data-check-state")).toBe("complete");
  });

  it("renders failed Design Check results with an error state", () => {
    const lesson = PRACTICE_LESSONS[0];
    usePracticeSessionStore.getState().initialize(lesson);
    const step = lesson.steps[0];
    const session = usePracticeSessionStore.getState().session!;
    const fingerprint = validationFingerprint(useWorkspaceStore.getState().objects, step.targetObjectIds);
    const failed: ValidationResult = { id: "failed", validatorType: "transform_range", outcome: "fail", title: { en: "Position needs adjustment", sr: "Položaj treba podesiti" }, message: { en: "Move closer to the target.", sr: "Približite ciljnoj vrednosti." } };
    usePracticeSessionStore.setState({ session: { ...session, resultsByStep: { [step.id]: [failed] }, validationFingerprintByStep: { [step.id]: fingerprint } } });

    render(<PracticeGuidancePanel lesson={lesson} preview />);
    expect(screen.getByRole("status", { name: "Design Check result" }).getAttribute("data-result-state")).toBe("error");
  });

  it("keeps help, example, and reference controls grouped under the collapsed Help area", () => {
    const lesson = PRACTICE_LESSONS[0];
    usePracticeSessionStore.getState().initialize(lesson);
    render(<PracticeGuidancePanel lesson={lesson} preview />);

    const help = screen.getByText("Help");
    expect(help.closest("details")?.open).toBe(false);
    fireEvent.click(help);
    fireEvent.click(screen.getByText("Example and reference"));
    fireEvent.click(screen.getByRole("button", { name: "Show example" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Reference mode" }), { target: { value: "full" } });
    expect(usePracticeSessionStore.getState().session?.referenceMode).toBe("full");
  });
});
