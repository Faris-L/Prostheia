import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireAdminUser } from "@/lib/auth/guards";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AdminCopy, AdminHeading, AdminLocalizedCopy, AdminNav, AdminNotice } from "../admin-nav";
import { Button } from "@/components/ui/button";

export default async function AdminLessonsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdminUser();
  const status = (await searchParams).status;
  const supabase = await createServerSupabaseClient();
  let query = supabase.from("practice_lessons").select("id, slug, title_en, title_sr, difficulty, status, updated_at, practice_modules(title_en, title_sr)").order("updated_at", { ascending: false });
  if (status === "draft" || status === "published" || status === "archived") query = query.eq("status", status);
  const { data, error } = await query;
  return <AppShell active="Admin"><AdminHeading eyebrow="PRACTICE" title="Lessons" description="Edit bilingual modules, lessons, steps, hints, tools, references, and registered validators."/><AdminNav/><div className="mb-3 flex items-center justify-between"><p className="text-xs text-muted-foreground">{data?.length ?? 0} lesson{data?.length === 1 ? "" : "s"}{status ? ` · ${status}` : ""}</p><Button asChild><Link href="/admin/lessons/new"><AdminCopy text="Create lesson" /></Link></Button></div>{error ? <AdminNotice text="Unable to load lessons." /> : <div className="app-surface divide-y divide-border">{(data ?? []).length ? data!.map((lesson) => <Link href={`/admin/lessons/${lesson.id}`} key={lesson.id} className="flex flex-wrap items-center gap-3 p-4 hover:bg-muted/30"><span className="min-w-0 flex-1"><strong className="block truncate text-sm"><AdminLocalizedCopy en={lesson.title_en} sr={lesson.title_sr} /></strong><span className="mt-1 block text-[10px] text-muted-foreground">{lesson.title_sr || "Serbian title missing"} · {lesson.practice_modules?.title_en ?? "Module missing"} · {lesson.difficulty}</span></span><span className={`rounded-full border px-2 py-1 text-[9px] uppercase ${lesson.status === "published" ? "border-emerald-600/30 text-emerald-700" : "border-border text-muted-foreground"}`}>{lesson.status}</span><span className="text-[10px] text-muted-foreground">{lesson.slug}</span></Link>) : <p className="p-5 text-xs text-muted-foreground"><AdminCopy text="No lessons match this view. Create a draft to start authoring." /></p>}</div>}</AppShell>;
}
