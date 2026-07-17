import { FE_CWV_BUDGETS } from "@/testing/fe-cwv-budgets";
import { collectLabCwvs } from "@/testing/e2e/cwv";
import { expect, test } from "@/testing/e2e/playwright-base";

/**
 * I5.4 PERF01 — lab CWV samples must stay under adopted Google “good” budgets (@smoke).
 */
test.describe("FE CWV lab budgets @smoke", () => {
	for (const path of FE_CWV_BUDGETS.publicPaths) {
		test(`public ${path} within adopted CWV budgets`, async ({ page }) => {
			await page.goto(path, { waitUntil: "domcontentloaded" });
			const sample = await collectLabCwvs(page);
			expect(
				sample.lcpMs,
				`LCP ${sample.lcpMs}ms exceeds budget ${FE_CWV_BUDGETS.metrics.lcpMs}ms`,
			).toBeLessThanOrEqual(FE_CWV_BUDGETS.metrics.lcpMs);
			expect(
				sample.cls,
				`CLS ${sample.cls} exceeds budget ${FE_CWV_BUDGETS.metrics.cls}`,
			).toBeLessThanOrEqual(FE_CWV_BUDGETS.metrics.cls);
			expect(
				sample.inpMs,
				`INP/lab-interaction ${sample.inpMs}ms exceeds budget ${FE_CWV_BUDGETS.metrics.inpMs}ms`,
			).toBeLessThanOrEqual(FE_CWV_BUDGETS.metrics.inpMs);
		});
	}
});
