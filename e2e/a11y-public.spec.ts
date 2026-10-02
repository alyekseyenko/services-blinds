import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("contraste e acessibilidade — páginas públicas", () => {
  test("login — sem violações críticas de contraste", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2aa", "wcag21aa"])
      .analyze();
    const contrast = results.violations.filter((v) => v.id === "color-contrast");
    expect(contrast).toEqual([]);
  });

  test("portal avaliação (link inválido) — sem violações críticas de contraste", async ({
    page,
  }) => {
    await page.goto("/avaliacao/demo-invalid");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2aa", "wcag21aa"])
      .analyze();
    const contrast = results.violations.filter((v) => v.id === "color-contrast");
    expect(contrast).toEqual([]);
  });

  test("portal cancelamento (link inválido) — sem violações críticas de contraste", async ({
    page,
  }) => {
    await page.goto("/cancelamento/demo-invalid");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2aa", "wcag21aa"])
      .analyze();
    const contrast = results.violations.filter((v) => v.id === "color-contrast");
    expect(contrast).toEqual([]);
  });
});
