import { expect, test } from "@playwright/test";
import {
  getOperatorCreds,
  loginAsOperator,
  operatorSkipMessage,
  requireOperatorCreds,
} from "./helpers/operator";
import {
  isPlaygroundEnabledForTests,
  playgroundScreenFixtures,
  playgroundSkipMessage,
} from "./helpers/playground";

const operatorCreds = getOperatorCreds();
const playgroundEnabled = isPlaygroundEnabledForTests();

test.describe("Playground nav and iframe binding", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(() => {
    test.skip(!operatorCreds, operatorSkipMessage);
    test.skip(!playgroundEnabled, playgroundSkipMessage);
  });

  test.beforeEach(async ({ page }) => {
    await loginAsOperator(page, requireOperatorCreds());
    await page.goto("/playground");
    await expect(page).toHaveURL(/\/playground\/admin-dashboard/);
  });

  for (const screen of playgroundScreenFixtures) {
    test(`binds ${screen.id} nav to iframe target`, async ({ page }) => {
      await page.getByRole("link", { name: screen.label, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`/playground/${screen.id}$`));

      const iframe = page.locator(`iframe[data-playground-screen-id="${screen.id}"]`);
      await expect(iframe).toHaveAttribute(
        "data-playground-target-path",
        screen.path,
      );
      await expect(iframe).toHaveAttribute(
        "data-playground-embed-url",
        screen.embedUrl,
      );

      const pathConfigured =
        !screen.path.includes("{PLAYGROUND_") &&
        !(screen.path.endsWith("/") && screen.path !== "/");

      if (!pathConfigured) {
        await expect(page.locator("[data-playground-config-warning]")).toBeVisible();
        return;
      }

      await expect(iframe).toHaveAttribute("src", screen.embedUrl);

      const frame = page.frameLocator(
        `iframe[data-playground-screen-id="${screen.id}"]`,
      );
      await expect(frame.locator("body")).toContainText(screen.iframeMarker, {
        timeout: 15_000,
      });

      if (screen.requiredHeading) {
        await expect(
          frame.getByRole("heading", { name: screen.requiredHeading }),
        ).toBeVisible();
      }
    });
  }
});
