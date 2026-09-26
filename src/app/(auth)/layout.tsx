import Link from "next/link";
import type { ReactNode } from "react";
import { Layers3 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-background"><header className="flex h-[76px] items-center justify-between border-b border-border px-6"><Link href="/" className="flex items-center gap-2.5"><span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Layers3 className="size-5"/></span><span className="text-sm font-semibold">Prostheia</span></Link><ThemeToggle/></header>{children}</div>;
}
