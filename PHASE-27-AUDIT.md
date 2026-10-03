# Phase 27 security, performance, and reliability audit

Date: 2026-09-29
Scope: current repository implementation from Phases 3–26 plus the Phase 27
requirements in `Phases.md` and the supplied execution request. This is a
source and migration audit. Remote Supabase state, two-user behavior, deployment
settings, and browser memory/performance require environment access and are not
asserted from source inspection alone.

## Findings before Phase 27 changes

| Severity | Subsystem | Finding and reproducible evidence | Existing protection | Proposed fix / regression risk |
|---|---|---|---|---|
| High | Import and case-switch lifecycle | `ModelImportPanel` retained an active import when unmounted. `importModel` only terminates its worker when its `AbortSignal` fires; after the import awaited raw storage, it registered geometry in process-wide stores. Repro: start a large import, navigate to another workspace before parsing/upload finishes, then let it finish; stale geometry could be appended to the new case. Mesh workers also looked up the registry by ID only after finishing, so a stable ID reused by a new workspace could receive an old worker result. | Worker code already supports AbortSignal; workspace cleanup clears geometry and mesh edits already have a cancellation controller. | Abort imports on unmount and after async storage, dispose unregistered runtime geometry on cancellation, and reject mesh results unless the exact runtime and geometry revision are still current. Regression risk: canceled raw uploads must clean up their object/metadata; cancellation messages must not be reported as successful edits. |
| Medium | HTTP response security | `next.config.ts` had no application security headers. Inspecting the config confirms only `distDir` was configured. | React escapes ordinary text; Next handles its normal response defaults. | Add conservative framing, MIME, referrer, permissions, and CSP hardening headers. Regression risk: headers can affect embedding or browser capabilities; test all routes and CAD runtime. |
| Medium | Admin asset uploads | `src/app/(app)/admin/assets/asset-uploader.tsx` validated extension but not file size before upload. The Storage migration defined bucket privacy but no `practice-assets` size limit. Repro: an Admin can select an arbitrarily large supported-extension file and submit it. | Database and Storage policies require Admin; these are not normal-user writes. | Enforce a documented upload limit in the UI and Storage bucket. Regression risk: legitimate large reference meshes may need a higher cap; align with the application's 128 MB import limit. |
| Medium | Admin model file validation | The asset uploader accepted file extensions without parsing their contents, so an Admin could register malformed bytes as a ready model asset. The normal Phase 7 importer already checks signatures, parser compatibility, triangle geometry, bounds, and numeric validity. | Upload is Admin-only and consumers still have parser error handling when loading assets. | Run the same local import worker validation before platform upload and dispose its temporary geometry. Regression risk: upload latency and validation memory use; the parser's 128 MiB/5-million-triangle limits are shared with user imports. |
| Medium | Admin content persistence | `saveLessonContent` and `saveScenarioContent` perform a sequence of separate writes. Lesson updates set the current row to draft, delete steps, then insert steps/hints/validators/assets; failures return after earlier changes have committed. Scenario updates similarly write the row before replacing asset links. Repro: fail a later request after an earlier request succeeds; the editor leaves partial draft state. | Admin authorization and RLS are independently enforced, and publication RPCs validate content before publishing. | Treat as an unresolved atomicity issue unless a transaction-backed save path is added. Regression risk: a new RPC must preserve existing draft/publication and optimistic-concurrency behavior. |
| Low | Practice completion integrity | `/api/practice/attempts` checks auth, payload shape, published lesson membership, and derives required completion on the server, but pass/fail outcomes themselves are supplied by the browser. A signed-in user can submit fabricated passing outcomes for their own attempt. This changes only that user's learning record; it does not grant content/Admin access or cross-user access. | Authenticated ownership RLS on attempts and results; server filters unknown lesson-step slugs and derives completion from required steps. | Record as a trust boundary limitation. Making geometry validation authoritative requires server-side geometry/evidence validation, not a client-only patch. Regression risk: changing this contract would alter Practice completion behavior. |
| Informational | Supabase deployment audit | Migration source defines private buckets and owner-scoped policies, but a live catalog/RLS/storage-policy query and Supabase Advisor report were not available from this source audit. | Migration SQL and RLS integration SQL are present in the repository. | Leave remote application state as a deployment/manual verification item; do not infer that staged migrations are applied. |

## Static RLS and Storage inventory

Migration review found RLS enabled for all tables created in the current public
schema migrations. User-private tables and policy intent:

| Table | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `profiles` | own or Admin | none | own ID only | none |
| `assets` with `scope='user'` | owner; platform asset visibility/Admin rules apply to platform scope | owner and authenticated identity | owner and unchanged owner scope | owner (case-revision foreign keys may restrict deletion) |
| `model_assets` for user-owned assets | parent asset owner | parent asset owner | parent asset owner | Admin policy; parent asset deletion cascades |
| `practice_attempts` | own user ID | own user ID | own user ID | none |
| `attempt_step_results` | parent attempt owner | parent attempt owner | parent attempt owner | none |
| `user_cases` | owner | RPC only | `last_opened_at` grant; owner check | none |
| `case_objects` | parent case owner | RPC only | RPC only | RPC only |
| `case_object_versions` | parent case owner | RPC only | none | RPC only / FK constraints |
| `case_revisions` | parent case owner | RPC only | none | RPC only / FK constraints |
| `case_revision_objects` | parent case owner | RPC only | none | RPC only / FK constraints |
| `case_heads` | parent case owner | RPC only | RPC only | RPC only / FK constraints |
| `case_checkpoints` | checkpoint owner | owner plus current owned head | none | checkpoint owner |
| `case_screenshots` | owner and owned case | owner, owned case/revision, owned screenshot asset | owner and owned references | owner |
| `screenshot_annotations` | parent screenshot owner | parent screenshot owner | parent screenshot owner | parent screenshot owner |
| `app_private.user_roles` | no direct API access | no direct API access | no direct API access | no direct API access |
| `app_private.admin_audit_log` | no direct API access | no direct API access | no direct API access | no direct API access |

Public content/registry tables (`content_domains`, `skills`, tool definitions
and roles, assets/model assets/licenses, practice curriculum/config/link tables,
scenarios and asset links) also have RLS. Published reads are scoped by
publication/asset visibility, and writes are Admin-only or owner-scoped. The
private `app_private.user_roles` table has RLS, revoked API grants, and an
explicit deny policy for `anon` and `authenticated`.

Storage semantics from migrations:

| Bucket | Semantics and checks |
|---|---|
| `practice-assets` | Private; reads only for ready authenticated platform assets or Admin; writes Admin-only. |
| `user-imports` | Private; two-level UUID path and owner ID must match the authenticated user (Admin exception). |
| `case-geometry` | Private; three UUID folders and UUID `.glb` filename; owner ID/path required. Geometry is immutable except owner/Admin delete. Commit RPC rechecks uploaded object ownership and expected path. |
| `screenshots` | Private; user/case UUID folders and UUID `.webp`; upload/read/delete owner-only; Storage caps size at 12 MiB and MIME at `image/webp`. |
| `marketing-assets` | Public read by bucket configuration; upload/update/delete Admin-only. |

This inventory is migration-source evidence, not a live database assertion.

## Authentication, authorization, and input review

- Server route layouts use `getClaims()` and redirect unauthenticated users;
  Admin route and each Admin server action independently call the server-side
  `is_admin()` RPC. Client-supplied profile/role fields do not authorize.
- `is_admin()` reads `app_private.user_roles`, has an empty search path, is
  `SECURITY DEFINER`, and is executable only by authenticated users. New user
  trigger assigns `user` regardless of signup metadata.
- No service-role client call sites were found. Its only source reference is a
  `server-only` helper and `.env.example`; it is not `NEXT_PUBLIC_*`.
- Auth forms use Zod limits. Case revision writes go through an authenticated
  transactional RPC with per-user ownership and head compare-and-swap.
- Import pipeline limits files to 128 MiB, geometry to 15 million vertices and
  5 million triangles, checks parser/content compatibility, finite coordinates,
  indices, bounds, and supported glTF resource packaging. Raw import storage
  uses a separate immutable object path and working geometry revisions.
- User/Admin text is rendered through React text nodes. Source scan found no
  `dangerouslySetInnerHTML`, `innerHTML`, or sanitizer bypass.
- Analysis, import, and mesh workers terminate on completion/cancellation;
  screenshot object URLs are revoked on cleanup. Geometry registry owns and
  disposes registered geometry/material/texture resources and history retains
  pinned revisions within its configured memory cap.

## Verification and remaining evidence

## Phase 27 fixes and review

- **High / import and case-switch race — fixed in source.** The import dialog now
  aborts on unmount and checks cancellation after both parsing and raw-source
  persistence. A canceled unregistered Three.js object is disposed; an aborted
  raw upload removes its object and metadata. Mesh edits now capture the exact
  runtime object and starting geometry revision and discard results if the
  workspace replaced or edited that target while the worker ran. A unit
  regression test covers the replacement race.
- **Medium / response headers — fixed in source.** `next.config.ts` now adds
  `nosniff`, frame denial, strict-origin referrer behavior, a permissions
  policy, and a restrictive CSP subset (`object-src`, `base-uri`, and
  `frame-ancestors`). A full script/style/connect CSP is deferred because the
  Next.js CSP guide requires nonce propagation and this Three.js/CAD runtime
  has not yet been verified against one. HSTS remains a production HTTPS setting.
- **Medium / upload size — fixed in source and migration.** Admin platform
  model uploads reject empty files and files over 128 MiB. Storage enforces the
  same 128 MiB cap for `practice-assets` and `user-imports`, so direct API use
  cannot bypass the limit. Migration
  `20260929140000_phase_27_storage_upload_limits.sql` must be applied before
  claiming this control is active in the hosted project.
- **Medium / Admin model contents — fixed in source.** Platform assets now pass
  through the Phase 7 import worker before upload. Signature, supported parser,
  geometry complexity, bounds, coordinates, and indices are validated, then
  temporary Three.js resources are disposed. Validation is canceled if the
  uploader unmounts.
- **Medium / Admin content atomicity — source fix implemented; deployment and
  database integration execution pending.** The original handlers committed
  their parent row before deleting and recreating child rows. Lesson saves
  separately wrote `practice_modules`, `practice_lessons`, `practice_steps`,
  `practice_step_tools`, `practice_hints`, `validation_configs`,
  `practice_step_validations`, and `practice_lesson_assets`. Scenario saves
  separately wrote `scenarios` and `scenario_assets`. Any later request could
  fail after earlier requests had committed; a failed lesson edit also already
  changed the lesson to draft.

## Phase 27 atomic Admin save follow-up — 2026-09-29

- **Lesson Save entry point:** the Lesson editor submits its JSON `content`
  form field through `saveLessonContent` in `src/app/(app)/admin/actions.ts`.
  Zod validates UUIDs, EN/SR strings, ordering inputs, step/hint IDs and slugs,
  tools, references, validator configs, assets, case setup, difficulty, and
  duration before the RPC call. One `save_admin_lesson(jsonb)` transaction
  creates/reuses its module, writes the lesson draft, replaces steps (with
  their tools, hints, validation configs and links), and replaces lesson asset
  links. A database constraint/RLS/unique error rolls the whole function call
  back. Publication remains a separate user action; Save changes a published
  lesson back to draft as before.
- **Scenario Save entry point:** the Scenario editor submits its `content`
  field through `saveScenarioContent`. Zod validates the stable IDs, slug,
  bilingual metadata, difficulty, patient age, tooth numbers, requirements,
  supplied data, initializer/restoration fields, asset roles, and required
  flags. One `save_admin_scenario(jsonb)` transaction writes the scenario draft
  and replaces all `scenario_assets`. Publication remains separate; successful
  Save puts the scenario in draft as before.
- Both RPCs are **SECURITY INVOKER** with an empty `search_path`. This is
  supported by the current authenticated grants and Admin-only `is_admin()` RLS
  write policies on all touched tables. Execute is revoked from `PUBLIC` and
  `anon`, and granted to `authenticated`; regular authenticated users remain
  blocked at the table RLS boundary. No service-role key or caller-supplied
  identity is used. No RLS policy was changed.
- Existing `updated_at` compare-and-swap checks remain inside the transaction.
  A stale edit raises SQLSTATE `40001`, leaves all persisted content unchanged,
  and receives the existing localized conflict message. Collaborative editing
  is out of scope.
- The UI clears its dirty state and refreshes only after the RPC returns a
  committed row ID, and only if no later local edit happened while the Save was
  in flight. RPC errors keep the editor values and dirty state so the user can
  retry; no success state is returned on failure.
- Added `supabase/tests/phase_27_atomic_admin_content_save.sql`. It seeds a
  known lesson/scenario graph, forces the final asset-link write to fail with a
  foreign-key violation, then asserts parent rows, steps, hints, validators,
  and asset links are unchanged. It also verifies success updates and ordering,
  and checks Admin, non-Admin, and anonymous RPC authorization. This database
  integration script is **not yet executed**: local Supabase PostgreSQL is
  unavailable (`ECONNREFUSED` at `127.0.0.1:54322`; Docker is not installed in
  PATH).
- New tracked migration: `20260929150000_phase_27_atomic_admin_content_save.sql`.
  Existing pending Phase 27 Storage migration:
  `20260929140000_phase_27_storage_upload_limits.sql`. Neither is verified as
  applied remotely. Supabase MCP is not available in this session. `supabase
  migration list` fails with `LegacyProjectNotLinkedError: Cannot find project
  ref. Have you run supabase link?`; `supabase status` also cannot parse the
  BOM at the start of `.env.local` (`unexpected character "\uFEFF" in variable
  name`). No migration was applied and no remote state was changed. Pending
  deployment sequence is Storage migration first, then atomic-save migration;
  afterward verify both migration records, functions/grants/RLS, and run the
  transactional tests against the linked project using safe disposable data.
- Supabase Security and Performance Advisors could not run because there is no
  Supabase MCP and the CLI project is not linked. Existing Advisor/manual
  settings work remains: leaked-password protection, production redirect/domain
  allowlists, HTTPS/HSTS, and production CSP behavior.
- **Concurrency:** both save paths already carry `updated_at` and compare it in
  the update predicate. The new RPC preserves that compare-and-swap contract.
- **Remaining manual checks:** Admin browser save/retry and publication
  walkthrough; real two-account ownership/RLS checks; Storage limit probes;
  representative large CAD model performance and browser memory/GPU profiling.
- **Phase status: in progress pending remote deployment and DB test execution.**
  Source engineering and automated app checks are complete, but a hosted
  deployment and proof against PostgreSQL are still outstanding.
- Playwright was flaky with its default worker count in this environment:
  three unrestricted runs had one unrelated auth/navigation timeout each. A
  two-worker run passed all 14 tests. `playwright.config.ts` now sets two
  workers so the standard suite is stable without reducing test coverage.

### Latest automated verification

- `npm.cmd run typecheck` — passed.
- `npm.cmd run build` — passed.
- `npm audit` — passed, 0 vulnerabilities.
- `npm.cmd run lint` — passed.
- `npm.cmd run typecheck` — passed.
- `npm.cmd test` — passed, 161 tests across 22 files.
- `npm.cmd run build` — passed.
- `npm.cmd run test:e2e` — passed, 14 Playwright tests with the configured two
  workers.
- `npm audit` — passed, 0 vulnerabilities.
- `git diff --check` and `git diff --cached --check` — passed.
- `supabase test db` — could not execute: local PostgreSQL refused the
  connection at `127.0.0.1:54322`; CLI indicates Docker must be running, but no
  `docker` executable is available in PATH.
- **Low / Practice progress trust boundary — documented.** The attempt endpoint
  accepts client-computed validation outcomes. These outcomes only affect the
  authenticated user's own learning records; the server enforces lesson
  membership, required-step completion shape, and owner RLS. It cannot
  independently verify CAD geometry without changing the validation/persistence
  contract.

Remaining live/manual items include two-user RLS checks, Storage URL/path probes,
Admin/anonymous browser checks, save-network failure/concurrent-tab checks, case
cycling, representative large dental mesh profiling, browser memory inspection,
remote migration state, Supabase Advisor/leaked-password settings, and
deployment-domain/secrets/HTTPS settings. Automated results are recorded below.

## Manual verification checklist

### Security and ownership

1. Open `/workspace/demo`, `/dashboard`, `/practice`, and `/admin` in a signed-out
   browser; each protected route should redirect to `/login`.
2. Sign in as an ordinary user and open `/admin`, `/admin/lessons`,
   `/admin/scenarios`, and `/admin/assets`; each should deny access. Submit a
   direct server-action request as that user and confirm it is denied as well.
3. Sign in as User A and create a case with a revision, checkpoint, screenshot,
   and annotation. As User B, try the exact case, revision, screenshot, and
   annotation UUIDs through the app/API and through private Storage download;
   reads and mutations must be denied.
4. As User B, try uploads to User A's `user-imports`, `case-geometry`, and
   `screenshots` paths. Confirm Storage rejects them even with known UUIDs.
5. Upload a renamed non-model file, malformed geometry, a zero-byte file, and a
   file above 128 MiB. Confirm the form rejects bad/oversized files and Storage
   also rejects a direct upload that bypasses the form.
6. Open a screenshot object's Storage URL while signed out, then signed in as
   User B. It must not return the image. Owner-authenticated download should
   work.

### Reliability and performance

1. Cycle Crown → Complete Denture → Partial Denture several times; analyze,
   save, and observe the workspace for stale geometry, errors, or reduced
   responsiveness. Inspect browser memory/GPU resources where tooling allows.
2. Import a representative larger supported dental STL/OBJ/GLB. Confirm stage
   feedback, cancel once during parsing and once during raw upload, then orbit,
   select, edit, analyze, save, and export. Verify canceled work never appears
   in the next case.
3. Simulate network loss during Save. Confirm the dirty state remains and no
   success message appears until the server confirms a committed revision.
4. Open the same saved case in two tabs, save from both, and confirm the stale
   tab receives a conflict and cannot silently overwrite the newer head.
5. Make unsaved metadata/transform changes, reload, and verify recovery appears
   only for that case. Repeat after switching to a different case.

### Deployment settings

- Apply `20260929140000_phase_27_storage_upload_limits.sql` to the linked
  Supabase project, then inspect bucket limits and run Supabase Advisors.
- Enable leaked-password protection in Supabase Auth; verify redirect URLs and
  production domain allowlists. Keep the service-role key only in server-side
  deployment secrets and ensure `NEXT_PUBLIC_*` contains only the URL and
  publishable key.
- Deploy behind HTTPS before adding HSTS. Confirm the new response headers on
  production and test CSP behavior against the 3D workspace.

## Automated results — 2026-09-29

- `npm.cmd run lint` — passed.
- `npm.cmd run typecheck` — passed.
- `npm.cmd test` — passed: 161 tests across 22 files.
- `npm.cmd run build` — passed.
- `npm.cmd run test:e2e` — passed: 14 Playwright tests, including unauthenticated
  protected-route checks and security-header assertions.
- `npm.cmd audit` — passed: 0 production or development dependency vulnerabilities.
- `git diff --check` and `git diff --cached --check` — passed. The original nine
  staged migrations remain staged; no staging changes were made.
- Supabase Advisors could not run: the repository is not linked, and the
  read-only project-ref attempt reports that IPv6 is unavailable. No migration
  was applied and no remote DB state was changed.
- Browser checks only cover unauthenticated flows. There are no supplied
  two-user/Admin credentials for the authenticated isolation checks.

## Practice page latency follow-up

The Practice route showed its loading skeleton while `loadPracticeCatalog`
completed a per-lesson/per-step/per-validator query sequence. The loader now
fetches lesson relations in batches and groups rows in memory. Catalog reads
are bounded to at most eight requests across four dependency stages, instead of
growing with lesson, step, and validator counts. TypeScript and ESLint passed
after this change. End-to-end browser timing still needs to be checked against
the deployed Supabase project.
