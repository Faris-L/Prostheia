-- Calibrate seeded Practice checks to the explicit learner action for each setup lesson.
update public.validation_configs
set config = config || '{"arch":"upper","segment":"anterior"}'::jsonb,
    updated_at = now()
where slug = 'denture_anterior_setup_main'
  and status = 'published';

update public.validation_configs
set config = config || '{"arch":"upper","segment":"posterior"}'::jsonb,
    updated_at = now()
where slug = 'denture_posterior_setup_main'
  and status = 'published';
