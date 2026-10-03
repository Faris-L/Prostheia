# Dental Realism R4 — Complete Denture

**Status:** local private educational implementation. Remote activation and authenticated visual QA remain pending. Do not describe R4 as complete until those checks are available. This work does not start R5.

## 1. Scope

R4 replaces the existing synthetic Complete Denture flow for the new package-backed routes. It keeps the established CAD viewport, Geometry Registry, generic R1 Case Package loader, shared transforms, mesh editing, Sculpt, curves, analysis, history, save/recovery, Practice and Free Lab systems.

Three synthetic educational cases, ten staged checkpoints/Practice lessons, a 16-asset crown-only denture-tooth training library, package-aware checks and focused tests are present locally. No remote migration, database write or Storage upload was attempted.

## 2. Dundee source assets and status

The R4 library derives separate artificial denture-tooth training assets from accepted private Dundee anatomy. Source forms cover maxillary and mandibular incisors, maxillary canines/premolars/molars, mandibular premolars/molars, and two controlled contralateral mirrors:

- Maxillary central and lateral incisor source forms: FDI 21 and 22.
- Maxillary canine source: FDI 23; its offline mirror supplies the opposite-side training form.
- Maxillary premolar/molar source forms: FDI 24–27.
- Mandibular incisor/premolar/molar source forms: FDI 31, 32 and 34–37; FDI 37's offline mirror supplies the opposite-side second-molar form.
- The mandibular canine training shape uses the maxillary canine form and is marked internally as an approximation. It does not claim mandibular natural-tooth identity.

R3.1 resolved the original maxillary canine as FDI 23 from the official Dundee listing, source filename UL3, downloaded metadata and morphology. It resolved the lower second molar as FDI 37 from the official Dundee listing, source filename LL7, metadata and mesh comparison. The second-molar page's conflicting maxillary-third-molar description is retained in provenance.

Every runtime derivative retains Dundee title, UID, original URL, CC BY 4.0 attribution, source OBJ checksum, source asset ID, proposed FDI, unit status, normalization notes, morphology/review status and runtime checksum. The source OBJ masters are unchanged. This is PRIVATE EDUCATIONAL V1 ONLY. No asset is clinically validated, expert reviewed, patient-provenance cleared, public-production approved or portfolio cleared.

## 3. Denture-tooth training assets

The builder at scripts/build-r4-denture-tooth-assets.mjs creates 16 separately catalogued artificial denture-tooth forms. Each GLB has its own stable runtime ID, ivory training material, source/derivation link and private provenance record. The set is not based on or described as a commercial denture-tooth system.

Natural-source roots are removed at the source-frame cervical training datum of -0.35 exercise mm. The cut is capped and normals are recomputed. The datum is an exercise derivation, not a universal dimension. Original intact source assets remain preserved separately in the R3 private asset set.

The R4 tooth assets are independently positionable CAD objects with FDI identity, arch, morphology key and source link. One canine object per jaw quadrant is retained as its own editable object. Both arches use 28 teeth and exclude third molars.

## 4. Synthetic arch anatomy

The local geometry in src/cad/denture/r4-geometry.ts builds swept residual ridges with smooth anatomical curvature and closed end caps. The maxilla adds a palatal vault and paired tuberosity context. The mandible adds a lingual support shelf and paired retromolar support regions. Balanced and resorbed synthetic morphologies have distinct width/height and arch-form parameters.

These are generated synthetic educational meshes, not patient scans or patient-specific anatomy. No clinical dimensions or universal resorption pattern are asserted. Meshes are created as moderate-resolution surfaces without visible sphere, box or cylinder placeholders as primary anatomy.

## 5. Local soft-tissue context

R4 provides only enough synthetic tissue form to explain the residual ridge, palate, lingual support, tuberosity/retromolar context and relation to the bases. It does not attempt a complete soft-tissue simulation system.

## 6. Jaw relation and occlusion

Each case has separate upper and lower SOURCE arches, editable GUIDE plane and midline objects, upper/lower reference curves and a synthetic relation reference. The normal cases use the same exercise relation; the relation-challenge case offsets the lower arch by a different transform. The existing shared Proximity/contact tools operate on individual opposing tooth objects.

The relation is synthetic and educational. It is not patient-specific and does not establish clinical occlusion.

## 7. Denture-base strategy

Each package includes editable upper and lower DESIGN base objects. The generated mesh groups expose separate polished and tissue-side surfaces. The upper base adds polished and tissue-side palatal plate surfaces; the lower base adds separate lingual-flange surface concepts. Both follow the synthetic ridge arrangement and stay separate from the locked SOURCE arches.

These surfaces are editable representations, not a validated tissue fit or a manufacturing-ready watertight denture. The components have not been Boolean-unioned into a single clinically interpreted solid. Borders are stored as editable curves on their matching arch.

## 8. Case Package architecture

Three package manifests are registered in src/cad/case-packages/definitions/complete-denture-r4.ts:

| Case | Package ID | Difference |
| --- | --- | --- |
| Balanced conventional setup | r4-complete-denture-balanced-v1 | Conventional synthetic ridges and relation |
| Resorbed ridge setup | r4-complete-denture-resorbed-v1 | Narrower/lower synthetic support morphology |
| Jaw relation challenge | r4-complete-denture-relation-v1 | Laterally and vertically offset lower relation |

The manifests declare SOURCE arches, DESIGN teeth and bases, GUIDE plane/midline/border references, a REFERENCE relation plane, transforms, workflow metadata, assets, validation bindings and expected output. The loader remains generic; there is no R4-only scene construction path in the loader.

## 9. Checkpoints

R1 asset-snapshot and baseline checkpoints stage visibility and available anatomy for:

1. case_inspection
2. occlusal_plane
3. anterior_setup
4. posterior_setup
5. static_occlusion
6. borders
7. base
8. polished_surface
9. final_occlusion
10. full_denture_case

The Free Lab packages start at full_denture_case. Practice lessons start at the checkpoint for their specific task. Stage labels remain in the checkpoint IDs and learner content; no unregistered workflow-state adapter was introduced.

## 10. Practice integration

Ten bilingual EN/SR lessons are registered locally: inspect arches, set the occlusal plane, anterior setup, posterior setup, static occlusion, borders, bases, tissue/polished surface shaping, final occlusion and full-case review.

Each Learning Guide provides WHAT, WHY, OBJECT, TOOL, ACTION, TARGET and CHECK. Numeric values are written as targets for this exercise. Lessons use the package ID and checkpoint in the R1 Case Package setup. Legacy denture factories remain available for saved/legacy content.

The protected Practice page catalog merges these local R4 lessons with database lessons by slug. The local R4 definition takes precedence for a matching slug, so the package-backed lessons are available without a remote content migration.

## 11. Free Lab cases

Three fictional private training orders use the package-backed Free Lab route:

1. PT-EDU-R4-CD01 — balanced conventional setup.
2. PT-EDU-R4-CD02 — narrower resorbed-ridge morphology.
3. PT-EDU-R4-CD03 — offset jaw-relation/setup challenge.

Each case includes a workflow, target teeth, indication, supplied records, material training preset, requirements and notes. They are listed for the existing Random Case selector and do not contain guided Practice steps or identifiable patient data.

The protected Free Lab page catalog merges the three local R4 cases with database scenarios by ID. A matching ID resolves to the local package-backed definition.

## 12. Design Check and validators

The existing denture_setup and analysis_target validators now use package object semantics where package denture metadata is present and retain the legacy route otherwise. R4 checks:

- Both SOURCE arches, guide curves and the editable plane against its exercise target.
- Twenty-eight unique, editable FDI tooth objects and edits in the requested setup group.
- A closed boundary curve on each requested SOURCE arch.
- Editable base objects with registered mesh geometry and matching closed borders.
- Complete-case tooth/base/border presence and current upper/lower contact analysis.

The checks are educational scene-structure and measurement checks. They are not clinical validation, patient-specific recommendations or manufacturing checks.

## 13. Runtime and performance

Sixteen private R4 GLBs total 10,246,000 bytes after crown-only derivation, compared with 22,730,756 bytes before root removal. Package definitions bind individually positioned teeth to these existing asset references; case loading resolves each required library form rather than loading the full R3 library.

The focused test parses the 16 GLBs, verifies checksums, normals, the cervical cut, closed-manifold edge use, winding/positive signed volume and BVH construction. The test that loads the full Free Lab package from the actual 10.25 MB local GLB files, registers 28 individual teeth, waits for their Geometry Registry BVHs, then switches to R3 and checks registry cleanup completed in 255 ms on this machine. This is a local Node/Vitest measurement, not a browser network-load, memory or viewport-responsiveness measurement.

## 14. Tests

tests/unit/complete-denture-r4.test.ts has eight focused tests covering the 16 derived assets and provenance, all three Case Packages, 28-tooth semantics, checkpoints, EN/SR Practice content, the three Random Case Free Lab orders, local page-catalog merging, Design Check behavior, actual GLB case load/BVH creation, geometry construction and cleanup on case switching. The existing R3 fixed-prosthetics test expects 30 private R3 assets after R3.1; package-referenced R3 asset count remains separately checked.

Local verification on 2026-10-02: typecheck passed, lint passed, focused R4 tests 8/8 passed, focused R3/R4 tests 17/17 passed, full unit suite 26 files / 201 tests passed, production build passed, and Playwright 15/15 passed.

Playwright covered public rendering and authentication guards. It confirmed protected Practice and Free Lab routes redirect unauthenticated users to login. No authenticated R4 scene could be opened, so there are no authenticated visual screenshots or browser viewport/load measurements. Do not claim authenticated visual QA.

## 15. Attribution, provenance and private-use boundary

Dundee source attribution and CC BY 4.0 records remain attached to the private runtime derivatives. Source units, patient/source-image provenance and expert review remain unknown/unreviewed. Do not upload the assets to public Supabase Storage or describe them as public-production or portfolio-cleared content.

## 16. Remaining limits

- The arches, jaw relation and base contours are synthetic exercise geometry, not patient-specific anatomy.
- The denture forms are morphology-derived educational assets, not a commercial tooth system.
- The lower canine is explicitly an upper-canine approximation.
- Numeric position and plane values are targets for this exercise only.
- Tissue-side and polished surfaces are separate design representations; no patient fit, clinical correctness or manufacturing readiness is claimed.
- Authenticated visual QA and remote activation remain pending.

## 17. Remote/auth tasks still pending

R3 remains blocked only by remote migration activation and authenticated visual QA. Do not apply the R3 migration remotely; do not touch the two pending Phase 27 migrations. No R4 remote write or asset upload is authorized or included in this local implementation. When authenticated access is available, activate only through the approved migration process, then perform authenticated visual review and browser load/switch/cleanup measurements for the R4 cases. Do not start R5 before the R4 review gates close.
