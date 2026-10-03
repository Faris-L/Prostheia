# Dental Realism Audit

**Phase:** R0 — audit only  
**Repository baseline:** 2026-10-01  
**Change scope:** this document only; no production code or database content changed.

## Audit scope and source note

The request names dental.md as the authoritative specification, but no file with that name exists in the repository. The active local document DENTAL-REALISM-SPEC.md contains the overhaul principles, workflow targets, and R0–R14 plan, so this audit uses it as the available target. The pre-existing worktree version of that file was left untouched.

Practice and Free Lab routes load content from Supabase at runtime. No Supabase MCP is available in this session, so live published rows and Storage objects could not be inspected. Counts and content below describe the published records defined by the repository’s current migrations, not a verified remote database snapshot. The live catalog may include admin edits or assets absent here.

Before auditing, git status showed extensive pre-existing staged, unstaged, and untracked work, including phase migrations and DENTAL-REALISM-SPEC.md. Those changes were preserved. No migration was created or applied, no remote data was read or written, and no build or tests were run for this documentation-only phase.

## 1. Executive Summary

- The repository defines **11 Practice modules, 59 published lesson rows, and 15 built-in Free Lab scenario rows**. One additional two-step developer lesson exists as a local constant but is not loaded by the Practice route. Remote published totals remain unknown.
- No bundled GLB, GLTF, STL, OBJ, or PLY dental model files were found in public, src, or tests. The nine production-facing geometry families identified below are generated in application code. One additional generic arch-to-STL helper exists but is not the source of the migration-seeded scenario cases.
- Every dental workflow currently uses internally generated synthetic geometry. The shapes are useful for exercising CAD controls and workflow panels, but they are not realistic dental case assets.
- Practice already has distinct case factories for crown, restorative workflows, dentures, partial dentures, splints, digital models, articulator, and implant. It does not have lesson-specific geometry checkpoints: lessons within a workflow reopen the same factory-built template.
- Free Lab has database-backed case briefs, category/difficulty filters, random selection, import, and blank-workspace entry. Scenario selection usually chooses a workflow initializer, not a unique asset package. Multiple scenarios therefore load the same procedural case shape.
- The shared CAD engine is reusable for later realistic workflows: geometry registry, mesh editing, history, analysis, import/export, persistence, and worker infrastructure are already present. The largest architecture gap is the missing case package and persisted lesson checkpoint binding between content and geometry.
- The largest content gap is the lack of legally documented, anatomically realistic source records, tooth assets, and per-case dental datasets. No currently bundled production dental mesh family meets the target asset standard.
- The source structure can support the target without replacing the CAD engine, but realistic workflows cannot be delivered by renaming the current synthetic shapes.

### Counts at this repository baseline

| Inventory | Repository-defined published baseline | Remote verification |
|---|---:|---|
| Practice modules | 11 | Unknown |
| Practice lessons | 59 | Unknown |
| Additional local-only developer lesson definitions | 1 | Not part of database catalog |
| Free Lab scenarios | 15 | Unknown |
| Production-facing generated geometry families | 9 | Source code verified |
| Bundled dental mesh asset files | 0 | No repository files found |

## 2. Current Practice Inventory

The Practice catalog page and lesson route call loadPracticeCatalog/loadPracticeLessonBySlug, which query practice_modules, practice_lessons, steps, hints, tools, validations, and linked assets. The current runtime list is Supabase-backed, not the PRACTICE_LESSONS constant.

Module difficulty is not stored on practice_modules. The ranges below are the minimum and maximum lesson difficulties in the repository seed rows. The module UUIDs are those in migration definitions; the stable lesson IDs shown below are their slugs, which Practice exposes as lesson IDs.

### 2.1 Module inventory

| Module ID | Module EN / SR | Difficulty range | Lessons | Classification | Opens |
|---|---|---|---:|---|---|
| b7150000-0000-4000-8000-000000000001 | CAD Foundations / Osnove CAD-a | Foundation | 13 | Tool Drill-like | shared-demo-workspace |
| b7160000-0000-4000-8000-000000000001 | Crown Workflow / Crown Workflow | Foundation–Intermediate | 7 | Dental Workflow | crown-case |
| b7170000-0000-4000-8000-000000000001 | Complete Denture / Totalna proteza | Beginner–Advanced | 8 | Dental Workflow | denture-case |
| b7180000-0000-4000-8000-000000000001 | Bridge Workflow / Postupak izrade mosta | Beginner–Intermediate | 4 | Dental Workflow | restorative-case, restorationType=bridge |
| b7180000-0000-4000-8000-000000000002 | Inlay and Onlay Workflow / Postupak izrade Inlay i Onlay nadoknada | Beginner–Intermediate | 4 | Dental Workflow | restorative-case, restorationType=inlay/onlay |
| b7180000-0000-4000-8000-000000000003 | Veneer Workflow / Postupak izrade fasete | Beginner–Intermediate | 2 | Dental Workflow | restorative-case, restorationType=veneer |
| b7190000-0000-4000-8000-000000000001 | Partial Denture / Parcijalna proteza | Beginner–Intermediate | 4 | Dental Workflow | partial-denture-case, Kennedy class |
| b7200000-0000-4000-8000-000000000001 | Bite Splint / Okluzalna udlaga | Beginner–Intermediate | 3 | Dental Workflow | bite-splint-case |
| b7200000-0000-4000-8000-000000000002 | Digital Model / Digitalni model | Beginner–Intermediate | 3 | Dental Workflow | digital-model-case |
| b7210000-0000-4000-8000-000000000001 | Virtual Articulator / Virtual Articulator | Beginner–Advanced | 4 | Dental Workflow | articulator-case |
| b7220000-0000-4000-8000-000000000001 | Implant Practice / Implantološka vežba | Advanced | 7 | Dental Workflow | implant-case |

### 2.2 Lesson inventory

Starting-state, object, tool, hint/reference, and validator behavior is shared by lessons within a module unless the lesson row says otherwise. Every repository-seeded step has bilingual title/instruction fields. Hints, reference modes, example configuration, enabled tool links, target object IDs, and validators are stored per step; migration source paths are identified after each module. The listed tools are module-level unions: individual step permissions are narrower and remain attached to their step rows.

#### CAD Foundations

Starting scene: the shared synthetic demo workspace with demo preparation, demo restoration, demo reference, and open-patch synthetic scan. Geometry is created by src/cad/scene/synthetic-dental-geometry.ts. The local lesson setup maps demo-prepared-tooth, demo-crown, and demo-reference, with the scan object used by scan-edit steps. Step tool union: select, camera, scene, move, rotate, scale, analysis, mesh_edit, sculpt. Hints and target/example references are step-specific; several camera/scene acknowledgements use required_step or required_object because those UI actions are not scored as geometry changes. Transform targets use arbitrary demo coordinates, including a 0.5 mm tolerance. Source: supabase/migrations/20260927170000_phase_15_cad_foundations.sql.

| Stable lesson ID | Title EN / SR | Difficulty | Ordered steps |
|---|---|---|---:|
| workspace_orientation | CAD Workspace Orientation / Snalaženje u CAD prostoru | Foundation | 1 |
| camera_navigation | Camera Navigation / Navigacija kamerom | Foundation | 1 |
| select_dental_objects | Select Dental Objects / Izbor dentalnih objekata | Foundation | 1 |
| scene_visibility | Scene and Visibility / Scena i vidljivost | Foundation | 2 |
| move_numeric_precision | Move and Numeric Positioning / Move i numeričko pozicioniranje | Foundation | 1 |
| rotate_and_snap | Rotate and Snap / Rotate i snapping | Foundation | 2 |
| safe_scale | Scale a Synthetic Reference / Skaliranje sintetičkog modela | Foundation | 2 |
| measurement_and_section | Measurement and Section View / Merenje i Section prikaz | Foundation | 2 |
| mesh_editing_basics | Basic Mesh Editing / Osnove uređivanja mesh-a | Foundation | 1 |
| sculpt_basics | Sculpt Basics / Osnove Sculpt alata | Foundation | 1 |
| scan_preparation_basics | Scan Preparation Basics / Osnove pripreme skena | Foundation | 3 |
| undo_redo_reset | Undo, Redo and Reset / Undo, Redo i Reset | Foundation | 2 |
| foundation_capstone | Foundation Practice Case / Završna vežba Osnova | Foundation | 2 |

Classification: all 13 are TOOL_DRILL. The deliberately simplified objects are acceptable for these tool fundamentals when kept clearly labeled as synthetic.

#### Crown Workflow

Starting scene: createCrownCase builds a synthetic preparation 26, adjacent tooth 25, antagonist 36, editable synthetic crown 26, and hidden read-only crown reference. All seven lessons call the same factory; no saved upstream margin or prepared design is restored for later lessons. Step tool union: select, move, rotate, sculpt, analysis, camera, scene, with margin/section/thickness workflow controls. Bilingual hints and reference/example modes are step-specific. Validators use curves, restorative state, transforms, and mesh analysis against fixed synthetic object IDs. Source: supabase/migrations/20260927180000_phase_16_crown_workflow.sql.

| Stable lesson ID | Title EN / SR | Difficulty | Ordered steps |
|---|---|---|---:|
| margin | Margin Line / Margin Line | Foundation | 1 |
| insertion_path | Insertion Path and Undercut Preview / Put insercije i prikaz podminiranja | Foundation | 1 |
| placement | Crown Placement / Pozicioniranje krunice | Beginner | 1 |
| contacts | Proximal and Antagonist Relationships / Proksimalni odnos i antagonist | Beginner | 2 |
| sculpt | Crown Morphology Sculpt / Oblikovanje morfologije krunice | Intermediate | 1 |
| thickness | Section and Thickness Inspection / Pregled preseka i debljine | Intermediate | 1 |
| full_crown_case | Full Crown Case / Kompletan slučaj krunice | Intermediate | 4 |

Classification: all are DENTAL_WORKFLOW and currently start at PLACEHOLDER. The factory has crown context, but the source anatomy and crown are synthetic.

#### Complete Denture

Starting scene: createDentureCase builds two synthetic edentulous arches, 32 generated artificial teeth with FDI IDs, two editable synthetic bases, editable midline and plane guides, and a hidden synthetic reference. The base and all teeth are present from the start for every lesson. Step tool union: select, move, rotate, camera, scene, sculpt, analysis, Denture Setup, Denture Border, and Denture Base. Step hints and reference/example configurations vary; validators cover denture setup state, boundary/base state, and static contact analysis. Source: supabase/migrations/20260927190000_phase_17_complete_denture.sql.

| Stable lesson ID | Title EN / SR | Difficulty | Ordered steps |
|---|---|---|---:|
| model_analysis | Model Analysis / Analiza modela | Beginner | 1 |
| tooth_selection | Tooth Selection / Izbor zuba | Beginner | 1 |
| anterior_setup | Anterior Setup / Postavka prednjih zuba | Beginner | 1 |
| posterior_setup | Posterior Setup / Postavka bočnih zuba | Beginner | 1 |
| chain_mode | Chain Mode / Chain Mode | Intermediate | 1 |
| occlusion | Static Contact and Occlusion Inspection / Pregled statičkih kontakata i okluzije | Intermediate | 1 |
| base | Denture Border and Base / Granica i baza proteze | Intermediate | 1 |
| full_denture_case | Full Denture Case / Kompletan slučaj totalne proteze | Advanced | 1 |

Classification: all are DENTAL_WORKFLOW and currently start at PLACEHOLDER. In particular, Tooth Selection opens with teeth already installed and Denture Border and Base opens with bases already present.

#### Bridge, Inlay/Onlay, and Veneer

These lessons use createRestorativeCase with a workflow-specific configuration but procedural generic geometry. Bridge starts with two preparations, two neighboring teeth, antagonist, support-region proxy, one editable connected bridge, and a hidden reference. Single-unit Inlay, Onlay, and Veneer scenes start with a preparation, neighboring teeth, antagonist, editable restoration, and hidden reference. Every lesson of the relevant type uses the same factory baseline. Step tool union: select, transform, sculpt, analysis, camera, scene, plus margin, section, and thickness controls. Step references/hints are stored in lesson rows. Validators combine workflow metadata and contact, deviation, or thickness analysis on synthetic object IDs. Sources: supabase/migrations/20260928100000_phase_18_restorative_workflows.sql and src/cad/restorative/case.ts.

| Stable lesson ID | Title EN / SR | Difficulty | Steps |
|---|---|---|---:|
| bridge_units | Bridge Units and Margins / Jedinice mosta i margine | Beginner | 1 |
| bridge_pontic_connectors | Pontic, Connectors and Gingiva Relation / Međučlan, spojnice i odnos sa gingivom | Intermediate | 1 |
| bridge_contacts_thickness | Bridge Proximity and Thickness / Blizina i debljina mosta | Intermediate | 1 |
| bridge_full_case | Full Bridge Case · 14–16 / Kompletan slučaj mosta · 14–16 | Intermediate | 1 |
| inlay_margin_insertion | Inlay Margin and Insertion Direction / Inlay margina i smer insercije | Beginner | 1 |
| inlay_contact_thickness | Inlay Contact and Thickness / Inlay kontakt i debljina | Intermediate | 1 |
| onlay_coverage_margin | Onlay Coverage and Margin / Onlay pokrivenost i margina | Beginner | 1 |
| onlay_design_review | Onlay Contact and Thickness Review / Onlay pregled kontakta i debljine | Intermediate | 1 |
| veneer_preparation_reference | Anterior Preparation and Reference / Prednja preparacija i referenca | Beginner | 1 |
| veneer_position_thickness | Veneer Placement and Surface Review / Pozicioniranje fasete i pregled površine | Intermediate | 1 |

Classification: all are DENTAL_WORKFLOW and currently start at PLACEHOLDER. Workflow distinction is structural (restorationType, units, object IDs); the underlying preparations, teeth, and restorations are not anatomical assets.

#### Partial Denture / RPD

Starting scene: createPartialDentureCase selects Kennedy I–IV missing-tooth and abutment lists, then generates a generic mandibular arch, generated teeth, translucent sphere gap regions, and three default framework pieces. The class changes missing regions, but all lessons within a class share that class factory. Step tool union: select, camera, analysis, scene, move, rotate, Partial Denture Survey, and Partial Denture Framework. Each seeded lesson has four ordered steps; the same four step definitions are applied to all four classes. Hints and validators check survey/configuration/component metadata, not a clinically derived fit. Source: supabase/migrations/20260928110000_phase_19_partial_denture.sql.

| Stable lesson ID | Title EN / SR | Difficulty | Ordered steps |
|---|---|---|---:|
| kennedy_class_i | Kennedy Class I · Bilateral distal extension / Kennedy klasa I · Obostrani slobodni završeci | Beginner | 4 |
| kennedy_class_ii | Kennedy Class II · Unilateral distal extension / Kennedy klasa II · Jednostrani slobodni završetak | Beginner | 4 |
| kennedy_class_iii | Kennedy Class III · Bounded edentulous space / Kennedy klasa III · Ograničen bezubi prostor | Intermediate | 4 |
| kennedy_class_iv | Kennedy Class IV · Anterior edentulous space / Kennedy klasa IV · Prednji bezubi prostor | Intermediate | 4 |

Classification: all are DENTAL_WORKFLOW and currently start at PLACEHOLDER. The four case templates are class-specific but share a generated tooth/arch source.

#### Bite Splint and Digital Model

The two case factories use generated arches and generated tooth forms. Bite Splint begins with upper/lower synthetic dentition and a pre-drawn boundary, but no splint solid. Digital Model begins with a synthetic upper arch and a cloned editable working copy of an immutable synthetic raw scan; base, removable dies, and attachments are generated later. Tool unions: Bite Splint uses select, camera, analysis, scene, sculpt, boundary/curve, insertion-path, and mesh controls. Digital Model uses select, move, rotate, camera, scene, mesh_edit, analysis, base/die/attachment controls, and export. Validators use closed curves, workflow state, geometry revision/statistics, and analysis results; thresholds are exercise values. Source: supabase/migrations/20260928120000_phase_20_splint_digital_model.sql.

| Stable lesson ID | Title EN / SR | Difficulty | Steps |
|---|---|---|---:|
| splint_insertion_and_undercut | Insertion direction and undercut preview / Put insercije i pregled podminiranja | Beginner | 1 |
| splint_boundary_and_generation | Splint boundary and internal surface / Granica udlage i unutrašnja površina | Beginner | 2 |
| splint_inspection_capstone | Thickness, antagonist and final check / Debljina, antagonist i završna provera | Intermediate | 1 |
| digital_model_inspection_and_orientation | Raw scan and working model orientation / Izvorni sken i orijentacija radnog modela | Beginner | 1 |
| digital_model_trim_and_cleanup | Trim and clean the working model / Obrezivanje i čišćenje radnog modela | Beginner | 2 |
| digital_model_base_and_capstone | Base, removable dies and attachments / Osnova, uklonjivi patrljci i dodaci | Intermediate | 1 |

Classification: all six are DENTAL_WORKFLOW and currently start at PLACEHOLDER. Immutable-source/working-copy behavior is reusable, but the starting dataset is not a raw scan-like production asset.

#### Virtual Articulator

Starting scene: createArticulatorCase calls createBiteSplintCase and then creates the synthetic bite-splint mesh. The lower arch is a controlled moving object; upper/lower objects and the generated splint share the same synthetic geometry as the bite-splint case. All four lessons use this same setup. Step tool union: articulator, analysis, select, camera, and scene. Dynamic-contact validators sample actual mesh pairs through configured synthetic motion; hints and targets describe the motion as an educational exercise. Source: supabase/migrations/20260928130000_phase_21_virtual_articulator.sql.

| Stable lesson ID | Title EN / SR | Difficulty | Ordered steps |
|---|---|---|---:|
| reference_and_hinge | Reference Position and Hinge Axis / Referentni položaj i osa šarke | Beginner | 2 |
| open_close_motion | Open and Close Motion / Pokret otvaranja i zatvaranja | Beginner | 2 |
| protrusive_motion | Protrusive Motion / Protruzivni pokret | Intermediate | 2 |
| lateral_excursion_and_splint | Lateral Excursion and Bite Splint Review / Bočni pokret i pregled okluzalne udlage | Advanced | 2 |

Classification: all are DENTAL_WORKFLOW and currently start at PLACEHOLDER.

#### Implant Practice

Starting scene: createImplantCase builds a synthetic site block, editable synthetic fixture, read-only reference fixture, synthetic scan-body cylinder, synthetic abutment, shared synthetic crown-shaped restoration, emergence ring, screw-channel marker, and synthetic reference-risk ring. Every implant lesson starts from the same fully populated initial case. Tools include select, transform, scene, analysis, section/measure, and the implant workflow panel. Hints refer to explicit exercise targets. Implant validators check relationships, selected fixture metadata, depth, axis, or distance; they do not validate clinical planning. Source: supabase/migrations/20260928140000_phase_22_implant.sql.

| Stable lesson ID | Title EN / SR | Difficulty | Ordered steps |
|---|---|---|---:|
| scan_body_matching | Scan Body Matching / Uparivanje scan body-ja | Advanced | 1 |
| implant_visualization | Implant Fixture and Axis / Implantat i osa | Advanced | 1 |
| position_and_depth | Position and Depth / Položaj i dubina | Advanced | 1 |
| angulation_and_axis | Angulation and Restorative Axis / Angulacija i restaurativna osa | Advanced | 1 |
| custom_abutment_and_emergence | Custom Abutment and Emergence Profile / Prilagođeni abatment i profil izranjanja | Advanced | 1 |
| screw_channel_and_crown | Screw Channel and Crown Integration / Screw channel i povezivanje krunice | Advanced | 1 |
| implant_review_capstone | Implant Restoration Review / Završni pregled implantološke nadoknade | Advanced | 1 |

Classification: all are DENTAL_WORKFLOW and currently start at PLACEHOLDER. Current 8 mm depth, 12-degree axis, and 2 mm distance targets are exercise settings, not clinical recommendations.

### 2.3 Additional local-only Practice definition

src/practice/lessons.ts defines developer-move-and-position, a two-step Tool Drill with select/move/camera, demo-crown targets, transform-range checks, hints, and demo-reference example modes. No current route imports getPracticeLesson or PRACTICE_LESSONS; routes load the database catalog. It is recorded as a local developer fixture, not included in the 59 database-seeded published lessons.

## 3. Current Free Lab Inventory

The landing route calls loadFreeLabScenarios, which reads published scenarios from the database. The migration-defined catalog contains 15 scenario slugs. Database scenario row UUIDs are generated by the table default rather than fixed in these seed migrations; the slug is the stable identifier available in the repository.

### 3.1 Architecture and entry flow

- Entry modes: Training Case/scenario catalog, Import My Case, Blank Workspace, and Random Case. Random Case is a fourth entry card in the current UI, beyond the three target case-entry modes in DENTAL-REALISM-SPEC.md.
- Filters: catalog supports category and difficulty filtering. Random selection filters on category, difficulty, published status, and randomEligible, then chooses a random eligible row. All 15 repository-seeded scenarios set randomEligible=true. With one case in most categories, the current random picker often has only one option. The category list combines Inlay/Onlay, has a separate scenario category for Veneer in the schema, and does not provide a distinct Veneer filter option.
- Import starts a Free Lab workspace and opens the model-import path. Blank Workspace initializes an empty Free Lab workspace. Both require authentication through the app route; neither checks Practice progress.
- A case brief displays synthetic case code, indication, target teeth, supplied records, requirements, material, and notes. Requirements are explanatory; there is no Practice step sequence or scenario validation gate in Free Lab.
- Scenario selection passes the row’s category, restorationType, partial-denture class, case brief, and asset links into a browser session record. The session is stored in session storage; it is configuration, not a geometry snapshot or Case Package.
- initializeFreeLabWorkspace clears the geometry registry and selects a case factory by category/initializer. The same create*Case functions are imported by Practice, so Practice and Free Lab share scene builders.
- Scenario-specific dispatch preserves restorationType for fixed restorations and Kennedy class for RPD. Complete Denture cases both call the same two-arch createDentureCase. Several records of the same workflow therefore open the same template, regardless of their differing scenario text.
- Current built-in scenarios do not use lesson-style progress gating. Free Lab can save user cases through the common cloud case system; that saved user geometry is separate from the initial synthetic scenario template.
- src/free-lab/scenarios.ts also contains eight local scenario-shaped constants (one crown, four Kennedy cases, one splint, one digital model, one implant). The landing page does not use these constants as its catalog; they duplicate database seed slugs and are not additional current database cases. src/free-lab/scenario-assets.ts can emit STL files for three generic parametric assets, but current seeded cases dispatch to workflow factories before that helper is needed.

### 3.2 Scenario inventory

Source geometry in all rows is generated in application code. “Source” means immutable case inputs; “design” means editable output. Every scenario record has no scenario-specific validator configuration and the brief requirements do not block access to CAD tools.

| Stable scenario slug | Title | Workflow / difficulty | Source geometry and initial objects | Editable / locked / reference objects | Expected output and current issue |
|---|---|---|---|---|---|
| synthetic_posterior_crown_26 | Posterior crown · tooth 26 / Bočna krunica · zub 26 | Crown / Beginner | createCrownCase: synthetic preparation 26, adjacent 25, antagonist 36, crown, hidden example | Crown editable; input teeth locked; example hidden/read-only | Crown 26. One generic procedural case; no anatomical records. |
| synthetic_upper_complete_denture | Upper Complete Denture / Totalna proteza gornje vilice | Complete Denture / Beginner | createDentureCase: both synthetic edentulous arches, all 32 generated teeth, both bases, guides, hidden reference | Teeth/bases/guides editable; arches locked; example hidden | Upper denture. **Mismatch:** brief says upper only, but initializer always opens both arches. |
| synthetic_upper_lower_complete_denture | Upper + Lower Complete Denture / Totalna proteza gornje i donje vilice | Complete Denture / Intermediate | Same createDentureCase scene as the upper-only scenario | Same editability as above | Upper/lower setup and bases. Scene matches arch count, but remains generated geometry. |
| synthetic_bridge_14_16 | Bridge 14–16 / Most 14–16 | Bridge / Intermediate | createRestorativeCase(bridge): two preparations, adjacent teeth 13/17, antagonist 44, gingiva proxy, connected restoration, reference | Bridge editable; prep/adjacent/antagonist/gingiva locked; example hidden | Connected 14–16 bridge. Abutments, pontic, and connectors are synthetic; bridge members are merged into one editable CAD object. |
| synthetic_inlay_36 | Inlay 36 / Inlay 36 | Inlay / Beginner | createRestorativeCase(inlay): preparation 36, adjacent teeth, antagonist, extruded Inlay, reference | Inlay editable; case inputs locked; example hidden | Inlay 36. Generic extruded form; runtime object role is “crown” with restorationType=inlay. |
| synthetic_onlay_46 | Onlay 46 / Onlay 46 | Onlay / Intermediate | createRestorativeCase(onlay): preparation 46, adjacent teeth, antagonist, scaled crown-like coverage form, reference | Onlay editable; case inputs locked; example hidden | Onlay 46. Scaled generic crown mesh; runtime role is “crown” with restorationType=onlay. |
| synthetic_veneer_11 | Anterior Veneer 11 / Prednja faseta 11 | Veneer / Beginner | createRestorativeCase(veneer): preparation 11, adjacent teeth, antagonist, shell proxy, reference | Veneer editable; case inputs locked; example hidden | Veneer 11. Sphere-derived shell; runtime role is “crown” with restorationType=veneer. |
| synthetic_kennedy_class_i | Partial denture · Kennedy Class I / Parcijalna proteza · Kennedy klasa I | Partial Denture / Beginner | Class-I lower arch, generated remaining teeth, sphere gap regions, three default framework members | Framework components editable; arch, teeth, gap source locked | Kennedy I framework. Class layout is distinct but uses generic teeth and support regions. |
| synthetic_kennedy_class_ii | Partial denture · Kennedy Class II / Parcijalna proteza · Kennedy klasa II | Partial Denture / Beginner | Class-II lower arch, generated remaining teeth, sphere gap region, three default framework members | Framework components editable; arch, teeth, gap source locked | Kennedy II framework. No realistic surveyed cast or case-specific prepared rests. |
| synthetic_kennedy_class_iii | Partial denture · Kennedy Class III / Parcijalna proteza · Kennedy klasa III | Partial Denture / Intermediate | Class-III lower arch, generated remaining teeth, sphere gap region, three default framework members | Framework components editable; arch, teeth, gap source locked | Kennedy III framework. Generic generated surfaces. |
| synthetic_kennedy_class_iv | Partial denture · Kennedy Class IV / Parcijalna proteza · Kennedy klasa IV | Partial Denture / Intermediate | Class-IV lower arch, generated remaining teeth, sphere gap region, three default framework members | Framework components editable; arch, teeth, gap source locked | Kennedy IV framework. Generic generated surfaces. |
| synthetic_bite_splint | Bite splint · synthetic arches / Okluzalna udlaga · sintetičke vilice | Bite Splint / Beginner | createBiteSplintCase: generated upper/lower teeth, antagonist, pre-drawn closed boundary | Boundary can be edited; source arches/teeth locked; splint solid is generated during exercise | Bite splint. Scene starts with a guide boundary, not upper/lower scans or bite relation. |
| synthetic_digital_model | Digital model · upper scan / Digitalni model · gornji sken | Digital Model / Beginner | createDigitalModelCase: generated synthetic upper arch and teeth, immutable source plus cloned working copy | Working model editable; raw source locked; base/die/attachments generated later | Cleaned digital model with optional components. Raw input is not a scan-like dataset. |
| synthetic_virtual_articulator_splint | Virtual Articulator · bite splint / Virtual Articulator · okluzalna udlaga | Virtual Articulator / Intermediate | createArticulatorCase: Bite Splint factory plus generated splint solid | Lower arch and splint editable/movable; upper input fixed; no separate case reference | Motion/contact review of a splint. Correct motion infrastructure, but synthetic arches and splint. |
| synthetic_implant_training_case | Implant practice · synthetic site / Implantološka vežba · sintetičko mesto | Implant / Advanced | createImplantCase: synthetic site, fixture, scan body, abutment, shared tooth form, markers | Main fixture, scan body, abutment, crown, and markers editable as configured; site and risk reference locked; reference fixture read-only | Implant crown/restorative review. Fixture, site, scan body, and risk-region proxies are not realistic anatomical or commercial implant assets. |

Scenario tools are inherited from the shared CAD workspace and workflow panels rather than declared as scenario-specific tool maps. Scenario validation is absent; available geometry analysis is independently accessible and does not gate scenario completion.

## 4. Current 3D Asset Inventory

### 4.1 Bundled and referenced assets

| Asset family / path | Format | Use and anatomical role | Provenance / license | Scale / segmentation | Editability and audience |
|---|---|---|---|---|---|
| public/*, src/*, tests/* | Static inventory search for GLB, GLTF, STL, OBJ, and PLY returned no mesh files | No bundled dental source model or reference mesh found | Not applicable | Not applicable | No bundled 3D mesh asset is production-facing |
| src/cad/scene/synthetic-dental-geometry.ts | Runtime Three.js meshes | Shared synthetic tooth, arch, and open-patch scan/demo scene | Source code describes internally created teaching geometry; no third-party model data. Independent asset license/ownership record: UNKNOWN — requires provenance review. | Dimensions are hardcoded in nominal CAD units treated as mm; no asset manifest declares scale. Not anatomically segmented. | Used in Practice/Free Lab factories and Tool Drills; editable/locked by scene metadata |
| src/cad/crown/geometry.ts | Runtime Three.js buffer geometry | Synthetic crown/restoration and crown reference | Internally generated in code; no external source identified. Independent license record: UNKNOWN — requires provenance review. | Nominal CAD units; no manifest scale or anatomical segmentation | Editable design or read-only reference in workflow scenes |
| src/cad/restorative/geometry.ts | Runtime Three.js meshes | Synthetic bridge units/connectors, Inlay, Onlay, Veneer shell, gingiva/support proxy | Internally generated; no patient or third-party library source stated. Independent license record: UNKNOWN — requires provenance review. | Nominal CAD units; bridge mesh has named member spans, not anatomical segmentation | Editable restoration or hidden reference; production-facing training geometry |
| src/cad/denture/geometry.ts | Runtime Three.js meshes | Synthetic edentulous arches, procedural denture teeth, base, and occlusal guide | Internally generated teaching geometry; no external tooth library stated. Independent license record: UNKNOWN — requires provenance review. | FDI tooth positions are stored in object metadata; no mesh segmentation/master-runtime manifest. Nominal CAD units. | Teeth and base editable; source arches locked; used in denture, RPD, splint, and digital-model cases |
| src/cad/partial-denture/geometry.ts | Runtime Three.js meshes | Kennedy gap proxies, survey/framework components, clasp/connector/mesh/relief/blockout geometry | Internally generated from procedural curves/primitives. Independent license record: UNKNOWN — requires provenance review. | Component objects have IDs and some tooth/parent relationships; not anatomical segmentation. Nominal CAD units. | Editable framework components; production-facing synthetic exercises |
| src/cad/splint/geometry.ts | Runtime Three.js extruded mesh | Bite-splint slab from a closed boundary | Internally generated; no external source identified. Independent license record: UNKNOWN — requires provenance review. | User boundary/thickness values are in nominal mm; no anatomically fitted inner surface or segmentation | Editable generated design |
| src/cad/digital-model/geometry.ts and case.ts | Runtime Three.js meshes | Generated raw/working arch scan, model base, cylindrical removable dies, cylindrical attachments | Internally generated; no external scan file. Independent license record: UNKNOWN — requires provenance review. | Nominal mm-like values; raw and working objects are separate; no master/runtime asset pair | Immutable synthetic raw source; editable copy/base/components |
| src/cad/articulator/case.ts and kinematics.ts | Reused runtime meshes and motion state | Synthetic upper/lower arches, generated splint, moving-lower-arch simulation | Reuses internal case geometry; no patient movement data | Canonical configured motion values; no patient-specific records | Shared input/design scene with editable motion preview |
| src/cad/implant/geometry.ts and case.ts | Runtime Three.js meshes | Synthetic fixture, box site, scan-body cylinder, abutment cylinders, torus references, shared synthetic crown | Code describes internally authored educational meshes and no commercial implant geometry. Independent license/ownership record: UNKNOWN — requires provenance review. | Fixture dimensions use nominal mm configuration; no library asset metadata/master-runtime pair or anatomical segmentation | Fixture/design/reference objects as listed in scenario inventory |
| src/free-lab/scenario-assets.ts | Client-generated STL at runtime | Generic arch and ellipsoid-like synthetic teeth, including a simple prepared target | Generated from repository code; no external asset input. Independent license record: UNKNOWN — requires provenance review. | Coordinates use nominal mm; not segmented as dental anatomy | Fallback helper. Current migration-seeded scenarios route to workflow factories before using these files; not an active scenario asset family |

### 4.2 Storage-backed asset infrastructure

The repository defines platform asset registration and user case geometry storage:

- practice-assets is the private Storage bucket used for platform lesson/scenario model assets.
- case-geometry stores immutable user case geometry versions as GLB.
- user-imports and screenshots are user buckets; marketing-assets is also defined.
- model_assets stores format, source unit, counts, bounds, normals, default role, and technical metadata. asset_licenses can store source URL, license name/URL, commercial-use permission, and verification status. Admin publication procedures check ready status and commercial-use/provenance fields.
- Practice can load lesson-linked assets from bucket/path and scenario loading can download asset references. No lesson/scenario asset-link seed rows were found in repository workflow migrations; built-in scenes use code factories.
- No static Storage object paths or remote Storage inventory can be confirmed from this repository. Whether platform models or user records exist remotely is unknown.

## 5. Placeholder / Generic Geometry Findings

| Source file and function | Affected content | Current representation | Tool Drill acceptable? | Dental Workflow acceptable? | Target workflow |
|---|---|---|---|---|---|
| src/cad/scene/synthetic-dental-geometry.ts: createSyntheticTooth | CAD Foundations; shared demo; restorative and implant inputs | Extruded rounded shape with cylinder collar; restoration adds four spheres as cusps | Yes, when clearly identified as a tool exercise | No as preparation, tooth, antagonist, or restoration anatomy | R2 tooth/arch assets; R3 fixed prosthetics; R7 implant |
| src/cad/scene/synthetic-dental-geometry.ts: createSyntheticDentalArch | Shared demo and any caller using common arches | Torus gum with 14 ellipsoid sphere teeth | Yes for navigation/selection demo | No as a supplied arch or scan | R2; then R3/R4/R5/R6/R7 by workflow |
| src/cad/scene/synthetic-dental-geometry.ts: createSyntheticScanExercise | CAD Foundations scan-preparation drill | Synthetic prepared-tooth mesh with a deliberately removed small patch | Yes as an explicitly synthetic mesh-edit drill | No as a raw digital-model dataset | R6 Digital Model |
| src/cad/crown/geometry.ts: createSyntheticCrownMesh | Crown, Bridge member source, Onlay proxy, implant crown reference paths | Smooth radial mesh with generic lobes/cusps; no anatomical fissure/margin adaptation | Not a general tool drill object, but usable as a clearly synthetic shape | No as production crown anatomy | R2/R3/R7 |
| src/cad/restorative/geometry.ts: createSyntheticBridgeObject, inlayGeometry, veneerGeometry, createSyntheticGingivaRegion | Bridge, Inlay, Onlay, Veneer Practice and scenarios | Bridge made from repeated crown mesh plus capsule connectors; Inlay extruded outline; Onlay scaled crown; Veneer sphere shell; gingiva is scaled sphere | Simplified visualization only | No, these are the main dental workflow designs and case context | R3 |
| src/cad/denture/geometry.ts: createSyntheticDentureTooth, createEdentulousArch, createDentureBaseGeometry | Complete Denture; RPD; splint; digital model | Extruded smooth tooth outlines with sphere cusp bumps; generic extruded arch; generated base with shallow procedural sockets | Limited setup controls can be exercised on these | No as a realistic denture tooth set, edentulous anatomy, or base | R2/R4/R5/R6 |
| src/cad/denture/case.ts: createDentureCase | All eight Complete Denture lessons and both denture scenarios | Same two generated arches, 32 generated teeth, two generated bases, guides, and example for every lesson/scenario | N/A | No; a selection/base stage does not start at its own workflow checkpoint | R4/R8 |
| src/cad/restorative/case.ts: createRestorativeCase | Bridge, Inlay, Onlay, Veneer lessons/scenarios | Type-specific object names and IDs, but generated prep/teeth/restoration/reference are shared basic forms | N/A | No as realistic starting anatomy | R3/R8 |
| src/cad/partial-denture/case.ts and geometry.ts | Four Kennedy Practice lessons and four Free Lab cases | Reuses generated denture teeth and arch; missing spaces use scaled spheres; default connectors and retentive areas are procedural tubes/boxes/spheres | Component creation controls can be exercised | No as surveyed casts, tooth rests, or realistic RPD anatomy | R5 |
| src/cad/splint/case.ts and geometry.ts | Bite Splint and Virtual Articulator | Generated arches/teeth; preset boundary; final shell is an extruded slab, not a fitted inner surface | Boundary/mesh tools can be exercised | No as scan and bite-relation input or a realistic shell | R6 |
| src/cad/digital-model/case.ts and geometry.ts | Digital Model lessons and scenario | “Raw scan” is a generated edentulous arch plus generated teeth; base is an ellipse extrusion; dies/attachments are cylinders | Mesh editing controls can be exercised | No as raw scan, die, or final dental model assets | R6 |
| src/cad/implant/geometry.ts: createSyntheticImplantFixture, createSyntheticImplantSite, createSyntheticImplantAbutment | Implant lessons/scenario | Cylinder body/collar and torus thread rings; site is a box with capsule and torus markers; abutment is two cylinders | N/A | No as implant site, fixture, scan body, abutment, or risk anatomy | R7 |
| src/free-lab/scenario-assets.ts: archTeeth, trianglesForTooth | Fallback scenario-asset path | STL built from ellipsoid tooth surfaces arranged along a generic arch | Could be used only as a clearly labeled drill | No as a scan or anatomic starting case | R2/R6 |

No dental primitive was removed or changed in R0.

## 6. Starting Scene & Checkpoint Audit

### What the application does

1. Practice resolves a lesson slug from database content.
2. initializePracticeLesson selects one source enum and calls a new case factory, or downloads/imports lesson-linked Storage models when lesson assets are configured.
3. Each workflow factory clears and rebuilds the geometry registry and workspace objects from code. Lessons in a workflow share the same factory and base objects.
4. Practice attempt resume restores completed step IDs, checks, and validation results. It does not restore CAD geometry or the geometry revision reached in the previous lesson/session.
5. Free Lab creates a browser session configuration and calls the workflow factory. Saved user Free Lab cases can use cloud case persistence, but that save path is not how built-in scenario starting states are reconstructed.

### Answers to the checkpoint questions

- Every Practice lesson is initialized through its source-specific template or linked lesson assets. There is no per-lesson saved geometry checkpoint resolver in the current route.
- Several lessons share the same scene factory: every Crown lesson shares createCrownCase; each Complete Denture lesson shares createDentureCase; each restorative type shares createRestorativeCase; the four RPD class lessons share class-parameterized createPartialDentureCase; the other modules share their module factory.
- Later lessons do not receive the previous lesson’s completed CAD state. They reopen the baseline factory result.
- case_setup is a persisted JSON template selector and object mapping, not a persisted CAD snapshot. Attempts persist progress/check results, not mesh state. WorkspaceSnapshot stores object metadata/transforms in memory. Cloud case revisions serialize actual geometry, but Practice does not reference them as lesson checkpoints.
- All 46 Dental Workflow lessons currently start from placeholder geometry. Several also start at the wrong stage for their concept: Denture Tooth Selection begins with teeth present; Denture Border and Base begins with pre-existing bases; crown contact/sculpt/check lessons reopen the same initial crown case; VA later lessons reopen the initial motion case; implant lessons reopen the same fully populated initial fixture/abutment/crown state. The upper-only denture scenario also opens both arches.
- Reusable R8 mechanisms: stable lesson/step slugs, case_setup source enum, asset links, object mappings, workspace factories, cloud case revisions, geometry registry, and Practice attempt progression. A checkpoint should bind an exact case package/revision to a lesson; the current template selector alone is not sufficient.

Per-workflow starting state classification: all Dental Workflow lesson initial geometries are PLACEHOLDER. Workflow names, object IDs, and specialized object fields make many scenes structurally workflow-specific, but no lesson currently starts from realistic anatomical source assets or a persisted lesson-specific checkpoint. No workflow lesson earns GOOD_WORKFLOW_SPECIFIC.

## 7. CAD Tool Inventory

The Practice step schema exposes ten generic allowed tool IDs. Other CAD features are represented by workflow panels or UI actions, not values in that generic list. Step tool links narrow permissions in Practice; Free Lab uses shared CAD/workflow tools without lesson-step gating.

| Tool / feature ID | EN / SR label | Category and implementation | Current capability and geometry behavior | Main workflow coverage |
|---|---|---|---|---|
| camera | Camera / Kamera | Navigation; cad/camera and cad-viewport | Orbit, pan, zoom, standard views, frame selected; view-only | All modules |
| select | Select / Izbor | Selection; cad-workspace/cad-viewport | Select whole CAD object; mesh-face selection is separate | All workflows |
| move | Move / Pomeranje | Transform; workspace-store and transform controls | Changes object transform with numeric/gizmo input and history | All workflows; heavily used by dentures/RPD |
| rotate | Rotate / Rotacija | Transform | Changes object orientation with numeric/gizmo input and history | All workflows |
| scale | Scale / Skaliranje | Transform | Changes object scale; mostly foundation drill and object-level controls | Tool Drills and selected CAD objects |
| scene | Scene / Scena | Scene controls in CAD workspace | Visibility, isolate/restore, opacity, selection; metadata/display behavior | All workflows |
| sculpt | Sculpt / Skulptovanje | Sculpt; cad/sculpt/brush.ts and stroke.ts | Add, Remove, Smooth, Flatten, Morph and Groove brush edits to registered mesh geometry; history revisions | Crown, dentures, splint, general imported meshes |
| mesh_edit (runtime mesh-edit) | Mesh Edit / Uređivanje mesh-a | Mesh; cad/mesh and worker | Delete, Trim, Smooth, Fill Hole, Cleanup, Mirror on actual mesh data | Foundations, Digital Model, imported models |
| margin | Margin Line / Margin Line | Curve; cad/curves and viewport pick | Stores/edit points as a non-destructive curve associated with an object; not an automatic margin calculation | Crown and fixed restorations |
| insertion_path | Insertion Path / Put insercije | Analysis/workflow preview | Directional surface orientation/clearance preview; not a clinical undercut determination | Crown, RPD, splint |
| measurement | Measure / Merenje | Analysis controls and viewport point picking | Measures selected mesh-surface point distance in the current scene | General workflows |
| section | Section / Section | Analysis controls and viewport clipping | Non-destructive visual section plane; does not edit mesh geometry | Crown/restorations, denture, digital model, implant |
| analysis | Design Check / Analiza | Analysis store/worker and analysis controls | Mesh-based intersection, contact/proximity, thickness, deviation, directional undercut and sampled dynamic contact, depending on configured analysis | Crown/restorations, denture, RPD, splint, VA, implant |
| thickness | Thickness / Debljina | Analysis workflow feature | Ray-based thickness samples on supported closed geometry; unavailable on open/ambiguous meshes | Crown/restorations, splint |
| denture_setup | Denture Setup / Postavka proteze | Workflow; denture/setup-store and panel | Balanced/broad generated tooth set and Arch/Chain/Individual arrangements over stable FDI objects | Complete Denture |
| denture_border | Denture Border / Granica proteze | Curve/workflow | Creates a closed boundary on a synthetic edentulous arch | Complete Denture |
| denture_base | Denture Base / Baza proteze | Mesh/workflow | Generates a separate synthetic editable base from the boundary with shallow seats | Complete Denture |
| partial_denture_survey | Survey and undercut preview / Analiza i prikaz podminiranih regija | Analysis/workflow | Orientation and directional-ray preview; does not measure validated undercut depth | Partial Denture |
| partial_denture_framework | Partial Denture framework / Skelet parcijalne proteze | Workflow/geometry | Adds stable-ID components (connectors, bars, rests, clasps, minor connectors, retention mesh, blockout, relief, guide planes, finish lines) with some tooth/parent metadata | Partial Denture |
| articulator | Virtual Articulator / Virtual Articulator | Occlusion workflow; articulator store/kinematics | Moves lower object from canonical educational motion parameters and samples opposing mesh contact | Virtual Articulator; reusable for splint/denture/restorative cases |
| implant workflow controls | Implant / Implant | Workflow panel; cad/implant | Selects synthetic fixture definition, changes depth/axis, matches synthetic scan body, adjusts abutment/emergence references | Implant |
| import | Import My Case / Uvoz mog slučaja | Model import panel and import worker | Parses/imports user geometry into editable scene objects; model registry supports STL, OBJ, PLY, and GLB metadata | Free Lab/general |
| export | Export / Izvoz | cad/import/export-model.ts and workspace | Exports selected object geometry as STL, OBJ, or GLB | Free Lab/general |
| screenshot/annotations | Screenshot Studio / Screenshot Studio | Screenshot studio and persistence | Captures viewport and stores annotations/images; does not alter dental mesh | Practice/general |
| history | Undo / Redo | Command history and geometry registry | Reversible transform and mesh revision operations; geometry changes are real in the runtime mesh | All workflows |
| save/recovery | Save Case / Recovery | cad/persistence and cad/recovery | Saves cloud case revisions with serialized geometry; local recovery/session data supports recovery paths | Free Lab and saved cases |

### Reuse classification

- **Reusable now:** viewport/navigation, object selection/transforms, scene visibility, curve storage/editing, mesh-edit worker, sculpting, section/measurement, BVH geometry registry, history, static geometry analysis, import/export, screenshots, user case persistence.
- **Reusable with adaptation:** margin/curve semantics, workflow checks, denture setup/base generation, partial framework tools, synthetic articulator kinematics, synthetic implant controls. These operate on exercise geometry/metadata and need case-package/object-role and realistic-input alignment.
- **Missing for later realism phases:** anatomical tooth and prepared-tooth asset library; complete/partial jaw datasets and bite relation records; real scan-like case packages; case-specific guides/reference results; persistent per-lesson checkpoint resolution; real workflow semantics connecting source/design/guides/reference; validated, exercise-specific case checks and expert-reviewed content.

## 8. Design Check / Validators

### Runtime validator types

| Config type | What it checks | Geometry or metadata | Transferability |
|---|---|---|---|
| transform_range | Selected object position/rotation/scale components against target and tolerance | Transform metadata; does not inspect tooth shape | Coordinates tied to a particular exercise scene |
| required_object | Object exists and optionally matches selected/visible/opacity/revision conditions | Workspace metadata/state | Reusable with stable object IDs and roles |
| required_step | Acknowledgement for actions runtime does not score | Step/session state | Reusable as acknowledgement, not geometric validation |
| geometry_statistics | Minimum vertex/triangle counts | Actual mesh counts, but coarse proxy | Rarely workflow-specific by itself |
| margin_complete | Margin curve is present/closed for object | Structured curve state | Reusable when attached to the right preparation |
| curve_closed | Named curve of a specified kind is closed for target object | Structured curve state | Reusable with correct workflow object and curve kind |
| denture_setup | Model analysis, tooth setup, chain mode, boundary, base, or complete-case conditions | Workflow store, IDs and curve/object state | Reusable after realistic denture mapping |
| restorative_setup | Bridge, single-unit, or veneer state | Workflow metadata and registered objects | Reusable after realistic unit/object mapping |
| partial_denture_setup | Survey/framework/complete-case conditions, optional Kennedy class | Workflow/component metadata and relationships | Reusable after realistic surveyed case mapping |
| analysis_target | Contact, thickness, undercut, deviation, or dynamic-contact result for object IDs and optional min/max | Actual worker analysis on current mesh data | Most transferable, but IDs and exercise thresholds need case remapping |
| implant_check | Fixture, depth, axis, distance, or relationship conditions | Typed implant state plus transforms/analysis as applicable | Reusable after synthetic site/fixture geometry is replaced |

The validator configuration schema is in src/practice/types.ts and implementations are in src/practice/validators.ts. Per-step configs link through practice_step_validations to validation_configs. Migration helpers create config rows using lesson/step identifiers; the database UUIDs are not statically declared. Free Lab scenarios have no validator field, and database-scenarios.ts does not load scenario validation rows. No scenario currently has a Design Check gate.

Scoring averages pass=1, warning=0.5, fail=0; Practice step completion requires at least one result and all results passing. Results/check counts are persisted to Practice attempt rows. Resume restores attempt/step state, not CAD geometry.

### Current findings

- Tool Drills use object-state, acknowledgement, transform, and generic analysis checks. Their absolute coordinates and targets are acceptable as exercise targets but should not be treated as dental criteria.
- Crown/restorative/denture/RPD/splint/digital-model/VA/implant lesson checks target fixed synthetic object IDs or state created by current template factories. They need object and threshold remapping to transfer to realistic case packages.
- Several workflow checks validate operation/state relationships rather than clinically meaningful mesh criteria. Geometry analysis does operate on real runtime meshes where configured, but the meshes are synthetic.
- Implant seeds explicitly use 8 mm depth, 12-degree axis, and 2 mm separation exercise targets. The validator field name targetMm is also used for an axis value in degrees; keep this mapping in mind during a future validator design review.
- Repository wording commonly marks thresholds and geometry as synthetic or exercise-specific. No validator should be described as clinical approval, patient-specific fit, or manufacturing validation.

## 9. Scene / Object Semantic Audit

### Existing metadata

CadObjectMetadata includes stable string IDs, display name, CAD role, editable, transform, visible, opacity, import source, geometry statistics/revision, syntheticMesh, and cloud case/version IDs. Available CAD roles include maxilla, mandible, antagonist, preop, prepared_tooth, tooth, crown, bridge, pontic, denture_tooth, denture_base, framework, splint, implant, abutment, model_base, reference, scan, and other.

Specialized metadata includes FDI dentalPosition; articulatorArch; dentureArch/denturePart/toothSetId; restorationType/restorationUnitIds/connectorWidthMm; partialDenturePart/Kennedy class/tooth/abutment/parent IDs; biteSplintPart; digitalModelPart/parent ID; and implantPart/definition/dimensions/depth/fixture/parent/reference IDs.

Geometry Registry entries keep runtime Three.js objects, stable object IDs, role/name, revisions, dirty state, ownership, and resource cleanup. Most workflow factories register concrete objects; case_setup.objectMappings provides another content-side mapping.

### Gaps against SOURCE / YOUR DESIGN / GUIDES / REFERENCE

- The current role enum is domain-object oriented, not a consistent top-level SOURCE / DESIGN / GUIDE / REFERENCE role system.
- editable and visible are independent booleans; locked-source semantics are not uniformly validated.
- Guides often use role other even when they are curves, planes, midlines, or axes. Some missing-tooth support regions are assigned model_base. References commonly use role reference, but not every marker/reference has a distinct semantic role.
- Parent/child relationships exist only in selected workflow-specific fields; there is no common case-object graph.
- Dental FDI identity exists for denture teeth and some exercise configs, but many preparations, restorations, neighboring teeth, implant relationships, and imported models rely on IDs/display names or per-workflow metadata.
- Inlay, Onlay, and Veneer runtime objects are assigned role crown, with restorationType carrying the distinction.
- demo-prepared-tooth is marked editable in the shared demo despite representing preparation/source geometry.
- Stable IDs are mostly code-template IDs. A case package would need stable package-level object IDs that can be repeated across distinct assets and cases without colliding.

## 10. Practice Migration Matrix

Every repository-seeded lesson has one primary recommendation. The local-only developer fixture is shown separately and is not counted in the published catalog.

| Stable lesson ID | Primary recommendation | Short reason / secondary flag |
|---|---|---|
| workspace_orientation | KEEP | Legitimate Tool Drill on labeled synthetic geometry |
| camera_navigation | KEEP | Navigation Tool Drill; simplified arch is sufficient |
| select_dental_objects | KEEP | Selection Tool Drill |
| scene_visibility | KEEP | Visibility Tool Drill |
| move_numeric_precision | KEEP | Transform Tool Drill; coordinates are exercise-only |
| rotate_and_snap | KEEP | Transform Tool Drill |
| safe_scale | KEEP | Explicitly synthetic scale Tool Drill |
| measurement_and_section | KEEP | Generic measurement/section Tool Drill |
| mesh_editing_basics | KEEP | Generic synthetic mesh-edit Tool Drill |
| sculpt_basics | KEEP | Generic sculpt Tool Drill |
| scan_preparation_basics | KEEP | Synthetic open-patch mesh Tool Drill; do not present as a real scan |
| undo_redo_reset | KEEP | History Tool Drill |
| foundation_capstone | KEEP | Mixed CAD fundamentals Tool Drill |
| margin | REPLACE_ASSET | Crown workflow structure is reusable; preparation/restoration are synthetic. Secondary: REWORK_VALIDATOR |
| insertion_path | REPLACE_ASSET | Synthetic tooth surface; directional check is educational only. Secondary: REWORK_VALIDATOR |
| placement | REPLACE_ASSET | Crown placement needs realistic case assets. Secondary: REPLACE_STARTING_CHECKPOINT |
| contacts | REPLACE_ASSET | Reopens baseline instead of a completed crown checkpoint. Secondary: REPLACE_STARTING_CHECKPOINT, REWORK_VALIDATOR |
| sculpt | REPLACE_ASSET | Synthetic crown morphology. Secondary: REPLACE_STARTING_CHECKPOINT, REWORK_VALIDATOR |
| thickness | REPLACE_ASSET | Synthetic crown and exercise-bound analysis. Secondary: REPLACE_STARTING_CHECKPOINT, REWORK_VALIDATOR |
| full_crown_case | REPLACE_ASSET | Synthetic source/preparation/design throughout. Secondary: REWORK_VALIDATOR |
| model_analysis | REPLACE_ASSET | Generated edentulous arches and guides. Secondary: REPLACE_STARTING_CHECKPOINT, REWORK_VALIDATOR |
| tooth_selection | REPLACE_ASSET | Generated tooth set; teeth already present at launch. Secondary: REPLACE_STARTING_CHECKPOINT |
| anterior_setup | REPLACE_ASSET | Generated teeth/arch. Secondary: REPLACE_STARTING_CHECKPOINT |
| posterior_setup | REPLACE_ASSET | Generated teeth/arch. Secondary: REPLACE_STARTING_CHECKPOINT |
| chain_mode | REPLACE_ASSET | Generated tooth set. Secondary: REPLACE_STARTING_CHECKPOINT |
| occlusion | REPLACE_ASSET | Synthetic static antagonist geometry. Secondary: REWORK_VALIDATOR |
| base | REPLACE_ASSET | Generated arch/base; base already present at launch. Secondary: REPLACE_STARTING_CHECKPOINT, REWORK_VALIDATOR |
| full_denture_case | REPLACE_ASSET | Generated two-arch case. Secondary: REWORK_VALIDATOR |
| bridge_units | REPLACE_ASSET | Synthetic preparations, teeth, and connected restoration. Secondary: REPLACE_STARTING_CHECKPOINT, REWORK_VALIDATOR |
| bridge_pontic_connectors | REPLACE_ASSET | Generic bridge members/connectors and support proxy. Secondary: REPLACE_STARTING_CHECKPOINT, REWORK_VALIDATOR |
| bridge_contacts_thickness | REPLACE_ASSET | Contact/thickness inputs are synthetic. Secondary: REPLACE_STARTING_CHECKPOINT, REWORK_VALIDATOR |
| bridge_full_case | REPLACE_ASSET | Workflow structure is reusable; all geometry is generated. Secondary: REWORK_VALIDATOR |
| inlay_margin_insertion | REPLACE_ASSET | Generic cavity/preparation and extruded restoration. Secondary: REPLACE_STARTING_CHECKPOINT, REWORK_VALIDATOR |
| inlay_contact_thickness | REPLACE_ASSET | Generic Inlay geometry; analysis is exercise-bound. Secondary: REPLACE_STARTING_CHECKPOINT, REWORK_VALIDATOR |
| onlay_coverage_margin | REPLACE_ASSET | Scaled crown proxy is not an Onlay case asset. Secondary: REPLACE_STARTING_CHECKPOINT, REWORK_VALIDATOR |
| onlay_design_review | REPLACE_ASSET | Scaled crown proxy and synthetic contacts. Secondary: REPLACE_STARTING_CHECKPOINT, REWORK_VALIDATOR |
| veneer_preparation_reference | REPLACE_ASSET | Sphere-derived shell and synthetic anterior context. Secondary: REPLACE_STARTING_CHECKPOINT, REWORK_VALIDATOR |
| veneer_position_thickness | REPLACE_ASSET | Synthetic shell and reference deviation. Secondary: REPLACE_STARTING_CHECKPOINT, REWORK_VALIDATOR |
| kennedy_class_i | REPLACE_ASSET | Kennedy class is configured, but generated teeth/arch/gaps are not realistic. Secondary: REPLACE_STARTING_CHECKPOINT, REWORK_VALIDATOR |
| kennedy_class_ii | REPLACE_ASSET | Same generated source family; no realistic surveyed cast. Secondary: REPLACE_STARTING_CHECKPOINT, REWORK_VALIDATOR |
| kennedy_class_iii | REPLACE_ASSET | Same generated source family; no realistic bounded-space cast. Secondary: REPLACE_STARTING_CHECKPOINT, REWORK_VALIDATOR |
| kennedy_class_iv | REPLACE_ASSET | Same generated source family; no realistic anterior cast. Secondary: REPLACE_STARTING_CHECKPOINT, REWORK_VALIDATOR |
| splint_insertion_and_undercut | REPLACE_ASSET | Generated arch and directional preview. Secondary: REPLACE_STARTING_CHECKPOINT, REWORK_VALIDATOR |
| splint_boundary_and_generation | REPLACE_ASSET | Generated arch and simple extruded splint. Secondary: REWORK_VALIDATOR |
| splint_inspection_capstone | REPLACE_ASSET | Generated arch/splint and exercise threshold. Secondary: REPLACE_STARTING_CHECKPOINT, REWORK_VALIDATOR |
| digital_model_inspection_and_orientation | REPLACE_ASSET | Generated arch passed off as raw scan input. Secondary: REPLACE_STARTING_CHECKPOINT |
| digital_model_trim_and_cleanup | REPLACE_ASSET | Generated scan geometry, not a scan-like dataset. Secondary: REPLACE_STARTING_CHECKPOINT, REWORK_VALIDATOR |
| digital_model_base_and_capstone | REPLACE_ASSET | Generic base/die/attachment geometry. Secondary: REPLACE_STARTING_CHECKPOINT, REWORK_VALIDATOR |
| reference_and_hinge | REPLACE_ASSET | Correct motion architecture over generated arches. Secondary: REPLACE_STARTING_CHECKPOINT, REWORK_VALIDATOR |
| open_close_motion | REPLACE_ASSET | Generated arches and splint; deterministic exercise path. Secondary: REPLACE_STARTING_CHECKPOINT, REWORK_VALIDATOR |
| protrusive_motion | REPLACE_ASSET | Generated arches and simplified translation. Secondary: REPLACE_STARTING_CHECKPOINT, REWORK_VALIDATOR |
| lateral_excursion_and_splint | REPLACE_ASSET | Generated arches/splint and sampled contact. Secondary: REPLACE_STARTING_CHECKPOINT, REWORK_VALIDATOR |
| scan_body_matching | REPLACE_ASSET | Synthetic scan body/fixture. Secondary: REWORK_VALIDATOR |
| implant_visualization | REPLACE_ASSET | Primitive fixture/site geometry. Secondary: REWORK_VALIDATOR |
| position_and_depth | REPLACE_ASSET | Box site and synthetic fixture; 8 mm is exercise-only. Secondary: REWORK_VALIDATOR |
| angulation_and_axis | REPLACE_ASSET | Synthetic fixture/reference axis; 12 degrees is exercise-only. Secondary: REWORK_VALIDATOR |
| custom_abutment_and_emergence | REPLACE_ASSET | Cylinder abutment and ring proxy. Secondary: REWORK_VALIDATOR |
| screw_channel_and_crown | REPLACE_ASSET | Visual-only channel marker and synthetic shared tooth geometry. Secondary: REWORK_VALIDATOR |
| implant_review_capstone | REPLACE_ASSET | Synthetic site/risk region and configured target. Secondary: REWORK_VALIDATOR |
| developer-move-and-position (local-only) | KEEP | Two-step local Tool Drill fixture, not used by the published catalog route |

No lesson is recommended for retirement in R0. The workflow sequence and shared CAD implementation are reusable, with asset replacement and checkpoint/validator mapping still required.

## 11. Free Lab Migration Matrix

| Stable scenario slug | Primary recommendation | Short reason / secondary flag |
|---|---|---|
| synthetic_posterior_crown_26 | REPLACE_ASSET | One procedural crown case; no real preparation/scan/antagonist assets |
| synthetic_upper_complete_denture | REPLACE_ASSET | Synthetic arches/teeth/base and incorrect two-arch launch for an upper-only brief. Secondary: REWRITE_CONTENT, REPLACE_STARTING_CHECKPOINT |
| synthetic_upper_lower_complete_denture | REPLACE_ASSET | Correct arch count, but all input/design geometry is synthetic |
| synthetic_bridge_14_16 | REPLACE_ASSET | Synthetic bridge inputs and connected restoration proxy |
| synthetic_inlay_36 | REPLACE_ASSET | Generic cavity and extruded Inlay |
| synthetic_onlay_46 | REPLACE_ASSET | Scaled generic crown is used as Onlay |
| synthetic_veneer_11 | REPLACE_ASSET | Synthetic anterior preparation and sphere-derived shell |
| synthetic_kennedy_class_i | REPLACE_ASSET | Kennedy layout is parameterized; cast and components are procedural |
| synthetic_kennedy_class_ii | REPLACE_ASSET | Kennedy layout is parameterized; cast and components are procedural |
| synthetic_kennedy_class_iii | REPLACE_ASSET | Kennedy layout is parameterized; cast and components are procedural |
| synthetic_kennedy_class_iv | REPLACE_ASSET | Kennedy layout is parameterized; cast and components are procedural |
| synthetic_bite_splint | REPLACE_ASSET | Generated arches and boundary; no scan/bite relation package |
| synthetic_digital_model | REPLACE_ASSET | Generated arch called a raw scan; no raw scan dataset |
| synthetic_virtual_articulator_splint | REPLACE_ASSET | Reuses synthetic articulator/splint factory; motion engine itself is reusable |
| synthetic_implant_training_case | REPLACE_ASSET | Primitive site/fixture/abutment and reference markers |

No scenario is retired in R0. Each current record is structurally useful as a workflow slot, but none is a realistic Free Lab case. No current scenario row has a Design Check config or hidden Practice gating.

## 12. Workflow Gap Matrix

| Workflow | Current content, assets, tools, checkpoints, validators, Free Lab | Target from DENTAL-REALISM-SPEC.md | Gap | Future phase |
|---|---|---|---|---|
| Crown | 7 lessons, 1 scenario; synthetic prep/crown/adjacent/antagonist/reference; margin/transform/sculpt/contact/thickness tools; shared template, no lesson snapshots; exercise validators | Prepared arch, realistic preparation/adjacent/antagonist/bite records; anatomical tooth-library proposal; margin → insertion → crown → contacts → occlusion → thickness; 4 Free Lab cases | Replace geometry and scenario data; create checkpoint per concept; map checks to case geometry | R1, R2, R3, R8, R9, R10, R11 |
| Bridge | 4 lessons, 1 scenario; connected synthetic restoration with generic units/connectors/support; no checkpoint | Multiple prepared abutments, edentulous space, gingiva, antagonist, bite; distinct pontic/connectors and 2 Free Lab cases | No realistic multi-preparation record, pontic/gingiva relationship or case-specific bridge data | R1, R2, R3, R8, R9, R10, R11 |
| Inlay | 2 lessons, 1 scenario; generic extruded shape/preparation; shared restorative tools/checks | Inlay-specific posterior preparation and partial restoration workflow; 2 Free Lab cases | No realistic cavity/preparation, adaptation, or case geometry | R1, R2, R3, R8, R9, R10, R11 |
| Onlay | 2 lessons, 1 scenario; scaled crown proxy | Indication-specific cusp coverage and anatomical proposal; 2 Free Lab cases | Current geometry only visually distinguishes coverage; no realistic Onlay case | R1, R2, R3, R8, R9, R10, R11 |
| Veneer | 2 lessons, 1 scenario; sphere-derived shell and generic anterior teeth | Anterior preparation, neighbors, antagonist, optional pre-op/reference; thin facial shell workflow; 2 Free Lab cases | No realistic anterior case or shell asset; checks compare synthetic forms | R1, R2, R3, R8, R9, R10, R11 |
| Complete Denture | 8 lessons, 2 scenarios; procedural arches, 32 generated teeth, bases and guides; static checks; same two-arch template for all lessons | Edentulous maxilla/mandible, jaw relation and references; setup, bases, polished surfaces, occlusion; 3 cases | No realistic edentulous records/jaw relation; no lesson-specific generated-base checkpoints; upper-only scenario mismatch | R1, R2, R4, R8, R9, R10, R11 |
| Partial Denture / RPD | 4 lessons, 4 Kennedy scenarios; generated lower arch/teeth/gaps and default framework pieces; survey preview and component tools | Real partially edentulous casts, rests, surveying, insertion path, blockout and distinct Kennedy I–IV cases | Kennedy-specific topology is procedural; no real cast/rest seats or validated undercut/blockout geometry | R1, R2, R5, R8, R9, R10, R11 |
| Bite Splint | 3 lessons, 1 scenario; generated upper/lower arches, preset curve and extruded slab; no checkpoint | Upper/lower scans and bite relation; boundary, inner/outer surfaces, thickness and opposing contact; 2 cases | No scans/bite relation, shell-fitting geometry or separate cases | R1, R2, R6, R8, R9, R10, R11 |
| Digital Model | 3 lessons, 1 scenario; generated “raw scan”, clone, generic base/dies/attachments; immutable-source behavior | Raw scan-like mesh, immutable source, edited copy, trim/cleanup/base/die/export | Current source is synthetic anatomy, not scan-like data; components are primitive proxies | R1, R2, R6, R8, R9, R10, R11 |
| Virtual Articulator | 4 lessons, 1 scenario; controlled synthetic movement and mesh contact worker; shared splint template | Reuse realistic upper/lower case and optional restoration; educational synthetic motion/contact | Motion engine reusable, but no case-specific realistic arch/bite records or independent case package | R1, R2, R6, R8, R9, R10, R11 |
| Implant | 7 lessons, 1 scenario; synthetic fixture/site/scan body/abutment/crown; typed relationships and exercise checks | Prostheia Synthetic Implant System with realistic synthetic site, scan body, fixture, axis/emergence/abutment/crown/screw channel; 2 cases | Existing primitives establish tool controls but are not a realistic implant-restoration case or asset library | R1, R2, R7, R8, R9, R10, R11 |

## 13. Asset & Licensing Unknowns

- Live remote module/lesson/scenario counts and whether migrations are applied: UNKNOWN — requires read-only Supabase inspection.
- Current platform Storage assets and object paths linked to lessons/scenarios: UNKNOWN — requires asset and Storage inventory.
- Provenance/license/commercial-use status of any remote platform model records: UNKNOWN — requires provenance review. The schema can store these fields and publication checks can require them, but actual remote records were not inspected.
- Whether any remote asset has a master/runtime mesh pair, FDI segmentation, expert review, or verified mm scale: UNKNOWN — requires asset-manifest review.
- Independent license/ownership terms for code-authored synthetic geometry families: UNKNOWN — requires provenance review, even though source code describes them as internally generated and no external meshes were found.
- Any remote content edits made through the Admin studio after repository seed migrations: UNKNOWN — requires read-only database review.

No provenance was inferred from filenames or shapes.

## 14. Architecture Reuse Assessment

| System | Current state | R0 assessment |
|---|---|---|
| CAD engine / viewport | Shared Three.js scene and workspace for Practice and Free Lab | Preserve. Workflow assets can replace inputs without replacing the editor. |
| Geometry Registry | Stable object IDs, roles, mesh traversal, revisions, BVH acceleration, resource ownership/cleanup | Preserve and extend through Case Package object records. |
| History | Command-based transform/mesh operations with revision-aware undo/redo | Preserve; appropriate for realistic case editing. |
| Workers | Import worker, mesh-operation worker, analysis worker | Preserve; support real mesh operation/analysis. |
| Save/recovery | Cloud case revisions serialize actual geometry; local recovery paths exist | Preserve. Existing saved user cases are not currently wired as Practice checkpoints. |
| Practice engine | Database modules/lessons/steps, bilingual hints, tool maps, examples/references, attempts/progress | Preserve. Add package/checkpoint references without discarding learning/progress semantics. |
| Validators | Registry supports state checks, curves, workflow metadata, mesh analyses, dynamic contact, and implant checks | Preserve infrastructure; remap object IDs and criteria to realistic case geometry. |
| Snapshots/checkpoints | Practice template selector and attempt progress exist; cloud case versions persist real geometry separately | Reuse cloud geometry/revision representation where suitable. A lesson-specific checkpoint resolver and exact content binding do not currently exist. |
| Free Lab | Database scenario briefs, filters, random selection, import/blank modes, session config, workflow factories | Preserve entry/session and case management; replace factory templates with case packages. |
| Asset registry | assets/model_assets/asset_licenses and Storage buckets exist; admin publication checks provenance metadata | Preserve schema where adequate; R1 should map it to the target manifest and identify missing master/runtime, segmentation, case alignment, and review fields. |
| Workflow panels | Crown/restorative, denture, RPD, splint, digital model, articulator, implant panels exist | Preserve tool behavior; feed each panel the correct case objects and semantic roles. |

The existing engine can host realistic assets. It lacks a shared package layer that binds metadata, lab order, source/design/guide/reference objects, exact starter geometry revision, asset provenance, and validator config into one case definition.

## 15. R1 Readiness

R1 can begin design work, but these facts must be resolved before freezing the package/asset-registry contract:

1. Confirm whether DENTAL-REALISM-SPEC.md is the intended canonical replacement for the missing dental.md, or provide dental.md to remove specification-name ambiguity.
2. Obtain a read-only snapshot of current published Practice, scenario, lesson/scenario asset-link, asset-license, and Storage rows. This audit establishes the repository migration baseline; it cannot establish current remote content.
3. Review provenance, commercial-use status, units, segmentation, and master/runtime paths for any remote platform assets before deciding compatibility rules for the new registry.

No R1 schema, asset package, checkpoint system, or CAD changes were implemented in R0.
