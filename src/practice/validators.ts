import { useWorkspaceStore } from "@/cad/engine/workspace-store";
import { cadObjectId } from "@/cad/types";
import { geometryRegistry } from "@/cad/scene/geometry-registry";
import { useCurveStore, validateClosedCurve } from "@/cad/curves/store";
import { analysisResultIsCurrent, useAnalysisStore } from "@/cad/analysis/state";
import { useDentureSetupStore } from "@/cad/denture/setup-store";
import { DENTURE_IDS } from "@/cad/denture/case";
import { positionForTooth } from "@/cad/denture/geometry";
import { restorativeCaseIds } from "@/cad/restorative/case";
import { RESTORATION_TYPES, useRestorativeSetupStore, type RestorationType } from "@/cad/restorative/types";
import { usePartialDentureStore } from "@/cad/partial-denture/types";
import { useHistoryStore } from "@/cad/engine/history-store";
import { useImplantStore } from "@/cad/implant/types";
import { useBiteSplintStore } from "@/cad/splint/types";
import { useDigitalModelStore } from "@/cad/digital-model/types";
import { useArticulatorStore } from "@/cad/articulator/store";
import { axisAngleDegrees, implantAxisFromTransform } from "@/cad/implant/analysis";
import { validatorConfigSchema, type PracticeLesson, type PracticeStep, type ValidationResult, type ValidatorConfig } from "./types";

export type PracticeValidationContext = { lesson: PracticeLesson; step: PracticeStep; getObject: (id: string) => ReturnType<typeof useWorkspaceStore.getState>["objects"][number] | undefined };
type Validator<C extends ValidatorConfig> = { config: C; run: (context: PracticeValidationContext, config: C) => ValidationResult };
type AnyValidator = { type: ValidatorConfig["type"]; parse: (config: unknown) => ValidatorConfig; run: (context: PracticeValidationContext, config: ValidatorConfig) => ValidationResult };

const registry: Record<string, AnyValidator> = {
  transform_range: {
    type: "transform_range",
    parse: (config) => validatorConfigSchema.parse(config),
    run: (context, raw) => {
      const config = validatorConfigSchema.parse(raw);
      if (config.type !== "transform_range") throw new Error("Invalid validator configuration.");
      const object = context.getObject(config.objectId);
      if (!object) return { id: `${context.step.id}:transform_range`, validatorType: config.type, outcome: "fail", title: { en: "Target object missing", sr: "Nedostaje ciljni objekat" }, message: { en: `Required CAD object “${config.objectId}” is not present in this lesson setup.`, sr: `Obavezni CAD objekat “${config.objectId}” nije prisutan u ovom podešavanju lekcije.` }, objectId: config.objectId };
      const field = config.field ?? "position";
      const current = object.transform[field];
      const distance = Math.sqrt(config.axes.reduce((sum, axis) => sum + (current[axisIndex(axis)] - config.position[axisIndex(axis)]) ** 2, 0));
      const passed = distance <= config.toleranceMm;
      return { id: `${context.step.id}:transform_range:${config.objectId}`, validatorType: config.type, outcome: passed ? "pass" : "fail", title: passed ? { en: "Position within target", sr: "Položaj je unutar cilja" } : { en: "Position needs adjustment", sr: "Položaj treba podesiti" }, message: passed ? { en: `The selected coordinates are within ${config.toleranceMm} mm of this exercise target.`, sr: `Izabrane koordinate su unutar ${config.toleranceMm} mm od cilja ove vežbe.` } : { en: `Move the target object ${distance.toFixed(2)} mm closer on the checked axes (exercise tolerance ${config.toleranceMm} mm).`, sr: `Pomerite ciljni objekat još ${distance.toFixed(2)} mm po proveravanim osama (tolerancija vežbe ${config.toleranceMm} mm).` }, measured: distance, target: config.toleranceMm, objectId: config.objectId };
    },
  },
  required_object: {
    type: "required_object",
    parse: (config) => validatorConfigSchema.parse(config),
    run: (context, raw) => {
      const config = validatorConfigSchema.parse(raw);
      if (config.type !== "required_object") throw new Error("Invalid required object configuration.");
      const object = context.getObject(config.objectId);
      const selected = useWorkspaceStore.getState().selectedObjectId === cadObjectId(config.objectId);
      const meshRevision = object ? geometryRegistry.get(object.id)?.geometryRevision ?? 0 : 0;
      const passed = Boolean(object) && (config.visible === undefined || object?.visible === config.visible)
        && (config.selected !== true || selected)
        && (config.minOpacity === undefined || (object?.opacity ?? 0) >= config.minOpacity)
        && (config.maxOpacity === undefined || (object?.opacity ?? 1) <= config.maxOpacity)
        && (config.minGeometryRevision === undefined || meshRevision >= config.minGeometryRevision);
      const expectation = config.visible === undefined ? "available in the scene" : config.visible ? "visible" : "hidden";
      const checks = [config.visible === undefined ? null : `${expectation}`, config.selected ? "selected as the active object" : null, config.minOpacity !== undefined || config.maxOpacity !== undefined ? "within the requested transparency range" : null, config.minGeometryRevision !== undefined ? `mesh revision ${config.minGeometryRevision} or later` : null].filter(Boolean).join(", ");
      return { id: `${context.step.id}:required_object:${config.objectId}`, validatorType: config.type, outcome: passed ? "pass" : "fail", title: passed ? { en: "Scene state ready", sr: "Stanje scene je odgovarajuće" } : { en: "Check the scene object", sr: "Proverite objekat u sceni" }, message: passed ? { en: `${config.objectId} is ${checks || expectation}.`, sr: `Objekat ${config.objectId} ispunjava proveru scene: ${checks || expectation}.` } : { en: `Set ${config.objectId} to ${expectation}${config.selected ? ", select it as the active object" : ""}${config.minGeometryRevision !== undefined ? ` and make a mesh edit (revision ${config.minGeometryRevision} required)` : ""}; then check again.`, sr: `Podesite ${config.objectId} da bude ${expectation}${config.selected ? ", izaberite ga kao aktivni objekat" : ""}${config.minGeometryRevision !== undefined ? ` i izmenite mesh (potrebna je revizija ${config.minGeometryRevision})` : ""}, pa ponovite proveru.` }, objectId: config.objectId };
    },
  },
  required_step: {
    type: "required_step",
    parse: (config) => validatorConfigSchema.parse(config),
    run: (context, raw) => {
      const config = validatorConfigSchema.parse(raw);
      if (config.type !== "required_step") throw new Error("Invalid acknowledgment configuration.");
      return { id: `${context.step.id}:required_step`, validatorType: config.type, outcome: "pass", title: { en: "Step acknowledged", sr: "Korak je potvrđen" }, message: config.message ?? { en: "Continue when you have performed the inspection described above.", sr: "Nastavite kada obavite opisanu proveru." } };
    },
  },
  geometry_statistics: {
    type: "geometry_statistics",
    parse: (config) => validatorConfigSchema.parse(config),
    run: (context, raw) => {
      const config = validatorConfigSchema.parse(raw);
      if (config.type !== "geometry_statistics") throw new Error("Invalid validator configuration.");
      const object = context.getObject(config.objectId);
      if (!object) return { id: `${context.step.id}:geometry_statistics`, validatorType: config.type, outcome: "fail", title: { en: "Target object missing", sr: "Nedostaje ciljni objekat" }, message: { en: `Required CAD object “${config.objectId}” is not present in this lesson setup.`, sr: `Obavezni CAD objekat “${config.objectId}” nije prisutan u ovom podešavanju lekcije.` }, objectId: config.objectId };
      if (!object.geometryStats) return { id: `${context.step.id}:geometry_statistics`, validatorType: config.type, outcome: "warning", title: { en: "Mesh statistics unavailable", sr: "Statistika mreže nije dostupna" }, message: { en: "This exercise object has no imported mesh statistics, so this structural check was skipped.", sr: "Ovaj objekat vežbe nema statistiku uvezene mreže, pa je ova strukturna provera preskočena." }, objectId: config.objectId };
      const meets = (config.minVertices === undefined || object.geometryStats.vertexCount >= config.minVertices) && (config.minTriangles === undefined || object.geometryStats.triangleCount >= config.minTriangles);
      return { id: `${context.step.id}:geometry_statistics`, validatorType: config.type, outcome: meets ? "pass" : "fail", title: meets ? { en: "Mesh statistics available", sr: "Statistika mreže je dostupna" } : { en: "Mesh statistics below this exercise target", sr: "Statistika mreže je ispod cilja ove vežbe" }, message: meets ? { en: `${object.geometryStats.vertexCount} vertices and ${object.geometryStats.triangleCount} triangles are available for this check.`, sr: `Dostupno je ${object.geometryStats.vertexCount} temena i ${object.geometryStats.triangleCount} trouglova za ovu proveru.` } : { en: "The mesh does not meet the configured structural target for this exercise.", sr: "Mreža ne ispunjava podešeni strukturni cilj ove vežbe." }, measured: object.geometryStats.vertexCount, target: config.minVertices, objectId: config.objectId };
    },
  },
  margin_complete: {
    type: "margin_complete",
    parse: (config) => validatorConfigSchema.parse(config),
    run: (context, raw) => {
      const config = validatorConfigSchema.parse(raw);
      if (config.type !== "margin_complete") throw new Error("Invalid margin configuration.");
      const curve = useCurveStore.getState().active(cadObjectId(config.objectId), "margin");
      const validation = validateClosedCurve(curve);
      return { id: `${context.step.id}:margin_complete:${config.objectId}`, validatorType: config.type, outcome: validation.valid ? "pass" : "fail", title: validation.valid ? { en: "Margin loop complete", sr: "Margin Line je zatvorena" } : { en: "Margin Line needs attention", sr: "Margin Line treba proveriti" }, message: { en: validation.reason, sr: validation.valid ? "Margin Line je zatvorena i sadrži najmanje tri tačke na površini preparacije." : validation.reason === "No margin curve is defined." ? "Još nije definisana Margin Line." : validation.reason === "The margin is still open. Close the loop before Design Check." ? "Margin Line je otvorena. Zatvorite petlju pre provere dizajna." : "Margin Line mora imati najmanje tri tačke na površini preparacije." }, objectId: config.objectId };
    },
  },
  curve_closed: {
    type: "curve_closed",
    parse: (config) => validatorConfigSchema.parse(config),
    run: (context, raw) => {
      const config = validatorConfigSchema.parse(raw);
      if (config.type !== "curve_closed") throw new Error("Invalid curve configuration.");
      const curve = useCurveStore.getState().curves.find((entry) => entry.id === config.curveId && entry.objectId === cadObjectId(config.objectId) && entry.kind === config.curveKind);
      const label = config.curveKind === "splint_boundary" ? "Splint Boundary" : config.curveKind === "model_trim_boundary" ? "Trim Boundary" : config.curveKind === "boundary" ? "Denture Border" : "Margin Line";
      const result = validateClosedCurve(curve, label);
      return { id: `${context.step.id}:curve_closed:${config.curveId}`, validatorType: config.type, outcome: result.valid ? "pass" : "fail", title: result.valid ? { en: `${label} is closed`, sr: `${label} je zatvorena` } : { en: `${label} needs attention`, sr: `${label} treba proveriti` }, message: { en: result.reason, sr: result.valid ? "Kriva je zatvorena i ima najmanje tri tačke." : "Dodajte najmanje tri tačke na površini i zatvorite krivu." }, objectId: config.objectId };
    },
  },
  denture_setup: {
    type: "denture_setup",
    parse: (config) => validatorConfigSchema.parse(config),
    run: (context, raw) => {
      const config = validatorConfigSchema.parse(raw);
      if (config.type !== "denture_setup") throw new Error("Invalid denture setup configuration.");
      const objects = useWorkspaceStore.getState().objects;
      const curves = useCurveStore.getState().curves;
      let valid = false;
      let message = "";
      const activePackageId = objects.find((object) => object.casePackageId && object.caseWorkflowMetadata && object.denturePart)?.casePackageId;
      const packageObjects = activePackageId ? objects.filter((object) => object.casePackageId === activePackageId) : [];
      const packageDenture = packageObjects.some((object) => Boolean(object.caseWorkflowMetadata && object.denturePart && (object.caseRole === "DESIGN" || object.caseRole === "SOURCE" && object.denturePart === "arch")));
      if (packageDenture && config.check !== "chain_mode") {
        const arches = packageObjects.filter((object) => object.caseRole === "SOURCE" && object.denturePart === "arch" && (!config.arch || object.dentureArch === config.arch));
        const teeth = packageObjects.filter((object) => object.caseRole === "DESIGN" && object.role === "denture_tooth" && object.denturePart === "tooth");
        const bases = packageObjects.filter((object) => object.caseRole === "DESIGN" && object.role === "denture_base" && object.denturePart === "base" && (!config.arch || object.dentureArch === config.arch));
        const bordersFor = (arch: "upper" | "lower") => {
          const source = packageObjects.find((object) => object.caseRole === "SOURCE" && object.denturePart === "arch" && object.dentureArch === arch);
          return source ? curves.filter((curve) => curve.kind === "boundary" && curve.objectId === source.id && validateClosedCurve(curve).valid) : [];
        };
        const setupTeeth = (arch?: "upper" | "lower", segment?: "anterior" | "posterior") => {
          const selected = teeth.filter((object) => (!arch || object.dentureArch === arch)
            && (!segment || (segment === "anterior" ? (object.dentalPosition ?? 0) % 10 <= 3 : (object.dentalPosition ?? 0) % 10 >= 4)));
          const adjusted = selected.some((object) => {
            const initial = object.caseWorkflowMetadata?.initialPosition;
            return Array.isArray(initial) && initial.length === 3
              && object.transform.position.some((value, index) => typeof initial[index] === "number" && Math.abs(value - initial[index]) > 0.01);
          });
          return { selected, adjusted };
        };
        if (config.check === "model_analysis") {
          const guidesExist = arches.length > 0 && arches.every((arch) => curves.some((curve) => curve.objectId === arch.id && curve.kind === "denture_arch_guide" && curve.points.length >= 3));
          const midlineObjects = packageObjects.filter((object) => object.caseRole === "GUIDE" && object.denturePart === "midline" && (!config.arch || object.dentureArch === config.arch));
          const midlinesExist = midlineObjects.length === arches.length && midlineObjects.every((midline) => midline.editable && curves.some((curve) => curve.objectId === midline.id && curve.kind === "denture_midline" && curve.points.length >= 2));
          const plane = packageObjects.find((object) => object.caseRole === "GUIDE" && object.denturePart === "plane" && object.editable);
          const metadata = plane?.caseWorkflowMetadata;
          const targetPosition = metadata?.targetPosition;
          const targetRotation = metadata?.targetRotation;
          const planeAdjusted = !!plane && Array.isArray(targetPosition) && Array.isArray(targetRotation)
            && targetPosition.length === 3 && targetRotation.length === 3
            && plane.transform.position.every((value, index) => typeof targetPosition[index] === "number" && Math.abs(value - targetPosition[index]) <= 0.01)
            && plane.transform.rotation.every((value, index) => typeof targetRotation[index] === "number" && Math.abs(value - targetRotation[index]) <= 0.01);
          valid = guidesExist && midlinesExist && planeAdjusted;
          message = valid ? "Package SOURCE arches, editable GUIDE midlines and the exercise-target occlusal plane are present." : "Review the package SOURCE arches and curves, then set the editable GUIDE plane to its Target for this exercise.";
        } else if (config.check === "tooth_setup") {
          const identities = new Set(teeth.map((object) => object.dentalPosition));
          const validIdentities = teeth.length === 28 && identities.size === 28 && teeth.every((object) => object.editable && Number.isInteger(object.dentalPosition) && Boolean(object.dentureArch) && geometryRegistry.getMeshes(object.id).length > 0);
          const setup = setupTeeth(config.arch, config.segment);
          valid = validIdentities && setup.selected.length > 0 && setup.adjusted;
          message = valid ? "All 28 package tooth identities remain editable and a tooth in the requested setup group was adjusted." : !validIdentities ? "Restore the complete set of 28 individually editable package teeth with unique FDI identities." : "Adjust at least one tooth in the requested arch and setup group for this exercise.";
        } else if (config.check === "boundary") {
          const targetArches: ("upper" | "lower")[] = config.arch ? [config.arch] : ["upper", "lower"];
          valid = targetArches.every((arch) => bordersFor(arch).length > 0);
          message = valid ? "A closed package denture border is stored on each requested SOURCE arch." : "Draw and close a Denture Border curve on each requested package SOURCE arch.";
        } else if (config.check === "base") {
          const targetArches: ("upper" | "lower")[] = config.arch ? [config.arch] : ["upper", "lower"];
          const basesReady = targetArches.every((arch) => {
            const base = bases.find((object) => object.dentureArch === arch);
            return !!base?.editable && geometryRegistry.stats(base.id).triangleCount > 100 && geometryRegistry.getMeshes(base.id).length > 0;
          });
          const bordersReady = targetArches.every((arch) => bordersFor(arch).length > 0);
          valid = basesReady && bordersReady;
          message = valid ? "Editable package bases with separate tissue-side/polished-surface meshes and closed exercise borders are present." : "Confirm the requested editable package bases and close each matching SOURCE arch border.";
        } else {
          const identities = new Set(teeth.map((object) => object.dentalPosition));
          const teethReady = teeth.length === 28 && identities.size === 28 && teeth.every((object) => object.editable && geometryRegistry.getMeshes(object.id).length > 0);
          const basesReady = (["upper", "lower"] as const).every((arch) => {
            const base = packageObjects.find((object) => object.caseRole === "DESIGN" && object.denturePart === "base" && object.dentureArch === arch && object.editable);
            return !!base && geometryRegistry.stats(base.id).triangleCount > 100 && geometryRegistry.getMeshes(base.id).length > 0;
          });
          const bordersReady = (["upper", "lower"] as const).every((arch) => bordersFor(arch).length > 0);
          const contact = useAnalysisStore.getState().getCurrent("contact");
          const contactArchs = contact?.targets.map((target) => packageObjects.find((object) => object.id === target.objectId)?.dentureArch);
          const relationReady = contact?.targets.length === 2 && contactArchs?.includes("upper") && contactArchs.includes("lower");
          valid = teethReady && basesReady && bordersReady && Boolean(relationReady);
          message = valid ? "The package has 28 editable tooth identities, two editable bases, closed upper/lower borders and current synthetic opposing analysis." : "Review all 28 package teeth, both editable bases, both closed arch borders, and run current contact analysis between upper and lower setup objects.";
        }
      } else if (config.check === "model_analysis") {
        const archIds = config.arch ? [config.arch === "upper" ? DENTURE_IDS.upperArch : DENTURE_IDS.lowerArch] : [DENTURE_IDS.upperArch, DENTURE_IDS.lowerArch];
        const midlineIds = config.arch ? [config.arch === "upper" ? DENTURE_IDS.upperMidline : DENTURE_IDS.lowerMidline] : [DENTURE_IDS.upperMidline, DENTURE_IDS.lowerMidline];
        const guidesExist = archIds.every((id) => curves.some((curve) => curve.objectId === cadObjectId(id) && curve.kind === "denture_arch_guide" && curve.points.length >= 3));
        const midlinesExist = midlineIds.every((id) => curves.some((curve) => curve.objectId === cadObjectId(id) && curve.kind === "denture_midline" && curve.points.length >= 2) && objects.some((object) => object.id === cadObjectId(id) && object.editable));
        const plane = objects.find((object) => object.id === cadObjectId(DENTURE_IDS.plane) && object.denturePart === "plane" && object.editable);
        const planeAdjusted = !!plane && (plane.transform.position.some((value, index) => Math.abs(value - [0, 0, 4][index]) > 0.01) || plane.transform.rotation.some((value) => Math.abs(value) > 0.01));
        valid = guidesExist && midlinesExist && planeAdjusted;
        message = valid ? "Editable midline, arch guide and occlusal plane references are present." : "Restore the midline, arch guide and editable occlusal plane references.";
      } else if (config.check === "tooth_setup") {
        const teeth = objects.filter((object) => object.denturePart === "tooth" && object.role === "denture_tooth");
        const identities = new Set(teeth.map((object) => object.dentalPosition));
        const archTeeth = config.arch ? teeth.filter((object) => object.dentureArch === config.arch) : teeth;
        const targetTeeth = config.segment ? archTeeth.filter((object) => config.segment === "anterior" ? (object.dentalPosition ?? 0) % 10 <= 3 : (object.dentalPosition ?? 0) % 10 >= 4) : archTeeth;
        const selectionReady = !config.segment && config.arch === undefined && teeth.every((object) => object.toothSetId === "broad");
        const setupAdjusted = !!config.segment && targetTeeth.some((object) => {
          if (!object.dentalPosition || !object.dentureArch) return false;
          const initial = positionForTooth(object.dentalPosition, object.dentureArch);
          return object.transform.position.some((value, index) => Math.abs(value - initial.position[index]) > 0.01) || object.transform.rotation.some((value, index) => Math.abs(value - initial.rotation[index]) > 0.01);
        });
        valid = teeth.length === 32 && identities.size === 32 && teeth.every((object) => object.editable && Number.isInteger(object.dentalPosition) && geometryRegistry.getMeshes(object.id).length > 0) && (selectionReady || setupAdjusted);
        message = valid ? config.segment ? "The selected FDI segment has an adjusted tooth transform." : "The broad synthetic tooth set is active and all 32 FDI tooth identities remain stable." : config.segment ? "Adjust at least one tooth in the requested anterior or posterior segment." : "Choose the broad synthetic tooth set and confirm all 32 editable FDI identities.";
      } else if (config.check === "chain_mode") {
        valid = useDentureSetupStore.getState().mode === "chain" && useHistoryStore.getState().undoStack.some((command) => command.label === "Transform linked tooth chain");
        message = valid ? "A linked tooth chain was transformed with the shared CAD history." : "Choose Chain Mode and move a tooth with its neighbors as a linked segment.";
      } else if (config.check === "boundary") {
        const archId = config.arch ? config.arch === "upper" ? DENTURE_IDS.upperArch : DENTURE_IDS.lowerArch : null;
        const boundaries = curves.filter((curve) => curve.kind === "boundary" && (!archId || curve.objectId === cadObjectId(archId)));
        valid = boundaries.length > 0 && boundaries.every((curve) => validateClosedCurve(curve).valid);
        message = valid ? "A closed, editable denture border is stored without changing the supporting arch mesh." : "Draw at least three points on the arch and close the Denture Border.";
      } else if (config.check === "base") {
        const baseIds = config.arch ? [config.arch === "upper" ? DENTURE_IDS.upperBase : DENTURE_IDS.lowerBase] : [DENTURE_IDS.upperBase, DENTURE_IDS.lowerBase];
        const baseReady = baseIds.every((id) => { const object = objects.find((item) => item.id === cadObjectId(id)); const stats = object?.geometryStats; const runtime = object && geometryRegistry.get(object.id); return object?.role === "denture_base" && object.editable && !!stats && stats.triangleCount > 100 && (runtime?.geometryRevision ?? 0) > 0 && geometryRegistry.getMeshes(object.id).length > 0; });
        const boundaryReady = useCurveStore.getState().curves.some((curve) => curve.kind === "boundary" && (!config.arch || curve.objectId === cadObjectId(config.arch === "upper" ? DENTURE_IDS.upperArch : DENTURE_IDS.lowerArch)) && validateClosedCurve(curve).valid);
        valid = baseReady && boundaryReady;
        message = valid ? "A closed denture border and edited synthetic base with procedural tooth seats are available." : "Close the arch Denture Border, then edit or regenerate its base before Design Check.";
      } else {
        const hasTeeth = objects.filter((object) => object.denturePart === "tooth").length === 32;
        const hasBases = objects.filter((object) => object.denturePart === "base" && object.editable && (geometryRegistry.get(object.id)?.geometryRevision ?? 0) > 0).length === 2;
        const hasBorders = [DENTURE_IDS.upperArch, DENTURE_IDS.lowerArch].every((id) => curves.some((curve) => curve.kind === "boundary" && curve.objectId === cadObjectId(id) && validateClosedCurve(curve).valid));
        const currentContact = useAnalysisStore.getState().getCurrent("contact");
        const contactArchs = currentContact?.targets.map((target) => objects.find((object) => object.id === target.objectId)?.dentureArch);
        const staticOcclusion = !!(currentContact?.targets.length === 2 && contactArchs?.includes("upper") && contactArchs.includes("lower"));
        valid = hasTeeth && hasBases && hasBorders && useDentureSetupStore.getState().mode !== "individual" && staticOcclusion;
        message = valid ? "Synthetic setup, upper/lower borders, edited bases and current static opposing analysis are present." : "Review both arch setups, edit both bases, close both borders, choose a group mode and run a current static opposing analysis.";
      }
      return { id: `${context.step.id}:denture_setup:${config.check}`, validatorType: config.type, outcome: valid ? "pass" : "fail", title: valid ? { en: "Denture setup check passed", sr: "Provera postavke proteze je uspešna" } : { en: "Denture setup needs attention", sr: "Postavka proteze zahteva proveru" }, message: { en: message, sr: valid ? "Postoje očekivane sintetičke reference i CAD objekti za ovaj korak." : "Pregledajte objekte i uputstvo za ovaj korak, pa ponovo pokrenite Design Check." } };
    },
  },
  restorative_setup: {
    type: "restorative_setup",
    parse: (config) => validatorConfigSchema.parse(config),
    run: (context, raw) => {
      const config = validatorConfigSchema.parse(raw);
      if (config.type !== "restorative_setup") throw new Error("Invalid restorative setup configuration.");
      const setup = useRestorativeSetupStore.getState();
      const type = config.restorationType ?? setup.restorationType;
      const ids = type && RESTORATION_TYPES.includes(type as RestorationType) ? restorativeCaseIds(type) : null;
      const objects = useWorkspaceStore.getState().objects;
      const packageDesign = type ? objects.find((object) => object.caseRole === "DESIGN" && object.restorationType === type && !!object.casePackageId) : undefined;
      const restoration = packageDesign ?? (ids ? objects.find((object) => object.id === cadObjectId(ids.restoration)) : undefined);
      const preparations = packageDesign
        ? objects.filter((object) => object.casePackageId === packageDesign.casePackageId && object.caseRole === "SOURCE" && object.role === "prepared_tooth")
        : (ids?.preparations.map(cadObjectId) ?? []).flatMap((id) => { const object = objects.find((candidate) => candidate.id === id); return object ? [object] : []; });
      const marginsClosed = preparations.length > 0 && preparations.every((object) => validateClosedCurve(useCurveStore.getState().active(object.id, "margin")).valid);
      const history = useHistoryStore.getState().undoStack;
      const transformEdited = !!restoration && (restoration.transform.position.some((value, index) => Math.abs(value - [0, 0, 0][index]) > 0.01)
        || restoration.transform.rotation.some((value) => Math.abs(value) > 0.01)
        || restoration.transform.scale.some((value) => Math.abs(value - 1) > 0.01));
      const edited = !!restoration && ((geometryRegistry.get(restoration.id)?.geometryRevision ?? 0) > 0
        || history.some((command) => command.label === "Transform object")
        || (!!packageDesign && transformEdited));
      let valid = false; let message = "Select the matching synthetic restoration case and complete its exercise targets.";
      if (config.check === "bridge_design") {
        const unitIds = setup.units.map((unit) => unit.id);
        const expectedUnitIds = restoration?.restorationUnitIds ?? [];
        const correctUnits = setup.restorationType === "bridge" && restoration?.restorationType === "bridge"
          && expectedUnitIds.length === 5 && expectedUnitIds.every((unitId) => unitIds.includes(unitId))
          && setup.units.filter((unit) => unit.kind === "abutment").length === 2
          && setup.units.filter((unit) => unit.kind === "pontic").length === 1
          && setup.units.filter((unit) => unit.kind === "connector").length === 2;
        valid = correctUnits && marginsClosed && !!restoration && geometryRegistry.getMeshes(restoration.id).length > 0;
        message = valid ? "The connected bridge has two abutment units, one pontic, two connectors, and a separate closed margin on each prepared abutment." : "Confirm the connected bridge units and close a separate Margin Line on each abutment preparation.";
      } else if (config.check === "veneer_position") {
        const hasShellSemantics = packageDesign?.caseWorkflowMetadata?.coverage === "thin-facial-and-incisal-shell";
        const hasDesignEdit = transformEdited || (restoration ? geometryRegistry.get(restoration.id)?.geometryRevision ?? 0 : 0) > 0;
        valid = type === "veneer" && setup.restorationType === "veneer" && !!restoration?.editable && (!packageDesign || hasShellSemantics) && hasDesignEdit;
        message = valid ? "The thin facial-shell design and its placement or geometry state are available in the shared CAD workspace." : "Position or edit the thin facial veneer using the standard CAD transforms or sculpt tools.";
      } else {
        const expectedType = config.restorationType ?? setup.restorationType;
        const coverage = packageDesign?.caseWorkflowMetadata?.coverage;
        const coverageIsDistinct = expectedType === "inlay" ? coverage === "central-intracoronal-patch"
          : expectedType === "onlay" ? coverage === "broad-partial-cuspal-coverage"
            : expectedType === "crown" ? packageDesign !== undefined
              : false;
        valid = !!expectedType && expectedType !== "bridge" && setup.restorationType === expectedType && !!restoration?.editable && !!geometryRegistry.getMeshes(restoration.id).length && (packageDesign ? edited && coverageIsDistinct : edited || marginsClosed);
        message = valid ? `The ${expectedType} design is loaded with its exercise coverage semantics and shared CAD editing or margin workflow.` : `Inspect the ${expectedType ?? "restoration"} margin and edit its package-backed exercise design before Design Check.`;
      }
      return { id: `${context.step.id}:restorative_setup:${config.check}`, validatorType: config.type, outcome: valid ? "pass" : "fail", title: valid ? { en: "Restorative workflow check passed", sr: "Provera protetskog rada je uspešna" } : { en: "Restorative design needs attention", sr: "Provera nadoknade zahteva pažnju" }, message: { en: message, sr: valid ? "Postoje očekivani identiteti objekta i CAD postupak za ovaj korak." : "Proverite identitet objekata i uputstvo za korak, pa ponovite Design Check." }, objectId: restoration?.id };
    },
  },
  partial_denture_setup: {
    type: "partial_denture_setup",
    parse: (config) => validatorConfigSchema.parse(config),
    run: (context, raw) => {
      const config = validatorConfigSchema.parse(raw);
      if (config.type !== "partial_denture_setup") throw new Error("Invalid Partial Denture validator configuration.");
      const setup = usePartialDentureStore.getState();
      const klass = config.kennedyClass ?? setup.kennedyClass;
      const objects = useWorkspaceStore.getState().objects;
      const packageId = objects.find((object) => object.casePackageId && object.partialDenturePart === "arch")?.casePackageId;
      const r5Objects = packageId?.startsWith("r5-partial-denture-kennedy-") ? objects.filter((object) => object.casePackageId === packageId) : [];
      if (r5Objects.length && klass && setup.kennedyClass === klass) {
        const parts = (part: string) => r5Objects.filter((object) => object.partialDenturePart === part);
        const abutmentIds = setup.abutmentObjectIds;
        const currentUndercut = useAnalysisStore.getState().getCurrent("undercut")?.targets.some((target) => abutmentIds.includes(target.objectId));
        const registered = (items: typeof r5Objects) => items.every((object) => geometryRegistry.getMeshes(object.id).length > 0);
        const restObjects = parts("rest").filter((object) => object.caseRole === "DESIGN");
        const major = parts("major_connector").filter((object) => object.caseRole === "DESIGN");
        const minor = parts("minor_connector").filter((object) => object.caseRole === "DESIGN");
        const clasps = parts("clasp").filter((object) => object.caseRole === "DESIGN");
        const saddles = parts("saddle").filter((object) => object.caseRole === "DESIGN");
        const meshes = parts("retention_mesh").filter((object) => object.caseRole === "DESIGN");
        const blockouts = parts("blockout");
        const surveyGuides = parts("survey_line");
        const finishLines = parts("finish_line");
        const restAssignmentsValid = restObjects.length >= abutmentIds.length && abutmentIds.every((id) => restObjects.some((object) => object.partialDentureAbutmentObjectId === id));
        const claspAssignmentsValid = clasps.length >= abutmentIds.length && abutmentIds.every((id) => clasps.some((object) => object.partialDentureAbutmentObjectId === id));
        const saddleCoverageValid = saddles.length > 0 && saddles.length === meshes.length && saddles.every((saddle) => meshes.some((mesh) => JSON.stringify(mesh.caseWorkflowMetadata?.missingToothNumbers) === JSON.stringify(saddle.caseWorkflowMetadata?.missingToothNumbers)));
        const parentLinksValid = [...minor, ...restObjects, ...clasps].every((object) => object.partialDentureParentComponentId === major[0]?.id);
        const structural = major.length === 1 && restAssignmentsValid && clasps.length > 0 && claspAssignmentsValid && minor.length === saddles.length && saddleCoverageValid && finishLines.length === saddles.length && parentLinksValid && registered([...major, ...restObjects, ...minor, ...clasps, ...saddles, ...meshes, ...blockouts]);
        const checks: Record<typeof config.check, boolean> = {
          survey: setup.surveyCompleted && surveyGuides.length === abutmentIds.length,
          insertion_path: setup.insertionPathSelected && Math.hypot(...useRestorativeSetupStore.getState().insertionDirection) > 0.99,
          contours: setup.contoursReviewed && setup.insertionPathSelected && surveyGuides.length === abutmentIds.length,
          undercuts: Boolean(currentUndercut),
          blockout: setup.blockoutApplied && blockouts.length === abutmentIds.length && blockouts.every((object) => object.visible),
          rests: restAssignmentsValid && restObjects.every((object) => object.visible && object.editable && geometryRegistry.getMeshes(object.id).length > 0),
          major_connector: major.length === 1 && major[0].visible && major[0].editable && !!major[0].partialDentureConnectorForm && registered(major),
          minor_connectors: minor.length === saddles.length && minor.length > 0 && minor.every((object) => object.visible && object.partialDentureParentComponentId === major[0]?.id) && registered(minor),
          clasps: claspAssignmentsValid && clasps.every((object) => object.visible && object.editable && object.partialDentureAbutmentObjectId) && registered(clasps),
          saddle_mesh: saddleCoverageValid && [...saddles, ...meshes].every((object) => object.visible && object.editable) && registered([...saddles, ...meshes]),
          finish_lines: finishLines.length === saddles.length && finishLines.every((object) => object.visible && object.editable) && registered(finishLines),
          framework: structural,
          complete_case: structural && setup.surveyCompleted && setup.insertionPathSelected && setup.contoursReviewed && setup.undercutsReviewed && setup.blockoutApplied && ["rest", "major_connector", "minor_connector", "clasp", "saddle", "retention_mesh", "finish_line"].every((part) => parts(part).some((object) => object.visible)),
        };
        const passed = checks[config.check];
        const objectId = config.check === "rests" ? restObjects[0]?.id : config.check === "clasps" ? clasps[0]?.id : major[0]?.id ?? setup.archObjectId ?? undefined;
        const names: Record<typeof config.check, string> = { survey: "Survey", insertion_path: "Insertion path", contours: "Contour review", undercuts: "Directional undercut preview", blockout: "Blockout", rests: "Rests", major_connector: "Major connector", minor_connectors: "Minor connectors", clasps: "Clasps", saddle_mesh: "Saddle and retention mesh", finish_lines: "Finish lines", framework: "Framework", complete_case: "Final Design Check" };
        const missing: Record<typeof config.check, string> = {
          survey: "mark the visible abutment contour survey as reviewed",
          insertion_path: "choose an insertion direction with the Partial Denture controls",
          contours: "review the current tooth contour guides after choosing an insertion path",
          undercuts: "run the shared directional Preview path on an abutment tooth",
          blockout: "show the insertion-path related blockout surfaces",
          rests: "show and inspect the editable tooth-associated rest objects",
          major_connector: "show the editable major connector matched to this arch",
          minor_connectors: "show minor connectors linking the major connector to each saddle",
          clasps: "show editable clasp paths assigned to the planned abutment teeth",
          saddle_mesh: "show matching editable saddle and retention mesh regions",
          finish_lines: "show the finish-line guides that follow the saddle borders",
          framework: "review all registered framework components and their stable relationships",
          complete_case: "complete the survey, path, contour, undercut, blockout and framework reviews",
        };
        const passedSr = `Kennedy ${klass}: postoje objekti za ${names[config.check].toLowerCase()} u sintetičkom edukativnom paketu; ovo nije klinička validacija.`;
        return { id: `${context.step.id}:partial_denture_setup:${config.check}`, validatorType: config.type, outcome: passed ? "pass" : "fail", title: passed ? { en: `${names[config.check]} check passed`, sr: `Provera: ${names[config.check].toLowerCase()} je uspešna` } : { en: `${names[config.check]} needs attention`, sr: `Proverite: ${names[config.check].toLowerCase()}` }, message: { en: passed ? `Kennedy ${klass}: the synthetic package contains the reviewed ${names[config.check].toLowerCase()} state for this exercise.` : `Kennedy ${klass}: ${missing[config.check]}. The directional display is an exercise preview.`, sr: passed ? passedSr : `Kennedy ${klass}: ${missing[config.check]}. Prikaz ekvatora je pregled za vežbu.` }, objectId };
      }
      const currentCase = !!klass && setup.kennedyClass === klass && useWorkspaceStore.getState().objects.some((object) => object.partialDentureClass === klass && object.partialDenturePart === "arch");
      const currentUndercut = currentCase && !!setup.archObjectId && !!useAnalysisStore.getState().getCurrent("undercut", [setup.archObjectId]);
      const components = setup.components;
      const byKind = (kind: string) => components.filter((component) => component.kind === kind);
      const curvesValid = components.every((component) => useCurveStore.getState().curves.some((curve) => curve.id === component.curveId && curve.objectId === cadObjectId(component.id) && curve.kind === "framework_path" && curve.points.length >= 2));
      const relationshipsValid = components.filter((component) => component.abutmentObjectId).every((component) => setup.abutmentObjectIds.includes(component.abutmentObjectId!) && !!context.getObject(component.abutmentObjectId!));
      const meshesValid = components.every((component) => !!geometryRegistry.get(cadObjectId(component.id)) && geometryRegistry.getMeshes(cadObjectId(component.id)).length > 0);
      const frameworkReady = currentCase && byKind("major_connector").length > 0 && byKind("lingual_bar").length > 0 && byKind("retention_mesh").length > 0 && byKind("clasp").length > 0 && byKind("minor_connector").length > 0 && byKind("rest").length > 0 && relationshipsValid && curvesValid && meshesValid;
      const complete = frameworkReady && byKind("blockout").length > 0 && byKind("guide_plane").length > 0 && byKind("finish_line").length > 0 && byKind("relief").length > 0 && currentUndercut;
      const passed = config.check === "survey" ? currentUndercut : config.check === "framework" ? frameworkReady : complete;
      const missing = config.check === "survey" ? !currentUndercut ? "Run a current directional undercut preview for the surveyed arch." : "" : config.check === "framework" ? [!byKind("major_connector").length && "major connector", !byKind("lingual_bar").length && "lingual bar", !byKind("retention_mesh").length && "retention mesh", !byKind("rest").length && "rest", !byKind("clasp").length && "clasp", !byKind("minor_connector").length && "minor connector", !relationshipsValid && "abutment relationship", !curvesValid && "framework path curve", !meshesValid && "registered component geometry"].filter(Boolean).join(", ") : [!frameworkReady && "framework components", !byKind("blockout").length && "blockout", !byKind("guide_plane").length && "guide plane", !byKind("finish_line").length && "finish line", !byKind("relief").length && "relief", !currentUndercut && "current survey preview"].filter(Boolean).join(", ");
      const objectId = !relationshipsValid ? components.find((component) => component.abutmentObjectId && !setup.abutmentObjectIds.includes(component.abutmentObjectId))?.id : setup.archObjectId ?? undefined;
      const title = passed ? { en: "Partial Denture check passed", sr: "Provera parcijalne proteze je uspešna" } : { en: "Partial Denture work needs attention", sr: "Rad na parcijalnoj protezi zahteva proveru" };
      return { id: `${context.step.id}:partial_denture_setup:${config.check}`, validatorType: config.type, outcome: passed ? "pass" : "fail", title, message: { en: passed ? `Kennedy ${klass} has current shared survey state and registered framework components with tooth relationships.` : `${missing || "Open the matching synthetic Kennedy case and review its CAD components."}`, sr: passed ? `Kennedy ${klass} ima aktuelno stanje zajedničke analize i registrovane komponente skeleta povezane sa zubima.` : `Proverite: ${missing || "otvorite odgovarajući sintetički Kennedy slučaj i njegove CAD komponente."}` }, objectId };
    },
  },
  analysis_target: {
    type: "analysis_target",
    parse: (config) => validatorConfigSchema.parse(config),
    run: (context, raw) => {
      const config = validatorConfigSchema.parse(raw);
      if (config.type !== "analysis_target") throw new Error("Invalid analysis target configuration.");
      const result = useAnalysisStore.getState().getCurrent(config.kind, config.objectIds);
      const label = config.kind === "dynamic_contact" ? "Dynamic sampled contact" : config.kind === "contact" ? "Proximity analysis" : config.kind === "thickness" ? "Thickness analysis" : config.kind === "undercut" ? "Insertion path preview" : "Deviation analysis";
      const labelSr = config.kind === "dynamic_contact" ? "uzorkovani dinamički kontakt" : config.kind === "contact" ? "analiza blizine" : config.kind === "thickness" ? "analiza debljine" : config.kind === "undercut" ? "prikaz smera insercije" : "analiza odstupanja";
      const value = result && config.kind === "dynamic_contact" && result.kind === "dynamic_contact" ? result.firstContactT ?? undefined
        : result && "minMm" in result ? config.kind === "thickness" ? result.minMm : config.kind === "undercut" ? result.maxMm : result.minMm : undefined;
      const withinMax = config.maxValue === undefined || value === undefined || value <= config.maxValue;
      const withinMin = config.minValue === undefined || value === undefined || value >= config.minValue;
      const pass = Boolean(result) && withinMax && withinMin;
      const dynamicText = config.kind === "dynamic_contact";
      const format = (number: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(number);
      const formatSr = (number: number) => new Intl.NumberFormat("sr-Latn-RS", { maximumFractionDigits: 2 }).format(number);
      const unit = dynamicText ? "%" : "mm";
      const showValue = (number: number) => `${format(dynamicText ? number * 100 : number)} ${unit}`;
      const showValueSr = (number: number) => `${formatSr(dynamicText ? number * 100 : number)} ${unit}`;
      const minEn = config.minValue === undefined ? "" : `at least ${showValue(config.minValue)}`;
      const maxEn = config.maxValue === undefined ? "" : `no more than ${showValue(config.maxValue)}`;
      const minSr = config.minValue === undefined ? "" : `najmanje ${showValueSr(config.minValue)}`;
      const maxSr = config.maxValue === undefined ? "" : `najviše ${showValueSr(config.maxValue)}`;
      const targetTextEn = [minEn, maxEn].filter(Boolean).join(" and ");
      const targetTextSr = [minSr, maxSr].filter(Boolean).join(" i ");
      const targetLabelEn = targetTextEn ? ` Target for this exercise: ${targetTextEn}.` : "";
      const targetLabelSr = targetTextSr ? ` Cilj za ovu vežbu: ${targetTextSr}.` : "";
      const passMessageEn = targetTextEn ? `Current measured value ${value === undefined ? "" : showValue(value)} meets the configured criteria.${targetLabelEn}` : `A current ${dynamicText ? "multi-pose sampled contact" : label.toLowerCase()} exists for the configured case objects.`;
      const passMessageSr = targetTextSr ? `Trenutna izmerena vrednost ${value === undefined ? "" : showValueSr(value)} ispunjava zadate kriterijume.${targetLabelSr}` : dynamicText ? "Postoji aktuelna analiza kontakta kroz više uzorkovanih položaja za podešene objekte." : `Postoji aktuelna ${labelSr} za podešene objekte slučaja.`;
      const failMessageEn = result ? `Measured value ${value === undefined ? "" : showValue(value)} is outside the configured exercise range.${targetLabelEn}` : `Run a current ${dynamicText ? "multi-pose sampled contact" : label.toLowerCase()} for the configured case objects, then check again.${targetLabelEn}`;
      const failMessageSr = result ? `Izmerena vrednost ${value === undefined ? "" : showValueSr(value)} je izvan zadatog opsega za vežbu.${targetLabelSr}` : `${dynamicText ? "Pokrenite aktuelnu uzorkovanu analizu kontakta kroz više položaja" : `Pokrenite aktuelnu ${labelSr}`} za podešene objekte slučaja, pa ponovite proveru.${targetLabelSr}`;
      return { id: `${context.step.id}:analysis_target:${config.kind}`, validatorType: config.type, outcome: pass ? "pass" : "fail", title: pass ? { en: `${label} target met`, sr: `Cilj za ${labelSr} je ispunjen` } : { en: `${label} needs attention`, sr: `Proverite ${labelSr}` }, message: { en: pass ? passMessageEn : failMessageEn, sr: pass ? passMessageSr : failMessageSr }, measured: value, target: config.minValue ?? config.maxValue, objectId: config.objectIds[0] };
    },
  },
  implant_check: {
    type: "implant_check",
    parse: (config) => validatorConfigSchema.parse(config),
    run: (context, raw) => {
      const config = validatorConfigSchema.parse(raw);
      if (config.type !== "implant_check") throw new Error("Invalid Implant validator configuration.");
      const objects = useWorkspaceStore.getState().objects;
      const fixture = config.objectId ? context.getObject(config.objectId) : objects.find((object) => object.implantPart === "fixture" && !object.implantReference);
      const setup = useImplantStore.getState();
      let pass = false, measured: number | undefined, target = config.targetMm, message: string;
      if (config.check === "fixture") {
        pass = !!fixture && fixture.implantPart === "fixture" && geometryRegistry.getMeshes(fixture.id).length > 0;
        message = pass && fixture ? `Synthetic fixture ${fixture.name} is registered with definition ${fixture.implantDefinitionId ?? "unknown"} and ${fixture.implantDiameterMm?.toFixed(1) ?? "—"} × ${fixture.implantLengthMm?.toFixed(1) ?? "—"} mm metadata.` : "Add or select a registered synthetic training fixture from the shared Scene.";
      } else if (config.check === "depth") {
        const depth = fixture && fixture.implantLengthMm !== undefined ? fixture.implantLengthMm - fixture.transform.position[2] : undefined;
        measured = depth; target ??= setup.exerciseDepthTargetMm;
        pass = depth !== undefined && Math.abs(depth - target) <= (config.tolerance ?? 0.5);
        message = pass ? `Fixture depth ${depth?.toFixed(1)} mm is within ${config.tolerance ?? 0.5} mm of the exercise target (${target} mm).` : depth === undefined ? "The synthetic fixture depth is unavailable." : `Fixture depth is ${Math.abs(depth - target).toFixed(1)} mm from the exercise target (${target} mm). Adjust depth in the Implant panel.`;
      } else if (config.check === "axis") {
        measured = fixture ? axisAngleDegrees(implantAxisFromTransform(fixture.transform), setup.restorativeAxis) : undefined;
        target ??= setup.exerciseAngleTargetDeg;
        pass = measured !== undefined && measured <= target;
        message = pass ? `Implant Axis differs from the Restorative Axis by ${measured?.toFixed(1)}°, within this exercise target (${target}°).` : measured === undefined ? "Select a synthetic fixture to calculate its axis." : `Implant Axis differs from the Restorative Axis by ${measured.toFixed(1)}°, above this exercise target (${target}°). Adjust angulation in the Implant panel.`;
      } else if (config.check === "distance") {
        const current = useAnalysisStore.getState().results.find((item) => item.kind === "contact" && analysisResultIsCurrent(item) && item.targets.some((entry) => entry.objectId === cadObjectId("implant-training-fixture-primary")) && item.targets.some((entry) => entry.objectId === cadObjectId("implant-synthetic-reference-region")));
        measured = current && "minMm" in current ? current.minMm : undefined; target ??= setup.exerciseDistanceTargetMm;
        pass = measured !== undefined && measured >= target;
        message = measured === undefined ? "Run current shared Proximity analysis between the synthetic fixture and synthetic reference region; stale results do not count." : pass ? `The calculated minimum separation is ${measured.toFixed(2)} mm, meeting this exercise target (${target} mm).` : `The calculated minimum separation is ${measured.toFixed(2)} mm, below this exercise target (${target} mm). Review the synthetic geometry and rerun analysis.`;
      } else {
        const abutment = objects.find((object) => object.implantPart === "abutment");
        const restoration = objects.find((object) => object.implantPart === "restoration");
        const scanBody = objects.find((object) => object.implantPart === "scan_body");
        pass = !!fixture && !!abutment && !!restoration && !!scanBody && abutment.implantFixtureObjectId === fixture.id && restoration.implantParentObjectId === abutment.id && scanBody.implantFixtureObjectId === fixture.id;
        message = pass ? "Fixture, scan body, typed abutment and shared crown object have explicit stable-ID relationships." : "Review the explicit fixture → scan body / abutment → shared restoration relationships in the Implant case.";
      }
      const title = pass ? { en: "Implant exercise check passed", sr: "Provera implantološke vežbe je uspešna" } : { en: "Implant exercise needs attention", sr: "Provera implantološke vežbe zahteva pažnju" };
      const srMessage = config.check === "axis" && measured !== undefined ? `Osa implantata odstupa od restaurativne ose ${measured.toFixed(1)}°, a cilj ove vežbe je najviše ${target}°.` : pass ? "Sintetički objekti i izračunate vrednosti ispunjavaju cilj ove vežbe." : "Proverite navedeni sintetički objekat, odnos ili vrednost cilja vežbe, pa ponovite Design Check.";
      return { id: `${context.step.id}:implant_check:${config.check}`, validatorType: config.type, outcome: pass ? "pass" : "fail", title, message: { en: message, sr: srMessage }, measured, target, objectId: fixture?.id };
    },
  },
  r7_workflow: {
    type: "r7_workflow",
    parse: (config) => validatorConfigSchema.parse(config),
    run: (context, raw) => {
      const config = validatorConfigSchema.parse(raw);
      if (config.type !== "r7_workflow") throw new Error("Invalid R7 workflow check.");
      const allObjects = useWorkspaceStore.getState().objects;
      const packageId = allObjects.find((object) => object.casePackageId?.startsWith("r7-implant-"))?.casePackageId;
      const objects = packageId ? allObjects.filter((object) => object.casePackageId === packageId) : [];
      const part = (name: string) => objects.find((object) => object.caseWorkflowMetadata?.implantRole === name);
      const fixture = part("fixture");
      const scanBody = part("scan_body");
      const axis = part("implant_axis");
      const emergence = part("emergence");
      const abutment = part("abutment");
      const crown = part("crown");
      const antagonist = part("antagonist");
      const mesial = objects.find((object) => object.caseWorkflowMetadata?.implantRole === "neighbor" && object.caseWorkflowMetadata.neighborSide === "mesial");
      const distal = objects.find((object) => object.caseWorkflowMetadata?.implantRole === "neighbor" && object.caseWorkflowMetadata.neighborSide === "distal");
      const access = part("screw_access");
      const allRolesPresent = !!fixture && !!scanBody && !!axis && !!emergence && !!abutment && !!crown && !!antagonist && !!mesial && !!distal && !!access;
      const stageMatches = objects.length > 0 && objects.every((object) => object.caseCheckpointId === config.check);
      const hasMeshes = (object: typeof fixture) => !!object && geometryRegistry.getMeshes(object.id).length > 0;
      const targetAxis = fixture?.caseWorkflowMetadata?.implantAxis;
      const axisResolved = Array.isArray(targetAxis) && targetAxis.length === 3 && targetAxis.every((value) => typeof value === "number" && Number.isFinite(value))
        && !!fixture && !!axis && axisAngleDegrees(implantAxisFromTransform(fixture.transform), targetAxis as number[]) <= 1
        && axisAngleDegrees(implantAxisFromTransform(axis.transform), targetAxis as number[]) <= 1;
      const scanBodyResolved = !!scanBody && !!fixture && scanBody.caseRole === "SOURCE" && scanBody.editable === false
        && scanBody.caseWorkflowMetadata?.resolvesFixtureObjectId === fixture.caseObjectId
        && scanBody.caseWorkflowMetadata?.scanBodyId === fixture.caseWorkflowMetadata?.scanBodyId
        && hasMeshes(scanBody) && axisAngleDegrees(implantAxisFromTransform(scanBody.transform), implantAxisFromTransform(fixture.transform)) <= 1;
      const separateDesign = !!emergence && !!abutment && !!crown && emergence.caseRole === "DESIGN" && abutment.caseRole === "DESIGN" && crown.caseRole === "DESIGN"
        && emergence.editable && abutment.editable && crown.editable && new Set([emergence.id, abutment.id, crown.id]).size === 3;
      const linkedAbutment = !!abutment && !!fixture && abutment.caseWorkflowMetadata?.parentFixtureObjectId === fixture.caseObjectId
        && abutment.caseWorkflowMetadata?.supportsCrownObjectId === crown?.caseObjectId && hasMeshes(abutment);
      const crownProposal = !!crown && crown.role === "crown" && crown.caseWorkflowMetadata?.sourceLibrary === "private-dundee-anatomy"
        && crown.caseAssetMetadata?.provenance.source?.includes("University of Dundee") === true && hasMeshes(crown);
      const abutmentAxisOkay = !!abutment && !!fixture && axisAngleDegrees(implantAxisFromTransform(abutment.transform), implantAxisFromTransform(fixture.transform)) <= 1;
      const crownAxisOkay = !!crown && !!fixture && axisAngleDegrees(implantAxisFromTransform(crown.transform), implantAxisFromTransform(fixture.transform)) <= 1;
      const crownCentered = !!crown && !!fixture && Math.hypot(crown.transform.position[0] - fixture.transform.position[0], crown.transform.position[1] - fixture.transform.position[1]) <= 2;
      const accessAligned = !!access && !!fixture && access.caseRole === "GUIDE"
        && axisAngleDegrees(implantAxisFromTransform(access.transform), implantAxisFromTransform(fixture.transform)) <= Number(access.caseWorkflowMetadata?.exerciseOrientationLimitDeg ?? 10)
        && Math.hypot(access.transform.position[0] - fixture.transform.position[0], access.transform.position[1] - fixture.transform.position[1]) <= 1;
      const currentPair = (kind: "contact" | "intersection", first?: typeof crown, second?: typeof crown) => !!first && !!second && useAnalysisStore.getState().results.some((result) => result.kind === kind && analysisResultIsCurrent(result) && result.targets.some((target) => target.objectId === first.id) && result.targets.some((target) => target.objectId === second.id));
      const hasContact = (second?: typeof crown) => currentPair("contact", crown, second);
      const contactReviewed = hasContact(mesial) || hasContact(distal);
      const occlusionReviewed = hasContact(antagonist);
      const intersectionResult = useAnalysisStore.getState().results.find((result) => result.kind === "intersection" && analysisResultIsCurrent(result) && result.targets.some((target) => target.objectId === crown?.id) && result.targets.some((target) => target.objectId === antagonist?.id));
      const grossIntersectionReviewed = intersectionResult?.kind === "intersection" && !intersectionResult.intersects;
      const crownThicknessReviewed = !!crown && useAnalysisStore.getState().results.some((result) => result.kind === "thickness" && analysisResultIsCurrent(result) && result.targets.some((target) => target.objectId === crown.id));
      const structuralFinal = allRolesPresent && separateDesign && linkedAbutment && crownProposal && axisResolved && scanBodyResolved && abutmentAxisOkay && crownAxisOkay && crownCentered && accessAligned;
      const checks: Record<typeof config.check, boolean> = {
        inspect: objects.length > 0 && objects.every((object) => object.caseRole) && allRolesPresent,
        scan_body: stageMatches && scanBodyResolved,
        implant_axis: stageMatches && axisResolved && scanBodyResolved && fixture?.editable === false,
        emergence: stageMatches && !!emergence && emergence.caseRole === "DESIGN" && emergence.editable && hasMeshes(emergence),
        abutment: stageMatches && separateDesign && linkedAbutment && abutmentAxisOkay,
        crown_proposal: stageMatches && crownProposal && !!abutment && hasMeshes(abutment),
        crown_position: stageMatches && crownAxisOkay && crownCentered && abutmentAxisOkay,
        contacts: stageMatches && contactReviewed,
        occlusion: stageMatches && occlusionReviewed,
        screw_access: stageMatches && accessAligned && hasMeshes(access),
        final: stageMatches && structuralFinal && occlusionReviewed && grossIntersectionReviewed && crownThicknessReviewed,
      };
      const guidance: Record<typeof config.check, [string, string]> = {
        inspect: ["Inspect the SOURCE segment, neighboring anatomy, soft-tissue/ridge context, scan body, and the three separate DESIGN objects.", "Pregledajte SOURCE segment, susednu anatomiju, gingivu/greben, scan body i tri zasebna DESIGN objekta."],
        scan_body: ["Confirm the indexed SOURCE scan body has its stable scan-body ID and resolves the pre-defined fixture reference.", "Potvrdite da indeksirani SOURCE scan body ima stabilan ID i upu\u0107uje na unapred odre\u0111enu referencu implantata."],
        implant_axis: ["Read the fixed GUIDE axis against the SOURCE scan body and fixture. Implant position is part of the educational case.", "Uporedite fiksnu GUIDE osu sa SOURCE scan body-jem i implantatom. Polo\u017eaj implantata je deo edukativnog slu\u010daja."],
        emergence: ["Select the editable DESIGN emergence profile and refine it with the shared Scale tool. Any numeric target is for this exercise.", "Izaberite DESIGN profil nicanja koji mo\u017ee da se menja i doradite ga zajedni\u010dkim alatom Scale. Broj\u010dani cilj va\u017ei samo za ovu ve\u017ebu."],
        abutment: ["Inspect the separate editable DESIGN abutment and its support relationship to the crown proposal.", "Pregledajte zaseban DESIGN abatment koji mo\u017ee da se menja i njegov odnos potpore sa predlogom krunice."],
        crown_proposal: ["Load and inspect the private Dundee anatomical crown proposal. It is a starting design asset, not a validated fit.", "U\u010ditajte i pregledajte anatomski predlog krunice iz privatne biblioteke Dundee. To je polazni dizajn, ne potvrda naleganja."],
        crown_position: ["Position the editable crown over its separate abutment and keep both aligned to the case's fixed restorative axis.", "Postavite krunicu koja mo\u017ee da se menja iznad zasebnog abatmenta i zadr\u017eite poravnanje sa fiksnom restaurativnom osom slu\u010daja."],
        contacts: ["Run current shared Proximity analysis between the crown and a neighboring SOURCE tooth.", "Pokrenite aktuelnu zajedni\u010dku analizu blizine izme\u0111u krunice i susednog SOURCE zuba."],
        occlusion: ["Run current shared Proximity analysis between the crown and the opposing SOURCE tooth.", "Pokrenite aktuelnu zajedni\u010dku analizu blizine izme\u0111u krunice i suprotnog SOURCE zuba."],
        screw_access: ["Compare the GUIDE screw-access path with the fixed implant axis through the crown. This is a gross educational orientation check.", "Uporedite GUIDE putanju pristupa zavrtnju sa fiksnom osom implantata kroz krunicu. Ovo je gruba edukativna provera orijentacije."],
        final: ["Run current Proximity and Intersection checks for the crown and antagonist, run a Thickness inspection on the crown, then confirm the separate editable designs and fixed references.", "Pokrenite aktuelne analize blizine i preseka krunice i antagoniste, pokrenite pregled debljine krunice, zatim potvrdite zasebne dizajne i fiksne reference."],
      };
      const pass = checks[config.check];
      const [nextEn, nextSr] = guidance[config.check];
      const outcomeMessage = pass
        ? "The synthetic case structure and current restorative workflow checks are present for this exercise."
        : nextEn;
      const outcomeSr = pass
        ? "Postoje struktura sinteti\u010dkog slu\u010daja i aktuelna provera restaurativnog rada. Ovo je edukativna povratna informacija, ne klini\u010dko odobrenje, provera naleganja pacijenta niti odobrenje proizvodnje."
        : nextSr;
      return { id: `${context.step.id}:r7_workflow:${config.check}`, validatorType: config.type, outcome: pass ? "pass" : "fail", title: pass ? { en: "R7 restorative design check passed", sr: "R7 provera restaurativnog dizajna je uspe\u0161na" } : { en: "R7 restorative design needs attention", sr: "R7 restaurativni dizajn zahteva pa\u017enju" }, message: { en: outcomeMessage, sr: outcomeSr }, objectId: crown?.id ?? fixture?.id };
    },
  },
  r6_workflow: {
    type: "r6_workflow",
    parse: (config) => validatorConfigSchema.parse(config),
    run: (context, raw) => {
      const config = validatorConfigSchema.parse(raw);
      if (config.type !== "r6_workflow") throw new Error("Invalid R6 workflow check.");
      const objects = useWorkspaceStore.getState().objects;
      let passed = false;
      let messageEn = "Open the matching R6 package and complete the preceding workflow step.";
      let messageSr = "Otvorite odgovarajući R6 paket i završite prethodni korak.";
      let objectId: string | undefined;
      if (config.workflow === "bite_splint") {
        const setup = useBiteSplintStore.getState();
        const upper = setup.upperArchId && context.getObject(setup.upperArchId);
        const lower = setup.antagonistId && context.getObject(setup.antagonistId);
        const splint = setup.splintId && context.getObject(setup.splintId);
        const packageReady = !!upper && !!lower && !!splint && upper.casePackageId?.startsWith("r6-bite-splint-") && upper.casePackageId === lower.casePackageId && upper.casePackageId === splint.casePackageId && upper.caseRole === "SOURCE" && lower.caseRole === "SOURCE" && splint.caseRole === "DESIGN";
        const boundary = validateClosedCurve(useCurveStore.getState().curves.find((curve) => curve.id === setup.boundaryCurveId), "Splint Boundary").valid;
        const thickness = setup.splintId ? geometryRegistry.stats(cadObjectId(setup.splintId)).boundsMm[2] + 0.001 >= setup.targetThicknessMm : false;
        const pairResult = (kind: "contact" | "intersection") => setup.splintId && setup.antagonistId
          ? useAnalysisStore.getState().getCurrent(kind, [setup.splintId, setup.antagonistId]) ?? useAnalysisStore.getState().getCurrent(kind, [setup.antagonistId, setup.splintId])
          : undefined;
        const contact = pairResult("contact");
        const collision = pairResult("intersection");
        const hasCollisionResult = collision?.kind === "intersection";
        const clearOfGrossIntersection = hasCollisionResult && !collision.intersects;
        const checks = {
          boundary: packageReady && boundary,
          splint: packageReady && !!geometryRegistry.get(cadObjectId(setup.splintId!)) && geometryRegistry.getMeshes(cadObjectId(setup.splintId!)).length > 0,
          thickness: packageReady && thickness,
          contacts: packageReady && !!contact,
          occlusion: packageReady && clearOfGrossIntersection,
          final: packageReady && boundary && thickness && !!contact && clearOfGrossIntersection,
        };
        passed = checks[config.check as keyof typeof checks] ?? false;
        objectId = setup.splintId ?? undefined;
        const guidance: Record<keyof typeof checks, [string, string]> = {
          boundary: ["Review the closed splint boundary on the upper arch.", "Pregledajte zatvorenu granicu udlage na gornjem luku."],
          splint: ["Generate or select the editable arch-conforming DESIGN splint.", "Napravite ili izaberite DIZAJN udlage koja može da se menja i prati zubni luk."],
          thickness: ["Compare the editable shell depth with the thickness target for this exercise.", "Uporedite dubinu udlage koja može da se menja sa ciljem debljine za ovu vežbu."],
          contacts: ["Run current shared Proximity analysis for the splint and lower antagonist.", "Pokrenite aktuelnu zajedničku analizu blizine za udlagu i donjeg antagonista."],
          occlusion: ["Run shared Intersection analysis for the splint and antagonist and review gross overlap.", "Pokrenite zajedničku analizu preseka udlage i antagonista i proverite grubo preklapanje."],
          final: ["Review the boundary, shell, current contact map, and a collision-free synthetic reference pose.", "Pregledajte granicu, udlagu, aktuelnu mapu kontakata i sintetički referentni položaj bez grubog preseka."],
        };
        const [nextEn, nextSr] = guidance[config.check as keyof typeof checks] ?? [messageEn, messageSr];
        if (!passed) { messageEn = nextEn; messageSr = nextSr; }
        else { messageEn = "The synthetic package structure and current shared CAD feedback are present for this exercise."; messageSr = "Struktura sintetičkog paketa i aktuelna povratna informacija zajedničkog CAD sistema prisutni su za ovu vežbu."; }
      } else if (config.workflow === "digital_model") {
        const setup = useDigitalModelStore.getState();
        const rawModel = setup.rawScanId ? context.getObject(setup.rawScanId) : undefined;
        const working = setup.workingModelId ? context.getObject(setup.workingModelId) : undefined;
        const base = setup.baseId ? context.getObject(setup.baseId) : undefined;
        const rawRuntime = setup.rawScanId ? geometryRegistry.get(cadObjectId(setup.rawScanId)) : undefined;
        const workingRuntime = setup.workingModelId ? geometryRegistry.get(cadObjectId(setup.workingModelId)) : undefined;
        const stages = ["raw_scan", "trim", "cleanup", "hole_fill", "orientation", "base", "final"] as const;
        const currentStage = stages.indexOf(setup.stage);
        const requiresStage = (stage: (typeof stages)[number]) => currentStage >= stages.indexOf(stage);
        const packageReady = !!rawModel && !!working && rawModel.casePackageId?.startsWith("r6-digital-model-") && rawModel.casePackageId === working.casePackageId && rawModel.caseRole === "SOURCE" && working.caseRole === "DESIGN";
        const rawPreserved = packageReady && rawModel.editable === false && rawRuntime?.geometryRevision === 0 && rawRuntime?.object !== workingRuntime?.object && geometryRegistry.getMeshes(cadObjectId(setup.rawScanId!))[0]?.geometry !== geometryRegistry.getMeshes(cadObjectId(setup.workingModelId!))[0]?.geometry;
        const baseReady = !!base && base.casePackageId === working?.casePackageId && base.caseRole === "DESIGN" && base.digitalModelPart === "base" && !!geometryRegistry.get(cadObjectId(base.id));
        const checks = {
          working_copy: packageReady && !!working.editable && rawModel?.id !== working.id && !!workingRuntime,
          source_preserved: rawPreserved,
          trim: packageReady && requiresStage("trim") && !!setup.trimBoundaryCurveId,
          cleanup: packageReady && requiresStage("cleanup"),
          hole_fill: packageReady && requiresStage("hole_fill"),
          orientation: packageReady && requiresStage("orientation") && !!workingRuntime,
          base: packageReady && requiresStage("base") && baseReady,
          mesh_check: packageReady && requiresStage("final") && !!workingRuntime && geometryRegistry.stats(cadObjectId(setup.workingModelId!)).triangleCount > 20,
          final: packageReady && rawPreserved && requiresStage("final") && baseReady && !!setup.trimBoundaryCurveId,
        };
        passed = checks[config.check as keyof typeof checks] ?? false;
        objectId = setup.workingModelId ?? undefined;
        const guidance: Record<keyof typeof checks, [string, string]> = {
          working_copy: ["Keep the editable DESIGN copy separate from the locked raw SOURCE.", "Držite radnu DIZAJN kopiju odvojeno od zaključanog sirovog IZVORA."],
          source_preserved: ["The raw SOURCE must remain locked at its original geometry revision.", "Sirovi IZVOR mora ostati zaključan na originalnoj reviziji geometrije."],
          trim: ["Review the trim boundary and prepare the working copy before cleanup.", "Pregledajte granicu trimovanja i pripremite radnu kopiju pre čišćenja."],
          cleanup: ["Remove scan excess and disconnected components from the working copy.", "Uklonite višak snimka i odvojene komponente iz radne kopije."],
          hole_fill: ["Review the repaired scan patch on the working copy.", "Pregledajte popravljenu zonu snimka na radnoj kopiji."],
          orientation: ["Orient the working copy to the reference viewing plane.", "Orijentišite radnu kopiju prema referentnoj ravni prikaza."],
          base: ["Show the separate arch-support DESIGN base aligned beneath the prepared model.", "Prikažite zasebnu DIZAJN noseću bazu luka poravnatu ispod pripremljenog modela."],
          mesh_check: ["Inspect the final registered working-copy mesh and its components.", "Pregledajte završnu registrovanu mrežu radne kopije i njene komponente."],
          final: ["Preserve SOURCE, review the prepared working mesh, and show the separate support base.", "Sačuvajte IZVOR, pregledajte pripremljenu radnu mrežu i prikažite zasebnu noseću bazu."],
        };
        const [nextEn, nextSr] = guidance[config.check as keyof typeof checks] ?? [messageEn, messageSr];
        if (!passed) { messageEn = nextEn; messageSr = nextSr; }
        else { messageEn = "The package contains separate raw and editable working objects, staged scan preparation, and a distinct base for this exercise."; messageSr = "Paket sadrži zasebne sirove i radne objekte, faze pripreme snimka i odvojenu bazu za ovu vežbu."; }
      } else {
        const uppers = objects.filter((object) => object.articulatorArch === "upper" && object.caseRole === "SOURCE");
        const lowers = objects.filter((object) => object.articulatorArch === "lower" && object.caseRole === "SOURCE");
        const setup = useArticulatorStore.getState();
        const upper = uppers.find((object) => object.casePackageId === lowers[0]?.casePackageId);
        const lower = lowers.find((object) => object.casePackageId === upper?.casePackageId);
        const relation = !!upper && !!lower && !!geometryRegistry.get(upper.id) && !!geometryRegistry.get(lower.id);
        const dynamic = upper && lower ? useAnalysisStore.getState().getCurrent("dynamic_contact", [upper.id, lower.id]) : undefined;
        const checks = {
          relation,
          motion: relation && Number.isFinite(setup.t) && setup.t > 0 && setup.t <= 1 && (!config.motion || setup.motion === config.motion),
          dynamic_contacts: !!dynamic,
          reset: relation && setup.t === 0 && setup.motion === "open_close",
        };
        passed = checks[config.check as keyof typeof checks] ?? false;
        objectId = lower?.id;
        const guidance: Record<keyof typeof checks, [string, string]> = {
          relation: ["Use the shared upper and lower SOURCE arches from one package and inspect their synthetic reference relation.", "Koristite zajedničke gornji i donji IZVORNI luk iz jednog paketa i pregledajte njihov sintetički referentni odnos."],
          motion: ["Choose an educational motion and move the position control away from centric.", "Izaberite edukativni pokret i pomerite kontrolu položaja iz centričnog položaja."],
          dynamic_contacts: ["Run sampled contact analysis for the current upper/lower pair and motion.", "Pokrenite uzorkovanu analizu kontakta za aktuelni par gornje/donje vilice i pokret."],
          reset: ["Choose Reset reference to return the lower arch to the centric starting pose.", "Izaberite Reset reference da vratite donji luk u početni centrični položaj."],
        };
        const [nextEn, nextSr] = guidance[config.check as keyof typeof checks] ?? [messageEn, messageSr];
        if (!passed) { messageEn = nextEn; messageSr = nextSr; }
        else { messageEn = "The deterministic teaching motion and shared analysis state are available. This does not represent patient-specific jaw motion or facebow transfer accuracy."; messageSr = "Dostupni su deterministički edukativni pokret i zajedničko stanje analize. Ovo ne predstavlja pokret vilice pacijenta ni tačnost prenosa obraznim lukom."; }
      }
      const title = passed ? { en: "R6 educational check passed", sr: "R6 edukativna provera je uspešna" } : { en: "R6 workflow needs attention", sr: "R6 postupak zahteva proveru" };
      return { id: `${context.step.id}:r6_workflow:${config.workflow}:${config.check}`, validatorType: config.type, outcome: passed ? "pass" : "fail", title, message: { en: messageEn, sr: messageSr }, objectId };
    },
  },
};

export const REGISTERED_VALIDATOR_TYPES = Object.keys(registry) as ValidatorConfig["type"][];

function axisIndex(axis: "x" | "y" | "z") { return axis === "x" ? 0 : axis === "y" ? 1 : 2; }
export function registerValidator<C extends ValidatorConfig>(type: C["type"], validator: Validator<C>) {
  registry[type] = { type, parse: (config) => validatorConfigSchema.parse(config), run: (context, config) => validator.run(context, config as C) };
}
export function getValidator(type: string) { return registry[type]; }
export function runStepValidators(lesson: PracticeLesson, step: PracticeStep): ValidationResult[] {
  const context: PracticeValidationContext = { lesson, step, getObject: (id) => useWorkspaceStore.getState().objects.find((object) => object.id === cadObjectId(id)) };
  return step.validators.map((raw, index) => {
    const type = typeof raw === "object" && raw !== null && "type" in raw ? String(raw.type) : "unknown";
    const validator = registry[type];
    if (!validator) return { id: `${step.id}:unknown:${type}`, validatorType: type, outcome: "fail", title: { en: "Lesson check unavailable", sr: "Provera lekcije nije dostupna" }, message: { en: "This lesson check is not available in the current workspace. Contact support if the problem continues.", sr: "Ova provera lekcije nije dostupna u trenutnom radnom prostoru. Obratite se podršci ako se problem nastavi." } };
    const config = validatorConfigSchema.safeParse(raw);
    if (!config.success) return { id: `${step.id}:config:${index}`, validatorType: type, outcome: "fail", title: { en: "Lesson check unavailable", sr: "Provera lekcije nije dostupna" }, message: { en: "This lesson check could not be configured. Review the lesson content or contact support.", sr: "Ovu proveru lekcije nije bilo moguće podesiti. Proverite sadržaj lekcije ili se obratite podršci." } };
    try { return validator.run(context, config.data); }
    catch { return { id: `${step.id}:error:${index}`, validatorType: type, outcome: "fail", title: { en: "Lesson check could not be completed", sr: "Provera lekcije nije mogla da se završi" }, message: { en: "The workspace could not complete this check. Review the case and try again.", sr: "Radni prostor nije mogao da završi ovu proveru. Pregledajte slučaj i pokušajte ponovo." } }; }
  });
}
export function scoreResults(results: ValidationResult[]) { if (!results.length) return null; const points = results.reduce((sum, result) => sum + (result.outcome === "pass" ? 1 : result.outcome === "warning" ? 0.5 : 0), 0); return Math.round(100 * points / results.length); }
export function validationFingerprint(objects: ReturnType<typeof useWorkspaceStore.getState>["objects"], ids: string[]) {
  return JSON.stringify({ objects: ids.map((id) => { const object = objects.find((candidate) => candidate.id === cadObjectId(id)); const runtime = object && geometryRegistry.get(object.id); return object ? { id: object.id, transform: object.transform, geometry: runtime?.geometryRevision ?? object.geometryStats?.revision ?? 0 } : { id, missing: true }; }), curves: useCurveStore.getState().curves, analyses: useAnalysisStore.getState().results.map((result) => ({ kind: result.kind, targets: result.targets, min: "minMm" in result ? result.minMm : null, max: "maxMm" in result ? result.maxMm : null })) });
}
