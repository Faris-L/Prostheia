-- Initial bilingual registries from DB.md. IDs/slugs are stable app contracts.
insert into public.content_domains (slug, name_en, name_sr, description_en, description_sr, sort_order, status)
values
  ('cad_foundations', 'CAD Foundations', 'Osnove CAD-a', 'Navigation and core digital CAD concepts.', 'Navigacija i osnovni pojmovi digitalnog CAD-a.', 10, 'published'),
  ('scan_model', 'Scan and Model Preparation', 'Priprema skena i modela', 'Prepare and inspect dental scans and models.', 'Priprema i pregled dentalnih skenova i modela.', 20, 'published'),
  ('sculpting', 'Sculpting', 'Modelovanje', 'Digital sculpting tools and anatomy practice.', 'Alati za digitalno modelovanje i vežbanje anatomije.', 30, 'published'),
  ('crown', 'Crown', 'Krunica', 'Single-unit crown design concepts.', 'Osnove dizajna pojedinačne krunice.', 40, 'published'),
  ('bridge', 'Bridge', 'Most', 'Multi-unit bridge design concepts.', 'Osnove dizajna višečlanih mostova.', 50, 'published'),
  ('inlay_onlay', 'Inlay and Onlay', 'Inlej i onlej', 'Inlay and onlay design concepts.', 'Osnove dizajna inleja i onleja.', 60, 'published'),
  ('veneer', 'Veneer', 'Faseta', 'Veneer design concepts.', 'Osnove dizajna faseta.', 70, 'published'),
  ('complete_denture', 'Complete Denture', 'Totalna proteza', 'Complete denture setup and design concepts.', 'Postavka i dizajn totalne proteze.', 80, 'published'),
  ('partial_denture', 'Partial Denture', 'Parcijalna proteza', 'Removable partial denture concepts.', 'Osnove skeletirane parcijalne proteze.', 90, 'published'),
  ('bite_splint', 'Bite Splint', 'Okluzalna udlaga', 'Bite splint design concepts.', 'Osnove dizajna okluzalne udlage.', 100, 'published'),
  ('digital_model', 'Digital Model', 'Digitalni model', 'Digital model preparation concepts.', 'Osnove pripreme digitalnog modela.', 110, 'published'),
  ('implant', 'Implant', 'Implant', 'Educational implant restoration concepts.', 'Edukativne osnove implantoloških nadoknada.', 120, 'published')
on conflict (slug) do update set name_en = excluded.name_en, name_sr = excluded.name_sr,
  description_en = excluded.description_en, description_sr = excluded.description_sr,
  sort_order = excluded.sort_order, status = excluded.status;

insert into public.skills (slug, name_en, name_sr, description_en, description_sr, sort_order, status)
values
  ('cad_navigation', 'CAD Navigation', 'CAD navigacija', 'Navigate a 3D CAD workspace.', 'Kretanje kroz 3D CAD radni prostor.', 10, 'published'),
  ('object_manipulation', 'Object Manipulation', 'Manipulacija objektima', 'Select and transform scene objects.', 'Izbor i transformacija objekata u sceni.', 20, 'published'),
  ('scan_preparation', 'Scan Preparation', 'Priprema skena', 'Inspect and prepare scan geometry.', 'Pregled i priprema geometrije skena.', 30, 'published'),
  ('sculpting', 'Sculpting', 'Modelovanje', 'Modify mesh form with sculpt tools.', 'Izmena oblika mreže alatima za modelovanje.', 40, 'published'),
  ('margin_design', 'Margin Design', 'Dizajn granice preparacije', 'Identify and review restoration margins.', 'Prepoznavanje i pregled granice preparacije.', 50, 'published'),
  ('insertion_path', 'Insertion Path', 'Put insercije', 'Inspect a restoration insertion direction.', 'Pregled pravca postavljanja nadoknade.', 60, 'published'),
  ('contact_analysis', 'Contact Analysis', 'Analiza kontakata', 'Review proximal and geometric contacts.', 'Pregled aproksimalnih i geometrijskih kontakata.', 70, 'published'),
  ('occlusion', 'Occlusion', 'Okluzija', 'Review occlusal relationships in exercises.', 'Pregled okluzalnih odnosa u vežbama.', 80, 'published'),
  ('crown_design', 'Crown Design', 'Dizajn krunice', 'Practice crown design workflows.', 'Vežbanje postupka dizajna krunice.', 90, 'published'),
  ('bridge_design', 'Bridge Design', 'Dizajn mosta', 'Practice bridge design workflows.', 'Vežbanje postupka dizajna mosta.', 100, 'published'),
  ('complete_denture', 'Complete Denture', 'Totalna proteza', 'Practice complete denture setup.', 'Vežbanje postavke totalne proteze.', 110, 'published'),
  ('partial_denture', 'Partial Denture', 'Parcijalna proteza', 'Practice partial denture concepts.', 'Vežbanje osnova parcijalne proteze.', 120, 'published'),
  ('surveying', 'Surveying', 'Paralelometrija', 'Inspect insertion direction and undercuts.', 'Pregled pravca insercije i podminiranih zona.', 130, 'published'),
  ('splints', 'Splints', 'Udlage', 'Practice bite splint design concepts.', 'Vežbanje osnova dizajna udlage.', 140, 'published'),
  ('digital_models', 'Digital Models', 'Digitalni modeli', 'Prepare digital dental models.', 'Priprema digitalnih dentalnih modela.', 150, 'published'),
  ('implant_design', 'Implant Design', 'Dizajn implantološke nadoknade', 'Explore implant restoration concepts for education.', 'Edukativno upoznavanje sa dizajnom implantoloških nadoknada.', 160, 'published')
on conflict (slug) do update set name_en = excluded.name_en, name_sr = excluded.name_sr,
  description_en = excluded.description_en, description_sr = excluded.description_sr,
  sort_order = excluded.sort_order, status = excluded.status;

insert into public.tool_definitions (id, category, label_en, label_sr, short_description_en, short_description_sr, explanation_en, explanation_sr, why_it_matters_en, why_it_matters_sr, status)
values
  ('select','scene','Select','Izbor','Select scene objects.','Izaberite objekte u sceni.','Selects one or more workspace objects.','Bira jedan ili više objekata u radnom prostoru.','Tools act on the intended object.','Alati deluju na izabrani objekat.','published'),
  ('orbit','navigation','Orbit','Rotacija pogleda','Rotate the view around the scene.','Rotirajte pogled oko scene.','Changes the camera angle around the scene.','Menja ugao kamere oko scene.','Inspect geometry from different angles.','Pregledajte geometriju iz različitih uglova.','published'),
  ('pan','navigation','Pan','Pomeri pogled','Move the camera view sideways.','Pomerite pogled kamere.','Moves the view without changing its direction.','Pomeranje pogleda bez promene pravca gledanja.','Keep the area of interest in view.','Zadržite željenu oblast u kadru.','published'),
  ('zoom','navigation','Zoom','Zumiranje','Change the view scale.','Promenite uvećanje prikaza.','Moves the camera closer to or farther from the scene.','Približava kameru sceni ili je udaljava.','Inspect detail while preserving context.','Pregledajte detalje uz očuvanje konteksta.','published'),
  ('move','transform','Move','Pomeranje','Translate the selected object.','Pomerite izabrani objekat.','Changes object position along one or more axes.','Menja položaj objekta duž jedne ili više osa.','Position is a core part of setup.','Položaj je važan deo postavke.','published'),
  ('rotate','transform','Rotate','Rotacija','Rotate the selected object.','Rotirajte izabrani objekat.','Changes object orientation around an axis.','Menja orijentaciju objekta oko ose.','Orientation affects spatial relationships.','Orijentacija utiče na prostorne odnose.','published'),
  ('scale','transform','Scale','Skaliranje','Resize the selected object.','Promenite veličinu objekta.','Changes object dimensions.','Menja dimenzije objekta.','Size affects spatial relationships.','Veličina utiče na prostorne odnose.','published'),
  ('measure_distance','analysis','Measure Distance','Merenje rastojanja','Measure distance between points.','Izmerite rastojanje između tačaka.','Measures a distance on or between objects.','Meri rastojanje na objektu ili između objekata.','Quantifies a geometric relationship.','Kvantifikuje geometrijski odnos.','published'),
  ('section','analysis','Section','Presek','Inspect a section through geometry.','Pregledajte presek kroz geometriju.','Shows a cross-section through selected geometry.','Prikazuje poprečni presek izabrane geometrije.','Internal form can be hidden in surface view.','Unutrašnji oblik može biti skriven u površinskom prikazu.','published'),
  ('trim','mesh','Trim','Skraćivanje','Remove unwanted mesh areas.','Uklonite neželjene delove mreže.','Cuts away a selected mesh region.','Odseca izabranu oblast mreže.','Cleanup can prepare a scan for later work.','Čišćenje može pripremiti sken za dalji rad.','published'),
  ('delete_region','mesh','Delete Region','Brisanje oblasti','Delete a selected mesh region.','Obrišite izabranu oblast mreže.','Removes selected mesh faces.','Uklanja izabrane poligone mreže.','Removes artifacts or unwanted geometry.','Uklanja artefakte ili neželjenu geometriju.','published'),
  ('fill_hole','mesh','Fill Hole','Popunjavanje otvora','Fill an open boundary in a mesh.','Popunite otvorenu granicu mreže.','Creates faces across a mesh opening.','Dodaje poligone preko otvora na mreži.','A closed surface may support more operations.','Zatvorena površina može podržati više operacija.','published'),
  ('smooth','mesh','Smooth Mesh','Zaglađivanje mreže','Reduce local surface irregularity.','Ublažite neravnine površine.','Smooths selected mesh geometry.','Zaglađuje izabranu geometriju mreže.','Can reduce small scan artifacts.','Može ublažiti manje artefakte skena.','published'),
  ('sculpt_add','sculpt','Add','Dodavanje','Add material with a sculpt brush.','Dodajte materijal četkicom.','Displaces the surface outward under the brush.','Pomeranje površine ka spolja ispod četkice.','Practice controlled surface changes.','Vežbajte kontrolisanu izmenu površine.','published'),
  ('sculpt_remove','sculpt','Remove','Uklanjanje','Remove material with a sculpt brush.','Uklonite materijal četkicom.','Displaces the surface inward under the brush.','Pomeranje površine ka unutra ispod četkice.','Practice controlled surface reduction.','Vežbajte kontrolisano smanjenje površine.','published'),
  ('sculpt_smooth','sculpt','Smooth','Zaglađivanje','Smooth brush strokes on a surface.','Zagladite poteze četkice.','Blends local surface variation.','Ublažava lokalne promene površine.','Refines a surface after sculpting.','Dorađuje površinu posle modelovanja.','published'),
  ('sculpt_flatten','sculpt','Flatten','Ravnanje','Flatten a local surface area.','Poravnajte lokalnu oblast površine.','Moves nearby surface toward a flatter form.','Pomeranje susedne površine ka ravnijem obliku.','Creates a more even local region.','Stvara ravnomerniju lokalnu oblast.','published'),
  ('sculpt_morph','sculpt','Morph','Oblikovanje','Morph local surface form.','Oblikujte lokalnu površinu.','Blends the surface toward a target brush profile.','Preoblikuje površinu prema profilu četkice.','Supports controlled anatomy refinement.','Podržava kontrolisanu doradu anatomije.','published'),
  ('margin','curve','Margin','Granica preparacije','Define a restoration margin.','Definišite granicu nadoknade.','Marks the boundary used to define a restoration edge.','Označava granicu ivice nadoknade.','A clear margin guides a restoration workflow.','Jasna granica usmerava postupak izrade nadoknade.','published'),
  ('insertion_path','workflow','Insertion Path','Put insercije','Set a restoration insertion direction.','Podesite pravac postavljanja nadoknade.','Defines the direction for seating and undercut review.','Definiše pravac za pregled postavljanja i podminiranih zona.','Direction changes which regions are undercut.','Pravac menja oblasti koje su podminirane.','published'),
  ('contacts','analysis','Contacts','Kontakti','Review distance and contact areas.','Pregledajte rastojanja i kontaktne oblasti.','Visualizes proximity between selected objects.','Prikazuje blizinu između izabranih objekata.','Highlights areas for exercise review.','Ističe oblasti za pregled u vežbi.','published'),
  ('intersections','analysis','Intersections','Preseci','Inspect intersecting geometry.','Pregledajte ukrštanje geometrije.','Highlights where selected objects overlap.','Ističe mesta preklapanja izabranih objekata.','Overlapping surfaces may need review.','Površine koje se preklapaju mogu zahtevati pregled.','published'),
  ('thickness','analysis','Thickness','Debljina','Inspect model wall thickness.','Pregledajte debljinu modela.','Measures distance through a surface for a configured analysis.','Meri rastojanje kroz površinu za podešenu analizu.','Exercise targets can be reviewed visually.','Ciljevi vežbe mogu se vizuelno pregledati.','published'),
  ('undercut','analysis','Undercut','Podminirana zona','Inspect undercuts for an insertion direction.','Pregledajte podminirane zone za izabrani pravac.','Highlights geometry relative to the insertion direction.','Ističe geometriju u odnosu na pravac insercije.','Supports educational path review.','Podržava edukativni pregled pravca.','published'),
  ('occlusion','occlusion','Occlusion','Okluzija','Review opposing surface relationships.','Pregledajte odnose suprotnih površina.','Inspects proximity and intersections with opposing geometry.','Pregled blizine i preseka sa suprotnom geometrijom.','Supports exercise review of occlusal relationships.','Podržava pregled okluzalnih odnosa u vežbi.','published')
on conflict (id) do update set category = excluded.category, label_en = excluded.label_en,
  label_sr = excluded.label_sr, short_description_en = excluded.short_description_en,
  short_description_sr = excluded.short_description_sr, explanation_en = excluded.explanation_en,
  explanation_sr = excluded.explanation_sr, why_it_matters_en = excluded.why_it_matters_en,
  why_it_matters_sr = excluded.why_it_matters_sr, status = excluded.status;

insert into public.tool_object_roles (tool_id, object_role)
select t.id, r.role
from (values ('orbit'), ('pan'), ('zoom'), ('measure_distance'), ('section')) as t(id)
cross join (select unnest(enum_range(null::public.cad_object_role)) as role) as r
on conflict do nothing;

insert into public.tool_object_roles (tool_id, object_role)
select t.id, r.role::public.cad_object_role
from (values ('move'), ('rotate'), ('scale')) as t(id)
cross join (values ('maxilla'), ('mandible'), ('antagonist'), ('preop'), ('prepared_tooth'), ('tooth'), ('crown'), ('bridge'),
  ('pontic'), ('denture_tooth'), ('denture_base'), ('framework'), ('splint'), ('implant'), ('abutment'), ('model_base'), ('reference'), ('scan'), ('other')) as r(role)
on conflict do nothing;

insert into public.tool_object_roles (tool_id, object_role)
select t.id, r.role
from (values ('select'), ('trim'), ('delete_region'), ('fill_hole'), ('smooth'), ('sculpt_add'), ('sculpt_remove'),
  ('sculpt_smooth'), ('sculpt_flatten'), ('sculpt_morph'), ('contacts'), ('intersections'), ('thickness'), ('undercut'), ('occlusion')) as t(id)
cross join (select unnest(enum_range(null::public.cad_object_role)) as role) as r
on conflict do nothing;

insert into public.tool_object_roles (tool_id, object_role)
select 'margin', role::public.cad_object_role
from unnest(array['prepared_tooth', 'crown', 'bridge', 'pontic', 'splint']::text[]) as role
on conflict do nothing;

insert into public.tool_object_roles (tool_id, object_role)
select 'insertion_path', role::public.cad_object_role
from unnest(array['prepared_tooth', 'crown', 'bridge', 'denture_base', 'framework', 'splint', 'implant', 'abutment']::text[]) as role
on conflict do nothing;
