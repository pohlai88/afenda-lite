import type { Page } from "@/testing/e2e/playwright-base";

/** Radix Select combobox — not a native `<select>`. */
export async function selectRadixOption(
  page: Page,
  triggerLabel: RegExp,
  optionLabel: string | RegExp,
) {
  await page.getByLabel(triggerLabel).click();
  await page.getByRole("option", { name: optionLabel }).click();
}
