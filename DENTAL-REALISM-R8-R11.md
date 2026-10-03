# Dental Realism R8–R11 Finalization

**Status:** R8–R11 implementation complete; authenticated visual QA pending.

This pass reconciles the existing R3–R7 Practice and Free Lab workflows. It does not add a new workflow or begin R12.

## 1. Practice checkpoint audit

Practice lessons backed by a case package now resolve to a registered package and checkpoint. Runtime object mappings, step targets, references, validator object IDs, and validator types are checked against those package definitions. The audit covers the 17 R3 fixed-prosthetics database lessons plus the supported R4–R7 package lessons. CAD Foundations drills remain synthetic.

The lesson guide retains its structured WHAT / WHY / OBJECT / TOOL / ACTION / TARGET / CHECK format in English and Serbian. Steps open at their declared checkpoint so later lessons retain the geometry and work from earlier stages.

## 2. Checkpoint fixes

- R3 database mappings are checked for all 17 lessons. Each package and checkpoint must exist, and each semantic role and editability value must agree with the mapped package object. Ordinary lessons cannot reopen `case_start`.
- R4 final-occlusion checks no longer target the hidden occlusal-plane guide. Full denture review focuses on editable DESIGN objects.
- R5 lessons start at the stage they teach, from inspection/survey/insertion through undercuts, rests, connectors, clasps, saddle, finish lines, and final review. The blockout lesson starts before blockout is applied.
- R6 Practice object mappings now use the package object's actual semantic role and editability instead of treating every object as editable.
- R7 abutment review includes the crown it references; final review includes the scan body required by the lesson.
- Numeric exercise targets use “Target for this exercise” / “Cilj za ovu vežbu”.

## 3. Free Lab catalog

The library merges 20 local package-backed R3–R7 cases and places them before remote rows. Coverage is 6 R3 fixed-prosthetics cases, 3 R4 complete dentures, 4 R5 partial dentures, 2 R6 bite splints, 3 R6 digital models, and 2 R7 implant cases. Existing metadata supplies case title, workflow, training case ID, tooth/region when relevant, challenge, difficulty, supplied records, and requested output. Local cases use fictional education IDs and synthetic-case notes; they do not supply patient ages.

The Virtual Articulator remains an existing guided workflow and does not add a separate Free Lab category or oversized case library.

The merge replaces duplicate package IDs with the local package version. In workflows covered by the local catalog, unresolvable remote rows are omitted from the current catalog so legacy placeholders do not lead the learner into fallback geometry. Remote data is unchanged.

## 4. Random Case audit

Random Case only selects published, eligible scenarios whose package validates and whose starting checkpoint exists. Its default Crown + Intermediate filters have a package-backed match. It passes the resolved package ID, manifest, and checkpoint into Free Lab initialization. The workspace loads the case at that checkpoint, frames the loaded objects, and selects a visible editable DESIGN object. Broken packages, missing checkpoints, draft entries, and unpackage-backed legacy rows are excluded.

## 5. Import My Case and Blank Workspace

Both entry cards remain in the Free Lab start panel. Import retains the existing file-import route and blank workspace starts with an empty Free Lab workspace; neither is routed through a synthetic dental case. No import formats were added.

## 6. Workflow presentation fixes

Package defaults preserve visible SOURCE anatomy and the intended editable DESIGN object at each starting checkpoint. REFERENCE objects default hidden, GUIDE visibility follows the checkpoint, and the presentation tests require at least one visible editable DESIGN object for each package-backed Free Lab start. Package labels are human-readable while internal IDs remain stable.

## 7. Camera and default visibility

Static inspection found one shared CAD camera default: position `[38, -50, 36]`, Z-up, 40° field of view, near clip 0.1, and far clip 5000. Free Lab package loads and saved cloud-case loads invoke Frame All; the navigation shelf also offers Reset, Frame All, and Frame Selected. Package manifests do not define per-workflow camera overrides. No camera redesign was introduced.

Automated checks cover checkpoint visibility and default DESIGN availability. Authenticated visual framing and clipping checks remain pending (see section 15).

## 8. Scene labels and roles

Package objects retain the SOURCE, DESIGN, GUIDE, and REFERENCE role model. DESIGN objects are editable; REFERENCE objects start hidden. The audit rejects internal-looking R3–R7 mesh names and debug/placeholder labels in user-facing package names, while preserving stable object IDs.

## 9. Design Check mappings

Practice validator IDs must resolve to mapped package objects, package validation-binding IDs must resolve to package objects, and inline validator types must be registered. R3–R7 workflow validators remain educational structural or exercise checks for the actual current objects and state. The existing pass / warning / fail semantics are retained; no patient suitability, clinical approval, or manufacturing-readiness result was added.

Numeric analysis results identify limits as exercise targets in both languages. Design Check outcome copy was audited for prohibited clinical/production claims; no such claim remains in validator messages.

## 10. Legacy and fallback behavior

Legacy factories and compatibility paths remain in the codebase for old saves, tests, and unsupported workflows. The current catalog prefers local package-backed cases and filters unresolvable rows only in categories covered by those packages. No global fallback factory was removed.

## 11. Tests

- Focused R8–R11 and R3–R7 workflow batch: **9 files, 76 tests passed**.
- Full Vitest suite: **30 files, 232 tests passed**.
- Focused checks cover Practice package/checkpoint/object mappings, bilingual guide structure, all 20 Free Lab package resolutions, Random Case eligibility/opening, Import and Blank reachability, package roles/labels/default visibility, and Design Check IDs and target language.

## 12. Typecheck and lint

- `npm run typecheck`: passed.
- `npm run lint`: passed with no warnings.

## 13. Production build

`npm run build` completed successfully on Next.js 16.3.6. The production build compiled, typechecked, generated all 23 static pages, and finalized route optimization.

## 14. Supabase and remote changes

No remote writes or migrations were applied. A read-only catalog query inspected scenario slug, workflow, publication/random flags, and package ID. It returned 21 published rows: 6 R3 package-backed rows and 15 older `synthetic_*` rows without package IDs. The local merge now puts the package-backed library first and suppresses unresolvable rows in covered workflows. Remote state remains unchanged.

## 15. Playwright and remaining visual QA

`npm run test:e2e` passed **15/15 tests**. These tests cover public rendering, authentication guards, Free Lab route protection, and private R3 assets; they do not sign in to inspect protected scenes.

The available computer/browser session reported no apps or browser tabs. Static package, checkpoint, visibility, role, camera-code, and test audits were completed. Authenticated visual inspection of protected R3–R7 Practice lessons and Free Lab scenes remains pending for the final integration pass. No protected scene is claimed as visually inspected.

**R8–R11 — IMPLEMENTATION COMPLETE, AUTHENTICATED VISUAL QA PENDING**
