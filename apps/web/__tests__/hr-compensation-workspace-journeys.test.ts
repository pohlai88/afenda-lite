import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath: string) =>
	readFileSync(path.join(root, relativePath), "utf8");

describe("HR compensation workspace journeys", () => {
	it("reuses canonical actions for every workspace journey", () => {
		const forms = source(
			"features/human-resources/compensation/compensation-journey-forms.tsx",
		);
		for (const action of [
			"createCompensationGradeAction",
			"createSalaryBandAction",
			"createCompensationReviewCycleAction",
			"createBenefitPlanAction",
			"listEmployeeCompensationsByEmployeeAction",
			"getApprovedCompensationHandoffAction",
		]) {
			expect(forms).toContain(action);
		}
		expect(forms).not.toMatch(/@afenda\/human-resources/);
	});

	it("retains negative authorization at every sensitive action boundary", () => {
		const compensation = source("app/actions/hr-compensation.ts");
		const reviews = source("app/actions/hr-compensation-review.ts");
		const benefits = source("app/actions/hr-benefits.ts");
		expect(compensation).toContain("permission: COMPENSATION_MANAGE");
		expect(compensation).toContain("permission: COMPENSATION_READ");
		expect(reviews).toContain("permission: COMPENSATION_MANAGE");
		expect(benefits).toContain("permission: BENEFITS_MANAGE");
		for (const file of [compensation, reviews, benefits]) {
			expect(file).toContain("runHrHumanResourcesAction");
		}
	});

	it("keeps payroll delivery read-only and outside gross-to-net calculation", () => {
		const forms = source(
			"features/human-resources/compensation/compensation-journey-forms.tsx",
		);
		expect(forms).toContain("getApprovedCompensationHandoffAction");
		expect(forms).not.toMatch(
			/gross|net pay|tax calculation|deduction calculation/i,
		);
	});
});
