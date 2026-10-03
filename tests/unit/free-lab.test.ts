import { afterEach, describe, expect, it } from "vitest";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import { demoObjects } from "@/cad/scene/demo-objects";
import { FREE_LAB_SCENARIOS, R3_FIXED_PROSTHETICS_SCENARIOS, selectRandomScenario, validateFreeLabScenario } from "@/free-lab/scenarios";
import { createFreeLabSession } from "@/free-lab/session";
import { createScenarioAssetFiles } from "@/free-lab/scenario-assets";

afterEach(() => useWorkspaceStore.getState().resetDemo());

describe("Free Lab scenarios", () => {
  it("validates structured, fictional scenario records", () => {
    expect(FREE_LAB_SCENARIOS.every(validateFreeLabScenario)).toBe(true);
    expect(FREE_LAB_SCENARIOS[0].brief.patientCode).toMatch(/^PT-/);
  });

  it("provides synthetic files through the existing import file contract", () => {
    const files = createScenarioAssetFiles(FREE_LAB_SCENARIOS[0]);
    expect(files.map((file) => file.name)).toEqual(["synthetic-upper-arch.stl", "synthetic-lower-arch.stl", "synthetic-preparation-26.stl"]);
    expect(files.every((file) => file.size > 0 && file.type === "model/stl")).toBe(true);
  });

  it("selects only published eligible scenarios matching both filters", () => {
    const valid = { ...R3_FIXED_PROSTHETICS_SCENARIOS[0], difficulty: "beginner" as const };
    const source = [
      { ...valid, id: "match", category: "crown" as const, difficulty: "beginner" as const, status: "published" as const, randomEligible: true },
      { ...valid, id: "difficulty", category: "crown" as const, difficulty: "advanced" as const, status: "published" as const, randomEligible: true },
      { ...valid, id: "category", category: "bridge" as const, difficulty: "beginner" as const, status: "published" as const, randomEligible: true },
      { ...valid, id: "draft", category: "crown" as const, difficulty: "beginner" as const, status: "draft" as const, randomEligible: true },
      { ...valid, id: "ineligible", category: "crown" as const, difficulty: "beginner" as const, status: "published" as const, randomEligible: false },
    ] as const;
    expect(selectRandomScenario(source, "crown", "beginner", () => 0)?.id).toBe("match");
    expect(selectRandomScenario(source, "implant", "beginner", () => 0)).toBeUndefined();
  });

  it("accepts an injected random source for deterministic selection", () => {
    const valid = { ...R3_FIXED_PROSTHETICS_SCENARIOS[0], difficulty: "beginner" as const };
    const pool = [0, 1, 2].map((index) => ({ ...valid, id: `${index}` }));
    expect(selectRandomScenario(pool, "crown", "beginner", () => 0.67)?.id).toBe("2");
  });
});

describe("Free Lab runtime metadata and mode", () => {
  it("creates a stable workspace ID and records origin and case metadata", () => {
    const session = createFreeLabSession({ origin: "blank", title: "Blank workspace", category: "crown", difficulty: "foundation" });
    expect(session.workspaceId).toBeTruthy();
    expect(session.createdAt).toBeTruthy();
    expect(session.origin).toBe("blank");
    expect(session.scenarioId).toBeUndefined();
    expect(JSON.stringify(session)).not.toMatch(/positions|indices|meshBuffer/i);
  });

  it("switches cleanly between a shared Practice workspace and empty Free Lab", () => {
    useWorkspaceStore.getState().initializeWorkspace("practice", demoObjects);
    expect(useWorkspaceStore.getState().mode).toBe("practice");
    expect(useWorkspaceStore.getState().objects.length).toBeGreaterThan(0);
    useWorkspaceStore.getState().initializeWorkspace("free-lab");
    expect(useWorkspaceStore.getState().mode).toBe("free-lab");
    expect(useWorkspaceStore.getState().objects).toEqual([]);
  });
});
