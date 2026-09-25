import { test, expect } from '@playwright/test';

test('login page loads and has correct title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Blinds Technical Services/i);
});

test('shows simplified twenty login form', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText(/Entrar com conta Twenty/i)).toBeVisible();
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
});

test('shows error on invalid login', async ({ page }) => {
  await page.goto('/');

  await page.fill('input[type="email"]', 'test@wrong.com');
  await page.fill('input[type="password"]', 'wrongpass');
  await page.click('button[type="submit"]');

  const loginError = page.getByTestId('login-error');
  await expect(loginError).toBeVisible({ timeout: 30000 });
  await expect(loginError).toContainText(
    /Acesso Recusado|Credenciais incorretas|sem permissão|servidor/i
  );
});
