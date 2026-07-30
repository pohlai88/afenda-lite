/**
 * GUIDE-018 I5.4 PERF01 — adopted frontend Core Web Vitals lab budgets.
 *
 * Numbers are Google’s published “good” thresholds (web.dev / Chrome UX Report
 * guidance), not invented Afenda-specific targets. Capacity / saturation under
 * multi-tenant load is out of this criterion (NOT APPLICABLE until an I6 load
 * harness exists with its own Living owner).
 */

export type FeCwvMetricId = "lcpMs" | "inpMs" | "cls";

export interface FeCwvBudgets {
	/** External published authority adopted into this checkout. */
	authority: string;
	environment: string;
	/** Lab budgets — fail the smoke spec if any sample exceeds. */
	metrics: Readonly<Record<FeCwvMetricId, number>>;
	owner: string;
	percentile: string;
	/** Paths measured without factory credentials. */
	publicPaths: readonly string[];
	regressionTrigger: string;
	workload: string;
}

/** Standing PERF01 adoption record — Platform owns aggregation. */
export const FE_CWV_BUDGETS = {
	authority:
		"Google Core Web Vitals “good” thresholds (LCP ≤ 2.5s · INP ≤ 200ms · CLS ≤ 0.1) — web.dev / CrUX guidance, adopted 2026-07-17",
	owner: "Platform",
	workload:
		"Cold Chromium navigation of Pre-Login public surfaces `/`, `/auth/login`, `/join`, `/403` (lab); optional authenticated shells when E2E factory is ready",
	environment: "Playwright Chromium lab (local + CI `e2e-smoke`)",
	percentile:
		"Lab single-run gate (stricter than field p75) — any exceedance fails the smoke",
	regressionTrigger: "e2e/smoke/fe-cwv-budgets.spec.ts failure",
	metrics: {
		lcpMs: 2500,
		inpMs: 200,
		cls: 0.1,
	},
	publicPaths: ["/", "/auth/login", "/join", "/403"],
} as const satisfies FeCwvBudgets;
