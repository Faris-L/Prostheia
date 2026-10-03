import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { requireAdminUser } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AdminCopy, AdminHeading, AdminLocalizedCopy, AdminNav, AdminNotice } from "../admin-nav";

export default async function AdminScenariosPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdminUser();
  const status = (await searchParams).status;
  const supabase = await createServerSupabaseClient();
  let query = supabase.from("scenarios").select("id, slug, title_en, title_sr, difficulty, status, updated_at, domain_id").order("updated_at", { ascending: false });
  if (status === "draft" || status === "published" || status === "archived") query = query.eq("status", status);
  const [{ data, error }, { data: domains }] = await Promise.all([query, supabase.from("content_domains").select("id, name_en, name_sr")]);
  const domainMap = new Map((domains ?? []).map((domain) => [domain.id, `${domain.name_en} / ${domain.name_sr}`]));
  return <AppShell active="Admin"><AdminHeading eyebrow="FREE LAB" title="Scenarios" description="Manage synthetic case briefs, category, difficulty, assets, and Random Case eligibility."/><AdminNav/><div className="mb-3 flex items-center justify-between"><p className="text-xs text-muted-foreground">{data?.length ?? 0} scenario{data?.length === 1 ? "" : "s"}{status ? ` · ${status}` : ""}</p><Button asChild><Link href="/admin/scenarios/new"><AdminCopy text="Create scenario" /></Link></Button></div>{error ? <AdminNotice text="Unable to load scenarios." /> : <div className="app-surface divide-y divide-border">{(data ?? []).length ? data!.map((scenario) => <Link href={`/admin/scenarios/${scenario.id}`} key={scenario.id} className="flex flex-wrap items-center gap-3 p-4 hover:bg-muted/30"><span className="min-w-0 flex-1"><strong className="block truncate text-sm"><AdminLocalizedCopy en={scenario.title_en} sr={scenario.title_sr} /></strong><span className="mt-1 block text-[10px] text-muted-foreground">{scenario.title_sr || "Serbian title missing"} · {domainMap.get(scenario.domain_id) ?? "Category missing"} · {scenario.difficulty}</span></span><span className={`rounded-full border px-2 py-1 text-[9px] uppercase ${scenario.status === "published" ? "border-emerald-600/30 text-emerald-700" : "border-border text-muted-foreground"}`}>{scenario.status}</span><span className="text-[10px] text-muted-foreground">{scenario.slug}</span></Link>) : <p className="p-5 text-xs text-muted-foreground"><AdminCopy text="No scenarios match this view. Add a synthetic training brief to begin." /></p>}</div>}</AppShell>;
}
