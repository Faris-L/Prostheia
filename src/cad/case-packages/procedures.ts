import * as THREE from "three";
import { z } from "zod";

import { createSyntheticCrownObject } from "@/cad/crown/geometry";
import { createSyntheticTooth } from "@/cad/scene/synthetic-dental-geometry";
import { createR4DentureBase, createR4DentureGuide, createR4EdentulousArch, type CompleteDentureArch, type CompleteDentureMorphology } from "@/cad/denture/r4-geometry";
import { PARTIAL_COMPONENT_KINDS, type PartialComponentKind } from "@/cad/partial-denture/types";
import { createR5InsertionGuide, createR5PartialComponent, createR5ResidualArch, createR5SurveyGuide, rpdComponentPath, RPD_CASE_PLANS, type RpdArch, type RpdConnectorForm, type RpdRestSurface } from "@/cad/partial-denture/r5-geometry";
import { createR6BiteArch, createR6Splint, createSplintBoundaryGuide, createSplintContactGuide, createSplintRelationReference, createSplintThicknessGuide, r6SplintBoundary, type SplintTrainingCase } from "@/cad/splint/r6-geometry";
import { createDigitalModelTrimGuide, createR6DigitalModelBase, createR6DigitalScan, digitalModelTrimBoundary, type DigitalScanChallenge, type DigitalScanStage } from "@/cad/digital-model/r6-geometry";
import { createR7Abutment, createR7AntagonistTooth, createR7ContactGuide, createR7CrownTarget, createR7EmergenceProfile, createR7Gingiva, createR7ImplantAxisGuide, createR7ImplantFixture, createR7InterfaceGuide, createR7NeighborTooth, createR7ScanBody, createR7ScrewAccessGuide, createR7SupportRidge } from "@/cad/implant/r7-geometry";
import type { CaseObjectDescriptor } from "./contract";

type Factory = { parameters: z.ZodType; create: (parameters: Record<string, unknown>) => THREE.Object3D };
const vector3 = z.tuple([z.number().finite(), z.number().finite(), z.number().finite()]);

function makeTrainingGingiva(width: number, thickness: number) {
  const columns = 40; const rows = 18; const positions: number[] = []; const indices: number[] = [];
  for (let i = 0; i <= columns; i += 1) {
    const u = i / columns * 2 - 1;
    const x = u * width;
    const archY = 0.007 * x * x;
    for (let j = 0; j <= rows; j += 1) {
      const v = j / rows * 2 - 1;
      positions.push(x, archY + v * 4.2, -1.1 - 2.7 * v * v + 0.18 * Math.cos(u * Math.PI * 2));
      if (i < columns && j < rows) {
        const a = i * (rows + 1) + j; const b = a + rows + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  const topCount = positions.length / 3;
  for (let i = 0; i <= columns; i += 1) for (let j = 0; j <= rows; j += 1) {
    const offset = (i * (rows + 1) + j) * 3;
    positions.push(positions[offset], positions[offset + 1], positions[offset + 2] - thickness);
  }
  const surfaceIndices = [...indices];
  for (let i = 0; i < surfaceIndices.length; i += 3) indices.push(surfaceIndices[i] + topCount, surfaceIndices[i + 2] + topCount, surfaceIndices[i + 1] + topCount);
  for (let i = 0; i < columns; i += 1) for (const j of [0, rows]) {
    const a = i * (rows + 1) + j; const b = (i + 1) * (rows + 1) + j;
    indices.push(a, b, b + topCount, a, b + topCount, a + topCount);
  }
  for (let j = 0; j < rows; j += 1) for (const i of [0, columns]) {
    const a = i * (rows + 1) + j; const b = a + 1;
    indices.push(a, b, b + topCount, a, b + topCount, a + topCount);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingBox(); geometry.computeBoundingSphere();
  const root = new THREE.Group(); root.name = "Synthetic local gingiva and support surface";
  const material = new THREE.MeshStandardMaterial({ color: "#b97879", roughness: 0.88, metalness: 0 });
  const mesh = new THREE.Mesh(geometry, material); mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh);
  return root;
}

function makeMarginGuide(radiusX: number, radiusY: number, color: string) {
  const points = Array.from({ length: 48 }, (_, i) => {
    const angle = Math.PI * 2 * i / 48;
    return new THREE.Vector3(radiusX * Math.cos(angle), radiusY * Math.sin(angle), 0.08);
  });
  const curve = new THREE.CatmullRomCurve3(points, true, "centripetal");
  const geometry = new THREE.TubeGeometry(curve, 96, 0.055, 6, true);
  const root = new THREE.Group(); root.name = "Margin location guide · exercise only";
  root.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.08 })));
  return root;
}

export const CASE_OBJECT_PROCEDURES: Record<string, Factory> = {
  "synthetic.tooth": {
    parameters: z.object({ kind: z.enum(["preparation", "restoration"]), geometryScale: vector3.optional() }),
    create: (parameters) => {
      const parsed = CASE_OBJECT_PROCEDURES["synthetic.tooth"].parameters.parse(parameters) as { kind: "preparation" | "restoration"; geometryScale?: [number, number, number] };
      const object = createSyntheticTooth(parsed.kind);
      if (parsed.geometryScale) object.scale.set(...parsed.geometryScale);
      return object;
    },
  },
  "synthetic.crown": {
    parameters: z.object({ kind: z.enum(["restoration", "reference"]) }),
    create: (parameters) => {
      const parsed = CASE_OBJECT_PROCEDURES["synthetic.crown"].parameters.parse(parameters) as { kind: "restoration" | "reference" };
      return createSyntheticCrownObject(parsed.kind);
    },
  },
  "guide.axis": {
    parameters: z.object({ length: z.number().positive().max(100), radius: z.number().positive().max(2), color: z.string().regex(/^#[0-9a-fA-F]{6}$/) }),
    create: (parameters) => {
      const parsed = CASE_OBJECT_PROCEDURES["guide.axis"].parameters.parse(parameters) as { length: number; radius: number; color: string };
      const root = new THREE.Group();
      root.name = "Procedural axis guide";
      const material = new THREE.MeshStandardMaterial({ color: parsed.color, roughness: 0.5, metalness: 0 });
      const shaftLength = parsed.length * 0.78;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(parsed.radius, parsed.radius, shaftLength, 12), material);
      shaft.position.z = shaftLength / 2;
      shaft.rotation.x = Math.PI / 2;
      const head = new THREE.Mesh(new THREE.ConeGeometry(parsed.radius * 3, parsed.length - shaftLength, 16), material);
      head.position.z = parsed.length - (parsed.length - shaftLength) / 2;
      head.rotation.x = Math.PI / 2;
      root.add(shaft, head);
      return root;
    },
  },
  "guide.margin-loop": {
    parameters: z.object({ radiusX: z.number().positive().max(10), radiusY: z.number().positive().max(10), color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#58b9b1") }),
    create: (parameters) => {
      const parsed = CASE_OBJECT_PROCEDURES["guide.margin-loop"].parameters.parse(parameters) as { radiusX: number; radiusY: number; color: string };
      return makeMarginGuide(parsed.radiusX, parsed.radiusY, parsed.color);
    },
  },
  "training.gingiva": {
    parameters: z.object({ width: z.number().positive().max(40), thickness: z.number().positive().max(10) }),
    create: (parameters) => {
      const parsed = CASE_OBJECT_PROCEDURES["training.gingiva"].parameters.parse(parameters) as { width: number; thickness: number };
      return makeTrainingGingiva(parsed.width, parsed.thickness);
    },
  },
  "complete-denture.r4-edentulous-arch": {
    parameters: z.object({ arch: z.enum(["upper", "lower"]), morphology: z.enum(["balanced", "resorbed"]) }),
    create: (parameters) => {
      const parsed = CASE_OBJECT_PROCEDURES["complete-denture.r4-edentulous-arch"].parameters.parse(parameters) as { arch: CompleteDentureArch; morphology: CompleteDentureMorphology };
      return createR4EdentulousArch(parsed.arch, parsed.morphology);
    },
  },
  "complete-denture.r4-base": {
    parameters: z.object({ arch: z.enum(["upper", "lower"]), morphology: z.enum(["balanced", "resorbed"]) }),
    create: (parameters) => {
      const parsed = CASE_OBJECT_PROCEDURES["complete-denture.r4-base"].parameters.parse(parameters) as { arch: CompleteDentureArch; morphology: CompleteDentureMorphology };
      return createR4DentureBase(parsed.arch, parsed.morphology);
    },
  },
  "complete-denture.r4-guide": {
    parameters: z.object({ kind: z.enum(["occlusal-plane", "midline-upper", "midline-lower", "border-upper", "border-lower"]) }),
    create: (parameters) => {
      const parsed = CASE_OBJECT_PROCEDURES["complete-denture.r4-guide"].parameters.parse(parameters) as { kind: "occlusal-plane" | "midline-upper" | "midline-lower" | "border-upper" | "border-lower" };
      return createR4DentureGuide(parsed.kind);
    },
  },
  "partial-denture.r5-arch": {
    parameters: z.object({ arch: z.enum(["upper", "lower"]) }),
    create: (parameters) => {
      const parsed = CASE_OBJECT_PROCEDURES["partial-denture.r5-arch"].parameters.parse(parameters) as { arch: RpdArch };
      return createR5ResidualArch(parsed.arch);
    },
  },
  "partial-denture.r5-survey-guide": {
    parameters: z.object({ arch: z.enum(["upper", "lower"]), toothNumber: z.number().int().positive() }),
    create: (parameters) => {
      const parsed = CASE_OBJECT_PROCEDURES["partial-denture.r5-survey-guide"].parameters.parse(parameters) as { arch: RpdArch; toothNumber: number };
      return createR5SurveyGuide(parsed.arch, parsed.toothNumber);
    },
  },
  "partial-denture.r5-insertion-guide": {
    parameters: z.object({}),
    create: () => createR5InsertionGuide(),
  },
  "partial-denture.r5-component": {
    parameters: z.object({
      kind: z.enum(PARTIAL_COMPONENT_KINDS),
      arch: z.enum(["upper", "lower"]),
      connectorForm: z.enum(["lingual_bar", "palatal_strap", "horseshoe"]).optional(),
      restSurface: z.enum(["occlusal", "cingulum"]).optional(),
      toothNumber: z.number().int().positive().optional(),
      regionTeeth: z.array(z.number().int().positive()).default([]),
      points: z.array(vector3).min(1),
    }),
    create: (parameters) => {
      const parsed = CASE_OBJECT_PROCEDURES["partial-denture.r5-component"].parameters.parse(parameters) as {
        kind: PartialComponentKind; arch: RpdArch; connectorForm?: RpdConnectorForm; restSurface?: RpdRestSurface; toothNumber?: number; regionTeeth: number[]; points: [number, number, number][];
      };
      const plan = Object.values(RPD_CASE_PLANS).find((candidate) => candidate.arch === parsed.arch && candidate.connectorForm === parsed.connectorForm)
        ?? RPD_CASE_PLANS[parsed.arch === "upper" ? "III" : "I"];
      const points = parsed.points.length ? parsed.points : rpdComponentPath({ kind: parsed.kind, arch: parsed.arch, classPlan: plan, toothNumber: parsed.toothNumber, restSurface: parsed.restSurface, regionTeeth: parsed.regionTeeth });
      return createR5PartialComponent({ kind: parsed.kind, arch: parsed.arch, points, connectorForm: parsed.connectorForm, restSurface: parsed.restSurface, toothNumber: parsed.toothNumber });
    },
  },
  "bite-splint.r6-arch": {
    parameters: z.object({ arch: z.enum(["upper", "lower"]), challenge: z.enum(["stabilization", "contact_challenge"]) }),
    create: (parameters) => {
      const parsed = CASE_OBJECT_PROCEDURES["bite-splint.r6-arch"].parameters.parse(parameters) as { arch: "upper" | "lower"; challenge: SplintTrainingCase };
      return createR6BiteArch(parsed.arch, parsed.challenge);
    },
  },
  "bite-splint.r6-shell": {
    parameters: z.object({ challenge: z.enum(["stabilization", "contact_challenge"]), thicknessMm: z.number().positive().max(8) }),
    create: (parameters) => {
      const parsed = CASE_OBJECT_PROCEDURES["bite-splint.r6-shell"].parameters.parse(parameters) as { challenge: SplintTrainingCase; thicknessMm: number };
      return createR6Splint(r6SplintBoundary(parsed.challenge), parsed.thicknessMm);
    },
  },
  "bite-splint.r6-boundary-guide": {
    parameters: z.object({ challenge: z.enum(["stabilization", "contact_challenge"]) }),
    create: (parameters) => {
      const parsed = CASE_OBJECT_PROCEDURES["bite-splint.r6-boundary-guide"].parameters.parse(parameters) as { challenge: SplintTrainingCase };
      return createSplintBoundaryGuide(r6SplintBoundary(parsed.challenge));
    },
  },
  "bite-splint.r6-thickness-guide": {
    parameters: z.object({ thicknessMm: z.number().positive().max(8) }),
    create: (parameters) => {
      const parsed = CASE_OBJECT_PROCEDURES["bite-splint.r6-thickness-guide"].parameters.parse(parameters) as { thicknessMm: number };
      return createSplintThicknessGuide(parsed.thicknessMm);
    },
  },
  "bite-splint.r6-contact-guide": {
    parameters: z.object({ challenge: z.enum(["stabilization", "contact_challenge"]) }),
    create: (parameters) => {
      const parsed = CASE_OBJECT_PROCEDURES["bite-splint.r6-contact-guide"].parameters.parse(parameters) as { challenge: SplintTrainingCase };
      return createSplintContactGuide(parsed.challenge);
    },
  },
  "bite-splint.r6-relation-reference": {
    parameters: z.object({}),
    create: () => createSplintRelationReference(),
  },
  "digital-model.r6-scan": {
    parameters: z.object({ arch: z.enum(["upper", "lower"]), stage: z.enum(["raw", "trimmed", "cleaned", "filled"]), challenge: z.enum(["routine", "noisy_partial"]), tilted: z.boolean().default(false) }),
    create: (parameters) => {
      const parsed = CASE_OBJECT_PROCEDURES["digital-model.r6-scan"].parameters.parse(parameters) as { arch: "upper" | "lower"; stage: DigitalScanStage; challenge: DigitalScanChallenge; tilted: boolean };
      return createR6DigitalScan(parsed.arch, parsed.stage, parsed.challenge, parsed.tilted);
    },
  },
  "digital-model.r6-base": {
    parameters: z.object({ arch: z.enum(["upper", "lower"]), heightMm: z.number().min(2).max(25).default(8) }),
    create: (parameters) => {
      const parsed = CASE_OBJECT_PROCEDURES["digital-model.r6-base"].parameters.parse(parameters) as { arch: "upper" | "lower"; heightMm: number };
      return createR6DigitalModelBase(parsed.arch, parsed.heightMm);
    },
  },
  "digital-model.r6-trim-guide": {
    parameters: z.object({ arch: z.enum(["upper", "lower"]) }),
    create: (parameters) => {
      const parsed = CASE_OBJECT_PROCEDURES["digital-model.r6-trim-guide"].parameters.parse(parameters) as { arch: "upper" | "lower" };
      return createDigitalModelTrimGuide(digitalModelTrimBoundary(parsed.arch));
    },
  },
  "implant.r7-support-ridge": {
    parameters: z.object({ challenge: z.enum(["centered", "offset"]) }),
    create: (parameters) => {
      const parsed = CASE_OBJECT_PROCEDURES["implant.r7-support-ridge"].parameters.parse(parameters) as { challenge: "centered" | "offset" };
      return createR7SupportRidge(parsed.challenge);
    },
  },
  "implant.r7-gingiva": {
    parameters: z.object({ challenge: z.enum(["centered", "offset"]) }),
    create: (parameters) => {
      const parsed = CASE_OBJECT_PROCEDURES["implant.r7-gingiva"].parameters.parse(parameters) as { challenge: "centered" | "offset" };
      return createR7Gingiva(parsed.challenge);
    },
  },
  "implant.r7-neighbor": {
    parameters: z.object({ arch: z.enum(["upper", "lower"]), fdi: z.number().int().min(11).max(48), position: z.enum(["mesial", "distal"]), challenge: z.enum(["centered", "offset"]) }),
    create: (parameters) => {
      const parsed = CASE_OBJECT_PROCEDURES["implant.r7-neighbor"].parameters.parse(parameters) as { arch: "upper" | "lower"; fdi: number; position: "mesial" | "distal"; challenge: "centered" | "offset" };
      return createR7NeighborTooth(parsed.arch, parsed.fdi, parsed.position, parsed.challenge);
    },
  },
  "implant.r7-antagonist": {
    parameters: z.object({ arch: z.enum(["upper", "lower"]), fdi: z.number().int().min(11).max(48), challenge: z.enum(["centered", "offset"]) }),
    create: (parameters) => {
      const parsed = CASE_OBJECT_PROCEDURES["implant.r7-antagonist"].parameters.parse(parameters) as { arch: "upper" | "lower"; fdi: number; challenge: "centered" | "offset" };
      return createR7AntagonistTooth(parsed.arch, parsed.fdi, parsed.challenge);
    },
  },
  "implant.r7-fixture": {
    parameters: z.object({ diameterMm: z.number().positive().max(8), lengthMm: z.number().positive().max(20) }),
    create: (parameters) => {
      const parsed = CASE_OBJECT_PROCEDURES["implant.r7-fixture"].parameters.parse(parameters) as { diameterMm: number; lengthMm: number };
      return createR7ImplantFixture(parsed.diameterMm, parsed.lengthMm);
    },
  },
  "implant.r7-scan-body": {
    parameters: z.object({ orientation: z.enum(["flat-a", "flat-b"]) }),
    create: (parameters) => {
      const parsed = CASE_OBJECT_PROCEDURES["implant.r7-scan-body"].parameters.parse(parameters) as { orientation: "flat-a" | "flat-b" };
      return createR7ScanBody(parsed.orientation);
    },
  },
  "implant.r7-abutment": {
    parameters: z.object({ diameterMm: z.number().positive().max(8), heightMm: z.number().positive().max(12) }),
    create: (parameters) => {
      const parsed = CASE_OBJECT_PROCEDURES["implant.r7-abutment"].parameters.parse(parameters) as { diameterMm: number; heightMm: number };
      return createR7Abutment(parsed.diameterMm, parsed.heightMm);
    },
  },
  "implant.r7-emergence": {
    parameters: z.object({ baseRadiusMm: z.number().positive().max(8), crownRadiusMm: z.number().positive().max(10), heightMm: z.number().positive().max(12) }),
    create: (parameters) => {
      const parsed = CASE_OBJECT_PROCEDURES["implant.r7-emergence"].parameters.parse(parameters) as { baseRadiusMm: number; crownRadiusMm: number; heightMm: number };
      return createR7EmergenceProfile(parsed.baseRadiusMm, parsed.crownRadiusMm, parsed.heightMm);
    },
  },
  "implant.r7-axis-guide": {
    parameters: z.object({ lengthMm: z.number().positive().max(40), color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default("#ef7d53") }),
    create: (parameters) => {
      const parsed = CASE_OBJECT_PROCEDURES["implant.r7-axis-guide"].parameters.parse(parameters) as { lengthMm: number; color: string };
      return createR7ImplantAxisGuide(parsed.lengthMm, parsed.color);
    },
  },
  "implant.r7-screw-access-guide": {
    parameters: z.object({ lengthMm: z.number().positive().max(40), radiusMm: z.number().positive().max(2) }),
    create: (parameters) => {
      const parsed = CASE_OBJECT_PROCEDURES["implant.r7-screw-access-guide"].parameters.parse(parameters) as { lengthMm: number; radiusMm: number };
      return createR7ScrewAccessGuide(parsed.lengthMm, parsed.radiusMm);
    },
  },
  "implant.r7-interface-guide": {
    parameters: z.object({ diameterMm: z.number().positive().max(10) }),
    create: (parameters) => {
      const parsed = CASE_OBJECT_PROCEDURES["implant.r7-interface-guide"].parameters.parse(parameters) as { diameterMm: number };
      return createR7InterfaceGuide(parsed.diameterMm);
    },
  },
  "implant.r7-contact-guide": {
    parameters: z.object({ kind: z.enum(["proximal", "occlusal"]) }),
    create: (parameters) => {
      const parsed = CASE_OBJECT_PROCEDURES["implant.r7-contact-guide"].parameters.parse(parameters) as { kind: "proximal" | "occlusal" };
      return createR7ContactGuide(parsed.kind);
    },
  },
  "implant.r7-crown-target": {
    parameters: z.object({}),
    create: () => createR7CrownTarget(),
  },
};

export function createProceduralCaseObject(descriptor: Extract<CaseObjectDescriptor["source"], { kind: "procedural" }>) {
  const factory = CASE_OBJECT_PROCEDURES[descriptor.factoryId];
  if (!factory) throw new Error(`Invalid procedural object descriptor: unknown factory "${descriptor.factoryId}".`);
  const parsed = factory.parameters.safeParse(descriptor.parameters);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((issue) => `${issue.path.join(".") || "parameters"}: ${issue.message}`).join("; ");
    throw new Error(`Invalid procedural object descriptor for "${descriptor.factoryId}": ${detail}`);
  }
  return factory.create(parsed.data as Record<string, unknown>);
}
