import { expect, type Page } from "@/testing/e2e/playwright-base";
import { portalCopy } from "@/lib/copy/portal-copy";

export type OnboardingProfileInput = {
  fullLegalName?: string;
  nationality?: string;
  countryOfResidence?: string;
  passportIssuingCountry?: string;
  passportNumber?: string;
  entityName?: string;
  jurisdiction?: string;
  phone?: string;
};

/** @deprecated Wizard UI tombstoned — assert unavailable page until rebuild. */
export async function expectClientOnboardingUnavailable(page: Page) {
  await expect(page).toHaveURL(/\/client\/onboarding/);
  await expect(
    page.getByRole("heading", {
      name: portalCopy.clientOnboarding.unavailableTitle,
    }),
  ).toBeVisible({ timeout: 30_000 });
}

/** @deprecated Throws — wizard removed. Use `expectClientOnboardingUnavailable`. */
export async function completeClientOnboardingWizard(
  _page: Page,
  _input: OnboardingProfileInput = {},
) {
  throw new Error(
    "completeClientOnboardingWizard is blocked: onboarding wizard UI is tombstoned. Use expectClientOnboardingUnavailable.",
  );
}
