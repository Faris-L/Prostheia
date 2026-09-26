# Prostheia — Phases.md

> **Document:** `Phases.md`  
> **Product:** Prostheia — Digital Dental Design Studio  
> **Source documents:** `plan.md`, `PRD.md`, `TECH.md`, `DB.md`  
> **Purpose:** Convert the complete Prostheia product into an ordered implementation plan made of large phases and smaller sub-phases.  
> **Important rule:** These are **engineering phases**, not product versions. Prostheia remains one coherent application.

---

# 1. How to Use This Document

This file defines **the order in which Prostheia should be built**.

The project is complex because it combines:

- a modern SaaS application;
- authentication;
- Supabase;
- a browser-based 3D CAD editor;
- mesh processing;
- sculpting;
- geometry analysis;
- Practice lessons;
- Free Lab;
- project save/revision logic;
- admin content tools;
- dental-specific workflows.

The safest way to build it is not to start with dental features directly.

The correct order is:

```text
Project foundation
→ application shell
→ shared CAD runtime
→ state/history/recovery
→ import/storage
→ geometry engine
→ analysis engine
→ Practice engine
→ Free Lab
→ cloud revisions
→ Admin
→ dental workflows
→ advanced CAD
→ polish/testing/deployment
```

Each phase should be completed and stabilized before moving deeply into the next.

---

# 2. Global Rules for All Phases

## 2.1 Do not create throwaway implementations

Do not build:

- a temporary Practice viewer;
- a second Free Lab editor;
- fake geometry calculations that will later be replaced everywhere;
- lesson-specific hardcoded 3D logic;
- page-level CAD state.

Everything important should be reusable.

---

## 2.2 Practice and Free Lab always share one CAD engine

At no point should we create:

```text
PracticeEditor
FreeLabEditor
```

as independent implementations.

The architecture must remain:

```text
Shared CAD Engine
   ↑          ↑
Practice   Free Lab
```

---

## 2.3 Do not proceed on broken foundations

A phase is complete only when its acceptance criteria pass.

Do not move ahead because:

> "We can fix that later."

CAD bugs become much harder to fix after domain workflows depend on them.

---

## 2.4 Test with realistic data early

Do not use only cubes and spheres after initial engine setup.

As soon as import works, test with:

- a realistic dental scan;
- a dense mesh;
- multiple jaw objects;
- individual tooth geometry.

---

## 2.5 Commit after meaningful milestones

Recommended Git discipline:

```text
feat/setup-project
feat/auth-shell
feat/cad-runtime
feat/import-pipeline
feat/sculpt-engine
feat/practice-engine
...
```

Avoid one giant branch containing weeks of unrelated changes.

---

# 3. Master Phase Overview

```text
PHASE 1   Dependency Installation & Project Bootstrap
PHASE 2   Application Foundation & UI Shell
PHASE 3   Supabase Foundation, Authentication & Authorization
PHASE 4   Database Core & Storage Foundation
PHASE 5   Shared CAD Workspace Skeleton
PHASE 6   CAD State, Scene Registry, History & Recovery
PHASE 7   Model Import & Asset Pipeline
PHASE 8   Core Mesh Editing
PHASE 9   Sculpting Engine
PHASE 10  Spatial & Geometry Analysis Engine
PHASE 11  Practice Engine
PHASE 12  Free Lab Engine
PHASE 13  Cloud Save, Revisions, Checkpoints & Export
PHASE 14  Admin Content Studio
PHASE 15  CAD Foundations Practice Content
PHASE 16  Crown Workflow
PHASE 17  Complete Denture Workflow
PHASE 18  Bridge / Inlay / Onlay / Veneer
PHASE 19  Partial Denture Workflow
PHASE 20  Bite Splint & Digital Model Workflows
PHASE 21  Virtual Articulator & Advanced Occlusion
PHASE 22  Implant Practice
PHASE 23  Screenshot & Annotation System
PHASE 24  Progress, Results & Product Dashboard Completion
PHASE 25  Internationalization & Content Verification
PHASE 26  Landing Page & Portfolio Presentation
PHASE 27  Security, Performance & Reliability Hardening
PHASE 28  QA, Final Acceptance & Production Deployment
```

---

# PHASE 1 — Dependency Installation & Project Bootstrap

> **This MUST be the first implementation phase.**

## Goal

Create a clean, reproducible development environment and install all foundational dependencies before feature development starts.

Nothing dental-specific is implemented in this phase.

---

## 1.1 Create Project Repository

Create the project:

```bash
npx create-next-app@latest prostheia
```

Required selections:

```text
TypeScript          Yes
ESLint              Yes
Tailwind CSS        Yes
src/ directory      optional — choose one convention and keep it
App Router          Yes
Turbopack           Yes if stable with selected stack
Import alias        @/*
```

Use one project root.

---

## 1.2 Confirm Runtime Versions

Use an LTS/stable Node version compatible with all dependencies.

Create:

```text
.nvmrc
```

or equivalent version documentation.

Verify:

```bash
node -v
npm -v
```

Document selected versions in README.

---

## 1.3 Install Core UI Dependencies

Install shadcn/ui setup and utility dependencies.

Initialize:

```bash
npx shadcn@latest init
```

Install required primitives gradually, but foundational components can include:

```text
button
dialog
dropdown-menu
tooltip
popover
tabs
sheet
input
label
select
separator
scroll-area
command
resizable
alert-dialog
toast/sonner
```

Do not install every shadcn component blindly.

---

## 1.4 Install 3D Stack

Install:

```bash
npm install three
npm install @react-three/fiber
npm install @react-three/drei
npm install @types/three
```

These are foundational.

---

## 1.5 Install CAD State Management

Install:

```bash
npm install zustand
```

---

## 1.6 Install Supabase

Install current compatible packages:

```bash
npm install @supabase/supabase-js
npm install @supabase/ssr
```

Do not place Supabase initialization randomly across the project.

Wrappers will later live in:

```text
lib/supabase/
```

---

## 1.7 Install Runtime Validation

Install:

```bash
npm install zod
```

Use it for:

- project manifests;
- API payloads;
- import metadata;
- Admin forms;
- environment configuration.

---

## 1.8 Install Geometry Dependencies

Install:

```bash
npm install three-mesh-bvh
```

Manifold/WASM package should be installed only after confirming the correct maintained browser package/API.

Before installing, verify:

- browser compatibility;
- WASM loading strategy;
- bundler compatibility;
- license.

Document selected package in `TECH.md` implementation notes.

---

## 1.9 IndexedDB Library

Choose and install a small IndexedDB wrapper.

Preferred direction:

```text
Dexie
```

Example:

```bash
npm install dexie
```

Purpose:

- local unsaved recovery;
- binary snapshots;
- recovery metadata.

---

## 1.10 Testing Dependencies

Install unit/integration testing:

```text
Vitest
React Testing Library
jsdom
```

Install E2E:

```text
Playwright
```

Set up scripts:

```json
"test"
"test:watch"
"test:e2e"
```

---

## 1.11 Code Quality

Ensure:

```text
ESLint
TypeScript strict mode
Prettier optional
```

Recommended:

```json
"strict": true
```

Do not disable strict TypeScript to bypass CAD typing problems.

---

## 1.12 Environment Files

Create:

```text
.env.local
.env.example
```

Example:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_APP_URL=
```

Never commit real secrets.

---

## 1.13 Base Folder Structure

Create initial directories:

```text
app/
components/
cad/
practice/
free-lab/
stores/
lib/
types/
supabase/
tests/
```

Inside CAD:

```text
cad/
├── engine/
├── scene/
├── camera/
├── selection/
├── transform/
├── geometry/
├── sculpt/
├── analysis/
├── import/
├── export/
├── history/
├── validation/
└── workers/
```

Only create empty structure if it helps organization.

Do not add fake implementation files.

---

## 1.14 Git Setup

Create:

```text
.gitignore
README.md
```

Initial commits:

```text
chore: initialize Prostheia project
chore: install core dependencies
chore: configure project structure
```

---

## 1.15 Phase 1 Acceptance Criteria

Phase 1 is complete when:

- [x] Next.js dev server runs.
- [x] TypeScript compiles.
- [x] ESLint passes.
- [x] Tailwind works.
- [x] shadcn component renders.
- [x] R3F Canvas renders a basic object.
- [x] Zustand store can be imported.
- [x] Supabase packages compile.
- [x] IndexedDB library initializes.
- [x] Vitest works.
- [x] Playwright basic test runs.
- [x] `.env.example` exists.
- [x] repository structure matches architecture.
- [x] no secrets are committed.

Do not start advanced CAD functionality before this phase passes.

### Phase 1 implementation record

- Project initialized in the existing folder with `src/`, App Router, Tailwind
  CSS 4, ESLint, and the `@/*` alias.
- Runtime baseline: Node.js `22.12.0`, npm `10.9.0`, Next.js `16.3.6`, React
  `19.2.8`, TypeScript `5.9.3`, Three.js `0.186.1`, R3F `9.8.1`, and Drei
  `10.7.8`; exact direct dependency versions are recorded in `package.json` and
  `package-lock.json`.
- shadcn/ui initialized with the Nova/Radix preset. Only button, dialog, input,
  label, separator, tooltip, and sonner components were added.
- Supabase packages and directory are present; authentication/client setup is
  intentionally deferred. Zustand, Zod, `three-mesh-bvh`, Dexie, Vitest,
  React Testing Library, and Playwright are installed.
- `/three-smoke` is an isolated minimal R3F rendering check. It is not a CAD
  workspace.
- `manifold-3d` `3.5.3` was checked for browser WASM support, ESM/WASM exports,
  and Apache-2.0 licensing. It remains deferred until worker and Turbopack
  loading can be verified with the boolean-operation work.
- Verification completed 2026-09-25: `npm ci`, `npm run build`,
  `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e`, and
  `npm audit` all pass. Vitest ran 2 unit checks; Playwright ran 1 Chromium
  smoke test and confirmed a live WebGL context.
- Remaining non-failing tool output: npm reports ESLint `9.39.5` is no longer
  supported; ESLint 10 requires Node `22.13.0+` and a newer TypeScript ESLint
  peer range than the selected Node `22.12.0` host supports. The browser also
  reports Three.js `Clock` deprecated while R3F 9.8.1 still uses it; rendering
  succeeds and the notice does not affect Phase 1 checks.

---

# PHASE 2 — Application Foundation & UI Shell

## Goal

Create the visible application shell before adding real CAD behavior.

---

## 2.1 Theme System

Implement:

```text
Light
Dark
System
```

CAD viewport background can later use its own neutral visual setting.

---

## 2.2 Marketing Layout

Create route group:

```text
(marketing)
```

Only skeleton required initially:

- header;
- footer;
- placeholder landing content.

Full landing page comes later.

---

## 2.3 Authentication Layout

Create:

```text
/login
/signup
```

UI only initially if Supabase setup is not finished.

---

## 2.4 Authenticated Application Shell

Create:

```text
dashboard
practice
free-lab
cases
progress
workspace/[caseId]
```

Create main app navigation.

---

## 2.5 App Navigation

Primary sections:

```text
Dashboard
Practice
Free Lab
My Cases
Progress
```

Admin navigation appears later based on role.

---

## 2.6 Workspace Layout

Build empty professional CAD shell:

```text
Top Menu
Left Scene Panel
Center Viewport
Right Properties
Contextual Toolbar
```

Do not add fake tool logic.

---

## 2.7 Responsive Rules

Editor:

```text
min ~1280px
desktop-only
```

If viewport too small:

```text
This CAD workspace requires a desktop-sized display.
```

Marketing can remain responsive.

---

## 2.8 Phase 2 Acceptance Criteria

- [x] application shell exists;
- [x] navigation works;
- [x] dark/light/system theme control works;
- [x] workspace layout matches CAD direction;
- [x] viewport remains dominant;
- [x] route skeletons exist;
- [x] no duplicated layouts.

### Phase 2 implementation record

- Added marketing, authentication UI, dashboard, Practice, Free Lab, My Cases,
  Progress, and case workspace route skeletons.
- Added shared product navigation and Light/Dark/System theme selection.
- The workspace is a visual shell only. It has no CAD controls wired to fake
  behavior, and login/signup remain UI-only until Phase 3.
- Verification: production build and lint pass. The initial build hit a stale
  generated Next.js validator under `.next/dev/types`; removing that generated
  cache file allowed the build to finish, including TypeScript and route checks.
- Supabase MCP was not available during implementation. It was not needed for
  Phase 2; access to a Supabase project will be needed to implement and verify
  Phases 3–4 against the real backend.

---

# PHASE 3 — Supabase Foundation, Authentication & Authorization

## Goal

Establish secure identity before user-owned project data exists.

---

## 3.1 Create Supabase Project

Configure:

```text
Auth
Postgres
Storage
```

---

## 3.2 Create Supabase Client Wrappers

Create:

```text
lib/supabase/browser.ts
lib/supabase/server.ts
lib/supabase/admin.ts
```

Rules:

- browser client uses public key;
- server client handles SSR cookies;
- admin client is server-only.

---

## 3.3 Authentication

Implement:

```text
Sign up
Login
Logout
Session restoration
```

Email/password first.

---

## 3.4 Protected Routes

Protect:

```text
/dashboard
/practice
/free-lab
/cases
/progress
/workspace/*
```

Unauthenticated:

```text
→ /login
```

---

## 3.5 Profiles

Create first DB migrations for:

```text
profiles
user_roles
```

Create auth signup trigger.

---

## 3.6 Role Authorization

Roles:

```text
user
admin
```

Implement:

```text
is_admin()
```

Admin role must never come from editable profile data.

---

## 3.7 Admin Route Guard

Create:

```text
/admin
```

Regular user:

```text
403 / redirect
```

Admin:

```text
allowed
```

---

## 3.8 Phase 3 Acceptance Criteria

- [ ] signup works (server action and callback are implemented; successful signup remains unverified with a real account);
- [ ] login works (server action is implemented; Supabase Auth failure path is verified, successful login remains unverified with a real account);
- [ ] logout works (server action and UI are implemented; signed-in logout remains unverified with a real account);
- [x] protected routes work (unauthenticated `/dashboard` is redirected to `/login`; the shared server layout covers app routes);
- [x] profile is created automatically (auth trigger verified through Supabase MCP in a transaction, then test identity rolled back);
- [x] user role created (trigger assigns `user` and ignores a supplied `role: admin` metadata value);
- [x] user cannot self-promote (role storage is private, client privileges are revoked, profile has no role field, and signup metadata cannot set the role);
- [x] admin route protected server-side (`/admin` uses the server-side admin guard and `is_admin()`; a real admin account allow-path remains unverified).

### Phase 3 implementation record

- Added Supabase browser, SSR server, server-only admin, and session-refresh wrappers. The admin client requires a service-role secret and is not initialized by public application paths.
- Added email/password signup, login, logout, callback/session restoration, safe internal redirects, protected app routes, and an admin route guard.
- Added tracked SQL migrations `20260925120000_phase_3_identity_auth.sql` and `20260925133000_phase_3_privilege_hardening.sql`. Applied them through the connected Supabase MCP after the migration files existed in the repository.
- The schema includes RLS-protected `public.profiles`, private `app_private.user_roles`, a signup trigger, and `public.is_admin()`. Supabase MCP verification confirmed RLS and grants; authenticated can select/update profiles but cannot insert them or access role storage, and anon has no profile access.
- The signup trigger was verified with a temporary auth identity inside a transaction and rolled back. It created a profile and `user` role while rejecting attempted admin metadata; no test account or profile remains.
- Verification: `npm run lint`, `npm run typecheck`, `npm test` (2 tests), `npm run test:e2e` (4 tests), and `npm run build` all pass. One existing Three.js `THREE.Clock` deprecation warning appears in the 3D smoke test.
- Remaining live verification: a real account is needed to exercise successful email signup/confirmation, login, session restoration, logout, and admin allow-path. Supabase MCP did not expose Auth URL configuration management, so the project's production redirect allowlist was not changed or verified. No service-role key was added; server admin client will require it when a trusted admin operation needs it.

---

# PHASE 4 — Database Core & Storage Foundation

## Goal

Implement the foundational schema before content and projects depend on it.

---

## 4.1 Migration Setup

Create Supabase migration flow.

Initial migrations:

```text
schemas
enums
security helpers
profiles
roles
content domains
skills
tools
assets
```

---

## 4.2 Core RLS

Enable RLS immediately.

Never create exposed tables and say:

> "We'll add RLS later."

---

## 4.3 Storage Buckets

Create:

```text
practice-assets
user-imports
case-geometry
screenshots
marketing-assets
```

Set private/public correctly.

---

## 4.4 Asset Metadata

Implement:

```text
assets
model_assets
asset_licenses
```

---

## 4.5 Seed Registries

Seed:

```text
content domains
skills
tool definitions
tool/object role relations
```

---

## 4.6 Generate DB Types

Generate Supabase TypeScript types.

Add regeneration procedure to README.

---

## 4.7 Phase 4 Acceptance Criteria

- [x] migrations run in order from the empty application-schema baseline;
- [x] RLS enabled on every exposed `public` table;
- [x] user cannot see another user's protected profile, asset, model, or license metadata;
- [x] Storage paths follow the documented per-bucket architecture;
- [x] admin can manage registry data and platform assets;
- [x] generated TypeScript database types compile.

### Phase 4 implementation record

- Added and applied six tracked Phase 4 migrations through Supabase MCP: enums; registry and asset tables with RLS; buckets and Storage policies; initial bilingual registries; foreign-key indexes; and Storage path-policy hardening.
- Created `content_domains`, `skills`, `tool_definitions`, `tool_object_roles`, `assets`, `model_assets`, and `asset_licenses`. `profiles` and protected `app_private.user_roles` remain from Phase 3. No Practice curriculum, case revision, validation configuration, or Phase 5 tables were added.
- Added the DB.md registry, asset, model, tool, and validation enums. Phase 3 supplies `app_locale`, `app_theme`, and `app_role`; its `is_admin()`, `set_updated_at()`, and `handle_new_user()` functions remain the security/identity helpers.
- Added published-content/admin policies for registries; owner/admin isolation for user asset metadata; published-authenticated/admin access to platform assets; authorized-parent checks for model and license metadata; and explicit deny access for direct user-role table access.
- Created private `practice-assets`, `user-imports`, `case-geometry`, and `screenshots` buckets plus intentionally public `marketing-assets`. Storage policies restrict practice assets to published metadata/admins, user files to owner paths, immutable case geometry from overwrite, screenshots to their owner, and marketing writes to admins. Path depth and GLB/WebP names are enforced.
- Seeded 12 domains, 16 skills, 25 tool definitions, and 450 tool/object-role mappings. No binary assets or licensed production models were seeded.
- Generated `src/types/database.types.ts` with Supabase MCP, typed all four Supabase clients with `Database`, and documented regeneration in `README.md`.
- Validation: all eight migration records are present through Phase 4; Supabase reports RLS enabled on all eight public tables; bucket privacy and registry counts match; a rolled-back SQL authorization test verified cross-user profile/asset/model/license isolation, non-admin denial, admin recognition, draft visibility, and admin registry/platform-asset writes. `npm run lint`, `npm run typecheck`, `npm test` (2 tests), and `npm run build` pass.
- Advisor review: no Phase 4 security lint remains except the intentional `public.is_admin()` security-definer RPC, required by DB.md and the existing server admin guard. The performance advisor reports only unused indexes because the new schema has no workload yet; no unindexed foreign keys remain.
- Storage bucket privacy, policy definitions, ownership predicates, and path rules were verified through Supabase MCP. The MCP connection exposes no Storage object upload/download operation, so a live Storage API access attempt was unavailable. No actual user objects exist in these buckets yet.

**Phase 4 complete.**

---

# PHASE 5 — Shared CAD Workspace Skeleton

## Goal

Build the first real shared CAD runtime.

---

## 5.1 R3F Canvas

Create CAD Canvas component.

Responsibilities:

- renderer;
- camera;
- lights;
- scene lifecycle.

---

## 5.2 Neutral CAD Environment

Implement:

- neutral background;
- non-distracting lighting;
- optional grid/reference axes.

---

## 5.3 Camera Controls

Implement:

```text
Orbit
Pan
Zoom
```

---

## 5.4 Standard Views

Implement:

```text
Front
Back
Left
Right
Top
Bottom
Reset
Frame Selected
```

---

## 5.5 Perspective / Orthographic

Implement camera mode switching.

---

## 5.6 Scene Tree

Create real Scene panel.

Must reflect runtime scene objects.

---

## 5.7 Object Visibility

Implement:

```text
Hide
Show
Isolate
Transparency
```

---

## 5.8 Selection

Implement object picking.

Selected object:

- highlighted;
- reflected in Scene Tree;
- drives Properties panel.

---

## 5.9 Transform Gizmo

Implement:

```text
Move
Rotate
Scale
```

---

## 5.10 Numeric Transform Inputs

Add:

```text
X / Y / Z
position
rotation
scale
```

---

## 5.11 Transform Steps

Add:

```text
Free
0.1mm
0.5mm
1mm
```

Rotation:

```text
Free
0.5°
1°
5°
```

---

## 5.12 Phase 5 Acceptance Criteria

- [ ] same workspace component can serve Practice and Free Lab;
- [ ] camera works;
- [ ] selection works;
- [ ] Scene Tree works;
- [ ] transforms work;
- [ ] numeric transforms work;
- [ ] no geometry stored in React component state.

---

# PHASE 6 — CAD State, Scene Registry, History & Recovery

## Goal

Stabilize editor state before destructive tools are added.

---

## 6.1 Geometry Registry

Implement stable application IDs.

Runtime object:

```text
id
mesh
role
geometry revision
dirty state
```

---

## 6.2 Zustand Stores

Separate:

```text
workspace store
UI store
history store
save store
practice store
```

Avoid monolithic store.

---

## 6.3 Dirty State

Track:

```text
clean
dirty
saving
saved
save_failed
```

---

## 6.4 Command History

Implement:

```text
Undo
Redo
```

Transform drag:

```text
1 gesture = 1 history entry
```

---

## 6.5 Keyboard Shortcuts

Initial:

```text
Ctrl+Z
Ctrl+Shift+Z / Ctrl+Y
Ctrl+S
Delete
G/Move or chosen shortcut
R/Rotate
S/Scale
```

Avoid browser conflicts where possible.

---

## 6.6 IndexedDB

Create local recovery database.

Store:

- latest unsaved manifest;
- changed object data;
- timestamp;
- cloud revision reference.

---

## 6.7 Recovery Prompt

Implement:

```text
Unsaved work found
Restore
Discard
```

---

## 6.8 Phase 6 Acceptance Criteria

- [ ] Undo/Redo stable;
- [ ] transform history stable;
- [ ] refresh recovery works;
- [ ] dirty state visible;
- [ ] CAD data survives accidental refresh through recovery;
- [ ] no cloud saving yet required.

---

# PHASE 7 — Model Import & Asset Pipeline

## Goal

Load real dental models safely.

---

## 7.1 STL Import

Implement first.

---

## 7.2 File Validation

Check:

```text
extension
size
geometry
NaN
Infinity
triangle count
bounds
```

---

## 7.3 Worker Parsing

Move heavy model parsing to Worker where practical.

---

## 7.4 Import Wizard

Flow:

```text
Upload
Identify object
Orientation
Scale/unit confirmation
Alignment
Review
Workspace
```

---

## 7.5 Object Role Selection

Support:

```text
Maxilla
Mandible
Antagonist
Pre-op
Tooth
Reference
Restoration
Other
```

---

## 7.6 Canonical Coordinates

Normalize imported data to Prostheia coordinate system.

Store original transform.

---

## 7.7 Direct Supabase Upload

Browser:

```text
→ Supabase Storage
```

Never:

```text
browser → Vercel binary proxy → Supabase
```

for large model files.

---

## 7.8 OBJ / PLY / GLB

After STL is stable, add:

```text
OBJ
PLY
GLB
```

---

## 7.9 Real Dental Test Models

Test:

- upper jaw;
- lower jaw;
- individual tooth;
- dense scan;
- imperfect/open scan.

---

## 7.10 Phase 7 Acceptance Criteria

- [ ] STL works end-to-end;
- [ ] invalid model handled;
- [ ] import wizard works;
- [ ] roles stored;
- [ ] object opens correctly in workspace;
- [ ] direct Storage upload works;
- [ ] large model does not freeze application unacceptably.

---

# PHASE 8 — Core Mesh Editing

## Goal

Build non-sculpt geometry tools first.

---

## 8.1 Mesh Region Selection

Implement:

- face/region selection;
- brush/lasso strategy as appropriate.

---

## 8.2 Delete Region

Selected geometry can be removed.

---

## 8.3 Trim

Implement useful scan trimming behavior.

Do not require solid boolean for open scan trimming.

---

## 8.4 Smooth

Implement controlled surface smoothing.

---

## 8.5 Fill Hole

Implement where topology allows.

Handle failure safely.

---

## 8.6 Duplicate

Clone object.

---

## 8.7 Mirror

Add only for workflows where meaningful.

---

## 8.8 Mesh Operation History

Every destructive operation must support Undo.

---

## 8.9 Phase 8 Acceptance Criteria

- [ ] selection stable;
- [ ] delete stable;
- [ ] trim stable;
- [ ] smooth stable;
- [ ] fill hole handles valid/invalid cases;
- [ ] Undo restores geometry;
- [ ] geometry can still be saved/exported.

---

# PHASE 9 — Sculpting Engine

## Goal

Create the main digital wax modeling system.

---

## 9.1 Brush Picker

Raycast hit point.

---

## 9.2 Brush Neighborhood

Use BVH to find affected geometry.

---

## 9.3 Add

Push vertices outward.

---

## 9.4 Remove

Push vertices inward.

---

## 9.5 Smooth

Local smoothing.

---

## 9.6 Brush Controls

Implement:

```text
Size
Strength
```

---

## 9.7 Sculpt History

One stroke should create a manageable history operation.

Do not snapshot entire 100MB mesh for every stroke if avoidable.

---

## 9.8 BVH Refit

Update acceleration after local deformation.

---

## 9.9 Flatten

Add after Add/Remove/Smooth are stable.

---

## 9.10 Morph

Prototype before locking final UX.

---

## 9.11 Density Warnings

Detect very low-density mesh for sculpting.

Warn:

```text
This model has limited mesh density. Large sculpt changes may reduce surface quality.
```

---

## 9.12 Phase 9 Acceptance Criteria

- [ ] Add works;
- [ ] Remove works;
- [ ] Smooth works;
- [ ] size/strength work;
- [ ] camera does not conflict with sculpt;
- [ ] history works;
- [ ] no major UI freezes;
- [ ] dense dental model tested.

---

# PHASE 10 — Spatial & Geometry Analysis Engine

## Goal

Create reusable analysis used by both Practice and Free Lab.

---

## 10.1 BVH Infrastructure

Implement:

```text
build
rebuild
refit
dispose
```

---

## 10.2 Distance Measurement

Implement point-to-point measurement.

---

## 10.3 Intersection Detection

Detect object collision.

---

## 10.4 Reference Deviation

Compare user geometry to reference.

Render heatmap.

---

## 10.5 Contact Analysis

Build distance/contact visualization.

Use configurable thresholds.

---

## 10.6 Section View

First:

```text
visual clipping plane
```

Advanced topology contour later.

---

## 10.7 Thickness

Implement after basic spatial engine stable.

---

## 10.8 Insertion Path / Undercut

Implement with domain validation.

Do not fake clinical accuracy.

---

## 10.9 Analysis Worker Jobs

Heavy operations should run off UI thread.

---

## 10.10 Phase 10 Acceptance Criteria

- [ ] measurement works;
- [ ] intersections work;
- [ ] deviation map works;
- [ ] contact map works;
- [ ] section view works;
- [ ] analysis can be reused by Practice validators;
- [ ] analysis does not permanently block viewport.

---

# PHASE 11 — Practice Engine

## Goal

Turn the shared CAD workspace into a reusable learning environment.

---

## 11.1 Practice Database Tables

Implement:

```text
modules
lessons
steps
hints
tool permissions
validations
skills
```

---

## 11.2 Practice Catalog

UI:

```text
Foundation
Beginner
Intermediate
Advanced
```

All accessible.

---

## 11.3 Prerequisites

Show recommended prerequisites.

Allow:

```text
Start anyway
```

---

## 11.4 Lesson Runtime

Load:

- lesson;
- assets;
- current step;
- allowed tools;
- hints;
- validators.

---

## 11.5 Sequential Steps

Required steps cannot be skipped.

---

## 11.6 Contextual Help

Implement floating/pinnable panel.

---

## 11.7 Reference Model

Modes:

```text
Off
Outline
Transparent
Full
```

---

## 11.8 Design Check

Render:

```text
Pass
Warning
Fail
Show Issue
```

---

## 11.9 Score

0–100 secondary score.

Never dominate UI.

---

## 11.10 Attempts

Persist:

- start;
- completion;
- step results;
- validation results.

---

## 11.11 Phase 11 Acceptance Criteria

- [ ] one real lesson runs end-to-end;
- [ ] tool restrictions work;
- [ ] sequential steps work;
- [ ] hints work;
- [ ] reference works;
- [ ] Design Check works;
- [ ] result saved;
- [ ] retry works.

---

# PHASE 12 — Free Lab Engine

## Goal

Allow independent work with no guided lesson sequence.

---

## 12.1 Entry Modes

Implement:

```text
Scenario
Import My Case
Blank Workspace
```

---

## 12.2 Scenario Catalog

Filters:

```text
Category
Difficulty
```

---

## 12.3 Scenario Brief

Display:

```text
Patient ID
Age if relevant
Indication
Tooth/teeth
Material preset
Available data
Requirements
```

---

## 12.4 Independent Workspace

No forced steps.

No Practice instructions.

Tool help remains available.

---

## 12.5 Random Case

Implement:

```text
Give me something to practice
```

with:

```text
category
difficulty
```

---

## 12.6 Phase 12 Acceptance Criteria

- [ ] scenario opens;
- [ ] brief shown;
- [ ] no guided sequence;
- [ ] import case works;
- [ ] blank case works;
- [ ] random case works.

---

# PHASE 13 — Cloud Save, Revisions, Checkpoints & Export

## Goal

Make CAD work persist safely.

---

## 13.1 Case Object Model

Implement:

```text
user_cases
case_objects
case_object_versions
```

---

## 13.2 Geometry Versioning

Rule:

```text
Transform only
→ no new geometry asset

Mesh modification
→ new geometry version
```

---

## 13.3 Manual Save

Implement:

```text
Ctrl+S
Save button
```

---

## 13.4 Revision Transaction

Implement:

```text
commit_case_revision
```

---

## 13.5 Case Head

Current revision updated atomically.

---

## 13.6 Save As

Create new logical case.

---

## 13.7 Duplicate

Reuse immutable geometry when safe.

---

## 13.8 Named Checkpoints

Example:

```text
Before occlusion adjustment
```

---

## 13.9 Export

Implement:

```text
STL
```

first.

Then:

```text
OBJ
GLB
```

where meaningful.

---

## 13.10 Component Selection

Allow export of selected:

```text
Upper
Lower
Teeth
Base
Framework
```

---

## 13.11 Phase 13 Acceptance Criteria

- [ ] save stable;
- [ ] revision numbers stable;
- [ ] transform-only save does not duplicate mesh;
- [ ] sculpt save creates new geometry version;
- [ ] Save As works;
- [ ] Duplicate works;
- [ ] checkpoint works;
- [ ] STL export works.

---

# PHASE 14 — Admin Content Studio

## Goal

Allow content growth without source-code changes.

---

## 14.1 Admin Dashboard

Create sections:

```text
Lessons
Scenarios
Models
Validation
Tools
References
```

---

## 14.2 Model Upload

Admin uploads platform model.

Configure:

```text
role
format
license
metadata
```

---

## 14.3 Lesson Editor

Fields:

```text
Title
Module
Difficulty
Goal
Steps
Tools
Hints
Reference
Validators
```

---

## 14.4 Step Editor

Reorder steps.

Assign allowed tools.

Assign validators.

---

## 14.5 Scenario Editor

Configure:

```text
brief
patient metadata
assets
difficulty
material preset
requirements
```

---

## 14.6 Validation Editor

Configure existing validator types.

No arbitrary executable code.

---

## 14.7 Publish Workflow

Validate before publish.

---

## 14.8 Phase 14 Acceptance Criteria

- [ ] admin creates lesson without code;
- [ ] admin uploads model;
- [ ] admin creates scenario;
- [ ] admin configures step tools;
- [ ] admin attaches validation;
- [ ] publish validation prevents broken content.

---

# PHASE 15 — CAD Foundations Practice Content

## Goal

Create the first complete learning curriculum using already finished engine tools.

---

## 15.1 Navigation Lessons

Create:

```text
Orbit
Pan
Zoom
Standard Views
```

---

## 15.2 Scene Lessons

Create:

```text
Select
Hide/Show
Isolate
Transparency
```

---

## 15.3 Transform Lessons

Create:

```text
Move
Rotate
Scale
Numeric Input
Snapping
```

---

## 15.4 Measurement Lessons

Create:

```text
Distance
Angle if available
Section
```

---

## 15.5 Sculpt Basics

Create:

```text
Add
Remove
Smooth
```

---

## 15.6 Scan Preparation Basics

Create:

```text
Orient
Trim
Smooth
Fill Hole
```

---

## 15.7 Phase 15 Acceptance Criteria

- [ ] Foundation module coherent;
- [ ] tool help exists;
- [ ] bilingual content;
- [ ] users can repeat any lesson;
- [ ] progress updates.

---

# PHASE 16 — Crown Workflow

## Goal

Create first serious dental indication.

---

## 16.1 Margin System

Implement/create workflow for margin.

---

## 16.2 Insertion Path

Add visualization and interaction.

---

## 16.3 Undercut Analysis

Connect to insertion direction.

---

## 16.4 Tooth Library Placement

Place anatomy.

---

## 16.5 Adjacent Contacts

Use contact analysis.

---

## 16.6 Occlusal Contacts

Use antagonist.

---

## 16.7 Crown Sculpting

Use shared sculpt engine.

---

## 16.8 Thickness

Use thickness analysis.

---

## 16.9 Practice Lessons

Create:

```text
Margin
Insertion Path
Placement
Contacts
Sculpt
Thickness
Full Crown Case
```

---

## 16.10 Free Lab Scenario

Create at least:

```text
Posterior Crown 26
```

---

## 16.11 Phase 16 Acceptance Criteria

- [ ] full crown workflow achievable;
- [ ] Practice workflow works;
- [ ] Free Lab crown case works;
- [ ] Design Check meaningful.

---

# PHASE 17 — Complete Denture Workflow

## Goal

Implement one of Prostheia's central learning experiences.

---

## 17.1 Model Analysis

Implement data/interaction for landmarks.

---

## 17.2 Midline

Add editable reference.

---

## 17.3 Occlusal Plane

Add plane manipulation.

---

## 17.4 Tooth Library

Create/open educational tooth sets.

---

## 17.5 Anterior Setup

Create placement workflow.

---

## 17.6 Posterior Setup

Create placement workflow.

---

## 17.7 Arch Mode

Implement group transforms.

---

## 17.8 Chain Mode

Implement linked tooth behavior.

---

## 17.9 Individual Mode

Use regular transform controls.

---

## 17.10 Contact / Occlusion

Connect existing analysis.

---

## 17.11 Denture Base Boundary

Implement curve/boundary.

---

## 17.12 Base Generation

Generate initial base.

---

## 17.13 Base Sculpt

Use shared sculpt tools.

---

## 17.14 Tooth Sockets / Adaptation

Use safe geometry/boolean workflow.

---

## 17.15 Practice Curriculum

Create:

```text
Model Analysis
Tooth Selection
Anterior Setup
Posterior Setup
Chain Mode
Occlusion
Base
Full Denture Case
```

---

## 17.16 Free Lab Cases

At least:

```text
Upper Complete Denture
Upper + Lower Complete Denture
```

---

## 17.17 Phase 17 Acceptance Criteria

- [ ] complete denture workflow usable;
- [ ] arch/chain/individual modes stable;
- [ ] base generated;
- [ ] Practice complete;
- [ ] Free Lab complete.

---

# PHASE 18 — Bridge / Inlay / Onlay / Veneer

## Goal

Expand fixed prosthetics using existing crown infrastructure.

---

## 18.1 Bridge

Implement:

```text
Pontic
Connector
Multi-unit manipulation
Gingiva relation
```

---

## 18.2 Inlay

Reuse:

```text
margin
insertion
contacts
thickness
```

---

## 18.3 Onlay

Same base engine, different configuration/content.

---

## 18.4 Veneer

Add anterior-focused workflow.

---

## 18.5 Practice Content

Create lessons and full cases.

---

## 18.6 Phase 18 Acceptance Criteria

- [ ] no duplicate crown engine;
- [ ] workflows reuse existing tools;
- [ ] scenarios exist.

---

# PHASE 19 — Partial Denture Workflow

## Goal

Implement surveying and removable partial framework workflows.

---

## 19.1 Survey Mode

Add model orientation analysis.

---

## 19.2 Undercut Map

Connect to insertion direction.

---

## 19.3 Blockout

Implement geometry workflow.

---

## 19.4 Major Connector

Create editable framework area.

---

## 19.5 Lingual Bar

Implement configuration.

---

## 19.6 Retention Mesh

Implement appropriate geometry.

---

## 19.7 Clasps

Create clasp workflow.

---

## 19.8 Minor Connectors

Add.

---

## 19.9 Rests

Add.

---

## 19.10 Guide Planes

Add.

---

## 19.11 Finish Lines

Add.

---

## 19.12 Practice Cases

Create:

```text
Kennedy I
Kennedy II
Kennedy III
Kennedy IV
```

---

## 19.13 Phase 19 Acceptance Criteria

- [ ] survey/undercut works;
- [ ] framework workflow coherent;
- [ ] no clinical claims;
- [ ] Practice and Free Lab cases usable.

---

# PHASE 20 — Bite Splint & Digital Model Workflows

## Goal

Add two workflows that reuse existing tools.

---

## 20.1 Bite Splint

Implement:

```text
Insertion direction
Undercut
Bottom/internal surface
Margin
Thickness
Sculpt
Occlusion
```

---

## 20.2 Digital Model

Implement:

```text
Trim
Orient
Base
Removable dies
Attachments
```

---

## 20.3 Practice Content

Create guided lessons.

---

## 20.4 Free Lab

Create scenarios.

---

## 20.5 Phase 20 Acceptance Criteria

- [ ] both workflows reuse shared systems;
- [ ] lesson content complete;
- [ ] scenarios complete.

---

# PHASE 21 — Virtual Articulator & Advanced Occlusion

## Goal

Add dynamic jaw movement and contact analysis.

---

## 21.1 Jaw Groups

Separate:

```text
upper
lower
```

---

## 21.2 Open / Close

Implement first.

---

## 21.3 Protrusion

Add.

---

## 21.4 Left Lateral

Add.

---

## 21.5 Right Lateral

Add.

---

## 21.6 Dynamic Contact Preview

Do not full-recalculate expensive map every animation frame.

Use progressive strategy.

---

## 21.7 Educational Parameters

Clearly identify articulator as educational simulation.

---

## 21.8 Phase 21 Acceptance Criteria

- [ ] movement stable;
- [ ] contacts update;
- [ ] performance acceptable;
- [ ] no unsupported biomechanical claims.

---

# PHASE 22 — Implant Practice

## Goal

Add Advanced implant-related educational workflows.

---

## 22.1 Scan Body Matching

Implement educational workflow.

---

## 22.2 Implant Visualization

Add implant position.

---

## 22.3 Emergence Profile

Add.

---

## 22.4 Custom Abutment

Add.

---

## 22.5 Screw Channel

Add.

---

## 22.6 Crown Integration

Reuse crown engine.

---

## 22.7 Practice

Advanced only.

---

## 22.8 Phase 22 Acceptance Criteria

- [ ] educational boundaries clear;
- [ ] no surgical planning;
- [ ] workflows coherent.

---

# PHASE 23 — Screenshot & Annotation System

## Goal

Allow users to capture and visually mark designs.

---

## 23.1 Capture View

Export viewport image.

---

## 23.2 Save Screenshot

Store in private Storage.

---

## 23.3 Annotation Tools

Implement:

```text
Arrow
Circle
Text
Highlight
```

---

## 23.4 Phase 23 Acceptance Criteria

- [ ] screenshot created;
- [ ] saved per case;
- [ ] annotations persist;
- [ ] private access enforced.

---

# PHASE 24 — Progress, Results & Dashboard Completion

## Goal

Make learning progress useful without gamification.

---

## 24.1 Lesson Progress

Implement best result logic.

---

## 24.2 Skill Progress

Aggregate:

```text
Navigation
Sculpting
Crown
Dentures
Occlusion
...
```

---

## 24.3 Progress Page

Show:

```text
completed
attempted
best results
skill progress
```

---

## 24.4 Dashboard

Final widgets:

```text
Continue Practice
Free Lab
Recent Cases
Progress
```

---

## 24.5 Phase 24 Acceptance Criteria

- [ ] no XP/streaks;
- [ ] progress accurate;
- [ ] attempts update correctly;
- [ ] dashboard useful.

---

# PHASE 25 — Internationalization & Content Verification

## Goal

Make the product genuinely bilingual and educationally responsible.

---

## 25.1 English UI

Complete.

---

## 25.2 Serbian UI

Complete.

---

## 25.3 Terminology Pattern

Use:

```text
English term
Serbian explanation
```

where appropriate.

---

## 25.4 Domain References

Link important numeric/domain rules to sources.

---

## 25.5 Expert Review

Mark:

```text
unverified
source_reviewed
expert_verified
```

---

## 25.6 Review Important Content

Priority:

```text
contacts
thickness
insertion path
occlusion
denture setup
partial denture
implants
```

---

## 25.7 Phase 25 Acceptance Criteria

- [ ] SR and EN complete;
- [ ] no fake clinical certainty;
- [ ] important domain values sourced/reviewed;
- [ ] disclaimer present.

---

# PHASE 26 — Landing Page & Portfolio Presentation

## Goal

Make Prostheia presentable as a serious product.

---

## 26.1 Hero

Explain product clearly.

---

## 26.2 Product Overview

Show:

```text
Practice
Free Lab
CAD Workspace
```

---

## 26.3 Feature Sections

Include:

```text
3D modeling
real scenarios
analysis
guided learning
```

---

## 26.4 Screenshots

Use real application screenshots.

---

## 26.5 Technical Story

Briefly show browser-based CAD approach.

---

## 26.6 CTA

Login/sign up.

---

## 26.7 Phase 26 Acceptance Criteria

- [ ] professional appearance;
- [ ] responsive marketing page;
- [ ] no fake features;
- [ ] real product screenshots.

---

# PHASE 27 — Security, Performance & Reliability Hardening

## Goal

Prepare real production quality.

---

## 27.1 RLS Audit

Test every table.

---

## 27.2 Storage Audit

Verify private/public paths.

---

## 27.3 Admin Audit

Verify no client-only admin checks.

---

## 27.4 Performance Profiling

Test:

```text
dense STL
multiple jaws
multiple teeth
sculpt
contacts
deviation
save
```

---

## 27.5 Memory Profiling

Check:

```text
geometry disposal
material disposal
object URLs
workers
BVH
```

---

## 27.6 Error States

Complete:

```text
upload failed
parse failed
save failed
export failed
worker failed
invalid geometry
```

---

## 27.7 Browser Tests

At least:

```text
Chrome/Chromium
Firefox
Safari where possible
```

---

## 27.8 Security Review

Check:

```text
service role leakage
RLS
uploaded files
sanitization
admin routes
Storage
```

---

## 27.9 Phase 27 Acceptance Criteria

- [ ] RLS tests pass;
- [ ] memory leaks controlled;
- [ ] realistic model performance acceptable;
- [ ] error states understandable;
- [ ] no exposed secrets.

---

# PHASE 28 — QA, Final Acceptance & Production Deployment

## Goal

Release one coherent production application.

---

## 28.1 Full E2E Flows

Test:

### Practice

```text
signup
→ Practice
→ lesson
→ CAD work
→ Design Check
→ complete
→ progress
```

### Free Lab

```text
Free Lab
→ scenario
→ CAD work
→ save
→ reload
→ export
```

### Import

```text
upload
→ orient
→ workspace
→ edit
→ save
```

### Admin

```text
admin
→ create lesson
→ attach model
→ publish
→ regular user can access
```

---

## 28.2 Database Migration Test

Fresh DB:

```text
migration 001
→ final migration
→ seed
```

Must pass.

---

## 28.3 Production Supabase

Verify:

```text
Auth config
URLs
RLS
Storage
backup
```

---

## 28.4 Vercel Production

Configure:

```text
environment variables
production domain
build
```

---

## 28.5 Error Monitoring

Configure production monitoring if selected.

---

## 28.6 Final Clinical Disclaimer Review

Ensure correct educational wording.

---

## 28.7 Final Acceptance Criteria

Product is ready when:

- [ ] all critical E2E flows pass;
- [ ] save/recovery works;
- [ ] Practice works;
- [ ] Free Lab works;
- [ ] Admin works;
- [ ] realistic CAD scenarios work;
- [ ] no critical RLS issues;
- [ ] no major browser freezes;
- [ ] production deploy stable.

---

# 4. Phase Dependency Graph

```text
1 Dependency Installation
        ↓
2 UI Foundation
        ↓
3 Auth
        ↓
4 DB + Storage
        ↓
5 CAD Workspace
        ↓
6 State / History / Recovery
        ↓
7 Import
        ↓
8 Mesh Editing
        ↓
9 Sculpt
        ↓
10 Analysis
        ↓
11 Practice ─────────────┐
        ↓                │
12 Free Lab              │
        ↓                │
13 Save / Revisions      │
        ↓                │
14 Admin                 │
        ↓                │
15 Foundations Content   │
        ↓                │
16 Crown                 │
        ↓                │
17 Complete Denture      │
        ↓                │
18 Fixed Expansion       │
        ↓                │
19 Partial Denture       │
        ↓                │
20 Splint / Model        │
        ↓                │
21 Articulator           │
        ↓                │
22 Implant               │
        ↓                │
23 Screenshots           │
        ↓                │
24 Progress / Dashboard  │
        ↓                │
25 i18n / Verification   │
        ↓                │
26 Landing               │
        ↓                │
27 Hardening             │
        ↓                │
28 Production            │
```

---

# 5. Parallel Work That Is Safe

Not every phase has to be 100% serial.

The following can overlap after foundations are stable.

---

## UI + Database

While CAD engine is developed:

```text
Practice catalog UI
Admin forms
Progress UI
```

can progress in parallel.

---

## Content + Engine

Once tools exist:

```text
lesson copy
tool explanations
translations
domain source research
```

can be prepared while more CAD features are built.

---

## Landing Page

Can be done late in parallel with hardening.

Do not prioritize it before real product screens exist.

---

# 6. Work That Should NOT Be Parallelized Too Early

Avoid working deeply on:

```text
Crown
Complete Denture
Partial Denture
Splint
```

before shared:

```text
Transforms
Mesh
Sculpt
Analysis
```

are stable.

Otherwise every domain feature will implement its own workaround.

---

# 7. Recommended Development Milestones

These are checkpoints across phases.

---

## Milestone A — App Exists

After Phase 4:

```text
Auth
Supabase
UI shell
DB
Storage
```

No CAD product yet.

---

## Milestone B — Real 3D Editor

After Phase 7:

```text
real dental models
selection
transforms
import
```

---

## Milestone C — Real CAD Engine

After Phase 10:

```text
mesh editing
sculpt
analysis
```

At this point Prostheia stops being a 3D viewer and becomes a CAD environment.

---

## Milestone D — Product Model Proven

After Phase 13:

```text
Practice
Free Lab
Save
Revision
Export
```

This proves the complete product architecture.

---

## Milestone E — Content Platform Proven

After Phase 15:

```text
Admin
Foundation curriculum
real configurable lessons
```

---

## Milestone F — First Full Dental Workflow

After Phase 16:

```text
Crown end-to-end
```

---

## Milestone G — Core Product Identity

After Phase 17:

```text
Complete Denture end-to-end
```

At this point the application strongly reflects the original product idea.

---

## Milestone H — Broad Dental CAD Platform

After Phase 22.

---

## Milestone I — Production

After Phase 28.

---

# 8. Definition of Done Per Feature

Every meaningful CAD feature must satisfy:

```text
1. Tool works.
2. Tool has visible feedback.
3. Tool respects object selection.
4. Tool supports history if destructive.
5. Tool does not create major UI freezes.
6. Tool works in Free Lab.
7. Tool can be enabled/restricted by Practice.
8. Tool has contextual help.
9. Relevant errors are handled.
10. Feature has tests where feasible.
```

A button that calls incomplete code is not considered done.

---

# 9. Recommended Priority if Time Becomes Limited

If development time becomes constrained, **do not reduce quality by adding every domain badly**.

Priority order:

```text
1. Shared CAD quality
2. Practice engine quality
3. Free Lab quality
4. Crown
5. Complete Denture
6. Admin
7. Save/recovery
8. Other dental workflows
```

If necessary:

```text
fewer complete workflows
>
many fake workflows
```

This does not redefine the product scope.

It defines implementation discipline.

---

# 10. First Work Session Checklist

When development begins, do exactly this first:

```text
1. Create Next.js repository.
2. Confirm Node/npm.
3. Initialize Git.
4. Install Tailwind/shadcn.
5. Install Three.js/R3F/Drei.
6. Install Zustand.
7. Install Supabase.
8. Install Zod.
9. Install three-mesh-bvh.
10. Install IndexedDB wrapper.
11. Install testing stack.
12. Create .env.example.
13. Create folder architecture.
14. Render one R3F test object.
15. Run typecheck/lint/test.
16. Commit Phase 1.
```

Do **not** start designing Crown or Denture tools during the first session.

---

# 11. Final Phase Strategy

The most important order in the entire project is:

```text
Infrastructure
before
CAD

CAD primitives
before
dental workflows

geometry analysis
before
Design Check

Practice engine
before
hundreds of lessons

Admin
before
large content library

real working product
before
marketing polish
```

Prostheia will be successful if every dental workflow is built from stable shared primitives rather than case-specific hacks.

The phases in this document are designed to make that happen.
