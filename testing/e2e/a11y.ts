import AxeBuilder from "@axe-core/playwright";
import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

/** Must match `apps/web/features/auth/main-content.ts` MAIN_CONTENT_ID. */
export const E2E_MAIN_CONTENT_HASH = "#main-content";

/**
 * Run axe WCAG 2.1 A/AA on the current page; fail with serious/critical summaries.
 */
export async function expectNoAxeViolations(page: Page): Promise<void> {
	const results = await new AxeBuilder({ page })
		.withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
		.analyze();
	const serious = results.violations.filter(
		(v) => v.impact === "critical" || v.impact === "serious",
	);
	expect(
		serious,
		serious
			.map(
				(v) =>
					`${v.id} (${v.impact}): ${v.help} — ${v.nodes
						.slice(0, 3)
						.map((n) => n.target.join(" "))
						.join("; ")}`,
			)
			.join("\n"),
	).toEqual([]);
}

/**
 * Skip link is first in DOM focus order; activating it moves focus to #main-content.
 * Uses DOM-order assertion (not keyboard Tab) so Neon Auth autofocus cannot steal the proof.
 */
export async function expectSkipLinkFocusOwnership(page: Page): Promise<void> {
	const skip = page.getByRole("link", { name: "Skip to main content" });
	await expect(skip).toBeAttached();

	const firstFocusableHref = await page.evaluate(() => {
		const selector =
			'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
		const el = document.querySelector(selector);
		return el instanceof HTMLAnchorElement ? el.getAttribute("href") : null;
	});
	expect(firstFocusableHref).toBe(E2E_MAIN_CONTENT_HASH);

	await skip.focus();
	await expect(skip).toBeFocused();
	await skip.press("Enter");
	const main = page.locator(E2E_MAIN_CONTENT_HASH);
	await expect(main).toBeVisible();
	await expect(main).toBeFocused();
}
