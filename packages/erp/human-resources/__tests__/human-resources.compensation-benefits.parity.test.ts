/**
 * Memory vs Drizzle parity for compensation & benefits (HR-07 / slice 8.5).
 */

import { afterAll, describe, expect, it } from "vitest";
import {
	addBenefitEnrollmentDependent,
	endBenefitEnrollmentDependent,
} from "../src/compensation-benefits/benefit-dependent";
import {
	getBenefitPlanEligibility,
	setBenefitPlanEligibility,
} from "../src/compensation-benefits/benefit-eligibility";
import {
	enrolBenefit,
	waiveBenefit,
} from "../src/compensation-benefits/benefit-enrollment";
import { createBenefitPlan } from "../src/compensation-benefits/benefit-plan";
import { createCompensationGrade } from "../src/compensation-benefits/compensation-grade";
import { createCompensationGradeProgressionRule } from "../src/compensation-benefits/compensation-grade-progression-rule";
import { createMemoryCurrencyLookup } from "../src/compensation-benefits/currency-lookup";
import {
	approveEmployeeCompensation,
	createEmployeeCompensation,
} from "../src/compensation-benefits/employee-compensation";
import {
	applyApprovedCompensationResult,
	createCompensationReviewDraft,
	finalizeCompensationReview,
	getCompensationReview,
	recordCompensationRecommendation,
} from "../src/compensation-benefits/compensation-review";
import {
	createSalaryBand,
	findSalaryBandByGradeAndCurrencyAsOf,
	supersedeSalaryBand,
} from "../src/compensation-benefits/salary-band";
import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import { runDrizzleParity } from "./helpers/database-gate";
import {
	createHrParityHarness,
	type WorkforceStoreAdapter,
} from "./helpers/hr-parity-harness";
import { seedOpenCompensationReviewCycle } from "./helpers/compensation-review-cycle-seed";
import { createNeonOrgTracker } from "./helpers/neon-cleanup";

function uniqueSuffix(adapter: WorkforceStoreAdapter): string {
	return `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function defineCompensationBenefitsParitySuite(
	adapter: WorkforceStoreAdapter,
): void {
	const suffix = uniqueSuffix(adapter);
	const neonOrgs = createNeonOrgTracker();
	const ORG = neonOrgs.trackOrg(`org-hr-cb-parity-${suffix}`);
	const ACTOR = `user-hr-cb-parity-${suffix}`;

	afterAll(async () => {
		if (adapter === "drizzle") {
			await neonOrgs.cleanup();
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

		const gradeB = await createCompensationGrade(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-grade-b-${suffix}`,
				code: `G2-${suffix}`,
				name: "Grade 2",
			},
			ready,
		);
		expect(gradeB.ok).toBe(true);
		if (!gradeB.ok) return;

		const progression = await createCompensationGradeProgressionRule(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-prog-${suffix}`,
				fromGradeId: grade.data.id,
				toGradeId: gradeB.data.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(progression.ok).toBe(true);
		if (!progression.ok) return;

		const superseded = await supersedeSalaryBand(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-band-super-${suffix}`,
				gradeId: grade.data.id,
				currencyCode: "USD",
				minAmount: "52000",
				midAmount: "62000",
				maxAmount: "72000",
				effectiveFrom: "2025-07-01",
			},
			ready,
		);
		expect(superseded.ok).toBe(true);
		if (!superseded.ok) return;
		expect(superseded.data.supersedesSalaryBandId).toBe(band.data.id);

		const asOf = await findSalaryBandByGradeAndCurrencyAsOf(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-band-asof-${suffix}`,
				gradeId: grade.data.id,
				currencyCode: "USD",
				asOf: "2025-03-01",
			},
			ready,
		);
		expect(asOf.ok).toBe(true);
		if (!asOf.ok) return;
		expect(asOf.data.id).toBe(band.data.id);

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
				payFrequency: "monthly",
				effectiveFrom: "2025-01-01",
				reason: "initial",
			},
			ready,
		);
		expect(compensation.ok).toBe(true);
		if (!compensation.ok) return;

		const approved = await approveEmployeeCompensation(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-comp-approve-${suffix}`,
				compensationId: compensation.data.id,
				expectedVersion: compensation.data.version,
			},
			ready,
		);
		expect(approved.ok).toBe(true);
		if (!approved.ok) return;
		expect(approved.data.status).toBe("active");

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

	it("benefit eligibility, enrollment, waiver, and dependents", async () => {
		const ready = {
			...createHrParityHarness(adapter),
			currency: createMemoryCurrencyLookup(),
		};

		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-ben-emp-${suffix}`,
				idempotencyKey: `idem-ben-emp-${suffix}`,
				employeeNumber: `BE-${suffix}`,
				legalName: `Benefit Worker ${suffix}`,
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;

		const employment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-ben-employ-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) return;

		const plan = await createBenefitPlan(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-ben-plan-${suffix}`,
				code: `BEN-${suffix}`,
				name: "Medical",
			},
			ready,
		);
		expect(plan.ok).toBe(true);
		if (!plan.ok) return;

		const eligibility = await setBenefitPlanEligibility(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-ben-elig-set-${suffix}`,
				planId: plan.data.id,
				minTenureDays: 0,
				allowedEmploymentStatuses: ["active"],
			},
			ready,
		);
		expect(eligibility.ok).toBe(true);
		if (!eligibility.ok) return;

		const loaded = await getBenefitPlanEligibility(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-ben-elig-get-${suffix}`,
				planId: plan.data.id,
			},
			ready,
		);
		expect(loaded.ok).toBe(true);
		if (!loaded.ok) return;
		expect(loaded.data?.planId).toBe(plan.data.id);

		const enrollment = await enrolBenefit(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-ben-enrol-${suffix}`,
				idempotencyKey: `idem-ben-enrol-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				planId: plan.data.id,
				effectiveFrom: "2025-01-01",
				effectiveTo: "2025-12-31",
				employeeContributionAmount: "50.00",
				employerContributionAmount: "150.00",
				contributionCurrencyCode: "USD",
				contributionFrequency: "monthly",
			},
			ready,
		);
		expect(enrollment.ok).toBe(true);
		if (!enrollment.ok) return;

		const dependent = await addBenefitEnrollmentDependent(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-ben-dep-${suffix}`,
				enrollmentId: enrollment.data.id,
				dependentName: "Spouse",
				relationship: "spouse",
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(dependent.ok).toBe(true);
		if (!dependent.ok) return;

		const endedDependent = await endBenefitEnrollmentDependent(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-ben-dep-end-${suffix}`,
				dependentId: dependent.data.id,
				expectedVersion: dependent.data.version,
				endsOn: "2025-06-30",
			},
			ready,
		);
		expect(endedDependent.ok).toBe(true);
		if (!endedDependent.ok) return;

		const waived = await waiveBenefit(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-ben-waive-${suffix}`,
				enrollmentId: enrollment.data.id,
				expectedVersion: enrollment.data.version,
				waiverReason: "Opt out",
				effectiveTo: "2025-06-30",
			},
			ready,
		);
		expect(waived.ok).toBe(true);
		if (!waived.ok) return;
		expect(waived.data.status).toBe("waived");
	});

	it("Slice 8.4 — compensation review cycle lifecycle parity", async () => {
		const ready = {
			...createHrParityHarness(adapter),
			currency: createMemoryCurrencyLookup(),
		};

		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-review-emp-${suffix}`,
				idempotencyKey: `idem-review-emp-${suffix}`,
				employeeNumber: `ER-${suffix}`,
				legalName: `Review Worker ${suffix}`,
			},
			ready,
		);
		expect(employee.ok).toBe(true);
		if (!employee.ok) return;

		const employment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-review-employ-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);
		expect(employment.ok).toBe(true);
		if (!employment.ok) return;

		const cycle = await seedOpenCompensationReviewCycle({
			organizationId: ORG,
			actorUserId: ACTOR,
			ready,
			suffix: `parity-${suffix}`,
		});

		const draft = await createCompensationReviewDraft(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-review-draft-${suffix}`,
				idempotencyKey: `idem-review-draft-${suffix}`,
				cycleId: cycle.id,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
			},
			ready,
		);
		expect(draft.ok).toBe(true);
		if (!draft.ok) return;
		expect(draft.data.status).toBe("draft");
		expect(draft.data.cycleId).toBe(cycle.id);

		const recommended = await recordCompensationRecommendation(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-review-rec-${suffix}`,
				reviewId: draft.data.id,
				expectedVersion: draft.data.version,
				proposedBaseAmount: "88000",
				proposedCurrencyCode: "USD",
				effectiveFrom: "2025-07-01",
			},
			ready,
		);
		expect(recommended.ok).toBe(true);
		if (!recommended.ok) return;
		expect(recommended.data.status).toBe("recorded");

		const finalized = await finalizeCompensationReview(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-review-fin-${suffix}`,
				reviewId: recommended.data.id,
				expectedVersion: recommended.data.version,
			},
			ready,
		);
		expect(finalized.ok).toBe(true);
		if (!finalized.ok) return;
		expect(finalized.data.status).toBe("finalized");

		const applied = await applyApprovedCompensationResult(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-review-apply-${suffix}`,
				reviewId: finalized.data.id,
				reason: "Merit increase",
				idempotencyKey: `idem-review-apply-${suffix}`,
			},
			ready,
		);
		expect(applied.ok).toBe(true);
		if (!applied.ok) return;
		expect(applied.data.baseAmount).toBe("88000");

		const review = await getCompensationReview(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-review-get-${suffix}`,
				reviewId: finalized.data.id,
			},
			ready,
		);
		expect(review.ok).toBe(true);
		if (!review.ok) return;
		expect(review.data?.appliedCompensationId).toBe(applied.data.id);
	});
}

describe("@afenda/human-resources compensation-benefits parity (memory)", () => {
	defineCompensationBenefitsParitySuite("memory");
});

describe.skipIf(!runDrizzleParity)(
	"@afenda/human-resources compensation-benefits parity (drizzle/neon)",
	() => {
		defineCompensationBenefitsParitySuite("drizzle");
	},
);
