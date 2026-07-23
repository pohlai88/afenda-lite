/**
 * Memory vs Drizzle parity for compensation & benefits (HR-07).
 */

import { resolveDatabaseUrlForTests } from "@afenda/testing/require-database-for-ci";
import { afterAll, describe, expect, it } from "vitest";

import { createBenefitPlan } from "../src/compensation-benefits/benefit-plan";
import { createCompensationGrade } from "../src/compensation-benefits/compensation-grade";
import { createEmployeeCompensation } from "../src/compensation-benefits/employee-compensation";
import { createSalaryBand } from "../src/compensation-benefits/salary-band";
import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import { createMemoryCurrencyLookup } from "../src/currency-lookup";
import { cleanupHumanResourcesNeonOrgs } from "./helpers/neon-cleanup";
import {
	createHrParityHarness,
	type WorkforceStoreAdapter,
} from "./helpers/hr-parity-harness";

const { hasDatabase } = resolveDatabaseUrlForTests();

function uniqueSuffix(adapter: WorkforceStoreAdapter): string {
	return `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function defineCompensationBenefitsParitySuite(
	adapter: WorkforceStoreAdapter,
): void {
	const suffix = uniqueSuffix(adapter);
	const ORG = `org-hr-cb-parity-${suffix}`;
	const ACTOR = `user-hr-cb-parity-${suffix}`;

	afterAll(async () => {
		if (adapter === "drizzle") {
			await cleanupHumanResourcesNeonOrgs([ORG]);
		}
	});

	it("grade, salary band, employee compensation, benefit plan", async () => {
		const ready = {
			...createHrParityHarness(adapter),
			currency: createMemoryCurrencyLookup(),
		};

		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-emp-${suffix}`,
				idempotencyKey: `idem-emp-${suffix}`,
				employeeNumber: `E-${suffix}`,
				legalName: `Comp Worker ${suffix}`,
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;

		const employment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-employ-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) return;

		const grade = await createCompensationGrade(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-grade-${suffix}`,
				code: `G-${suffix}`,
				name: "Grade 1",
			},
			ready,
		);
		expect(grade.ok).toBe(true);
		if (!grade.ok) return;

		const band = await createSalaryBand(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-band-${suffix}`,
				gradeId: grade.data.id,
				currencyCode: "USD",
				minAmount: "50000",
				midAmount: "60000",
				maxAmount: "70000",
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(band.ok).toBe(true);
		if (!band.ok) return;

		const compensation = await createEmployeeCompensation(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-comp-${suffix}`,
				idempotencyKey: `idem-comp-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				gradeId: grade.data.id,
				salaryBandId: band.data.id,
				baseAmount: "60000",
				currencyCode: "USD",
				effectiveFrom: "2025-01-01",
				reason: "initial",
			},
			ready,
		);
		expect(compensation.ok).toBe(true);
		if (!compensation.ok) return;
		expect(compensation.data.status).toBe("active");

		const plan = await createBenefitPlan(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-plan-${suffix}`,
				code: `BP-${suffix}`,
				name: "Health",
			},
			ready,
		);
		expect(plan.ok).toBe(true);
		if (!plan.ok) return;
		expect(plan.data.code).toBe(`BP-${suffix}`);
	});
}

describe("@afenda/human-resources compensation-benefits parity (memory)", () => {
	defineCompensationBenefitsParitySuite("memory");
});

describe.skipIf(!hasDatabase)(
	"@afenda/human-resources compensation-benefits parity (drizzle/neon)",
	() => {
		defineCompensationBenefitsParitySuite("drizzle");
	},
);
