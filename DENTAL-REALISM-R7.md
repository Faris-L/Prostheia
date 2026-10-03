# Dental Realism R7 — Implant Restorative CAD

## 1. Scope

R7 adds a synthetic, educational restorative implant CAD workflow. Learners work from a supplied scan body and pre-defined implant reference to an emergence design, separate abutment concept, editable anatomical crown, analysis, and final design check.

The cases do not support implant surgery, CBCT planning, nerve mapping, surgical guides, fixture-position recommendations, or patient-specific treatment planning.

## 2. Synthetic implant system

The package uses **Synthetic Training Implant System**, system ID `prostheia-synthetic-training-implant-v1`. Its platform, indexed interface, restorative connection, fixture geometry, and scan-body IDs are fictional educational metadata. They make no dimensional compatibility claim about commercial systems.

The fixture reference and its axis are fixed by each case. It is a locked SOURCE object; learners cannot place or angle it.

## 3. Case anatomy

Both cases are package-backed and contain a local arch segment, neighboring teeth, synthetic gingiva and ridge support, an opposing tooth, a pre-defined fixture reference, scan body, and separate restorative designs. Geometry is generated locally except for the anatomical crown proposal.

- Case A is a lower left first molar, FDI 36, with a centered axis and a 35–37 segment.
- Case B is an upper left first molar, FDI 26, with a fixed 14-degree exercise axis, a rotated scan-body index, shifted ridge contour, and a tighter distal contact challenge.

All case identifiers and notes are fictional and contain no patient-identifiable data.

## 4. Scan body

The SOURCE scan body has stable package ID `source-scan-body` and workflow role `scan_body`. It has a seat collar, tapered neck, indexed head, visible flat orientation marker, and top marker; it is not a decorative cylinder. The case metadata records the scan-body ID, orientation, synthetic system, and the fixture object it resolves to.

The scan-body geometry is created by the shared procedural case-object registry and stored in Geometry Registry through the shared Case Package loader.

## 5. Implant reference and axis

The fixture is SOURCE object `source-implant-reference`; GUIDE object `guide-implant-axis` shows its fixed restorative axis. The scan body, fixture, abutment, crown, interface reference, and screw-access guide share the case axis. Case B’s tilt is supplied as part of the educational reference.

The UI calls out that the axis is pre-defined and provides no surgical placement controls.

## 6. Emergence profile

DESIGN object `design-emergence-profile` is an editable multi-level contour between the synthetic interface, gingival region, and crown. It can be selected and refined with the shared CAD transform tools. A soft-tissue intersection can be inspected as gross geometry only.

The 4.5 mm and 5.1 mm display radii are targets for this exercise. They are not biological recommendations or validated tissue contours.

## 7. Abutment

DESIGN object `design-abutment` is separate from the crown and fixture. Its training geometry shows the platform, tapered neck, crown seat, and support face. Workflow metadata links it to the fixture and crown. Learners can inspect and refine its form with shared transforms.

This simplified geometry is not a manufacturing-ready abutment. The 4.1 mm displayed form height is a target for this exercise.

## 8. Crown proposal

DESIGN object `design-implant-crown` loads the private Dundee anatomical crown proposal for FDI 36 or 26 from the existing private training asset catalog. The package keeps the library asset separate from abutment and source anatomy. The crown remains editable and uses the existing CAD sculpting, Proximity, Intersection, Thickness, and Section tools.

The asset catalog records the source and CC BY 4.0 attribution. Its display coordinates and scale are training content; the source units and patient provenance are not asserted as measured clinical dimensions.

## 9. Screw access

GUIDE object `guide-screw-access` shows a translucent screw-access path and centerline from the synthetic restorative interface through the crown. R7 checks its gross alignment to the supplied axis within the case’s exercise orientation limit. This is not prosthetic or clinical approval.

## 10. Workflow

The Practice lessons use the requested sequence:

1. Inspect the case.
2. Identify the scan body.
3. Resolve the fixed restorative axis.
4. Refine emergence.
5. Inspect and adjust the abutment concept.
6. Load the anatomical crown proposal.
7. Position and sculpt the crown.
8. Review proximal contacts.
9. Review the antagonist and static occlusion.
10. Inspect screw access.
11. Run final Design Check.

Each instruction gives WHAT, WHY, OBJECT, TOOL, ACTION, TARGET, and CHECK in English and Serbian.

## 11. Checkpoints

Each package defines the staged checkpoints `inspect`, `scan_body`, `implant_axis`, `emergence`, `abutment`, `crown_proposal`, `crown_position`, `contacts`, `occlusion`, `screw_access`, and `final`. Checkpoints update object visibility in the same package. They do not open a separate implant scene or recreate a raw case for each lesson.

## 12. Practice

The local Implant Practice curriculum contains eleven R7 lessons. Each lesson points to the same posterior implant package and starts at its corresponding checkpoint. The local catalog replaces the former fixture-placement lessons, while unrelated R1–R6 lessons remain registered. Content stays EN/SR bilingual.

## 13. Free Lab

Two published, random-eligible cases are registered:

| Case | Tooth | Restorative challenge |
| --- | --- | --- |
| `r7-implant-posterior-v1` | FDI 36 | Posterior single implant restoration with centered axis and neighboring anatomy |
| `r7-implant-axis-contact-v1` | FDI 26 | Different arch, angled fixed axis, rotated scan-body orientation, asymmetric emergence, tighter distal relationship |

Each brief names its synthetic scan body, system reference, neighboring anatomy, antagonist, requested crown, training requirements, and limits.

## 14. Design Check

The shared Practice validator `r7_workflow` checks scan-body identity and axis resolution, presence and separation of emergence/abutment/crown DESIGN objects, crown provenance and alignment, screw-access relationship, and current geometry-analysis state. Contact checks use the shared Proximity analysis. The final check also requires current Crown-to-antagonist Proximity and Intersection results and a current crown Thickness result.

These checks confirm package identity, object relationships, and current synthetic geometry analysis only. They do not claim clinical correctness, biological validation, patient fit, functional occlusion, or manufacturing approval.

## 15. Performance

Case loading uses the R1 Case Package loader and Geometry Registry. Geometry stays outside Zustand and React state. Case replacement is atomic; the registry prepares geometry acceleration structures and disposes the previous case after the replacement commits.

The local ridge and gingiva are generated from a 49-by-29 surface grid per layer; neighboring and antagonist teeth use small authored meshes. Dundee crown proposals contain 12,658 and 13,811 source vertices in the existing asset manifest. R7 tests cover BVH preparation, repeated case switching, registry cleanup, and analysis reset. No remote assets or R7-specific scene loader were added.

## 16. Tests

Focused R7 tests cover package semantics and registration, scan-body geometry/metadata, fixed axis metadata, editable emergence and abutment, Dundee crown binding, screw-access guide, bilingual checkpoints and lessons, both Free Lab scenarios, Design Check bindings, current analysis requirements, repeated case switching, BVH preparation, and disposal. Existing R1–R6 package IDs are checked for regression.

Verification completed on 2026-10-02:

- Typecheck passed.
- ESLint passed with no warnings.
- Focused R7 suite passed: 7 tests.
- Full Vitest suite passed: 223 tests.
- Production build passed on Next.js 16.3.6.
- Playwright suite passed: 15 tests. These covered the current unauthenticated routes and private-asset guard; they did not provide authenticated visual review of the R7 workspace.

## 17. Remote changes

No Supabase write or migration was made. Local practice and Free Lab catalog merging is sufficient for this R7 content; no remote schema change is needed.

## 18. Visual QA status

**Authenticated visual QA pending.** Implementation and local automated verification do not depend on an authenticated browser session. No visual inspection is claimed here.

## 19. Remaining limitations

The arch, gingiva, ridge, neighboring teeth, antagonist, implant fixture, interface, emergence profile, and abutment are synthetic training geometry. The Dundee crown proposal has the source-unit and review limits recorded by its existing private asset manifest. Analysis is a static educational geometry preview. Nothing in R7 is a clinical plan, placement recommendation, biological test, real manufacturer compatibility statement, or production-ready design.
