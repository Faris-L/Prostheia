# Prostheia — Dental Realism Specification & Implementation Plan

**Status:** Owner-requested product overhaul before Phase 28  
**Purpose:** Replace generic/shared starting scenes with realistic dental cases, workflow-specific starting states, high-quality anatomy assets, and a Free Lab that behaves like a digital dental laboratory simulator.

---

# 1. Product Goal

Prostheia should not behave like “one generic CAD workspace with different lesson titles”.

The shared CAD engine remains the same, but each dental workflow must have:

- realistic dental input data;
- workflow-specific objects;
- workflow-specific starting state;
- realistic anatomical assets;
- correct relationship between source data, user design, guides and references;
- lesson-specific checkpoints in Practice;
- independent, realistic cases in Free Lab;
- exercise-specific Design Check criteria;
- clear clinical/educational boundaries.

The target product is:

> **Digital dental laboratory simulator + structured training system.**

It is **not** a clinically certified design/manufacturing system.

---

# 2. Non-Negotiable Principles

## 2.1 Shared engine, different dental workflows

All modules may share:

- viewport;
- Scene;
- transforms;
- sculpting;
- curves;
- section;
- distance/proximity;
- thickness;
- contact analysis;
- undo/redo;
- save/recovery;
- export;
- reference rendering;
- Design Check infrastructure.

But they must **not** share the same generic starting scene.

Examples:

- Crown starts from a prepared tooth/arch.
- Complete Denture starts from edentulous arches and jaw relation.
- Partial Denture starts from a partially edentulous arch and surveying.
- Bite Splint starts from upper/lower scans and bite relation.
- Digital Model starts from a raw scan.
- Implant starts from an implant-restoration case with scan body/known implant position.

## 2.2 Tool Drills vs Dental Workflow Practice

### Tool Drills

Allowed to use simplified geometry.

Examples:

- Select;
- Move;
- Rotate;
- Scale;
- Section;
- Measure;
- Sculpt basics.

The UI must clearly explain that simplified geometry is being used to teach a CAD tool.

### Dental Workflow Practice

Must use realistic dental cases.

Examples:

- Crown;
- Bridge;
- Complete Denture;
- Partial Denture;
- Implant.

Generic cylinders, blocks or placeholder teeth must not be used as the main dental anatomy.

---

# 3. Practice vs Free Lab

## 3.1 Practice

Purpose:

> **Teach me.**

Practice provides:

- current task;
- workflow position;
- hints;
- references;
- “Show me” highlighting;
- exercise-specific Design Check;
- lesson-specific starting checkpoint.

Practice should not force a user to repeat all previous workflow steps just to train one concept.

Example:

If the user opens **Crown — Proximal Contacts**, the case should already contain:

- completed margin;
- insertion direction;
- crown proposal;
- mostly completed anatomy.

The user trains contacts only.

## 3.2 Free Lab

Purpose:

> **Give me a realistic case and let me work independently.**

Free Lab should provide three entry modes:

1. **Training Case Library**
2. **Import My Case**
3. **Blank Workspace**

The most important is **Training Case Library**.

The user receives:

- synthetic Lab Order;
- high-quality starting records;
- correct workflow context;
- required output.

Free Lab must not provide Practice-style gating or step-by-step instructions.

Help, Glossary and Reference may still be available.

---

# 4. Shared Case Package

Every realistic Prostheia case should use a common package model.

```text
Case Package
├── Case Metadata
├── Lab Order
├── Source Records
├── Semantic Object Map
├── Initial Workflow State
├── Editable Objects
├── Locked Source Objects
├── Guide Objects
├── Reference Result
├── Exercise / Scenario Metadata
├── Validation Configuration
└── Expected Output
```

Recommended manifest fields:

```text
case_id
workflow_type
difficulty
locale_content
tooth_numbers
source_asset_ids
editable_asset_ids
guide_asset_ids
reference_asset_ids
starting_checkpoint
required_output
training_notes
design_check_config
asset_provenance
```

---

# 5. Object Roles

Every case object must have a clear semantic role.

## SOURCE

Patient/case-like input that should normally remain locked.

Examples:

- scan;
- preparation;
- gingiva;
- antagonist;
- edentulous arch;
- scan body.

## YOUR DESIGN

What the user is actively making.

Examples:

- Crown 26;
- Bridge;
- Denture Base;
- RPD Framework;
- Splint;
- Implant Crown.

## GUIDES

Workflow information.

Examples:

- Margin Line;
- Insertion Axis;
- Occlusal Plane;
- Implant Axis;
- Restorative Axis;
- Survey Line.

## REFERENCE

Optional learning/reference result.

Examples:

- completed Crown;
- reference RPD framework;
- finished denture;
- target surface.

---

# 6. Anatomy / Asset Library

## 6.1 Permanent Tooth Library

Prostheia needs its own legal anatomical tooth library.

Target initial coverage:

- permanent anterior teeth;
- premolars;
- molars;
- upper and lower;
- FDI-aware semantic IDs.

The tooth library is a **starting anatomical template**, not a final patient-specific restoration.

The user must still be able to modify:

- cusps;
- fissures;
- grooves;
- ridges;
- buccal/lingual contours;
- mesial/distal contours;
- occlusal anatomy.

Relevant sculpt tools:

- Add;
- Remove;
- Smooth;
- Morph;
- Groove.

## 6.2 Denture Tooth Library

Separate from the permanent-tooth restoration library.

Initial v1 target:

- one excellent complete denture tooth set.

Possible later variants:

- Narrow;
- Average;
- Broad.

Priority is quality over quantity.

## 6.3 Critical Anatomical Assets

Must be anatomically realistic:

- prepared teeth;
- edentulous maxilla;
- edentulous mandible;
- partially edentulous arches;
- gingiva;
- antagonist arches;
- anterior veneer case;
- crown/bridge cases;
- implant site;
- scan body;
- scan-like digital model datasets.

## 6.4 Procedural Assets

May be generated:

- axes;
- planes;
- survey lines;
- heatmaps;
- margin curves;
- section planes;
- connector handles;
- contact overlays;
- thickness overlays;
- blockout visualization;
- target markers.

---

# 7. Asset Quality Requirements

Every production training asset should have:

- known source/provenance;
- legal commercial-compatible license or internal ownership;
- no identifiable patient data;
- millimeter scale;
- correct coordinate orientation;
- clean mesh topology appropriate to the workflow;
- semantic segmentation where required;
- a high-quality master mesh;
- browser-optimized runtime mesh;
- stable object IDs;
- case-specific alignment;
- a reference result where needed.

Recommended asset manifest:

```text
asset_id
name
dental_role
tooth_fdi
source
license
master_path
runtime_path
scale_mm
coordinate_system
segmentation
expert_review_status
notes
```

Do not use proprietary exocad/3Shape libraries or unknown-license STL files.

---

# 8. Free Lab v1 Case Library

Target: **26 high-quality cases**.

| Workflow | Cases |
|---|---:|
| Crown | 4 |
| Bridge | 2 |
| Inlay | 2 |
| Onlay | 2 |
| Veneer | 2 |
| Complete Denture | 3 |
| Partial Denture | 4 |
| Bite Splint | 2 |
| Digital Model | 3 |
| Implant | 2 |
| **Total** | **26** |

Virtual Articulator should reuse relevant Crown, Bridge, Denture and Splint cases instead of requiring a separate large case library.

---

# 9. Workflow Blueprints

## 9.1 Crown

**Input:** prepared arch, preparation, adjacent teeth, antagonist, bite relation, Lab Order.  
**User builds:** Crown.

```text
Inspect Case
→ Margin Line
→ Insertion Direction
→ Initial Crown Proposal
→ Positioning
→ Sculpt / Anatomy
→ Proximal Contacts
→ Antagonist / Occlusion
→ Thickness / Section
→ Final Design Check
```

**Key rule:** the user does not make a molar from a cylinder. The initial crown comes from anatomical tooth-library geometry and is adapted to the case.

## 9.2 Bridge

**Input:** prepared arch, two or more preparations, edentulous space, gingiva, antagonist, bite.  
**User builds:** abutment units, pontic, connectors, final bridge.

```text
Margins
→ Common Insertion Direction
→ Initial Anatomy
→ Abutment Units
→ Pontic
→ Pontic–Gingiva Relationship
→ Connectors
→ Sculpt
→ Adjacent Contacts
→ Occlusion
→ Thickness / Connector Inspection
→ Finalize
```

**Key concept:** a bridge is not several independent crowns.

## 9.3 Inlay

**Input:** posterior tooth with inlay-specific preparation, surrounding arch, antagonist, bite.  
**User builds:** intracoronal restoration.

```text
Inspect Preparation
→ Margin
→ Insertion Path
→ Initial Inlay
→ Internal Adaptation
→ Restore Occlusal Anatomy
→ Contacts
→ Antagonist
→ Thickness
→ Finalize
```

## 9.4 Onlay

**Input:** posterior tooth with onlay-specific preparation, adjacent teeth, antagonist.  
**User builds:** larger partial restoration covering defined occlusal/cuspal structure.

```text
Inspect Preparation
→ Margin
→ Insertion
→ Initial Anatomical Proposal
→ Restore Cuspal / Occlusal Anatomy
→ Sculpt
→ Contacts
→ Occlusion
→ Thickness
→ Finalize
```

## 9.5 Veneer

**Input:** prepared anterior tooth, neighboring anterior teeth, antagonist, optional pre-op/reference.  
**User builds:** thin facial/anterior restoration.

```text
Inspect Preparation
→ Review Pre-Op / Reference
→ Margin
→ Insertion
→ Align Target Anatomy
→ Generate Veneer Shell
→ Facial / Incisal Adjustment
→ Proximal Relationship
→ Thickness
→ Final Esthetic Inspection
```

**Scope boundary:** do not turn Prostheia v1 into a full Digital Smile Design platform.

## 9.6 Complete Denture

**Input:** edentulous maxilla, edentulous mandible, jaw relation, occlusal reference, midline/case references.  
**User builds:** upper/lower tooth setup and upper/lower denture bases.

```text
Inspect Edentulous Arches
→ Model Analysis
→ Set Occlusal Plane
→ Choose Denture Tooth Library
→ Initial Tooth Setup
→ Adjust Arch / Chains
→ Adjust Individual Teeth
→ Static Occlusion
→ Define Base Boundary
→ Generate Bases
→ Adapt Bases to Teeth
→ Gingiva / Polished Surface Sculpt
→ Final Occlusion
→ Finalize
```

## 9.7 Partial Denture / RPD

**Input:** realistic partially edentulous arch, remaining teeth, residual ridge, prepared rest seats where required, case classification.  
**User builds:** RPD framework.

```text
Inspect Case
→ Survey
→ Set Path of Insertion
→ Analyze Height of Contour / Undercuts
→ Blockout
→ Major Connector
→ Rests
→ Clasp Paths
→ Clasps
→ Minor Connectors
→ Mesh / Saddle Areas
→ Finish Lines
→ Framework Inspection
→ Build / Finalize
```

Required v1 cases:

- Kennedy I;
- Kennedy II;
- Kennedy III;
- Kennedy IV.

## 9.8 Bite Splint

**Input:** upper scan, lower scan, bite relation.  
**User builds:** splint.

```text
Inspect / Align
→ Choose Target Arch
→ Define Splint Boundary
→ Create Inner Surface
→ Generate Outer Surface
→ Adjust Shape / Thickness
→ Check Antagonist Contacts
→ Sculpt / Refine
→ Finalize
```

## 9.9 Digital Model

**Input:** raw scan-like mesh.  
**User builds:** cleaned model, base, optional die, optional label/attachment.

```text
Inspect Raw Scan
→ Trim Excess
→ Clean Mesh
→ Fill Appropriate Holes
→ Orient Model
→ Define Model Area
→ Generate Base
→ Optional Die
→ Optional Label / Attachment
→ Inspect / Export
```

**Key rule:** raw scan remains immutable.

## 9.10 Virtual Articulator

**Input:** upper arch, lower arch, jaw relation, optional restoration.  
**User does:** motion/contact analysis.

```text
Load Upper + Lower
→ Confirm Relation
→ Reference Position
→ Open / Close
→ Protrusive
→ Left Lateral
→ Right Lateral
→ Dynamic Contact Analysis
→ Adjust Restoration if Needed
→ Re-check
```

**Scope:** synthetic educational motion.

## 9.11 Implant-Supported Prosthetics

**Input:** arch/model scan, gingiva, scan body, adjacent teeth, antagonist/bite, known synthetic implant position.  
**User builds:** custom abutment + crown; advanced screw-retained crown.

```text
Inspect Implant Case
→ Match / Verify Scan Body
→ Understand Implant Position / Axis
→ Emergence Profile
→ Custom Abutment
→ Restorative Axis
→ Initial Crown Anatomy
→ Adapt Crown
→ Contacts / Antagonist
→ Screw / Implant Relationship
→ Final Inspection
```

Use a controlled **Prostheia Synthetic Implant System**.

---

# 10. Practice Starting Checkpoints

Every workflow lesson must declare a starting checkpoint.

Rule:

> A lesson should start immediately before the concept it teaches.

Examples:

- Crown Contacts → nearly finished crown.
- Complete Denture Gingiva Sculpt → bases already generated.
- RPD Clasp lesson → survey + connector + rests already present.
- Implant Restorative Axis → implant/abutment/crown context already present.
- Capstone lessons → original case.

Opening an advanced lesson must not require repeating unrelated earlier work.

---

# 11. Design Check Rules

Design Check should validate measurable training criteria.

It must **not** claim clinical approval.

Use wording such as:

> “Meets this exercise’s design criteria.”

Valid checks may include:

- required object exists;
- required margin exists and is closed;
- correct case object assigned;
- connection exists;
- geometric intersection;
- proximity/contact;
- distance;
- thickness;
- angular deviation;
- reference-surface deviation;
- required workflow components present.

Any numeric criterion should be labeled:

> **Target for this exercise**

unless a validated source explicitly supports a broader claim.

---

# 12. Free Lab UX Rules

```text
Free Lab
→ Select Workflow
→ Select Case
→ Review Lab Order
→ Open in CAD
→ Work Independently
→ Save / Duplicate / Export
```

Each case card should show:

- workflow;
- case ID;
- target tooth/arch where relevant;
- difficulty;
- short indication;
- 3D preview or thumbnail;
- provided records;
- required output.

Random Case may select from the same 26-case library.

---

# 13. Sculpting Rules

Sculpt should work on realistic anatomy.

For posterior teeth, expose meaningful anatomy-oriented use of:

- Add;
- Remove;
- Smooth;
- Morph;
- Groove.

Practice may highlight anatomy regions such as:

- cusps;
- central groove;
- marginal ridges;
- buccal/lingual contours.

The system should teach the user what is being shaped, not only which generic mesh brush is active.

---

# 14. Clinical / Educational Boundaries

Prostheia must remain clearly educational.

Do not claim:

- clinical approval;
- manufacturing validity;
- patient-specific fit;
- clinically correct VDO/CR;
- certified implant planning;
- certified occlusion;
- universal material-specific numeric thresholds.

Where clinical judgments are approximated for a training scenario, label them as exercise-specific.

---

# 15. Expert Review Requirement

Before the final product is presented as a serious educational dental-prosthetics trainer, review:

- terminology;
- workflow order;
- object naming;
- component relationships;
- exercise criteria;
- educational explanations.

Clinical expert review should focus on content accuracy, not software architecture.

---

# 16. Implementation Phases

These are owner-requested product phases to complete **before Phase 28**.

## R0 — Audit & Freeze Current Dental Content

### Goal
Create a baseline of what currently exists.

### Tasks
- inventory current Practice modules;
- inventory Free Lab scenarios;
- inventory current 3D assets;
- identify generic placeholder/cylinder-based dental cases;
- map existing tools to target workflows;
- record lesson/scenario/validator IDs;
- preserve functioning CAD engine behavior.

### Deliverable
`DENTAL-REALISM-AUDIT.md`

### Done when
Every current lesson/scenario is mapped to keep, replace asset, replace checkpoint, rewrite content, or retire.

---

## R1 — Shared Case Package & Asset Registry

### Goal
Create the technical foundation for realistic cases.

### Tasks
- define Case Package manifest;
- define semantic object roles;
- define checkpoint reference model;
- define asset provenance fields;
- define master/runtime mesh relationship;
- preserve stable IDs;
- integrate with geometry registry and snapshots.

### Done when
A Crown case can be loaded from the new package format without a special hardcoded scene.

---

## R2 — Anatomy Library v1

### Goal
Replace placeholder geometry with a legal reusable anatomical foundation.

### Tasks
- permanent tooth library;
- initial denture tooth set;
- prepared-tooth assets;
- gingiva/arch assets;
- quality/provenance metadata;
- browser optimization;
- semantic segmentation;
- reference examples.

### Must not do
- use proprietary exocad/3Shape models;
- use unknown-license assets;
- procedurally approximate real teeth with primitives.

### Done when
Crown, Bridge and Denture workflows can use realistic anatomical assets.

---

## R3 — Fixed Prosthetics Realism

### Workflows
- Crown;
- Bridge;
- Inlay;
- Onlay;
- Veneer.

### Tasks
- realistic prepared cases;
- workflow-specific Scene objects;
- correct starting checkpoints;
- anatomy proposal from Tooth Library;
- margins/insertion context;
- pontic/connectors for Bridge;
- indication-specific preparations;
- reference results;
- updated Design Checks.

### Free Lab cases added
- Crown ×4;
- Bridge ×2;
- Inlay ×2;
- Onlay ×2;
- Veneer ×2.

**Subtotal: 12 Free Lab cases.**

### Done when
No fixed-restoration Free Lab or advanced Practice case depends on placeholder cylinders.

---

## R4 — Complete Denture Realism

### Goal
Create a real denture laboratory workflow.

### Tasks
- realistic edentulous maxilla/mandible;
- jaw relation;
- model-analysis references;
- occlusal plane;
- denture tooth library;
- arch/chain/individual setup;
- base boundary;
- generated denture base;
- base-to-teeth adaptation;
- gingiva/polished-surface sculpt;
- static occlusion;
- Practice checkpoints;
- references.

### Free Lab cases added
- Complete Denture ×3.

**Running total: 15.**

### Done when
A user can start with edentulous arches and end with upper/lower dentures without generic training geometry.

---

## R5 — Partial Denture / RPD Realism

### Goal
Build a real surveying-to-framework training flow.

### Tasks
- Kennedy I–IV anatomical cases;
- Survey mode;
- insertion path;
- height-of-contour / undercut visualization;
- blockout;
- major connector;
- rests;
- clasps;
- minor connectors;
- mesh/saddle retention;
- finish lines;
- framework build;
- relationship visualization;
- Practice checkpoints.

### Free Lab cases added
- Kennedy I ×1;
- Kennedy II ×1;
- Kennedy III ×1;
- Kennedy IV ×1.

**Running total: 19.**

### Done when
Each Kennedy class is a genuinely different anatomical/workflow case.

---

## R6 — Splint, Digital Model & Articulator Realism

### Bite Splint
- real upper/lower scans;
- bite relation;
- boundary;
- inner/outer surface;
- thickness;
- antagonist contact.

### Digital Model
- raw scan-like datasets;
- trim;
- cleanup;
- fill holes;
- orientation;
- base;
- optional die;
- immutable raw source.

### Virtual Articulator
- reuse realistic cases;
- upper fixed/lower moving;
- synthetic motion;
- dynamic contact analysis;
- restoration re-check flow.

### Free Lab cases added
- Bite Splint ×2;
- Digital Model ×3.

**Running total: 24.**

---

## R7 — Implant-Supported Prosthetics Realism

### Goal
Replace generic implant placeholders with a real restorative implant context.

### Tasks
- synthetic Prostheia implant system;
- realistic implant site;
- gingiva;
- scan body;
- implant fixture;
- implant axis;
- emergence profile;
- custom abutment;
- restorative axis;
- crown anatomy;
- screw channel;
- section/distance/angle analysis;
- Practice checkpoints.

### Free Lab cases added
- Implant ×2.

**Final v1 total: 26 Free Lab cases.**

### Done when
Advanced implant lessons no longer start from generic cylinders.

---

## R8 — Practice Checkpoint Overhaul

### Goal
Every lesson opens at the correct stage of the workflow.

### Tasks
- define checkpoint for every realistic Practice lesson;
- remove shared generic starting scene where inappropriate;
- preserve progress logic;
- preserve attempt history;
- preserve Design Check;
- verify direct entry into any lesson;
- add capstone cases that start from original records.

### Done when
Opening an advanced lesson never requires repeating unrelated earlier work.

---

## R9 — Free Lab Case Library UX

### Goal
Make independent practice a first-class feature.

### Tasks
- Training Case Library page;
- category filtering;
- difficulty filtering;
- case cards/previews;
- Lab Order;
- case metadata;
- Open in Free Lab;
- Random Case;
- duplicate/save/reopen;
- Import My Case remains separate;
- Blank Workspace remains separate.

### Done when
The user can independently select and complete any of the 26 built-in cases.

---

## R10 — Workflow-Specific CAD Presentation

### Goal
The shared CAD engine should clearly communicate the current dental job.

### Tasks
- workflow header;
- object-role Scene grouping;
- source/design/guide/reference labels;
- contextual tools;
- workflow-specific Scene labels;
- Practice Learning Guide;
- separate Properties inspector;
- Free Lab Case Brief;
- “What am I building?” context;
- before/after where useful.

### Done when
A new user can answer:
1. What case am I working on?
2. What did I receive?
3. What am I making?
4. What object am I editing?
5. What workflow stage am I in?

---

## R11 — Dental Design Check Mapping

### Goal
Make validations workflow-specific and measurable.

### Tasks
- map each lesson/scenario to real geometry checks;
- eliminate fake/generic success criteria;
- label exercise-specific numeric thresholds;
- use real contact/proximity/thickness/deviation where available;
- ensure Free Lab does not become gated Practice.

### Done when
Design Check feedback refers to the real case objects and workflow.

---

## R12 — Expert Content Review

### Goal
Validate educational dental logic.

### Review scope
- workflow order;
- terminology;
- component roles;
- case realism;
- lesson instructions;
- exercise targets;
- important dental explanations.

### Output
`DENTAL-EXPERT-REVIEW.md`

---

## R13 — Asset / Browser Performance QA

### Goal
High anatomical quality without making the browser CAD unusable.

### Tasks
- runtime mesh optimization;
- master/runtime comparison;
- BVH generation;
- worker loading;
- memory profiling;
- case-switch testing;
- large asset recovery;
- screenshot/export verification;
- desktop ≥1280 verification.

---

## R14 — Realism Integration QA

### Goal
Validate the whole product before Phase 28.

### Required walkthroughs
- Crown Practice;
- Crown Free Lab;
- Complete Denture Practice;
- Complete Denture Free Lab;
- Kennedy I RPD;
- Kennedy IV RPD;
- Bite Splint;
- Digital Model;
- Virtual Articulator;
- Implant Practice;
- Implant Free Lab;
- save/reopen;
- recovery;
- export;
- EN/SR.

### Done when
Dental Realism Overhaul has no known blocking workflow or asset issue.

---

# 17. Phase 27 / Phase 28 Relationship

Order:

```text
Finish remaining Phase 27 reliability blockers
↓
Dental Realism Overhaul R0–R14
↓
Final UI/UX polish discovered during realistic-case testing
↓
Phase 28 — Final QA / Production
↓
Production deploy
```

Do **not** start Phase 28 before the realism overhaul is integrated.

---

# 18. Definition of v1 Product Complete

Prostheia v1 can be treated as product-complete when:

- Phase 27 blockers are closed;
- realistic dental cases replace generic advanced placeholders;
- Anatomy Library v1 exists;
- 26 Free Lab cases exist and work;
- Practice uses lesson-specific checkpoints;
- Free Lab supports independent work;
- workflow-specific Scene semantics exist;
- Design Check is mapped to real workflow objects;
- EN/SR works;
- save/recovery/export work on realistic cases;
- dental content has received appropriate expert review;
- Phase 28 passes;
- production deployment is complete.

---

# 19. Post-v1 / Future Work

Do not block v1 on:

- 40–60+ Free Lab cases;
- multiple denture tooth libraries;
- advanced smile design;
- CBCT implant planning;
- surgical guides;
- patient-specific jaw-motion capture;
- real commercial implant libraries;
- manufacturing certification;
- clinical validation.

These belong to v1.1 / v2.

---

# 20. Final Product Mental Model

## Practice

> **Teach me how this dental workflow works.**

## Free Lab — Training Case Library

> **Give me a realistic case. I will do it myself.**

## Free Lab — Import My Case

> **I will bring my own geometry and use Prostheia tools.**

## My Cases

> **Show me my saved work and let me continue.**

## Virtual Articulator

> **Let me analyze how the current design behaves through motion.**

The final objective is that a student can go from:

> “I do not know what these CAD tools are for.”

to:

> “I understand what the laboratory received, what I need to design, why each workflow step exists, and how the final prosthetic object is built.”
