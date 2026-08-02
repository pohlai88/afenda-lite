/**
 * Memory vs Drizzle parity for compensation & benefits (HR-07 / slice 8.5).
 */

import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import {
	addBenefitEnrollmentDependent,
	endBenefitEnrollmentDependent,
} from "../src/features/compensation-benefits/benefit-dependent";
import {
	getBenefitPlanEligibility,
	setBenefitPlanEligibility,
} from "../src/features/compensation-benefits/benefit-eligibility";
import {
	enrolBenefit,
	waiveBenefit,
} from "../src/features/compensation-benefits/benefit-enrollment";
import { createBenefitPlan } from "../src/features/compensation-benefits/benefit-plan";
import { createCompensationGrade } from "../src/features/compensation-benefits/compensation-grade";
import { createCompensationGradeProgressionRule } from "../src/features/compensation-benefits/compensation-grade-progression-rule";
import {
	applyApprovedCompensationResult,
	createCompensationReviewDraft,
	finalizeCompensationReview,
	getCompensationReview,
	recordCompensationRecommendation,
} from "../src/features/compensation-benefits/compensation-review";
import { createMemoryCurrencyLookup } from "../src/features/compensation-benefits/currency-lookup";
import {
	activateEmployeeCompensation,
	approveEmployeeCompensation,
	correctEmployeeCompensation,
	createEmployeeCompensation,
	scheduleEmployeeCompensationChange,
} from "../src/features/compensation-benefits/employee-compensation";
import {
	createSalaryBand,
	findSalaryBandByGradeAndCurrencyAsOf,
	supersedeSalaryBand,
} from "../src/features/compensation-benefits/salary-band";
import { createEmployee } from "../src/features/workforce-records/employment/employee";
import { createEmployment } from "../src/features/workforce-records/employment/employment";
import { seedOpenCompensationReviewCycle } from "./helpers/compensation-review-cycle-seed";
import { runDrizzleParity } from "./helpers/database-gate";
import {
	createHrParityHarness,
	type WorkforceStoreAdapter,
} from "./helpers/hr-parity-harness";
import { createNeonOrgTracker } from "./helpers/neon-cleanup";
import { resultFailureMessage } from "./helpers/result-details";

function uniqueSuffix(adapter: WorkforceStoreAdapter): string {
	return `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

afterEach(() => {
	vi.useRealTimers();
});

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
		expect(employee.ok, resultFailureMessage(employee)).toBe(true);
		if (!employee.ok) {
			return;
		}

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
		expect(employment.ok, resultFailureMessage(employment)).toBe(true);
		if (!employment.ok) {
			return;
		}

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
		expect(grade.ok, resultFailureMessage(grade)).toBe(true);
		if (!grade.ok) {
			return;
		}

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
		expect(band.ok, resultFailureMessage(band)).toBe(true);
		if (!band.ok) {
			return;
		}

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
		expect(gradeB.ok, resultFailureMessage(gradeB)).toBe(true);
		if (!gradeB.ok) {
			return;
		}

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
		expect(progression.ok, resultFailureMessage(progression)).toBe(true);
		if (!progression.ok) {
			return;
		}

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
		expect(superseded.ok, resultFailureMessage(superseded)).toBe(true);
		if (!superseded.ok) {
			return;
		}
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
		expect(asOf.ok, resultFailureMessage(asOf)).toBe(true);
		if (!asOf.ok) {
			return;
		}
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
		expect(compensation.ok, resultFailureMessage(compensation)).toBe(true);
		if (!compensation.ok) {
			return;
		}

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
		expect(approved.ok, resultFailureMessage(approved)).toBe(true);
		if (!approved.ok) {
			return;
		}
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
		expect(plan.ok, resultFailureMessage(plan)).toBe(true);
		if (!plan.ok) {
			return;
		}
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
		expect(employee.ok, resultFailureMessage(employee)).toBe(true);
		if (!employee.ok) {
			return;
		}

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
		expect(employment.ok, resultFailureMessage(employment)).toBe(true);
		if (!employment.ok) {
			return;
		}

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
		expect(plan.ok, resultFailureMessage(plan)).toBe(true);
		if (!plan.ok) {
			return;
		}

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
		expect(eligibility.ok, resultFailureMessage(eligibility)).toBe(true);
		if (!eligibility.ok) {
			return;
		}

		const loaded = await getBenefitPlanEligibility(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-ben-elig-get-${suffix}`,
				planId: plan.data.id,
			},
			ready,
		);
		expect(loaded.ok, resultFailureMessage(loaded)).toBe(true);
		if (!loaded.ok) {
			return;
		}
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
		expect(enrollment.ok, resultFailureMessage(enrollment)).toBe(true);
		if (!enrollment.ok) {
			return;
		}

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
		expect(dependent.ok, resultFailureMessage(dependent)).toBe(true);
		if (!dependent.ok) {
			return;
		}

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
		expect(endedDependent.ok, resultFailureMessage(endedDependent)).toBe(true);
		if (!endedDependent.ok) {
			return;
		}

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
		expect(waived.ok, resultFailureMessage(waived)).toBe(true);
		if (!waived.ok) {
			return;
		}
		expect(waived.data.status).toBe("waived");
	});

	it("employee compensation schedule, activate, and correct lifecycle", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-01T12:00:00.000Z"));
		const ready = {
			...createHrParityHarness(adapter),
			currency: createMemoryCurrencyLookup(),
		};
		const employee = await createEmployee(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-lifecycle-employee-${suffix}`,
				idempotencyKey: `idem-lifecycle-employee-${suffix}`,
				employeeNumber: `LC-${suffix}`.slice(0, 64),
				legalName: `Lifecycle Worker ${suffix}`,
			},
			ready,
		);
		expect(employee.ok, resultFailureMessage(employee)).toBe(true);
		if (!employee.ok) {
			return;
		}

		const employment = await createEmployment(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-lifecycle-employment-${suffix}`,
				employeeId: employee.data.id,
				startsOn: "2025-01-01",
			},
			ready,
		);
		expect(employment.ok, resultFailureMessage(employment)).toBe(true);
		if (!employment.ok) {
			return;
		}

		const initial = await createEmployeeCompensation(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-lifecycle-initial-${suffix}`,
				idempotencyKey: `idem-lifecycle-initial-${suffix}`,
				employeeId: employee.data.id,
				employmentId: employment.data.id,
				baseAmount: "70000.0000",
				currencyCode: "USD",
				payFrequency: "monthly",
				effectiveFrom: "2025-01-01",
				reason: "Initial compensation",
			},
			ready,
		);
		expect(initial.ok, resultFailureMessage(initial)).toBe(true);
		if (!initial.ok) {
			return;
		}
		const active = await approveEmployeeCompensation(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-lifecycle-approve-${suffix}`,
				compensationId: initial.data.id,
				expectedVersion: initial.data.version,
			},
			ready,
		);
		expect(active.ok, resultFailureMessage(active)).toBe(true);
		if (!active.ok) {
			return;
		}

		const scheduled = await scheduleEmployeeCompensationChange(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-lifecycle-schedule-${suffix}`,
				idempotencyKey: `idem-lifecycle-schedule-${suffix}`,
				compensationId: active.data.id,
				baseAmount: "75000.0000",
				currencyCode: "USD",
				payFrequency: "monthly",
				effectiveFrom: "2026-02-01",
				reason: "Scheduled increase",
			},
			ready,
		);
		expect(scheduled.ok, resultFailureMessage(scheduled)).toBe(true);
		if (!scheduled.ok) {
			return;
		}
		expect(scheduled.data.status).toBe("scheduled");
		expect(scheduled.data.supersedesCompensationId).toBe(active.data.id);
		vi.setSystemTime(new Date("2026-02-02T12:00:00.000Z"));

		const activated = await activateEmployeeCompensation(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-lifecycle-activate-${suffix}`,
				compensationId: scheduled.data.id,
				expectedVersion: scheduled.data.version,
			},
			ready,
		);
		expect(activated.ok, resultFailureMessage(activated)).toBe(true);
		if (!activated.ok) {
			return;
		}
		expect(activated.data.status).toBe("active");

		const corrected = await correctEmployeeCompensation(
			{
				organizationId: ORG,
				actorUserId: ACTOR,
				correlationId: `corr-lifecycle-correct-${suffix}`,
				idempotencyKey: `idem-lifecycle-correct-${suffix}`,
				compensationId: activated.data.id,
				baseAmount: "76000.0000",
				currencyCode: "USD",
				payFrequency: "monthly",
				effectiveFrom: "2026-02-01",
				reason: "Evidence-backed correction",
				evidenceReference: `case-${suffix}`,
			},
			ready,
		);
		expect(corrected.ok, resultFailureMessage(corrected)).toBe(true);
		if (!corrected.ok) {
			return;
		}
		expect(corrected.data.status).toBe("active");
		expect(corrected.data.baseAmount).toBe("76000.0000");
		expect(corrected.data.supersedesCompensationId).toBe(activated.data.id);
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
		expect(employee.ok, resultFailureMessage(employee)).toBe(true);
		if (!employee.ok) {
			return;
		}

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
		expect(employment.ok, resultFailureMessage(employment)).toBe(true);
		if (!employment.ok) {
			return;
		}

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
		expect(draft.ok, resultFailureMessage(draft)).toBe(true);
		if (!draft.ok) {
			return;
		}
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
		expect(recommended.ok, resultFailureMessage(recommended)).toBe(true);
		if (!recommended.ok) {
			return;
		}
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
		expect(finalized.ok, resultFailureMessage(finalized)).toBe(true);
		if (!finalized.ok) {
			return;
		}
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
		expect(applied.ok, resultFailureMessage(applied)).toBe(true);
		if (!applied.ok) {
			return;
		}
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
		expect(review.ok, resultFailureMessage(review)).toBe(true);
		if (!review.ok) {
			return;
		}
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
