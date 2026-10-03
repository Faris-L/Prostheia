import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

test("marketing shell and minimal R3F smoke route render", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /dental cad practice, built around the way you learn/i })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Practice" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Get started" }).first()).toHaveAttribute("href", "/signup");

  await page.goto("/three-smoke");
  await expect(page.getByRole("heading", { name: "3D stack check" })).toBeVisible();
  await expect(page.locator("canvas[data-renderer-ready='true']")).toBeVisible();
});

test("public responses include the application's baseline security headers", async ({ page }) => {
  const response = await page.goto("/");
  expect(response).not.toBeNull();
  const headers = response!.headers();
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["x-frame-options"]).toBe("DENY");
  expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
  expect(headers["permissions-policy"]).toContain("camera=()");
  expect(headers["content-security-policy"]).toContain("object-src 'none'");
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
});

test("unauthenticated users are redirected from protected routes", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: "Log in to Prostheia" })).toBeVisible();
});

test("unauthenticated users cannot open a private Practice result", async ({ page }) => {
  await page.goto(`/results/${randomUUID()}`);
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: "Log in to Prostheia" })).toBeVisible();
});

test("unauthenticated users cannot open Admin routes", async ({ page }) => {
  for (const route of ["/admin", "/admin/lessons", "/admin/scenarios", "/admin/assets"]) {
    await page.goto(route);
    await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
    await expect(page.getByRole("heading", { name: "Log in to Prostheia" })).toBeVisible();
  }
});

test("unauthenticated users cannot open the Phase 5 CAD workspace demo", async ({ page }) => {
  await page.goto("/workspace/demo");
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: "Log in to Prostheia" })).toBeVisible();
});

test("unauthenticated users cannot open a guided Practice lesson", async ({ page }) => {
  await page.goto("/practice/developer-move-and-position");
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: "Log in to Prostheia" })).toBeVisible();
});

test("Free Lab entry and workspace stay behind the existing authentication guard", async ({ page }) => {
  await page.goto("/free-lab");
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: "Log in to Prostheia" })).toBeVisible();

  await page.goto("/free-lab/workspace/test-workspace-id");
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
});

test("confirmation endpoint rejects missing tokens without leaking a credential", async ({ page }) => {
  await page.goto("/auth/confirm");
  await expect(page).toHaveURL(/\/login\?error=confirmation$/);
  await expect(page.getByRole("heading", { name: "Log in to Prostheia" })).toBeVisible();
});

test("sign-up and sign-in forms are connected to the authentication flow", async ({ page }) => {
  await page.goto("/signup");
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible();
  await expect(page.getByLabel("Name")).toHaveAttribute("name", "displayName");
  await expect(page.getByLabel("Email address")).toHaveAttribute("name", "email");
  await expect(page.getByLabel("Password")).toHaveAttribute("name", "password");

  await page.getByRole("link", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Log in to Prostheia" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue" })).toHaveAttribute("type", "submit");
});

test("sign-in action reaches Supabase and handles an unknown account safely", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email address").fill(`phase3-${randomUUID()}@example.invalid`);
  await page.getByLabel("Password").fill("NotARealPassword123!");
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page).toHaveURL(/\/login\?error=credentials$/);
  await expect(page.locator('p[role="alert"]')).toHaveText("Email or password is incorrect.");
});
