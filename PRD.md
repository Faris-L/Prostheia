# Prostheia — Product Requirements Document (PRD)

> **Document type:** Product Requirements Document  
> **Product:** Prostheia  
> **Subtitle:** Digital Dental Design Studio  
> **Source of truth:** `plan.md`  
> **Status:** Product definition for implementation planning  
> **Audience:** Product, Design, Engineering, QA, Content/Admin  
> **Next documents:** `TECH.md`, `DB.md`

---

# 1. Executive Summary

Prostheia is a **browser-based dental CAD application with an integrated learning system** designed primarily for dental prosthetics students and beginner dental technicians.

The product combines two modes inside the same professional CAD workspace:

1. **Practice** — structured, guided learning through realistic dental CAD exercises.
2. **Free Lab** — independent work using realistic scenarios, imported dental models, or a blank workspace.

The core product idea is not to create a generic learning website with a 3D viewer. Prostheia should behave like a serious dental CAD environment and teach the user through the same categories of tools, terminology, workflows, and geometric reasoning used in professional dental CAD systems.

The product must help a user understand:

- what each CAD tool does;
- why the tool is used;
- how it changes dental geometry;
- how to inspect the result;
- how to identify problems;
- how to repeat the same workflow independently without step-by-step guidance.

The product is educational and practice-oriented. It is **not clinically validated software** and must not claim suitability for direct patient treatment or manufacturing without independent professional validation.

---

# 2. Product Purpose

## 2.1 Problem

Dental prosthetics students may observe experienced technicians working in professional CAD systems before they have regular access to those tools or enough confidence to use them independently.

Professional dental CAD software is often:

- expensive;
- complex;
- designed for trained technicians;
- dense with technical terminology;
- difficult for beginners to explore safely;
- focused on production rather than structured learning.

A student may understand dental prosthetics concepts but still struggle with:

- 3D navigation;
- object manipulation;
- digital tooth setup;
- scan preparation;
- sculpting;
- margin definition;
- insertion path;
- undercuts;
- occlusion;
- contact analysis;
- thickness analysis;
- complete denture workflows;
- partial denture frameworks;
- crown and bridge design.

There is a gap between:

> “I understand this concept theoretically”

and:

> “I can perform this workflow confidently in a digital CAD environment.”

Prostheia is intended to address that gap.

---

## 2.2 Product Mission

Provide a professional-feeling, browser-based environment where dental prosthetics students and beginner technicians can:

- learn digital CAD workflows;
- understand individual CAD tools;
- practice with realistic dental models;
- receive useful geometric feedback;
- repeat exercises freely;
- work independently on cases;
- build confidence before or alongside work in professional dental CAD systems.

---

# 3. Product Positioning

Prostheia is:

> **A browser-based dental CAD design environment for learning and independent practice.**

It is not positioned as:

- a game;
- a quiz platform;
- a generic online course;
- a dental encyclopedia;
- a patient management system;
- a dental clinic CRM;
- a manufacturing-grade certified CAD/CAM replacement;
- a direct clone of exocad or 3Shape.

The interaction model may be inspired by professional dental CAD applications, but Prostheia must maintain its own product identity, visual language, codebase, assets, and educational structure.

---

# 4. Product Goals

## 4.1 Primary Goals

Prostheia must:

1. Provide a professional 3D dental CAD workspace in the browser.
2. Teach CAD tools contextually instead of through long theoretical lessons.
3. Provide structured Practice lessons ordered by difficulty.
4. Allow users to enter any Practice level without hard locking.
5. Provide Free Lab for independent work.
6. Use the same CAD engine in Practice and Free Lab.
7. Support realistic dental scenarios and imperfect models.
8. Provide meaningful geometric analysis and design feedback.
9. Allow users to import supported dental model files.
10. Allow users to export supported geometry.
11. Track progress by skill area.
12. Support Serbian and English.
13. Allow administrators to add and configure learning content without changing source code for every case.
14. Maintain clear educational/clinical boundaries.

---

## 4.2 Secondary Goals

The product should also:

- be strong enough to serve as a serious developer portfolio project;
- demonstrate advanced frontend, 3D, geometry, state-management, data, and product-design capabilities;
- provide a foundation that can grow without replacing the core architecture;
- maintain high-quality UX despite CAD complexity.

---

# 5. Non-Goals

The following are explicitly outside the current product scope:

- clinic CRM;
- appointment scheduling;
- invoicing;
- messaging/chat;
- social features;
- marketplace;
- patient diagnosis;
- treatment planning;
- surgical planning;
- milling-machine control;
- CAM manufacturing workflow;
- regulatory certification;
- medical-device claims;
- mobile CAD editing;
- AI chatbot;
- AI tutor;
- AI diagnosis;
- AI-generated treatment recommendations;
- gamification systems such as XP, coins, streaks, stars, or level-up mechanics.

---

# 6. Target Users

## 6.1 Primary User — Dental Prosthetics Student

### Profile

A student who:

- studies dental prosthetics / dental technology;
- understands some theoretical concepts;
- may have observed professional technicians;
- may have limited CAD experience;
- may not have regular access to professional dental CAD software;
- needs repeated hands-on practice.

### Main Needs

- understand basic CAD controls;
- learn professional terminology;
- practice without fear of breaking a real production case;
- understand why specific tools are used;
- repeat the same exercise multiple times;
- compare work with a reference;
- gradually perform complete workflows independently.

---

## 6.2 Secondary User — Beginner Dental Technician

### Profile

A technician who:

- has some practical or laboratory knowledge;
- may be transitioning to digital workflows;
- wants a sandbox for repeated practice;
- may already understand prosthetic terminology but not digital CAD tools.

### Main Needs

- learn digital workflow logic;
- practice common case types;
- use Free Lab independently;
- import personal practice models;
- inspect geometric relationships;
- improve consistency.

---

## 6.3 Administrative User — Content Administrator

### Profile

A product owner, educator, technician, or authorized administrator responsible for Prostheia content.

### Main Needs

- create lessons;
- create scenarios;
- upload models;
- upload reference geometry;
- configure difficulty;
- define tool availability;
- configure hints;
- configure validation rules;
- update content without changing application source code for routine content changes.

---

# 7. User Roles and Permissions

## 7.1 Authenticated User

Can:

- access Dashboard;
- access Practice;
- access Free Lab;
- open scenarios;
- create cases;
- import supported models;
- use CAD tools;
- save projects;
- restore local recovery data;
- create checkpoints;
- export supported geometry;
- view progress;
- view contextual tool help;
- retry lessons;
- access any difficulty level;
- capture and annotate screenshots.

Cannot:

- modify platform-wide lesson definitions;
- change validation rules;
- upload global platform assets;
- access admin content tools.

---

## 7.2 Administrator

Has all regular user permissions plus:

- create/edit/archive Practice modules;
- create/edit/archive lessons;
- create/edit/archive scenarios;
- upload/manage models;
- upload/manage references;
- configure allowed tools;
- configure lesson steps;
- configure hints;
- configure difficulty metadata;
- configure reusable validation rules;
- configure scenario briefs;
- manage published content state.

Administrative capability must be access-controlled.

---

# 8. Authentication Requirements

- Users must authenticate before accessing Practice or Free Lab.
- Anonymous CAD use is not required.
- Authentication should support persistent user progress and saved cases.
- The product must distinguish standard users from administrators.
- Authentication implementation details belong in `TECH.md` and `DB.md`.

---

# 9. Information Architecture

Primary authenticated navigation:

```text
Dashboard
Practice
Free Lab
My Cases
My Designs
Progress
```

Administrative navigation:

```text
Admin
├── Lessons
├── Cases / Scenarios
├── Models
├── References
├── Validation Rules
└── Content Configuration
```

The product does **not** require a separate global Tool Guide page in the current scope.

Tool explanations are contextual inside the CAD workspace.

---

# 10. Dashboard Requirements

The Dashboard must present Practice and Free Lab with similar importance.

The user should be able to quickly:

- continue the most recent Practice lesson;
- open Practice;
- start a new Free Lab case;
- continue a recent case;
- view recent progress;
- see recent saved work.

Recommended beginner guidance may appear:

> New to digital CAD?  
> Recommended: Foundation → CAD Controls

This guidance must not block access to other content.

---

# 11. Practice Product Requirements

## 11.1 Practice Philosophy

Practice must provide structured learning inside the real CAD workspace.

Practice must not be a separate simplified editor.

All meaningful CAD tools used in Practice should be the same tools available in Free Lab.

---

## 11.2 Practice Difficulty Structure

Required levels:

1. Foundation
2. Beginner
3. Intermediate
4. Advanced

Rules:

- all levels remain accessible;
- no mandatory global progression lock;
- users may repeat lessons;
- users may enter harder lessons before completing prerequisites;
- harder lessons may show prerequisite warnings;
- users may choose “Start anyway.”

---

## 11.3 Guided Lesson Rules

Inside an individual guided lesson:

- required steps are sequential;
- users cannot skip mandatory steps;
- lessons may restrict available tools;
- lessons may enable only tools relevant to the current task;
- hints are available where configured;
- contextual explanations are available;
- reference access can vary by difficulty;
- Design Check validates the result;
- users can retry.

---

## 11.4 Lesson Duration

Practice must support:

### Short Tool Lessons
Typical duration: 2–5 minutes.

Purpose:

- learn one CAD operation;
- understand one concept;
- perform one focused interaction.

### Workflow Lessons
Typical duration: 5–20 minutes.

Purpose:

- combine several tools;
- learn a realistic workflow segment.

### Full Cases
No artificial short duration requirement.

Purpose:

- perform a realistic multi-step case;
- combine learned concepts;
- prepare for independent Free Lab work.

---

# 12. Practice Curriculum Requirements

The Practice system must be able to support the following major areas.

---

## 12.1 CAD Foundations

Required learning topics:

- Orbit
- Pan
- Zoom
- Standard views
- Perspective and orthographic views
- Object selection
- Multi-selection
- Scene tree
- Hide/show
- Isolate
- Transparency
- Move
- Rotate
- Scale
- Numeric transforms
- Fine movement
- Snapping
- Translation steps
- Rotation steps
- Measurement
- Section view
- FDI tooth numbering
- Undo
- Redo
- History basics
- Keyboard shortcuts

---

## 12.2 Scan and Model Preparation

Required learning topics:

- model orientation;
- arch identification;
- jaw alignment;
- trim;
- mesh-region selection;
- delete;
- artifact cleanup;
- fill holes;
- smooth;
- mesh inspection;
- occlusal plane;
- model base creation;
- removable die preparation;
- final model review.

Cases should include both:

- clean models;
- intentionally imperfect scans.

---

## 12.3 Sculpting

Required tools:

- Add
- Remove
- Smooth
- Flatten
- Morph

Required controls:

- brush size;
- brush strength.

Potential advanced controls may include falloff if useful.

Required lesson examples:

- add material;
- remove material;
- smooth;
- flatten;
- morph;
- cusp correction;
- fissure correction;
- ridge correction;
- restore damaged anatomy;
- match reference anatomy.

---

## 12.4 Crown

Required workflow support:

```text
Import / Scan
→ Margin
→ Insertion Path
→ Internal Surface / Spacer
→ Tooth Library
→ Initial Placement
→ Approximal Contacts
→ Occlusal Contacts
→ Sculpt
→ Thickness
→ Final Validation
```

Required exercise types include:

- posterior crown;
- anterior crown;
- margin identification;
- margin correction;
- insertion path;
- undercut review;
- library selection;
- tooth placement;
- adjacent contact adjustment;
- occlusal adjustment;
- sculpting;
- minimum thickness;
- complete crown case.

---

## 12.5 Bridge

Required concepts:

- abutment units;
- pontics;
- connectors;
- gingival relationship;
- connector placement;
- connector shape;
- connector thickness;
- multi-unit movement;
- adjacent contacts;
- occlusion;
- sculpting;
- final validation.

---

## 12.6 Inlay / Onlay / Veneer

Required case support:

- Inlay
- Onlay
- Veneer

Required learning concepts:

- margin;
- insertion path;
- anatomy;
- contacts;
- thickness;
- final validation.

---

## 12.7 Complete Denture

This is a major product area.

Required learning categories:

### Model Analysis
- reference landmarks;
- midline;
- occlusal plane;
- arch analysis;
- anatomical region identification.

### Tooth Selection
- anterior sets;
- posterior sets;
- tooth-form comparison;
- educational tooth library.

### Anterior Setup
- central incisors;
- lateral incisors;
- canines;
- complete anterior segment.

### Posterior Setup
- premolars;
- molars;
- posterior segments;
- bilateral setup.

### Tooth Manipulation Modes

Required:

**Arch Mode**
- move arch;
- rotate arch;
- scale arch;
- widen/narrow.

**Chain Mode**
- move linked teeth while maintaining defined relationships.

**Individual Mode**
- move;
- rotate;
- scale individual tooth.

### Occlusion
- collision review;
- proximal contacts;
- antagonist contacts;
- severe intersection correction;
- bilateral review;
- articulator movements.

### Denture Base
- define boundary;
- generate base;
- edit border;
- add/remove material;
- smooth;
- gingival sculpting;
- thickness analysis;
- adapt base to teeth;
- tooth sockets.

### Full Case Types
- upper complete denture;
- lower complete denture;
- upper + lower;
- single upper with natural lower;
- difficult setup;
- imperfect scan.

---

## 12.8 Partial Denture

Required learning concepts:

- survey;
- insertion path;
- undercuts;
- blockout;
- framework design.

Required operations:

- major connector;
- lingual bar;
- retention mesh;
- clasp;
- minor connector;
- rest;
- guide plane;
- finish line;
- relief;
- framework smoothing.

Required scenario families:

- Kennedy Class I
- Kennedy Class II
- Kennedy Class III
- Kennedy Class IV

---

## 12.9 Bite Splint

Required learning topics:

- insertion direction;
- undercut inspection;
- retention;
- internal surface;
- margin;
- thickness;
- upper surface sculpting;
- static occlusion;
- dynamic occlusion;
- final validation.

---

## 12.10 Digital Model

Required learning topics:

- trim;
- orientation;
- model base;
- removable die;
- attachments;
- final printable model review.

---

## 12.11 Implant Practice

Implant-related content is classified as Advanced.

Potential lesson scope:

- scan body matching;
- implant-position visualization;
- emergence profile;
- custom abutment;
- tooth placement;
- screw channel;
- screw-retained crown;
- crown on abutment;
- final review.

The product must not imply clinical validation.

---

# 13. Contextual Learning Requirements

The product must explain tools where the user uses them.

The CAD viewport must remain the primary visual area.

Help should not dominate the screen.

---

## 13.1 Tooltip

Each important tool should provide a concise tooltip.

Example:

```text
Insertion Path

Defines the direction in which the restoration
is intended to seat onto the preparation.
```

---

## 13.2 Contextual Help Panel

The user can open a floating or pinnable help panel.

The panel should support:

- tool name;
- English term;
- Serbian explanation;
- what the tool does;
- why it matters;
- how to use it;
- common mistakes;
- interactive example where available.

The panel must be:

- closeable;
- pinnable;
- compact enough not to replace the viewport.

---

## 13.3 Interactive Examples

Where practical, explain difficult tools using interactive 3D demonstrations.

Examples:

### Insertion Path
- show correct seating direction;
- change the direction;
- visualize undercut changes.

### Sculpt
- add material;
- remove material;
- smooth material.

Interactive examples are preferred over long video tutorials.

---

# 14. Practice Validation Requirements

The primary result format must be a professional **Design Check**.

Example:

```text
DESIGN CHECK

✓ Margin continuous
✓ Minimum thickness passed
! Distal contact requires review
! Occlusal interference detected
✓ No mesh holes

[ Show issue ]
[ Compare with reference ]
[ View deviation ]
```

Validation should focus on actionable geometry and workflow feedback.

---

## 14.1 Secondary Score

A 0–100 score may exist.

Rules:

- score is secondary;
- score must not dominate result UI;
- no gamified presentation;
- score should appear below technical feedback or in detailed results.

Example:

> Technical score: 84 / 100

---

## 14.2 Reference Models

Reference display modes may include:

- Off
- Outline
- Transparent
- Full

Reference access should vary by difficulty.

### Foundation / Beginner
Reference is easier to access.

### Intermediate
Reference may be partially restricted.

### Advanced
Reference may become available mainly after attempt/submission.

---

## 14.3 Deviation View

Where technically supported, compare user geometry with reference geometry.

Deviation should be visualized spatially.

Deviation is an educational comparison, not automatically a clinical quality metric.

---

# 15. Free Lab Requirements

Free Lab provides independent work without guided workflow instructions.

The user has three entry paths:

1. Choose Scenario
2. Import My Case
3. Blank Workspace

Once started, a Free Lab case does not convert into a guided Practice lesson.

Contextual tool help remains available.

---

# 16. Scenario Library Requirements

The scenario library should support repeated realistic practice.

Required metadata may include:

- category;
- indication;
- jaw;
- tooth/teeth;
- difficulty;
- available files;
- material preset;
- brief;
- relevant case requirements.

Required difficulty labels:

- Beginner
- Intermediate
- Advanced

The scenario library should support enough content to avoid feeling like a one-demo system.

---

# 17. Scenario Brief Requirements

Free Lab scenarios should resemble professional laboratory work orders.

Example:

```text
CASE CR-026

Patient ID
P-1042

Age
46

Indication
Full-contour crown

Tooth
26

Material preset
Zirconia

Available data
✓ Prepared tooth
✓ Adjacent teeth
✓ Antagonist
✓ Bite

Requirements
Restore anatomical form.
Review proximal contacts.
Review occlusal contacts.
Check minimum thickness.
```

Rules:

- use fictional/anonymized Patient IDs;
- include only relevant information;
- do not store real identifying patient data in platform-provided scenarios.

---

# 18. Random Case Requirement

Free Lab must provide:

> Give me something to practice

The user selects:

- category;
- difficulty.

The system selects a matching scenario.

---

# 19. Import Requirements

Target supported file formats:

- STL
- OBJ
- PLY
- GLB where appropriate

Import must use a guided import workflow.

Required conceptual steps:

```text
Upload
→ Identify Object / Arch
→ Orientation
→ Alignment
→ Cleanup
→ Review
→ Workspace
```

Supported object classifications may include:

- Maxilla
- Mandible
- Antagonist
- Pre-op
- Individual tooth
- Reference
- Restoration
- Other mesh

---

# 20. CAD Workspace Requirements

The editor is a professional desktop CAD interface.

Recommended layout:

```text
┌────────────────────────────────────────────────────────────────────┐
│ File Edit View Analyze                 Undo Redo Save Export       │
├───────────────┬────────────────────────────────┬───────────────────┤
│ SCENE         │                                │ PROPERTIES        │
│               │                                │                   │
│ Maxilla       │                                │ Selected object   │
│ Mandible      │          3D VIEWPORT           │ Position          │
│ Crown         │                                │ Rotation          │
│ Reference     │                                │ Scale             │
│               │                                │ Contacts          │
│               │                                │ Thickness         │
├───────────────┴────────────────────────────────┴───────────────────┤
│ Contextual CAD toolbar                                              │
└────────────────────────────────────────────────────────────────────┘
```

Requirements:

- viewport is primary;
- Scene panel on the left;
- contextual Properties panel on the right;
- contextual toolbar;
- dense but organized UI;
- professional technical appearance;
- avoid excessive visual clutter.

---

# 21. Contextual Tool Requirements

Visible tools depend on selected object and workflow.

Examples:

### Selected Tooth
- Move
- Rotate
- Scale
- Morph
- Contacts

### Selected Crown
- Margin
- Insertion
- Contacts
- Thickness
- Sculpt

### Selected Scan
- Trim
- Select
- Delete
- Fill Hole
- Smooth
- Align

Practice may further restrict tool availability by lesson.

Free Lab should expose the complete relevant tool set.

---

# 22. Transform Requirements

Object manipulation must support:

- 3D transform gizmo;
- X/Y/Z movement;
- X/Y/Z rotation;
- scale;
- direct numeric entry;
- snapping;
- fine movement;
- configurable translation step;
- configurable rotation step.

Example translation increments:

- Free
- 0.1 mm
- 0.5 mm
- 1.0 mm

Example rotation increments:

- Free
- 0.5°
- 1°
- 5°

---

# 23. Keyboard Shortcut Requirements

The editor should support serious keyboard-first interaction.

Required shortcut areas:

- Undo
- Redo
- Save
- Delete
- Hide/show
- Isolate
- View controls
- Select
- Move
- Rotate
- Scale

Additional tool-specific shortcuts may be added.

Shortcut labels should appear in tooltips where relevant.

---

# 24. Core CAD Tool Requirements

## 24.1 View and Scene

Required:

- orbit;
- pan;
- zoom;
- standard views;
- perspective;
- orthographic;
- hide/show;
- isolate;
- transparency;
- scene tree;
- selection.

---

## 24.2 Mesh Preparation

Required direction:

- region selection;
- trim;
- delete;
- fill hole;
- smooth;
- cleanup;
- duplicate;
- mirror where relevant;
- orientation;
- alignment.

---

## 24.3 Sculpt

Required:

- Add
- Remove
- Smooth
- Flatten
- Morph
- Brush Size
- Brush Strength

---

## 24.4 Curves and Boundaries

The platform must support domain-specific curves/boundaries such as:

- margin;
- denture base boundary;
- framework outline;
- finish line.

---

## 24.5 Boolean Operations

Target operations:

- Union
- Subtract
- Intersection

---

## 24.6 Measurement

Required direction:

- distance;
- angle;
- section;
- object dimensions.

---

# 25. Analysis Requirements

The product must distinguish itself from a generic 3D editor through dental analysis tools.

Required direction:

- Contacts
- Occlusion
- Thickness
- Distances
- Section
- Undercuts
- Intersections
- Symmetry where useful
- Insertion Path
- Reference Deviation

---

## 25.1 Contact Visualization

The UI should differentiate:

- intersection;
- strong contact;
- near contact;
- separation.

Thresholds must be configurable per case/preset.

Do not present thresholds as universal clinical facts unless validated.

---

## 25.2 Thickness Analysis

Thickness visualization should help identify:

- acceptable areas;
- thin areas;
- potentially problematic areas.

Thresholds may depend on:

- case;
- material preset;
- exercise configuration.

---

## 25.3 Undercut Analysis

Required for workflows including:

- crowns;
- partial dentures;
- splints;
- other insertion-path-dependent designs.

Changing insertion direction should update the analysis.

---

## 25.4 Section View

The user must be able to inspect virtual cross-sections through geometry.

---

## 25.5 Intersections

The application should detect geometric collisions where technically feasible.

Examples:

- restoration vs adjacent tooth;
- restoration vs antagonist;
- tooth vs denture base;
- framework vs model.

---

# 26. Virtual Articulator Requirements

Target functionality:

- Open / Close
- Protrusion
- Left lateral
- Right lateral
- Contact visualization during motion

The product must present this as an educational representation.

Do not claim perfect patient-specific biomechanics without validated patient-specific inputs.

---

# 27. Automatic Tool Requirements

Professional-style automatic functions are allowed.

Examples:

- Auto Detect Margin
- Auto Align
- Auto tooth-placement suggestion
- Auto base generation
- Auto mesh repair

Business rule:

> Automation may assist the user, but Practice must be able to disable it when the learning objective requires manual understanding.

---

# 28. Saving Requirements

## 28.1 Cloud Save

Official project save is manual.

Required:

- Save
- Save As

---

## 28.2 Local Recovery

The application must maintain local recovery state to reduce accidental data loss.

Example:

```text
Unsaved work was found.

Posterior Crown 26
Recovered 2 minutes ago.

[ Restore ]
[ Discard ]
```

Local recovery does not count as a formal cloud save.

---

## 28.3 Checkpoints

Required:

- Duplicate Case
- Named Checkpoint

Example:

> Before occlusion adjustment

---

## 28.4 Undo / Redo

Required:

- multi-step Undo;
- multi-step Redo;
- reset current tool operation where practical.

---

# 29. Export Requirements

Target formats:

- STL
- OBJ
- GLB where meaningful

The user should be able to choose which components to export.

Example:

```text
☑ Upper
☑ Lower
☑ Teeth
☑ Base
☐ Reference
```

Relevant UI must include an educational-use notice.

---

# 30. Screenshot and Annotation Requirements

Required direction:

- Capture View
- Save capture
- Annotate screenshot

Annotation tools may include:

- arrow;
- circle;
- text;
- highlight.

A general notes system is not required.

---

# 31. Progress Requirements

Progress is skill-based rather than game-based.

Example skill categories:

- CAD Navigation
- Sculpting
- Scan Preparation
- Crown
- Bridge
- Complete Denture
- Partial Denture
- Occlusion
- Surveying
- Models
- Splints
- Implants

Practice overview should display completion per module.

Example:

```text
CAD Foundations            12 / 12
Scan Preparation            7 / 10
Sculpting                   6 / 10
Crowns                      8 / 16
Bridges                     1 / 11
Complete Dentures           4 / 18
Partial Dentures            0 / 15
Splints                     0 / 10
Digital Models              2 / 6
Implants                    0 / 9
```

User-facing lesson history should prioritize the best result.

The underlying system may store multiple attempts for future analytics and progress logic.

---

# 32. Gamification Rules

Do not emphasize gamification.

Do not use:

- XP;
- coins;
- stars;
- streaks;
- confetti;
- “level up” language;
- competitive ranking.

Difficulty is educational, not gamified.

---

# 33. Language Requirements

The product must support:

- Serbian
- English

Professional English terminology should remain visible even when the explanation is Serbian.

Preferred pattern:

> **Insertion Path — put insercije**

This helps users recognize terminology they may later encounter in professional software.

---

# 34. Design Requirements

## 34.1 Visual Direction

Combine:

- professional CAD density;
- modern SaaS polish.

Target characteristics:

- neutral professional palette;
- one accent color;
- premium technical appearance;
- clean hierarchy;
- compact controls;
- strong viewport emphasis.

Avoid:

- gaming aesthetic;
- overly playful education design;
- excessive medical-white styling;
- decorative complexity that reduces workspace efficiency.

---

## 34.2 UI Component Direction

Use `shadcn/ui` for standard interface primitives such as:

- buttons;
- dialogs;
- dropdown menus;
- forms;
- tabs;
- popovers;
- tooltips;
- panels;
- command interfaces.

CAD-specific interaction controls may require custom components.

---

## 34.3 Theme Requirements

Support:

- Light
- Dark

The CAD viewport should use a neutral rendering environment suitable for inspecting geometry.

---

# 35. Device Requirements

The CAD editor is desktop-only.

Target behavior:

- functional from approximately 1280 px width;
- best experience at 1440 px and above;
- optimized for desktop mouse/keyboard interaction.

Mobile CAD editing is not required.

The public landing page may be responsive.

---

# 36. Landing Page Requirements

A professional marketing/portfolio landing page should exist.

Potential sections:

- Hero
- Product Overview
- Practice
- Free Lab
- CAD Tools
- Realistic Scenarios
- Learning Philosophy
- Screenshots / Product Preview
- Browser-based Workflow
- CTA

The landing page should position Prostheia as a serious product, not a personal gift website.

---

# 37. Admin Content Studio Requirements

The Admin system is a core product requirement.

The purpose is to allow content creation without hardcoding every lesson.

---

## 37.1 Case / Scenario Editor

Admin should be able to configure:

- case name;
- category;
- difficulty;
- Practice / Free Lab availability;
- description;
- learning goal;
- scenario brief;
- fictional patient metadata;
- 3D assets;
- reference assets;
- available tools;
- required steps;
- hints;
- material preset;
- validation rules;
- difficulty parameters;
- publication status.

---

## 37.2 Model Management

Admin should be able to upload/manage:

- STL
- OBJ
- PLY
- GLB

Asset role examples:

- maxilla;
- mandible;
- antagonist;
- restoration;
- tooth;
- reference;
- other.

---

## 37.3 Lesson Configuration

Admin should be able to configure:

- title;
- module;
- difficulty;
- learning goal;
- steps;
- enabled tools;
- hints;
- reference data;
- validation;
- scoring configuration;
- prerequisite recommendations.

---

## 37.4 Validation Configuration

Reusable validation types may include:

- object exists;
- required step completed;
- position range;
- rotation range;
- reference deviation;
- severe intersection absent;
- thickness threshold;
- contact threshold.

New geometry algorithms may still require engineering work.

The Admin system is not intended to be a universal no-code programming environment.

---

# 38. Difficulty Business Rules

Difficulty must affect the actual experience.

Potential factors:

- anatomy complexity;
- scan quality;
- missing/extra geometry;
- number of objects;
- number of steps;
- number of simultaneous design constraints;
- available hints;
- reference visibility;
- automatic tool availability.

### Foundation
- clean geometry;
- one tool at a time;
- strong guidance;
- easy reference access.

### Beginner
- limited complexity;
- clear goal;
- reference available.

### Intermediate
- realistic geometry;
- multiple tools;
- reduced assistance.

### Advanced
- complex case;
- imperfect scans;
- multiple dependencies;
- minimal guidance;
- delayed reference visibility.

---

# 39. Asset and Licensing Business Rules

Prostheia must not use proprietary commercial dental assets without permission.

Allowed asset sources:

- explicitly open-licensed assets;
- commercially permitted assets;
- internally created assets;
- synthetic models;
- commissioned educational models.

Each external dataset or model must be checked for:

- license;
- redistribution rights;
- modification rights;
- commercial/portfolio usage;
- attribution requirements.

“Publicly downloadable” does not automatically mean legally reusable.

---

# 40. Privacy Business Rules

Platform-provided scenarios must use fictional/anonymized patient information.

Users must be warned not to upload identifiable real patient data without appropriate authorization and anonymization.

The product should not require sensitive patient identity for its educational function.

---

# 41. Clinical and Safety Business Rules

Prostheia is for education and practice.

It must not claim:

- clinical validation;
- manufacturing validation;
- medical-device status;
- regulatory approval;
- patient-treatment correctness.

Required disclaimer:

> **Prostheia is intended for educational and practice use. Designs and measurements must not be used for clinical manufacturing without independent professional validation.**

Exercise-specific values must not be presented as universal medical facts unless supported by authoritative evidence and domain validation.

---

# 42. AI Business Rule

AI is not required in the current product.

Do not add AI merely for marketing.

Current product value comes from:

- CAD interaction;
- geometry;
- realistic workflows;
- analysis;
- contextual education;
- scenario repetition.

---

# 43. Offline Business Rule

Full offline operation is not required.

Required resilience:

- local unsaved-work recovery.

Internet may otherwise be required.

---

# 44. Core User Workflows

## 44.1 Practice Workflow

```text
Login
→ Dashboard
→ Practice
→ Choose Module
→ Choose Difficulty
→ Choose Lesson
→ Review Goal
→ Open CAD Workspace
→ Follow Required Steps
→ Use Contextual Help as Needed
→ Run Design Check
→ Review Issues
→ Compare Reference if Available
→ Retry or Complete
→ Save Result
→ Update Skill Progress
```

---

## 44.2 Free Lab Scenario Workflow

```text
Login
→ Dashboard
→ Free Lab
→ Choose Scenario
→ Filter Category / Difficulty
→ Read Laboratory-style Brief
→ Open Workspace
→ Work Independently
→ Analyze
→ Save
→ Create Checkpoint if Needed
→ Export
```

---

## 44.3 Imported Case Workflow

```text
Login
→ Free Lab
→ Import My Case
→ Upload Model
→ Identify Object / Arch
→ Orient
→ Upload Additional Model(s)
→ Align
→ Cleanup
→ Review
→ Create Case
→ Open Workspace
→ Work Independently
→ Save / Export
```

---

## 44.4 Blank Workspace Workflow

```text
Login
→ Free Lab
→ Blank Workspace
→ Create Empty Case
→ Import or Create Required Objects
→ Use CAD Tools Freely
→ Save / Export
```

---

## 44.5 Admin Content Workflow

```text
Admin Login
→ Admin
→ Create Lesson / Scenario
→ Configure Metadata
→ Upload Assets
→ Configure Tools
→ Configure Steps
→ Configure Validation
→ Add Hints / Reference
→ Preview
→ Publish
```

---

# 45. MVP Scope

## 45.1 MVP Definition

For Prostheia, **MVP does not mean a throwaway simplified product**.

MVP means:

> The smallest coherent release that proves the complete product model: professional shared CAD workspace + Practice + Free Lab + real geometry interaction + save/progress/content system.

The architecture must support expansion into the broader product defined in `plan.md`.

The MVP must not create separate temporary engines that will later be discarded.

---

## 45.2 MVP Must Include

### Product Foundation
- authentication;
- Dashboard;
- Practice navigation;
- Free Lab navigation;
- My Cases;
- Progress;
- Light/Dark theme;
- desktop CAD shell.

### Shared CAD Workspace
- 3D viewport;
- orbit;
- pan;
- zoom;
- standard views;
- perspective/orthographic;
- scene tree;
- object selection;
- hide/show;
- isolate;
- transparency.

### Object Manipulation
- move;
- rotate;
- scale;
- gizmo;
- numeric values;
- movement increments;
- rotation increments;
- Undo/Redo.

### Import
At minimum:
- STL;
- object/arch identification;
- orientation;
- basic review before workspace.

The architecture must support later OBJ/PLY/GLB.

### Basic Mesh Work
At minimum:
- select;
- trim/delete;
- smooth;
- basic hole repair where feasible.

### Sculpt
At minimum:
- Add;
- Remove;
- Smooth;
- Brush Size;
- Brush Strength.

The sculpt architecture must allow later Flatten/Morph.

### Analysis
At minimum:
- distance measurement;
- intersections;
- basic contact visualization;
- basic reference deviation.

The analysis architecture must support later thickness, undercuts, section, occlusion, symmetry and insertion path.

### Practice Engine
- difficulty levels;
- lessons;
- sequential steps;
- lesson-specific tool permissions;
- hints;
- contextual help;
- reference model;
- Design Check;
- secondary score;
- retry;
- progress.

### Initial Practice Content
A coherent starting set should include:

1. CAD Foundation lessons.
2. Basic sculpt lesson.
3. Scan/model orientation lesson.
4. Tooth movement/setup lesson.
5. One realistic complete denture workflow segment.
6. One crown workflow segment.

The purpose is to prove multiple workflow categories with the same engine.

### Free Lab
- choose scenario;
- blank workspace;
- independent tool access;
- no guided step sequence;
- laboratory-style case brief.

### Initial Free Lab Scenarios
At minimum:
- one crown case;
- one complete denture case.

### Save / Recovery
- manual cloud Save;
- Save As;
- local unsaved-work recovery;
- Undo/Redo.

### Export
At minimum:
- STL export of selected supported geometry.

### Admin
At minimum:
- create/edit lesson;
- create/edit scenario;
- upload model;
- assign model role;
- configure difficulty;
- configure steps;
- configure enabled tools;
- configure hints;
- attach reference;
- publish/unpublish.

### Language
- Serbian;
- English;
- English professional terminology visible in Serbian mode.

### Safety
- educational-use disclaimer;
- anonymized scenario data;
- no clinical/manufacturing claims.

---

## 45.3 MVP May Defer

The following may be delivered after the first coherent release while remaining part of the same product roadmap:

- full OBJ/PLY/GLB import coverage;
- advanced mesh repair;
- Flatten sculpt;
- Morph sculpt;
- full boolean suite;
- thickness heatmap;
- advanced undercut analysis;
- full insertion-path engine;
- advanced occlusion;
- complete virtual articulator;
- full partial denture workflow;
- full bridge workflow;
- inlay/onlay/veneer workflow;
- splint workflow;
- implant practice;
- advanced screenshot annotations;
- advanced named checkpoint history;
- large scenario library;
- sophisticated random-case filters;
- advanced validation algorithms;
- complex automated CAD operations.

Deferred does not mean redesigned later; foundational architecture must allow these capabilities.

---

# 46. MVP Success Criteria

The MVP is successful when a new authenticated user can:

1. open Prostheia;
2. choose Practice;
3. complete a real 3D lesson using the same CAD editor used elsewhere;
4. receive geometric/technical feedback;
5. view reference geometry;
6. see updated progress;
7. open Free Lab;
8. choose a realistic scenario;
9. manipulate real 3D dental geometry independently;
10. save the work;
11. recover unsaved local work after an accidental interruption;
12. export supported geometry;
13. understand important tools through contextual explanations;
14. complete the experience without the product feeling like a generic 3D demo.

An administrator must be able to add at least one new lesson or scenario without creating a new hardcoded application page.

---

# 47. Product Acceptance Principles

A feature is not complete solely because a control exists.

Important product features should meet the following standard:

- understandable interaction;
- visible feedback;
- consistent state;
- predictable Undo/Redo;
- save/recovery behavior where relevant;
- error handling;
- acceptable responsiveness;
- compatibility with Practice;
- compatibility with Free Lab;
- contextual help where the feature is non-obvious.

---

# 48. Key Error States

The product must explicitly handle:

- unsupported file format;
- corrupted model;
- oversized file;
- failed upload;
- failed model parsing;
- failed save;
- failed recovery;
- failed export;
- failed geometry operation;
- invalid lesson configuration;
- missing reference asset;
- unavailable case asset;
- unsupported browser capability where applicable.

Errors must not silently fail.

---

# 49. Product Metrics

Initial product metrics should focus on usefulness rather than vanity.

Potential metrics:

- Practice lesson completion rate;
- repeated lesson attempts;
- percentage of users reaching Free Lab;
- Free Lab cases created;
- saved cases;
- imported cases;
- lesson retry frequency;
- common validation failures;
- most-used contextual help;
- completion by skill area;
- scenario reuse.

Exact analytics implementation belongs in `TECH.md`.

---

# 50. Open Domain-Validation Items

The following must be reviewed with credible dental sources and, where possible, an experienced technician/instructor before being presented as authoritative educational content:

- exercise-specific contact thresholds;
- minimum thickness presets;
- insertion-path recommendations;
- occlusal targets;
- complete denture reference criteria;
- partial denture rules;
- material-specific presets;
- implant-related guidance;
- validation tolerances;
- reference setups.

The product can implement configurable values before all domain presets are finalized.

---

# 51. Dependencies on Future Documents

## `TECH.md`

Must define:

- application architecture;
- CAD engine architecture;
- rendering;
- state;
- geometry representation;
- sculpt implementation;
- analysis algorithms;
- workers;
- performance;
- history;
- saving;
- local recovery;
- import/export;
- deployment;
- error architecture;
- security.

## `DB.md`

Must define:

- tables;
- relationships;
- indexes;
- RLS;
- storage;
- lesson content;
- scenarios;
- models;
- user cases;
- progress;
- attempts;
- validation results;
- admin roles;
- checkpoints;
- translations.

---

# 52. Final Product Requirement Statement

Prostheia must feel like a serious browser-based dental CAD product where a student can move from:

> “I do not know what this tool does.”

to:

> “I understand the concept, I can perform the operation, I can inspect my result, and I can attempt the workflow independently.”

Practice must teach inside the real editor.

Free Lab must allow independent work.

The shared CAD engine, realistic scenarios, contextual explanations, geometric analysis, progress system and admin-configurable content together form the core product.

The highest-priority product outcome is **useful learning through realistic digital practice**, not superficial feature count, gamification, or visual novelty.
