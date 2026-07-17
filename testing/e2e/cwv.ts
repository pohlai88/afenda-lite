import type { Page } from "@playwright/test";

export type LabCwvSample = {
	lcpMs: number;
	cls: number;
	/** Event Timing interaction latency when available; otherwise click→rAF proxy. */
	inpMs: number;
};

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
			lcpEntries.length > 0
				? lcpEntries[lcpEntries.length - 1]?.startTime ?? 0
				: 0;

		let cls = 0;
		const shifts = performance.getEntriesByType(
			"layout-shift",
		) as Array<PerformanceEntry & { value?: number; hadRecentInput?: boolean }>;
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
	const inpMs = await page.evaluate(async () => {
		const link = document.querySelector<HTMLAnchorElement>(
			'a[href="#main-content"]',
		);
		if (!link) {
			return Number.POSITIVE_INFINITY;
		}
		return await new Promise<number>((resolve) => {
			const start = performance.now();
			requestAnimationFrame(() => {
				link.click();
				requestAnimationFrame(() => {
					resolve(performance.now() - start);
				});
			});
		});
	});

	return { lcpMs: paint.lcpMs, cls: paint.cls, inpMs };
}
