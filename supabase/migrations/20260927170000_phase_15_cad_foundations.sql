-- Phase 15: official bilingual CAD Foundations curriculum, stored in the Admin-managed Practice model.
-- Geometry referenced by these lessons is generated in code by synthetic-dental-geometry.ts.
-- It is internally created teaching material; no patient or third-party library data is used.

insert into public.practice_modules (id, slug, title_en, title_sr, summary_en, summary_sr, sort_order, status)
values ('b7150000-0000-4000-8000-000000000001', 'cad_foundations', 'CAD Foundations', 'Osnove CAD-a',
  'Short, hands-on lessons for navigating the shared dental CAD workspace and practicing its core tools on synthetic dental geometry.',
  'Kratke praktične lekcije za snalaženje u zajedničkom dentalnom CAD prostoru i vežbanje osnovnih alata na sintetičkoj dentalnoj geometriji.',
  10, 'published')
on conflict (slug) do update set title_en=excluded.title_en, title_sr=excluded.title_sr,
  summary_en=excluded.summary_en, summary_sr=excluded.summary_sr, sort_order=excluded.sort_order, status='published';

insert into public.practice_lessons (id, module_id, slug, difficulty, title_en, title_sr, summary_en, summary_sr, goal_en, goal_sr, estimated_minutes, case_setup, sort_order, status)
select seed.id, m.id, seed.slug, 'foundation', seed.title_en, seed.title_sr, seed.summary_en, seed.summary_sr, seed.goal_en, seed.goal_sr, seed.minutes,
  '{"source":"shared-demo-workspace","objectMappings":[{"runtimeObjectId":"demo-prepared-tooth","semanticRole":"prepared_tooth","editable":true},{"runtimeObjectId":"demo-crown","semanticRole":"restoration","editable":true},{"runtimeObjectId":"demo-reference","semanticRole":"reference","editable":false},{"runtimeObjectId":"demo-synthetic-scan","semanticRole":"synthetic_scan","editable":true}]}'::jsonb,
  seed.sort_order, 'published'
from public.practice_modules m cross join (values
 ('b7150000-0000-4000-8000-000000000010'::uuid,'workspace_orientation',10,'CAD Workspace Orientation','Snalaženje u CAD prostoru','Meet the Scene, viewport and Properties panels using a synthetic dental arch.','Upoznajte panele Scene, viewport i Properties uz sintetički dentalni luk.','Identify where dental objects, view controls and object properties are shown.','Pronađite gde se prikazuju dentalni objekti, kontrole prikaza i svojstva objekta.',3),
 ('b7150000-0000-4000-8000-000000000011','camera_navigation',20,'Camera Navigation','Navigacija kamerom','Orbit, pan, zoom and use standard views to inspect an arch from useful directions.','Vežbajte orbitiranje, pomeranje prikaza, zumiranje i standardne poglede na luk.','Inspect the synthetic arch from each specified view.','Pregledajte sintetički luk iz svakog navedenog pogleda.',4),
 ('b7150000-0000-4000-8000-000000000012','select_dental_objects',30,'Select Dental Objects','Izbor dentalnih objekata','Select the preparation, restoration and arch in the viewport and Scene Tree.','Birajte preparaciju, restauraciju i luk u viewport-u i stablu Scene.','Select each dental object in both the viewport and Scene Tree.','Izaberite svaki dentalni objekat u viewport-u i stablu Scene.',4),
 ('b7150000-0000-4000-8000-000000000013','scene_visibility',40,'Scene and Visibility','Scena i vidljivost','Hide, show, isolate and adjust transparency to inspect overlapping dental geometry.','Sakrivajte, prikazujte, izolujte i menjajte providnost da biste pregledali preklopljenu dentalnu geometriju.','Inspect overlapping dental geometry with visibility controls.','Pregledajte preklopljenu dentalnu geometriju pomoću kontrola vidljivosti.',5),
 ('b7150000-0000-4000-8000-000000000014','move_numeric_precision',50,'Move and Numeric Positioning','Move i numeričko pozicioniranje','Move the synthetic restoration with the gizmo and Properties coordinates.','Pomerite sintetičku restauraciju pomoću gizma i koordinata u panelu Properties.','Set the synthetic restoration position with the gizmo or numeric coordinates.','Podesite položaj sintetičke restauracije pomoću gizma ili numeričkih koordinata.',5),
 ('b7150000-0000-4000-8000-000000000015','rotate_and_snap',60,'Rotate and Snap','Rotate i snapping','Use rotation axes and a defined snap increment to change and restore orientation.','Koristite ose rotacije i zadati korak snapping-a za promenu i vraćanje orijentacije.','Rotate the synthetic restoration and return it to its starting orientation.','Rotirajte sintetičku restauraciju i vratite je u početnu orijentaciju.',5),
 ('b7150000-0000-4000-8000-000000000016','safe_scale',70,'Scale a Synthetic Reference','Skaliranje sintetičkog modela','Practice Scale on a clearly synthetic reference object; this is a control exercise, not a clinical scan workflow.','Vežbajte Scale na jasno označenom sintetičkom modelu; ovo je vežba rada s alatom, a ne postupak za klinički sken.','Change and restore the scale of the clearly labeled synthetic reference.','Promenite i vratite skalu jasno označene sintetičke reference.',3),
 ('b7150000-0000-4000-8000-000000000017','measurement_and_section',80,'Measurement and Section View','Merenje i Section prikaz','Place two measurement points and inspect the model with the non-destructive Section view.','Postavite dve tačke merenja i pregledajte model pomoću nedestruktivnog Section prikaza.','Measure between two surface points and inspect a section without changing the mesh.','Izmerite razmak između dve tačke površine i pregledajte presek bez izmene mesh-a.',5),
 ('b7150000-0000-4000-8000-000000000018','mesh_editing_basics',90,'Basic Mesh Editing','Osnove uređivanja mesh-a','Inspect a synthetic scan mesh and practice a reversible region edit.','Pregledajte mesh sintetičkog skena i isprobajte reverzibilnu izmenu regiona.','Select a mesh region and inspect the reversible editing workflow.','Izaberite region mesh-a i pregledajte reverzibilni postupak uređivanja.',5),
 ('b7150000-0000-4000-8000-000000000019','sculpt_basics',100,'Sculpt Basics','Osnove Sculpt alata','Try Add, Remove and Smooth on a synthetic dental surface with conservative brush settings.','Isprobajte Add, Remove i Smooth na sintetičkoj dentalnoj površini uz umerena podešavanja četkice.','Compare Add, Remove and Smooth on the synthetic dental surface.','Uporedite Add, Remove i Smooth na sintetičkoj dentalnoj površini.',5),
 ('b7150000-0000-4000-8000-000000000020','scan_preparation_basics',110,'Scan Preparation Basics','Osnove pripreme skena','Orient and inspect the supplied synthetic surface, then practice Trim, Smooth and Fill Hole.','Orijentišite i pregledajte sintetičku površinu, a zatim isprobajte Trim, Smooth i Fill Hole.','Inspect, trim and repair the synthetic scan exercise surface.','Pregledajte, trimujte i popravite sintetičku površinu za vežbu.',7),
 ('b7150000-0000-4000-8000-000000000022','undo_redo_reset',115,'Undo, Redo and Reset','Undo, Redo i Reset','Practice command history using a reversible transform on a synthetic restoration.','Vežbajte istoriju komandi reverzibilnom transformacijom sintetičke restauracije.','Use Undo and Redo, then return the restoration to its starting position.','Upotrebite Undo i Redo, a zatim vratite restauraciju u početni položaj.',4),
 ('b7150000-0000-4000-8000-000000000021','foundation_capstone',120,'Foundation Practice Case','Završna vežba Osnova','Use scene controls, a numeric transform, measurement and reference inspection in one synthetic case.','U sintetičkom slučaju primenite kontrole scene, numeričku transformaciju, merenje i pregled reference.','Complete a synthetic case using scene controls, positioning and inspection tools.','Završite sintetički slučaj pomoću kontrola scene, pozicioniranja i alata za pregled.',8)
) as seed(id,slug,sort_order,title_en,title_sr,summary_en,summary_sr,goal_en,goal_sr,minutes)
where m.slug='cad_foundations'
on conflict (slug) do update set module_id=excluded.module_id,difficulty=excluded.difficulty,title_en=excluded.title_en,title_sr=excluded.title_sr,
  summary_en=excluded.summary_en,summary_sr=excluded.summary_sr,goal_en=excluded.goal_en,goal_sr=excluded.goal_sr,
  estimated_minutes=excluded.estimated_minutes,case_setup=excluded.case_setup,sort_order=excluded.sort_order,status='published';

create or replace function pg_temp.seed_phase15_step(
  p_lesson_slug text,p_slug text,p_order integer,p_title_en text,p_title_sr text,p_instruction_en text,p_instruction_sr text,
  p_theory_en text,p_theory_sr text,p_tools text[],p_targets text[],p_reference_modes text[],p_reference_config jsonb,
  p_example_config jsonb,p_validator jsonb,p_hints jsonb
) returns void language plpgsql as $$
declare lesson_key uuid; step_key uuid; validator_key uuid; hint_value jsonb; tool_value text; validation_slug text;
begin
  select id into strict lesson_key from public.practice_lessons where slug=p_lesson_slug;
  insert into public.practice_steps (lesson_id,slug,sort_order,title_en,title_sr,instructions_en,instructions_sr,theory_en,theory_sr,target_object_ids,reference_modes,reference_config,example_config,required)
  values (lesson_key,p_slug,p_order,p_title_en,p_title_sr,p_instruction_en,p_instruction_sr,p_theory_en,p_theory_sr,p_targets,p_reference_modes,p_reference_config,p_example_config,true)
  on conflict (lesson_id,slug) do update set sort_order=excluded.sort_order,title_en=excluded.title_en,title_sr=excluded.title_sr,
    instructions_en=excluded.instructions_en,instructions_sr=excluded.instructions_sr,theory_en=excluded.theory_en,theory_sr=excluded.theory_sr,
    target_object_ids=excluded.target_object_ids,reference_modes=excluded.reference_modes,reference_config=excluded.reference_config,
    example_config=excluded.example_config,required=true
  returning id into step_key;
  delete from public.practice_hints where step_id=step_key;
  delete from public.practice_step_tools where step_id=step_key;
  delete from public.practice_step_validations where step_id=step_key;
  foreach tool_value in array p_tools loop
    insert into public.practice_step_tools(step_id,tool_id) values (step_key,tool_value) on conflict do nothing;
  end loop;
  if p_validator is not null then
    validation_slug := 'foundation_'||p_lesson_slug||'_'||p_slug||'_check';
    insert into public.validation_configs(slug,validator_type,config,status)
    values (validation_slug,(p_validator->>'type')::public.validator_type,p_validator,'published')
    on conflict (slug) do update set validator_type=excluded.validator_type,config=excluded.config,status='published'
    returning id into validator_key;
    insert into public.practice_step_validations(step_id,validation_config_id,sort_order) values(step_key,validator_key,10) on conflict do nothing;
  end if;
  for hint_value in select value from jsonb_array_elements(coalesce(p_hints,'[]'::jsonb)) loop
    insert into public.practice_hints(step_id,slug,sort_order,title_en,title_sr,body_en,body_sr)
    values(step_key,hint_value->>'slug',(hint_value->>'order')::integer,hint_value->>'title_en',hint_value->>'title_sr',hint_value->>'body_en',hint_value->>'body_sr');
  end loop;
end $$;

select pg_temp.seed_phase15_step('workspace_orientation','panel_map',10,'Find the dental objects','Pronađite dentalne objekte',
  'Locate the synthetic preparation, restoration and arch in Scene. Select each row and observe which object is highlighted in the viewport and Properties.','Pronađite sintetičku preparaciju, restauraciju i luk u panelu Scene. Izaberite svaki red i posmatrajte koji je objekat označen u viewport-u i panelu Properties.',
  'The Scene Tree selects whole CAD objects. Mesh-face selection is a separate editing mode introduced later.','Stablo Scene bira ceo CAD objekat. Izbor lica mesh-a je zaseban režim uređivanja koji ćete upoznati kasnije.',
  array['select','camera','scene'],array['demo-prepared-tooth','demo-crown','demo-reference'],array['off','outline'],'{"objectId":"demo-reference","position":[0,0,-8]}',
  '{"label_en":"Synthetic dental arch","label_sr":"Sintetički dentalni luk","mode":"outline"}',
  '{"type":"required_object","objectId":"demo-reference","selected":true}',
  '[{"slug":"scene-tree","order":10,"title_en":"Start in Scene","title_sr":"Počnite od Scene","body_en":"Choose objects from the Scene panel when they overlap in the viewport.","body_sr":"Birajte objekte iz panela Scene kada se preklapaju u viewport-u."}]');

select pg_temp.seed_phase15_step('camera_navigation','view_the_arch',10,'Inspect the arch from several views','Pregledajte luk iz više pogleda',
  'Orbit around the dental arch, pan to recenter it, zoom in and out, then use Top, Front and Right. Compare Perspective with Orthographic and finish with Frame Selected.','Orbitirajte oko dentalnog luka, pomerite prikaz da ga centrirate, zumirajte i udaljite prikaz, a zatim izaberite Top, Front i Right. Uporedite Perspective i Orthographic i završite komandom Frame Selected.',
  'Orbit changes viewing direction; pan moves the view; zoom changes magnification. Standard views make model orientation easier to compare.','Orbit menja pravac posmatranja, pan pomera prikaz, a zoom menja uvećanje. Standardni pogledi olakšavaju poređenje orijentacije modela.',
  array['camera','select'],array['demo-reference'],array['off','outline','transparent'],null,
  '{"label_en":"Top view of the synthetic arch","label_sr":"Pogled odozgo na sintetički luk","mode":"outline"}',
  '{"type":"required_step","message":{"en":"Camera movement is checked by your acknowledgment because the runtime does not score view changes.","sr":"Promenu pogleda potvrđujete sami jer runtime ne ocenjuje kretanje kamere."}}',
  '[{"slug":"orbit","order":10,"title_en":"Orbit","title_sr":"Orbit","body_en":"Drag with the orbit gesture around the arch; keep the arch centered as you inspect it.","body_sr":"Prevlačite gestom za orbitiranje oko luka i držite ga u centru dok ga pregledate."},{"slug":"orthographic","order":20,"title_en":"Compare projection","title_sr":"Uporedite projekciju","body_en":"Orthographic removes perspective size changes, which helps compare standard directions.","body_sr":"Orthographic uklanja promenu veličine usled perspektive i olakšava poređenje standardnih pravaca."}]');

select pg_temp.seed_phase15_step('select_dental_objects','select_roles',10,'Select by role','Birajte prema ulozi objekta',
  'Select Demo preparation, Demo restoration and Demo reference from both the Scene Tree and viewport. Check the active row and the object name in Properties.','Izaberite Demo preparation, Demo restoration i Demo reference iz stabla Scene i direktno u viewport-u. Proverite aktivni red i naziv objekta u panelu Properties.',
  'Object selection targets an entire preparation, restoration or reference model; it does not select mesh faces.','Izbor objekta obuhvata celu preparaciju, restauraciju ili referentni model; njime se ne biraju lica mesh-a.',
  array['select','camera','scene'],array['demo-prepared-tooth','demo-crown','demo-reference'],array['off','outline'],null,
  '{"label_en":"Select the restoration","label_sr":"Izaberite restauraciju","mode":"outline"}',
  '{"type":"required_step","message":{"en":"Confirm the three object roles after selecting them in the CAD workspace.","sr":"Potvrdite tri uloge objekata nakon što ih izaberete u CAD prostoru."}}',
  '[{"slug":"scene-tree-selection","order":10,"title_en":"Use Scene","title_sr":"Koristite Scene","body_en":"Choose the named row to select an object even when another surface is in front of it.","body_sr":"Izaberite imenovani red kada je drugi model ispred objekta u viewport-u."},{"slug":"clear-selection","order":20,"title_en":"Change the active object","title_sr":"Promenite aktivni objekat","body_en":"Choose another row or click empty viewport space to clear selection.","body_sr":"Izaberite drugi red ili kliknite na prazan deo viewport-a da biste poništili izbor."}]');

select pg_temp.seed_phase15_step('scene_visibility','hide_reference',10,'Temporarily hide the arch','Privremeno sakrijte luk',
  'Use Hide on Demo reference in the Scene Tree. Inspect the preparation and restoration without the arch behind them.','Sakrijte Demo reference pomoću komande Hide u stablu Scene. Pregledajte preparaciju i restauraciju bez luka u pozadini.',
  'Hide changes display only. It does not delete scan geometry.','Hide menja samo prikaz; geometrija skena se ne briše.',
  array['select','scene','camera'],array['demo-reference'],array['off','outline'],null,
  '{"label_en":"Arch visible","label_sr":"Luk je vidljiv","mode":"outline"}',
  '{"type":"required_object","objectId":"demo-reference","visible":false}',
  '[{"slug":"hide-control","order":10,"title_en":"Use the eye control","title_sr":"Koristite kontrolu oka","body_en":"The eye icon beside the object row toggles its visibility.","body_sr":"Ikonica oka pored reda objekta uključuje ili isključuje njegovu vidljivost."}]');

select pg_temp.seed_phase15_step('scene_visibility','restore_and_transparency',20,'Restore and inspect transparency','Vratite prikaz i pregledajte providnost',
  'Show the arch again. Select Demo restoration and adjust Transparency so it can be compared against the arch, then use Isolate and Restore All.','Ponovo prikažite luk. Izaberite Demo restoration i podesite Transparency da biste je uporedili sa lukom, a zatim upotrebite Isolate i Restore All.',
  'Transparency helps inspect spatial overlap while preserving the original reference geometry.','Providnost pomaže da se pregleda prostorno preklapanje, uz očuvanje geometrije reference.',
  array['select','scene','camera'],array['demo-reference','demo-crown'],array['off','outline','transparent','full'],
  '{"objectId":"demo-reference","position":[0,0,-8]}','{"label_en":"Transparent restoration","label_sr":"Providna restauracija","mode":"transparent"}',
  '{"type":"required_object","objectId":"demo-crown","visible":true,"minOpacity":0.15,"maxOpacity":0.85}',
  '[{"slug":"restore-all","order":10,"title_en":"Restore the scene","title_sr":"Vratite scenu","body_en":"Use Restore All after isolation so hidden objects return to the scene.","body_sr":"Nakon izolovanja izaberite Restore All da biste vratili sakrivene objekte."}]');

select pg_temp.seed_phase15_step('move_numeric_precision','position_restoration',10,'Move the synthetic restoration','Pomerite sintetičku restauraciju',
  'Select Demo restoration. Use the Move gizmo or Properties to set its X, Y and Z position to 0 mm. Target for this exercise: [0, 0, 0] mm.','Izaberite Demo restoration. Pomoću gizma Move ili panela Properties postavite X, Y i Z na 0 mm. Cilj ove vežbe: [0, 0, 0] mm.',
  'Move changes position while preserving shape. The numeric fields make small corrections easier to repeat. This coordinate target is only for this exercise.','Move menja položaj, a oblik ostaje isti. Numerička polja olakšavaju ponavljanje malih korekcija. Ove koordinate su cilj samo za ovu vežbu.',
  array['select','move','camera','scene'],array['demo-crown'],array['off','outline','transparent'],
  '{"objectId":"demo-reference","position":[0,0,-8]}','{"label_en":"Exercise position target","label_sr":"Ciljni položaj vežbe","mode":"outline"}',
  '{"type":"transform_range","objectId":"demo-crown","field":"position","position":[0,0,0],"axes":["x","y","z"],"toleranceMm":0.5}',
  '[{"slug":"axes","order":10,"title_en":"Move along axes","title_sr":"Pomeranje po osama","body_en":"Drag one colored axis to constrain movement. Numeric fields allow direct coordinates.","body_sr":"Povucite obojenu osu da ograničite pomeranje. Numerička polja služe za direktan unos koordinata."},{"slug":"snap","order":20,"title_en":"Choose a step","title_sr":"Izaberite korak","body_en":"Use a 0.5 mm or 0.1 mm translation step for this exercise, then finish with the target coordinates.","body_sr":"Za ovu vežbu izaberite korak pomeranja 0,5 mm ili 0,1 mm, a zatim unesite ciljne koordinate."}]');

select pg_temp.seed_phase15_step('rotate_and_snap','tilt_for_inspection',10,'Rotate for inspection','Rotirajte radi pregleda',
  'Select Demo restoration and rotate around Z by about 15° using the gizmo. Set the rotation snap to 5° and observe how the angle changes in Properties.','Izaberite Demo restoration i rotirajte je oko Z ose za približno 15° pomoću gizma. Podesite rotation snap na 5° i posmatrajte promenu ugla u panelu Properties.',
  'Rotation changes orientation. This is a synthetic control exercise; it does not prescribe a clinical tooth orientation.','Rotacija menja orijentaciju. Ovo je sintetička vežba rada s kontrolama i ne propisuje kliničku orijentaciju zuba.',
  array['select','rotate','camera'],array['demo-crown'],array['off','outline'],null,
  '{"label_en":"Rotated reference","label_sr":"Rotirana referenca","mode":"outline"}',
  '{"type":"transform_range","objectId":"demo-crown","field":"rotation","position":[0,0,0.261799],"axes":["z"],"toleranceMm":0.02}',
  '[{"slug":"rotation-axis","order":10,"title_en":"Use the Z ring","title_sr":"Koristite Z prsten","body_en":"Drag the blue rotation ring, or enter a numeric angle in Properties.","body_sr":"Povucite plavi prsten rotacije ili unesite ugao u panel Properties."}]');

select pg_temp.seed_phase15_step('rotate_and_snap','return_to_neutral',20,'Return to neutral orientation','Vratite neutralnu orijentaciju',
  'Set the restoration Z rotation back to 0°. Target for this exercise: [0, 0, 0] radians, within 0.02 radians.','Vratite Z rotaciju restauracije na 0°. Cilj ove vežbe: [0, 0, 0] radijana, uz toleranciju od 0,02 radijana.',
  'Use the numeric field or snap step to return to the exercise starting orientation. The threshold belongs to this exercise only.','Numeričkim poljem ili korakom snapping-a vratite početnu orijentaciju vežbe. Tolerancija važi samo za ovaj zadatak.',
  array['select','rotate','camera'],array['demo-crown'],array['off','outline'],null,
  '{"label_en":"Neutral orientation","label_sr":"Neutralna orijentacija","mode":"outline"}',
  '{"type":"transform_range","objectId":"demo-crown","field":"rotation","position":[0,0,0],"axes":["z"],"toleranceMm":0.02}',
  '[{"slug":"return-zero","order":10,"title_en":"Return to zero","title_sr":"Vratite na nulu","body_en":"The Properties angle is shown in degrees. Reset Z to 0° for this exercise target.","body_sr":"Ugao u panelu Properties prikazuje se u stepenima. Za cilj ove vežbe vratite Z na 0°."}]');

select pg_temp.seed_phase15_step('safe_scale','scale_synthetic_reference',10,'Scale the synthetic reference','Skalirajte sintetičku referencu',
  'Select Synthetic scan exercise surface, isolate it, activate Scale and increase X scale to 1.08. Target for this exercise: X = 1.08; restore it to 1.00 when finished.','Izaberite Synthetic scan exercise surface, izolujte je, uključite Scale i povećajte X skalu na 1,08. Cilj ove vežbe: X = 1,08; po završetku vratite skalu na 1,00.',
  'Scaling is included here to learn the control on synthetic geometry. Arbitrary scaling is not presented as a normal way to alter a clinical scan.','Skaliranje vežbate na sintetičkoj geometriji radi upoznavanja kontrole. Proizvoljno skaliranje se ne predstavlja kao uobičajen način izmene kliničkog skena.',
  array['select','scale','camera','scene'],array['demo-synthetic-scan'],array['off','outline'],null,
  '{"label_en":"Synthetic scan baseline","label_sr":"Početna sintetička površina","mode":"outline"}',
  '{"type":"transform_range","objectId":"demo-synthetic-scan","field":"scale","position":[1.08,1,1],"axes":["x"],"toleranceMm":0.01}',
  '[{"slug":"one-axis","order":10,"title_en":"Use one axis","title_sr":"Koristite jednu osu","body_en":"Use the X scale handle or numeric Scale X field. Keep the other axes unchanged.","body_sr":"Koristite ručicu za X skalu ili numeričko polje Scale X. Ostale ose ne menjajte."}]');

select pg_temp.seed_phase15_step('safe_scale','restore_reference_scale',20,'Restore the exercise surface scale','Vratite skalu probne površine',
  'Restore All if you isolated the object, then set the synthetic surface scale to [1, 1, 1]. Target for this exercise: X = 1.00 within 0.01.','Ako ste izolovali objekat, upotrebite Restore All, a zatim postavite skalu sintetičke površine na [1, 1, 1]. Cilj vežbe: X = 1,00 uz toleranciju 0,01.',
  'Return the synthetic exercise object to its initial scale. These values are a control practice target.','Vratite sintetički objekat vežbe na početnu skalu. Ove vrednosti su cilj za vežbanje kontrola.',
  array['select','scale','camera','scene'],array['demo-synthetic-scan'],array['off','outline'],null,null,
  '{"type":"transform_range","objectId":"demo-synthetic-scan","field":"scale","position":[1,1,1],"axes":["x","y","z"],"toleranceMm":0.01}',
  '[{"slug":"restore-scale","order":10,"title_en":"Reset scale values","title_sr":"Vratite vrednosti skale","body_en":"Set all three numeric scale fields to 1.00, then check the result.","body_sr":"Postavite sva tri numerička polja skale na 1,00, a zatim proverite rezultat."}]');

select pg_temp.seed_phase15_step('measurement_and_section','measure_surface_distance',10,'Measure between two surface points','Izmerite razmak između dve tačke površine',
  'Activate Measure. Click two points on the synthetic restoration surface and read the displayed millimeter distance. Clear the measurement when done.','Uključite Measure. Kliknite na dve tačke sintetičke površine restauracije i očitajte rastojanje u milimetrima. Zatim obrišite merenje.',
  'The distance reports geometry separation only. This exercise does not assign clinical meaning to the number.','Merenje prikazuje samo rastojanje između tačaka geometrije. Ova vežba ne pridaje kliničko značenje rezultatu.',
  array['analysis','select','camera'],array['demo-crown'],array['off','outline'],null,null,
  '{"type":"required_step","message":{"en":"Place and read two measurement points before acknowledging this step.","sr":"Postavite i očitajte dve tačke merenja pre potvrde koraka."}}',
  '[{"slug":"two-points","order":10,"title_en":"Point A and Point B","title_sr":"Tačka A i tačka B","body_en":"Click the surface once for A and again for B. The workspace reports their distance in millimeters.","body_sr":"Kliknite jednom na površinu za tačku A, a zatim za tačku B. Radni prostor prikazuje njihovo rastojanje u milimetrima."}]');

select pg_temp.seed_phase15_step('measurement_and_section','inspect_section',20,'Inspect a section without trimming','Pregledajte presek bez trimovanja',
  'Open Section, enable a plane, change its orientation between X, Y and Z and move the offset across the synthetic arch. Disable the plane to restore the full view.','Otvorite Section, uključite ravan, menjajte orijentaciju između X, Y i Z i pomerajte offset kroz sintetički luk. Isključite ravan da vratite ceo prikaz.',
  'Section clips the viewport for inspection. It does not remove faces or change the source mesh.','Section privremeno odseca prikaz radi pregleda. Ne uklanja lica niti menja izvorni mesh.',
  array['analysis','camera','select'],array['demo-reference'],array['off','outline'],null,
  '{"label_en":"Section inspection","label_sr":"Pregled preseka","mode":"outline"}',
  '{"type":"required_step","message":{"en":"Enable, move and disable the section plane to complete the inspection.","sr":"Uključite, pomerite i isključite ravan preseka da biste završili pregled."}}',
  '[{"slug":"section-not-trim","order":10,"title_en":"Section is non-destructive","title_sr":"Section ne menja geometriju","body_en":"Use the Section panel to slide the clipping plane. Use Trim only when you intend to edit mesh geometry.","body_sr":"Pomerajte ravan odsecanja u panelu Section. Alat Trim koristite samo kada želite da menjate geometriju mesh-a."}]');

select pg_temp.seed_phase15_step('mesh_editing_basics','select_scan_region',10,'Select a mesh region','Izaberite region mesh-a',
  'Select Synthetic scan exercise surface in Scene, enter Face / Region selection and click several surface faces. Inspect the selection highlight; do not delete anything until you have checked Undo.','Izaberite Synthetic scan exercise surface u panelu Scene, uključite Face / Region izbor i kliknite na nekoliko lica površine. Pregledajte označeni region; ništa ne brišite dok ne proverite Undo.',
  'Object selection and face selection are different. A region edit changes mesh geometry and should be reversible through history.','Izbor objekta i lica nisu isto. Izmena regiona menja geometriju mesh-a i treba da može da se poništi kroz istoriju.',
  array['select','mesh_edit','camera'],array['demo-synthetic-scan'],array['off','outline'],null,
  '{"label_en":"Selected scan faces","label_sr":"Izabrana lica skena","mode":"outline"}',
  '{"type":"required_object","objectId":"demo-synthetic-scan","selected":true}',
  '[{"slug":"face-mode","order":10,"title_en":"Face / Region mode","title_sr":"Režim Face / Region","body_en":"Use Face / Region to highlight mesh faces. Undo restores geometry after a destructive operation.","body_sr":"Pomoću Face / Region označite lica mesh-a. Undo vraća geometriju nakon destruktivne operacije."}]');

select pg_temp.seed_phase15_step('sculpt_basics','small_brush_trials',10,'Try Add, Remove and Smooth','Isprobajte Add, Remove i Smooth',
  'Select Demo preparation and open Sculpt. Make one short stroke with Add, one with Remove and one with Smooth using a small brush radius. Use Undo between trials to compare changes.','Izaberite Demo preparation i otvorite Sculpt. Napravite kratak potez alatima Add, Remove i Smooth uz mali radijus četkice. Između pokušaja koristite Undo da uporedite promene.',
  'Radius controls the affected area; strength controls how much one stroke changes the surface. Practice edits are reversible.','Radius određuje veličinu zahvaćene oblasti, a strength jačinu promene jednim potezom. Izmene za vežbu mogu se poništiti.',
  array['sculpt','select','camera'],array['demo-prepared-tooth'],array['off','outline'],null,
  '{"label_en":"Synthetic preparation surface","label_sr":"Površina sintetičke preparacije","mode":"outline"}',
  '{"type":"required_object","objectId":"demo-prepared-tooth","minGeometryRevision":1}',
  '[{"slug":"small-strokes","order":10,"title_en":"Use short strokes","title_sr":"Koristite kratke poteze","body_en":"Start with low strength and a small radius. Undo after each trial to compare Add, Remove and Smooth.","body_sr":"Počnite sa malom jačinom i radijusom. Posle svakog pokušaja koristite Undo da uporedite Add, Remove i Smooth."}]');

select pg_temp.seed_phase15_step('scan_preparation_basics','orient_scan',10,'Orient the synthetic scan for inspection','Orijentišite sintetički sken za pregled',
  'Select Synthetic scan exercise surface and use Rotate plus standard views to inspect its axes. Use Reset or numeric rotation to return to its starting orientation.','Izaberite Synthetic scan exercise surface i alat Rotate i standardne poglede da pregledate ose. Pomoću Reset ili numeričke rotacije vratite početnu orijentaciju.',
  'Confirm the model orientation before editing. The supplied exercise surface is synthetic and has no patient coordinate frame.','Pre izmene proverite orijentaciju modela. Data površina vežbe je sintetička i nema koordinatni sistem pacijenta.',
  array['select','rotate','camera'],array['demo-synthetic-scan'],array['off','outline'],null,null,
  '{"type":"required_step","message":{"en":"Inspect the axes and restore the starting orientation before editing.","sr":"Pregledajte ose i vratite početnu orijentaciju pre uređivanja."}}',
  '[{"slug":"inspect-axes","order":10,"title_en":"Inspect before editing","title_sr":"Pregledajte pre izmene","body_en":"Use Front, Top and Right to understand orientation before running a mesh operation.","body_sr":"Pre mesh operacije proverite orijentaciju iz pogleda Front, Top i Right."}]');

select pg_temp.seed_phase15_step('scan_preparation_basics','trim_scan',20,'Trim a small part of the exercise surface','Odsecite mali deo probne površine',
  'Choose the Z trim plane and offset so a small part of the synthetic surface is removed. Keep the mesh intact and undo if the cut is too large.','Izaberite Z ravan za trimovanje i podesite offset tako da uklonite mali deo sintetičke površine. Sačuvajte mesh i poništite rez ako je prevelik.',
  'Trim changes the mesh. Section only clips the view; use Trim when you intend to keep an edited boundary.','Trim menja mesh. Section samo odseca prikaz; Trim koristite kada želite da zadržite izmenjenu granicu.',
  array['select','mesh_edit','camera'],array['demo-synthetic-scan'],array['off','outline'],null,null,
  '{"type":"required_object","objectId":"demo-synthetic-scan","minGeometryRevision":1}',
  '[{"slug":"trim-small","order":10,"title_en":"Keep the cut modest","title_sr":"Neka rez bude mali","body_en":"Move the trim offset gradually and inspect the remaining dental surface from another view.","body_sr":"Postepeno pomerajte trim offset i iz drugog pogleda proverite preostalu dentalnu površinu."}]');

select pg_temp.seed_phase15_step('scan_preparation_basics','smooth_and_fill',30,'Smooth and close the synthetic scan opening','Izgladite i zatvorite otvor na sintetičkom skenu',
  'Select the scan mesh again. Use one Smooth iteration on a small region, then select the open patch and use Fill Hole. Inspect the result and Undo if the boundary was not the intended one.','Ponovo izaberite mesh skena. Jednom primenite Smooth na manjem regionu, zatim izaberite otvor i upotrebite Fill Hole. Pregledajte rezultat i poništite ako granica nije bila odgovarajuća.',
  'Smooth adjusts local vertex positions. Fill Hole closes a mesh boundary; both change geometry and should be inspected afterward.','Smooth menja položaj lokalnih temena. Fill Hole zatvara granicu mesh-a; nakon obe izmene proverite geometriju.',
  array['select','mesh_edit','camera'],array['demo-synthetic-scan'],array['off','outline'],null,null,
  '{"type":"required_object","objectId":"demo-synthetic-scan","minGeometryRevision":3}',
  '[{"slug":"hole-boundary","order":10,"title_en":"Use the open patch","title_sr":"Izaberite otvorenu granicu","body_en":"The synthetic training surface includes a small open patch for Fill Hole practice. Select its boundary before applying the operation.","body_sr":"Sintetička površina za obuku sadrži mali otvor za vežbu Fill Hole. Pre operacije izaberite njegovu granicu."}]');

select pg_temp.seed_phase15_step('undo_redo_reset','move_and_replay',10,'Move, Undo and Redo','Move, Undo i Redo',
  'Select Demo restoration and set Position to [8, 1, 0] mm. Press Ctrl+Z once and observe that this transform is undone, then press Ctrl+Y (or Ctrl+Shift+Z) to restore it. Target for this exercise: [8, 1, 0] mm.','Izaberite Demo restoration i postavite Position na [8, 1, 0] mm. Jednom pritisnite Ctrl+Z i proverite da je transformacija poništena, a zatim Ctrl+Y (ili Ctrl+Shift+Z) da je vratite. Cilj vežbe: [8, 1, 0] mm.',
  'History records completed commands. Undo and Redo let you test a change safely, inspect the result and return to a known state.','Istorija beleži završene komande. Undo i Redo omogućavaju bezbedno isprobavanje izmene, pregled rezultata i povratak u poznato stanje.',
  array['select','move','camera'],array['demo-crown'],array['off','outline'],null,
  '{"label_en":"Position after Redo","label_sr":"Položaj nakon Redo","mode":"outline"}',
  '{"type":"transform_range","objectId":"demo-crown","field":"position","position":[8,1,0],"axes":["x","y","z"],"toleranceMm":0.1}',
  '[{"slug":"undo","order":10,"title_en":"Undo one command","title_sr":"Poništite jednu komandu","body_en":"Ctrl+Z restores the previous committed transform. A later edit may create a new history entry.","body_sr":"Ctrl+Z vraća prethodno potvrđenu transformaciju. Sledeća izmena može napraviti novi unos u istoriji."},{"slug":"redo","order":20,"title_en":"Redo the command","title_sr":"Vratite komandu","body_en":"Use Ctrl+Y or Ctrl+Shift+Z to redo. Confirm the displayed coordinates before Design Check.","body_sr":"Pomoću Ctrl+Y ili Ctrl+Shift+Z vratite komandu. Pre Design Check-a proverite prikazane koordinate."}]');

select pg_temp.seed_phase15_step('undo_redo_reset','return_to_start',20,'Return the object to its starting position','Vratite objekat na početni položaj',
  'Use Properties to return Demo restoration to [8, 0, 0] mm. Target for this exercise: the original synthetic starting position.','U panelu Properties vratite Demo restoration na [8, 0, 0] mm. Cilj vežbe: početni položaj sintetičkog objekta.',
  'Numeric transforms make it easier to return to a known starting state after an experiment.','Numeričke transformacije olakšavaju povratak u poznato početno stanje nakon eksperimenta.',
  array['select','move','camera'],array['demo-crown'],array['off','outline'],null,null,
  '{"type":"transform_range","objectId":"demo-crown","field":"position","position":[8,0,0],"axes":["x","y","z"],"toleranceMm":0.1}',
  '[{"slug":"starting-point","order":10,"title_en":"Use the numeric fields","title_sr":"Koristite numerička polja","body_en":"Set Y back to 0 mm; X and Z should remain at their initial values.","body_sr":"Vratite Y na 0 mm; X i Z treba da ostanu na početnim vrednostima."}]');

select pg_temp.seed_phase15_step('foundation_capstone','isolate_and_position',10,'Inspect and position the restoration','Pregledajte i postavite restauraciju',
  'Select Demo restoration, isolate it, then set Position to [0, 1, 0] mm. Target for this exercise: [0, 1, 0] mm within 0.5 mm on X and Y. Restore the full scene before the next step.','Izaberite Demo restoration, izolujte je, a zatim postavite Position na [0, 1, 0] mm. Cilj vežbe: [0, 1, 0] mm uz toleranciju 0,5 mm po osama X i Y. Vratite celu scenu pre sledećeg koraka.',
  'This exercise target combines scene isolation and numeric Move. It is a synthetic workspace task, not a clinical placement value.','Cilj ove vežbe objedinjuje izolovanje scene i numerički Move. To je zadatak u sintetičkom prostoru, a ne klinička vrednost položaja.',
  array['select','scene','move','camera'],array['demo-crown'],array['off','outline','transparent'],
  '{"objectId":"demo-reference","position":[0,0,-8]}','{"label_en":"Capstone position target","label_sr":"Ciljni položaj završne vežbe","mode":"outline"}',
  '{"type":"transform_range","objectId":"demo-crown","field":"position","position":[0,1,0],"axes":["x","y"],"toleranceMm":0.5}',
  '[{"slug":"numeric-position","order":10,"title_en":"Use Properties","title_sr":"Koristite Properties","body_en":"Set X to 0 and Y to 1 in Properties. Restore All after isolating the restoration.","body_sr":"U panelu Properties postavite X na 0 i Y na 1. Nakon izolovanja restauracije koristite Restore All."}]');

select pg_temp.seed_phase15_step('foundation_capstone','inspect_and_measure',20,'Compare with the arch and measure','Uporedite sa lukom i izmerite',
  'Show the arch again, set Demo reference to Transparent, then use Measure on two surface points. Use Section to inspect across the arch and disable it before finishing.','Ponovo prikažite luk, podesite Demo reference na Transparent, zatim izmerite dve tačke na površini. Pomoću Section-a pregledajte presek luka i isključite ga pre završetka.',
  'The reference overlay and section are inspection aids. Measurement reports millimeters without assigning clinical interpretation.','Providna referenca i presek služe za pregled. Merenje prikazuje milimetre bez kliničkog tumačenja.',
  array['select','scene','analysis','camera'],array['demo-reference','demo-crown'],array['off','outline','transparent','full'],
  '{"objectId":"demo-reference","position":[0,0,-8]}','{"label_en":"Reference overlay","label_sr":"Providno preklapanje reference","mode":"transparent"}',
  '{"type":"required_step","message":{"en":"Restore the arch, inspect the transparent overlay and complete the measurement and section check.","sr":"Vratite luk, pregledajte providno preklapanje i obavite merenje i pregled preseka."}}',
  '[{"slug":"measure-and-section","order":10,"title_en":"Finish the inspection","title_sr":"Završite pregled","body_en":"Clear temporary analysis overlays before completing the case.","body_sr":"Pre završetka uklonite privremene analitičke prikaze."}]');

-- The registered required_step validator is the explicit completion mechanism for actions
-- (camera navigation and visual inspection) that this runtime cannot measure reliably.
create or replace function public.publish_practice_lesson(p_lesson_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare lesson_row public.practice_lessons%rowtype;
begin
  if auth.uid() is null or not public.is_admin() then raise exception 'Administrative access required' using errcode='42501'; end if;
  select * into lesson_row from public.practice_lessons where id=p_lesson_id for update;
  if not found then raise exception 'Lesson not found'; end if;
  if length(btrim(lesson_row.title_en))=0 or length(btrim(lesson_row.title_sr))=0 or length(btrim(lesson_row.goal_en))=0 or length(btrim(lesson_row.goal_sr))=0 then raise exception 'Lesson title and goal are required in English and Serbian'; end if;
  if not exists(select 1 from public.practice_steps where lesson_id=p_lesson_id and required) then raise exception 'Add at least one required lesson step before publishing'; end if;
  if exists(select 1 from public.practice_steps s where s.lesson_id=p_lesson_id and (length(btrim(s.title_en))=0 or length(btrim(s.title_sr))=0 or length(btrim(s.instructions_en))=0 or length(btrim(s.instructions_sr))=0 or not exists(select 1 from public.practice_step_tools t where t.step_id=s.id))) then raise exception 'Every lesson step needs bilingual instructions and at least one registered tool'; end if;
  if exists(select 1 from public.practice_step_validations sv join public.validation_configs vc on vc.id=sv.validation_config_id where sv.step_id in (select id from public.practice_steps where lesson_id=p_lesson_id) and vc.validator_type not in ('transform_range','required_object','required_step')) then raise exception 'A configured validator is not supported by the Practice runtime'; end if;
  if exists(select 1 from public.practice_lesson_assets la join public.assets a on a.id=la.asset_id left join public.asset_licenses al on al.asset_id=a.id where la.lesson_id=p_lesson_id and (a.status <> 'ready' or (a.scope='platform' and (al.asset_id is null or al.commercial_use_allowed is not true or (al.source_url is null and al.license_name is null))))) then raise exception 'Referenced model assets must be ready and have reviewed provenance and commercial-use metadata'; end if;
  update public.practice_modules set status='published' where id=lesson_row.module_id;
  update public.practice_lessons set status='published' where id=p_lesson_id;
  perform public.record_admin_content_audit('publish','practice_lesson',p_lesson_id,'{}'::jsonb);
end; $$;
revoke all on function public.publish_practice_lesson(uuid) from public, anon;
grant execute on function public.publish_practice_lesson(uuid) to authenticated;
