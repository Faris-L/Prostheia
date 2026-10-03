"use client";

import { Languages } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();
  const next = locale === "en" ? "sr" : "en";
  return <button type="button" onClick={() => setLocale(next)} aria-label={`${t("switchLanguage")}: ${next === "sr" ? t("serbian") : t("english")}`} title={t("switchLanguage")} className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border px-2 text-[10px] font-semibold hover:bg-muted">
    <Languages className="size-3.5" aria-hidden="true" />{locale.toUpperCase()}
  </button>;
}
