# Dental Realism R2 — Anatomy Library v1

> **Current status (2026-10-02):** Dundee identity evidence and private local asset promotion are recorded in the R3.1 addendum below. Dundee remains blocked from global/public-production approval because patient/source provenance, source units, and expert review remain unresolved. Private educational v1 runtime assets do exist locally; no remote asset registry write or public Storage upload was performed. The initial R2 baseline below is historical where superseded by dated continuation/addendum sections. See the [Dundee final evaluation](.research/dundee-permanent-teeth/reports/dundee-r2-final-evaluation.md).

**Status: not approved for global/public production.** R2's private educational anatomy work is documented in later continuation and addendum sections; these assets are not clinically validated, expert reviewed, or patient-provenance cleared.

No anatomy source passed all production acceptance gates, including patient/source provenance, source units, expert review, and complete supported FDI coverage. The controlled private v1 pipeline locally normalizes selected training meshes and exposes them through package-backed Practice/Free Lab cases. They are not globally/publicly approved. The remote Supabase baseline remains unchanged.

## R2 scope reviewed

R2 is limited to reusable anatomy assets and their safe ingestion/registry path: permanent teeth keyed by FDI, a separate denture-tooth set, prepared-tooth forms, and foundational arch/gingiva geometry. This handoff does not introduce a workflow-specific case, replace synthetic workflow factories, migrate Free Lab, or begin R3.

The existing R1 Case Package contract and registry already support stable asset references, SOURCE/DESIGN/GUIDE/REFERENCE roles, FDI/arch metadata, provenance and license fields, units, segmentation, expert-review status, and technical metadata. The generic loader stages assets before atomically replacing the active workspace and disposes staged/previous resources on failure/reload. The existing Crown proof remains a synthetic architecture proof.

The R1 asset resolver requires a registered `ready` model and known source units before loading. Its query reads `model_assets.original_to_canonical`, but the resolver does not apply that transform; the importer performs declared unit conversion and preserves the source axes. R2 ingestion therefore cannot mark an arbitrary source mesh ready on the assumption that this database transform will be applied at runtime. An accepted runtime mesh must already be in the documented canonical frame, or the resolver must be deliberately extended and tested before such assets are registered.

The current schema needs no R2 migration: `model_assets.technical_metadata` can carry anatomy metadata, `asset_licenses` records permission/provenance, and the existing publication procedures reject missing commercial-use permission or provenance. Read-only inspection confirmed the specified Supabase project and zero rows for `assets`, `model_assets`, `asset_licenses`, `practice_lesson_assets`, `scenario_assets`, and objects in `practice-assets`. No remote writes were made.

## Candidate source decisions

| Source | Findings | Decision |
| --- | --- | --- |
| [BodyParts3D 4.0 official README and license](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/README_e.html) | Current official license is CC BY 4.0 with attribution; the official coordinate diagram verifies millimeters. The official tables resolve 28 permanent non-third-molar meshes, matching the expected R2 set; 18, 28, 38, and 48 are absent. Detailed mesh QA found coarse occlusal morphology, open boundaries, disconnected components, unresolved human/patient provenance, and a source/runtime axis mismatch. | **Not accepted.** Legal reuse and units are supported, but provenance, safe coordinate normalization, mesh integrity, and dental training morphology still block intake. |
| [Synthetic lower-jaw Mendeley dataset](https://data.mendeley.com/datasets/xjsx7nfhj8/1) | CC BY 4.0 and individual lower-tooth meshes are documented, but the dataset’s reproduction notes say its geometry was obtained from a patient's DICOM. The dataset description does not establish de-identification or permitted patient-data reuse for this application. Its coverage is also limited to a lower jaw. | **Not accepted.** Patient-data handling is unverified. |
| [Teeth3DS+](https://crns-smartvision.github.io/teeth3ds/) | Contains patient-derived intraoral scans. An explicit commercial-use and modification grant could not be verified from the source material reviewed. | **Not accepted.** Reuse rights are unverified. |
| [University of Dundee permanent dentition model](https://sketchfab.com/3d-models/permanent-dentition-2f69d7b59c3e4a6a8bcae041bd8e591b) | The listing identifies CC BY and says the model was created in ZBrush from CT data. The listing does not establish de-identification/patient-data status or source units. | **Not accepted.** Privacy and scale evidence are incomplete. |

At the initial R2 handoff, the repository contained no bundled GLB, glTF, OBJ, STL, PLY, or STEP anatomy source for inspection. The current continuation downloaded and examined the official BodyParts3D 4.0 archive under the ignored research directory described below. No candidate mesh was added to production assets or loaded through a user-facing Practice/Free Lab workflow.

## Required evidence to resume asset acceptance

For each source collection, the intake record must identify the original author/publisher and exact version/file, explicit commercial-use and derivative-work permission, required attribution, whether the geometry is patient-derived and documented de-identification/consent terms where applicable, declared source units, coordinate axes/handedness, and an immutable source hash. Mesh QA must record finite coordinates, bounds after conversion to mm, normals/topology, component and triangle counts, and visual review against dental references. Expert review stays `pending` until a qualified reviewer completes it.

The permanent library must resolve each supported FDI position to its own accepted anatomy asset; missing third molars must remain unavailable rather than receiving mirrored or scaled substitutes. Denture teeth, prepared teeth, and arch/gingiva assets must remain separately classified and sourced. Runtime meshes need a documented pivot and canonical frame before registry readiness.

After acceptable source files and evidence are available, the remaining R2 work is to ingest master/runtime pairs, add the typed reusable anatomy lookup and strict readiness gate, load an anatomy Case Package through the existing loader, and run the requested unit/type/lint/build/e2e/browser QA. Do not claim R2 complete until the real assets pass visual anatomy QA and the case-package load/cleanup/performance checks.

## Validation record

- The baseline validation bullets here are from the earlier R2 handoff, before the continuation transform changes.
- Spec, audit, and R1 handoff were read and preserved unchanged.
- Next.js local App Router guidance for project structure, Server/Client Components, and Route Handlers was reviewed before considering a browser route. No preview route was added because there is no accepted anatomy to render.
- Supabase was queried read-only; all six baseline counts listed above were zero.
- Baseline validation passed: `npm run lint`, `npm run typecheck`, `npm test` (24 files / 180 tests), `npm run build`, and `npm run test:e2e` (14 tests). The Playwright Three.js smoke route passed; this does not count as anatomy visual QA.
- No source asset passed intake. This continuation performed local candidate archive extraction, programmatic mesh QA, and visual review only; it performed no production conversion, upload, registry write, or user-facing anatomy runtime/browser validation.
- R2 remains blocked pending suitable, documented source geometry and resolution of the candidate-specific blockers. See the continuation record below for subsequent technical implementation and candidate research.

## Continuation record — technical pipeline and candidate research

This record separates **implemented technical R2 work** from **unapproved external asset research**. It does not accept BodyParts3D, create production asset IDs, set expert review, or start R3.

### 1. Canonical Asset Transform Pipeline

**Implemented technical R2 work.** The previous runtime path selected original_to_canonical and exposed it in the asset row type, but the resolver did not parse or return the matrix as a usable runtime transform. It called the importer with only the declared source unit. The Case Package loader staged the parsed object without applying the stored matrix. The importer's unit-only normalization therefore did not implement an arbitrary source orientation, translation, or scale from original_to_canonical.

The existing architecture now carries the matrix from the asset registry to the resolved Case Package asset and applies it in the existing Case Package loader, before the package's initial object transform:

1. **Original/source asset space:** source mesh coordinates remain intact in the imported source object. The raw/master file is not rewritten.
2. **Normalization:** original_to_canonical is the complete source-space to Prostheia canonical-space affine transform. Unit conversion is part of this matrix when source units differ; it is not also applied as an independent importer scale. For a known unit without an explicit matrix, the helper derives mm/cm/m conversion. Unknown units fail closed.
3. **Canonical asset geometry space:** the transform is applied once to a nested runtime geometry group. Canonical runtime bounds and geometry statistics are measured after normalization. Already canonical assets use identity.
4. **Case/object space:** a Case Package object's initial transform remains separate and is applied after canonicalization.
5. **User space:** subsequent user transforms remain separate workspace/object transforms.

The operation is guarded against repeat normalization of the same resolved runtime object. A cached object already active is cloned before a new staging pass. Save/reload persists the source asset reference and package/object transforms, not an already-normalized mesh to which the source transform could be applied again; loading from source applies normalization once for that runtime instance.

The pipeline validates matrix shape, finite elements, affine bottom row, invertibility, non-collapsed axes, and determinant. Reflections are explicitly rejected because the current asset contract does not define winding/normal correction for them. Normals are transformed with the geometry and recomputed where needed. Invalid normalization aborts staging; temporary geometry is disposed and the active workspace remains in place. The existing Case Package staging and geometry-registry/BVH path is retained.

Focused coverage in tests/unit/case-package.test.ts checks identity, a translated/oriented cm-to-mm transform, unchanged source geometry, canonical bounds/statistics, case-transform separation and composition order, repeated loading, malformed/non-finite/singular/reflection matrices, failed-load cleanup, and parsing a stored matrix without double-applying unit scale. The focused suite passed 11 tests; the same test file exercises existing Case Package integration. Typecheck passed after implementation. Full lint, unit, build, and Playwright results are recorded below.

### 2. BodyParts3D Candidate Evaluation

**Unapproved external asset research.** The official 4.0 99%-reduced archive was downloaded and verified in the ignored research-only directory .research/bodyparts3d-4.0/. No production conversion or remote write was performed.

### 3. Official Source & License Evidence

- Database: BodyParts3D, maintained by the Database Center for Life Science (DBCLS), Research Organization of Information and Systems.
- Version/archive: BodyParts3D 4.0 IS-A tree, 99%-polygon-reduced OBJ archive. The official current download page names isa_BP3D_4.0_obj_99.zip and describes it as 136 MB.
- Official archive URL: https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_BP3D_4.0_obj_99.zip
- License: Creative Commons Attribution 4.0 International (CC BY 4.0), verified from the official license page. Redistribution, adaptations, and commercial use are permitted subject to attribution and no additional restrictions.
- Required attribution: **“BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International”**
- Downloaded 2026-10-01; exact archive size 142,903,898 bytes; SHA-256 40665852c49f218326590e204db91064a1ecfc3c6f8cbd7bbbcaac62c7cd409e. The ZIP contains 2,234 entries and passed CRC validation.
- Official files used: [license](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/lic.html), [download page](https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html), [current README](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/README_e.html), [IS-A parts list](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_parts_list_e.txt), [IS-A element/component table](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/LATEST/isa_element_parts.txt), and [official Release 4.0 coordinate diagram](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20130619/coordinate_system.png).

### 4. Candidate FDI Mapping

The reproducible crosswalk joins the official FMA concept and English anatomical name to its BodyParts3D representation, then joins that concept/name to the element/component table's OBJ file ID and verifies that the exact OBJ exists in the official archive. Side, arch, tooth class, and rank in the official anatomical name establish each proposed FDI position. The result is exactly 28 permanent non-third-molar tooth meshes: 11–17, 21–27, 31–37, and 41–47. The official current tables do not identify side-specific secondary third molars 18, 28, 38, or 48. No tooth is mirrored or synthesized.

| FDI | Official anatomical name | FMA concept | Representation | OBJ file |
| ---: | --- | --- | --- | --- |
| 11 | right upper central secondary incisor tooth | FMA55681 | BP7683 | FJ1279.obj |
| 12 | right upper lateral secondary incisor tooth | FMA55680 | BP7747 | FJ1280.obj |
| 13 | right upper secondary canine tooth | FMA55798 | BP7684 | FJ1281.obj |
| 14 | right upper first secondary premolar tooth | FMA55689 | BP7681 | FJ1277.obj |
| 15 | right upper second secondary premolar tooth | FMA55688 | BP7682 | FJ1278.obj |
| 16 | right upper first secondary molar tooth | FMA55698 | BP7680 | FJ1276.obj |
| 17 | right upper second secondary molar tooth | FMA55697 | BP5452 | FJ1275.obj |
| 21 | left upper central secondary incisor tooth | FMA55682 | BP5440 | FJ1265.obj |
| 22 | left upper lateral secondary incisor tooth | FMA55683 | BP5438 | FJ1266.obj |
| 23 | left upper secondary canine tooth | FMA55799 | BP5482 | FJ1267.obj |
| 24 | left upper first secondary premolar tooth | FMA55690 | BP5468 | FJ1262.obj |
| 25 | left upper second secondary premolar tooth | FMA55691 | BP5466 | FJ1264.obj |
| 26 | left upper first secondary molar tooth | FMA55699 | BP5455 | FJ1261.obj |
| 27 | left upper second secondary molar tooth | FMA55700 | BP5453 | FJ1263.obj |
| 31 | left lower central secondary incisor tooth | FMA57143 | BP5447 | FJ1258.obj |
| 32 | left lower lateral secondary incisor tooth | FMA57141 | BP5444 | FJ1259.obj |
| 33 | left lower secondary canine tooth | FMA55687 | BP5480 | FJ1260.obj |
| 34 | left lower first secondary premolar tooth | FMA55693 | BP5472 | FJ1255.obj |
| 35 | left lower second secondary premolar tooth | FMA55692 | BP5475 | FJ1257.obj |
| 36 | left lower first secondary molar tooth | FMA55704 | BP5462 | FJ1254.obj |
| 37 | left lower second secondary molar tooth | FMA55703 | BP5459 | FJ1256.obj |
| 41 | right lower central secondary incisor tooth | FMA57142 | BP5446 | FJ1272.obj |
| 42 | right lower lateral secondary incisor tooth | FMA57140 | BP5443 | FJ1273.obj |
| 43 | right lower secondary canine tooth | FMA55686 | BP5479 | FJ1274.obj |
| 44 | right lower first secondary premolar tooth | FMA55694 | BP5471 | FJ1269.obj |
| 45 | right lower second secondary premolar tooth | FMA55695 | BP5474 | FJ1271.obj |
| 46 | right lower first secondary molar tooth | FMA55705 | BP5461 | FJ1268.obj |
| 47 | right lower second secondary molar tooth | FMA55706 | BP5458 | FJ1270.obj |

### 5. Units Investigation

**VERIFIED: millimeters.** The official Release 4.0 coordinate-system diagram explicitly labels unit length as mm. This is direct documentation, not a judgment from plausible-looking dimensions. The current README and release notes were also checked; the diagram provides the affirmative unit evidence. Mesh bounds below are consequently reported in mm. This resolves the earlier unit blocker.

### 6. Coordinate-System Investigation

The official diagram documents the body centerline approximately on Z; anatomical left is +X and right is −X; posterior is +Y and anterior is −Y; all part Z values are positive and superior parts have larger Z. It does not explicitly name handedness and does not identify a reproducible anatomical landmark for the global origin.

The project's articulator semantics describe +X as left and use positive Y for anterior protrusion. Therefore the source's +Y posterior conflicts with the current runtime convention. Keeping X and Z as documented while flipping only Y has negative determinant, i.e. a reflection; the new runtime transform validator rejects it. A safe production transform cannot be recorded until the canonical axis convention/handedness and origin/pivot are reconciled with a proper documented transform. No guessed candidate matrix was stored.

### 7. Human/Patient-Data Provenance

The current official README describes BodyParts3D as a dictionary-type anatomy database containing segmented parts of a 3D whole-body model of an adult human male. The reviewed official README/release notes do not establish whether these dental meshes came from source imaging, manual or synthetic reconstruction, a patient, or another model source. They do not state identifiable-patient status, consent basis, or de-identification. Accordingly, patient/imaging source and de-identification are **UNKNOWN** and remain an R2 blocker. No claim that the meshes are synthetic or de-identified is made.

### 8. Polygon / Mesh Statistics

Measurements come from deterministic parsing of all 28 extracted OBJ files. Dimensions are X × Y × Z in mm using the official unit declaration. These files contain triangle faces.

| FDI | Concept | Rep | OBJ | Vertices | Triangles | Bounds X × Y × Z (mm) | Components | Open edges | File bytes |
| ---: | --- | --- | --- | ---: | ---: | --- | ---: | ---: | ---: |
| 11 | FMA55681 | BP7683 | FJ1279.obj | 647 | 1,288 | 8.87 × 12.87 × 26.39 | 1 | 4 | 76,355 |
| 12 | FMA55680 | BP7747 | FJ1280.obj | 686 | 1,368 | 9.57 × 11.32 × 28.92 | 1 | 0 | 81,012 |
| 13 | FMA55798 | BP7684 | FJ1281.obj | 698 | 1,392 | 9.26 × 9.32 × 31.38 | 1 | 0 | 82,485 |
| 14 | FMA55689 | BP7681 | FJ1277.obj | 816 | 1,610 | 9.51 × 8.04 × 28.44 | 1 | 22 | 95,890 |
| 15 | FMA55688 | BP7682 | FJ1278.obj | 748 | 1,466 | 9.29 × 7.58 × 25.95 | 1 | 32 | 87,622 |
| 16 | FMA55698 | BP7680 | FJ1276.obj | 1,099 | 2,156 | 11.56 × 11.50 × 24.55 | 1 | 52 | 130,145 |
| 17 | FMA55697 | BP5452 | FJ1275.obj | 961 | 1,850 | 11.91 × 9.80 × 22.67 | 8 | 70 | 111,671 |
| 21 | FMA55682 | BP5440 | FJ1265.obj | 646 | 1,288 | 8.85 × 12.88 × 26.43 | 1 | 0 | 75,752 |
| 22 | FMA55683 | BP5438 | FJ1266.obj | 691 | 1,378 | 9.61 × 11.67 × 28.93 | 1 | 0 | 80,970 |
| 23 | FMA55799 | BP5482 | FJ1267.obj | 698 | 1,392 | 9.25 × 9.31 × 31.38 | 1 | 0 | 81,747 |
| 24 | FMA55690 | BP5468 | FJ1262.obj | 818 | 1,610 | 9.47 × 8.02 × 28.45 | 1 | 32 | 95,273 |
| 25 | FMA55691 | BP5466 | FJ1264.obj | 748 | 1,466 | 9.30 × 7.58 × 25.94 | 1 | 32 | 86,905 |
| 26 | FMA55699 | BP5455 | FJ1261.obj | 1,084 | 2,156 | 11.57 × 11.54 × 24.57 | 1 | 14 | 128,003 |
| 27 | FMA55700 | BP5453 | FJ1263.obj | 949 | 1,848 | 11.85 × 9.86 × 22.66 | 5 | 48 | 110,058 |
| 31 | FMA57143 | BP5447 | FJ1258.obj | 461 | 918 | 5.88 × 18.22 × 25.47 | 1 | 0 | 53,967 |
| 32 | FMA57141 | BP5444 | FJ1259.obj | 483 | 960 | 7.86 × 16.83 × 25.14 | 1 | 4 | 56,256 |
| 33 | FMA55687 | BP5480 | FJ1260.obj | 592 | 1,180 | 8.62 × 15.60 × 26.83 | 1 | 0 | 69,212 |
| 34 | FMA55693 | BP5472 | FJ1255.obj | 592 | 1,176 | 7.91 × 14.12 × 22.49 | 1 | 6 | 69,150 |
| 35 | FMA55692 | BP5475 | FJ1257.obj | 566 | 1,122 | 8.12 × 13.30 × 23.38 | 1 | 10 | 65,949 |
| 36 | FMA55704 | BP5462 | FJ1254.obj | 885 | 1,762 | 12.33 × 15.11 × 19.70 | 1 | 8 | 103,775 |
| 37 | FMA55703 | BP5459 | FJ1256.obj | 823 | 1,616 | 12.10 × 16.50 × 18.70 | 1 | 42 | 95,723 |
| 41 | FMA57142 | BP5446 | FJ1272.obj | 463 | 920 | 5.87 × 18.24 × 25.46 | 1 | 4 | 54,356 |
| 42 | FMA57140 | BP5443 | FJ1273.obj | 486 | 958 | 7.85 × 16.86 × 25.14 | 1 | 16 | 56,841 |
| 43 | FMA55686 | BP5479 | FJ1274.obj | 591 | 1,178 | 8.62 × 15.60 × 26.83 | 1 | 0 | 69,629 |
| 44 | FMA55694 | BP5471 | FJ1269.obj | 592 | 1,180 | 7.95 × 14.15 × 22.52 | 1 | 0 | 69,791 |
| 45 | FMA55695 | BP5474 | FJ1271.obj | 567 | 1,124 | 8.11 × 13.33 × 23.36 | 1 | 10 | 66,636 |
| 46 | FMA55705 | BP5461 | FJ1268.obj | 889 | 1,762 | 12.32 × 15.11 × 19.72 | 1 | 20 | 104,807 |
| 47 | FMA55706 | BP5458 | FJ1270.obj | 818 | 1,620 | 12.07 × 16.52 × 18.68 | 1 | 22 | 96,262 |

Totals: **20,097 vertices, 39,744 triangles, 2,356,242 OBJ bytes**. All 28 have finite coordinates and vertex normals. Non-manifold edges: 0. Open boundary edges: 448 across 19 meshes. Degenerate triangles: 2. FDI 17 and 27 have 8 and 5 connected components respectively; every other candidate has one component.

### 9. Visual Morphology QA

All 28 candidate OBJ meshes were rendered in four orthographic views (anterior, posterior, superior, inferior); enlarged occlusal views were rendered for all eight molars. Reproducible render scripts and PNGs are retained under .research/bodyparts3d-4.0/: render_contact_sheets_png.py, render_molar_occlusal_detail.py, visual-qa-anterior.png, visual-qa-posterior.png, visual-qa-superior.png, visual-qa-inferior.png, and visual-qa-molar-occlusal-detail.png. Visual review used the source meshes without smoothing, subdivision, remeshing, AI generation, or anatomy edits.

Anterior teeth retain recognizable incisal silhouettes, and broad labial/lingual and cervical surfaces are present, but fine cervical and mesial/distal distinctions are not dependable for sculpting exercises. Canine crowns and cusp silhouettes are recognizable. Premolars are identifiable, but central developmental anatomy is weak. Premolars and molars are identifiable by broad form; upper and lower groups can be separated by their gross forms, but this does not establish training-level occlusal anatomy. Enlarged molar occlusal views show coarse flat-shaded facets, shallow or indistinct grooves/fissures, weak cusp definition, no reliable marginal-ridge detail, and limited dependable first/second molar differentiation. These are useful reference meshes but lack the surface detail required for training restorative dental CAD. **The current 99%-reduced archive is not acceptable as the primary dental CAD training anatomy source.**

Every mesh contains a full tooth with root, not a crown-only segmentation. A future crown workflow needs a separately reviewed crown-library derivation pipeline or a suitable crown-specific source. Roots were not cut from these evaluation meshes.

### 10. BodyParts3D Acceptance Matrix

| Dimension | Status | Evidence / remaining issue |
| --- | --- | --- |
| License | **PASS** | Official CC BY 4.0 permits commercial redistribution/adaptation with attribution and no added restrictions. |
| Provenance | **PASS** | Official archive, version, tables, file mapping, download size/date, and SHA-256 are recorded. |
| Patient-data status | **UNKNOWN** | Source imaging/patient status and de-identification are not stated for these dental meshes. Blocks acceptance. |
| Physical units | **PASS** | Official Release 4.0 coordinate diagram explicitly states mm. |
| Coordinates | **BLOCKED** | +Y conflicts with Prostheia anterior-positive convention; flipping only Y is a reflection rejected by the pipeline. Handedness and reproducible origin landmark are unstated. |
| FDI coverage | **PASS** | Exactly 28 expected positions 11–17, 21–27, 31–37, 41–47; third molars 18, 28, 38, 48 are absent. |
| Mesh quality | **FAIL** | 19/28 have open edges (448 total), FDI 17/27 have disconnected components, and two degenerate triangles were detected. |
| Dental morphology | **FAIL** | Insufficient reliable occlusal fissure, groove, cusp, marginal-ridge, and first/second molar detail for dental CAD training. |
| Browser performance | **PASS** | 39,744 triangles and 2,356,242 OBJ bytes total are practical for local render-scale inspection. This is not production/browser acceptance. |

**Overall conclusion: C. LEGALLY USABLE BUT ANATOMICALLY INSUFFICIENT.** License and units are verified, and coverage matches the expected 28. This does not overcome morphology failure, mesh defects, unresolved human/patient provenance, or coordinate-frame blocker. No asset is approved by this conclusion.

### 11. Historical Higher-Detail Release Findings

Official [BodyParts3D 3.0 archive index](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/) and [release-specific README](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/README_e.html) were checked as a secondary research lead. The index lists 95%- and 99%-polygon-reduced OBJ archives; the 3.0 README says the 95% archive has about five times as many triangles as the 99% archive. Its release-specific README states **CC BY-SA 2.1 Japan** with required attribution **“BodyParts3D, Copyright© The Database Center for Life Science licensed by CC Attribution-Share Alike 2.1 Japan”**. This permits commercial use subject to attribution and share-alike obligations, which could require derivative assets and redistribution to remain under compatible terms; that is a conflict for a closed proprietary asset library.

The 3.0 official [parts list](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/parts_list_e.txt) and [composite/component table](https://dbarchive.biosciencedbc.jp/data/bodyparts3d/20110915/composite_parts.txt) contain the same 28 side-specific non-third-molar permanent teeth. The 95% archive was not downloaded or visually assessed, so no morphology-quality claim is made. The current CC BY 4.0 page does not establish retroactive licensing for 3.0; its release-specific terms remain separate. Do not substitute or accept this historical candidate without separate license review and asset evaluation.

### 12. Resume Recommendation

The transform integration blocker is implemented and focused tests pass. BodyParts3D 4.0 is not ready for R2 acceptance. Remaining gates: obtain authoritative source/patient/de-identification evidence; resolve source axes, handedness, and origin against the Prostheia canonical frame without an undocumented reflection; find a source with training-grade dental morphology; and address open/disconnected mesh defects through a provenance-preserving reviewed source or derived-data process. Keep the candidate manifest, archive checksum, scripts, extracted research files, and visual QA artifacts in the ignored research area for review. Do not upload, register, mark ready/expert-reviewed, migrate Practice/Free Lab, or begin R3.

### Continuation Verification

- Archive hash and extraction/mapping were rerun from the retained official ZIP. The evaluator again found 28 teeth, no third molars at 18/28/38/48, and the same 20,097 vertices / 39,744 triangles. The archive checksum matched the recorded SHA-256 and ZIP integrity check passed.
- Visual QA scripts and all five PNG artifacts are present in the ignored research directory; all 28 meshes and all eight molars were visually inspected.
- Read-only Supabase verification returned **0 matching BodyParts3D rows** across assets/model_assets/asset_licenses, **0 matching BodyParts3D storage objects**, and **0 rows/objects matching the extracted FJ tooth filenames**. No remote writes were made.
- Continuation code validation: typecheck passed; lint passed; focused Case Package suite passed (11/11); full unit suite passed (24 files / 184 tests); production build passed; Playwright passed (14/14).
- The pre-existing test-results/.last-run.json was restored byte-for-byte after Playwright.

## University of Dundee Permanent Teeth Candidate Evaluation

**Status: CANDIDATE / NOT APPROVED. Overall conclusion: B. POTENTIALLY SUITABLE, BUT EVIDENCE REQUIRED.** This section evaluates the official University of Dundee, School of Dentistry Sketchfab account and its Permanent Teeth collection as an R2 research candidate. No Dundee source was downloaded, normalized, ingested, registered, uploaded, or bound to production content.

### 1. Sources, access, and inventory

- Primary account: [University of Dundee, School of Dentistry (@DundeeDental)](https://sketchfab.com/DundeeDental).
- Primary set: [Permanent Teeth collection](https://sketchfab.com/DundeeDental/collections/permanent-teeth-4c0d0548c40c463c8cdceb6e0d08df7f). The latest accessible indexed snapshot (crawled about two months before 2026-10-01) lists **17 models**, in the order below. Direct page access returned HTTP 403 during this review, so the current live collection state could not be independently reloaded.
- Secondary cross-check: [Dundee Tooth Morphology collection](https://sketchfab.com/DundeeDental/collections/dundee-tooth-morphology-574c456663334fe89c78503a975dc946). Its indexed page lists 36 models, including named tooth variants and endodontic/sectioned teaching forms. It supports collection-family naming and variant context; it was not treated as 36 canonical intact permanent teeth.
- Every primary collection entry displays a Download 3D Model affordance in the accessible page snapshot. This is page-level availability, not a completed or authorized file download in this environment. Sketchfab's official Download API documentation requires an authenticated Sketchfab account and an authorized API request. No signed-in browser session was available, so no authentication or access-control workaround was attempted. See [Sketchfab downloading models](https://sketchfab.com/developers/download-api/downloading-models) and [Download API guidelines](https://sketchfab.com/developers/download-api/guidelines).
- **Downloads: 0/17.** Filename, export format, byte size, SHA-256, download timestamp, and downloadable scene contents are therefore unavailable for every model. The API documentation describes glTF archive and USDZ outputs when available; it also says original FBX/OBJ source formats are not currently provided by the API. That does not establish which exports are actually exposed for these 17 entries.

The page titles, model IDs, source URLs, indexed creator, displayed license, published date, and rounded page polygon counts are recorded model-by-model below and in the ignored [candidate manifest](.research/dundee-permanent-teeth/candidate-manifest.json). Triangle and vertex figures below are Sketchfab page display values, rounded in thousands; they are not measurements from downloaded files.

| # | Exact model title and official page | UID | Arch / tooth class / original-side evidence | Published | Page triangles / vertices | Accessible description or metadata note | Exact indexed license label |
|---:|---|---|---|---|---:|---|---|
| 1 | [Maxillary First Molar with Cusp of Carabelli](https://sketchfab.com/3d-models/maxillary-first-molar-with-cusp-of-carabelli-9117c7a9bf0848f29bc4e85931697e7b) | 9117c7a9bf0848f29bc4e85931697e7b | Maxillary first molar, Left stated | 2016-10-05 | 49.9k / 49.8k | Page description identifies the left tooth and says uploaded with ZBrush. | CC Attribution Creative Commons Attribution |
| 2 | [Maxillary First Premolar](https://sketchfab.com/3d-models/maxillary-first-premolar-f9b48a29d34f4923b683433f030c5c70) | f9b48a29d34f4923b683433f030c5c70 | Maxillary first premolar, Left stated in model information | 2016-09-20 | 26.5k / 26.5k | Created by the Dundee dental school; ZBrush is named. | CC Attribution Creative Commons Attribution |
| 3 | [Maxillary Third Molar](https://sketchfab.com/3d-models/maxillary-third-molar-1b3c50ded70c4b6297d4526a733a9cf1) | 1b3c50ded70c4b6297d4526a733a9cf1 | Maxillary third molar, Left stated | 2016-05-16 | 25.4k / 25.4k | Page says created in ZBrush using CT data. | CC Attribution Creative Commons Attribution |
| 4 | [Maxillary Second Molar](https://sketchfab.com/3d-models/maxillary-second-molar-e035713849d1438791306e25235ac452) | e035713849d1438791306e25235ac452 | Maxillary second molar, Left stated | 2016-05-16 | 28.2k / 28.2k | Page says created in ZBrush. | CC Attribution Creative Commons Attribution |
| 5 | [Maxillary First Molar](https://sketchfab.com/3d-models/maxillary-first-molar-e719a474ef7e4bd7abec508f85f1e984) | e719a474ef7e4bd7abec508f85f1e984 | Maxillary first molar, Left stated | 2015-10-06 | 28.5k / 28.5k | Page says created in ZBrush using CT data. | CC Attribution Creative Commons Attribution |
| 6 | [Maxillary Second Premolar](https://sketchfab.com/3d-models/maxillary-second-premolar-69f3142830064588b000b04bea0ee09f) | 69f3142830064588b000b04bea0ee09f | Maxillary second premolar, Left stated | 2015-10-06 | 21.8k / 21.8k | Page says created in ZBrush. | CC Attribution Creative Commons Attribution |
| 7 | [Maxillary Canine](https://sketchfab.com/3d-models/maxillary-canine-bd930c9b9da14f2a9a8c9b130b0e08a2) | bd930c9b9da14f2a9a8c9b130b0e08a2 | Maxillary canine, side not stated in accessible model information | 2015-10-06 | 48k / 48k | Page describes a long root; the accessible snippet does not establish side. | CC Attribution Creative Commons Attribution |
| 8 | [Maxillary Lateral Incisor](https://sketchfab.com/3d-models/maxillary-lateral-incisor-5e89ddbfc6454e2e8e09c645574b8932) | 5e89ddbfc6454e2e8e09c645574b8932 | Maxillary lateral incisor, Left stated | 2015-10-06 | 25.1k / 25.1k | Page says created in ZBrush using CT data; notes the tooth may be peg-shaped or absent in some patients. | CC Attribution Creative Commons Attribution |
| 9 | [Maxillary Left Central Incisor](https://sketchfab.com/3d-models/maxillary-left-central-incisor-c8a7c2d9280d4c92bc651cfa1459866a) | c8a7c2d9280d4c92bc651cfa1459866a | Maxillary central incisor, Left stated in title | 2015-10-06 | 21.5k / 21.5k | Page says created in ZBrush. | CC Attribution Creative Commons Attribution |
| 10 | [Mandibular Third Molar](https://sketchfab.com/3d-models/mandibular-third-molar-561bb06b3b084b84978163906de1c2b5) | 561bb06b3b084b84978163906de1c2b5 | Mandibular third molar, Left stated | 2015-10-06 | 25.6k / 25.6k | Page says created in ZBrush from CT data. | CC Attribution Creative Commons Attribution |
| 11 | [Mandibular Second Molar](https://sketchfab.com/3d-models/mandibular-second-molar-b77dcbc5052e4740b87cdb1964649742) | b77dcbc5052e4740b87cdb1964649742 | Collection title identifies mandibular second molar; side unresolved | 2015-10-06 | 27.5k / 27.5k | Page's “More model information” instead describes “Maxillary Third Molar (Left)” and CT data. This title/description mismatch is repeated in indexed results; do not transfer that provenance or side claim to the titled model. | CC Attribution Creative Commons Attribution |
| 12 | [Mandibular First Molar](https://sketchfab.com/3d-models/mandibular-first-molar-e1c919d6603846eca873154eeededdd6) | e1c919d6603846eca873154eeededdd6 | Mandibular first molar, Left stated | 2015-10-06 | 27.6k / 27.6k | Page says created in ZBrush. | CC Attribution Creative Commons Attribution |
| 13 | [Mandibular Left Second Premolar](https://sketchfab.com/3d-models/mandibular-left-second-premolar-fe59fe04725446479bc1115bb12d0ad8) | fe59fe04725446479bc1115bb12d0ad8 | Mandibular second premolar, Left stated in title | 2015-10-06 | 24k / 24k | Page says created in ZBrush. | CC Attribution Creative Commons Attribution |
| 14 | [Mandibular First Premolar](https://sketchfab.com/3d-models/mandibular-first-premolar-935637a703dc49eb9eeec9b15a8a5c4c) | 935637a703dc49eb9eeec9b15a8a5c4c | Mandibular first premolar, model information states left | 2015-10-06 | 23.6k / 23.6k | Page description identifies a mandibular left first premolar and says created in ZBrush. | CC Attribution Creative Commons Attribution |
| 15 | [Mandibular Left Canine](https://sketchfab.com/3d-models/mandibular-left-canine-1082011ab5aa46bb96b2af6a02a4ec0c) | 1082011ab5aa46bb96b2af6a02a4ec0c | Mandibular canine, Left stated in title | 2015-10-06 | 27.5k / 27.5k | Page says created in ZBrush and notes it is smaller/narrower than the maxillary canine. | CC Attribution Creative Commons Attribution |
| 16 | [Mandibular Left Central Incisor](https://sketchfab.com/3d-models/mandibular-left-central-incisor-90dcbf474e5a4d97b8783b7eb2b9c4b7) | 90dcbf474e5a4d97b8783b7eb2b9c4b7 | Mandibular central incisor, Left stated in title | 2015-10-06 | 23.1k / 23.1k | Page says created in ZBrush; notes the central incisor is normally the smallest. | CC Attribution Creative Commons Attribution |
| 17 | [Mandibular Left Lateral Incisor](https://sketchfab.com/3d-models/mandibular-left-lateral-incisor-00fa4f74e10b4769830bf60469c65e27) | 00fa4f74e10b4769830bf60469c65e27 | Mandibular lateral incisor, Left stated in title | 2015-10-06 | 24.1k / 24.1k | Page says created in ZBrush; notes it is slightly larger than the central incisor. | CC Attribution Creative Commons Attribution |

The rounded figures sum to approximately **477.9k triangles and 477.8k vertices** across 17 page records. These are display-scale estimates only; they do not substitute for file measurements.

### 2. License and attribution

The indexed page for each of the 17 exact model UIDs displays the same literal label, **“CC Attribution Creative Commons Attribution.”** The individual pages could not be live-fetched in this environment, so this is the exact label captured from official indexed model-page results, not a fresh live-page screenshot.

Sketchfab's official [CC licensing announcement](https://sketchfab.com/blogs/community/sketchfab-launches-public-domain-dedication-for-3d-cultural-heritage/) states that its downloadable CC Attribution models use Attribution 4.0 terms and quotes the CC BY 4.0 permissions: commercial sharing and adaptations are allowed when license terms are followed. The [CC BY 4.0 deed](https://creativecommons.org/licenses/by/4.0/deed.en) confirms commercial reuse and adaptation and requires appropriate credit, a license link, and notice of changes. Sketchfab's [Download API guidelines](https://sketchfab.com/developers/download-api/guidelines) further require creator attribution and a link to the model, with Creative Commons attribution following the asset wherever used.

**Rights assessment from accessible evidence:** for all 17 indexed labels, commercial use, modification, derivative works (including a mirrored derivative), and redistribution appear permitted under CC BY 4.0, subject to attribution, license link, change notice, and no added restrictions. A suitable record for each eventual derivative should identify “University of Dundee, School of Dentistry (@DundeeDental),” the exact model title, its Sketchfab model URL, the CC BY 4.0 URL, and the changes (for example, “mirrored, winding corrected, normals recomputed”). No model has a materially different indexed license label. Because exact live model pages were blocked, refresh the live license label and its link before acceptance or download; license status in the acceptance matrix remains BLOCKED on that verification point.

### 3. Provenance and CT / patient status

All page records attribute the content to University of Dundee, School of Dentistry. The page-specific creation notes are not uniform: four pages unambiguously describe CT use (maxillary third molar, maxillary first molar, maxillary lateral incisor, and mandibular third molar); most other pages say ZBrush without establishing the source material; the mandibular second molar record has a description copied from a different maxillary third molar and must not be relied on for either source or side. These notes are model-specific and are captured in the manifest.

An official Dundee Discovery Portal thesis, [The need for and the use of three dimensional simulation in dental education](https://discovery.dundee.ac.uk/en/studentTheses/the-need-for-and-the-use-of-three-dimensional-simulation-in-denta/), provides relevant family-level context. Its [thesis PDF](https://discovery.dundee.ac.uk/files/19280920/Paulina_Poblete_Dissertation.pdf) says a medical artist developed 3D models for all permanent teeth, used ZBrush and Maya, and initially obtained models from surface scans of “anatomically perfect teeth.” This does not cross-reference the 17 Sketchfab UIDs, and the CT statements on some Sketchfab pages prevent assigning that one methodology to every candidate. The University evidence supports an educational modeling context but does not establish a per-UID source chain, scan/CT source, permissions for source imaging, or the relationship between the thesis models and the specific downloadable objects.

**Patient / CT status: UNKNOWN for all 17; acceptance blocker.** For the four clearly CT-described candidates, no authoritative source found here identifies whether the data was patient imaging, how it was obtained, whether public redistribution of the resulting mesh was authorized, any consent or ethics basis, de-identification, or whether identifiable information persists in the mesh. For the remaining models, absence of a CT note does not establish a non-patient source. “Published by a university” and “created in ZBrush” do not answer these questions. No privacy or de-identification conclusion is inferred.

### 4. Units, coordinates, and FDI mapping

**Units: UNKNOWN. Coordinates: UNKNOWN.** No authorized local model files or accessible transform metadata were available. The indexed descriptions do not establish millimeters, source scaling, handedness, up axis, left/right orientation independent of the title/description, anterior/posterior or superior/inferior axes, or source pivot/origin. Plausible apparent tooth size is not proof of units. No `original_to_canonical` transform was derived or stored; the existing right-handed, millimeter canonical contract and the transform pipeline remain unchanged. No Dundee-specific loader was added.

The collection includes every one of the expected 16 anatomical classes (eight per arch including third molars), but reliable one-side mapping is incomplete. These 14 models have explicit left-side evidence and a proposed source FDI:

| Proposed source FDI | Model identity | Evidence and status |
|---:|---|---|
| 21 | Maxillary left central incisor | Left in exact title. |
| 22 | Maxillary left lateral incisor | Left in model information. |
| 24 | Maxillary left first premolar | Left in model information. |
| 25 | Maxillary left second premolar | Left in model information. |
| 26 | Maxillary left first molar | Left in model information; canonical class entry. |
| 27 | Maxillary left second molar | Left in model information. |
| 28 | Maxillary left third molar | Left in model information. |
| 31 | Mandibular left central incisor | Left in exact title. |
| 32 | Mandibular left lateral incisor | Left in exact title. |
| 33 | Mandibular left canine | Left in exact title. |
| 34 | Mandibular left first premolar | Left in model information. |
| 35 | Mandibular left second premolar | Left in exact title. |
| 36 | Mandibular left first molar | Left in model information. |
| 38 | Mandibular left third molar | Left in model information. |

Two canonical classes remain unmapped to a side: the maxillary canine page does not state left/right in accessible model metadata, and the mandibular second molar page has the title/description mismatch described above. No FDI number is assigned to either. The separate Carabelli model is an explicitly left maxillary first molar variant (FDI 26 variant), not another FDI position.

**Original source coverage:** 14 of 16 canonical tooth classes have supported left-side identities. The collection appears to contain the two other classes, but evidence is insufficient to assign a side to them. Therefore complete one-side original FDI coverage including third molars is not yet verified.

**Potential derived coverage:** if all 16 source-side identities are clarified and accepted, offline mirror derivatives could in principle provide all 32 positions: 11–18, 21–28, 31–38, 41–48. At present, only the 14 mapped left sources support corresponding right-side candidates: 21→11, 22→12, 24→14, 25→15, 26→16, 27→17, 28→18, 31→41, 32→42, 33→43, 34→44, 35→45, 36→46, 38→48. This is **not** 32-tooth coverage: the maxillary canine and mandibular second molar source sides are unresolved, and no mirrored derivative exists.

### 5. Mirroring, mesh quality, and morphology

**Legal feasibility:** the indexed CC Attribution labels map to CC BY 4.0 according to Sketchfab's official documentation, which allows adaptations and commercial redistribution with attribution and change notices. Refresh each exact live license record before relying on this for a derivative.

**Technical feasibility:** mirroring is a reflection and remains rejected by the runtime `original_to_canonical` pipeline. Do not relax that rule. If a later review approves mirroring, use a separate offline derivation: preserve the original master; create an independently recorded mirrored copy; correct triangle winding and recompute normals; run geometry and transform checks; record source UID, license, attribution, and every change; then produce an independently versioned runtime asset. No such derivation was created.

**Anatomical feasibility:** reflecting a generic teaching tooth may be useful for bilateral educational coverage, but it creates exact contralateral symmetry and can erase natural mesial/distal or individual asymmetry. A dental expert should review the result before it becomes a canonical library tooth. The Carabelli variant should remain an optional reference variant, not the default maxillary first molar, unless later expert review selects it.

**Mesh quality: UNKNOWN. Morphology: UNKNOWN. Browser performance: UNKNOWN.** No models were downloaded, so finite coordinates/normals, bounds, topology, connected components, open/non-manifold edges, degeneracies, winding, textures/materials, roots versus crowns, and actual mesh counts were not inspected. No reproducible contact sheet or view-by-view dental anatomy review was possible. Accordingly, none of the required incisor, canine, premolar, molar, occlusal, root, or restorative morphology checks has passed. The approximately 477.9k triangles displayed across 17 pages suggest substantially more displayed polygon density than the BodyParts3D 4.0 archive's 39,744 triangles across 28 files; polygon density alone does not establish better anatomy. No parse, BVH, memory, render responsiveness, or cleanup measurement was made, including for the highest-count model.

### 6. BodyParts3D comparison and root/crown strategy

| Dimension | Dundee Permanent Teeth candidate | BodyParts3D 4.0 result already documented above |
|---|---|---|
| License | All 17 indexed pages show CC Attribution; official Sketchfab documentation maps the label to CC BY 4.0 rights. Live per-page refresh remains blocked. | CC BY 4.0 verified directly from official release sources. |
| Provenance | University creator and educational-family context; no exact UID-to-source chain. | Official archive and part/file crosswalk verified; originating dental specimen method unknown. |
| Patient / CT | CT is named on four model pages; patient, consent, ethics, authorization, and de-identification remain unknown. | Imaging/patient source and de-identification remain unknown. |
| Units / coordinates | Unknown: no downloadable file or authoritative frame declaration retrieved. | Millimeters verified; axis/handedness/origin issue blocks safe normalization. |
| FDI coverage | 14 explicit left identities; 2 class sides unresolved; 16 classes appear in collection. | 28 verified side-specific teeth; third molars absent. |
| Published polygon density | About 477.9k displayed triangles over 17 entries, rounded UI values only. | 39,744 triangles over 28 extracted OBJ files, measured. |
| Mesh cleanliness | Unknown; no files. | Open boundaries, disconnected components, and degenerate triangles documented. |
| Dental morphology | Unknown; no downloaded 3D views/contact sheets. | Visually inspected; broad tooth forms are recognizable but occlusal detail is insufficient for restorative CAD training. |
| Browser performance | Unknown; no browser parse/render measurements. | 39,744 triangles / ~2.36 MB OBJ were practical for local inspection; no production performance acceptance. |
| Restorative CAD education | Potentially promising because the page counts and educational context warrant direct review; not demonstrated. | Rejected as primary CAD training anatomy because visual occlusal morphology is too coarse. |

The Dundee set has better *published polygon-density indicators* and includes page descriptions referencing CT or educational tooth modeling, but there is no evidence yet that its actual surface anatomy is suitable for crown sculpting, occlusal design, restorative proposals, or bridge units. Dundee remains a candidate for evidence gathering rather than a selected source.

All root/crown classifications are **UNKNOWN per model** because page text does not establish the mesh extent and files were unavailable. A long-root description on the maxillary canine is not sufficient to classify the whole set. If later inspection confirms full teeth, retain a faithful full-tooth source/reference master and create a separate, expert-reviewed crown-only derivation for crown workflows; do not cut roots from the original source or use a derived crown without recording its cut boundary and provenance.

### 7. Formats, materials, and master/runtime recommendation

Specific downloadable formats and file contents are UNKNOWN for these entries. The official Download API can provide glTF/GLB and USDZ exports where available, while its documentation says original FBX/OBJ files are not currently available through that API. No texture, material, light, camera, scene-node, or embedded-metadata inspection was possible. Preserve any downloaded source archive immutably; a future ingestion review should inventory the full scene and metadata before deciding which geometry/material data runtime needs.

If later evidence supports the source, keep three separately identified stages: (1) immutable original Sketchfab download plus UID, timestamp, license snapshot, checksum, and attribution; (2) normalized master geometry after authoritative unit/frame decisions, with transformation history; and (3) runtime-optimized GLB derived from that master with recorded build parameters. Only after independent acceptance should a future workflow create registry or Case Package records. This is a proposal only; no conversion, package proof, production write, or candidate binding was attempted because there is no local asset and units/frame remain unknown.

### 8. Acceptance matrix and remaining blockers

| Dimension | Status | Evidence / remaining blocker |
|---|---|---|
| License | **BLOCKED** | Every indexed page shows CC Attribution and official Sketchfab documentation supports CC BY 4.0 commercial/derivative rights, but live per-model label/link could not be refreshed due HTTP 403. |
| Provenance | **BLOCKED** | Dundee educational-family thesis exists, but there is no UID-to-thesis/source crosswalk; page creation notes are inconsistent and one is mismatched. |
| Patient / CT status | **UNKNOWN** | Patient, source-image authorization, consent/ethics, and de-identification are undocumented for the CT-described assets; absent CT note does not establish source status. |
| Units | **UNKNOWN** | No file or authoritative physical-scale statement inspected. |
| Coordinates | **UNKNOWN** | No source/export axes, handedness, orientation, or pivot established; transform not derived. |
| Original FDI coverage | **BLOCKED** | 14 of 16 classes map to a left FDI identity; maxillary canine and mandibular second molar side evidence is unresolved. |
| Derived FDI coverage | **BLOCKED** | No derivatives; two source sides unresolved, and anatomical review is still required. |
| Mesh quality | **UNKNOWN** | No source files to measure. |
| Dental morphology | **UNKNOWN** | No local visual QA of any of the 16 classes. |
| Browser performance | **UNKNOWN** | No actual downloaded model to parse or render. |
| Mirror-derivation feasibility | **BLOCKED** | License appears to permit adaptation, but live license refresh, offline geometry validation, and expert anatomical review remain outstanding; runtime reflection is intentionally rejected. |

**Overall conclusion: B. POTENTIALLY SUITABLE, BUT EVIDENCE REQUIRED.** This conclusion describes research potential only. Dundee is **not approved** for R2 Anatomy Library v1.

Exact blockers before an R2 acceptance decision:

1. Re-open all 17 official model pages and record live license name/link and any changed model metadata.
2. Obtain authenticated, authorized downloads; preserve each original archive and record file name, format, size, SHA-256, date, and license snapshot.
3. Obtain authoritative source-family and per-model provenance, especially for CT-derived pages; resolve patient imaging, use authorization, consent/ethics, de-identification, and mesh privacy.
4. Establish physical units and source/export coordinates, handedness, axes, side/orientation, and pivot well enough to derive a proper, justified transform through the existing pipeline.
5. Resolve the maxillary canine side and the mandibular second molar title/description mismatch.
6. Measure every downloaded mesh, inspect contents/materials, perform reproducible multi-view morphology QA, identify full-tooth versus crown extent, and review anatomy with a dental expert.
7. Measure browser parsing, geometry preparation, BVH, memory, responsiveness, and cleanup for an incisor, premolar, molar, and the highest-polygon model.
8. If bilateral derivatives are still desired, validate offline mirror winding/normals and get expert review without weakening runtime reflection rejection.

## R3.1 addendum — offline Dundee identity resolution

This addendum supersedes the earlier unresolved-identity and mirror-status statements above. It records local offline work completed on 2026-10-02; it does not change R2's public-production or expert-review decision.

The Maxillary Canine, UID bd930c9b9da14f2a9a8c9b130b0e08a2, resolves with HIGH confidence to the original left maxillary canine, FDI 23. Evidence was combined from the official [Dundee/Sketchfab model page](https://sketchfab.com/3d-models/maxillary-canine-bd930c9b9da14f2a9a8c9b130b0e08a2), the downloaded source filename UL3sketch1_1.OBJ and metadata, and the visible single-cusp canine crown with one long root.

The Mandibular Second Molar, UID b77dcbc5052e4740b87cdb1964649742, resolves with HIGH confidence to the original left mandibular second molar, FDI 37. Evidence was combined from the official [Dundee/Sketchfab model page](https://sketchfab.com/3d-models/mandibular-second-molar-b77dcbc5052e4740b87cdb1964649742), the downloaded source filename LL7sketch_1.OBJ and metadata, and its two-root lower molar morphology compared against verified mandibular first molar and maxillary third molar meshes. The page description conflicts with its model title and says “Maxillary Third Molar (Left)”; that conflict is preserved in the candidate manifest and provenance. This resolution does not transfer any CT or patient provenance.

Both identities are high-confidence model identity decisions only. They are not clinical validation, expert review, patient-provenance clearance, or public-production approval. Source units and source-image/patient provenance remain unknown.

Controlled OFFLINE contralateral mirrors were created for the two resolved sources only: FDI 23→13 and FDI 37→47. The original OBJs remain unmodified. Mirroring reflects across the sagittal plane, reverses triangle winding, recomputes runtime normals, and records the source UID, license, attribution and derivation. Both meshes passed closed-manifold edge counts, degeneracy, winding and positive signed-volume validation. They are exact-symmetry training derivatives, not natural contralateral specimens.

Coverage is reported at two levels:

- Dundee candidate identity mapping: 16 of 16 permanent-tooth classes have a proposed one-side identity after resolving FDI 23 and FDI 37. This says nothing about source permission, source units, expert acceptance, or structural passing.
- Current private runtime catalog: 13 original FDI positions are promoted: 21, 22, 23, 24, 25, 26, 27, 31, 32, 34, 35, 36 and 37. The two offline mirrors add positions 13 and 47, for 15 represented FDI positions total. This is not complete 32-position coverage; unresolved/blocked structural candidates remain excluded.

R3's private asset builder now records 30 runtime GLBs: 13 source conversions and 17 derivatives, totaling 32,317,456 bytes. The candidate manifest and runtime manifest preserve source title, UID, original URL, CC BY 4.0 attribution, source checksum, proposed FDI, original/derived state, source-unit status, normalization notes, morphology QA and review status. These records remain private training material only. No remote database write or public Storage upload was performed.

### 9. Historical remote-state and pre-R3.1 continuation verification

A read-only Supabase query matching Dundee, all 17 model UIDs, source metadata, and relevant storage names returned **0 candidate asset rows, 0 storage objects, 0 lesson bindings, and 0 scenario bindings**. No remote write was issued. No Dundee file was uploaded, no production asset row was created, and no lesson/scenario binding was created. No R3 code was started. Research metadata is kept in the ignored `.research/dundee-permanent-teeth/` directory. No application code changed and no tests were run for this research-only continuation.
