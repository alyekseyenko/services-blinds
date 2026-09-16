import { test, expect } from "@playwright/test";

const hasTechCredentials = Boolean(process.env.E2E_TECH_EMAIL && process.env.E2E_TECH_PASSWORD);

test.describe("Fluxo técnico", () => {
  test.skip(!hasTechCredentials, "Requer E2E_TECH_EMAIL e E2E_TECH_PASSWORD");

  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.fill('input[type="email"]', process.env.E2E_TECH_EMAIL!);
    await page.fill('input[type="password"]', process.env.E2E_TECH_PASSWORD!);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|admin|ceo|armazem)/, { timeout: 30000 });
  });

  test("dashboard carrega agenda do técnico", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText(/visitas|agenda|mapa|lista/i).first()).toBeVisible({
      timeout: 20000,
    });
  });

  test("aba medições acessível em visita de medição", async ({ page }) => {
    await page.goto("/dashboard");

    const taskCard = page.locator('[class*="rounded-[2rem]"]').first();
    if (!(await taskCard.isVisible({ timeout: 10000 }).catch(() => false))) {
      test.skip(true, "Sem tarefas agendadas para o técnico de teste");
      return;
    }

    await taskCard.click();

    const measurementsTab = page.getByRole("button", { name: /medições/i });
    if (!(await measurementsTab.isVisible({ timeout: 5000 }).catch(() => false))) {
      test.skip(true, "Tarefa aberta não é de medição");
      return;
    }

    await measurementsTab.click();
    await expect(page.getByText(/gestão de medidas|novo prod/i).first()).toBeVisible({
      timeout: 10000,
    });
    await expect(page.getByRole("button", { name: /guardar/i })).toBeVisible();
  });
});
