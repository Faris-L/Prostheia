-- Mark the published Crown training case with the synthetic provenance already
-- stated by its notes and represented by its procedural case initializer.
update public.scenarios
set additional_metadata = additional_metadata || jsonb_build_object(
  'noPatientData', true,
  'geometryProvenance', 'internal-synthetic-educational'
)
where slug = 'synthetic_posterior_crown_26'
  and status = 'published'
  and additional_metadata->>'caseInitializer' = 'crown';
