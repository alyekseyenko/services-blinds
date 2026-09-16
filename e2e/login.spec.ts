import { test, expect } from '@playwright/test';

test('login page loads and has correct title', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await expect(page).toHaveTitle(/ESTORESRAINHA/);
});

test('shows simplified twenty login form', async ({ page }) => {
  await page.goto('http://localhost:3000');

  await expect(page.getByText('Acesso com conta Twenty CRM')).toBeVisible();
  await expect(page.locator('input[type="email"]')).toBeVisible();
  await expect(page.locator('input[type="password"]')).toBeVisible();
  await expect(page.locator('button[type="submit"]')).toBeVisible();
});

test('shows error on invalid login', async ({ page }) => {
  await page.goto('http://localhost:3000');

  await page.fill('input[type="email"]', 'test@wrong.com');
  await page.fill('input[type="password"]', 'wrongpass');
  await page.click('button[type="submit"]');

  await expect(page.getByText(/Acesso Recusado|Credenciais incorretas/i)).toBeVisible({
    timeout: 10000,
  });
});
