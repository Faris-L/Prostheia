import { AppShell } from "@/components/app-shell";
import { requireAdminUser } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import Link from "next/link";
import { AdminCopy, AdminHeading, AdminNav } from "./admin-nav";

export default async function AdminPage() {
  await requireAdminUser();
  const supabase = await createServerSupabaseClient();
  const [lessonDrafts, lessonPublished, scenarioDrafts, scenarioPublished, assets, licenses] = await Promise.all([
    supabase.from("practice_lessons").select("id", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("practice_lessons").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("scenarios").select("id", { count: "exact", head: true }).eq("status", "draft"),
    supabase.from("scenarios").select("id", { count: "exact", head: true }).eq("status", "published"),
    supabase.from("assets").select("id").eq("scope", "platform"),
    supabase.from("asset_licenses").select("asset_id"),
  ]);
  const licensedIds = new Set((licenses.data ?? []).map((license) => license.asset_id));
  const licenseReview = (assets.data ?? []).filter((asset) => !licensedIds.has(asset.id)).length;
  const cards = [
    { title: "Draft lessons", count: lessonDrafts.count ?? 0, href: "/admin/lessons?status=draft" },
    { title: "Published lessons", count: lessonPublished.count ?? 0, href: "/admin/lessons?status=published" },
    { title: "Draft scenarios", count: scenarioDrafts.count ?? 0, href: "/admin/scenarios?status=draft" },
    { title: "Published scenarios", count: scenarioPublished.count ?? 0, href: "/admin/scenarios?status=published" },
    { title: "Assets to review", count: licenseReview, href: "/admin/assets" },
  ];
  return <AppShell active="Admin"><AdminHeading eyebrow="CONTENT STUDIO" title="Admin" description="Author and publish Practice lessons, Free Lab scenarios, and platform model assets."/><AdminNav/><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{cards.map((card) => <Link key={card.title} href={card.href} className="app-surface p-4 hover:border-primary/40"><p className="text-xs text-muted-foreground"><AdminCopy text={card.title} /></p><p className="mt-2 text-3xl font-semibold tabular-nums">{card.count}</p></Link>)}</div><section className="mt-7 app-surface p-5"><h2 className="text-sm font-semibold"><AdminCopy text="Authoring boundaries" /></h2><p className="mt-1 max-w-3xl text-xs leading-5 text-muted-foreground"><AdminCopy text="Only registered Prostheia tools and validators can be selected. Numeric values are labeled as exercise targets. Scenario identity is synthetic training information; do not enter patient details." /></p></section></AppShell>;
}
