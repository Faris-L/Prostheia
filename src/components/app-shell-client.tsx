"use client";

import Link from "next/link";
import { Activity, BookOpenCheck, BriefcaseBusiness, LayoutDashboard, LogOut, ShieldCheck, ScanLine, WholeWord } from "lucide-react";
import type { ReactNode } from "react";
import { ProstheiaMark } from "@/components/prostheia-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { logout } from "@/app/(auth)/actions";
import { useI18n, type MessageKey } from "@/lib/i18n";

const navigation = [
  { key: "dashboard", href: "/dashboard", icon: LayoutDashboard },
  { key: "practice", href: "/practice", icon: BookOpenCheck },
  { key: "freeLab", href: "/free-lab", icon: ScanLine },
  { key: "myCases", href: "/cases", icon: BriefcaseBusiness },
  { key: "progress", href: "/progress", icon: Activity },
  { key: "glossary", href: "/glossary", icon: WholeWord },
] as const satisfies readonly { key: MessageKey; href: string; icon: typeof LayoutDashboard }[];

const activeKeys: Record<string, MessageKey> = { Dashboard: "dashboard", Practice: "practice", "Free Lab": "freeLab", "My Cases": "myCases", Progress: "progress", Glossary: "glossary", Admin: "admin" };

export function AppShellClient({ children, active, displayName, email, isAdmin }: { children: ReactNode; active: string; displayName: string | null; email: string | null; isAdmin: boolean }) {
  const { t } = useI18n();
  const identityLabel = displayName || email || t("account");
  const initials = identityLabel.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
  const links = isAdmin ? [...navigation, { key: "admin" as const, href: "/admin", icon: ShieldCheck }] : navigation;
  const activeLabel = activeKeys[active] ? t(activeKeys[active]) : active;

  return <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
    <aside className="hidden border-r border-[var(--sidebar-border)] bg-[var(--sidebar)] lg:flex lg:flex-col">
      <Link href="/dashboard" className="flex h-[72px] items-center gap-3 border-b border-[var(--sidebar-border)] px-5">
        <ProstheiaMark className="size-10 shrink-0" />
        <span><span className="block text-[15px] font-bold tracking-tight">Prostheia</span><span className="mt-0.5 block text-[10px] tracking-wide text-muted-foreground">{t("digitalDentalStudio")}</span></span>
      </Link>
      <div className="px-3 pt-6">
        <p className="px-3 pb-2.5 text-[10px] font-bold uppercase tracking-[0.17em] text-muted-foreground">{t("workspace")}</p>
        <nav aria-label={t("workspace")} className="space-y-1">
          {links.map(({ key, href, icon: Icon }) => <Link key={href} href={href} aria-current={activeKeys[active] === key ? "page" : undefined} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors ${activeKeys[active] === key ? "bg-[var(--sidebar-active)] text-foreground" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"}`}><Icon className={`size-[17px] ${activeKeys[active] === key ? "text-primary" : ""}`} strokeWidth={1.8} />{t(key)}</Link>)}
        </nav>
      </div>
      <div className="mt-auto p-3">
        <div className="mb-3 rounded-xl border border-border/80 bg-background/65 p-3.5">
          <p className="text-xs font-semibold">{t("workspaceGuidance")}</p>
          <p className="mt-1.5 text-[11px] leading-[1.6] text-muted-foreground">{t("toolHelpAvailable")}</p>
          <Link href="/free-lab" className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:underline">{t("openFreeLab")} <span aria-hidden="true">→</span></Link>
        </div>
        <div className="flex items-center gap-2.5 border-t border-[var(--sidebar-border)] px-1 pt-3">
          <div className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--accent-soft)] text-[10px] font-bold text-primary">{initials || "U"}</div>
          <div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{displayName || t("account")}</p><p className="truncate text-[10px] text-muted-foreground">{email || t("signedIn")}</p></div>
          <form action={logout}><button type="submit" aria-label={t("signOut")} title={t("signOut")} className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><LogOut className="size-4" /></button></form>
        </div>
      </div>
    </aside>
    <div className="flex min-h-screen min-w-0 flex-col">
      <header className="flex h-[62px] shrink-0 items-center justify-between border-b border-border bg-background/90 px-4 sm:px-7">
        <div className="flex min-w-0 items-center gap-2 text-[12px] text-muted-foreground"><span className="hidden sm:inline">{t("workspace")}</span><span className="hidden sm:inline" aria-hidden="true">/</span><span className="truncate font-semibold text-foreground">{activeLabel}</span></div>
        <div className="flex items-center gap-2.5 sm:gap-3"><LanguageToggle /><ThemeToggle /><div title={email ?? undefined} aria-label={identityLabel} className="grid size-8 place-items-center rounded-full border border-border bg-[var(--surface-soft)] text-[10px] font-bold text-foreground">{initials || "U"}</div><form action={logout} className="lg:hidden"><button type="submit" aria-label={t("signOut")} title={t("signOut")} className="rounded-md p-2 text-muted-foreground hover:bg-muted"><LogOut className="size-4" /></button></form></div>
      </header>
      <nav aria-label={t("workspace")} className="flex gap-1 overflow-x-auto border-b border-border bg-[var(--sidebar)] px-3 py-2 lg:hidden">
        {links.map(({ key, href }) => <Link key={href} href={href} aria-current={activeKeys[active] === key ? "page" : undefined} className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium ${activeKeys[active] === key ? "bg-[var(--sidebar-active)] text-foreground" : "text-muted-foreground"}`}>{t(key)}</Link>)}
      </nav>
      <main className="mx-auto w-full max-w-[1500px] flex-1 px-5 py-7 sm:px-8 sm:py-9 xl:px-10">
        <p role="note" className="mb-5 rounded-lg border border-border bg-[var(--surface-soft)] px-4 py-3 text-[11px] leading-5 text-muted-foreground">{t("educationDisclaimer")}</p>
        {children}
      </main>
    </div>
  </div>;
}
