"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const ThreeSmokeScene = dynamic(
  () => import("@/components/three-smoke-scene").then((module) => module.ThreeSmokeScene),
  { ssr: false, loading: () => <div className="h-[28rem] animate-pulse rounded-xl bg-muted" /> },
);

export default function ThreeSmokePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-6 py-12">
      <Button asChild variant="outline" className="w-fit">
        <Link href="/">Back to bootstrap</Link>
      </Button>
      <div>
        <h1 className="text-2xl font-semibold">3D stack check</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Minimal React Three Fiber object used only to verify the rendering stack.
        </p>
      </div>
      <ThreeSmokeScene />
    </main>
  );
}
