"use client";

import Link from "next/link";
import { BookOpenCheck, Boxes, ClipboardList } from "lucide-react";
import { useI18n, useInterfaceCopy } from "@/lib/i18n";

const sections = [
  { href: "/admin/lessons", label: "Practice lessons", icon: BookOpenCheck },
  { href: "/admin/scenarios", label: "Free Lab scenarios", icon: ClipboardList },
  { href: "/admin/assets", label: "Platform assets", icon: Boxes },
];

export function AdminNav() {
  const tx = useInterfaceCopy();
  return <nav aria-label={tx("Admin content")} className="mb-7 flex flex-wrap gap-2">{sections.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-card px-3 text-xs font-medium hover:border-primary/40"><Icon className="size-3.5 text-primary" />{tx(label)}</Link>)}</nav>;
}

export function AdminHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  const tx = useInterfaceCopy();
  return <header className="mb-5"><p className="page-eyebrow">{tx(eyebrow)}</p><h1 className="mt-1.5 text-3xl font-medium tracking-tight">{tx(title)}</h1><p className="mt-1.5 text-sm text-muted-foreground">{tx(description)}</p></header>;
}

export function AdminNotice({ text }: { text: string }) {
  const tx = useInterfaceCopy();
  return <p role="alert" className="app-surface p-4 text-xs text-destructive">{tx(text)}</p>;
}

export function AdminCopy({ text }: { text: string }) {
  const tx = useInterfaceCopy();
  return <>{tx(text)}</>;
}

export function AdminLocalizedCopy({ en, sr }: { en: string | null; sr: string | null }) {
  const { locale } = useI18n();
  return <>{locale === "sr" ? sr || en : en || sr}</>;
}
