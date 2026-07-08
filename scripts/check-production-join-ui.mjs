import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { chromium } from "@playwright/test";
import { loadEnvFile, getEnv } from "./lib/load-env.mjs";

const password = getEnv("CLIENT_DEFAULT_PASSWORD", loadEnvFile());
const email = `deploy-check-${Date.now()}@iam-check.com`;
const out = execFileSync(
  process.execPath,
  ["--env-file=.env", resolve("scripts/live-org-invite.mjs"), email, "Deploy Check"],
  { encoding: "utf8" },
);
const invite = JSON.parse(out.slice(out.indexOf("{"), out.lastIndexOf("}") + 1));

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
await page.goto(invite.joinUrl);
await page.getByLabel(/display name/i).fill("Deploy Check");
await page.getByLabel(/^email$/i).fill(email);
await page.locator('input[name="password"]').fill(password);
await page.getByRole("button", { name: /create an account/i }).click();
await page.waitForTimeout(6000);

const headings = await page.locator("h2").allTextContents();
const compactSteps = await page
  .locator('ol[aria-label="Registration steps"] li')
  .allTextContents()
  .catch(() => []);

console.log(
  JSON.stringify(
    {
      url: page.url(),
      headings,
      compactSteps,
      hasVerifyStep: compactSteps.some((s) => /verify email/i.test(s)),
    },
    null,
    2,
  ),
);

await browser.close();
