-- R3 fixed prosthetics: route existing Practice lessons and private training
-- scenarios through the generic Case Package loader. All case codes are fictional.

with r3_setup(lesson_slug, source_name, restoration_type, package_id, checkpoint_id, mappings) as (values
  ('margin','crown-case','crown','r3-crown-26-v1','margin','[{"runtimeObjectId":"r3c26-preparation","semanticRole":"SOURCE · prepared tooth 26","editable":false},{"runtimeObjectId":"r3c26-restoration","semanticRole":"DESIGN · anatomical Crown 26","editable":true},{"runtimeObjectId":"r3c26-reference","semanticRole":"REFERENCE · intact tooth 26","editable":false}]'::jsonb),
  ('insertion_path','crown-case','crown','r3-crown-26-v1','insertion_path','[{"runtimeObjectId":"r3c26-preparation","semanticRole":"SOURCE · prepared tooth 26","editable":false},{"runtimeObjectId":"r3c26-insertion-axis","semanticRole":"GUIDE · insertion direction","editable":false}]'::jsonb),
  ('placement','crown-case','crown','r3-crown-26-v1','placement','[{"runtimeObjectId":"r3c26-preparation","semanticRole":"SOURCE · prepared tooth 26","editable":false},{"runtimeObjectId":"r3c26-restoration","semanticRole":"DESIGN · anatomical Crown 26","editable":true}]'::jsonb),
  ('contacts','crown-case','crown','r3-crown-26-v1','contacts','[{"runtimeObjectId":"r3c26-restoration","semanticRole":"DESIGN · anatomical Crown 26","editable":true},{"runtimeObjectId":"r3c26-adjacent-25","semanticRole":"SOURCE · adjacent tooth 25","editable":false},{"runtimeObjectId":"r3c26-antagonist-36","semanticRole":"SOURCE · antagonist 36","editable":false}]'::jsonb),
  ('sculpt','crown-case','crown','r3-crown-26-v1','sculpt','[{"runtimeObjectId":"r3c26-restoration","semanticRole":"DESIGN · anatomical Crown 26","editable":true},{"runtimeObjectId":"r3c26-reference","semanticRole":"REFERENCE · intact tooth 26","editable":false}]'::jsonb),
  ('thickness','crown-case','crown','r3-crown-26-v1','thickness','[{"runtimeObjectId":"r3c26-restoration","semanticRole":"DESIGN · near-final Crown 26","editable":true}]'::jsonb),
  ('full_crown_case','crown-case','crown','r3-crown-26-v1','case_start','[{"runtimeObjectId":"r3c26-preparation","semanticRole":"SOURCE · prepared tooth 26","editable":false},{"runtimeObjectId":"r3c26-restoration","semanticRole":"DESIGN · anatomical Crown 26","editable":true},{"runtimeObjectId":"r3c26-reference","semanticRole":"REFERENCE · intact tooth 26","editable":false}]'::jsonb),
  ('bridge_units','restorative-case','bridge','r3-bridge-24-26-v1','margins_path','[{"runtimeObjectId":"r3bridge246-preparation-24","semanticRole":"SOURCE · abutment 24","editable":false},{"runtimeObjectId":"r3bridge246-preparation-26","semanticRole":"SOURCE · abutment 26","editable":false},{"runtimeObjectId":"r3bridge246-bridge-design","semanticRole":"DESIGN · connected bridge units","editable":true}]'::jsonb),
  ('bridge_pontic_connectors','restorative-case','bridge','r3-bridge-24-26-v1','pontic_connectors','[{"runtimeObjectId":"r3bridge246-bridge-design","semanticRole":"DESIGN · abutments, pontic and connectors","editable":true},{"runtimeObjectId":"r3bridge246-gingiva","semanticRole":"SOURCE · synthetic local support","editable":false}]'::jsonb),
  ('bridge_contacts_thickness','restorative-case','bridge','r3-bridge-24-26-v1','contacts_thickness','[{"runtimeObjectId":"r3bridge246-bridge-design","semanticRole":"DESIGN · connected bridge units","editable":true},{"runtimeObjectId":"r3bridge246-adjacent-27","semanticRole":"SOURCE · neighbor 27","editable":false},{"runtimeObjectId":"r3bridge246-antagonist-36","semanticRole":"SOURCE · synthetic antagonist 36","editable":false}]'::jsonb),
  ('bridge_full_case','restorative-case','bridge','r3-bridge-24-26-v1','case_start','[{"runtimeObjectId":"r3bridge246-preparation-24","semanticRole":"SOURCE · abutment 24","editable":false},{"runtimeObjectId":"r3bridge246-preparation-26","semanticRole":"SOURCE · abutment 26","editable":false},{"runtimeObjectId":"r3bridge246-bridge-design","semanticRole":"DESIGN · connected bridge units","editable":true}]'::jsonb),
  ('inlay_margin_insertion','restorative-case','inlay','r3-inlay-36-v1','design_ready','[{"runtimeObjectId":"r3inlay36-preparation","semanticRole":"SOURCE · intracoronal preparation 36","editable":false},{"runtimeObjectId":"r3inlay36-restoration","semanticRole":"DESIGN · central partial Inlay","editable":true}]'::jsonb),
  ('inlay_contact_thickness','restorative-case','inlay','r3-inlay-36-v1','design_ready','[{"runtimeObjectId":"r3inlay36-restoration","semanticRole":"DESIGN · central partial Inlay","editable":true},{"runtimeObjectId":"r3inlay36-adjacent-35","semanticRole":"SOURCE · adjacent tooth 35","editable":false},{"runtimeObjectId":"r3inlay36-antagonist-26","semanticRole":"SOURCE · antagonist 26","editable":false}]'::jsonb),
  ('onlay_coverage_margin','restorative-case','onlay','r3-onlay-26-v1','design_ready','[{"runtimeObjectId":"r3onlay26-preparation","semanticRole":"SOURCE · broad cuspal preparation 26","editable":false},{"runtimeObjectId":"r3onlay26-restoration","semanticRole":"DESIGN · broad partial Onlay","editable":true}]'::jsonb),
  ('onlay_design_review','restorative-case','onlay','r3-onlay-26-v1','design_ready','[{"runtimeObjectId":"r3onlay26-restoration","semanticRole":"DESIGN · broad partial Onlay","editable":true},{"runtimeObjectId":"r3onlay26-adjacent-25","semanticRole":"SOURCE · adjacent tooth 25","editable":false},{"runtimeObjectId":"r3onlay26-antagonist-36","semanticRole":"SOURCE · antagonist 36","editable":false}]'::jsonb),
  ('veneer_preparation_reference','restorative-case','veneer','r3-veneer-21-v1','reference_review','[{"runtimeObjectId":"r3veneer21-preparation","semanticRole":"SOURCE · anterior preparation 21","editable":false},{"runtimeObjectId":"r3veneer21-reference","semanticRole":"REFERENCE · intact pre-op 21","editable":false},{"runtimeObjectId":"r3veneer21-adjacent-22","semanticRole":"SOURCE · adjacent tooth 22","editable":false}]'::jsonb),
  ('veneer_position_thickness','restorative-case','veneer','r3-veneer-21-v1','design_ready','[{"runtimeObjectId":"r3veneer21-restoration","semanticRole":"DESIGN · thin facial shell","editable":true},{"runtimeObjectId":"r3veneer21-reference","semanticRole":"REFERENCE · intact pre-op 21","editable":false}]'::jsonb)
)
update public.practice_lessons lesson
set case_setup = jsonb_build_object(
  'source', setup.source_name,
  'restorationType', setup.restoration_type,
  'casePackageId', setup.package_id,
  'checkpointId', setup.checkpoint_id,
  'objectMappings', setup.mappings
)
from r3_setup setup
where lesson.slug = setup.lesson_slug;

update public.practice_modules
set summary_en = 'Fixed prosthetics exercises use source-attributed anatomy and synthetic private training cases in the shared CAD workspace.',
    summary_sr = 'Vežbe fiksne protetike koriste anatomiju sa atribucijom izvora i sintetičke privatne trenažne slučajeve u zajedničkom CAD prostoru.'
where slug in ('crown_workflow','bridge_workflow','inlay_onlay_workflow','veneer_workflow');

update public.practice_lessons set
  title_en='Full Bridge Case · teeth 24–26', title_sr='Kompletan slučaj mosta · zubi 24–26',
  summary_en='Complete the connected two-abutment Bridge with a tooth 25 pontic and two connectors.', summary_sr='Završite povezani most sa dva nosača, međučlanom 25 i dve spojnice.',
  goal_en='Review both source preparations, preserve unit semantics and inspect the shared design checks.', goal_sr='Pregledajte obe izvorne preparacije, sačuvajte semantiku jedinica i proverite zajedničke Design Check provere.'
where slug='bridge_full_case';
update public.practice_lessons set
  title_en='Inlay Margin and Insertion · tooth 36', title_sr='Inlay margina i insercija · zub 36',
  summary_en='Inspect the intracoronal preparation and adapt the distinct central Inlay proposal.', summary_sr='Pregledajte intrakoronalnu preparaciju i prilagodite zaseban centralni predlog Inlay-a.',
  goal_en='Review the margin, insertion guide and limited intracoronal coverage.', goal_sr='Pregledajte marginu, vodič insercije i ograničenu intrakoronalnu pokrivenost.'
where slug='inlay_margin_insertion';
update public.practice_lessons set
  title_en='Onlay Coverage and Margin · tooth 26', title_sr='Onlay pokrivenost i margina · zub 26',
  summary_en='Inspect broad cusp coverage and distinguish this Onlay from the central Inlay case.', summary_sr='Pregledajte široku pokrivenost kvržica i razlikujte ovaj Onlay od centralnog slučaja Inlay-a.',
  goal_en='Adapt a source-derived preparation and broader partial-coverage proposal.', goal_sr='Prilagodite preparaciju izvedenu iz izvora i širi predlog parcijalne pokrivenosti.'
where slug='onlay_coverage_margin';
update public.practice_lessons set
  title_en='Anterior Preparation and Reference · tooth 21', title_sr='Prednja preparacija i referenca · zub 21',
  summary_en='Inspect the prepared anterior source tooth and its intact pre-op reference.', summary_sr='Pregledajte preparisani prednji izvorni zub i njegovu intaktnu preoperativnu referencu.',
  goal_en='Understand the shell target before adapting facial and incisal contours.', goal_sr='Razumite cilj ljuske pre prilagođavanja facijalnih i incizalnih kontura.'
where slug='veneer_preparation_reference';

with selected_lessons(slug) as (values
  ('margin'),('insertion_path'),('placement'),('contacts'),('sculpt'),('thickness'),('full_crown_case'),
  ('bridge_units'),('bridge_pontic_connectors'),('bridge_contacts_thickness'),('bridge_full_case'),
  ('inlay_margin_insertion'),('inlay_contact_thickness'),('onlay_coverage_margin'),('onlay_design_review'),
  ('veneer_preparation_reference'),('veneer_position_thickness')
), id_map(old_id,new_id) as (values
  ('crown26-preparation','r3c26-preparation'),('crown26-restoration','r3c26-restoration'),('crown26-reference','r3c26-reference'),('crown26-adjacent-25','r3c26-adjacent-25'),('crown26-antagonist-36','r3c26-antagonist-36'),
  ('restorative-bridge-preparation-14','r3bridge246-preparation-24'),('restorative-bridge-preparation-16','r3bridge246-preparation-26'),('restorative-bridge-bridge','r3bridge246-bridge-design'),('restorative-bridge-adjacent-13','r3bridge246-adjacent-27'),('restorative-bridge-antagonist-44','r3bridge246-antagonist-36'),
  ('restorative-inlay-preparation-36','r3inlay36-preparation'),('restorative-inlay-restoration-36','r3inlay36-restoration'),('restorative-inlay-adjacent-35','r3inlay36-adjacent-35'),('restorative-inlay-antagonist-26','r3inlay36-antagonist-26'),
  ('restorative-onlay-preparation-46','r3onlay26-preparation'),('restorative-onlay-restoration-46','r3onlay26-restoration'),('restorative-onlay-adjacent-45','r3onlay26-adjacent-25'),('restorative-onlay-antagonist-16','r3onlay26-antagonist-36'),
  ('restorative-veneer-preparation-11','r3veneer21-preparation'),('restorative-veneer-restoration-11','r3veneer21-restoration'),('restorative-veneer-reference-11','r3veneer21-reference'),('restorative-veneer-antagonist-41','r3veneer21-antagonist-31')
)
update public.practice_steps step
set target_object_ids = array(
  select coalesce(map.new_id, target.object_id)
  from unnest(step.target_object_ids) as target(object_id)
  left join id_map map on map.old_id = target.object_id
)
from public.practice_lessons lesson
where lesson.id = step.lesson_id and lesson.slug in (select slug from selected_lessons);

create or replace function pg_temp.r3_rebind_json(input_value jsonb) returns jsonb language plpgsql as $$
declare result jsonb; item record; text_value text;
begin
  if jsonb_typeof(input_value) = 'object' then
    select coalesce(jsonb_object_agg(key, pg_temp.r3_rebind_json(val)), '{}'::jsonb) into result from jsonb_each(input_value) as entry(key,val);
    return result;
  elsif jsonb_typeof(input_value) = 'array' then
    select coalesce(jsonb_agg(pg_temp.r3_rebind_json(element)), '[]'::jsonb) into result from jsonb_array_elements(input_value) as entry(element);
    return result;
  elsif jsonb_typeof(input_value) = 'string' then
    text_value := input_value #>> '{}';
    for item in select * from (values
      ('crown26-preparation','r3c26-preparation'),('crown26-restoration','r3c26-restoration'),('crown26-reference','r3c26-reference'),('crown26-adjacent-25','r3c26-adjacent-25'),('crown26-antagonist-36','r3c26-antagonist-36'),
      ('restorative-bridge-preparation-14','r3bridge246-preparation-24'),('restorative-bridge-preparation-16','r3bridge246-preparation-26'),('restorative-bridge-bridge','r3bridge246-bridge-design'),('restorative-bridge-adjacent-13','r3bridge246-adjacent-27'),('restorative-bridge-antagonist-44','r3bridge246-antagonist-36'),
      ('restorative-inlay-preparation-36','r3inlay36-preparation'),('restorative-inlay-restoration-36','r3inlay36-restoration'),('restorative-inlay-adjacent-35','r3inlay36-adjacent-35'),('restorative-inlay-antagonist-26','r3inlay36-antagonist-26'),
      ('restorative-onlay-preparation-46','r3onlay26-preparation'),('restorative-onlay-restoration-46','r3onlay26-restoration'),('restorative-onlay-adjacent-45','r3onlay26-adjacent-25'),('restorative-onlay-antagonist-16','r3onlay26-antagonist-36'),
      ('restorative-veneer-preparation-11','r3veneer21-preparation'),('restorative-veneer-restoration-11','r3veneer21-restoration'),('restorative-veneer-reference-11','r3veneer21-reference'),('restorative-veneer-antagonist-41','r3veneer21-antagonist-31')
    ) as mappings(old_id,new_id) loop
      text_value := replace(text_value, item.old_id, item.new_id);
    end loop;
    return to_jsonb(text_value);
  end if;
  return input_value;
end $$;

update public.validation_configs config
set config = pg_temp.r3_rebind_json(config.config)
from public.practice_step_validations validation
join public.practice_steps step on step.id=validation.step_id
join public.practice_lessons lesson on lesson.id=step.lesson_id
where validation.validation_config_id=config.id and lesson.slug in (
  'margin','insertion_path','placement','contacts','sculpt','thickness','full_crown_case',
  'bridge_units','bridge_pontic_connectors','bridge_contacts_thickness','bridge_full_case',
  'inlay_margin_insertion','inlay_contact_thickness','onlay_coverage_margin','onlay_design_review',
  'veneer_preparation_reference','veneer_position_thickness'
);

update public.practice_steps step
set reference_config = pg_temp.r3_rebind_json(step.reference_config)
from public.practice_lessons lesson
where lesson.id=step.lesson_id and lesson.slug in (
  'margin','insertion_path','placement','contacts','sculpt','thickness','full_crown_case',
  'bridge_units','bridge_pontic_connectors','bridge_contacts_thickness','bridge_full_case',
  'inlay_margin_insertion','inlay_contact_thickness','onlay_coverage_margin','onlay_design_review',
  'veneer_preparation_reference','veneer_position_thickness'
);

with guidance(lesson_slug,step_slug,targets,instruction_en,instruction_sr,theory_en,theory_sr) as (values
  ('margin','draw_margin',array['r3c26-preparation'],
   'WHAT: Trace the preparation boundary. WHY: The margin guides the restoration outline. OBJECT: SOURCE · Prepared tooth 26. TOOL: Margin Line. ACTION: Select the preparation, place points on its cervical edge, then close the curve. TARGET: A closed curve attached to the preparation. CHECK: Run Design Check and confirm the margin result.',
   'ŠTA: Iscrtajte granicu preparacije. ZAŠTO: Margina vodi obris nadoknade. OBJEKAT: SOURCE · Preparisani zub 26. ALAT: Margin Line. RADNJA: Izaberite preparaciju, postavite tačke na njen cervikalni rub i zatvorite krivu. CILJ: Zatvorena kriva povezana sa preparacijom. PROVERA: Pokrenite Design Check i potvrdite rezultat margine.',
   'The starter is a source-derived private training preparation. Source units and clinical preparation validity are not established.', 'Početni objekat je privatna trenažna preparacija izvedena iz izvora. Izvorne jedinice i klinička ispravnost preparacije nisu utvrđene.'),
  ('insertion_path','directional_preview',array['r3c26-preparation'],
   'WHAT: Review an insertion direction. WHY: A common direction helps interpret surfaces around the preparation. OBJECT: SOURCE · Prepared tooth 26. TOOL: Insertion Path analysis. ACTION: Select the preparation, choose an axis and run Preview Path. TARGET: A current directional preview. CHECK: Orbit the tooth and compare the colored regions; this is not a clinical undercut result.',
   'ŠTA: Pregledajte smer insercije. ZAŠTO: Zajednički smer pomaže u tumačenju površina oko preparacije. OBJEKAT: SOURCE · Preparisani zub 26. ALAT: Insertion Path analiza. RADNJA: Izaberite preparaciju, odaberite osu i pokrenite Preview Path. CILJ: Aktuelni smerni prikaz. PROVERA: Orbitirajte zub i uporedite obojene regije; ovo nije klinički rezultat podminiranja.',
   'The insertion preview uses the shared analysis engine and the exercise axis only.', 'Prikaz insercije koristi zajednički mehanizam analize i osu ove vežbe.'),
  ('placement','position_restoration',array['r3c26-preparation','r3c26-restoration'],
   'WHAT: Position the anatomical Crown proposal. WHY: The proposal must be related to the preparation before morphology edits. OBJECT: DESIGN · Crown proposal 26 and SOURCE · preparation 26. TOOL: Select, Move and Rotate. ACTION: Select the Crown and move it from its raised starter position onto the preparation. TARGET: A seated, editable proposal. CHECK: Inspect its cervical edge and compare the reference outline.',
   'ŠTA: Pozicionirajte anatomski predlog krunice. ZAŠTO: Predlog treba povezati sa preparacijom pre izmene morfologije. OBJEKAT: DESIGN · predlog krunice 26 i SOURCE · preparacija 26. ALAT: Select, Move i Rotate. RADNJA: Izaberite krunicu i pomerite je sa podignutog početnog položaja na preparaciju. CILJ: Postavljen predlog koji se može uređivati. PROVERA: Pregledajte cervikalni rub i uporedite obris reference.',
   'The anatomical starter comes from an attributed tooth source and is editable. Position is an exercise state, not an automatic fit.', 'Anatomski početni oblik izveden je iz izvora sa atribucijom i može se uređivati. Položaj je stanje vežbe, ne automatsko naleganje.'),
  ('contacts','adjacent_proximity',array['r3c26-restoration','r3c26-adjacent-25','r3c26-adjacent-27'],
   'WHAT: Inspect proximal relationships. WHY: Neighbor surfaces show where the proposal may be close or separated. OBJECT: DESIGN · Crown 26 and SOURCE · adjacent teeth 25 and 27. TOOL: Analysis · Proximity. ACTION: Run a current pairwise proximity check. TARGET: The result binds to the selected case objects. CHECK: Read the displayed distance and inspect the contact area in the viewport.',
   'ŠTA: Pregledajte proksimalne odnose. ZAŠTO: Površine susednih zuba pokazuju gde predlog može biti blizu ili odvojen. OBJEKAT: DESIGN · krunica 26 i SOURCE · susedni zubi 25 i 27. ALAT: Analysis · Proximity. RADNJA: Pokrenite aktuelnu proveru blizine za parove. CILJ: Rezultat je vezan za objekte slučaja. PROVERA: Pročitajte prikazano rastojanje i pregledajte kontaktno područje u sceni.',
   'Static proximity is a surface measurement for this exercise and does not represent dynamic jaw movement.', 'Statička blizina je merenje površina za ovu vežbu i ne predstavlja dinamičko kretanje vilice.'),
  ('contacts','occlusal_proximity',array['r3c26-restoration','r3c26-antagonist-36'],
   'WHAT: Inspect the opposing relationship. WHY: The antagonist indicates where occlusal clearance is being reviewed. OBJECT: DESIGN · Crown 26 and SOURCE · synthetic antagonist 36. TOOL: Analysis · Proximity. ACTION: Run the check for this object pair and orbit the scene. TARGET: A current result for the proposal and antagonist. CHECK: Confirm which surfaces the viewport highlights; the jaw relation is synthetic.',
   'ŠTA: Pregledajte odnos sa suprotnim zubom. ZAŠTO: Antagonista pokazuje gde se pregleda okluzalni prostor. OBJEKAT: DESIGN · krunica 26 i SOURCE · sintetički antagonist 36. ALAT: Analysis · Proximity. RADNJA: Pokrenite proveru za ovaj par i orbitirajte scenu. CILJ: Aktuelni rezultat za predlog i antagonistu. PROVERA: Potvrdite koje površine scena ističe; odnos vilica je sintetički.',
   'No patient-specific jaw relationship is represented in this training scene.', 'Ova scena za obuku ne prikazuje odnos vilica konkretnog pacijenta.'),
  ('sculpt','restore_morphology',array['r3c26-restoration','r3c26-reference'],
   'WHAT: Refine the Crown surface form. WHY: Cusps, grooves and marginal ridges define the exercise morphology. OBJECT: DESIGN · Crown 26; compare REFERENCE · intact tooth 26. TOOL: Sculpt Add, Remove, Smooth, Flatten, Morph and Groove. ACTION: Make small edits on the occlusal and buccal/lingual contours. TARGET: A readable proposal with preserved overall tooth context. CHECK: Toggle the reference and inspect each edited region.',
   'ŠTA: Doradite oblik površine krunice. ZAŠTO: Kvržice, brazde i marginalni grebeni određuju morfologiju vežbe. OBJEKAT: DESIGN · krunica 26; uporedite sa REFERENCE · intaktni zub 26. ALAT: Sculpt Add, Remove, Smooth, Flatten, Morph i Groove. RADNJA: Napravite male izmene na okluzalnim i bukalnim/lingvalnim konturama. CILJ: Čitljiv predlog uz očuvan ukupni kontekst zuba. PROVERA: Prikažite/sakrijte referencu i pregledajte izmenjene regije.',
   'Use the intact reference as an anatomical comparison, not as a clinical prescription.', 'Koristite intaktnu referencu za poređenje anatomije, ne kao klinički propis.'),
  ('thickness','section_and_thickness',array['r3c26-restoration'],
   'WHAT: Inspect the near-final Crown section and thickness. WHY: A section reveals local form that is difficult to judge from the outside. OBJECT: DESIGN · near-final Crown 26. TOOL: Section and Thickness analysis. ACTION: Place a section plane and run thickness on the design. TARGET: A current result that can be interpreted against the displayed exercise target. CHECK: Confirm the analysis is bound to the Crown and review unavailable samples honestly.',
   'ŠTA: Pregledajte presek i debljinu skoro završene krunice. ZAŠTO: Presek otkriva lokalni oblik koji je spolja teško proceniti. OBJEKAT: DESIGN · skoro završena krunica 26. ALAT: Section i Thickness analiza. RADNJA: Postavite ravan preseka i pokrenite debljinu na dizajnu. CILJ: Aktuelni rezultat koji se tumači prema prikazanom cilju vežbe. PROVERA: Potvrdite da je analiza vezana za krunicu i pravilno protumačite nedostupne uzorke.',
   'Numeric values are targets for this exercise, not universal clinical cutoffs.', 'Brojčane vrednosti su ciljevi ove vežbe, ne univerzalni klinički pragovi.'),
  ('full_crown_case','margin_review',array['r3c26-preparation'],
   'WHAT: Start the full Crown case by checking its boundary. WHY: The margin organizes later positioning and morphology review. OBJECT: SOURCE · prepared tooth 26. TOOL: Margin Line and Design Check. ACTION: Inspect the source preparation and trace or edit its closed margin. TARGET: A margin attached to the preparation. CHECK: Run Design Check and inspect the named object in the result.',
   'ŠTA: Započnite kompletan slučaj krunice proverom granice. ZAŠTO: Margina organizuje kasniji položaj i pregled morfologije. OBJEKAT: SOURCE · preparisani zub 26. ALAT: Margin Line i Design Check. RADNJA: Pregledajte izvornu preparaciju i iscrtajte ili izmenite njenu zatvorenu marginu. CILJ: Margina povezana sa preparacijom. PROVERA: Pokrenite Design Check i pregledajte imenovani objekat u rezultatu.',
   'The source preparation remains locked while the Crown design stays editable.', 'Izvorna preparacija ostaje zaključana, a dizajn krunice može da se menja.'),
  ('full_crown_case','placement_and_path',array['r3c26-preparation','r3c26-restoration'],
   'WHAT: Position the anatomical proposal and inspect its path. WHY: Placement and insertion direction are separate review questions. OBJECT: DESIGN · Crown 26 and SOURCE · preparation 26. TOOL: Move, Rotate and Insertion Path. ACTION: Seat the proposal, choose an axis and run the preview. TARGET: A positioned design and current directional analysis. CHECK: Inspect the margin and the highlighted preparation surfaces.',
   'ŠTA: Pozicionirajte anatomski predlog i pregledajte putanju. ZAŠTO: Položaj i smer insercije su odvojena pitanja pregleda. OBJEKAT: DESIGN · krunica 26 i SOURCE · preparacija 26. ALAT: Move, Rotate i Insertion Path. RADNJA: Postavite predlog, izaberite osu i pokrenite prikaz. CILJ: Pozicioniran dizajn i aktuelna smerna analiza. PROVERA: Pregledajte marginu i istaknute površine preparacije.',
   'The direction preview is an educational geometric check only.', 'Smerni prikaz je samo edukativna geometrijska provera.'),
  ('full_crown_case','proximal_and_occlusal_review',array['r3c26-restoration','r3c26-adjacent-25','r3c26-adjacent-27','r3c26-antagonist-36'],
   'WHAT: Check proximal and opposing surfaces. WHY: These comparisons expose close regions for further adaptation. OBJECT: DESIGN · Crown 26, SOURCE · teeth 25/27 and synthetic antagonist 36. TOOL: Proximity analysis. ACTION: Run separate checks for neighbor pairs and for the antagonist. TARGET: Current results attached to the correct pairs. CHECK: Read the measured distances and inspect the highlighted locations.',
   'ŠTA: Proverite proksimalne i suprotne površine. ZAŠTO: Poređenja otkrivaju bliske regije za dalje prilagođavanje. OBJEKAT: DESIGN · krunica 26, SOURCE · zubi 25/27 i sintetički antagonist 36. ALAT: Proximity analiza. RADNJA: Pokrenite odvojene provere prema susedima i antagonisti. CILJ: Aktuelni rezultati vezani za ispravne parove. PROVERA: Pročitajte rastojanja i pregledajte istaknuta mesta.',
   'The opposing segment uses a synthetic educational relation.', 'Suprotni segment koristi sintetički edukativni odnos.'),
  ('full_crown_case','sculpt_and_thickness',array['r3c26-restoration'],
   'WHAT: Refine anatomy and inspect the section. WHY: Surface sculpting and internal review reveal different issues. OBJECT: DESIGN · Crown 26. TOOL: Sculpt, Section and Thickness. ACTION: Smooth or reshape selected anatomy, then run both inspections. TARGET: Current geometry and analysis results. CHECK: Review cusp and groove form, section and thickness samples; values are targets for this exercise.',
   'ŠTA: Doradite anatomiju i pregledajte presek. ZAŠTO: Sculpt i unutrašnji pregled otkrivaju različite probleme. OBJEKAT: DESIGN · krunica 26. ALAT: Sculpt, Section i Thickness. RADNJA: Zagladite ili preoblikujte izabranu anatomiju, pa pokrenite obe provere. CILJ: Aktuelna geometrija i rezultati analize. PROVERA: Pregledajte kvržice i brazde, presek i uzorke debljine; vrednosti su ciljevi ove vežbe.',
   'No result is a clinical acceptance or manufacturing-readiness decision.', 'Nijedan rezultat nije klinička potvrda niti odluka o spremnosti za proizvodnju.'),
  ('bridge_units','bridge_setup',array['r3bridge246-preparation-24','r3bridge246-preparation-26','r3bridge246-bridge-design'],
   'WHAT: Inspect the two abutments and their margins. WHY: The connected Bridge needs two source preparations and a common direction. OBJECT: SOURCE · prepared 24/26; DESIGN · Bridge units. TOOL: Margin Line, Scene and Insertion Path. ACTION: Inspect each preparation and review both margin guides. TARGET: Two distinct abutment identities. CHECK: Confirm each margin curve belongs to its own preparation.',
   'ŠTA: Pregledajte dva nosača i njihove margine. ZAŠTO: Povezani most zahteva dve izvorne preparacije i zajednički smer. OBJEKAT: SOURCE · preparacije 24/26; DESIGN · jedinice mosta. ALAT: Margin Line, Scene i Insertion Path. RADNJA: Pregledajte svaku preparaciju i oba vodiča margine. CILJ: Dva zasebna identiteta nosača. PROVERA: Potvrdite da je svaka kriva margine vezana za svoju preparaciju.',
   'Bridge units are one editable output with separate abutment, pontic and connector identities.', 'Jedinice mosta čine jedan izlaz koji se može menjati sa zasebnim identitetima nosača, međučlana i spojnica.'),
  ('bridge_pontic_connectors','pontic_connector_review',array['r3bridge246-bridge-design','r3bridge246-gingiva'],
   'WHAT: Review pontic form, connectors and support. WHY: Unit relationships explain how the three-unit design spans tooth 25. OBJECT: DESIGN · connected Bridge and SOURCE · local synthetic support. TOOL: Scene, Select and Move. ACTION: Select the bridge and inspect its named GLB members and pontic/support gap. TARGET: Two abutments, one pontic and two connectors remain identifiable. CHECK: Confirm the single mesh object retains all five unit IDs.',
   'ŠTA: Pregledajte oblik međučlana, spojnice i potporu. ZAŠTO: Odnosi jedinica objašnjavaju kako most premošćava zub 25. OBJEKAT: DESIGN · povezani most i SOURCE · lokalna sintetička potpora. ALAT: Scene, Select i Move. RADNJA: Izaberite most i pregledajte imenovane GLB članove i razmak međučlana/potpore. CILJ: Prepoznaju se dva nosača, jedan međučlan i dve spojnice. PROVERA: Potvrdite da jedan mesh objekat čuva svih pet ID-jeva jedinica.',
   'Connector shape and pontic/support relation are synthetic exercise geometry, not prescriptions.', 'Oblik spojnica i odnos međučlana/potpore su sintetička geometrija vežbe, ne propisi.'),
  ('bridge_contacts_thickness','bridge_analysis',array['r3bridge246-bridge-design','r3bridge246-adjacent-27','r3bridge246-antagonist-36'],
   'WHAT: Inspect bridge contacts and section thickness. WHY: Neighbor and opposing surfaces expose areas for review. OBJECT: DESIGN · Bridge, SOURCE · tooth 27 and synthetic antagonist 36. TOOL: Proximity, Thickness and Section. ACTION: Run checks for each pair and inspect the connectors in section. TARGET: Current case-bound analysis results. CHECK: Verify the listed object IDs and read values as exercise targets.',
   'ŠTA: Pregledajte kontakte mosta i debljinu preseka. ZAŠTO: Susedne i suprotne površine otkrivaju regije za pregled. OBJEKAT: DESIGN · most, SOURCE · zub 27 i sintetički antagonist 36. ALAT: Proximity, Thickness i Section. RADNJA: Pokrenite provere za svaki par i pregledajte spojnice u preseku. CILJ: Aktuelni rezultati vezani za slučaj. PROVERA: Potvrdite ID-jeve objekata i tumačite vrednosti kao ciljeve vežbe.',
   'Static checks do not simulate jaw motion or establish patient-specific suitability.', 'Statičke provere ne simuliraju kretanje vilice niti utvrđuju podobnost za konkretnog pacijenta.'),
  ('bridge_full_case','bridge_capstone',array['r3bridge246-preparation-24','r3bridge246-preparation-26','r3bridge246-bridge-design'],
   'WHAT: Review the complete Bridge design. WHY: Final review combines abutments, pontic, connectors and static checks. OBJECT: SOURCE · abutments 24/26; DESIGN · connected three-unit Bridge. TOOL: Select, Margin Line, Proximity, Thickness and Design Check. ACTION: Inspect both margins, all unit IDs, pontic support and current analyses. TARGET: Two abutments + one pontic + two connectors. CHECK: Run Design Check and review each named result.',
   'ŠTA: Pregledajte kompletan dizajn mosta. ZAŠTO: Završni pregled objedinjuje nosače, međučlan, spojnice i statičke provere. OBJEKAT: SOURCE · nosači 24/26; DESIGN · povezani tročlani most. ALAT: Select, Margin Line, Proximity, Thickness i Design Check. RADNJA: Pregledajte obe margine, sve ID-jeve jedinica, potporu međučlana i aktuelne analize. CILJ: Dva nosača + jedan međučlan + dve spojnice. PROVERA: Pokrenite Design Check i pregledajte imenovane rezultate.',
   'Connector dimensions are only targets for this exercise.', 'Dimenzije spojnica su samo ciljevi ove vežbe.'),
  ('inlay_margin_insertion','inlay_margin',array['r3inlay36-preparation','r3inlay36-restoration'],
   'WHAT: Review the intracoronal margin and insertion guide. WHY: The limited central design should remain distinct from cuspal coverage. OBJECT: SOURCE · preparation 36; DESIGN · Inlay patch. TOOL: Margin Line, Insertion Path and Select. ACTION: Inspect the seeded margin and adjust it on the preparation. TARGET: A closed boundary and visible central partial proposal. CHECK: Run Design Check and verify the Inlay coverage label.',
   'ŠTA: Pregledajte intrakoronalnu marginu i vodič insercije. ZAŠTO: Ograničeni centralni dizajn treba razlikovati od pokrivenosti kvržica. OBJEKAT: SOURCE · preparacija 36; DESIGN · Inlay ljuska. ALAT: Margin Line, Insertion Path i Select. RADNJA: Pregledajte početnu marginu i izmenite je na preparaciji. CILJ: Zatvorena granica i vidljiv centralni parcijalni predlog. PROVERA: Pokrenite Design Check i proverite oznaku pokrivenosti Inlay-a.',
   'The surface patch is an educational proposal and does not claim internal fit.', 'Površinska ljuska je edukativni predlog i ne tvrdi da predstavlja unutrašnje naleganje.'),
  ('inlay_contact_thickness','inlay_review',array['r3inlay36-restoration','r3inlay36-adjacent-35','r3inlay36-antagonist-26'],
   'WHAT: Adapt the Inlay and inspect its relationships. WHY: The central patch needs review against adjacent and opposing surfaces. OBJECT: DESIGN · Inlay 36; SOURCE · tooth 35 and antagonist 26. TOOL: Move, Sculpt, Proximity, Thickness and Section. ACTION: Make a small surface edit and run the checks. TARGET: Current results for the Inlay pairs. CHECK: Confirm the restoration ID and inspect its central coverage.',
   'ŠTA: Prilagodite Inlay i pregledajte njegove odnose. ZAŠTO: Centralnu ljusku treba uporediti sa susednim i suprotnim površinama. OBJEKAT: DESIGN · Inlay 36; SOURCE · zub 35 i antagonist 26. ALAT: Move, Sculpt, Proximity, Thickness i Section. RADNJA: Napravite malu izmenu površine i pokrenite provere. CILJ: Aktuelni rezultati za parove Inlay-a. PROVERA: Potvrdite ID nadoknade i pregledajte centralnu pokrivenost.',
   'The material and numeric values are exercise targets.', 'Materijal i brojčane vrednosti su ciljevi vežbe.'),
  ('onlay_coverage_margin','onlay_coverage',array['r3onlay26-preparation','r3onlay26-restoration'],
   'WHAT: Inspect the broad cuspal preparation and Onlay proposal. WHY: Onlay coverage extends across selected cusp regions while remaining partial. OBJECT: SOURCE · preparation 26; DESIGN · broad Onlay. TOOL: Scene, Margin Line and Select. ACTION: Compare its wider patch with the central Inlay exercise and inspect the margin. TARGET: Broad partial cuspal coverage, not a full Crown. CHECK: Run Design Check and confirm the coverage metadata.',
   'ŠTA: Pregledajte široku preparaciju kvržica i predlog Onlay-a. ZAŠTO: Onlay pokrivenost prelazi preko izabranih regija kvržica, a ostaje parcijalna. OBJEKAT: SOURCE · preparacija 26; DESIGN · široki Onlay. ALAT: Scene, Margin Line i Select. RADNJA: Uporedite širu ljusku sa centralnom Inlay vežbom i pregledajte marginu. CILJ: Široka parcijalna pokrivenost kvržica, ne puna krunica. PROVERA: Pokrenite Design Check i potvrdite metapodatke pokrivenosti.',
   'Coverage extents and any dimensions are targets for this exercise.', 'Obim pokrivenosti i eventualne dimenzije su ciljevi ove vežbe.'),
  ('onlay_design_review','onlay_review',array['r3onlay26-restoration','r3onlay26-adjacent-25','r3onlay26-antagonist-36'],
   'WHAT: Reconstruct and inspect Onlay anatomy. WHY: Cusp and occlusal form must remain legible across the partial shell. OBJECT: DESIGN · Onlay 26; SOURCE · adjacent tooth 25 and antagonist 36. TOOL: Sculpt, Proximity, Thickness and Section. ACTION: Refine cusp coverage and run the pairwise checks. TARGET: A distinct partial Onlay proposal. CHECK: Inspect the outer extent and current analysis bindings.',
   'ŠTA: Obnovite i pregledajte anatomiju Onlay-a. ZAŠTO: Oblik kvržica i okluzalna forma treba da ostanu jasni na parcijalnoj ljusci. OBJEKAT: DESIGN · Onlay 26; SOURCE · susedni zub 25 i antagonist 36. ALAT: Sculpt, Proximity, Thickness i Section. RADNJA: Doradite pokrivenost kvržica i pokrenite provere parova. CILJ: Zaseban parcijalni predlog Onlay-a. PROVERA: Pregledajte spoljašnji obim i veze aktuelnih analiza.',
   'This broad shell is distinct from both a central Inlay and a full Crown proposal.', 'Ova široka ljuska razlikuje se i od centralnog Inlay-a i od punog predloga krunice.'),
  ('veneer_preparation_reference','veneer_reference',array['r3veneer21-preparation','r3veneer21-reference','r3veneer21-adjacent-22'],
   'WHAT: Inspect the anterior preparation and pre-op reference. WHY: The intact source gives a visual comparison for the facial shell. OBJECT: SOURCE · preparation 21 and neighbor 22; REFERENCE · intact tooth 21. TOOL: Select, Scene and Camera. ACTION: Show the reference, orbit the anterior surfaces and compare their outlines. TARGET: Identify facial, incisal and proximal regions. CHECK: Confirm the reference is an intact source object and the design remains hidden at this checkpoint.',
   'ŠTA: Pregledajte prednju preparaciju i preoperativnu referencu. ZAŠTO: Intaktni izvor daje vizuelno poređenje za facijalnu ljusku. OBJEKAT: SOURCE · preparacija 21 i sused 22; REFERENCE · intaktni zub 21. ALAT: Select, Scene i Camera. RADNJA: Prikažite referencu, orbitirajte prednje površine i uporedite njihove obrise. CILJ: Prepoznajte facijalne, incizalne i proksimalne regije. PROVERA: Potvrdite da je referenca intaktan izvorni objekat i da je dizajn u ovom koraku sakriven.',
   'This case is anterior CAD practice only, not full smile design.', 'Ovaj slučaj je samo prednja CAD vežba, ne potpuni dizajn osmeha.'),
  ('veneer_position_thickness','veneer_design',array['r3veneer21-restoration','r3veneer21-reference','r3veneer21-antagonist-31'],
   'WHAT: Adapt the thin facial shell. WHY: Facial and incisal contours define the visible proposal and proximal relationships. OBJECT: DESIGN · Veneer 21; compare REFERENCE · intact 21 and SOURCE · opposing incisor 31. TOOL: Move, Rotate, Sculpt, Thickness and Section. ACTION: Adjust the shell contour and inspect the incisal and proximal edges. TARGET: A readable thin-shell design for this exercise. CHECK: Review reference deviation and thickness without treating them as clinical acceptance limits.',
   'ŠTA: Prilagodite tanku facijalnu ljusku. ZAŠTO: Facijalne i incizalne konture određuju vidljiv predlog i proksimalne odnose. OBJEKAT: DESIGN · faseta 21; uporedite sa REFERENCE · intaktni 21 i SOURCE · suprotni sekutić 31. ALAT: Move, Rotate, Sculpt, Thickness i Section. RADNJA: Podesite konturu ljuske i pregledajte incizalne i proksimalne ivice. CILJ: Čitljiv dizajn tanke ljuske za ovu vežbu. PROVERA: Pregledajte odstupanje od reference i debljinu bez tumačenja kao kliničke granice prihvatanja.',
   'Shell depth and all numeric limits are targets for this exercise only.', 'Dubina ljuske i sva numerička ograničenja važe samo kao ciljevi ove vežbe.')
)
update public.practice_steps step
set target_object_ids = guidance.targets,
    instructions_en = guidance.instruction_en,
    instructions_sr = guidance.instruction_sr,
    theory_en = guidance.theory_en,
    theory_sr = guidance.theory_sr
from public.practice_lessons lesson, guidance
where lesson.id=step.lesson_id and lesson.slug=guidance.lesson_slug and step.slug=guidance.step_slug;

delete from public.practice_hints hint
using public.practice_steps step, public.practice_lessons lesson
where hint.step_id=step.id and step.lesson_id=lesson.id and lesson.slug in (
  'margin','insertion_path','placement','contacts','sculpt','thickness','full_crown_case',
  'bridge_units','bridge_pontic_connectors','bridge_contacts_thickness','bridge_full_case',
  'inlay_margin_insertion','inlay_contact_thickness','onlay_coverage_margin','onlay_design_review',
  'veneer_preparation_reference','veneer_position_thickness'
);

with r3_scenarios(domain_slug, slug, difficulty, title_en, title_sr, description_en, description_sr, patient_code, indication_en, indication_sr, tooth_numbers, requirements_en, requirements_sr, package_id, checkpoint_id, restoration_type, material_en, material_sr, supplied_en, supplied_sr, notes_en, notes_sr) as (values
  ('crown','r3_crown_26_case','intermediate','Posterior Crown · tooth 26 · R3','Bočna krunica · zub 26 · R3','Private educational posterior Crown case with adjacent teeth, an opposing tooth and an anatomical proposal.','Privatni edukativni slučaj bočne krunice sa susednim zubima, antagonistom i anatomskim predlogom.','PT-EDU-R3-C26','Fictional single posterior Crown exercise for tooth 26.','Izmišljena vežba pojedinačne bočne krunice za zub 26.',array[26]::smallint[],array['Adapt the anatomical Crown proposal','Review proximal and opposing relationships','Inspect section and thickness for this exercise'],array['Prilagodite anatomski predlog krunice','Pregledajte proksimalne i suprotne odnose','Pregledajte presek i debljinu za ovu vežbu'],'r3-crown-26-v1','proposal_ready','crown','Ivory ceramic training preset','Trenažni preset keramike boje slonovače',array['Prepared source tooth 26','Adjacent teeth 25 and 27','Synthetic opposing tooth 36','Local synthetic gingiva/support','Intact tooth reference'],array['Preparisani izvorni zub 26','Susedni zubi 25 i 27','Sintetički suprotni zub 36','Lokalna sintetička gingiva/potpora','Referenca intaktnog zuba'], 'Synthetic private educational case. Source units and patient provenance are unknown; exercise targets are not clinical recommendations.','Sintetički privatni edukativni slučaj. Izvorne jedinice i poreklo podataka pacijenta nisu poznati; ciljevi vežbe nisu kliničke preporuke.'),
  ('crown','r3_crown_36_case','advanced','Mandibular Crown · tooth 36 · R3','Mandibularna krunica · zub 36 · R3','Distinct lower first-molar package with an upper antagonist and source-derived anatomy.','Zaseban paket donjeg prvog molara sa gornjim antagonistom i anatomijom izvedenom iz izvora.','PT-EDU-R3-C36','Fictional single mandibular posterior Crown exercise for tooth 36.','Izmišljena vežba pojedinačne mandibularne bočne krunice za zub 36.',array[36]::smallint[],array['Adapt the anatomical proposal to the preparation','Review proximal and opposing relationships','Run the available exercise checks'],array['Prilagodite anatomski predlog preparaciji','Pregledajte proksimalne i suprotne odnose','Pokrenite dostupne provere za vežbu'],'r3-crown-36-v1','proposal_ready','crown','Ivory ceramic training preset','Trenažni preset keramike boje slonovače',array['Prepared source tooth 36','Neighboring teeth 34 and 35','Synthetic opposing tooth 26','Local synthetic gingiva/support','Intact tooth reference'],array['Preparisani izvorni zub 36','Susedni zubi 34 i 35','Sintetički suprotni zub 26','Lokalna sintetička gingiva/potpora','Referenca intaktnog zuba'], 'Fictional private training order, not a patient record or patient-specific jaw relation.','Izmišljeni privatni trenažni nalog, nije zapis pacijenta niti odnos vilica konkretnog pacijenta.'),
  ('bridge','r3_bridge_24_26_case','advanced','Three-unit Bridge · teeth 24–26 · R3','Most od tri jedinice · zubi 24–26 · R3','Two abutments flank a tooth 25 pontic site; the connected design retains unit and connector semantics.','Dva nosača okružuju mesto međučlana 25; povezani dizajn čuva semantiku jedinica i spojnica.','PT-EDU-R3-B246','Fictional three-unit Bridge exercise replacing tooth 25.','Izmišljena vežba mosta od tri jedinice za nadoknadu zuba 25.',array[24,25,26]::smallint[],array['Review two margins and common insertion path','Preserve two abutments, pontic and connectors','Review pontic support, contacts, occlusion and thickness'],array['Pregledajte dve margine i zajednički put insercije','Sačuvajte dva nosača, međučlan i spojnice','Pregledajte potporu međučlana, kontakte, okluziju i debljinu'],'r3-bridge-24-26-v1','proposal_ready','bridge','Ivory ceramic training preset','Trenažni preset keramike boje slonovače',array['Prepared abutments 24 and 26','Pontic site 25','Neighbor 27','Synthetic antagonist 36','Synthetic local support and anatomy references'],array['Preparisani nosači 24 i 26','Mesto međučlana 25','Susedni zub 27','Sintetički antagonist 36','Sintetička lokalna potpora i anatomske reference'],'Connector and pontic/support geometry is synthetic exercise geometry, not a clinical prescription.','Geometrija spojnica i međučlana/potpore je sintetička geometrija vežbe, ne klinički propis.'),
  ('inlay_onlay','r3_inlay_36_case','beginner','Posterior Inlay · tooth 36 · R3','Bočni Inlay · zub 36 · R3','Intracoronal preparation with a central partial restoration proposal.','Intrakoronalna preparacija sa predlogom centralne parcijalne nadoknade.','PT-EDU-R3-I36','Fictional posterior intracoronal Inlay exercise for tooth 36.','Izmišljena vežba bočnog intrakoronalnog Inlay-a za zub 36.',array[36]::smallint[],array['Inspect central partial coverage','Adapt the Inlay surface and proximal relation','Review insertion, antagonist and section'],array['Pregledajte centralnu parcijalnu pokrivenost','Prilagodite površinu Inlay-a i proksimalni odnos','Pregledajte inserciju, antagonistu i presek'],'r3-inlay-36-v1','proposal_ready','inlay','Warm ceramic training preset','Trenažni preset keramike toplog tona',array['Intracoronal preparation 36','Adjacent teeth 34 and 35','Synthetic antagonist 26','Synthetic local support and intact reference'],array['Intrakoronalna preparacija 36','Susedni zubi 34 i 35','Sintetički antagonist 26','Sintetička lokalna potpora i intaktna referenca'],'The central surface patch is a training proposal, not a verified internal fit.','Centralna površinska ljuska je trenažni predlog, a ne potvrđeno unutrašnje naleganje.'),
  ('inlay_onlay','r3_onlay_26_case','intermediate','Partial-cuspal Onlay · tooth 26 · R3','Onlay sa delimičnom pokrivenošću kvržica · zub 26 · R3','Broad cuspal preparation supports a partial-coverage Onlay distinct from the Inlay case.','Šira preparacija kvržica podržava parcijalni Onlay različit od slučaja Inlay-a.','PT-EDU-R3-O26','Fictional partial-cuspal-coverage Onlay exercise for tooth 26.','Izmišljena vežba Onlay-a sa delimičnom pokrivenošću kvržica za zub 26.',array[26]::smallint[],array['Review broader cusp coverage','Reconstruct occlusal form with Sculpt','Check proximal, opposing and thickness relations'],array['Pregledajte širu pokrivenost kvržica','Obnovite okluzalni oblik Sculpt alatom','Proverite proksimalne, suprotne odnose i debljinu'],'r3-onlay-26-v1','proposal_ready','onlay','Ivory ceramic training preset','Trenažni preset keramike boje slonovače',array['Broad cuspal preparation 26','Adjacent teeth 25 and 27','Synthetic antagonist 36','Synthetic local support and intact reference'],array['Šira preparacija kvržica 26','Susedni zubi 25 i 27','Sintetički antagonist 36','Sintetička lokalna potpora i intaktna referenca'],'Coverage is an educational distinction; numeric targets are for this exercise only.','Pokrivenost je edukativna razlika; numerički ciljevi važe samo za ovu vežbu.'),
  ('veneer','r3_veneer_21_case','intermediate','Anterior Veneer · tooth 21 · R3','Prednja faseta · zub 21 · R3','Thin facial-shell proposal with neighboring anatomy, opposing incisors and intact pre-op reference.','Predlog tanke facijalne ljuske sa susednom anatomijom, suprotnim sekutićima i intaktnom preoperativnom referencom.','PT-EDU-R3-V21','Fictional single anterior facial-shell Veneer exercise for tooth 21.','Izmišljena vežba pojedinačne prednje fasetne ljuske za zub 21.',array[21]::smallint[],array['Compare the shell with the pre-op reference','Adapt facial and incisal contours','Review proximal relation and exercise thickness'],array['Uporedite ljusku sa preoperativnom referencom','Prilagodite facijalne i incizalne konture','Pregledajte proksimalni odnos i debljinu vežbe'],'r3-veneer-21-v1','proposal_ready','veneer','Translucent ivory training preset','Trenažni preset prozirne slonovače',array['Prepared anterior tooth 21','Adjacent tooth 22','Synthetic opposing incisors 31 and 32','Synthetic local support and intact pre-op reference'],array['Preparisani prednji zub 21','Susedni zub 22','Sintetički suprotni sekutići 31 i 32','Sintetička lokalna potpora i intaktna preoperativna referenca'],'Educational veneer CAD only; not full smile design or a patient-specific treatment plan.','Samo edukativni CAD fasete; nije potpuni dizajn osmeha niti plan terapije za konkretnog pacijenta.')
)
insert into public.scenarios(domain_id,slug,difficulty,title_en,title_sr,description_en,description_sr,patient_code,patient_age,indication_en,indication_sr,tooth_numbers,requirements_en,requirements_sr,additional_metadata,random_eligible,status,published_at)
select domain.id, seed.slug, seed.difficulty::public.difficulty_level, seed.title_en, seed.title_sr, seed.description_en, seed.description_sr, seed.patient_code, null,
  seed.indication_en, seed.indication_sr, seed.tooth_numbers, seed.requirements_en, seed.requirements_sr,
  jsonb_build_object('casePackageId',seed.package_id,'startingCheckpointId',seed.checkpoint_id,'restorationType',seed.restoration_type,'materialPreset','r3-private-training','material',jsonb_build_object('en',seed.material_en,'sr',seed.material_sr),'supplied',jsonb_build_object('en',seed.supplied_en,'sr',seed.supplied_sr),'notes',jsonb_build_object('en',seed.notes_en,'sr',seed.notes_sr),'privateTrainingScope','PRIVATE EDUCATIONAL V1 ONLY'),
  true,'published',now()
from r3_scenarios seed join public.content_domains domain on domain.slug=seed.domain_slug
on conflict (slug) do update set
  difficulty=excluded.difficulty,title_en=excluded.title_en,title_sr=excluded.title_sr,description_en=excluded.description_en,description_sr=excluded.description_sr,
  patient_code=excluded.patient_code,patient_age=null,indication_en=excluded.indication_en,indication_sr=excluded.indication_sr,tooth_numbers=excluded.tooth_numbers,
  requirements_en=excluded.requirements_en,requirements_sr=excluded.requirements_sr,additional_metadata=excluded.additional_metadata,
  random_eligible=true,status='published',published_at=coalesce(scenarios.published_at,excluded.published_at);

-- The local private package route serves authenticated GLBs. No asset is uploaded
-- to Supabase Storage by this migration.
