/**
 * Capture production client invitation journey screenshots for docs/runbooks/assets.
 *
 * Run:
 *   npm run env:compose
 *   node scripts/capture-client-journey-screenshots.mjs
 */
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { chromium } from "@playwright/test";
import { loadEnvFile, getEnv } from "./lib/load-env.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const assetsDir = resolve(__dirname, "../docs/runbooks/assets");
const appUrl = (getEnv("APP_URL", loadEnvFile()) ?? "https://iam-check.vercel.app").replace(
  /\/$/,
  "",
);
const password = getEnv("CLIENT_DEFAULT_PASSWORD", loadEnvFile());

if (!password) {
  throw new Error("CLIENT_DEFAULT_PASSWORD is required in .env");
}

mkdirSync(assetsDir, { recursive: true });

function issueInvite(email, fullName) {
  const output = execFileSync(
    process.execPath,
    ["--env-file=.env", resolve(__dirname, "live-org-invite.mjs"), email, fullName],
    { encoding: "utf8" },
  );
  const start = output.indexOf("{");
  const end = output.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error(`live-org-invite did not return JSON:\n${output}`);
  }
  return JSON.parse(output.slice(start, end + 1));
}

function markEmailVerified(email) {
  execFileSync(
    process.execPath,
    ["--env-file=.env", resolve(__dirname, "mark-neon-auth-email-verified.mjs"), email],
    { encoding: "utf8" },
  );
}

async function shot(page, name) {
  const path = resolve(assetsDir, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  console.log(`saved ${path}`);
}

async function main() {
  const stamp = Date.now();
  const email = `journey-capture-${stamp}@iam-check.com`;
  const fullName = "Journey Capture Client";

  const invite = issueInvite(email, fullName);
  if (!invite.success || !invite.joinUrl) {
    throw new Error(`Invite failed: ${JSON.stringify(invite)}`);
  }

  console.log(
    JSON.stringify({
      phase: 1,
      verification: "neon_auth.invitation pending + org email dispatched",
      neonAuthInvitationId: invite.neonAuthInvitationId,
      joinUrl: invite.joinUrl,
    }),
  );

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    baseURL: appUrl,
  });
  const page = await context.newPage();

  try {
    await page.goto(invite.joinUrl);
    await page.getByRole("heading", { name: /step 1 — create your account/i }).waitFor({
      timeout: 30_000,
    });
    await shot(page, "phase-02-join-signup");

    await page.getByLabel(/display name/i).fill(fullName);
    await page.getByLabel(/^email$/i).fill(email);
    await page.locator('input[name="password"]').fill(password);
    await shot(page, "phase-03-signup-filled");
    await page.getByRole("button", { name: /create an account/i }).click();

    const verifyHeading = page.getByRole("heading", { name: /step 2 — verify your email/i });
    const acceptHeading = page.getByRole("heading", { name: /^accept invitation$/i });
    await verifyHeading.or(acceptHeading).waitFor({ timeout: 30_000 });

    if (await verifyHeading.isVisible().catch(() => false)) {
      await shot(page, "phase-04-verify-email");
      markEmailVerified(email);
      await page.reload();
    } else {
      markEmailVerified(email);
      await page.reload();
    }

    await page.getByRole("heading", { name: /step 3 — accept invitation|accept invitation/i }).waitFor({
      timeout: 30_000,
    });
    await shot(page, "phase-05-accept-invitation");
    await page.getByRole("button", { name: /^accept$/i }).click();
    await page.getByRole("heading", { name: /establish your declarant identity/i }).waitFor({
      timeout: 30_000,
    });

    await shot(page, "phase-06-onboarding");
    await page.getByLabel(/full legal name/i).fill(fullName);
    await page.locator('select[name="nationality"]').selectOption("SG");
    await page.locator('select[name="countryOfResidence"]').selectOption("SG");
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.locator('select[name="passportIssuingCountry"]').selectOption("SG");
    await page.locator('input[name="passportNumber"]').fill("E1234567A");
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.locator('input[name="entityName"]').fill("Journey Capture Entity");
    await page.locator('input[name="jurisdiction"]').fill("Singapore");
    await page.getByRole("button", { name: /^continue$/i }).click();
    await page.locator('input[name="phone"]').fill("+65 9123 4567");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: /save and continue/i }).click();
    await page.waitForURL(/\/client(?:\/|$)/, { timeout: 30_000 });

    await shot(page, "phase-07-client-dashboard");
    await page
      .getByRole("checkbox", {
        name: /I have read and understand my responsibilities/i,
      })
      .check();
    await page.getByRole("button", { name: /confirm acknowledgement/i }).click();
    await page.getByText(/responsibilities acknowledged on/i).waitFor({ timeout: 15_000 });

    await page.getByRole("button", { name: /complete declaration/i }).first().click();
    await page.waitForURL(/\/client\/declare\/.+/);
    await shot(page, "phase-08-declaration-workspace");

    console.log(JSON.stringify({ success: true, email, joinUrl: invite.joinUrl }));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
