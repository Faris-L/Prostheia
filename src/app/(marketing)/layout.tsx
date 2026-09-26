import Link from "next/link";
import type { ReactNode } from "react";
import { Layers3 } from "lucide-react";

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return <div className="flex min-h-screen flex-col"><header className="border-b border-border"><div className="mx-auto flex h-[76px] max-w-7xl items-center justify-between px-6"><Link href="/" className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Layers3 className="size-5"/></span><span className="text-sm font-semibold">Prostheia</span></Link><nav className="flex items-center gap-5 text-sm"><Link className="text-muted-foreground hover:text-foreground" href="/login">Log in</Link><Link className="rounded-xl bg-primary px-4 py-2.5 font-medium text-primary-foreground" href="/signup">Create account</Link></nav></div></header>{children}<footer className="mt-auto border-t border-border"><div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-6 text-xs text-muted-foreground"><span>© 2026 Prostheia · Digital Dental Design Studio</span><span>Educational design environment</span></div></footer></div>;
}
