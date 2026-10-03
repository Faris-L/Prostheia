import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, cleanup } from "@testing-library/react";
import { DENTAL_CAD_GLOSSARY, I18nProvider, INTERFACE_COPY_KEYS, LOCALE_STORAGE_KEY, MESSAGE_KEYS, resolveLocale, translate, translateInterfaceCopy, translateWorkspace, WORKSPACE_MESSAGE_KEYS, useI18n, formatNumber } from "@/lib/i18n";
import { usePracticeSessionStore } from "@/practice/session-store";
import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import { useSaveStore } from "@/cad/engine/save-store";
import { demoObjects } from "@/cad/scene/demo-objects";
import { DashboardPage } from "@/components/learner-pages";
import { LanguageToggle } from "@/components/language-toggle";
import { PRACTICE_LESSONS } from "@/practice/lessons";
import { getValidator, REGISTERED_VALIDATOR_TYPES, runStepValidators } from "@/practice/validators";
import { PRACTICE_TOOL_IDS, validatorConfigSchema } from "@/practice/types";
import { FREE_LAB_SCENARIOS } from "@/free-lab/scenarios";
import { GlossaryPage } from "@/components/glossary-page";
import { ScreenshotStudio } from "@/components/cad-ui/screenshot-studio";
import type { ViewportApi } from "@/cad/camera/types";
import { FreeLabHome } from "@/free-lab/free-lab-page";

vi.mock("next/navigation", async (importOriginal) => ({
  ...await importOriginal<typeof import("next/navigation")>(),
  useRouter: () => ({ push: vi.fn() }),
}));

function LocaleProbe() {
  const { locale, setLocale } = useI18n();
  return <button onClick={() => setLocale(locale === "en" ? "sr" : "en")}>{locale}</button>;
}

afterEach(() => {
  cleanup();
  localStorage.clear();
  localStorage.setItem(LOCALE_STORAGE_KEY, "en");
  usePracticeSessionStore.setState({ locale: "en", session: null, lesson: null });
  useSaveStore.getState().markClean();
});

describe("Phase 25 localization contract", () => {
  it("supports only canonical English and Serbian locale identifiers with safe fallback", () => {
    expect(resolveLocale("en")).toBe("en");
    expect(resolveLocale("sr")).toBe("sr");
    expect(resolveLocale("sr-Latn")).toBe("en");
    expect(resolveLocale("fr")).toBe("en");
    expect(translate(resolveLocale("unknown"), "dashboard")).toBe("Dashboard");
  });

  it("has a shared EN/SR dictionary and stable core dental terminology", () => {
    for (const key of MESSAGE_KEYS) expect(translate("sr", key).trim()).not.toBe("");
    for (const [english, serbian] of DENTAL_CAD_GLOSSARY) {
      expect(english.trim()).not.toBe("");
      expect(serbian.trim()).not.toBe("");
    }
    expect(new Set(DENTAL_CAD_GLOSSARY.map(([term]) => term)).size).toBe(DENTAL_CAD_GLOSSARY.length);
    expect(translate("sr", "move")).toBe("Move · pomeranje");
    expect(translate("sr", "targetForExercise")).toBe("Ciljna vrednost za ovu vežbu");
    expect(translate("en", "educationDisclaimer")).toContain("not for diagnosis");
    expect(translate("sr", "educationDisclaimer")).toContain("nisu namenjeni dijagnostici");
    expect(formatNumber(1.5, "sr")).toBe("1,5");
  });

  it("translates shared workflow, Free Lab, Admin and common-state product copy", () => {
    for (const key of INTERFACE_COPY_KEYS) expect(translateInterfaceCopy("sr", key).trim()).not.toBe("");
    for (const key of ["Generate splint", "Add removable die", "Analyze motion", "Patient ID", "Start Over", "Unable to save this content.", "Storage upload failed: Check the file and try again.", "No saved revisions yet."]) {
      expect(translateInterfaceCopy("sr", key)).not.toBe(key);
      expect(translateInterfaceCopy("en", key)).toBe(key);
    }
    expect(translateInterfaceCopy("sr", "An intentional professional CAD term")).toBe("An intentional professional CAD term");
  });

  it("keeps shared Screenshot/Annotation labels complete and switches the real studio", () => {
    for (const key of WORKSPACE_MESSAGE_KEYS) {
      expect(translateWorkspace("en", key).trim()).not.toBe("");
      expect(translateWorkspace("sr", key).trim()).not.toBe("");
    }
    const apiRef = { current: null } as React.MutableRefObject<ViewportApi | null>;
    render(<I18nProvider><LocaleProbe /><ScreenshotStudio apiRef={apiRef} caseId={null} revisionId={null} caseTitle="Training case" /></I18nProvider>);
    fireEvent.click(screen.getByRole("button", { name: "Screenshots" }));
    expect(screen.getByRole("heading", { name: "Screenshot & annotation" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Capture current viewport" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "en" }));
    expect(screen.getByRole("heading", { name: "Snimak ekrana i anotacije" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Snimi trenutni prikaz" })).toBeTruthy();
  });

  it("localizes the Free Lab catalog, filters, brief and random-case state", () => {
    render(<I18nProvider><LocaleProbe /><FreeLabHome scenarios={FREE_LAB_SCENARIOS} /></I18nProvider>);
    expect(screen.getByRole("heading", { name: "Scenario catalog" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Choose an exercise to practice" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Select random case" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "en" }));
    expect(screen.getByRole("heading", { name: "Katalog scenarija" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Izaberite vežbu za rad" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Izaberi nasumični slučaj" })).toBeTruthy();
  });

  it("renders the shared dental glossary with both language columns", () => {
    render(<I18nProvider><GlossaryPage /></I18nProvider>);
    expect(screen.getByRole("heading", { name: "Dental CAD glossary" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "English term" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Serbian explanation" })).toBeTruthy();
    expect(screen.getByRole("row", { name: "Crown krunica" })).toBeTruthy();
  });

  it("switches presentation language without replacing the active Practice attempt or CAD state", () => {
    const lesson = PRACTICE_LESSONS[0];
    usePracticeSessionStore.getState().restart(lesson, "stable-attempt");
    usePracticeSessionStore.getState().showNextHint(lesson.steps[0].id, lesson.steps[0].hints.length);
    const sessionBefore = usePracticeSessionStore.getState().session;
    const lessonBefore = usePracticeSessionStore.getState().lesson;
    useWorkspaceStore.getState().initializeWorkspace("practice", demoObjects);
    useSaveStore.getState().markDirty();
    const saveStateBefore = useSaveStore.getState();
    const workspaceBefore = useWorkspaceStore.getState();
    render(<I18nProvider><LocaleProbe /></I18nProvider>);
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("button").textContent).toBe("sr");
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe("sr");
    expect(usePracticeSessionStore.getState().locale).toBe("sr");
    expect(usePracticeSessionStore.getState().session).toBe(sessionBefore);
    expect(usePracticeSessionStore.getState().lesson).toBe(lessonBefore);
    expect(useWorkspaceStore.getState().objects).toBe(workspaceBefore.objects);
    expect(useWorkspaceStore.getState().mode).toBe(workspaceBefore.mode);
    expect(useWorkspaceStore.getState().selectedObjectId).toBe(workspaceBefore.selectedObjectId);
    expect(useSaveStore.getState().status).toBe(saveStateBefore.status);
    expect(useSaveStore.getState().hasUnsavedChanges).toBe(saveStateBefore.hasUnsavedChanges);
  });

  it("localizes the Dashboard and shared language control in both languages", () => {
    render(<I18nProvider><LanguageToggle /><DashboardPage /></I18nProvider>);
    expect(screen.getByRole("heading", { name: "A place to learn by doing." })).toBeTruthy();
    fireEvent.click(screen.getByRole("button"));
    expect(screen.getByRole("heading", { name: "Učenje kroz praktičan rad." })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Otvori Free Lab" })).toBeTruthy();
  });
});

describe("Phase 25 local content integrity", () => {
  it("runs every published validator with readable bilingual feedback", () => {
    for (const lesson of PRACTICE_LESSONS) {
      for (const step of lesson.steps) {
        for (const result of runStepValidators(lesson, step)) {
          expect(result.title.en.trim()).not.toBe("");
          expect(result.title.sr.trim()).not.toBe("");
          expect(result.message.en.trim()).not.toBe("");
          expect(result.message.sr.trim()).not.toBe("");
          expect(["pass", "warning", "fail"]).toContain(result.outcome);
          if (result.measured !== undefined) expect(Number.isFinite(result.measured)).toBe(true);
          if (result.target !== undefined) expect(Number.isFinite(result.target)).toBe(true);
        }
      }
    }
  });

  it("keeps unsupported validator identifiers out of learner-facing feedback", () => {
    const lesson = PRACTICE_LESSONS[0];
    const step = { ...lesson.steps[0], validators: [{ type: "internal_only_validator_id" }] } as unknown as typeof lesson.steps[number];
    const result = runStepValidators(lesson, step)[0];
    expect(result.message.en).not.toContain("internal_only_validator_id");
    expect(result.message.sr).not.toContain("internal_only_validator_id");
    expect(result.message.en).toContain("current workspace");
    expect(result.message.sr).toContain("radnom prostoru");
  });

  it("requires bilingual lesson, step, hint and validator feedback fields", () => {
    const ids = new Set<string>();
    for (const lesson of PRACTICE_LESSONS) {
      expect(ids.has(lesson.id)).toBe(false);
      ids.add(lesson.id);
      for (const text of [lesson.title, lesson.summary, lesson.goal, ...lesson.steps.flatMap((step) => [step.title, step.instructions, ...(step.theory ? [step.theory] : []), ...step.hints.flatMap((hint) => [hint.title, hint.body]), ...step.validators.flatMap((validator) => validator.type === "required_step" && validator.message ? [validator.message] : [])])]) {
        expect(text.en.trim()).not.toBe("");
        expect(text.sr.trim()).not.toBe("");
      }
      const stepIds = new Set<string>();
      for (const step of lesson.steps) {
        expect(stepIds.has(step.id)).toBe(false);
        stepIds.add(step.id);
        const hintIds = new Set<string>();
        for (const hint of step.hints) {
          expect(hintIds.has(hint.id)).toBe(false);
          hintIds.add(hint.id);
        }
        for (const tool of step.allowedTools) expect(PRACTICE_TOOL_IDS).toContain(tool);
        for (const validator of step.validators) {
          expect(REGISTERED_VALIDATOR_TYPES).toContain(validator.type);
          expect(getValidator(validator.type)).toBeTruthy();
          expect(validatorConfigSchema.safeParse(validator).success).toBe(true);
        }
        if (step.reference) {
          expect(step.reference.objectId.trim()).not.toBe("");
          expect(step.reference.position.every(Number.isFinite)).toBe(true);
        }
      }
    }
  });

  it("requires bilingual published Free Lab briefs and distinct scenario identifiers", () => {
    const ids = new Set<string>();
    for (const scenario of FREE_LAB_SCENARIOS.filter((entry) => entry.status === "published")) {
      expect(ids.has(scenario.id)).toBe(false);
      ids.add(scenario.id);
      for (const text of [scenario.title, scenario.description, scenario.brief.indication, scenario.brief.material, ...(scenario.brief.notes ? [scenario.brief.notes] : [])]) {
        expect(text.en.trim()).not.toBe("");
        expect(text.sr.trim()).not.toBe("");
      }
      for (const key of ["en", "sr"] as const) {
        expect(scenario.brief.supplied[key].every((item) => item.trim().length > 0)).toBe(true);
        expect(scenario.brief.requirements[key].every((item) => item.trim().length > 0)).toBe(true);
      }
      expect(scenario.assets.every((asset) => asset.id.trim() && asset.label.trim())).toBe(true);
    }
  });
});
