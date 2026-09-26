-- Phase 4 database foundation: shared finite-state types from DB.md.
-- Identity enums (app_locale, app_theme, app_role) are created in Phase 3.

create type public.content_status as enum ('draft', 'published', 'archived');
create type public.difficulty_level as enum ('foundation', 'beginner', 'intermediate', 'advanced');
create type public.reference_access_mode as enum ('always', 'after_first_attempt', 'after_submission', 'never');
create type public.asset_scope as enum ('platform', 'user');
create type public.asset_visibility as enum ('private', 'authenticated');
create type public.asset_status as enum ('uploading', 'processing', 'ready', 'failed', 'archived');
create type public.asset_kind as enum ('model', 'reference_model', 'thumbnail', 'tool_demo', 'screenshot', 'marketing', 'other');
create type public.model_format as enum ('stl', 'obj', 'ply', 'glb');
create type public.model_unit as enum ('mm', 'cm', 'm', 'unknown');
create type public.cad_object_role as enum (
  'maxilla', 'mandible', 'antagonist', 'preop', 'prepared_tooth', 'tooth', 'crown', 'bridge',
  'pontic', 'denture_tooth', 'denture_base', 'framework', 'splint', 'implant', 'abutment',
  'model_base', 'reference', 'scan', 'other'
);
create type public.tool_category as enum (
  'navigation', 'scene', 'transform', 'mesh', 'sculpt', 'curve', 'analysis', 'occlusion', 'workflow', 'export'
);
create type public.demo_kind as enum ('interactive_3d', 'animation', 'image');
create type public.validator_type as enum (
  'required_object', 'required_step', 'transform_range', 'no_intersection', 'max_deviation',
  'contact_range', 'thickness_range', 'margin_complete', 'custom'
);
create type public.validation_severity as enum ('info', 'warning', 'error');
create type public.validation_outcome as enum ('pass', 'warning', 'fail', 'not_applicable');
create type public.verification_status as enum ('unverified', 'source_reviewed', 'expert_verified');
create type public.case_source_type as enum ('practice', 'scenario', 'import', 'blank');
create type public.case_status as enum ('draft', 'in_progress', 'completed', 'archived');
create type public.attempt_status as enum ('in_progress', 'completed', 'abandoned');
create type public.step_result_status as enum ('not_started', 'in_progress', 'passed', 'failed');
create type public.annotation_type as enum ('arrow', 'circle', 'text', 'highlight');
create type public.domain_reference_type as enum (
  'official_documentation', 'textbook', 'journal', 'course_material', 'expert_review', 'other'
);
create type app_private.admin_audit_action as enum ('create', 'update', 'publish', 'archive', 'delete', 'restore');

comment on type public.content_status is 'Shared lifecycle for data-driven educational registries.';
comment on type public.asset_visibility is 'authenticated means signed-in access through policy; it is not a public bucket.';
