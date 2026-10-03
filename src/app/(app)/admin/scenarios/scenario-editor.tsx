"use client";
import { useInterfaceCopy } from "@/lib/i18n";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { publishScenario, saveScenarioContent, unpublishScenario } from "../actions";

type Value = { id?: string; updatedAt?: string; domainId: string; slug: string; title: { en: string; sr: string }; description: { en: string; sr: string }; difficulty: "foundation" | "beginner" | "intermediate" | "advanced"; restorationType?: "crown" | "bridge" | "inlay" | "onlay" | "veneer"; caseInitializer?: "implant" | "articulator"; patientCode: string; age: number | null; indication: { en: string; sr: string }; toothNumbers: number[]; material: { en: string; sr: string }; requirements: { en: string[]; sr: string[] }; notes: { en: string; sr: string }; supplied: { en: string[]; sr: string[] }; randomEligible: boolean; assets: { assetId: string; role: string; required: boolean }[] };

function Lines({ label, value, onChange }: { label: string; value: string[]; onChange: (value: string[]) => void }) {
  return <label className="block text-[10px] font-medium text-muted-foreground">{label}<textarea rows={4} value={value.join("\n")} onChange={(event) => onChange(event.target.value.split("\n").map((item) => item.trim()).filter(Boolean))} className="mt-1 block w-full rounded-md border border-input bg-background px-2.5 py-2 text-xs" /></label>;
}
function Field({ label, value, onChange, textarea = false }: { label: string; value: string; onChange: (value: string) => void; textarea?: boolean }) {
  return <label className="block text-[10px] font-medium text-muted-foreground">{label}{textarea ? <textarea rows={3} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 block w-full rounded-md border border-input bg-background px-2.5 py-2 text-xs" /> : <input value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 block h-9 w-full rounded-md border border-input bg-background px-2 text-xs" />}</label>;
}

export function ScenarioEditor({ initial, domains, assets, status }: { initial: Value; domains: { id: string; slug: string; name_en: string; name_sr: string; status: string }[]; assets: { id: string; name: string; status: string; role: string }[]; status?: string }) {
  const tx = useInterfaceCopy();
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [dirty, setDirty] = useState(false);
  const editVersion = useRef(0);
  const saveContent = useCallback(async (previous: { error?: string; id?: string; savedAt?: number }, formData: FormData) => {
    const submittedVersion = editVersion.current;
    const result = await saveScenarioContent(previous, formData);
    if (result.savedAt && submittedVersion === editVersion.current) setDirty(false);
    return result;
  }, []);
  const [saveState, saveAction] = useActionState<{ error?: string; id?: string; savedAt?: number }, FormData>(saveContent, {});
  const [publishState, publishAction] = useActionState(publishScenario, {});
  const [unpublishState, unpublishAction] = useActionState(unpublishScenario, {});
  useEffect(() => { const warn = (event: BeforeUnloadEvent) => { if (!dirty) return; event.preventDefault(); event.returnValue = ""; }; window.addEventListener("beforeunload", warn); return () => window.removeEventListener("beforeunload", warn); }, [dirty]);
  useEffect(() => { if (saveState.id && saveState.savedAt) { router.push(`/admin/scenarios/${saveState.id}`); router.refresh(); } }, [saveState.id, saveState.savedAt, router]);
  const update = <K extends keyof Value>(key: K, next: Value[K]) => { setDirty(true); setValue((current) => ({ ...current, [key]: next })); };
  const setLocalized = (key: "title" | "description" | "indication" | "material" | "notes", locale: "en" | "sr", text: string) => update(key, { ...value[key], [locale]: text });
  const statusAction = status === "published" ? unpublishAction : publishAction;
  return <div>
    <form action={saveAction} onChange={() => { editVersion.current += 1; setDirty(true); }} onSubmit={(event) => { const form = event.currentTarget; (form.elements.namedItem("content") as HTMLInputElement).value = JSON.stringify(value); }}>
      <input type="hidden" name="content" />
      <section className="app-surface grid gap-4 p-5 md:grid-cols-2">
        <h2 className="text-sm font-semibold md:col-span-2">{tx("Scenario metadata")}</h2>
        <Field label={tx("Scenario slug")} value={value.slug} onChange={(next) => update("slug", next)} />
        <label className="block text-[10px] font-medium text-muted-foreground">{tx("Domain / category")}<select value={value.domainId} onChange={(event) => update("domainId", event.target.value)} className="mt-1 block h-9 w-full rounded-md border border-input bg-background px-2 text-xs"><option value="">{tx("Select a category")}</option>{domains.map((domain) => <option key={domain.id} value={domain.id}>{domain.name_en} / {domain.name_sr}{domain.status !== "published" ? " · Draft" : ""}</option>)}</select></label>
        <label className="block text-[10px] font-medium text-muted-foreground">{tx("Difficulty")}<select value={value.difficulty} onChange={(event) => update("difficulty", event.target.value as Value["difficulty"])} className="mt-1 block h-9 w-full rounded-md border border-input bg-background px-2 text-xs">{["foundation", "beginner", "intermediate", "advanced"].map((item) => <option key={item}>{item}</option>)}</select></label>
        <Field label={tx("Title · English")} value={value.title.en} onChange={(next) => setLocalized("title", "en", next)} />
        <Field label={tx("Title · Serbian")} value={value.title.sr} onChange={(next) => setLocalized("title", "sr", next)} />
        <Field label={tx("Description · English")} value={value.description.en} onChange={(next) => setLocalized("description", "en", next)} textarea />
        <Field label={tx("Description · Serbian")} value={value.description.sr} onChange={(next) => setLocalized("description", "sr", next)} textarea />
        <div className="md:col-span-2 rounded-md border border-amber-500/30 bg-amber-500/5 p-3"><p className="text-xs font-semibold">{tx("Synthetic training information only")}</p><p className="mt-1 text-[10px] text-muted-foreground">{tx("Enter fictional/anonymized case details. Do not enter names, dates of birth, contact details, record numbers, or any real patient information.")}</p></div>
        <Field label={tx("Fictional Patient ID (PT-0001 format)")} value={value.patientCode} onChange={(next) => update("patientCode", next.toUpperCase())} />
        <label className="block text-[10px] font-medium text-muted-foreground">{tx("Age (optional)")}<input type="number" min="0" max="120" value={value.age ?? ""} onChange={(event) => update("age", event.target.value ? Number(event.target.value) : null)} className="mt-1 block h-9 w-full rounded-md border border-input bg-background px-2 text-xs" /></label>
        <Field label={tx("Indication · English")} value={value.indication.en} onChange={(next) => setLocalized("indication", "en", next)} />
        <Field label={tx("Indication · Serbian")} value={value.indication.sr} onChange={(next) => setLocalized("indication", "sr", next)} />
        <Field label={tx("Material preset · English")} value={value.material.en} onChange={(next) => setLocalized("material", "en", next)} />
        <Field label={tx("Material preset · Serbian")} value={value.material.sr} onChange={(next) => setLocalized("material", "sr", next)} />
        <label className="block text-[10px] font-medium text-muted-foreground">{tx("Target tooth/region numbers, comma separated")}<input value={value.toothNumbers.join(", ")} onChange={(event) => update("toothNumbers", event.target.value.split(",").map(Number).filter((tooth) => Number.isInteger(tooth) && tooth > 0))} className="mt-1 block h-9 w-full rounded-md border border-input bg-background px-2 text-xs" /></label>
        <label className="flex items-center gap-2 text-[10px] text-muted-foreground"><input type="checkbox" checked={value.randomEligible} onChange={(event) => update("randomEligible", event.target.checked)} />{tx("Eligible for Random Case when published")}</label>
        <label className="block text-[10px] font-medium text-muted-foreground">{tx("Shared workflow initializer")}<select aria-label={tx("Scenario workflow initializer")} value={value.caseInitializer ?? ""} onChange={(event) => update("caseInitializer", event.target.value ? event.target.value as Value["caseInitializer"] : undefined)} className="mt-1 block h-9 w-full rounded-md border border-input bg-background px-2 text-xs"><option value="">{tx("Use supplied assets")}</option><option value="implant">{tx("Synthetic Implant Practice case")}</option><option value="articulator">{tx("Synthetic Virtual Articulator case")}</option></select></label>
        <label className="text-[10px] text-muted-foreground">{tx("Restorative case initializer")}<select aria-label={tx("Restorative case initializer")} value={value.restorationType ?? ""} onChange={(event) => update("restorationType", event.target.value ? event.target.value as Value["restorationType"] : undefined)} className="mt-1 block h-9 w-full rounded border border-input bg-background px-2 text-xs"><option value="">{tx("Scenario assets / general case")}</option>{["crown", "bridge", "inlay", "onlay", "veneer"].map((type) => <option key={type} value={type}>{type[0].toUpperCase() + type.slice(1)} · synthetic CAD case</option>)}</select></label>
        <Lines label={tx("Supplied data · English (one per line)")} value={value.supplied.en} onChange={(next) => update("supplied", { ...value.supplied, en: next })} />
        <Lines label={tx("Supplied data · Serbian (one per line)")} value={value.supplied.sr} onChange={(next) => update("supplied", { ...value.supplied, sr: next })} />
        <Lines label={tx("Case brief requirements · English (one per line)")} value={value.requirements.en} onChange={(next) => update("requirements", { ...value.requirements, en: next })} />
        <Lines label={tx("Case brief requirements · Serbian (one per line)")} value={value.requirements.sr} onChange={(next) => update("requirements", { ...value.requirements, sr: next })} />
        <Field label={tx("Notes / context · English")} value={value.notes.en} onChange={(next) => setLocalized("notes", "en", next)} textarea />
        <Field label={tx("Notes / context · Serbian")} value={value.notes.sr} onChange={(next) => setLocalized("notes", "sr", next)} textarea />
      </section>
      <section className="app-surface mt-4 p-5"><h2 className="text-sm font-semibold">{tx("Supplied platform assets")}</h2><p className="mt-1 text-[10px] text-muted-foreground">{tx("Choose ready models with reviewed license/provenance. Requirements remain a case brief and do not become guided Practice steps.")}</p><div className="mt-3 space-y-2">{assets.map((asset) => { const selected = value.assets.find((item) => item.assetId === asset.id); return <div key={asset.id} className="flex flex-wrap items-center gap-2 rounded border border-border p-2"><label className="flex flex-1 items-center gap-2 text-xs"><input type="checkbox" checked={Boolean(selected)} onChange={(event) => update("assets", event.target.checked ? [...value.assets, { assetId: asset.id, role: asset.role, required: true }] : value.assets.filter((item) => item.assetId !== asset.id))} /><span>{asset.name}<span className="ml-1 text-[9px] text-muted-foreground">{asset.status}</span></span></label>{selected && <><select aria-label={`Object role for ${asset.name}`} value={selected.role} onChange={(event) => update("assets", value.assets.map((item) => item.assetId === asset.id ? { ...item, role: event.target.value } : item))} className="h-8 rounded border border-input bg-background px-2 text-[10px]">{["maxilla", "mandible", "antagonist", "preop", "prepared_tooth", "tooth", "crown", "bridge", "pontic", "denture_tooth", "denture_base", "framework", "splint", "implant", "abutment", "model_base", "reference", "scan", "other"].map((role) => <option key={role}>{role}</option>)}</select><label className="flex items-center gap-1 text-[9px] text-muted-foreground"><input type="checkbox" checked={selected.required} onChange={(event) => update("assets", value.assets.map((item) => item.assetId === asset.id ? { ...item, required: event.target.checked } : item))} />{tx("Required")}</label></>}</div>; })}{assets.length === 0 && <p className="text-xs text-muted-foreground">{tx("No assets are registered yet. Upload and license a model under Platform assets first.")}</p>}</div></section>
      <div className="sticky bottom-0 z-10 mt-4 flex flex-wrap items-center gap-2 border-t border-border bg-background/95 py-3 backdrop-blur"><Button type="submit" disabled={!dirty && Boolean(value.id)}>{tx("Save draft")}</Button><span className="text-[10px] text-muted-foreground">{dirty ? tx("Unsaved changes") : tx("Saved")}</span><span className="ml-auto text-[10px] text-muted-foreground">{tx("Status:")} {tx(status ?? "Draft")}</span></div>
    </form>
    {(saveState.error || publishState.error || unpublishState.error) && <p role="alert" className="mt-3 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">{tx(saveState.error ?? publishState.error ?? unpublishState.error ?? "Unable to save this content.")}</p>}
    {value.id && <div className="mt-3 flex gap-2"><form action={statusAction}><input type="hidden" name="id" value={value.id} /><Button type="submit" variant="outline">{status === "published" ? "Unpublish" : "Publish"}</Button></form><a href={`/free-lab?previewScenario=${value.id}`} className="inline-flex h-9 items-center rounded-md border border-border px-3 text-xs font-semibold">{tx("Preview Free Lab catalog ↗")}</a></div>}
  </div>;
}

export function emptyScenario(domainId = ""): Value {
  return { domainId, slug: "new_synthetic_scenario", title: { en: "", sr: "" }, description: { en: "", sr: "" }, difficulty: "beginner", restorationType: undefined, patientCode: "PT-0001", age: null, indication: { en: "", sr: "" }, toothNumbers: [], material: { en: "", sr: "" }, requirements: { en: [], sr: [] }, notes: { en: "Synthetic training scenario. No real patient data.", sr: "Sintetički scenario za obuku. Nema stvarnih podataka pacijenta." }, supplied: { en: [], sr: [] }, randomEligible: true, assets: [] };
}
