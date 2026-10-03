# Dental Realism R12–R14 Final Audit

Date: 2026-10-02  
Scope: content and integration review of R3–R11. No new workflow or database changes were introduced.

## 1. Content audit

Reviewed the Practice lesson copy, Free Lab briefs, workflow stage labels, package object names, numeric exercise targets, warnings, disclaimers, and English/Serbian terminology across Crown, Bridge, Inlay, Onlay, Veneer, Complete Denture, Partial Denture, Bite Splint, Digital Model, Virtual Articulator, and Implant.

## 2. Terminology changes

- Local R3 package object names now have Serbian role labels and dental descriptions while keeping object IDs and FDI numbers unchanged.
- R3 local copy normalization translates Inlay, Onlay, and Margin Line wording in Serbian Practice copy and Free Lab briefs.
- The R3 `bridge_full_case` title is corrected locally to teeth 24–26, matching its package. The remote record was not changed.
- R7 Serbian copy now uses *skenirajuće telo (scan body)*, *suprastruktura (abutment)*, and *profil izranjanja* consistently.
- The repeated wording in the R6 Bite Splint title is corrected to “Udlaga · ljuska i debljina.”

## 3. Clinical-claim cleanup

Numeric values remain labeled “Target for this exercise” / “Cilj za ovu vežbu.” The existing educational disclaimers remain in place. Dundee attribution and private-training metadata were preserved. No patient-specific, clinical approval, surgical accuracy, or manufacturing readiness claim was added.

## 4. Asset integrity audit

The R12–R14 unit audit walked all registered package-referenced assets, checked manifest entries and runtime paths, verified file sizes and SHA-256 checksums, and checked GLB headers. It covered **45 unique active runtime files** totaling **39.3 MiB**. The largest active file was `dundee-bd930c9b9da14f2a9a8c9b130b0e08a2-mirror-fdi-13.glb` at **2.20 MiB**. The one catalog asset not referenced by an active package was left unchanged.

## 5. Package integrity audit

The audit validates every registered manifest, unique package and case IDs, unique semantic object IDs, finite initial transforms, resolved starting checkpoints, role/editability consistency, and editable DESIGN expected outputs. The integration test loads each registered package through the common package loader.

## 6. Performance

Representative Crown, Complete Denture, RPD, Digital Model, and Implant packages were measured twice in the local Vitest/Node runtime. These are non-browser samples, not browser timings. Ranges across the two passes:

| Case | GLB parse | BVH build | Package load/switch | `dispose()` calls | Geometry bytes / triangles |
|---|---:|---:|---:|---:|---:|
| Crown | 11–17 ms | 156–205 ms | 22–32 ms | 0–0.03 ms | 6.58 MiB / 288,116 |
| Complete Denture | 25–29 ms | 439–473 ms | 114–132 ms | 0–0.02 ms | 17.54 MiB / 779,540 |
| RPD | 15–16 ms | 324–342 ms | 99–100 ms | 0.03 ms | 13.72 MiB / 602,696 |
| Digital Model | No GLB | 14–15 ms | 75–94 ms | 0.02–0.03 ms | 1.83 MiB / 29,500 |
| Implant | 0.8–1.4 ms | 21–26 ms | 39–47 ms | 0.04 ms | 1.21 MiB / 44,832 |

Geometry-byte figures cover vertex/index attributes and do not include BVH or material overhead. No runtime asset was large enough to justify morphology-reducing optimization.

## 7. Resource cleanup

All registered packages loaded through the common loader. Crown, Complete Denture, RPD, Digital Model, and Implant were then switched twice in sequence using the local runtime assets. The integration test confirmed prior case geometries were disposed and each workspace contained only the active package objects. Disposal-call measurements were below 0.05 ms in these Node runs. Existing CAD history, revision, reset, and recovery tests also passed in the complete suite.

## 8. Practice integration

Static and runtime checks cover package and checkpoint bindings, object mappings, step targets, registered validators, structured bilingual guidance, and package loading. R3 database-driven bindings are also checked against the existing migration seed. The protected Practice route remains covered by route and end-to-end tests.

## 9. Free Lab integration

The package-backed catalog contains the R3–R7 cases, each resolving to a registered package and checkpoint. Random selection is constrained to resolvable package cases. Import My Case and Blank Workspace entry modes remain available. Existing catalog merge checks continue to filter package-less legacy duplicates where a package-backed replacement exists.

## 10. CAD regression

The full unit suite covers selection and visibility, isolation and transparency, transforms, undo/redo, mesh editing and sculpting, analysis, section/thickness/contact checks, and reset behavior across representative workflows. Focused final integration coverage exercises actual package switching and the existing export entry point.

## 11. Save and recovery

Existing save/recovery tests cover representative package-backed workspaces, restore/discard behavior, reset, and case switching. No persistence architecture was added or changed for this audit.

## 12. Export

The focused integration test sends Crown, RPD, and Digital Model DESIGN objects through the existing download flow for STL, OBJ, and GLB. Export remains an educational CAD file flow; it does not indicate manufacturing readiness.

## 13. Auth and routes

All 15 Playwright tests passed. They cover public pages, protected Practice and Free Lab access, unauthenticated redirects, and private asset delivery. Authenticated visual QA was completed on the local Prostheia application on 2026-10-02; detailed findings and evidence limitations are recorded in section 21.

## 14. Supabase status

Read-only inspection confirmed the R3 fixed-prosthetics migration remains applied. The Phase 27 migrations are not applied remotely. `storage.objects`, `public.assets`, `public.model_assets`, and `public.asset_licenses` have no rows, so no public dental assets were uploaded. Existing Practice and scenario records remain populated and coherent. No remote writes were made.

## 15. Release blockers found

- **P0:** None found in the read-only audit.
- **P1 (automated/content):** The R3 complete bridge lesson title named teeth 14–16 while its package represents teeth 24–26. Corrected in local Practice copy.
- **P1 (authenticated visual QA, open):** Crown Practice framing/anatomy; Crown Free Lab proposal-to-preparation fit; Bridge component composition; Digital Model detached geometry and source/work distinction; Implant component relationship. Complete Denture and RPD tooth/support relationships were repaired and rechecked in the targeted geometry pass; remaining non-geometry framing concerns from the original QA are recorded in section 21.
- **P2:** R3 object names and some Serbian terms, R7 transliterated terminology, and the repeated R6 title wording were inconsistent. Corrected locally.

## 16. Release blockers fixed

The bridge title/package mismatch and listed terminology defects are fixed in local application content. The authenticated repair pass also corrected Practice package binding, made the Crown/Bridge support and antagonist less dominant, repositioned the Crown proposal, clarified raw-scan visibility, and restored the Virtual Articulator Practice case and motion controls. The targeted R4/R5 geometry pass corrected shared FDI side and arch orientation, moved R4 crown seats and support to the correct cervical/root sides, and adjusted one crowded posterior RPD slot. The Articulator Practice mismatch is cleared. Asset paths and checksums, package structure, and loading are covered by the final integration audit. No source OBJ masters, provenance, or licensing status were changed.

## 17. Remaining P2 / POST-V1 items

Remaining **P2:** Bite Splint framing leaves the model relatively small beside workflow controls. Remaining **POST-V1:** Free Lab catalog preview imagery and expert review of synthetic R4/R5 tooth morphology and educational arch angulation. No post-v1 feature work was started. The unrelated open P1 visual defects remain tracked in section 21.

## 18. Automated verification

Final verification batch after the scoped R4/R5 geometry and test corrections:

- Typecheck: **passed** (`rtk npm run typecheck`)
- Lint: **passed** (`rtk npm run lint`)
- Focused affected-workflow tests: **passed**, 2 files / 18 tests (`tests/unit/complete-denture-r4.test.ts`, `tests/unit/partial-denture-r5.test.ts`)
- Full Vitest: **passed**, 32 files / 241 tests (`rtk npm run test`)
- Production build: **passed** (`rtk npm run build`)
- Playwright: **passed**, 15 tests (`rtk npm run test:e2e -- --config=playwright.final-qa.config.ts`). The authenticated QA server already used port 3001, so a temporary config enabled `reuseExistingServer: true`; that config was removed after the run.
- Package integrity and active asset reference audit: **passed**, included in the R12–R14 integration test; all registered packages loaded, and all 45 active runtime files matched their manifest size and SHA-256 checksum.

## 19. Authenticated visual-QA checklist — completed

The requested 10 screens were inspected in the authenticated local browser. Screenshots were captured inline during the QA session. See section 21 for per-screen results and the limitation on exported local screenshot paths.

1. **Crown Practice — 4 min:** Confirm the prepared tooth, reference and editable Crown are visually distinct; inspect the current lesson, available tools, step navigation, and Design Check feedback.
2. **Crown Free Lab — 4 min:** Open the package-backed case; confirm the case brief matches the tooth shown, source/design styling is clear, and the editable proposal is visible and selectable.
3. **Bridge — 4 min:** Confirm teeth 24–26, two prepared abutments, one pontic, two connectors, and separate margin guidance are presented consistently.
4. **Complete Denture — 5 min:** Check both arches, individual tooth placement, upper/lower bases, and that the scene remains usable when zoomed and rotated.
5. **RPD — 5 min:** Check the Kennedy case label, saddle gaps, rests, clasps, connector and framework visibility; confirm selection and Design Check text identify the right parts.
6. **Bite Splint — 4 min:** Check the arch boundary and generated splint, inspect inside/outside surfaces, and confirm thickness feedback is labeled as an exercise target.
7. **Digital Model — 4 min:** Confirm the raw source remains distinguishable from the working mesh and separate base; inspect trim and section controls and any empty-result message.
8. **Virtual Articulator — 4 min:** Confirm both arches and controls are visible, opening/closing and lateral/protrusive actions respond, and copy describes deterministic training motion.
9. **Implant — 5 min:** Confirm the indexed synthetic scan body and supplied axis are clear, the fixture stays fixed, and emergence, suprastructure and Crown are separate; verify private-training framing is visible.
10. **Free Lab library — 4 min:** Confirm realistic package-backed cases appear, filters and Random Case open resolvable cases, and Import My Case and Blank Workspace remain available.

## 20. Final readiness status

**R12–R14 — AUTOMATED FINALIZATION COMPLETE**  
**RELEASE VISUAL REPAIR — INCOMPLETE**  
No P0 blockers remain, but the open P1 visual defects in section 21 prevent release readiness. **Do not start Phase 28.**

## 21. Authenticated visual QA results — 2026-10-03

The authenticated session reached the local Prostheia application. CAD package cases loaded and the Practice route initializes the intended package-backed lesson. No P0 blocker was observed. A targeted R4/R5 geometry repair was visually rechecked from perspective, occlusal, frontal and side views; unrelated major issues in other screens remain.

| Screen | Result | Visual QA notes | Screenshot evidence |
|---|---|---|---|
| Crown Practice | **P1 remains** | The correct case-backed lesson now loads: the prepared tooth, neighboring anatomy, antagonist, support, margin guide and SOURCE target are present; the generic Demo mismatch is fixed. The startup view is still too close: the large antagonist crowds the upper view and the pink support crosses lower tooth portions, making the preparation/anatomy harder to inspect. The expected current Practice object and boundary task are now obvious. | Captured inline in this Codex QA session. No local export path was returned. |
| Crown Free Lab | **P1 remains** | The anatomical proposal and named SOURCE/DESIGN/GUIDE/REFERENCE roles load. The proposal was repositioned and the support made thinner/translucent, but the startup composition remains crowded: the support intersects the tooth-root area and the opposing tooth overlaps the proposal visually, so crown-to-preparation fit is still unclear. | Captured inline in this Codex QA session. No local export path was returned. |
| Bridge | **P1 remains** | The connected design and named roles load; the local support and antagonist are thinner/translucent and the antagonist is closer to the arch. The view still does not make the two abutments and central pontic immediately readable as one supported three-unit bridge; neighboring anatomy and components visually crowd the span. | Captured inline in this Codex QA session. No local export path was returned. |
| Complete Denture | **Targeted geometry pass** | On the package-backed balanced case, upper crowns now point down and lower crowns up; the arches occupy opposite sides of the occlusal gap, and bases/ridges remain rootward of the cervical cuts. Front and side views show teeth emerging from the bases rather than stump-like remnants. No severe crown overlap was visible. | [r4-complete-denture-after-front.webp](visual-evidence/r12-r14-dental-geometry/r4-complete-denture-after-front.webp). Earlier screenshot was only viewed inline; no local before image was saved. |
| Partial Denture / RPD | **Targeted geometry pass** | Kennedy I lower teeth now form a coherent arch on the correct FDI sides; the residual ridge is rootward of the cervical plane. The upper/final-review checkpoint shows the connector, rests, clasps and bilateral distal saddles related to the arch; no severe tooth-to-tooth overlap was visible in frontal, occlusal, side or perspective views. Natural source teeth were not moved to fit the framework. | [r5-kennedy-i-after.webp](visual-evidence/r12-r14-dental-geometry/r5-kennedy-i-after.webp); [r5-kennedy-i-final-review-after.webp](visual-evidence/r12-r14-dental-geometry/r5-kennedy-i-final-review-after.webp). Earlier screenshot was only viewed inline; no local before image was saved. |
| Bite Splint | **P2** | The U-shaped shell follows the upper arch and its boundary/guide and controls are present. The model occupies only about 400 px of the roughly 1050 px viewport at startup; Frame Selected increases it but leaves the initial presentation small. | Captured inline in this Codex QA session. No local export path was returned. |
| Digital Model | **P1 remains** | The raw SOURCE, editable DESIGN and cleanup controls load; lowering SOURCE opacity made it more distinguishable. A detached large flat pink rectangle remains under and left of the arch, and the raw/working meshes still look too similar when overlaid, so the scan-cleanup/base relationship is unclear. | Captured inline in this Codex QA session. No local export path was returned. |
| Virtual Articulator Practice | **Pass** | Practice now opens the package-backed upper/lower arches and reference at the alignment checkpoint. Open / Close, Protrusive, Left lateral, Right lateral and Reset controls are visible and responded; analysis remains gated to its later step and Bite Splint controls are absent. | Captured inline in this Codex QA session. No local export path was returned. |
| Implant | **P1 remains** | Named scan body, axis, emergence, abutment, crown and screw-access roles load, but the screen presents a thick mixed cylinder/tooth form, upward double-cone guides, a broad pale ridge slab and neighboring teeth. The scan body and restorative axis are not readily distinguishable, and emergence-to-abutment-to-crown/screw-access relationships are not visually coherent. | Captured inline in this Codex QA session. No local export path was returned. |
| Free Lab library | **Pass (library UI)** | Catalog shows 21 readable cases; categories/titles and Scenario, Import My Case, Blank Workspace and Random Case actions are available. Random Case successfully launched the Posterior Crown workspace. | Captured inline in this Codex QA session. No local export path was returned. |

### Visual issues and fixes

- **P0:** None observed.
- **P1 remaining:** Crown Practice framing/support and crowded anatomy; Crown Free Lab proposal/support fit; Bridge abutment/pontic composition; Digital Model detached rectangle and raw/working distinction; Implant scan-body/axis/restorative relationship. The prior Complete Denture and RPD geometry findings were cleared by the targeted repair. Their remaining camera/presentation tuning is not a geometry blocker.
- **P1 cleared:** Virtual Articulator Practice package binding, initial checkpoint, motion controls and step gating.
- **Fixes made:** Practice now binds the R3 package and starts at `insertion_path` while preserving case package setup; Crown/Bridge support and antagonist placement/opacity were adjusted; Crown Free Lab proposal placement was adjusted; R4/R5 shared tooth placement and support transforms were corrected as detailed in section 22; Digital Model raw SOURCE opacity was lowered; Articulator Practice now loads its R6 case at `alignment`, with motion controls and analysis gating wired to the lesson step. A JSON array guard was added for `case_setup`, and the R6 scenario test now checks the configured starting checkpoint.
- **P2:** Bite Splint framing. **Fix made:** none.
- **POST-V1:** Free Lab case-preview imagery and later camera/geometry polish after P1 causes are corrected.
- **Screenshot paths:** The original 10-screen evidence remains inline in the QA session; the browser surface did not return saved local paths. The targeted geometry repair exported the three after images linked in the Complete Denture and RPD rows above. No local before image was saved.
- **Automated suite:** Final batch after the scoped code and test updates is recorded in section 18.

## 22. Targeted R4/R5 dental geometry repair — 2026-10-03

### Affected case and root cause

The manual defect traced to shared `completeDentureToothPosition()` placement logic used by both R4 Complete Denture and R5 RPD. The FDI side mapping treated quadrants 3 and 4 incorrectly, swapping the lower left/right placement. The upper/lower crown-only orientation was also reversed: R4 crowns extend from local Z=-0.35 toward +Z, but the helper pointed upper crowns up and lower crowns down. R4 then compounded this with positive lower-arch offsets and seating/support transforms that put the lower arch on the wrong side of the occlusal plane. The shared lower placement crowded adjacent FDI 36/37 (present together in Kennedy II, both absent in Kennedy I), producing a 0.345 bounding-box overlap ratio before adjustment.

This was shared placement logic, not a faulty source asset or a camera-only problem. Offline mirrored asset winding/normals were preserved; contralateral full-tooth derivatives are used as independent runtime assets, while the RPD package applies its explicit X reflection only to original assets used on the opposite side. No original OBJ master was changed.

### RPD Kennedy I tooth placement audit

Affected package: `r5-partial-denture-kennedy-i-v1`, case ID `r5rpdi`, lower arch; missing FDI 36, 37, 46, 47. Stable package object IDs are `tooth-<FDI>` and runtime IDs are `r5rpdi-tooth-<FDI>`. Positions are canonical training-frame units; X/Y rotations are zero. Z rotation is the arch tangent `side × atan2(|x| × 0.32, 42)`, where side is + for FDI quadrant 3 and − for quadrant 4. Package position/rotation/scale below are the initial transforms. Each instance preserves its source asset origin; no extra runtime translation or rotation is applied after package placement. Asset source units/provenance remain as stated in the asset manifest.

| Display name / object | FDI | Tooth class | Source asset / derivation | Side | Package position XYZ | Package rotation XYZ | Scale XYZ |
|---|---:|---|---|---|---|---|---|
| SOURCE · Remaining tooth · FDI 31 / `tooth-31` | 31 | Central incisor | `intact31` · original | Left | `[4, -30, 0]` | `[0, 0, +1.75°]` | `[1, 1, 1]` |
| SOURCE · Remaining tooth · FDI 32 / `tooth-32` | 32 | Lateral incisor | `intact32` · original | Left | `[10, -27.5, 0]` | `[0, 0, +4.35°]` | `[1, 1, 1]` |
| SOURCE · Remaining tooth · FDI 33 / `tooth-33` | 33 | Canine approximation | `intact23` · original upper-canine training approximation | Left | `[16.1, -22.5, 0]` | `[0, 0, +6.99°]` | `[1, 1, 1]` |
| SOURCE · Remaining tooth · FDI 34 / `tooth-34` | 34 | First premolar | `intact34` · original | Left | `[21, -15.2, 0]` | `[0, 0, +9.09°]` | `[1, 1, 1]` |
| SOURCE · Remaining tooth · FDI 35 / `tooth-35` | 35 | Second premolar | `intact35` · original | Left | `[26, -6.2, 0]` | `[0, 0, +11.19°]` | `[1, 1, 1]` |
| SOURCE · Remaining tooth · FDI 41 / `tooth-41` | 41 | Central incisor | `intact31` · original central-incisor form | Right | `[-4, -30, 0]` | `[0, 0, -1.75°]` | `[1, 1, 1]` |
| SOURCE · Remaining tooth · FDI 42 / `tooth-42` | 42 | Lateral incisor | `intact32` · original, runtime mirrored | Right | `[-10, -27.5, 0]` | `[0, 0, -4.35°]` | `[-1, 1, 1]` |
| SOURCE · Remaining tooth · FDI 43 / `tooth-43` | 43 | Canine approximation | `mirrored13` · offline contralateral derivative; upper-canine approximation | Right | `[-16.1, -22.5, 0]` | `[0, 0, -6.99°]` | `[1, 1, 1]` |
| SOURCE · Remaining tooth · FDI 44 / `tooth-44` | 44 | First premolar | `intact34` · original, runtime mirrored | Right | `[-21, -15.2, 0]` | `[0, 0, -9.09°]` | `[-1, 1, 1]` |
| SOURCE · Remaining tooth · FDI 45 / `tooth-45` | 45 | Second premolar | `intact35` · original, runtime mirrored | Right | `[-26, -6.2, 0]` | `[0, 0, -11.19°]` | `[-1, 1, 1]` |

Asset ID mapping: `intact31` = `d4000000-0000-5000-8000-000000000010`; `intact32` = `d4000000-0000-5000-8000-000000000011`; `intact23` = `d4000000-0000-5000-8000-000000000012`; `intact34` = `d4000000-0000-5000-8000-000000000008`; `intact35` = `d4000000-0000-5000-8000-000000000009`; offline `mirrored13` = `d4000000-0000-5000-8000-000000001000`. In quadrant 3, the FDI order runs from central incisor through second premolar along increasing positive X; quadrant 4 mirrors that arch order at negative X. The archived placement bug put those quadrants on the opposite X sides. Slot 7 was widened from Y=10 to Y=14 in the shared lower arch; the Kennedy II bounding-box check now keeps adjacent teeth below 0.15 overlap. Automated checks assert unique positions/FDI, finite transforms, expected original/mirrored mapping, side assignment, arch order, adjacent bounds overlap, and rootward ridge bounds.

### Complete Denture and support corrections

R4 crown seating is now based on the asset cervical cut at local Z=-0.35 and a 9-unit seat. Upper crown orientation is X=π; lower is X=0. Upper/lower arch offsets now separate the arches (`[0,0,-18]` for the balanced and resorbed cases; `[3,1,-19]` for the relation case). Ridge/base geometry is calculated from each cervical plane and stays on the rootward side: above the maxillary teeth and below the mandibular teeth. The RPD residual arch also uses the shared ridge with its cervical plane explicitly set to Z=0, keeping support off visible crowns. Automated bounds checks cover all R4 package morphologies, opposing-arch separation, and severe adjacent crown overlap.

### Files changed and verification

- `src/cad/denture/r4-geometry.ts` — FDI-side correction, arch-derived tooth rotation, posterior spacing, and cervical-plane-aware ridge placement.
- `src/cad/partial-denture/r5-geometry.ts` — place the RPD residual arch rootward of the cervical plane.
- `src/cad/case-packages/definitions/complete-denture-r4.ts` — correct crown seat, upper/lower orientation and arch/support offsets.
- `tests/unit/complete-denture-r4.test.ts`, `tests/unit/partial-denture-r5.test.ts` — focused placement, identity, bounds and overlap sanity checks.
- Screenshots: [R4 Complete Denture front](visual-evidence/r12-r14-dental-geometry/r4-complete-denture-after-front.webp); [RPD inspect](visual-evidence/r12-r14-dental-geometry/r5-kennedy-i-after.webp); [RPD final review](visual-evidence/r12-r14-dental-geometry/r5-kennedy-i-final-review-after.webp).

The authenticated package-backed visual recheck covered perspective, occlusal/top, frontal, and lateral views for the RPD, plus front and side views for Complete Denture. Both arches read coherently; no obvious tooth reversal, severe overlap or gingiva crossing visible crowns was seen. The earlier screenshot was observed inline but not exported, so this report contains after-only local evidence.

Final focused validation for the corrected placement audit: **2 test files / 18 tests passed**. Final full validation is recorded in section 18.
