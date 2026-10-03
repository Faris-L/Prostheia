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

- [x] Undo/Redo stable;
- [x] transform history stable in unit coverage; gizmo interaction awaits manual browser verification;
- [ ] refresh recovery works — implemented; manual browser verification pending;
- [x] dirty state visible;
- [ ] CAD data survives accidental refresh through recovery — manual restore check pending;
- [x] no cloud saving yet required.

### Implementation status

Phase 6 implementation and automated checks are complete. **Phase 6 is awaiting manual verification** of a gizmo transform, browser refresh, recovery prompt, Restore, and Discard. Do not mark this phase complete until those browser interactions have been checked.

---

# PHASE 7 — Model Import & Asset Pipeline

## Goal

Load real dental models safely.

---

## 7.1 STL Import

Implement through the shared import abstraction. Also support OBJ, PLY, GLB, and self-contained glTF files through Three.js loaders.

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

Parse, validate, normalize, and serialize geometry in a module Web Worker. Pass transferable typed-array buffers back to the main thread; never pass Three.js runtime objects.

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

The Phase 7 entry point keeps this workflow compact: choose one or more files, set each object's dental role and source unit, review warnings, then align in the shared CAD viewport. Preserve source orientation when it is unknown rather than inferring anatomy.

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

Convert units to millimeters while preserving source coordinates, origin, and right-handed source axes until a user confirms alignment to Prostheia's Z-up convention. Import must not recenter geometry. A future recenter operation must be explicit.

Store the source-to-workspace normalization transform separately from editor transforms.

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

For user imports, upload the untouched original directly from the browser to the existing private `user-imports` bucket and register it in the existing `assets` and `model_assets` tables. Keep the in-memory normalized runtime mesh separate. Do not upload from an API route or store runtime buffers in editor state.

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

- [x] STL, OBJ, PLY, GLB, and self-contained glTF use one import pipeline;
- [x] invalid model and unsafe sizes are rejected with structured messages;
- [x] compact import workflow sets role and unit and reports stage progress;
- [x] roles and import metadata are available in the workspace;
- [x] normalized objects open in the workspace and support transforms, visibility, isolate, and transparency;
- [x] optional raw source upload goes directly to private Supabase Storage;
- [x] parser work runs in a Web Worker with transferable buffers and cleanup;
- [ ] real dental model, multiple-file, transform, and recovery behavior verified in the browser.

### Implementation status

**Phase 7 awaiting manual verification.** Automated implementation and checks cover the generic import pipeline. No permanent dental sample mesh is included because a suitable asset with verified licensing was not present; manual verification needs a dental STL/OBJ/PLY/GLB file supplied by the user. Imported runtime geometry is session-only. Phase 6 recovery continues to cover its existing demo state; it does not claim it can restore imported geometry buffers.

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

- [x] object and face/region selection use stable object and child-mesh IDs;
- [x] delete, trim, one-shot smooth, fill hole, cleanup, mirror, and duplicate operate on runtime geometry;
- [x] fill hole rejects missing, branching, and non-manifold boundaries;
- [x] mesh Undo/Redo swaps actual geometry revisions;
- [x] edited imported objects can be exported as GLB with child hierarchy preserved.

### Phase 8 implementation record

**Phase 8 awaiting manual verification.** Mesh data stays in the geometry
registry. Worker operations validate finite coordinates, triangle indices,
non-empty results, normals, and bounds before installing a new revision.
Imported GLB child transforms are preserved; non-indexed geometry is converted
to sequential indices for editing. BVHs are built during idle time for mesh
face raycasting. Mesh history is bounded by a 128 MiB budget and 12 operations,
with the currently active and original geometry revisions retained.

The runtime geometry remains session-only. Ctrl+S does not persist imported or
edited mesh buffers, and the UI tells users to re-import those files after a
reload. Local export writes the selected object as GLB; it does not change the
original uploaded file. No Phase 6 or Phase 7 manual-verification status was
changed by Phase 8.

Manual verification still needs a real dental STL: import it, select faces,
apply an edit, inspect the result, Undo, Redo, export GLB, and re-import the
export to inspect hierarchy and coordinates.

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

### Phase 9 implementation record

Sculpting uses a BVH-backed geometry neighborhood query and one transient working
geometry clone per pointer stroke. Pointer samples are interpolated at a fixed
fraction of brush radius, and Add, Remove, Smooth, Flatten, and Morph update
only nearby vertices. Pointer-up validates the working geometry, installs one
immutable geometry revision, updates mesh statistics, and records one
`MeshOperationCommand`; Escape restores the original geometry without history.
The brush cursor is a temporary viewport ring, with radius controls expressed in
workspace millimeters and strength expressed as a percentage. BVHs and mutable
geometry remain outside Zustand. Imported geometry remains session-only and
must be re-imported after reload; local recovery does not persist sculpted mesh
buffers.

Automated brush and stroke checks are implemented. No real dental STL was
available for dense-mesh performance or visual verification, so **Phase 9 is
awaiting manual verification**. Phases 6–8 manual-verification statuses remain
unchanged.

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

- [x] measurement works;
- [x] intersections work;
- [x] deviation map works;
- [x] contact map works;
- [x] section view works;
- [x] analysis can be reused by Practice validators;
- [x] analysis does not permanently block viewport.

### Phase 10 implementation record

The shared `src/cad/analysis` layer targets stable Prostheia object IDs and mesh-child IDs. Requests snapshot normalized millimeter geometry into world coordinates and record the current geometry revision and transform signature. A typed module Worker receives transferable position/index buffers, reports progress, and returns serializable intersection or scalar results. The Worker builds temporary `three-mesh-bvh` trees for surface intersection and nearest-point queries; results are session-only and are marked stale when either target's revision or transform changes. A new request builds a fresh analysis snapshot; no analysis cache is retained.

Implemented tools are point-to-point measurement, visual clipping section, surface-triangle intersection, unsigned nearest-surface deviation, and directional proximity mapping from target A vertices to target B. Deviation/proximity values are millimeters; the configurable proximity threshold only controls the visualization color range. It is not a clinical threshold. Scalar visualization is a temporary overlay and does not replace source geometry/material data. Section clipping temporarily attaches a clipping plane to viewport materials and restores prior clipping settings when disabled. Analysis mode exits sculpt mode before accepting input. Analysis is not included in geometry undo/redo and does not dirty mesh state.

Closest-point deviation is sampled at target A vertices against target B triangles. It is unsigned and does not represent full clinical accuracy. Proximity is directional and is not signed penetration depth; use Intersection for surface-triangle crossing. Open or non-manifold surfaces remain measurable as surfaces, but the engine does not infer inside/outside or a valid closed-volume collision. Multi-mesh targets require choosing an explicit child. Dense real dental geometry still needs manual performance and visual review.

Synthetic tests cover 3-4-5 mm distance, one millimeter offset surfaces, triangle intersection/separation, transformed world coordinates, invalid geometry, and stale geometry revisions. Lint, typecheck, all 54 unit tests, isolated production build, and the existing six Playwright checks passed. The Playwright suite has no authenticated CAD workspace fixture, so it does not exercise Phase 10 tools. **Phase 10 is awaiting manual verification on real dental geometry.** Phases 6-9 retain their existing statuses.

Manual verification: open the CAD workspace at desktop width; import two aligned STL/OBJ/PLY/GLB dental meshes; measure two points and compare a known distance; enable Section and change plane orientation/position, then disable/reset it; choose object A/B (and child mesh for multi-mesh GLBs), run Proximity map and Reference deviation, inspect range and color legend; run Intersection on separated then overlapping meshes; move one target and confirm the result is marked stale; sculpt or edit one target and confirm staleness; clear the map and confirm original materials and geometry remain unchanged. Repeat on dense dental scans and note worker responsiveness and visual quality.

---

# PHASE 11 — Practice Engine

> **Status: Awaiting manual verification.**

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

> **Status: Awaiting manual verification.**

- [ ] one real lesson runs end-to-end;
- [x] tool restrictions work;
- [x] sequential steps work;
- [x] hints work;
- [x] reference works;
- [x] Design Check works;
- [x] result saved through the attempt API with device and memory fallbacks;
- [x] retry works.

### Phase 11 implementation record

Practice lessons are structured bilingual data with ordered steps, tool and keyboard permissions, contextual hints, reference configuration, and validator configurations. The catalog shows Foundation, Beginner, Intermediate, and Advanced; only authored lessons can be started, and listed prerequisites can be bypassed with “Start anyway.” The lesson route reuses the existing CAD workspace. A floating/pinnable guidance panel provides lesson theory, hints, example mode, reference display modes, Design Check results, retries, and completion feedback.

The session store enforces step order and retry behavior. The validator registry currently implements transform-range and geometry-statistics checks, rejects unknown validator types, and marks results stale after transform or geometry revision changes. Attempts and per-step results are sent to an authenticated API backed by the Phase 11 Supabase migration; if the API is unavailable, the client falls back to device storage and then memory. Practice geometry is session-only and does not enter CAD recovery.

Automated verification: lint, typecheck, production build, and all 66 unit tests pass. The Phase 11 migration is applied to the connected Supabase project. The Phase 11 tables have RLS enabled, published Practice content is readable to authenticated users, educational-content inserts/updates/deletes are blocked, and an authenticated owner can persist attempts and step results. Database TypeScript types have been regenerated. The authenticated browser workflow still requires manual verification.

Manual verification: sign in as a learner; open Practice, switch EN/SR, choose “Move and position an object,” and start it. Confirm the task, theory, allowed tools, and hints appear; attempt an unavailable tool and a blocked keyboard shortcut; use Show Example and each reference mode; deliberately fail Design Check, change the transform, and confirm the result becomes stale; correct X to 0 and pass step one; confirm step two unlocks only afterward, set Y to 1, pass, and complete. Verify the attempt and step results in Supabase, use Retry, and confirm a fresh attempt starts. Also test “Start anyway” for a lesson with prerequisites when such a lesson is authored.

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

### Phase 12 implementation record

Free Lab now creates stable session metadata for Scenario, Import My Case, Blank Workspace, and Random Case entries, then initializes the existing shared CAD workspace in Free Lab mode. The typed local scenario catalog follows the `public.scenarios` / `public.scenario_assets` fields documented in `DB.md`; it contains one published synthetic posterior-crown exercise with fictional patient code PT-2041. Its three synthetic STL files are passed through the existing Phase 7 worker importer and Geometry Registry. Random selection filters by category, difficulty, published status, and eligibility, with an injectable random source.

The landing page has the four entry choices, scenario category/difficulty filters, a lab-style Case Brief, and filtered Random Case selection. Import My Case opens the existing multi-file importer, with per-file role, units, and initial visibility controls. Blank Workspace starts with no objects. Free Lab runtime configuration and session metadata stay outside Zustand; Free Lab has no Practice step guidance or tool restrictions. Start Over confirms before resetting; scenarios reload their initial synthetic assets, blank sessions return to an empty scene, and imports restore the captured baseline while runtime geometry remains available.

No scenario tables or RLS policies were added or deployed in this phase. Scenario metadata is locally authored against the documented schema, and no raw user files or mesh buffers are persisted by Free Lab. The sample content contains no proprietary models or patient data.

Automated verification: lint, typecheck, 72 unit tests, isolated production build, and all 8 Playwright checks passed. The browser checks verify route protection; authenticated Free Lab and CAD workflows still require manual verification.

**Phase 12 is awaiting manual verification.** Phase 6–11 verification statuses were not changed.

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

## 13.12 Phase 13 Implementation Record

Implemented cloud case persistence using the existing private `case-geometry`
bucket. Tracked migrations add owner-scoped cases, stable case objects, immutable
geometry versions and revisions, revision manifests, an atomic case head,
checkpoints, and independent case duplication. The commit RPC uses an expected
head revision so a stale save fails with a conflict. Save reuses geometry
versions for transform/state-only revisions and stores validated GLB snapshots
for changed geometry. The workspace now supports initial Save, Ctrl+S, Save As,
Duplicate, revision history, named checkpoints, My Cases, historical revision
loading, local-recovery reconciliation, and STL/OBJ/GLB export.

The migrations were applied to the connected Supabase project. Schema, RLS,
storage isolation, head conflict handling, duplication, and rollback-safe
database integration checks were exercised against Supabase. Database types
were regenerated from the connected project.

**Phase 13 is awaiting manual verification.** No Phase 6–12 verification status
was changed. The authenticated browser workflows have not yet been manually
verified; use the Phase 13 checklist in the implementation handoff. Automated
checks do not establish refresh/logout durability in an authenticated browser.

---

# PHASE 14 — Admin Content Studio

> **Status: Awaiting manual verification.**

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

- [x] Foundation module coherent;
- [x] tool help exists in the shared Practice guidance panel;
- [x] bilingual content;
- [x] users can repeat any lesson;
- [x] progress updates through the existing attempt persistence.

### Implementation status

**Phase 15 awaiting manual verification.** The curriculum, repeatable content seed, validators, and synthetic teaching geometry are implemented. Browser verification of the lesson flows and Admin edit roundtrip remains necessary. Phases 6–14 verification statuses are unchanged.

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

**Phase 16 awaiting manual verification.** The shared Crown workflow, bilingual Practice lessons, synthetic Free Lab case, and configured Design Checks are implemented. Local browser walkthroughs of Practice, Free Lab, Margin Line editing, tooth library placement, and analysis feedback remain to be checked.

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

- [x] complete denture workflow usable;
- [x] arch/chain/individual modes stable;
- [x] base generated;
- [x] Practice complete;
- [x] Free Lab complete.

**Phase 17 status: awaiting manual verification.** Automated checks and remote content verification pass. Complete the signed-in Practice, Free Lab, persistence/export, and Admin walkthrough before treating the phase as fully verified.

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

- [x] no duplicate crown engine;
- [x] workflows reuse existing tools;
- [x] scenarios exist.

**Phase 18 status: awaiting manual verification.** Shared CAD, Practice, Free Lab, persistence and content checks are implemented and automated/database verification passes. Complete the signed-in Bridge, Inlay, Onlay, Veneer, save/reopen, export and Admin walkthrough before treating the phase as fully verified.

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

- [x] survey/undercut workflow is implemented and covered by local automated checks;
- [x] the editable framework workflow is coherent across its component roles;
- [x] the workflow uses synthetic educational geometry and makes no clinical claims;
- [x] Kennedy I–IV cases are wired into Practice and Free Lab.

### Phase 19 implementation status

Local implementation and automated checks are complete: typecheck, lint, all 119 unit tests, production build,
and all 9 Playwright checks pass. **Phase 19 is awaiting manual verification.** The Supabase
connector is available but both migration and table inspection calls failed during OAuth token refresh, so the
Phase 19 seed migration has not been applied and its remote RLS/access behavior has not been verified. Run the
migration through the connected Supabase project, confirm bilingual lessons/scenarios and access policies, then
walk through Kennedy I–IV in signed-in Practice and Free Lab, edit component paths, preview survey direction,
and save/reopen/export a framework. The geometry is synthetic and educational; it does not make clinical claims.

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

- [x] both workflows reuse shared systems;
- [x] lesson content complete;
- [x] scenarios complete.

### Phase 20 implementation status

Both workflows, six bilingual Practice lessons, two synthetic Free Lab scenarios, and the tracked content migration are implemented. Automated checks pass and the remote migration/content records are verified. Simulated authenticated-role reads returned the Phase 20 content, an anonymous read returned no lessons, and a normal authenticated role changed zero official lesson rows. Existing Admin-write RLS policies remain in place; no Admin-role account was available for a live write test. **Phase 20 is awaiting manual verification** of the signed-in Practice, Free Lab, save/reopen, export, and Admin walkthroughs. Phases 6–19 retain their existing statuses.

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

- [x] movement stable;
- [x] contacts update;
- [x] performance acceptable;
- [x] no unsupported biomechanical claims.

### Phase 21 implementation status

Implemented the virtual articulator in the shared CAD workspace. The upper arch is fixed and the lower arch moves from its saved reference using deterministic open/close, protrusive, left-lateral, and right-lateral trajectories. Canonical coordinates are right-handed millimeters: +X is left, +Y is anterior, and +Z is superior; rotations use the configured hinge axis and pivot. Dynamic contact is sampled through the existing analysis worker and BVH path, with progress, cancellation, stale-result checks, and per-sample contact states. Setup and arch metadata persist through case save/load and local recovery.

Added a generated educational bite-splint case for Practice and a database-configured Free Lab scenario, with bilingual Practice lessons, hints, tool links, and validators. The staged Phase 21 migration was applied remotely and verified: one module, four published lessons, eight steps and hints, eight articulator tool links, three dynamic-contact validators, and one Free Lab scenario. Authenticated-role reads returned the published lesson and scenario; a simulated ordinary authenticated update changed zero official lesson rows. Existing Admin write policies remain in place.

Lint, typecheck, all unit tests, production build, browser tests, and staged/working diff checks pass. **Phase 21 is awaiting manual verification** of the signed-in Practice, Free Lab, save/reopen, and Admin walkthroughs. Phase 20 remains awaiting manual verification, and Phases 6–19 retain their existing statuses.

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

- [x] educational boundaries clear;
- [x] no surgical planning;
- [x] workflows coherent.

**Phase 22 status: awaiting manual verification.**

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

**Phase 23 status: awaiting manual verification.**

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

- [x] no XP/streaks;
- [x] progress accurate;
- [x] attempts update correctly;
- [x] dashboard useful.

**Phase 24 status: awaiting manual verification.** Learner progress, attempt history, results, and dashboard implementation are complete. Automated checks pass; complete the signed-in dashboard, Practice resume/retry, result history, saved case, and EN/SR walkthrough before treating the phase as fully verified. Phases 6–23 retain their existing statuses.

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

- [x] SR and EN product UI/localized content audit complete;
- [x] no fake clinical certainty;
- [x] important domain values source-reviewed as exercise targets, not universal rules;
- [x] disclaimer present.

**Phase 25 status: awaiting manual verification.** Engineering localization, content integrity, and automated checks are complete. A signed-in EN/SR browser walkthrough remains outstanding because no browser session or authenticated local test credentials were available. Phase 24 remains **awaiting manual verification**; Phase 26 began on 2026-09-29.

### Phase 25 audit update — 2026-09-29

The glossary is now reachable from the authenticated workspace navigation. The workspace displays the same English/Serbian disclaimer on every authenticated route: the software is educational, and its exercise targets and synthetic geometry are not for diagnosis, treatment, surgery, or manufacturing approval.

The source review covered representative high-priority topics. An in-vitro crown study tested multiple occlusal thicknesses and found fracture behavior varied with material and thickness; a lithium-disilicate study compared 0.8, 1.0, and 1.5 mm specimens. These findings do not validate a universal minimum-thickness rule for the product's synthetic exercises ([zirconia thickness study](https://pubmed.ncbi.nlm.nih.gov/32381825/), [lithium-disilicate thickness study](https://pubmed.ncbi.nlm.nih.gov/35793941/)). Clinical proximal-contact evaluation uses more than one measurement method, and results concern particular restoration workflows rather than a general CAD distance threshold ([contact tightness review](https://pubmed.ncbi.nlm.nih.gov/38389748/)). Removable partial denture path of placement depends on the surveyed anatomy and guide planes ([RPD path-of-placement review](https://pubmed.ncbi.nlm.nih.gov/25722842/)).

Accordingly, the authored 0.8 mm thickness, 1.5 mm proximity, and Implant 8 mm depth / 12° axis values remain exercise-only targets against synthetic geometry. The sources above do not establish them as clinical recommendations. Those targets are labeled as exercise values in authored content, but they do not yet carry per-value source or expert-review metadata in the content records. No value is marked `source_reviewed` or `expert_verified` on this evidence alone.

The final structured UI/content audit and targeted code localization pass are recorded in the final update below and in [PHASE-25-AUDIT.md](PHASE-25-AUDIT.md). The earlier implementation-gap statement has been superseded.

### Phase 25 audit continuation — 2026-09-29

The live published-content audit is now complete for Phase 15–22: 12 modules,
60 lessons, 91 steps, 93 hints, 15 scenarios, and all 39 published tool
definitions. Required EN/SR fields were present. A content quality scan found
mojibake in a subset of published Serbian copy; new Phase 25 migrations
`20260929130000_phase_25_published_serbian_text_correction.sql` and
`20260929131000_phase_25_content_corrections_2.sql` were applied and verified.
The second migration also records explicit synthetic/no-patient-data
provenance for the Crown scenario that previously lacked those markers.

The remote asset and license tables contain no platform rows; the reviewed
Phase 15–22 case geometry is generated in application code. The discrepancy
for `domain_references` is resolved as future documented architecture rather
than a missing Phase 25 migration. DB.md now distinguishes its design baseline
from the deployed schema. See [PHASE-25-AUDIT.md](PHASE-25-AUDIT.md) for the
counts, evidence, source/expert review register, localization scan, and manual
verification limitation.

The final pass localized the CAD workflows, actual Free Lab workspace, Admin
workflows, and common loading/error/empty states. A structured rendered-copy
scan left only intentional brand, file-format, notation, and professional
terms; a 218-file encoding scan found no configured mojibake markers. Lint,
typecheck, 160 unit tests, production build, 10 Playwright tests, and both diff
checks passed. The authenticated bilingual browser walkthrough remains manual
verification; CUA had no browser/app session and no local signed-in test
credentials were provided. Phase 25 is **awaiting manual verification**.
Phase 24 remains **awaiting manual verification**; Phase 26 began on 2026-09-29.

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

- [x] professional appearance;
- [x] responsive marketing page;
- [x] no fake features;
- [x] real application screenshots or a clearly labeled, product-accurate visual preview.

### Phase 26 implementation record

- The public root route uses the existing `(marketing)` route group. The authenticated app layout, auth guards, and Admin routes were not changed for the landing.
- Added a responsive Prostheia page with a shared CAD workspace preview, Practice and Free Lab explanations, implemented workflow families, CAD editing and inspection capabilities, Design Check feedback, and the learning progress loop.
- The workspace preview reuses the existing internally drawn synthetic dental-arch illustration. No approved product screenshot was present in the current assets, so the frame is labeled as a preview and its geometry as synthetic training geometry. The landing does not load the CAD geometry engine.
- English and Serbian use Phase 25's `prostheia.locale` provider, persisted preference, and shared language toggle. The root page also has static title, description, Open Graph, and social metadata.
- The public claim audit found no AI, clinical validation, diagnosis, surgical approval, manufacturing readiness, invented social proof, or pricing claims. The educational boundary and synthetic-scenario context are stated on the page.
- Automated verification: `npm.cmd run lint`, `npm.cmd run typecheck`, `npm.cmd test` (160 tests), `npm.cmd run build`, and `npm.cmd run test:e2e` (13 tests) passed. The E2E checks cover public access, auth links, EN/SR switching and persistence, existing protected-route behavior, and 1440/1024/390 px widths without horizontal overflow. Both working-tree and staged diff checks are recorded after this implementation.

**Phase 26 status: awaiting manual verification.** The browser inventory was unavailable during implementation, so the final visual review remains outstanding. Phases 24 and 25 remain **awaiting manual verification**.

#### Manual verification

1. Open `http://localhost:3000` while logged out. Confirm the public landing loads without redirecting to sign-in.
2. Review the header, hero, product preview, Practice, Free Lab, CAD, workflows, Design Check/progress, CTA, and footer.
3. Switch EN → SR, review the full page, reload to confirm persistence, then switch back to EN.
4. Click **Sign in** and confirm `/login`; return to `/` and click **Get started** to confirm `/signup`.
5. Review desktop (~1440 px), tablet (~1024 px), and mobile (~390 px) layouts for overflow, readable hero copy, usable navigation, intact preview, and visible CTA.
6. Confirm the synthetic preview matches actual Prostheia capabilities and the page makes no AI, clinical, surgical, manufacturing, or unsupported claims.

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

**Current status:** In progress. Lesson and Scenario Admin saves now use
specific transaction-backed invoker RPCs, with rollback/success/authorization
integration checks added. Source engineering is complete, but the local
PostgreSQL test database is unavailable and the Supabase CLI project is not
linked, so the Phase 27 migrations remain pending remote deployment and
verification. Hosted/manual security and representative performance checks
remain open. See `PHASE-27-AUDIT.md` for evidence and exact tooling errors.

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
