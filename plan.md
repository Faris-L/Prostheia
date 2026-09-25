# Prostheia — Master Product Plan

> **Status:** Source of truth for the project concept  
> **Purpose:** This file consolidates the entire product direction agreed in the planning conversation. It is intentionally broader than an implementation spec.  
> **Next documents to derive from this file:** `PRD.md`, `TECH.md`, `DB.md`  
> **Working product name:** **Prostheia**  
> **Working subtitle:** **Digital Dental Design Studio**

---

## 1. Product vision

Prostheia is a **browser-based dental CAD application with a strong built-in learning system**.

It is not a quiz app, a video course, a simplified 3D toy, or a clone of one specific commercial product. It should feel like a real dental CAD environment and teach the user through the same type of workflows, tools, terminology, and problem-solving patterns that appear in professional systems such as exocad, 3Shape Dental System, Medit and similar dental CAD products.

The main target user is:

- a dental prosthetics student who may understand basic prosthetic concepts but is still new to digital CAD;
- a beginner dental technician who wants to become comfortable with professional digital workflows;
- secondarily, a user who wants a safe sandbox for repeated practice.

The application must support two equally important ways of working:

1. **Practice** — structured, guided learning using the real CAD workspace.
2. **Free Lab** — independent case work without guided step-by-step instructions.

Both use the **same CAD engine**.

The application should look and behave like a professional product that could credibly be shown in a developer portfolio. It should not feel like a personalized anniversary website. The gift value comes from the usefulness of the product itself.

---

## 2. Product principles

### 2.1 One complete product, not “V1 / V2”

The product is designed as one complete application.

Implementation may happen in engineering phases, but those phases are **not different product versions**. The final design must remain coherent from the beginning.

Do not intentionally build a throwaway “training toy” first.

Every foundational system should be built so it can support the complete product.

### 2.2 Professional CAD first, education embedded inside it

Prostheia is primarily a **dental CAD application with education built in**.

It should not resemble:

- a school LMS with a small 3D viewer;
- a gamified course;
- a slideshow;
- a “learn dentistry” website.

The user should feel that she is working in a real CAD environment.

### 2.3 Learn by doing

Practice should use roughly this model:

> Explain briefly → perform the task → inspect the result → understand the issue → retry.

Theory should be concise and directly connected to the current operation.

The product should not try to replace dental school or a prosthodontics textbook.

### 2.4 Real professional terminology

Professional English terminology should be preserved.

Example:

- **Insertion Path — put insercije**
- **Undercut — podminirano područje / podminiranje**
- **Margin — granica preparacije**
- **Pontic — međučlan**
- **Occlusion — okluzija**

The English term should remain visible because professional CAD software frequently uses English terminology.

### 2.5 No invented medical certainty

The application must not present arbitrary values as universal clinical truth.

For exercises, use language such as:

> Target for this exercise

instead of:

> The universally correct dental value is...

Reference values must come from:

1. reliable professional or educational sources;
2. the context of the specific exercise;
3. ideally later verification by an experienced dental technician, instructor, or professor.

The product must clearly state that it is intended for **education and practice**, not validated clinical manufacturing.

---

# 3. High-level application structure

```text
PROSTHEIA
Digital Dental Design Studio

├── Landing Page
├── Authentication
│
├── Dashboard
│
├── Practice
│   ├── Foundation
│   ├── Beginner
│   ├── Intermediate
│   └── Advanced
│
├── Free Lab
│   ├── Choose Scenario
│   ├── Import My Case
│   └── Blank Workspace
│
├── My Cases
├── My Designs
├── Progress
│
├── CAD Workspace
│
└── Admin
    ├── Lessons
    ├── Cases
    ├── Scenarios
    ├── Models
    ├── References
    ├── Validation Rules
    └── Content Configuration
```

There is **no separate Tool Guide page** in the initial product direction.

Tool education is contextual and appears directly inside the workspace.

---

# 4. Main dashboard

The first authenticated screen should present **Practice and Free Lab with equal importance**.

Example:

```text
Welcome back

Continue Practice
Complete Denture · Posterior Setup

Practice Progress
[ View Practice ]

Free Lab
[ Start New Case ]

Recent Cases
Crown 26
Complete Denture #03
Kennedy Class I Partial
```

Do not force onboarding.

A beginner can see a small recommendation such as:

> New to digital CAD?  
> Recommended: Foundation → CAD Controls

but this must be optional.

---

# 5. Practice system

## 5.1 Core concept

Practice is a structured curriculum built on top of the actual CAD editor.

The user does not learn inside a fake or reduced environment.

The same tools used in Practice are used in Free Lab.

### Practice difficulty levels

Use:

1. **Foundation**
2. **Beginner**
3. **Intermediate**
4. **Advanced**

All levels are accessible at all times.

Nothing is permanently locked.

A user can:

- repeat Foundation indefinitely;
- open an Advanced lesson immediately;
- retry any lesson;
- revisit earlier material.

If the user opens a lesson above the recommended level, show:

```text
Recommended prerequisites

You have not completed:
- Occlusion Basics
- Contact Analysis

[ Start anyway ]
```

Do not block access.

---

## 5.2 Guided lesson behavior

Inside a guided lesson:

- lesson steps are sequential;
- the user cannot arbitrarily skip required steps;
- tools available can change by lesson;
- reference visibility depends on difficulty;
- contextual help is available;
- the workspace remains professional and uncluttered.

Example:

```text
Practice
Complete Denture
Anterior Tooth Setup

Goal:
Position the anterior teeth according to the provided case references.

Current step:
Position the central incisors.

Tools:
Move
Rotate
Scale

[ Hint ]
[ Show Example ]
[ What does Move do? ]
[ Check Design ]
```

---

## 5.3 Lesson duration

Lessons can have different lengths.

### Tool lessons

Short:

- 2–5 minutes;
- one concept;
- one focused operation.

### Workflow lessons

Medium:

- 5–20 minutes;
- multiple related operations.

### Full cases

Long:

- complete realistic workflows;
- no artificial short time limit.

---

# 6. Practice curriculum

The curriculum should cover all major areas relevant to learning digital dental CAD.

---

## 6.1 Foundation — CAD fundamentals

Purpose: make a beginner comfortable inside a professional 3D workspace.

Lessons:

1. Orbit
2. Pan
3. Zoom
4. Standard views
5. Front / Back / Left / Right / Top / Bottom
6. Perspective vs orthographic view
7. Object selection
8. Multi-selection
9. Scene tree
10. Hide / show
11. Isolate
12. Transparency
13. Move
14. Rotate
15. Scale
16. Numeric transforms
17. Fine movement
18. Snapping
19. Translation steps
20. Rotation steps
21. Measure distance
22. Measure angle
23. Section view
24. FDI tooth numbering
25. Undo
26. Redo
27. History basics
28. Keyboard shortcuts

---

## 6.2 Scan and model preparation

Practice cases should include intentionally imperfect scans.

Exercises:

1. Model orientation
2. Upper/lower identification
3. Jaw alignment
4. Trim scan
5. Select mesh region
6. Delete unwanted geometry
7. Remove scan artifacts
8. Fill holes
9. Smooth scan
10. Inspect mesh
11. Establish occlusal plane
12. Generate model base
13. Prepare removable dies
14. Review model quality

Some cases should contain realistic imperfections.

The goal is not to give the user only perfect prepared data.

---

## 6.3 Sculpting

Sculpting is a major part of the learning experience.

Required brush operations:

- Add
- Remove
- Smooth
- Flatten
- Morph

Brush controls:

- brush size;
- brush strength;
- falloff if useful;
- fine/coarse operation.

Exercises:

1. Add material
2. Remove material
3. Smooth surface
4. Flatten surface
5. Morph anatomy
6. Cusp correction
7. Fissure correction
8. Ridge correction
9. Restore damaged anatomy
10. Match reference anatomy
11. Fine detail sculpting

Example lesson:

> Restore the damaged molar.

The user receives intentionally deformed anatomy and uses the sculpting tools to bring it closer to a reference.

---

## 6.4 Crown practice

Exercises:

1. Posterior Crown 46 — basic workflow
2. Posterior Crown 26
3. Anterior Crown 11
4. Margin identification
5. Correct bad margin
6. Insertion path
7. Undercut review
8. Tooth library selection
9. Initial tooth placement
10. Move / rotate / scale anatomy
11. Adjacent contact adjustment
12. Occlusal contact adjustment
13. Sculpt anatomy
14. Minimum thickness analysis
15. Final design review
16. Complete crown case

Typical workflow:

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

---

## 6.5 Bridge practice

Exercises:

1. Three-unit bridge 14–16
2. Pontic placement
3. Pontic/gingiva relationship
4. Connector placement
5. Connector shape
6. Connector thickness
7. Multi-unit movement
8. Adjacent contacts
9. Occlusion
10. Sculpt anatomy
11. Full bridge case

Concepts:

- abutments;
- pontics;
- connectors;
- gingival adaptation;
- multi-unit geometry.

---

## 6.6 Inlay / Onlay / Veneer practice

Include:

- Inlay 36
- Onlay 46
- Veneer 11

Practice concepts:

- margin;
- insertion path;
- anatomy;
- contact management;
- thickness;
- final validation.

The user should understand that the same CAD concepts apply differently across indications.

---

## 6.7 Complete denture practice

This is one of the most important Practice areas.

### Model analysis

Exercises:

- identify reference landmarks;
- establish midline;
- define occlusal plane;
- evaluate arch;
- mark relevant anatomical regions;
- understand reference points.

### Tooth selection

Exercises:

- choose anterior tooth set;
- choose posterior tooth set;
- compare tooth forms;
- understand library selection.

Use educational/open tooth libraries, not proprietary libraries from commercial CAD products.

### Anterior setup

Exercises:

- central incisors;
- lateral incisors;
- canines;
- complete anterior segment.

### Posterior setup

Exercises:

- premolars;
- molars;
- posterior groups;
- bilateral arrangement.

### Tooth manipulation modes

Required:

```text
ARCH MODE
Move arch
Rotate arch
Scale arch
Widen / narrow

CHAIN MODE
Move connected teeth while maintaining relationships

INDIVIDUAL MODE
Move tooth
Rotate tooth
Scale tooth
```

### Occlusion exercises

- detect collisions;
- review proximal contacts;
- review antagonist contacts;
- reduce severe intersections;
- bilateral contact review;
- open/close jaw;
- protrusion;
- left lateral;
- right lateral.

### Denture base exercises

- define base boundary;
- generate base;
- adjust border;
- add material;
- remove material;
- smooth gingiva;
- sculpt gingival form;
- thickness review;
- adapt base to teeth;
- generate tooth sockets.

### Full denture scenarios

- upper complete denture;
- lower complete denture;
- upper + lower complete denture;
- single upper denture with natural lower;
- difficult setup;
- altered anatomy;
- realistic imperfect scan.

---

## 6.8 Partial denture practice

Core concepts:

- survey;
- insertion path;
- undercuts;
- blockout;
- framework design.

Exercises:

1. Surveying basics
2. Change insertion direction
3. Understand undercut map
4. Blockout
5. Major connector
6. Lingual bar
7. Retention mesh
8. Clasp
9. Minor connector
10. Rest
11. Guide plane
12. Finish line
13. Relief
14. Framework smoothing
15. Full framework review

Case families:

- Kennedy Class I
- Kennedy Class II
- Kennedy Class III
- Kennedy Class IV

---

## 6.9 Bite splint practice

Exercises:

1. Select insertion direction
2. Inspect undercuts
3. Understand retention
4. Generate internal surface
5. Define margin
6. Set thickness
7. Sculpt upper surface
8. Static occlusion
9. Dynamic occlusion
10. Final validation

---

## 6.10 Digital model practice

Exercises:

1. Trim scan
2. Orient model
3. Generate base
4. Create removable die
5. Add model attachments
6. Review final printable model

---

## 6.11 Implant practice

Implant content is Advanced.

Exercises may include:

1. Scan body matching
2. Visualize implant position
3. Emergence profile
4. Custom abutment
5. Tooth placement
6. Screw channel
7. Screw-retained crown
8. Crown on abutment
9. Final review

This must remain educational and must not claim clinical manufacturing validation.

---

# 7. Practice result and validation system

Practice feedback should primarily look like professional CAD validation.

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

The main UX must focus on:

- concrete issues;
- geometry;
- contacts;
- thickness;
- reference deviation;
- required workflow completion.

---

## 7.1 Score

A score from **0–100** can exist, but it must be secondary.

Do not turn the experience into a game.

The score should appear in a lower-priority location such as the result details.

Example:

```text
Design Check
2 issues require review

...

Technical score: 84 / 100
```

---

## 7.2 Reference model behavior

Reference access changes by difficulty.

### Foundation / Beginner

Reference may be easy to access.

### Intermediate

Reference may be partially available.

### Advanced

Reference should ideally become available after the user attempts or submits the step/case.

Reference display modes:

- Off
- Outline
- Transparent
- Full

---

## 7.3 Deviation visualization

Where technically possible, Practice can compare:

- user geometry;
- reference geometry.

Provide a deviation visualization such as:

```text
+2 mm
+1 mm
 0 mm
-1 mm
-2 mm
```

Do not claim this is a clinical quality metric unless validated.

---

# 8. Contextual tool education

There is no separate Tool Guide page in the current product direction.

Help appears **inside the CAD workspace**.

---

## 8.1 Tooltip

Hover:

```text
Insertion Path

Direction in which the restoration is intended
to seat onto the preparation.
```

---

## 8.2 Contextual floating help panel

Click `?`.

A small floating panel appears.

It must not take over the entire workspace.

Example:

```text
INSERTION PATH — PUT INSERCIJE

What does it do?
Defines the direction in which the restoration
approaches and seats on the preparation.

Why does it matter?
Changing the direction changes which areas behave
as undercuts relative to that path.

How to use it
Adjust the direction and inspect the undercut map.

Common mistakes
- choosing a direction without checking undercuts;
- ignoring the preparation geometry.

[ Interactive example ]
```

Panel behavior:

- floating;
- closeable;
- pinnable;
- contextual to selected tool.

No global search is required for these explanations.

---

## 8.3 Interactive tool demonstrations

Where possible, use interactive 3D demos instead of videos.

Example:

For insertion path:

1. show restoration moving correctly;
2. change path;
3. highlight resulting undercut/problem;
4. allow user to manipulate the arrow.

For sculpt:

1. small test mesh;
2. add material;
3. remove;
4. smooth.

---

# 9. Free Lab

Free Lab is the independent side of the product.

It does **not** convert into a guided Practice case after starting.

The user may still access contextual tool explanations, but the system does not tell the user which workflow step to perform.

---

## 9.1 Free Lab entry options

```text
New Free Lab Case

1. Choose Scenario
2. Import My Case
3. Blank Workspace
```

---

## 9.2 Scenario library

Scenario library should be large enough to support repeated practice.

Difficulty:

- Beginner
- Intermediate
- Advanced

Filters should eventually support at least:

- category;
- indication;
- jaw;
- tooth/teeth;
- difficulty.

Examples:

```text
Posterior Crown 26
Anterior Crown 11
Bridge 14–16
Upper Complete Denture
Upper + Lower Complete Denture
Kennedy Class I Partial
Kennedy Class III Partial
Bite Splint
Digital Model
```

---

## 9.3 Realistic case brief

Free Lab scenarios should resemble real technical work orders.

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

Only clinically relevant information should be shown.

Use fictional/anonymized IDs.

Never require real patient identity.

---

## 9.4 Random Case

Provide:

```text
Give me something to practice
```

User chooses:

- category;
- difficulty.

The system selects a matching scenario.

---

# 10. Import workflow

Supported input formats should aim to include:

- STL
- OBJ
- PLY
- GLB where appropriate

Import should not simply drop a mesh into the viewport.

Use an import wizard:

```text
Import File
→ Identify Object / Arch
→ Orientation
→ Alignment
→ Cleanup
→ Review
→ Workspace
```

Potential object types:

- Maxilla
- Mandible
- Antagonist
- Pre-op
- Individual tooth
- Reference
- Restoration
- Other mesh

---

# 11. CAD workspace

The workspace should intentionally feel close to a professional dental CAD environment while maintaining our own visual identity.

Target layout:

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

Design goals:

- professional density;
- well organized;
- not minimalist to the point of hiding useful state;
- not visually overloaded.

---

# 12. Contextual tools

Available tools depend on selection and workflow.

Example: selected tooth

```text
Move
Rotate
Scale
Morph
Contacts
```

Example: selected crown

```text
Margin
Insertion
Contacts
Thickness
Sculpt
```

Example: selected scan

```text
Trim
Select
Delete
Fill Hole
Smooth
Align
```

Practice lessons can restrict visible tools to only the tools relevant to the lesson.

Free Lab normally exposes the complete relevant tool set.

---

# 13. Transform controls

Object manipulation should support:

- 3D gizmo;
- X/Y/Z movement;
- X/Y/Z rotation;
- scale;
- direct numeric input;
- snapping;
- fine movement;
- configurable translation step;
- configurable rotation step;
- keyboard shortcuts.

Example:

```text
MOVE

X   +0.40 mm
Y   -1.20 mm
Z   +0.10 mm

Step
○ Free
○ 0.1 mm
○ 0.5 mm
○ 1.0 mm
```

Rotation:

```text
ROTATE

X   2.0°
Y  -0.5°
Z   4.0°

Step
○ Free
○ 0.5°
○ 1°
○ 5°
```

---

# 14. Keyboard shortcuts

Create a serious keyboard shortcut system.

At minimum:

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
- tool-specific shortcuts where sensible.

Shortcuts should appear in tooltips.

---

# 15. Core CAD / geometry tools

The application should aim to support the following tool categories.

---

## 15.1 View and scene

- orbit;
- pan;
- zoom;
- standard views;
- perspective/orthographic;
- hide/show;
- isolate;
- transparency;
- scene tree;
- object selection.

---

## 15.2 Mesh preparation

- region selection;
- trim;
- delete;
- fill hole;
- smooth;
- mesh cleanup;
- mirror where relevant;
- duplicate;
- orientation;
- alignment.

---

## 15.3 Sculpt

- Add
- Remove
- Smooth
- Flatten
- Morph
- Brush Size
- Brush Strength

---

## 15.4 Curves and boundaries

Needed for concepts such as:

- margin;
- base boundary;
- framework outline;
- finish line;
- other design curves.

---

## 15.5 Boolean operations

Where required:

- Union
- Subtract
- Intersection

---

## 15.6 Measurement

- distance;
- angle;
- section;
- object dimensions.

---

# 16. Analysis tools

Analysis is one of the most important differentiators between a generic 3D editor and a dental CAD application.

Required direction:

- Contacts
- Occlusion
- Thickness
- Distances
- Section
- Undercuts
- Intersections
- Symmetry where useful
- Insertion path
- Reference deviation

---

## 16.1 Contact visualization

Use color-based visualization to distinguish:

- intersection;
- contact;
- near contact;
- separation.

Exact thresholds should be configured per exercise/preset and must not be presented as universal values unless validated.

---

## 16.2 Thickness analysis

Provide a map that helps identify:

- acceptable region;
- thin region;
- potentially problematic region.

Again, values should depend on exercise/material preset.

---

## 16.3 Undercut analysis

Essential for:

- crowns/insertion paths;
- partial dentures;
- splints;
- other relevant workflows.

Changing insertion direction should update the visualization.

---

## 16.4 Section view

Allow virtual slicing through geometry to inspect internal relationships.

---

## 16.5 Intersections

Detect object-object collisions where technically feasible.

Examples:

- adjacent teeth;
- antagonist;
- tooth/base;
- framework/model.

---

# 17. Virtual articulator

The target scope includes:

- Open / Close
- Protrusion
- Left lateral
- Right lateral
- Contact visualization during movement

This is a technically ambitious feature and should be designed carefully.

Practice should explain what the articulator view represents rather than implying perfect patient-specific biomechanics.

---

# 18. Automatic vs manual CAD operations

Professional-style automation is allowed.

Rule:

> Auto where useful; manual understanding must remain possible.

Examples:

- Auto Detect Margin
- Auto Align
- Auto tooth placement suggestion
- Auto base generation
- Auto mesh repair

Practice lessons may intentionally disable automatic tools so the student learns the underlying operation.

Free Lab can expose available automation.

---

# 19. Saving and recovery

## 19.1 Official project save

Cloud saving is **manual**.

User explicitly chooses:

- Save
- Save As

---

## 19.2 Local recovery

To prevent accidental data loss, maintain automatic local recovery state in the browser.

Example:

```text
Unsaved work was found.

Posterior Crown 26
Recovered 2 minutes ago.

[ Restore ]
[ Discard ]
```

Local recovery is not the same as an official cloud save.

---

## 19.3 Checkpoints and copies

Support:

- Save As
- Duplicate Case
- Named Checkpoints

Example checkpoint:

> Before occlusion adjustment

---

## 19.4 Undo / Redo

Target behavior:

- multi-step Undo;
- multi-step Redo;
- ability to reset the current tool operation where practical.

Do not rely only on a single-step undo model.

---

# 20. Export

Target export formats:

- STL
- OBJ
- GLB where meaningful

Export should allow selecting components.

Example:

```text
Export

☑ Upper
☑ Lower
☑ Teeth
☑ Base
☐ Reference
```

The product should clearly state:

> Educational / practice use. Not validated for clinical manufacturing.

---

# 21. Screenshots and annotations

Provide CAD viewport capture.

Target:

- Capture View
- Save capture
- Annotate screenshot

Annotations can be simple visual markup such as:

- arrow;
- circle;
- text;
- highlight.

Do not build a full note-taking system.

No general case notes feature is required.

---

# 22. Progress system

Progress should track skills, not only lesson completion.

Example:

```text
CAD Navigation
Sculpting
Scan Preparation
Crown
Bridge
Complete Denture
Partial Denture
Occlusion
Surveying
Models
Splints
Implants
```

Practice overview may display:

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

For lesson results, prioritize concrete validation over scores.

User-facing result history should prioritize the **best result** for a lesson.

Internal attempt storage may be retained for future analytics or progress logic, but that detail should be finalized in `DB.md`.

---

# 23. No gamification emphasis

Do not use:

- XP;
- coins;
- stars;
- streak pressure;
- game-like confetti;
- “level up” language.

Difficulty labels are instructional, not game levels.

---

# 24. No “find the hidden error” lesson category

A dedicated “Find the problem” exercise type is not required in the current scope.

Validation should still identify issues during normal exercises.

---

# 25. Language

Application must support:

- Serbian
- English

Terminology behavior:

> English professional term + Serbian explanation

Example:

```text
Undercut — podminirano područje

An undercut is...
Podminirano područje je...
```

Do not over-translate professional terminology if doing so makes the user less prepared for real CAD software.

---

# 26. Visual design

Use a combination of:

- professional CAD density;
- modern SaaS polish.

Design direction:

- neutral professional palette;
- one clear accent color;
- premium, technical appearance;
- not overly medical white/blue;
- not gaming UI.

Use **shadcn/ui** for standard UI primitives such as:

- buttons;
- dialogs;
- dropdowns;
- forms;
- tabs;
- popovers;
- tooltips;
- panels;
- command surfaces.

Custom CAD UI can be built around those primitives.

---

# 27. Themes

Support:

- Light theme
- Dark theme

The 3D viewport should maintain a neutral CAD-appropriate visual environment independent of the surrounding UI theme.

---

# 28. Responsive strategy

The editor is **desktop-only**.

Target:

- adaptive from approximately 1280 px width upward;
- best experience at 1440 px+ / 1080p-class screens.

Do not waste engineering time making advanced sculpting and CAD editing usable on phones.

The marketing landing page may be responsive, but the CAD editor is desktop-first/desktop-only.

---

# 29. Landing page

Build a professional SaaS-style landing page because the project is also intended for a portfolio.

Possible sections:

- Hero
- Product overview
- Practice
- Free Lab
- CAD tools
- Realistic scenarios
- Learning philosophy
- Screenshots
- Technology / browser-based workflow
- CTA

Do not over-focus on “gift” positioning.

---

# 30. Authentication

An account is required to use the application.

No anonymous Practice or Free Lab mode is required.

---

# 31. Admin content studio

Admin is an essential part of the product architecture.

Goal:

> Add and configure lessons, scenarios and models without changing source code for every piece of content.

Example:

```text
/admin
```

---

## 31.1 New case form

Fields may include:

```text
Case Name
Category
Difficulty
Mode
Description
Learning Goal
Scenario Brief
Patient Metadata
3D Assets
Reference Assets
Available Tools
Required Steps
Validation Rules
Hints
Material Preset
Difficulty Parameters
```

---

## 31.2 Model upload

Admin should be able to upload:

- STL
- OBJ
- PLY
- GLB

and assign purpose:

- maxilla;
- mandible;
- antagonist;
- restoration;
- tooth;
- reference;
- other.

---

## 31.3 Lesson configuration

Example:

```text
Lesson
Complete Denture — Anterior Setup

Difficulty
Beginner

Tools Enabled
☑ Select
☑ Move
☑ Rotate
☑ Scale
☐ Sculpt
☐ Survey

Steps
1. Position central incisors
2. Position lateral incisors
3. Position canines

Reference
anterior-reference.glb

Validation
- required tooth objects positioned
- severe intersections absent
- reference deviation check

Hints
...
```

---

## 31.4 Validation configuration

Admin should be able to reuse existing validation rule types.

Examples:

- object exists;
- position range;
- rotation range;
- reference deviation;
- no severe intersection;
- thickness threshold;
- contact threshold;
- required step completed.

New validation algorithms may still require code.

Admin configuration should not attempt to turn every possible geometry algorithm into no-code logic.

---

# 32. Scenario difficulty model

Difficulty must affect more than a label.

Potential factors:

- anatomy complexity;
- scan quality;
- amount of missing/extra geometry;
- number of relevant objects;
- number of workflow steps;
- number of simultaneous problems;
- amount of reference assistance;
- enabled automatic tools;
- allowed hints;
- reference availability.

Example:

### Foundation

- clean geometry;
- one tool;
- obvious reference;
- strong guidance.

### Beginner

- clean case;
- limited complexity;
- reference available.

### Intermediate

- realistic geometry;
- multiple operations;
- partial reference assistance.

### Advanced

- complex anatomy;
- imperfect scan;
- multiple dependencies;
- minimal guidance;
- reference mostly after submission.

---

# 33. Models and asset strategy

The application must not use proprietary tooth libraries, patient files, or copyrighted commercial CAD assets without permission.

Allowed directions:

- explicitly open-licensed models;
- models with commercial-use permission;
- synthetic educational models;
- internally created models;
- specially commissioned models.

Every external dataset/model must be checked for:

- license;
- redistribution rights;
- modification rights;
- commercial/portfolio use;
- attribution requirements.

Do not assume that “publicly downloadable” means usable.

---

# 34. Privacy

Do not use identifiable real patient data.

If the user imports real practice/lab data, the application should warn that only authorized, properly anonymized data should be uploaded.

Scenario patient data must be fictional/anonymized.

---

# 35. AI policy for this product

No AI features are required.

Do not add:

- AI chatbot;
- AI tutor;
- LLM explanations;
- AI design assistant;
- AI diagnosis;
- AI scoring

simply because AI is fashionable.

The product’s value should come from:

- geometry;
- CAD interaction;
- structured learning;
- analysis;
- realistic workflows.

If a future AI feature has a clear problem to solve, it can be evaluated later, but it is not part of the current product direction.

---

# 36. Offline behavior

Full offline operation is not required.

Required:

- local recovery of unsaved state;
- temporary browser resilience where practical.

The application may otherwise require an internet connection.

Do not build full PWA synchronization unless a later requirement justifies the complexity.

---

# 37. Technology direction

The preferred application stack is:

```text
Next.js
TypeScript
Tailwind CSS
shadcn/ui

Three.js
@react-three/fiber
@react-three/drei

Zustand

Supabase
- Auth
- PostgreSQL
- Storage

Vercel
```

Likely supporting technologies:

```text
three-mesh-bvh
Web Workers
WebAssembly
Manifold / compatible geometry library
```

The exact libraries must be validated in `TECH.md`.

---

# 38. Python decision

Python is **not required for the core application**.

The CAD editor should perform interactive geometry work client-side whenever practical.

Reasons:

- lower latency;
- fewer network round trips;
- better interaction;
- no upload/process/download loop for every edit.

Python may later be useful for:

- offline dataset preprocessing;
- mesh conversion utilities;
- development scripts;
- research tooling;
- specialized algorithms that cannot reasonably run client-side.

Do not introduce Python into production architecture without a concrete need.

---

# 39. 3D engine architecture principle

Practice and Free Lab must share one CAD engine.

Do not build:

```text
/training-editor
/free-editor
```

as separate implementations.

Use a shared workspace system.

Conceptually:

```text
CAD ENGINE
├── Renderer
├── Camera
├── Scene
├── Selection
├── Transform
├── Mesh Editing
├── Sculpting
├── Curves
├── Analysis
├── Articulator
├── History
├── Import
├── Export
└── Validation

Practice Layer
├── Lesson Steps
├── Allowed Tools
├── Hints
├── References
└── Design Check

Free Lab Layer
├── Scenario Brief
├── Full Tool Access
└── Independent Workflow
```

---

# 40. Candidate application routes

These are conceptual and can change in the detailed technical design.

```text
/
 /login
 /dashboard

 /practice
 /practice/[module]
 /practice/[lessonId]

 /free-lab
 /free-lab/new

 /cases
 /cases/[caseId]

 /workspace/[caseId]

 /progress

 /admin
 /admin/lessons
 /admin/cases
 /admin/models
 /admin/validations
```

The actual routing structure belongs in `TECH.md`.

---

# 41. Data concepts to support later

The master product implies at least the following conceptual entities.

Do not treat this as the final schema.

```text
User
Profile

PracticeModule
PracticeLesson
LessonStep
LessonToolPermission
Hint

Scenario
Case
CaseAsset
ReferenceAsset

ToolDefinition
ToolDemo

ValidationRule
ValidationResult

UserCase
CaseState
Checkpoint

PracticeAttempt
PracticeResult
SkillProgress

UploadedModel
Export

Screenshot
Annotation

AdminContent
```

The normalized schema belongs in `DB.md`.

---

# 42. Example Practice flow

```text
Dashboard
→ Practice
→ Complete Denture
→ Beginner
→ Anterior Tooth Setup

Lesson intro
→ Goal
→ Required concept
→ Open CAD Workspace

Step 1
Position central incisors

Contextual help available
→ Move
→ Rotate

Check Step

Step 2
Position lateral incisors

...

Final Design Check

✓ Completed requirements
! 1 contact requires review

Reference available
Deviation map available

Technical score: 86 / 100

Save result
Update skill progress
```

---

# 43. Example Free Lab flow

```text
Dashboard
→ Free Lab
→ New Case
→ Scenario

Choose:
Complete Denture
Advanced

Open scenario brief

Review:
Patient ID
Case type
Available scans
Requirements

Open CAD Workspace

No guided sequence

User decides:
Model analysis
→ tooth library
→ placement
→ contacts
→ occlusion
→ base
→ analysis

Manual Save

Export components
```

---

# 44. Example import flow

```text
Free Lab
→ Import My Case

Upload STL

Identify:
Upper Jaw

Orient Model

Upload second STL

Identify:
Lower Jaw

Align Jaws

Mesh Cleanup

Review

Create Case

Open Workspace
```

---

# 45. Usability rules

1. The viewport should always remain the visual priority inside the editor.
2. Help must not replace the viewport.
3. Avoid full-screen tutorial interruptions.
4. Use contextual panels.
5. Show relevant tools, not every possible tool at once.
6. Keep advanced state inspectable.
7. Do not hide numerical values behind purely visual interactions.
8. Support keyboard-heavy use.
9. Preserve professional terminology.
10. Explain concepts when they become relevant.

---

# 46. Quality bar

The project should be treated as a serious portfolio product.

A feature is not “done” simply because a button exists.

For important CAD features, completion means:

- interaction is understandable;
- visual feedback exists;
- undo works;
- state saves/recovery works where relevant;
- errors are handled;
- performance is acceptable;
- Practice can use it;
- Free Lab can use it;
- the feature does not break the shared CAD engine.

---

# 47. Performance principles

Large meshes can make browser CAD unusable if architecture is careless.

Detailed performance decisions belong in `TECH.md`, but the product plan assumes:

- avoid unnecessary React rerenders in 3D state;
- separate UI state from geometry state;
- use spatial acceleration where needed;
- use workers for expensive CPU work where possible;
- use optimized model formats where possible;
- avoid pushing every mouse move to Supabase;
- save compact project state rather than naively serializing everything after every interaction;
- support local recovery without blocking interaction.

---

# 48. Error handling

Important failure states must be designed explicitly.

Examples:

- unsupported file;
- corrupt mesh;
- file too large;
- import failed;
- missing model;
- failed cloud save;
- failed export;
- geometry operation failed;
- recovery data available;
- invalid lesson configuration;
- missing reference asset.

Do not silently fail.

---

# 49. Product non-goals

Do not add unrelated SaaS functionality.

Not required:

- CRM;
- invoices;
- appointment scheduling;
- chat;
- social feed;
- calendar;
- marketplace;
- AI assistant;
- generic dental encyclopedia;
- mobile CAD editor;
- clinical diagnosis;
- CAM/milling machine control;
- surgical planning;
- claims of regulatory approval.

---

# 50. Safety / clinical boundary

Prostheia is an educational and practice system.

It must not claim:

- clinical validation;
- manufacturing validation;
- medical device status;
- regulatory certification;
- patient-specific treatment correctness.

A visible disclaimer should exist in relevant areas:

> Prostheia is intended for educational and practice use. Designs and measurements must not be used for clinical manufacturing without independent professional validation.

---

# 51. Implementation phases

These are **engineering phases only**, not separate product versions.

---

## Phase A — Product shell and shared architecture

Goal:

Build the product skeleton without creating throwaway systems.

Includes:

- Next.js project;
- Tailwind;
- shadcn/ui;
- auth;
- Supabase;
- main navigation;
- dashboard;
- Practice shell;
- Free Lab shell;
- Admin shell;
- CAD workspace shell;
- theme system.

Acceptance direction:

- user can authenticate;
- dashboard loads;
- Practice and Free Lab routes exist;
- CAD workspace opens;
- basic project structure supports later modules.

---

## Phase B — Core 3D workspace

Includes:

- Three.js/R3F renderer;
- camera;
- orbit/pan/zoom;
- standard views;
- scene tree;
- selection;
- hide/show/isolate;
- transparency;
- object transform;
- numeric transform controls;
- keyboard shortcuts;
- manual save state structure;
- local recovery foundation.

This phase must create the shared CAD engine used everywhere else.

---

## Phase C — Import and model handling

Includes:

- STL;
- OBJ;
- PLY;
- GLB where applicable;
- import wizard;
- arch/object identification;
- orientation;
- alignment;
- object metadata;
- basic mesh validation.

---

## Phase D — Geometry editing

Includes:

- mesh selection;
- trim;
- delete;
- fill hole;
- smooth;
- sculpt;
- brush settings;
- curves/boundaries;
- booleans where required.

Performance must be evaluated with realistic models.

---

## Phase E — Analysis engine

Includes:

- measurement;
- section;
- intersections;
- contacts;
- thickness;
- undercuts;
- insertion path;
- deviation;
- symmetry where useful.

This phase establishes reusable geometric validation capabilities.

---

## Phase F — Practice engine

Includes:

- modules;
- levels;
- lesson steps;
- tool restrictions;
- hints;
- contextual help;
- references;
- validation;
- secondary score;
- progress;
- prerequisite warnings;
- retry.

Practice must use the same CAD workspace, not a separate simulation.

---

## Phase G — Free Lab engine

Includes:

- scenario selection;
- realistic brief;
- random case;
- blank workspace;
- imported case;
- full independent workflow.

No step-by-step guidance.

---

## Phase H — Dental workflows

Build real workflow configurations and domain-specific tools for:

1. Crown
2. Bridge
3. Inlay/Onlay/Veneer
4. Complete Denture
5. Partial Denture
6. Bite Splint
7. Digital Model
8. Implant practice

Use shared geometry systems whenever possible.

Do not duplicate tools per indication unless the domain truly requires separate logic.

---

## Phase I — Articulator and advanced relationships

Includes:

- open/close;
- protrusion;
- left lateral;
- right lateral;
- contact visualization during movement.

Validate the educational representation carefully.

---

## Phase J — Admin content studio

Includes:

- model uploads;
- lesson editor;
- scenario editor;
- step editor;
- tool permissions;
- hints;
- reference asset configuration;
- validation configuration;
- difficulty configuration.

Goal:

Add most new content without changing code.

---

## Phase K — Export, screenshots, polishing

Includes:

- STL/OBJ/GLB export;
- component selection;
- screenshot capture;
- screenshot annotations;
- history/checkpoints;
- error states;
- loading states;
- professional polish;
- accessibility for standard UI;
- landing page.

---

# 52. Future derived documents

This file must remain the conceptual source of truth.

Next create:

---

## `PRD.md`

Focus:

- user problems;
- target users;
- product behavior;
- workflows;
- feature requirements;
- UX rules;
- acceptance criteria;
- edge cases;
- out-of-scope.

---

## `TECH.md`

Focus:

- Next.js architecture;
- CAD engine modules;
- Three.js/R3F structure;
- state architecture;
- mesh representation;
- workers;
- BVH;
- sculpting;
- boolean operations;
- analysis algorithms;
- import/export;
- history;
- local recovery;
- saving strategy;
- performance;
- deployment;
- security.

---

## `DB.md`

Focus:

- Supabase tables;
- relationships;
- indexes;
- RLS;
- Storage buckets;
- model assets;
- lessons;
- scenarios;
- progress;
- attempts;
- checkpoints;
- admin permissions;
- migrations.

---

# 53. Decisions collected from product questionnaire

For traceability, these are the decisions that shaped this plan.

```text
1  Dental CAD with educational component
2  Student beginner / student with basic prosthetics knowledge
3  Practice and Free Lab equally visible on dashboard
4  Professional workflow close to exocad/3Shape
5  Professional CAD + modern SaaS visual language

6  Levels ordered by difficulty; all accessible and repeatable
7  Short theory before practice
8  Tooltip + detailed explanation + example, without taking over workspace
9  No separate Tool Guide section
10 Concrete validation + reference + deviation/contact visualization
11 Professional Design Check + secondary 0–100 score
12 Instructions + Hint + visual example
13 No dedicated Find-the-Problem exercise type
14 Broad dental scope
15 Major areas treated as important, not one narrow specialty

16 Free Lab: scenario + import + blank workspace
17 Tool explanations available, no guided workflow in Free Lab
18 Free Lab cannot be converted into Guided Practice
19 Large scenario library with difficulty
20 Highly realistic models including imperfect cases
21 STL + OBJ + PLY + GLB
22 Full brush sculpting direction
23 Full analysis direction
24 Full articulator direction
25 Manual official save
26 Multi-format/component export
27 Skill-based detailed progress
28 Serbian + English
29 Product remains professional rather than personalized gift UI
30 Learning usefulness has priority even if technically demanding

31 Professional CAD layout
32 Dense but organized UI
33 Contextual toolbar + Properties
34 Gizmo + numeric + snapping/fine control
35 Full movement precision controls
36 Serious shortcut system
37 No forced onboarding
38 Manual cloud save + local recovery
39 Save As + Duplicate + named checkpoints
40 Multi-step Undo/Redo + reset current operation
41 Short tool lessons + longer full cases
42 Foundation / Beginner / Intermediate / Advanced
43 User-facing best result
44 Score visually secondary
45 Guided steps cannot be skipped
46 Reference availability changes by difficulty
47 Real laboratory-style scenario brief
48 Fictional Patient ID + relevant case data
49 Import wizard
50 Professional auto tools where useful, disable in learning when needed
51 Floating/pinnable contextual help
52 Interactive 3D demos
53 Light + dark; neutral CAD viewport
54 Premium neutral UI + accent
55 Professional SaaS landing page
56 Login required
57 Recommend Foundation but lock nothing
58 Full admin content studio
59 Admin-configurable cases/models/validation/reference
60 This master plan becomes source of truth for later PRD/TECH/DB

61 CAD education + short relevant dental concept
62 English technical term + Serbian explanation
63 No global Tool Guide search
64 Lesson-specific tool access
65 Show missing prerequisites but allow start
66 Difficulty affects anatomy, scan, problems, guidance and complexity
67 Random Case by category + difficulty
68 No Favorites system
69 No Notes system
70 Capture + screenshot annotations
71 No AI
72 Local recovery only; no full offline product
73 CAD editor desktop-only
74 Adaptive editor from ~1280px+
75 Use reliable sources and later expert verification
```

---

# 54. Final product statement

**Prostheia is a browser-based dental CAD design environment for students and beginner dental technicians. It combines realistic professional workflows, 3D dental modeling tools, geometric analysis and structured practical education in one shared CAD workspace. Users can learn through guided Practice cases or work independently in Free Lab using realistic scenarios, imported scans, or blank workspaces.**

The product should teach the user not only **which button to press**, but:

- what the tool does;
- why the tool exists;
- how it changes geometry;
- how it affects the dental workflow;
- how to inspect the result;
- how the same concept appears in real professional CAD systems.

The long-term quality bar is:

> The user should feel that she has her own serious dental CAD environment in the browser where she can genuinely practice, not a website that merely explains dental CAD.
