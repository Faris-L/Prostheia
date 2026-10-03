"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { duplicateSavedCase, listSavedCases, type SavedCase } from "@/cad/persistence/cloud-cases";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

export function MyCasesList() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [cases, setCases] = useState<SavedCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try { setCases(await listSavedCases()); }
    catch { setError("load"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void Promise.resolve().then(refresh); }, [refresh]);

  const duplicate = async (item: SavedCase) => {
    if (!item.head) { toast.error(t("missingCaseRevision")); return; }
    const title = window.prompt(t("duplicateCasePrompt"), `${t("copyOf")}${item.title}`);
    if (!title?.trim()) return;
    try {
      const copied = await duplicateSavedCase(item.id, item.head.revision_id, title.trim());
      await refresh();
      toast.success(t("independentCaseCreated"));
      router.push(`/workspace/${copied.case_id}`);
    } catch { toast.error(t("caseCouldNotDuplicate")); }
  };

  const displayCases = cases.map((item) => ({
    ...item,
    sourceLabel: item.source_type === "practice" ? t("sourcePractice") : item.source_type === "scenario" ? t("sourceScenario") : item.source_type === "import" ? t("sourceImport") : t("sourceBlank"),
  }));

  if (loading) return <p role="status" className="rounded-lg border border-border bg-background px-4 py-5 text-xs text-muted-foreground">{t("loadingCases")}</p>;
  if (error) return <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-4"><p className="text-xs">{t("casesCouldNotLoad")}</p><Button className="mt-3 h-8 gap-1.5 text-xs" variant="outline" onClick={() => void refresh()}><RefreshCw className="size-3"/>{t("retry")}</Button></div>;
  if (!cases.length) return <p className="rounded-lg border border-dashed border-border px-4 py-5 text-xs text-muted-foreground">{t("emptyCasesMessage")}</p>;

  return <ul className="divide-y divide-border rounded-lg border border-border bg-background">
    {displayCases.map((item) => <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.title}</p><p className="mt-1 text-[10px] text-muted-foreground">{item.sourceLabel} · {item.head ? `${t("revision")} ${item.head.revision_number} · ` : `${t("noRevision")} · `}{t("updated")} {new Date(item.updated_at).toLocaleString(locale)}</p></div>
      {item.head && <Button variant="outline" size="sm" className="h-8 gap-1.5 text-[10px]" onClick={() => void duplicate(item)}><Copy className="size-3.5"/>{t("duplicate")}</Button>}
      <Button size="sm" className="h-8 gap-1.5 text-[10px]" disabled={!item.head} onClick={() => router.push(`/workspace/${item.id}`)}>{t("open")}<ArrowRight className="size-3.5"/></Button>
    </li>)}
  </ul>;
}
