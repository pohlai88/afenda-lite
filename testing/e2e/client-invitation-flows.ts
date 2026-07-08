import { expect, type Page } from "@/testing/e2e/playwright-base";
import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { portalCopy } from "@/lib/portal-copy";
import { getClientDefaultPasswordFromEnv } from "@/testing/e2e/credentials";

export type ClientInviteJourney = {
  email: string;
  fullName: string;
  password: string;
  neonAuthInvitationId: string;
  joinUrl: string;
};

export async function signUpOnJoinPage(
  page: Page,
  journey: Pick<ClientInviteJourney, "joinUrl" | "fullName" | "email" | "password">,
) {
  await page.goto(journey.joinUrl);
  await expect(
    page.getByRole("heading", {
      name: portalCopy.clientInvitationJoin.panelCreateTitle,
    }),
  ).toBeVisible({ timeout: 30_000 });

  await page.getByLabel(/display name/i).fill(journey.fullName);
  await page.getByLabel(/^email$/i).fill(journey.email);
  await page.locator('input[name="password"]').fill(journey.password);
  await page.getByRole("button", { name: /create an account/i }).click();

  const { clientInvitationJoin } = portalCopy;
  await expect(
    page.getByRole("heading", {
      name: new RegExp(
        `${clientInvitationJoin.panelVerifyTitle}|${clientInvitationJoin.panelAcceptTitle}`,
        "i",
      ),
    }),
  ).toBeVisible({ timeout: 30_000 });
}

export async function verifyJoinEmailForE2e(page: Page, email: string) {
  await expect
    .poll(
      () => {
        try {
          markTestUserEmailVerified(email);
          return true;
        } catch {
          return false;
        }
      },
      { timeout: 30_000 },
    )
    .toBe(true);

  await page.reload();
  await expect(
    page.getByRole("heading", {
      name: portalCopy.clientInvitationJoin.panelAcceptTitle,
    }),
  ).toBeVisible({ timeout: 30_000 });
}

export async function acceptOrganizationInvitation(page: Page) {
  await expect(
    page.getByRole("heading", {
      name: portalCopy.organizationAuth.acceptInvitationTitle,
    }),
  ).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: /^accept$/i }).click();
  await expect(page).toHaveURL(/\/client\/onboarding/, { timeout: 30_000 });
}

export async function completeClientOnboardingWizard(page: Page, fullName: string) {
  const { clientOnboarding } = portalCopy;

  await expect(
    page.getByRole("heading", { name: clientOnboarding.title }),
  ).toBeVisible({ timeout: 30_000 });

  await page.getByLabel(/full legal name/i).fill(fullName);
  await page.locator('select[name="nationality"]').selectOption("SG");
  await page.locator('select[name="countryOfResidence"]').selectOption("SG");
  await page.getByRole("button", { name: /^continue$/i }).click();

  await page.locator('select[name="passportIssuingCountry"]').selectOption("SG");
  await page.locator('input[name="passportNumber"]').fill("E1234567A");
  await page.getByRole("button", { name: /^continue$/i }).click();

  await page.locator('input[name="entityName"]').fill("E2E Test Entity Pte Ltd");
  await page.locator('input[name="jurisdiction"]').fill("Singapore");
  await page.getByRole("button", { name: /^continue$/i }).click();

  await page.locator('input[name="phone"]').fill("+65 9123 4567");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /save and continue/i }).click();

  await expect(page).toHaveURL(/\/client(?:\/|$)/, { timeout: 30_000 });
}

export async function acknowledgeClientDashboard(page: Page) {
  const { clientDashboard } = portalCopy;

  await page
    .getByRole("checkbox", {
      name: new RegExp(clientDashboard.acknowledgement.switchLabel, "i"),
    })
    .check();
  await page.getByRole("button", { name: /confirm acknowledgement/i }).click();
  await expect(
    page.getByText(/responsibilities acknowledged on/i),
  ).toBeVisible({ timeout: 15_000 });
}

export async function openFirstAssignedDeclaration(page: Page) {
  await page.getByRole("button", { name: /complete declaration/i }).first().click();
  await expect(page).toHaveURL(/\/client\/declare\/.+/);
}

export function requireClientDefaultPassword() {
  const password = getClientDefaultPasswordFromEnv();
  if (!password) {
    throw new Error("Set CLIENT_DEFAULT_PASSWORD for client invitation E2E");
  }
  return password;
}

/** E2E only — Neon org accept requires verified email; OTP inbox is not available in CI. */
export function markTestUserEmailVerified(email: string) {
  execFileSync(
    process.execPath,
    [
      "--env-file=.env",
      resolve(process.cwd(), "scripts/mark-neon-auth-email-verified.mjs"),
      email,
    ],
    { encoding: "utf8" },
  );
}
