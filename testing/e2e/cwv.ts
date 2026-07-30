import type { Page } from "@playwright/test";

export interface LabCwvSample {
	cls: number;
	/** Trusted click dispatch → next animation-frame proxy. */
	inpMs: number;
	lcpMs: number;
}

/**
 * Collect lab LCP / CLS / interaction latency after navigation has settled.
 */
export async function collectLabCwvs(page: Page): Promise<LabCwvSample> {
	await page.waitForLoadState("networkidle").catch(() => undefined);
	await page.waitForTimeout(400);

	const paint = await page.evaluate(() => {
		const lcpEntries = performance.getEntriesByType(
			"largest-contentful-paint",
		) as PerformanceEntry[];
		const lcpMs =
			lcpEntries.length > 0 ? (lcpEntries.at(-1)?.startTime ?? 0) : 0;

		let cls = 0;
		const shifts = performance.getEntriesByType("layout-shift") as Array<
			PerformanceEntry & { value?: number; hadRecentInput?: boolean }
		>;
		for (const entry of shifts) {
			if (!entry.hadRecentInput) {
				cls += entry.value ?? 0;
			}
		}
		return { lcpMs, cls };
	});

	const skip = page.getByRole("link", { name: "Skip to main content" });
	await page.keyboard.press("Tab");
	await skip.focus();
	const interactionSample = page.evaluate(async () => {
		const link = document.querySelector<HTMLAnchorElement>(
			'a[href="#main-content"]',
		);
		if (!link) {
			return Number.POSITIVE_INFINITY;
		}

		return await new Promise<number>((resolve) => {
			link.addEventListener(
				"click",
				() => {
					const start = performance.now();
					requestAnimationFrame(() => {
						resolve(Math.round(performance.now() - start));
					});
				},
				{ once: true },
			);
		});
	});
	await skip.click();
	const inpMs = await interactionSample;

	return { lcpMs: paint.lcpMs, cls: paint.cls, inpMs };
}
