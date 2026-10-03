-- Repair Serbian UTF-8 text that was stored after a legacy Windows-1252 decode.
-- This is a content-only correction; it does not change published content meaning.
create function pg_temp.phase25_fix_text(input text)
returns text
language plpgsql
immutable
as $$
begin
  input := replace(input, U&'\00C5\00A1', 'š');
  input := replace(input, U&'\00C5\00BE', 'ž');
  input := replace(input, U&'\00C5\017D', 'Ž');
  input := replace(input, U&'\00C5\0160', 'Š');
  input := replace(input, U&'\00C4\008D', 'č');
  input := replace(input, U&'\00C4\2021', 'ć');
  input := replace(input, U&'\00C4\2018', 'đ');
  input := replace(input, U&'\00C4\0090', 'Đ');
  input := replace(input, U&'\00C3\00A1', 'á');
  input := replace(input, U&'\00C3\00A9', 'é');
  input := replace(input, U&'\00C3\00AD', 'í');
  input := replace(input, U&'\00C3\00B3', 'ó');
  input := replace(input, U&'\00C3\00BA', 'ú');
  input := replace(input, U&'\00C3\2014', '×');
  input := replace(input, U&'\00C2\00B7', '·');
  input := replace(input, U&'\00E2\20AC\201C', '–');
  input := replace(input, U&'\00E2\2020\2019', '→');
  input := replace(input, U&'\00E2\20AC\0153', 'œ');
  input := replace(input, U&'\00E2\20AC\009D', '”');
  input := replace(input, U&'\00E2\20AC\2122', '’');
  input := replace(input, U&'\00E2\20AC\0152', 'Œ');
  input := replace(input, U&'\00E2\20AC\00A6', '…');
  return input;
end;
$$;

create function pg_temp.phase25_fix_json(input jsonb)
returns jsonb
language plpgsql
immutable
as $$
declare
  result jsonb;
begin
  case jsonb_typeof(input)
    when 'string' then
      return to_jsonb(pg_temp.phase25_fix_text(input #>> '{}'));
    when 'array' then
      select coalesce(jsonb_agg(pg_temp.phase25_fix_json(value) order by ordinal), '[]'::jsonb)
      into result
      from jsonb_array_elements(input) with ordinality as elements(value, ordinal);
      return result;
    when 'object' then
      select coalesce(jsonb_object_agg(key, pg_temp.phase25_fix_json(value)), '{}'::jsonb)
      into result
      from jsonb_each(input) as elements(key, value);
      return result;
    else
      return input;
  end case;
end;
$$;

update public.practice_modules
set title_sr = pg_temp.phase25_fix_text(title_sr),
    summary_sr = pg_temp.phase25_fix_text(summary_sr)
where status = 'published'
  and (title_sr is distinct from pg_temp.phase25_fix_text(title_sr)
       or summary_sr is distinct from pg_temp.phase25_fix_text(summary_sr));

update public.practice_lessons lesson
set title_sr = pg_temp.phase25_fix_text(lesson.title_sr),
    summary_sr = pg_temp.phase25_fix_text(lesson.summary_sr),
    goal_sr = pg_temp.phase25_fix_text(lesson.goal_sr)
from public.practice_modules module
where module.id = lesson.module_id
  and module.status = 'published'
  and lesson.status = 'published'
  and (lesson.title_sr is distinct from pg_temp.phase25_fix_text(lesson.title_sr)
       or lesson.summary_sr is distinct from pg_temp.phase25_fix_text(lesson.summary_sr)
       or lesson.goal_sr is distinct from pg_temp.phase25_fix_text(lesson.goal_sr));

update public.practice_steps step
set title_sr = pg_temp.phase25_fix_text(step.title_sr),
    instructions_sr = pg_temp.phase25_fix_text(step.instructions_sr),
    theory_sr = pg_temp.phase25_fix_text(step.theory_sr),
    example_config = pg_temp.phase25_fix_json(step.example_config)
from public.practice_lessons lesson
join public.practice_modules module on module.id = lesson.module_id
where lesson.id = step.lesson_id
  and module.status = 'published'
  and lesson.status = 'published'
  and (step.title_sr is distinct from pg_temp.phase25_fix_text(step.title_sr)
       or step.instructions_sr is distinct from pg_temp.phase25_fix_text(step.instructions_sr)
       or step.theory_sr is distinct from pg_temp.phase25_fix_text(step.theory_sr)
       or step.example_config is distinct from pg_temp.phase25_fix_json(step.example_config));

update public.practice_hints hint
set title_sr = pg_temp.phase25_fix_text(hint.title_sr),
    body_sr = pg_temp.phase25_fix_text(hint.body_sr)
from public.practice_steps step
join public.practice_lessons lesson on lesson.id = step.lesson_id
join public.practice_modules module on module.id = lesson.module_id
where step.id = hint.step_id
  and module.status = 'published'
  and lesson.status = 'published'
  and (hint.title_sr is distinct from pg_temp.phase25_fix_text(hint.title_sr)
       or hint.body_sr is distinct from pg_temp.phase25_fix_text(hint.body_sr));

update public.scenarios
set title_sr = pg_temp.phase25_fix_text(title_sr),
    description_sr = pg_temp.phase25_fix_text(description_sr),
    indication_sr = pg_temp.phase25_fix_text(indication_sr),
    requirements_sr = array(select pg_temp.phase25_fix_text(value) from unnest(requirements_sr) as value),
    additional_metadata = pg_temp.phase25_fix_json(additional_metadata)
where status = 'published'
  and (title_sr is distinct from pg_temp.phase25_fix_text(title_sr)
       or description_sr is distinct from pg_temp.phase25_fix_text(description_sr)
       or indication_sr is distinct from pg_temp.phase25_fix_text(indication_sr)
       or additional_metadata is distinct from pg_temp.phase25_fix_json(additional_metadata)
       or requirements_sr is distinct from array(select pg_temp.phase25_fix_text(value) from unnest(requirements_sr) as value));
