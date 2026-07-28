import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const webRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = (relativePath: string) =>
	readFileSync(path.join(webRoot, relativePath), "utf8");

describe("HR operations journeys", () => {
	it("composes the existing lifecycle, compliance, case, and planning actions", () => {
		const forms = source(
			"features/human-resources/operations/hr-operations-journey-forms.tsx",
		);
		for (const action of [
			"startOnboardingJourneyAction",
			"startOffboardingJourneyAction",
			"runAssignmentJourneyAction",
			"runEmploymentLifecycleJourneyAction",
			"detectComplianceExpiryOperationsAction",
			"openEmployeeCaseAction",
			"createHeadcountPlanAction",
		])
			expect(forms).toContain(action);
		expect(forms).not.toMatch(/@afenda\/human-resources/);
	});

	it("keeps server-side permission checks on every composed mutation", () => {
		const admin = source("app/actions/hr-admin-journeys.ts");
		const compliance = source("app/actions/hr-compliance.ts");
		const cases = source("app/actions/hr-employee-relations.ts");
		const planning = source("app/actions/hr-workforce-planning.ts");
		expect(admin).toContain('permission: "human-resources.onboarding.manage"');
		expect(admin).toContain('permission: "human-resources.offboarding.manage"');
		expect(admin).toContain('permission: "human-resources.employment.manage"');
		expect(compliance).toContain("permission: COMPLIANCE_ADMIN");
		expect(cases).toContain("permission: CASE_OPEN");
		expect(planning).toContain("permission: PLAN_PREPARE");
	});

	it("retains employment and assignment ownership checks before mutation", () => {
		const admin = source("app/actions/hr-admin-journeys.ts");
		expect(admin).toContain("loadOwnedEmployment");
		expect(admin).toContain(
			"assignment.data.employeeId !== parsed.data.employeeId",
		);
		expect(admin).toContain(
			"assignment.data.employmentId !== parsed.data.employmentId",
		);
		expect(admin).toContain(
			'actionFail("NOT_FOUND", "Assignment record not found.")',
		);
	});
});
