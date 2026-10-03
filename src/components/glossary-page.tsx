"use client";

import { DENTAL_CAD_GLOSSARY, useI18n } from "@/lib/i18n";

export function GlossaryPage() {
  const { t } = useI18n();

  return <section className="mx-auto max-w-4xl">
      <header className="mb-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">{t("glossary")}</p>
        <h1 className="mt-2 font-heading text-3xl font-semibold tracking-tight">{t("glossaryTitle")}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t("glossaryIntro")}</p>
      </header>
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th scope="col" className="px-4 py-3 font-semibold">{t("glossaryEnglish")}</th>
              <th scope="col" className="px-4 py-3 font-semibold">{t("glossarySerbian")}</th>
            </tr>
          </thead>
          <tbody>
            {DENTAL_CAD_GLOSSARY.map(([english, serbian]) => <tr key={english} className="border-t border-border/70">
              <th scope="row" className="px-4 py-3 font-medium">{english}</th>
              <td lang="sr" className="px-4 py-3 text-muted-foreground">{serbian}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
  </section>;
}
