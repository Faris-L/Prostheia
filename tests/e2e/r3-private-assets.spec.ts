import { expect, test } from "@playwright/test";

test("Dundee-derived private training GLBs require an authenticated session", async ({ request }) => {
  const response = await request.get("/api/private-training-assets/d4000000-0000-5000-8000-000000000001");
  expect(response.status()).toBe(401);
  expect(response.headers()["content-type"]).not.toContain("model/gltf-binary");
});
