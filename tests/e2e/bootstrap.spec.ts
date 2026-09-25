import { expect, test } from "@playwright/test";

test("home and minimal R3F smoke route render", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Project bootstrap" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open the 3D stack check" })).toBeVisible();

  await page.getByRole("link", { name: "Open the 3D stack check" }).click();
  await expect(page.getByRole("heading", { name: "3D stack check" })).toBeVisible();
  await expect(page.locator("canvas[data-renderer-ready='true']")).toBeVisible();
});
