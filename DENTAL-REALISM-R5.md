# Dental Realism R5 — Partial Denture Realism

**Status:** R5 local implementation complete; authenticated visual QA pending.

## 1. Scope delivered

R5 adds four separate, package-backed Kennedy workflows to the shared CAD workspace:

| Class | Arch and missing teeth | Retained support | Major connector |
| --- | --- | --- | --- |
| I | Mandible; 36, 37, 46, 47 | Bilateral distal extension; 35 and 45 | Lingual bar |
| II | Mandible; 46, 47 | Right distal extension; 35 and 45 | Lingual bar |
| III | Maxilla; 24 and 25 | Bounded space between 23 and 26 | Palatal strap |
| IV | Maxilla; 11, 12, 21, 22 | Anterior space crossing the midline; 13 and 23 | Horseshoe |

Each package has its own missing-tooth distribution, case order, abutment links, component geometry, validator bindings, and staged visibility checkpoints. Package IDs use the `r5-partial-denture-kennedy-<class>-v1` form.

## 2. Geometry and source assets

Remaining teeth use private Dundee-derived tooth training forms already registered in the local asset catalog. The surrounding maxillary and mandibular gingiva, palate, lingual support, and residual ridge reuse the swept synthetic tissue geometry from R4. RPD parts include swept connector and clasp paths, tooth-associated rests and guide planes, blockout guides, saddles, retention lattices, minor connectors, and finish-line guides.

Primary anatomy is made from the swept tissue surfaces and tooth meshes. It is not represented by primitive boxes or cylinders. The component meshes are editable teaching geometry and are not patient-specific or fabrication validated.

## 3. Workflow and checkpoints

Each package exposes 13 checkpoints: case inspection, survey, insertion path, contour review, directional undercut preview, blockout, rests, major connector, minor connectors, clasps, saddle and retention mesh, finish lines, and final review. Checkpoints set visible objects and workflow state so the learner can inspect one stage at a time.

The Partial Denture panel lets the learner choose an insertion direction, confirm the path, reveal survey lines, mark contour review, apply or hide blockout, and show design components. The undercut status reads the shared Analysis store. Changing the insertion direction clears dependent review flags and hides stale blockout state.

## 4. Practice and Free Lab

The local Practice catalog includes 52 bilingual English and Serbian lessons: 13 stages for each of the four Kennedy classes. Instructions identify what to inspect, why it matters for the exercise, the target object, tool, action, target, and Design Check. The prior database-backed synthetic RPD curriculum is filtered from the merged catalog; the existing legacy case initializer and validator path remain available to old direct lesson loads.

Random Case Free Lab includes four fictional package-backed briefs with class, target teeth, arch, records, requirements, and synthetic anatomy notes. Existing R4 scenarios remain present in the merged catalog.

## 5. Design Check and state links

Package validators cover survey, insertion path, contours, current undercut preview, blockout, rests, major and minor connectors, clasps, saddle and retention mesh, finish lines, framework relationships, and final completion. They check registered geometry, abutment assignments, component visibility, and stable parent links. Undercut checks use the shared directional preview and reject stale results.

The RPD setup state includes class, package, arch, missing teeth, abutment object IDs, component records, and stage flags. Recovery and cloud snapshot schemas accept the added saddle kind and optional R5 flags while preserving compatibility with older snapshots.

## 6. Persistence and migrations

No R5 database migration was needed or created. No remote database writes or migration applications were performed. The R5 cases, lessons, and briefs are local definitions merged into the existing catalog paths. Earlier Phase migrations already present in the workspace were left untouched.

## 7. Validation run

- `rtk npm run typecheck` — passed.
- `rtk npm run lint` — passed.
- Focused R5, legacy RPD, R3 fixed-prosthetics, R4 complete-denture, and package-loader tests — 44 passed.
- Full Vitest suite (`rtk vitest run`) — 207 passed.
- Production build (`rtk npm run build`) — passed.
- Playwright E2E (`rtk playwright test`) — 15 passed.
- The R5 package tests load all four packages, verify private GLB parsing and BVH preparation, exercise package replacement, stage visibility, catalog merging, class distributions, validator bindings, and current shared undercut results.

## 8. Review limits and handoff

The available computer-use inventory reported no browser or app surface, so authenticated visual review of the CAD workspace is pending. Playwright ran the existing E2E suite, which covers public landing and authentication boundaries; it does not provide authenticated R5 viewport sign-off.

Private tooth asset source orientation and source-image patient provenance remain unconfirmed in the existing asset metadata. R5 therefore presents fictional synthetic training anatomy, calls its contour and undercut visuals exercise previews, and makes no clinical accuracy or patient-specific claim. R6 was not started.
