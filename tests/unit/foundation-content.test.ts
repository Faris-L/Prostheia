import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import * as THREE from "three";
import { cadObjectId } from "@/cad/types";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import { createSyntheticDentalArch, createSyntheticScanExercise, createSyntheticTooth } from "@/cad/scene/synthetic-dental-geometry";
import { geometryRegistry } from "@/cad/scene/geometry-registry";
import { PRACTICE_LESSONS } from "@/practice/lessons";
import { validatorConfigSchema, type PracticeStep } from "@/practice/types";
import { getValidator, runStepValidators } from "@/practice/validators";
import { usePracticeSessionStore } from "@/practice/session-store";

const migration = readFileSync(resolve(process.cwd(), "supabase/migrations/20260927170000_phase_15_cad_foundations.sql"), "utf8");
const sqlCalls = [...migration.matchAll(/select pg_temp\.seed_phase15_step\('([^']+)','([^']+)',(\d+),[\s\S]*?array\[([^\]]*)\],array\[([^\]]*)\]/g)];

function readSeedStepArguments(sql: string) {
  const argumentsList: string[][] = [];
  const marker = "select pg_temp.seed_phase15_step(";
  let offset = 0;
  while ((offset = sql.indexOf(marker, offset)) >= 0) {
    let cursor = offset + marker.length;
    let depth = 1;
    let brackets = 0;
    let quoted = false;
    let start = cursor;
    const args: string[] = [];
    for (; cursor < sql.length && depth > 0; cursor += 1) {
      const char = sql[cursor];
      if (char === "'" && quoted && sql[cursor + 1] === "'") { cursor += 1; continue; }
      if (char === "'") { quoted = !quoted; continue; }
      if (quoted) continue;
      if (char === "[") brackets += 1;
      else if (char === "]") brackets -= 1;
      else if (char === "(") depth += 1;
      else if (char === ")") depth -= 1;
      else if (char === "," && depth === 1 && brackets === 0) { args.push(sql.slice(start, cursor).trim()); start = cursor + 1; }
    }
    if (depth !== 0 || quoted) throw new Error(`Unclosed SQL seed function call at character ${offset}.`);
    args.push(sql.slice(start, cursor - 1).trim());
    argumentsList.push(args);
    offset = cursor;
  }
  return argumentsList;
}

afterEach(() => {
  usePracticeSessionStore.setState({ session: null, locale: "en" });
  useWorkspaceStore.getState().resetDemo();
  geometryRegistry.clear();
});

describe("official CAD Foundations seed", () => {
  it("uses ordered, unique lesson and step IDs with registered tools and validators", () => {
    const lessonRows = [...migration.matchAll(/'(b7150000-0000-4000-8000-0000000000\d+)'(?:::uuid)?,'([a-z_]+)',(\d+),'[^']+','[^']+'/g)];
    const lessons = lessonRows.filter((row) => row[2] !== "cad_foundations");
    expect(new Set(lessons.map((row) => row[1])).size).toBe(13);
    expect(new Set(lessons.map((row) => row[2])).size).toBe(13);
    expect(new Set(sqlCalls.map((match) => `${match[1]}:${match[2]}`)).size).toBe(sqlCalls.length);
    expect(sqlCalls.length).toBeGreaterThanOrEqual(17);
    const allowedTools = new Set(["select", "move", "rotate", "scale", "sculpt", "mesh_edit", "analysis", "camera", "scene"]);
    for (const call of sqlCalls) {
      const tools = [...call[4].matchAll(/'([^']+)'/g)].map((match) => match[1]);
      expect(tools.length).toBeGreaterThan(0);
      expect(tools.every((tool) => allowedTools.has(tool))).toBe(true);
    }
    const ordersByLesson = new Map<string, number[]>();
    for (const call of sqlCalls) ordersByLesson.set(call[1], [...(ordersByLesson.get(call[1]) ?? []), Number(call[3])]);
    for (const orders of ordersByLesson.values()) expect(orders).toEqual([...orders].sort((a, b) => a - b));
    expect(migration).toContain("'transform_range'");
    expect(migration).toContain("'required_object'");
    expect(migration).toContain("'required_step'");
    expect(migration).toContain("'demo-synthetic-scan'");
    expect(migration).toContain("'demo-reference'");
    const cadObjectIds = new Set(["demo-prepared-tooth", "demo-crown", "demo-reference", "demo-synthetic-scan"]);
    const parsedCalls = readSeedStepArguments(migration);
    expect(parsedCalls.length).toBe(sqlCalls.length);
    const parsedOrders = new Map<string, number[]>();
    for (const args of parsedCalls) {
      expect(args).toHaveLength(16);
      for (const index of [3, 4, 5, 6, 7, 8]) expect(args[index]).not.toBe("null");
      const targets = [...args[10].matchAll(/'([^']+)'/g)].map((match) => match[1]);
      expect(targets.length).toBeGreaterThan(0);
      expect(targets.every((target) => cadObjectIds.has(target))).toBe(true);
      const validator = JSON.parse(args[14].slice(1, -1)) as unknown;
      expect(validatorConfigSchema.safeParse(validator).success).toBe(true);
      expect(getValidator((validator as { type: string }).type)).toBeDefined();
      const hints = JSON.parse(args[15].slice(1, -1)) as { title_en?: string; title_sr?: string; body_en?: string; body_sr?: string }[];
      for (const hint of hints) expect([hint.title_en, hint.title_sr, hint.body_en, hint.body_sr].every((value) => typeof value === "string" && value.length > 0)).toBe(true);
      parsedOrders.set(args[0].slice(1, -1), [...(parsedOrders.get(args[0].slice(1, -1)) ?? []), Number(args[2])]);
    }
    for (const orders of parsedOrders.values()) expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it("routes official content through the same database contract used by Admin and Practice", () => {
    const admin = readFileSync(resolve(process.cwd(), "src/app/(app)/admin/actions.ts"), "utf8");
    const editor = readFileSync(resolve(process.cwd(), "src/app/(app)/admin/lessons/lesson-editor.tsx"), "utf8");
    const catalog = readFileSync(resolve(process.cwd(), "src/practice/database-catalog.ts"), "utf8");
    const atomicSave = readFileSync(resolve(process.cwd(), "supabase/migrations/20260929150000_phase_27_atomic_admin_content_save.sql"), "utf8");
    expect(migration).toContain("public.practice_lessons");
    expect(admin).toContain('rpc("save_admin_lesson"');
    expect(admin).toContain('rpc("save_admin_scenario"');
    expect(atomicSave).toContain("insert into public.practice_step_validations");
    expect(atomicSave).toContain("insert into public.scenario_assets");
    expect(atomicSave).toContain("security invoker");
    expect(editor).toContain('"demo-synthetic-scan"');
    expect(catalog).toContain('from("practice_lessons")');
    expect(catalog).toContain('from("practice_steps")');
    expect(catalog).toContain('from("practice_step_validations")');
  });

  it("keeps every lesson bilingual and describes the geometry as internally created synthetic training material", () => {
    expect(migration).toContain("summary_en");
    expect(migration).toContain("summary_sr");
    expect(migration).toContain("instructions_en");
    expect(migration).toContain("instructions_sr");
    expect(migration.toLowerCase()).toContain("internally created teaching material");
    expect(migration).toContain("no patient or third-party library data");
  });
});

describe("Foundation validator flows", () => {
  const lesson = PRACTICE_LESSONS[0];

  it("fails a Move target before the transform and passes within the exercise tolerance", () => {
    const step = lesson.steps[0];
    expect(runStepValidators(lesson, step)[0].outcome).toBe("fail");
    const object = useWorkspaceStore.getState().objects.find((entry) => entry.id === cadObjectId("demo-crown"))!;
    useWorkspaceStore.getState().applyTransform(object.id, { ...object.transform, position: [0.2, 0, 0] });
    expect(runStepValidators(lesson, step)[0].outcome).toBe("pass");
  });

  it("checks a configured Rotate axis and reports a pass at its target", () => {
    const step = { ...lesson.steps[0], validators: [{ type: "transform_range", objectId: "demo-crown", field: "rotation", position: [0, 0, Math.PI / 6], axes: ["z"], toleranceMm: 0.02 }] } as unknown as PracticeStep;
    expect(runStepValidators(lesson, step)[0].outcome).toBe("fail");
    const object = useWorkspaceStore.getState().objects.find((entry) => entry.id === cadObjectId("demo-crown"))!;
    useWorkspaceStore.getState().applyTransform(object.id, { ...object.transform, rotation: [0, 0, Math.PI / 6] });
    expect(runStepValidators(lesson, step)[0].outcome).toBe("pass");
  });

  it("requires visibility and active selection state when configured", () => {
    const step = { ...lesson.steps[0], validators: [{ type: "required_object", objectId: "demo-reference", visible: false, selected: true }] } as unknown as PracticeStep;
    expect(runStepValidators(lesson, step)[0].outcome).toBe("fail");
    const referenceId = cadObjectId("demo-reference");
    useWorkspaceStore.getState().applyVisibility([{ id: referenceId, visible: false }]);
    useWorkspaceStore.getState().select(referenceId);
    expect(runStepValidators(lesson, step)[0].outcome).toBe("pass");
  });

  it("uses an explicit acknowledgment for actions the runtime cannot observe, and capstone steps stay sequential", () => {
    const step = { ...lesson.steps[0], validators: [{ type: "required_step" }] } as unknown as PracticeStep;
    expect(runStepValidators(lesson, step)[0].outcome).toBe("pass");
    const capstone = { ...lesson, steps: [lesson.steps[0], { ...lesson.steps[1], order: 2 }] };
    usePracticeSessionStore.getState().initialize(capstone);
    usePracticeSessionStore.getState().recordCheck(capstone.steps[1].id, [runStepValidators(lesson, step)[0]], "later", capstone);
    expect(usePracticeSessionStore.getState().session?.currentStepId).toBe(capstone.steps[0].id);
    usePracticeSessionStore.getState().recordCheck(capstone.steps[0].id, [runStepValidators(lesson, step)[0]], "first", capstone);
    expect(usePracticeSessionStore.getState().session?.currentStepId).toBe(capstone.steps[1].id);
  });
});

describe("synthetic Foundation assets", () => {
  it("builds a dental arch, tooth surfaces and an open synthetic scan patch without external assets", () => {
    const arch = createSyntheticDentalArch(true);
    const tooth = createSyntheticTooth("restoration");
    const scan = createSyntheticScanExercise();
    let archMeshes = 0;
    let scanTriangles = 0;
    arch.traverse((object) => { if (object instanceof THREE.Mesh) archMeshes += 1; });
    scan.traverse((object) => { if (object instanceof THREE.Mesh) scanTriangles += object.geometry.index?.count ?? object.geometry.getAttribute("position").count; });
    expect(archMeshes).toBeGreaterThan(10);
    expect(tooth.name).toContain("Synthetic");
    expect(scan.name).toContain("Synthetic scan");
    expect(scanTriangles).toBeGreaterThan(100);
    arch.traverse((object) => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose()); else object.material.dispose(); } });
    tooth.traverse((object) => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose()); else object.material.dispose(); } });
    scan.traverse((object) => { if (object instanceof THREE.Mesh) { object.geometry.dispose(); if (Array.isArray(object.material)) object.material.forEach((material) => material.dispose()); else object.material.dispose(); } });
  });
});
