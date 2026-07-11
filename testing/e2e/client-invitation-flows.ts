import { expect, type Page } from "@/testing/e2e/playwright-base";
import { portalCopy } from "@/modules/platform/copy/portal-copy";
import { authSignInHref, buildClientJoinHref } from "@/modules/platform/routing/portal-routes";
import { getClientDefaultPasswordFromEnv } from "@/testing/e2e/credentials";
import { runNodeScript } from "@/testing/e2e/run-node-script";

export type ClientInviteJourney = {
  email: string;
  fullName: string;
  password: string;
  neonAuthInvitationId: string;
  joinUrl: string;
};

function joinPanelHeading(page: Page) {
  return page.locator("#client-invitation-heading");
}

async function expectJoinStep(
  page: Page,
  pattern: string | RegExp,
  timeout = 30_000,
) {
  await expect(joinPanelHeading(page)).toHaveText(pattern, { timeout });
}

export async function signUpOnJoinPage(
  page: Page,
  journey: Pick<
    ClientInviteJourney,
    "joinUrl" | "fullName" | "email" | "password" | "neonAuthInvitationId"
  >,
) {
  const { clientInvitationJoin } = portalCopy;
  const joinPath = buildClientJoinHref(journey.neonAuthInvitationId);

  createNeonAuthUserForE2e(journey.email, journey.password, journey.fullName);
  markTestUserEmailVerified(journey.email);

  await page.goto(authSignInHref({ returnTo: joinPath }));
  await page.getByLabel(/^email$/i).fill(journey.email);
  await page.locator('input[name="password"]').fill(journey.password);
  await page.getByRole("button", { name: /^(sign in|login)$/i }).click();

  await expect
    .poll(
      async () => {
        const url = page.url();
        return (
          url.includes("/join") ||
          url.includes("/client/onboarding") ||
          /\/client\/?$/.test(url)
        );
      },
      { timeout: 60_000 },
    )
    .toBe(true);

  if (page.url().includes("/join")) {
    await expectJoinStep(page, clientInvitationJoin.panelAcceptTitle, 60_000);
  }
}

export async function verifyJoinEmailForE2e(page: Page, email: string) {
  if (!page.url().includes("/join")) {
    return;
  }

  markTestUserEmailVerified(email);
  await page.reload();

  if (!page.url().includes("/join")) {
    return;
  }

  await expectJoinStep(page, portalCopy.clientInvitationJoin.panelAcceptTitle);
}

export async function acceptOrganizationInvitation(page: Page) {
  if (page.url().includes("/client/onboarding")) {
    return;
  }

  await expect(
    page.getByRole("heading", {
      name: portalCopy.organizationAuth.acceptInvitationTitle,
    }).first(),
  ).toBeVisible({ timeout: 30_000 });

  await page.getByRole("button", { name: /^accept$/i }).click();
  await expect(page).toHaveURL(/\/client\/onboarding/, { timeout: 30_000 });
}

export {
  completeClientOnboardingWizard,
  expectClientOnboardingUnavailable,
} from "@/testing/e2e/onboarding-flows";

export async function acknowledgeClientDashboard(page: Page) {
  const { clientDashboard } = portalCopy;

  await page
    .getByRole("checkbox", {
      name: new RegExp(clientDashboard.acknowledgement.switchLabel, "i"),
    })
    .check();
  await page.getByRole("button", { name: /confirm acknowledgement/i }).click();
  await expect
    .poll(
      async () => {
        if (
          await page
            .getByText(/responsibilities acknowledged on/i)
            .isVisible()
            .catch(() => false)
        ) {
          return true;
        }
        await page.reload({ waitUntil: "domcontentloaded" });
        return page
          .getByText(/responsibilities acknowledged on/i)
          .isVisible()
          .catch(() => false);
      },
      { timeout: 30_000 },
    )
    .toBe(true);
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
export function createNeonAuthUserForE2e(
  email: string,
  password: string,
  fullName: string,
) {
  runNodeScript("scripts/e2e-join-sign-up.mjs", [email, password, fullName]);
}

/** E2E only — marks verified after API sign-up (no OTP inbox in CI). */
export function markTestUserEmailVerified(email: string) {
  runNodeScript("scripts/mark-neon-auth-email-verified.mjs", [email]);
}
