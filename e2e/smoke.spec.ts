import { test, expect } from "@playwright/test";

test.describe("Smoke", () => {
  test("health endpoint responde", async ({ request }) => {
    const res = await request.get("/api/health");
    const body = await res.json();
    expect(body).toHaveProperty("status");
    expect(["healthy", "unhealthy"]).toContain(body.status);
  });

  test("dashboard requer autenticação", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).not.toHaveURL(/\/dashboard/, { timeout: 10000 });
  });
});
