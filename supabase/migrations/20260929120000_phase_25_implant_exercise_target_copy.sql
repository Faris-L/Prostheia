do $$
declare
  updated_rows integer;
begin
  update public.practice_steps as step
  set
    instructions_en = 'Target for this exercise: 8 mm. Set the synthetic implant fixture depth with the Implant panel. Measure depth from the top plane of the synthetic site block.',
    instructions_sr = 'Ciljna vrednost za ovu vežbu: 8 mm. Podesite dubinu sintetičkog tela implantata u panelu Implant. Dubina se meri od gornje ravni sintetičkog bloka mesta.',
    updated_at = now()
  from public.practice_lessons as lesson
  where step.lesson_id = lesson.id
    and lesson.slug = 'position_and_depth'
    and step.slug = 'set_exercise_depth'
    and lesson.status = 'published';

  get diagnostics updated_rows = row_count;
  if updated_rows <> 1 then
    raise exception 'Expected to update one published Implant exercise step, updated %', updated_rows;
  end if;
end
$$;
