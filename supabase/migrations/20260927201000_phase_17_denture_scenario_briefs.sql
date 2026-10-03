-- Make the generated Free Lab training files explicit in the scenario brief.
update public.scenarios
set additional_metadata = additional_metadata || '{
  "materialPreset":"synthetic_training",
  "material":{"en":"Synthetic educational preset","sr":"Sintetički edukativni materijal"},
  "supplied":{"en":["Edentulous upper arch","Artificial tooth sets","Editable synthetic base"],"sr":["Bezubi gornji luk","Setovi veštačkih zuba","Sintetička baza koja se može menjati"]},
  "notes":{"en":"All training geometry is generated inside Prostheia. No patient scan or third-party tooth library is included.","sr":"Sva geometrija za vežbu generisana je unutar Prostheia. Nema snimaka pacijenata ni tuđih biblioteka zuba."}
}'::jsonb,
updated_at = now()
where slug='synthetic_upper_complete_denture';

update public.scenarios
set additional_metadata = additional_metadata || '{
  "materialPreset":"synthetic_training",
  "material":{"en":"Synthetic educational preset","sr":"Sintetički edukativni materijal"},
  "supplied":{"en":["Edentulous upper and lower arches","Artificial tooth sets","Two editable synthetic bases"],"sr":["Bezubi gornji i donji luk","Setovi veštačkih zuba","Dve sintetičke baze koje se mogu menjati"]},
  "notes":{"en":"All training geometry is generated inside Prostheia. Static proximity does not simulate jaw movement.","sr":"Sva geometrija za vežbu generisana je unutar Prostheia. Statička blizina ne simulira pokret vilice."}
}'::jsonb,
updated_at = now()
where slug='synthetic_upper_lower_complete_denture';
