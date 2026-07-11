/**
 * Gate 7 prep smoke — flag=false production checks after DB cutover.
 * Usage: node --env-file=.env scripts/gate-7-cutover-smoke.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.GATE7_SMOKE_BASE_URL ?? "https://iam-check.vercel.app";
const adminEmail = process.env.SHARED_ADMIN_EMAIL;
const adminPassword = process.env.SHARED_ADMIN_PASSWORD;
const salesEmail = process.env.PREVIEW_CLIENT_EMAIL;
const salesPassword =
  process.env.PREVIEW_CLIENT_PASSWORD ?? process.env.CLIENT_DEFAULT_PASSWORD;

function requireCreds() {
  const missing = [];
  if (!adminEmail || !adminPassword) missing.push("SHARED_ADMIN_*");
  if (!salesEmail || !salesPassword) missing.push("PREVIEW_CLIENT_* / CLIENT_DEFAULT_PASSWORD");
  if (missing.length) {
    throw new Error(`Missing env: ${missing.join(", ")}`);
  }
}

async function signIn(page, email, password) {
  await page.goto(`${BASE}/auth/sign-in`);
  await page.getByLabel(/^email$/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole("button", { name: /^(sign in|login)$/i }).click();
  await page.waitForURL((url) => !url.pathname.includes("/auth/sign-in"), {
    timeout: 45_000,
  });
}

async function main() {
  requireCreds();
  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    const salesContext = await browser.newContext();
    const salesPage = await salesContext.newPage();
    await signIn(salesPage, salesEmail, salesPassword);
    await salesPage.goto(`${BASE}/fft/vi/events`);
    await salesPage.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    const salesUrl = salesPage.url();
    const salesPass =
      salesUrl.includes("/fft/vi/events") && !salesUrl.includes("/client");
    results.push({
      check: "sales /fft/vi/events (no /client bounce)",
      pass: salesPass,
      url: salesUrl,
    });

    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await signIn(adminPage, adminEmail, adminPassword);
    await adminPage.goto(`${BASE}/fft/vi/admin/events`);
    await adminPage.waitForLoadState("networkidle", { timeout: 30_000 }).catch(() => {});
    const adminUrl = adminPage.url();
    const adminPass = adminUrl.includes("/fft/vi/admin/events");
    results.push({
      check: "admin /fft/vi/admin/events",
      pass: adminPass,
      url: adminUrl,
    });

    await salesContext.close();
    await adminContext.close();
  } finally {
    await browser.close();
  }

  console.log(`Gate 7 cutover smoke @ ${BASE}`);
  for (const row of results) {
    console.log(`${row.pass ? "PASS" : "FAIL"} — ${row.check}`);
    console.log(`  url: ${row.url}`);
  }

  const allPass = results.every((row) => row.pass);
  process.exit(allPass ? 0 : 1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
