import { expect, type Page } from "@/testing/e2e/playwright-base";
import { portalCopy } from "@/lib/portal-copy";

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

export async function completeClientOnboardingWizard(
  page: Page,
  input: OnboardingProfileInput = {},
) {
  const copy = portalCopy.clientOnboarding;

  await expect(page).toHaveURL(/\/client\/onboarding/);

  await page
    .getByLabel(new RegExp(copy.fullLegalNameLabel, "i"))
    .fill(input.fullLegalName ?? "E2E Onboarding Declarant");
  await page.locator('select[name="nationality"]').selectOption(
    input.nationality ?? "SG",
  );
  await page.locator('select[name="countryOfResidence"]').selectOption(
    input.countryOfResidence ?? "SG",
  );
  await page.getByRole("button", { name: new RegExp(copy.formNextStep, "i") }).click();

  await page.locator('select[name="passportIssuingCountry"]').selectOption(
    input.passportIssuingCountry ?? "SG",
  );
  await page
    .getByLabel(new RegExp(copy.passportNumberLabel, "i"))
    .fill(input.passportNumber ?? "E1234567");
  await page.getByRole("button", { name: new RegExp(copy.formNextStep, "i") }).click();

  await page
    .getByLabel(new RegExp(copy.entityLabel, "i"))
    .fill(input.entityName ?? "E2E Holdings Pte. Ltd.");
  await page
    .getByLabel(new RegExp(copy.jurisdictionLabel, "i"))
    .fill(input.jurisdiction ?? "Singapore");
  await page.getByRole("button", { name: new RegExp(copy.formNextStep, "i") }).click();

  await page
    .getByLabel(new RegExp(copy.phoneLabel, "i"))
    .fill(input.phone ?? "+65 9123 4567");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: new RegExp(copy.submit, "i") }).click();

  await expect(page).toHaveURL(/\/client\/?$/);
}
