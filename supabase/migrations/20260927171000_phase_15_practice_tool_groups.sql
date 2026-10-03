-- Register the shared Practice tool groups used by the Admin lesson editor.
-- These IDs map to existing workspace controls; they do not implement new tools.
insert into public.tool_definitions (
  id, category, label_en, label_sr, short_description_en, short_description_sr,
  explanation_en, explanation_sr, status
)
values
  ('camera', 'navigation', 'Camera', 'Kamera',
   'Orbit, pan, zoom and standard views.', 'Orbit, pomeranje prikaza, zumiranje i standardni pogledi.',
   'Controls how the model is viewed in the shared CAD workspace.', 'Upravlja prikazom modela u zajedničkom CAD prostoru.', 'published'),
  ('analysis', 'analysis', 'Analysis', 'Analiza',
   'Measure and inspect model geometry.', 'Merite i pregledajte geometriju modela.',
   'Enables the analysis controls available in the current workspace.', 'Omogućava analitičke kontrole dostupne u trenutnom radnom prostoru.', 'published'),
  ('scene', 'scene', 'Scene', 'Scena',
   'Select, hide, show and isolate objects.', 'Birajte, sakrivajte, prikazujte i izolujte objekte.',
   'Controls object visibility and isolation in the Scene panel.', 'Upravlja vidljivošću i izolovanjem objekata u panelu Scene.', 'published'),
  ('sculpt', 'sculpt', 'Sculpt', 'Sculpt',
   'Use the shared sculpt brush controls.', 'Koristite zajedničke kontrole Sculpt četkice.',
   'Enables the existing Add, Remove, Smooth, Flatten and Morph sculpt controls.', 'Omogućava postojeće Sculpt kontrole Add, Remove, Smooth, Flatten i Morph.', 'published'),
  ('mesh_edit', 'mesh', 'Mesh Edit', 'Uređivanje mesh-a',
   'Select and edit mesh regions.', 'Birajte i uređujte regione mesh-a.',
   'Enables the shared mesh editing controls for the current Practice step.', 'Omogućava zajedničke kontrole za uređivanje mesh-a u trenutnom Practice koraku.', 'published')
on conflict (id) do update set
  category = excluded.category,
  label_en = excluded.label_en,
  label_sr = excluded.label_sr,
  short_description_en = excluded.short_description_en,
  short_description_sr = excluded.short_description_sr,
  explanation_en = excluded.explanation_en,
  explanation_sr = excluded.explanation_sr,
  status = 'published';
