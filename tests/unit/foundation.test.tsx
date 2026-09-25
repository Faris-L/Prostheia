import "fake-indexeddb/auto";
import { render, screen } from "@testing-library/react";
import { Button } from "@/components/ui/button";
import { localDb } from "@/lib/local-db";
import { create } from "zustand";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";
import { afterAll, describe, expect, it } from "vitest";

const useFoundationStore = create<{ ready: boolean }>(() => ({ ready: true }));

describe("Phase 1 foundations", () => {
  afterAll(async () => {
    await localDb.delete();
  });

  it("renders a shadcn button and loads Zustand and Supabase entry points", () => {
    render(<Button>Foundation button</Button>);

    expect(screen.getByRole("button", { name: "Foundation button" })).toBeTruthy();
    expect(useFoundationStore.getState().ready).toBe(true);
    expect(createClient).toBeTypeOf("function");
    expect(createServerClient).toBeTypeOf("function");
    expect(z.string().parse("ready")).toBe("ready");
  });

  it("opens the Dexie IndexedDB database and writes recovery metadata", async () => {
    await localDb.open();
    await localDb.recoveryMetadata.put({ key: "bootstrap", savedAt: 1 });

    expect(await localDb.recoveryMetadata.get("bootstrap")).toEqual({
      key: "bootstrap",
      savedAt: 1,
    });
  });
});
