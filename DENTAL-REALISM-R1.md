# Dental Realism R1 — Shared Case Package and Asset Registry

**Status: implemented.** R1 adds one versioned, validated case-package contract and routes Practice and Free Lab through its generic loader. The proof package is an educational synthetic posterior crown case. R1 does not introduce anatomical modeling or clinical realism changes.

## Package contract

`src/cad/case-packages/contract.ts` defines schema version 1 and validates:

- Localized English and Serbian case metadata and lab orders.
- Workflow type and difficulty, FDI tooth numbers, arch, and surface labels.
- Object descriptors with independent semantic (`SOURCE`, `DESIGN`, `GUIDE`, `REFERENCE`) and existing CAD roles, transforms, parent links, workflow metadata, visibility, editability, reference state, and segmentation.
- Asset references with legacy, master, and runtime asset IDs. An asset reference must identify at least one existing asset row.
- Procedural sources registered by factory ID, rather than workflow-specific object creation branches.
- Package baseline, case revision, asset snapshot, and derived-state checkpoints.
- Validation bindings, expected outputs, training notes, and compatibility mappings.

Validation also rejects duplicate IDs, missing object/asset/checkpoint references, invalid parent or derived-checkpoint cycles, and bindings that refer to absent objects.

## Registry, assets, and loading

- `identity.ts` maps package-local object IDs into a deterministic case namespace. The Crown proof uses the existing `crown26-*` runtime IDs so current Crown validators keep resolving their targets.
- `procedures.ts` provides a registry for typed synthetic factories. It currently wraps existing synthetic tooth, crown, and guide-axis geometry.
- `asset-registry.ts` resolves existing `assets`, `model_assets`, and `asset_licenses` rows and downloads from their registered Storage bucket and path. It carries units, coordinate system, bounds, mesh statistics, provenance, license terms, segmentation, FDI data, and expert-review metadata forward when recorded. Missing provenance or license details remain unknown. Unknown source units are rejected before import into the millimeter workspace. Runtime asset selection falls back to master, then the legacy asset ID.
- `loader.ts` validates a manifest, resolves its checkpoint, stages all procedural and asset-backed geometry, checks dependencies and validation/output bindings, and then commits the new workspace. A failed preparation keeps the current workspace and disposes staged geometry. Workflow adapters apply setup metadata and clear transient curves, analysis, and partial workflow state with rollback support. Successful replacement disposes old owned geometry and clears undo history.
- `geometry-registry.ts` now supports an atomic batch replacement so the loader can swap the registry and workspace together.
- `cloud-cases.ts` persists package/object/workflow and asset metadata in the existing JSONB object state and writes the runtime/master asset ID to the existing `source_asset_id` field.

## Crown proof and application integration

`definitions/posterior-crown-26.ts` describes a bilingual tooth 26 exercise using synthetic preparation, adjacent tooth 25, antagonist 36, editable crown design, hidden reference, and insertion-axis guide geometry. It includes a package-baseline checkpoint, validation bindings, expected output, workflow setup, and an educational disclaimer. It has no external asset, provenance, or license claim.

Practice accepts a package ID or embedded manifest and checkpoint in `case_setup`; Free Lab accepts them through scenario metadata and launch/session state. The Crown compatibility mapping sends the current Crown Practice and synthetic Free Lab records through the shared package. Other workflow factories remain available for existing lessons and scenarios.

## Persistence and deployment boundary

R1 reuses the existing `case_setup`, `additional_metadata`, case-object JSONB state, asset registry tables, and Storage configuration. No database migration or remote Supabase write was made. The remote inventory in the user-provided R1 brief reported zero rows in `assets`, `model_assets`, `asset_licenses`, `practice_lesson_assets`, and `scenario_assets`, and zero Storage objects; this inventory was not independently re-queried during implementation.

The asset resolver is therefore covered with unit-level fixtures, but a real registered-asset download could not be exercised against the supplied empty remote inventory. Case-revision and derived-state checkpoints use a loader resolver callback; callers provide the revision/derivation-specific resolution. The case-package layer does not add a remote checkpoint query or execute arbitrary derivations itself.

## Verification

- `rtk npm run typecheck` — passed.
- `rtk npm run lint` — passed with no warnings after cleanup.
- `rtk proxy npx vitest run tests/unit/case-package.test.ts` — 7 tests passed.
- `rtk npm test` — 24 test files, 180 tests passed.
- `rtk npm run build` — passed.
- `rtk npm run test:e2e` — 14 Playwright tests passed.

The focused package tests cover contract and cross-reference validation, deterministic IDs, asset metadata and unit conversion, Practice/Free Lab shared loading, Crown compatibility, atomic failure behavior and resource disposal, and legacy Crown factory compatibility. The Playwright suite covers existing application smoke, authentication guards, and responsive landing-page behavior; it does not load a package using an authenticated remote asset.

R1 is complete. R2 remains outside this handoff.
