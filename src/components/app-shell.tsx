import Link from "next/link";
import { Activity, BookOpen, Box, BriefcaseBusiness, CircleHelp, Command, Layers3, LayoutDashboard, LogOut, Settings2, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { logout } from "@/app/(auth)/actions";
import { getSessionSummary } from "@/lib/auth/guards";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Practice", href: "/practice", icon: BookOpen },
  { label: "Free Lab", href: "/free-lab", icon: Box },
  { label: "My Cases", href: "/cases", icon: BriefcaseBusiness },
  { label: "Progress", href: "/progress", icon: Activity },
];

export async function AppShell({ children, active }: { children: ReactNode; active: string }) {
  const session = await getSessionSummary();
  const identityLabel = session?.displayName || session?.email || "Your account";
  const initials = identityLabel.split(/\s+/).map((part: string) => part[0]).join("").slice(0, 2).toUpperCase();
  const links = session?.isAdmin ? [...navigation, { label: "Admin", href: "/admin", icon: ShieldCheck }] : navigation;
  return (
    <div className="min-h-screen bg-background text-foreground lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="hidden border-r border-border bg-card/70 lg:flex lg:flex-col">
        <Link href="/dashboard" className="flex h-[76px] items-center gap-3 border-b border-border px-6">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Layers3 className="size-5" /></span>
          <span><span className="block text-sm font-semibold tracking-tight">Prostheia</span><span className="block text-[11px] text-muted-foreground">Digital Dental Studio</span></span>
        </Link>
        <div className="px-4 pt-7"><p className="px-3 pb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Workspace</p>
          <nav className="space-y-1">{links.map(({ label, href, icon: Icon }) => <Link key={href} href={href} aria-current={active === label ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${active === label ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Icon className="size-[17px]" />{label}</Link>)}</nav>
        </div>
        <div className="mt-auto p-4"><div className="rounded-2xl border border-border bg-background p-4"><div className="mb-3 flex size-9 items-center justify-center rounded-xl bg-muted text-foreground"><CircleHelp className="size-[18px]" /></div><p className="text-sm font-medium">Need a hand?</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Guidance and product help will be available here.</p><span className="mt-3 inline-block text-xs font-semibold text-muted-foreground">Help center coming later</span></div><div className="mt-4 flex items-center gap-3 rounded-xl px-2 py-2"><div className="grid size-9 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{initials || "U"}</div><div className="min-w-0 flex-1"><p className="truncate text-xs font-medium">{session?.displayName || "Your workspace"}</p><p className="truncate text-[11px] text-muted-foreground">{session?.email || "Signed in"}</p></div><form action={logout}><button type="submit" aria-label="Sign out" title="Sign out" className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><LogOut className="size-4" /></button></form></div></div>
      </aside>
      <div className="flex min-h-screen min-w-0 flex-col">
        <header className="flex h-[76px] items-center justify-between border-b border-border px-5 sm:px-8"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Command className="size-4" /><span className="hidden sm:inline">Prostheia</span><span aria-hidden="true">/</span><span className="font-medium text-foreground">{active}</span></div><div className="flex items-center gap-3"><ThemeToggle /><form action={logout} className="lg:hidden"><button type="submit" aria-label="Sign out" title="Sign out" className="rounded-xl border border-border p-2 text-muted-foreground hover:bg-muted hover:text-foreground"><LogOut className="size-4" /></button></form><button aria-label="Settings" className="hidden rounded-xl border border-border p-2 text-muted-foreground hover:bg-muted sm:block"><Settings2 className="size-4" /></button><div title={session?.email ?? undefined} className="grid size-9 place-items-center rounded-full bg-foreground text-xs font-semibold text-background">{initials || "U"}</div></div></header>
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-5 py-8 sm:px-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
