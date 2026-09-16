import { chromium, devices } from "playwright";
import { existsSync, readFileSync, mkdirSync } from "fs";
import { join } from "path";

const BASE = process.env.SCREENSHOT_BASE_URL || "https://tecnicos.estoresrainha.com";
const OUT_DIR = join(process.cwd(), "docs", "screenshots");

function loadEnvFile(filename) {
  const path = join(process.cwd(), filename);
  if (!existsSync(path)) return {};
  const env = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return env;
}

async function capture(page, fileName, url, options = {}) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  if (options.waitMs) await page.waitForTimeout(options.waitMs);
  if (options.selector) {
    await page.waitForSelector(options.selector, { timeout: options.selectorTimeout ?? 20000 });
  }
  await page.screenshot({
    path: join(OUT_DIR, fileName),
    fullPage: Boolean(options.fullPage),
  });
  console.log(`saved ${fileName}`);
}

async function tryLogin(page, email, password) {
  await page.goto(BASE, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);
  return page.url();
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });
  const env = { ...loadEnvFile(".env.example"), ...loadEnvFile(".env.local") };

  const browser = await chromium.launch({ headless: true });
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const desktopPage = await desktop.newPage();

  await capture(desktopPage, "login-desktop.png", BASE, { waitMs: 1500 });

  const mobileContext = await browser.newContext({ ...devices["iPhone 13"] });
  const mobilePage = await mobileContext.newPage();
  await capture(mobilePage, "login-mobile.png", BASE, { waitMs: 1500 });

  await capture(
    desktopPage,
    "public-rating-invalid-link.png",
    `${BASE}/avaliacao/550e8400-e29b-41d4-a716-446655440000`,
    { waitMs: 1000 }
  );

  await capture(
    desktopPage,
    "public-rating-form.png",
    `${BASE}/avaliacao/550e8400-e29b-41d4-a716-446655440000?t=demo-token`,
    { waitMs: 1000 }
  );

  await capture(
    desktopPage,
    "public-cancellation-invalid-link.png",
    `${BASE}/cancelamento/6ba7b810-9dad-11d1-80b4-00c04fd430c8`,
    { waitMs: 1000 }
  );

  const loginCandidates = [
    { email: env.SCREENSHOT_ADMIN_EMAIL, password: env.SCREENSHOT_ADMIN_PASSWORD, label: "admin" },
    { email: env.E2E_ADMIN_EMAIL, password: env.E2E_ADMIN_PASSWORD, label: "admin" },
    { email: env.E2E_TECH_EMAIL, password: env.E2E_TECH_PASSWORD, label: "technician" },
  ].filter((c) => c.email && c.password);

  for (const candidate of loginCandidates) {
    try {
      const finalUrl = await tryLogin(desktopPage, candidate.email, candidate.password);
      if (!finalUrl.includes("callbackUrl") && finalUrl !== `${BASE}/`) {
        console.log(`authenticated as ${candidate.label}: ${finalUrl}`);
      }

      if (finalUrl.includes("/admin") || candidate.label === "admin") {
        await capture(desktopPage, "admin-map.png", `${BASE}/admin`, { waitMs: 6000 });
        const historyTab = desktopPage.getByRole("button", { name: /histórico/i });
        if (await historyTab.count()) {
          await historyTab.click();
          await desktopPage.waitForTimeout(3000);
          await desktopPage.screenshot({ path: join(OUT_DIR, "admin-history.png") });
          console.log("saved admin-history.png");
        }
        await capture(desktopPage, "ceo-dashboard.png", `${BASE}/ceo`, { waitMs: 6000 });
        await capture(desktopPage, "admin-observability.png", `${BASE}/admin/observabilidade`, {
          waitMs: 4000,
        });
        break;
      }

      if (finalUrl.includes("/dashboard") || candidate.label === "technician") {
        await capture(desktopPage, "technician-dashboard.png", `${BASE}/dashboard`, { waitMs: 5000 });
        break;
      }

      if (finalUrl.includes("/ceo")) {
        await capture(desktopPage, "ceo-dashboard.png", `${BASE}/ceo`, { waitMs: 6000 });
        break;
      }
    } catch (error) {
      console.warn(`skip ${candidate.label} auth screenshots:`, error instanceof Error ? error.message : error);
    }
  }

  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
