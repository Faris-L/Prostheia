import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-start justify-center gap-6 px-6 py-16">
      <p className="text-sm font-medium tracking-wide text-muted-foreground">
        Prostheia · Digital Dental Design Studio
      </p>
      <h1 className="text-4xl font-semibold tracking-tight">Project bootstrap</h1>
      <p className="max-w-xl text-muted-foreground">
        Phase 1 infrastructure check. Product workflows will be added in later phases.
      </p>
      <Button asChild>
        <Link href="/three-smoke">Open the 3D stack check</Link>
      </Button>
    </main>
  );
}
