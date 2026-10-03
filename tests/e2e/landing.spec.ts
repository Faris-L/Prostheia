import { expect, test } from "@playwright/test";

test("public landing explains the real product and links to auth routes", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Dental CAD practice");
  await expect(page.getByText("Synthetic training geometry", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Practice", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Free Lab", exact: true })).toBeVisible();
  await expect(page.getByText("Complete Denture", { exact: true })).toBeVisible();
  await expect(page.getByText("Partial Denture", { exact: true })).toBeVisible();
  await expect(page.getByText(/not for diagnosis, treatment planning/i)).toBeVisible();

  await page.getByRole("link", { name: "Sign in" }).first().click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto("/");
  await page.getByRole("link", { name: "Get started" }).first().click();
  await expect(page).toHaveURL(/\/signup$/);
});

test("landing language uses the shared persisted EN/SR preference", async ({ page }) => {
  await page.goto("/");
  const languageToggle = page.getByRole("button", { name: "Switch language: Serbian" });
  await languageToggle.click();

  await expect(page.getByRole("heading", { level: 1 })).toContainText("Vežbajte dentalni CAD");
  await expect(page.locator("html")).toHaveAttribute("lang", "sr");
  await expect(page.getByRole("link", { name: "Prijava" }).first()).toHaveAttribute("href", "/login");
  await expect(page.getByRole("link", { name: "Započnite" }).first()).toHaveAttribute("href", "/signup");
  await expect(page.getByText("Parcijalna proteza", { exact: true })).toBeVisible();
  await expect(page.getByText(/nije namenjen dijagnostici/i)).toBeVisible();
  await expect(page.evaluate(() => localStorage.getItem("prostheia.locale"))).resolves.toBe("sr");

  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Vežbajte dentalni CAD");
  await page.getByRole("button", { name: "Promeni jezik: Engleski" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Dental CAD practice");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("public landing has no horizontal overflow at desktop, tablet, and mobile widths", async ({ page }) => {
  await page.goto("/");

  for (const width of [1440, 1024, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }

  await expect(page.getByRole("navigation", { name: "Product navigation" })).toBeVisible();
});
