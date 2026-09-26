import { expect, test } from "@playwright/test";
import { randomUUID } from "node:crypto";

test("marketing shell and minimal R3F smoke route render", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /learn the craft of digital dental design/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create account" })).toBeVisible();

  await page.goto("/three-smoke");
  await expect(page.getByRole("heading", { name: "3D stack check" })).toBeVisible();
  await expect(page.locator("canvas[data-renderer-ready='true']")).toBeVisible();
});

test("unauthenticated users are redirected from protected routes", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: "Log in to Prostheia" })).toBeVisible();
});

test("unauthenticated users cannot open the Phase 5 CAD workspace demo", async ({ page }) => {
  await page.goto("/workspace/demo");
  await expect(page).toHaveURL(/\/login(?:\?.*)?$/);
  await expect(page.getByRole("heading", { name: "Log in to Prostheia" })).toBeVisible();
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
