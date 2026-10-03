"use client";

import { useI18n } from "@/lib/i18n";

export function AuthIntro() {
  const { t } = useI18n();
  return <><p className="page-eyebrow">{t("digitalLearningEyebrow")}</p><h1 className="mt-3 text-5xl font-medium leading-tight">{t("authHeroTitle")}</h1><p className="mt-4 max-w-lg text-sm leading-6 text-muted-foreground">{t("authHeroIntro")}</p></>;
}
