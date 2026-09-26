import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const authMocks = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  createServerSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: authMocks.createServerSupabaseClient,
}));

import { GET } from "@/app/(auth)/auth/confirm/route";

const request = (query: string) => new NextRequest(`http://localhost:3000/auth/confirm${query}`);

beforeEach(() => {
  vi.clearAllMocks();
  authMocks.createServerSupabaseClient.mockResolvedValue({
    auth: {
      verifyOtp: authMocks.verifyOtp,
      exchangeCodeForSession: authMocks.exchangeCodeForSession,
    },
  });
  authMocks.verifyOtp.mockResolvedValue({ error: null });
  authMocks.exchangeCodeForSession.mockResolvedValue({ error: null });
});

describe("email confirmation route", () => {
  it("verifies the token hash, creates the SSR session, and removes the secret from the redirect", async () => {
    const response = await GET(request("?token_hash=one-time-secret&type=email"));

    expect(authMocks.verifyOtp).toHaveBeenCalledWith({ token_hash: "one-time-secret", type: "email" });
    expect(authMocks.exchangeCodeForSession).not.toHaveBeenCalled();
    expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard");
    expect(response.headers.get("location")).not.toContain("one-time-secret");
  });

  it("keeps previously sent PKCE confirmation links working during template migration", async () => {
    const response = await GET(request("?code=old-pkce-code"));

    expect(authMocks.exchangeCodeForSession).toHaveBeenCalledWith("old-pkce-code");
    expect(response.headers.get("location")).toBe("http://localhost:3000/dashboard");
    expect(response.headers.get("location")).not.toContain("old-pkce-code");
  });

  it("rejects missing or invalid confirmation parameters without contacting Supabase", async () => {
    const missing = await GET(request(""));
    const wrongType = await GET(request("?token_hash=secret&type=signup"));

    expect(authMocks.createServerSupabaseClient).not.toHaveBeenCalled();
    expect(missing.headers.get("location")).toBe("http://localhost:3000/login?error=confirmation");
    expect(wrongType.headers.get("location")).toBe("http://localhost:3000/login?error=confirmation");
    expect(wrongType.headers.get("location")).not.toContain("secret");
  });

  it("returns a clean error redirect for an expired or invalid token", async () => {
    authMocks.verifyOtp.mockResolvedValue({ error: new Error("expired token") });
    const response = await GET(request("?token_hash=expired-secret&type=email"));

    expect(response.headers.get("location")).toBe("http://localhost:3000/login?error=confirmation");
    expect(response.headers.get("location")).not.toContain("expired-secret");
  });
});
