# Dental Realism R3 — Fixed Prosthetics

**Status:** private educational V1 implementation in the workspace. R3 is blocked on the remote migration and authenticated browser QA. R4 local implementation has started; no R5 work has started. Do not distribute as public portfolio or production content.

## 1. Scope delivered

R3 adds package-backed educational cases for Crown, Bridge, Inlay, Onlay and Veneer. It reuses the R1 Case Package loader, Geometry Registry, asset registry, normalization metadata, shared CAD tools, analysis infrastructure, save/recovery path and Free Lab/Practice workspaces. The legacy procedural factories remain available for legacy content.

Six Free Lab case definitions are included: two Crowns, one Bridge, one Inlay, one Onlay and one Veneer. Existing fixed-prosthetics Practice content is updated by a new SQL migration rather than by replacing the existing content schema.

## 2. Dundee assets used

Eleven structurally passing candidate meshes were converted to intact runtime assets. FDI labels below are proposed anatomy mappings from the candidate manifest, not clinically verified identities.

| Candidate title | UID | Proposed FDI |
| --- | --- | ---: |
| Maxillary First Premolar | `f9b48a29d34f4923b683433f030c5c70` | 24 |
| Maxillary Second Premolar | `69f3142830064588b000b04bea0ee09f` | 25 |
| Maxillary First Molar | `e719a474ef7e4bd7abec508f85f1e984` | 26 |
| Maxillary Second Molar | `e035713849d1438791306e25235ac452` | 27 |
| Mandibular First Molar | `e1c919d6603846eca873154eeededdd6` | 36 |
| Maxillary Left Central Incisor | `c8a7c2d9280d4c92bc651cfa1459866a` | 21 |
| Maxillary Lateral Incisor | `5e89ddbfc6454e2e8e09c645574b8932` | 22 |
| Mandibular First Premolar | `935637a703dc49eb9eeec9b15a8a5c4c` | 34 |
| Mandibular Left Second Premolar | `fe59fe04725446479bc1115bb12d0ad8` | 35 |
| Mandibular Left Central Incisor | `90dcbf474e5a4d97b8783b7eb2b9c4b7` | 31 |
| Mandibular Left Lateral Incisor | `00fa4f74e10b4769830bf60469c65e27` | 32 |

The two identity/geometry-blocked candidates are excluded. No unresolved candidate was promoted as canonical anatomy.

## 3. Private-use status

Every promoted asset is marked `private_training_approved`. That label authorizes this private educational V1 use only. The assets are not clinically validated, expert reviewed, patient-provenance cleared or public-production approved. No patient-specific anatomy or jaw relation is asserted.

Runtime meshes are served only from the authenticated `/api/private-training-assets/[assetId]` route. The R3 migration does not upload meshes to Supabase Storage.

## 4. Attribution and provenance

The private asset manifest retains, per asset, the Dundee title and UID, original URL, CC BY 4.0 license and attribution text, source archive checksum, original OBJ path and checksum, proposed FDI, original/derived status, source-unit state, normalization notes and matrix, morphology QA state, review state, patient/source-image provenance state, runtime checksum and derived-from link. Original OBJs under `.research/dundee-permanent-teeth/` remain the source masters and are not overwritten.

Source units, source-image authorization, patient provenance and expert review remain unknown or unreviewed as recorded in R2. Those states are not inferred or filled in.

## 5. Runtime conversion

The generator verifies each source OBJ checksum before conversion, writes single-file GLB runtime assets, computes vertex normals, and records bounds, vertex/triangle counts and checksums. It does not decimate the source meshes. Runtime IDs are stable UUIDs in the private catalog.

R3 currently produces **26 runtime GLBs**: 11 intact anatomy conversions and 15 separate training derivatives, totaling **25,067,716 bytes**. The original-to-training-frame matrix and display assumptions are recorded. Source units remain `unknown`; the scene's display scale is an exercise assumption, not a physical conversion claim. Assets are marked canonical only for this generated display frame so the import path does not apply a second transform. The shared original-to-canonical pipeline remains intact for source assets.

## 6. Preparation derivation

Preparations are separate meshes derived from source tooth geometry and preserve tooth position and cervical/root context. Crown and Bridge abutment examples use source-derived coronal clipping and tapered sidewalls; the Inlay basin is lowered centrally while retaining the cusp envelope; the Onlay has broader occlusal/cuspal reduction; the Veneer example reduces the facial surface while retaining the anterior outline, incisal edge and cervical region.

Each derivation is linked to its source asset and described in the manifest. Example dimensions are labeled **“Target for this exercise”**. None of these forms is a universal preparation or clinical recommendation.

## 7. Crown package architecture

The showcase package is `r3-crown-26-v1`, based on the proposed FDI 26 maxillary first-molar source. It contains a prepared SOURCE, adjacent teeth, opposing tooth, local synthetic gingiva/support, separate editable DESIGN Crown proposal, intact REFERENCE, margin GUIDE and insertion-axis GUIDE. The original anatomy and Crown remain separate objects.

The starting Crown proposal is derived from the source tooth's recognizable occlusal anatomy. It is editable by the existing CAD tools; users can change cusp form, grooves, fissures, ridges and contours with Sculpt tools. Free Lab starts with the anatomical proposal visible. The second Crown case, `r3-crown-36-v1`, provides a distinct mandibular example.

## 8. Crown checkpoints

The Crown 26 package exposes distinct R1 checkpoints:

| Checkpoint | Starting state |
| --- | --- |
| `margin` | Prepared case; learner starts margin tracing |
| `insertion_path` | Margin curve available; insertion direction is shown for review |
| `placement` | Separate Crown proposal offset for placement practice |
| `contacts` | Crown proposal returned to its aligned contact-review state |
| `sculpt` | Positioned Crown plus intact morphology reference |
| `thickness` | Separate near-final proposal for section/thickness review |
| `case_start` | Full case baseline before the lesson-specific stage |
| `proposal_ready` | Free Lab proposal ready for adaptation |

Other Crown lessons and Crown 36 use the corresponding package stages rather than reopening one identical procedural scene.

## 9. Bridge architecture

`r3-bridge-24-26-v1` is a synthetic three-unit exercise with two prepared abutments at 24 and 26, a pontic at 25, neighboring anatomy, an opposing tooth, synthetic support and an intact reference. Its connected editable design stores five semantic unit IDs: two abutment crowns, one pontic and two connectors. It is not represented as three independent crowns. The shared workflow state retains unit semantics even though the output is connected.

## 10. Inlay

`r3-inlay-36-v1` uses a source-derived intracoronal preparation that retains the cusp envelope and a distinct central occlusal patch design. It is separate from the Crown and Onlay forms. The patch communicates partial coverage; it does not claim verified internal fit.

## 11. Onlay

`r3-onlay-26-v1` uses a broader occlusal/cuspal preparation and separate partial-coverage design with restored occlusal anatomy. Its coverage metadata is `broad-partial-cuspal-coverage`, distinct from the Inlay's central patch and the Crown's full-coronal design.

## 12. Veneer

`r3-veneer-21-v1` uses a source-derived anterior preparation, adjacent lateral incisor, synthetic opposing incisors, local support, intact pre-operative reference and separate thin facial/incisal shell. It is educational anterior CAD only; it is not full Digital Smile Design or a patient-specific treatment plan.

## 13. Gingiva and local context

Each package includes a locally bounded synthetic support surface positioned with its teeth. It is generated as a mesh surface and kept small to provide cervical/pontic context; no complete soft-tissue simulation is introduced. It is explicitly labeled synthetic training geometry.

## 14. Occlusion strategy

Packages use anatomically recognizable opposing teeth or a small opposing segment, placed in a synthetic educational relation. The existing proximity/contact and section/thickness tools remain available. The arrangement is not patient-specific and is not a clinical jaw relation.

## 15. Design Check mappings

Package validation bindings resolve SOURCE, DESIGN, GUIDE and REFERENCE IDs. Existing `required_object`, `restorative_setup` and `analysis_target` validators remain in use. R3 adds package-aware checks for editable design identity, distinct Inlay/Onlay/Veneer coverage semantics, Bridge's two abutments/one pontic/two connectors, and separate closed margins on both Bridge abutments. Existing analysis targets are rebound from legacy IDs to the R3 package object IDs.

Contact, occlusion, thickness and section readings remain exercise checks using the shared analysis system. Any numeric value must be described as a **target for this exercise**; these checks do not establish clinical correctness, manufacturing readiness or patient safety.

## 16. Practice changes

The migration routes the existing 17 fixed-prosthetics lessons to package IDs/checkpoints: 7 Crown, 4 Bridge, 4 Inlay/Onlay and 2 Veneer lessons. Step guidance is bilingual EN/SR and follows WHAT, WHY, OBJECT, TOOL, ACTION, TARGET and CHECK. The package selector requires an explicit package ID for R3 so pre-existing saved lessons and legacy workflows keep their fallback behavior.

The migration file is present. Its remote application status and target database checks are recorded in Section 20. Database-backed Practice content changes are not active until the intended private database records the R3 migration.

## 17. Free Lab cases

The six package-backed fictional cases are:

1. Posterior Crown 26 (`r3-crown-26-v1`)
2. Mandibular Crown 36 (`r3-crown-36-v1`)
3. Three-unit Bridge 24–26 (`r3-bridge-24-26-v1`)
4. Posterior Inlay 36 (`r3-inlay-36-v1`)
5. Partial-cuspal Onlay 26 (`r3-onlay-26-v1`)
6. Anterior Veneer 21 (`r3-veneer-21-v1`)

Each has an invented case ID and fictional Lab Order with workflow, tooth/teeth, indication, supplied records, requested output, training material preset, requirements and notes. There are no guided Practice steps in Free Lab. All six are eligible for the existing Random Case selector and resolve to a registered Case Package.

## 18. Performance

The production route includes the private asset handler and Next's output trace contains all 26 unique runtime GLBs. The focused R3 test parsed all 26 actual GLBs and built/disposed a BVH for each; the measured test body was approximately **0.54 seconds** on this development machine for about **25.1 MB** of runtime files. That is a file-parse/BVH check, not an end-to-end browser load measurement. Package switching and cleanup are covered by unit tests.

The authenticated R3 workspaces were not available in the browser session, so viewport responsiveness, real case load times and case switching remain unmeasured. The opened app redirected `/practice` to `/login`. No case screenshots were captured. Case loading remains limited to the assets referenced by the selected package/checkpoint.

## 19. Tests and verification

R3-focused tests cover provenance and blocked-candidate exclusion, actual runtime GLB checksums and parsing, normal attributes and BVH creation, Crown object roles and checkpoints, Bridge unit semantics, Inlay/Onlay/Veneer distinctions, all six Free Lab package resolutions, Random Case selection, validator bindings and cleanup on case switching. E2E coverage checks that the private GLB route returns 401 without an authenticated session.

Final verification: **typecheck passed; lint passed; R3 tests 9/9 passed; full unit suite 193/193 passed; production build passed; Playwright 15/15 passed.**

## 20. Remaining blockers and handoff status

### Remote migration check

- The configured app URL and the connected Supabase MCP project both resolve to `https://nzxcovebvofxgvknbnzs.supabase.co` (project `nzxcovebvofxgvknbnzs`).
- Remote migration history was inspected before any write. The R3 version `20261002120000` is absent; the latest recorded migration is `20260929104711` (`phase_25_content_corrections_2`).
- Two unrelated local migrations are also pending remotely: `20260929140000_phase_27_storage_upload_limits.sql` and `20260929150000_phase_27_atomic_admin_content_save.sql`. Neither was applied.
- The Supabase SQL connector rejected the migration before executing its first update because its transaction is read-only. No remote data was changed by that attempt.
- The local Supabase CLI is authenticated to a different project. Linking it to the target returned `LegacyLinkProjectStatusError` because that CLI account lacks privileges for the target project endpoint. No migration was applied or recorded.

### Remote pre-apply baseline

- Counts: 60 Practice lessons, 91 Practice steps, 93 Practice hints, 12 Practice modules, 15 Free Lab scenarios and 12 content domains.
- Unrelated Practice rows were fingerprinted before application: 43 lessons (`ee214f2ebec9d4cc030fe76235aadf65`), 70 steps (`18c6e9faa5dcb772884a2027fbbe4ee0`), 68 hints (`07dc3dc8084270ee8c242fc1b2ed6c63`) and 8 modules (`b69b7f3f5808b958b00f5daeb73bcbef`). The 15 existing scenarios have baseline fingerprint `5e83faa5a438103c51ccf2bdb464d7e8`.
- The only public Storage bucket is `marketing-assets`. It contains 0 `.glb`/`.obj` objects and 0 object names containing `R3` or `Dundee`. The migration itself does not upload assets.
- These are pre-apply observations. Post-migration lesson/package counts and unchanged-row fingerprints remain unverified because the migration was not applied.

### Authenticated visual QA and browser performance

- The local app redirected `/practice` to `/login`; no authenticated session was available. Each requested scene remains unverified:

| Case | Authenticated visual QA | Evidence |
| --- | --- | --- |
| Crown Practice | Not run; login required | None |
| Crown Free Lab | Not run; login required | None |
| Bridge | Not run; login required | None |
| Inlay | Not run; login required | None |
| Onlay | Not run; login required | None |
| Veneer | Not run; login required | None |

- Crown checkpoint states `margin`, `placement`, `contacts`, `sculpt` and `thickness` were not opened or compared. No scene screenshots were captured; evidence paths: none.
- Browser measurements remain uncollected:

| Measurement | Result |
| --- | --- |
| Crown Practice load and interactive time | Not measured; login required |
| Bridge load and interactive time | Not measured; login required |
| Switch between R3 cases | Not measured; login required |
| Viewport responsiveness | Not measured; login required |
| UI stalls and memory/resource behavior | Not measured; login required |

- No R3-specific visual fixes were made because the real scenes could not be opened.

### Final R3 Definition of Done

**R3 — BLOCKED.** The target project is confirmed, but applying and recording the R3 migration requires Supabase CLI access to `nzxcovebvofxgvknbnzs` or a project-scoped migration executor. Authenticated visual QA and browser performance checks also require a signed-in local app session. No unrelated migration was applied and R4 has not been started.

Public/portfolio distribution remains blocked pending independently established source-image/patient provenance and review/permission work; no such clearance is claimed here.

## 21. What moves to R4+

R4 work in this continuation is restricted to local implementation and verification. Do not apply the R3 migration or touch the two pending Phase 27 migrations; do not start R5. Public portfolio or production clearance, patient/source-image provenance, expert review, and clinical validation are separate future work and are not implied by this private educational implementation.

## R3.1 addendum — Dundee identity and FDI coverage

This addendum supersedes the earlier R3 source count, runtime count and identity-coverage statements in this document.

The Maxillary Canine model, UID bd930c9b9da14f2a9a8c9b130b0e08a2, resolves with high confidence to the original left canine, FDI 23. Evidence: the official Dundee title [Maxillary Canine](https://sketchfab.com/3d-models/maxillary-canine-bd930c9b9da14f2a9a8c9b130b0e08a2), downloaded source filename UL3sketch1_1.OBJ, source metadata, and the visible single-cusp canine morphology with its long root.

The Mandibular Second Molar model, UID b77dcbc5052e4740b87cdb1964649742, resolves with high confidence to the original left lower second molar, FDI 37. Evidence: the official Dundee title [Mandibular Second Molar](https://sketchfab.com/3d-models/mandibular-second-molar-b77dcbc5052e4740b87cdb1964649742), downloaded source filename LL7sketch_1.OBJ, source metadata, and its two-root lower molar morphology compared with the three-root maxillary third molar reference. The official page description conflicts with its title and says “Maxillary Third Molar (Left)”; that conflict remains recorded in the candidate manifest and private asset provenance. No CT-derived patient provenance is inferred.

Both identity decisions have HIGH internal confidence, not clinical validation or expert review. Their source units and patient/source-image provenance remain unknown. The original OBJs remain unchanged under .research/dundee-permanent-teeth/.

The runtime asset builder now produces 30 R3 private anatomy GLBs from 13 original source conversions and 17 derived assets, totaling 32,317,456 bytes. Two new controlled offline mirrors extend FDI 23→13 and 37→47. Each mirror has reversed winding, recomputed normals, and passed closed-manifold edge counts, degeneracy, winding and positive signed-volume checks. Exact reflection is an educational derivative, not an independent natural specimen.

Final R3 private asset coverage is 13 original FDI positions: 21, 22, 23, 24, 25, 26, 27, 31, 32, 34, 35, 36, 37. Including the two mirrors, 15 FDI positions are represented: 13, 21, 22, 23, 24, 25, 26, 27, 31, 32, 34, 35, 36, 37, 47. Full 32-position coverage is not achieved. The two blocked candidates remain excluded. Private training approval remains limited to this educational V1 and is not public or portfolio clearance.


## R3.2 addendum - Supabase MCP verification (2026-10-02)

This addendum supersedes the earlier remote migration status in Section 20. It does not clear the separate provenance, expert review, or public-use blockers.

### Write probe and migration history

- Supabase MCP connected to https://nzxcovebvofxgvknbnzs.supabase.co (project nzxcovebvofxgvknbnzs).
- The requested BEGIN / CREATE TABLE / ROLLBACK probe returned successfully. A to_regclass check returned null before and after; no persistent probe table remains.
- Before migration reconciliation, remote history ended at 20260929104711 (phase_25_content_corrections_2). The R3 entry and both Phase 27 entries were absent.
- Before my migration call, the database already contained the R3 data effects: all 17 expected Practice package/checkpoint bindings, 21 bilingual guided steps, 6 published/random-eligible R3 scenarios, 4 updated module summaries, and no R3 lesson hints. This indicates the recent data push applied the R3 content, but did not record its migration in remote history.
- The pre- and post-write totals are 60 lessons, 91 steps, 68 hints, 12 modules, 21 scenarios, and 12 content domains. Unaffected-row fingerprints match the earlier baseline exactly: lessons ee214f2ebec9d4cc030fe76235aadf65, steps 18c6e9faa5dcb772884a2027fbbe4ee0, hints 07dc3dc8084270ee8c242fc1b2ed6c63, modules b69b7f3f5808b958b00f5daeb73bcbef, and scenarios 5e83faa5a438103c51ccf2bdb464d7e8.
- I applied only supabase/migrations/20261002120000_dental_realism_r3_fixed_prosthetics.sql through Supabase MCP to reconcile the migration ledger and reassert the intended R3 rows. Remote history now records name 20261002120000_dental_realism_r3_fixed_prosthetics at version 20261002153610.
- Post-write checks confirm all 17 bindings, all 21 guidance steps, all 6 scenarios, and all 4 module summaries; stale target, validation, and reference IDs are zero. Unaffected fingerprints are unchanged. public.__codex_write_probe remains absent.
- All five Storage buckets contain zero objects, including zero GLB/OBJ and zero names containing R3 or Dundee. Phase 27 upload limits remain unset and save_admin_lesson/save_admin_scenario are absent. Neither unrelated Phase 27 migration was applied.

### Authenticated QA status

- The focused R3 unit test passed: 9/9 tests.
- The computer-use inventory had no available browser or authenticated session, and the in-app browser was unavailable. A local request to /practice redirected to /login. I could not open authenticated Practice or Free Lab scenes or collect browser timing, viewport, or memory measurements. No user credentials or test account were entered or created; the local dev server was stopped after the check.
- R3 remote data and migration verification are complete. Authenticated visual QA remains blocked until an authenticated app browser session is available, so the overall R3 handoff remains incomplete.


### R3.3 follow-up recheck (2026-10-02)

- Reconfirmed the Supabase project URL, the recorded R3 migration, and the unchanged R3 row counts: 17 package bindings, 21 bilingual guidance steps, and 6 scenarios. Both Phase 27 migrations remain unapplied.
- Repeated the BEGIN / CREATE TABLE / ROLLBACK probe; it succeeded and to_regclass remained null afterward.
- Retried browser QA. No browser is present in the computer-use inventory; both the in-app browser and Chrome are unavailable. The local /practice route again redirects to /login. Authenticated visual and performance checks remain outstanding.
