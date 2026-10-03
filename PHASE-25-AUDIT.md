# Phase 25 audit register — 2026-09-29

This register separates implementation gaps from reviews that need a human
domain specialist. Codex review is not dental expert review.

## Completed checks and corrections

- Shared typed EN/SR UI foundation, persisted language choice, terminology
  glossary, persistent education disclaimer, and Admin bilingual publication
  validation are present in the current worktree.
- Live Supabase audit covered all published official Phase 15–22 records:
  12 modules, 60 lessons, 91 steps, 93 hints, and 15 scenarios. Required EN/SR
  fields and the 39 published tool definitions were present. The query also
  inspected bilingual step example configuration. The initial string scan
  found mojibake in Serbian text across a subset of Phase 18–22 published
  records. Migrations
  `20260929130000_phase_25_published_serbian_text_correction.sql` and
  `20260929131000_phase_25_content_corrections_2.sql` were applied and are
  recorded remotely. The repeat scan found no remaining mojibake in published
  module, lesson, step, hint, or scenario text.
- The sole published scenario without explicit synthetic provenance metadata
  was `synthetic_posterior_crown_26` (`PT-SYN-026`, no age). Its authored notes
  already identify internally generated training geometry. The second
  correction now sets `noPatientData: true` and
  `geometryProvenance: internal-synthetic-educational`. All 15 published
  scenarios now have those markers and null patient age.
- Live `public.assets` and `public.asset_licenses` have zero platform rows.
  Source inspection confirms the official Phase 15–22 geometry is generated
  procedurally or internally by code. No persisted or external licensed model
  was found that needs a fabricated asset/license row.
- `public.domain_references`, `public.lesson_domain_references`, and the
  validation/material reference join tables are absent remotely. Repository
  history contains no migration that created them; DB.md labels itself a
  design baseline and the listed `008_domain_references_and_validation.sql` is
  only in a recommended sequence, not the migration directory. Decision: **B**,
  future documented architecture, not required for Phase 25 acceptance. DB.md
  now says this explicitly; no table was created.
- Exercise-specific values established in the earlier source review (0.8 mm,
  1.5 mm, 8 mm, and 12°) remain exercise targets in the published lessons.
  The reviewed literature did not establish them as universal standards.
  Generic CAD values remain ordinary interface/configuration values.
- FDI examples in the published scenarios (including 11, 14–16, 26, 36, and
  46) use two-digit FDI notation. Existing bilingual terms such as Practice,
  Free Lab, CAD, Sculpt, Design Check, Margin Line, and common workflow names
  remain intentionally in English where they are established product/professional
  terms; the glossary supplies Serbian explanations.
- Validator fallback feedback no longer exposes unknown validator IDs, raw
  schema issue strings, or caught runtime exception text. Tests now exercise
  all authored local validators and require bilingual learner feedback.

## Source and human expert review register

The Phase 25 source review already recorded in Phases.md supports a cautious
boundary: crown thickness studies, proximal-contact evaluation methods, and
RPD path-of-placement literature are specific to studied materials, workflows,
and anatomy. They do not establish Prostheia's exercise values as universal
rules. Retain the existing source references and do not mark model review as
expert verification.

Future expert review required before any educational claims are presented as
clinical/manufacturing guidance:

- Dental technician review: crown/restorative workflows, connector exercises,
  Complete Denture tooth arrangement/base examples, Partial Denture survey and
  framework examples, splint boundaries, and manufacturing implications.
- Prosthodontic review: clinical interpretation of occlusion/contact,
  articulator movement, implant positioning/angulation, and any patient-specific
  suitability statements.
- Source verification: any proposed material-specific minimum thickness,
  clearance/contact prescription, implant placement rule, or validated
  manufacturing threshold. No new source-backed claim was introduced in this
  pass.

These are future review items. They do not block Phase 25 if app copy continues
to identify numeric design values as exercise targets and avoids clinical or
manufacturing claims.

## Final Phase 25 implementation and audit pass — 2026-09-29

### Engineering work completed

- Added a shared EN/SR interface-copy layer and localized implemented CAD
  workflows: Crown/restorative, Bridge, Inlay/Onlay, Veneer, Complete Denture,
  Partial Denture, Bite Splint, Digital Model, Virtual Articulator, Implant,
  Screenshot/Annotation, spatial analysis, import/export, sculpting, mesh
  editing, revision history, and workspace controls. Internal enums and IDs
  remain unchanged; user-visible copy uses the shared localization system.
- Localized the actual Free Lab workspace, including bilingual brief values,
  origin/session/scenario metadata, Patient ID, indication, target teeth,
  material, supplied files, requirements, Start Over, reset confirmation,
  import states, synthetic training labels, and recovery/save states.
- Localized Admin navigation, dashboard, lesson/step/hint and validator
  controls, scenario editor, asset uploader, publication flow, draft/published
  labels, save states, no-result/error notices, and destructive hint
  confirmation. Authored content fields remain EN/SR.
- Common loading, saved/unsaved, save failure, retry, empty, import/export,
  analysis, revision, recovery, and availability messages use localized copy.
  Raw Supabase/runtime exceptions are not displayed in the CAD/Admin UI;
  relevant failures are logged without exposing their details.
- Locale changes do not reinitialize the CAD/Free Lab workspace. The locale
  hook is kept out of the workspace initialization effect, and the dirty-save
  state preservation assertion remains in the Phase 25 i18n unit test.

### Final hard-coded copy scan

The structured JSX scan covered CAD UI components, the actual Free Lab
workspace, and all Admin routes/editors. Remaining matches were classified:

- **A — product copy:** localized through the shared dictionary, including
  dynamic CAD and Admin messages. Literal `tx()` keys in these areas have
  dictionary entries. Screenshot Studio uses the bilingual application message
  catalog (`t`) instead; its message keys are present in both locales.
- **B — intentional English terms:** Prostheia CAD (brand), STL/OBJ/GLB and
  other file-format names, standard axis/unit notation (X/Y/Z, mm, degrees),
  FDI tooth numbers, and established dental/CAD vocabulary documented in the
  glossary. These are identifiers, standards, or retained professional terms.
- **C — internal/non-rendered matches:** TypeScript conditions, enum/property
  names, callback expressions, and type definitions matched by the lightweight
  text-node scanner. They do not render as product text.
- **D — third-party/browser-generated text:** none identified in the targeted
  rendered components. Browser-native prompts/confirmations use localized
  strings supplied by the application.

The scan was cross-checked against rendered CAD panels, the Free Lab brief,
Admin forms, import panel, and analysis controls; it is not based on grep alone.

### Encoding and source/content integrity

- Final configured mojibake scan covered 218 UTF-8 source/content files across
  `src`, `supabase`, and phase audit documents. It found no replacement
  characters, known UTF-8 corruption markers, or configured Cyrillic
  mojibake markers.
- The completed official remote content audit remains authoritative: 12
  modules, 60 lessons, 91 steps, 93 hints, 15 scenarios, and 39 published tool
  definitions were checked. The two staged Phase 25 correction migrations
  were already applied and verified. This pass introduced no remote content
  migration.
- No exposed unsupported clinical claim was found. Numeric values remain
  labeled as exercise targets; geometry is synthetic and carries
  no-patient-data/provenance metadata. Dental technician/prosthodontic review
  and future material-specific clinical/manufacturing claims remain documented
  future work, not expert verification.

### Browser verification and limits

- The authenticated EN/SR walkthrough could not run in this environment. CUA
  exposed no apps or browser sessions, and the local in-app browser entry point
  was unavailable. No authenticated local test credentials or Admin account
  were provided, so Admin account availability could not be confirmed.
  Playwright covers unauthenticated route guards and authentication flows
  only; it has no signed-in bilingual CAD/Admin workflow test.
- Practice attempt ID/step, workspace ID, CAD geometry/transforms, and
  dirty-state preservation have not been observed in an authenticated browser
  session. The automated locale-switch state assertion passed, but it does not
  replace that manual browser check.
- Manual verification still needed: sign in locally, repeat the requested
  Dashboard/Practice/Progress/Results/Free Lab/My Cases/CAD/Screenshots EN/SR
  walkthrough; inspect representative workflows; and, if an Admin user is
  available, verify lesson/scenario/asset and publication screens in both
  languages.

### Final verification and status

Final verification on 2026-09-29: lint passed; typecheck passed; 160 unit tests
passed across 22 files; production build passed; all 10 Playwright tests
passed; working-tree and staged `git diff --check` passed. The code/content
integrity audit and encoding scan also passed. Phase 24 remains **awaiting
manual verification**. Phase 25 is **awaiting manual verification** because
engineering localization and automated checks are complete and the remaining
work is the signed-in browser walkthrough above. Phase 26 has not been started.
