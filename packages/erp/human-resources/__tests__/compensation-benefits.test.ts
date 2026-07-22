import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import {
	HUMAN_RESOURCES_BENEFIT_ENROLLMENT_CHANGED_EVENT,
	HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT,
} from "@afenda/events/schemas";
import { describe, expect, it } from "vitest";

import type { HumanResourcesPermission } from "../src/authorization";
import {
	enrolBenefit,
	getApprovedCompensationHandoff,
} from "../src/compensation-benefits/benefit-enrollment";
import { createBenefitPlan } from "../src/compensation-benefits/benefit-plan";
import { createCompensationGrade } from "../src/compensation-benefits/compensation-grade";
import {
	applyApprovedCompensationResult,
	createCompensationReviewDraft,
	finalizeCompensationReview,
	recordCompensationRecommendation,
} from "../src/compensation-benefits/compensation-review";
import { createEmployeeCompensation } from "../src/compensation-benefits/employee-compensation";
import { createSalaryBand } from "../src/compensation-benefits/salary-band";
import { createEmployee } from "../src/core/employee";
import { createEmployment } from "../src/core/employment";
import { createMemoryCurrencyLookup } from "../src/currency-lookup";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	HUMAN_RESOURCES_ERROR_INVALID_INPUT,
} from "../src/error-codes";
import {
	HUMAN_RESOURCES_PERMISSION_BENEFITS_MANAGE,
	HUMAN_RESOURCES_PERMISSION_CODES,
	HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE,
	HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
	HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
} from "../src/permissions";
import { createMemoryHumanResourcesStore } from "../src/testing";
import { createGrantingHumanResourcesAuthorization } from "./helpers/memory-authorization";
import { createMemoryMutationPorts } from "./helpers/memory-ports";
import { humanResourcesCodeFromResult } from "./helpers/result-details";

const ORG_A = "org-cb-a";
const ACTOR = "user-cb-1";

function harness(
	permissions: readonly HumanResourcesPermission[] = HUMAN_RESOURCES_PERMISSION_CODES,
) {
	const store = createMemoryHumanResourcesStore();
	const ports = createMemoryMutationPorts();
	const authorization = createGrantingHumanResourcesAuthorization(permissions);
	const currency = createMemoryCurrencyLookup();
	return { store, ports, authorization, currency };
}

async function seedEmployeeEmployment(ready: ReturnType<typeof harness>) {
	const seedReady = {
		...ready,
		authorization: createGrantingHumanResourcesAuthorization([
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
			HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
		]),
	};
	const employee = await createEmployee(
		{
			organizationId: ORG_A,
			actorUserId: ACTOR,
			correlationId: "corr-emp-cb",
			idempotencyKey: "idem-emp-cb",
			employeeNumber: "E-CB-1",
			legalName: "Comp Worker",
		},
		seedReady,
	);
	if (!employee.ok) return employee;

	const employment = await createEmployment(
		{
			organizationId: ORG_A,
			actorUserId: ACTOR,
			correlationId: "corr-employ-cb",
			employeeId: employee.data.id,
			startsOn: "2025-01-01",
		},
		seedReady,
	);
	if (!employment.ok) return employment;

	return {
		ok: true as const,
		employee: employee.data,
		employment: employment.data,
	};
}

async function seedGrade(ready: ReturnType<typeof harness>) {
	return createCompensationGrade(
		{
			organizationId: ORG_A,
			actorUserId: ACTOR,
			correlationId: "corr-grade-cb",
			code: "G1",
			name: "Grade 1",
		},
		ready,
	);
}

describe("compensation & benefits (HR-07)", () => {
	it("rejects salary band when min > mid > max order is violated", async () => {
		const ready = harness();
		const grade = await seedGrade(ready);
		expect(grade.ok).toBe(true);
		if (!grade.ok) return;

		const band = await createSalaryBand(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-band-order",
				gradeId: grade.data.id,
				currencyCode: "USD",
				minAmount: "90000",
				midAmount: "80000",
				maxAmount: "100000",
				effectiveFrom: "2025-01-01",
			},
			ready,
		);

		expect(band.ok).toBe(false);
		if (band.ok) return;
		expect(humanResourcesCodeFromResult(band)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		);
	});

	it("rejects overlapping salary bands for the same grade", async () => {
		const ready = harness();
		const grade = await seedGrade(ready);
		expect(grade.ok).toBe(true);
		if (!grade.ok) return;

		const first = await createSalaryBand(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-band-1",
				gradeId: grade.data.id,
				currencyCode: "USD",
				minAmount: "50000",
				midAmount: "70000",
				maxAmount: "90000",
				effectiveFrom: "2025-01-01",
				effectiveTo: "2025-12-31",
			},
			ready,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) return;

		const overlap = await createSalaryBand(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-band-2",
				gradeId: grade.data.id,
				currencyCode: "USD",
				minAmount: "55000",
				midAmount: "75000",
				maxAmount: "95000",
				effectiveFrom: "2025-06-01",
				effectiveTo: null,
			},
			ready,
		);

		expect(overlap.ok).toBe(false);
		if (overlap.ok) return;
		expect(humanResourcesCodeFromResult(overlap)).toBe(
			HUMAN_RESOURCES_ERROR_CONFLICT,
		);
	});

	it("rejects unknown currency codes at the command boundary", async () => {
		const ready = harness();
		const grade = await seedGrade(ready);
		expect(grade.ok).toBe(true);
		if (!grade.ok) return;

		const band = await createSalaryBand(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-band-fx",
				gradeId: grade.data.id,
				currencyCode: "ZZZ",
				minAmount: "50000",
				midAmount: "70000",
				maxAmount: "90000",
				effectiveFrom: "2025-01-01",
			},
			ready,
		);

		expect(band.ok).toBe(false);
		if (band.ok) return;
		expect(humanResourcesCodeFromResult(band)).toBe(
			HUMAN_RESOURCES_ERROR_INVALID_INPUT,
		);
	});

	it("requires compensation.read (not employee.read) for approved handoff query", async () => {
		const baseReady = harness();
		const seeded = await seedEmployeeEmployment(baseReady);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const readOnlyReady = {
			...baseReady,
			authorization: createGrantingHumanResourcesAuthorization([
				HUMAN_RESOURCES_PERMISSION_EMPLOYEE_READ,
			]),
		};
		const denied = await getApprovedCompensationHandoff(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-handoff-deny",
				employeeId: seeded.employee.id,
			},
			readOnlyReady,
		);
		expect(denied.ok).toBe(false);
		if (denied.ok) return;
		expect(humanResourcesCodeFromResult(denied)).toBe(
			HUMAN_RESOURCES_ERROR_FORBIDDEN,
		);

		const compensationReadReady = {
			...baseReady,
			authorization: createGrantingHumanResourcesAuthorization([
				HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
			]),
		};
		const allowed = await getApprovedCompensationHandoff(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-handoff-allow",
				employeeId: seeded.employee.id,
			},
			compensationReadReady,
		);
		expect(allowed.ok).toBe(true);
		if (!allowed.ok) return;
		expect(allowed.data).toBeNull();
	});

	it("returns null handoff when employee has no active compensation", async () => {
		const ready = harness([HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ]);
		const seeded = await seedEmployeeEmployment(ready);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const handoff = await getApprovedCompensationHandoff(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-handoff-null",
				employeeId: seeded.employee.id,
			},
			ready,
		);

		expect(handoff.ok).toBe(true);
		if (!handoff.ok) return;
		expect(handoff.data).toBeNull();
	});

	it("returns active compensation and enrollments in approved handoff", async () => {
		const ready = harness([
			HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE,
			HUMAN_RESOURCES_PERMISSION_COMPENSATION_READ,
			HUMAN_RESOURCES_PERMISSION_BENEFITS_MANAGE,
		]);
		const seeded = await seedEmployeeEmployment(ready);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const compensation = await createEmployeeCompensation(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-comp",
				idempotencyKey: "idem-comp",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				baseAmount: "85000",
				currencyCode: "USD",
				effectiveFrom: "2025-01-01",
				reason: "Initial hire",
			},
			ready,
		);
		expect(compensation.ok).toBe(true);
		if (!compensation.ok) return;

		const plan = await createBenefitPlan(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-plan",
				code: "MED",
				name: "Medical",
			},
			ready,
		);
		expect(plan.ok).toBe(true);
		if (!plan.ok) return;

		const enrollment = await enrolBenefit(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-enrol",
				idempotencyKey: "idem-enrol",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				planId: plan.data.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(enrollment.ok).toBe(true);
		if (!enrollment.ok) return;

		const handoff = await getApprovedCompensationHandoff(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-handoff-full",
				employeeId: seeded.employee.id,
			},
			ready,
		);

		expect(handoff.ok).toBe(true);
		if (!handoff.ok) return;
		expect(handoff.data).not.toBeNull();
		if (handoff.data === null) return;
		expect(handoff.data.activeCompensation?.id).toBe(compensation.data.id);
		expect(handoff.data.activeBenefitEnrollments).toHaveLength(1);
		expect(handoff.data.activeBenefitEnrollments[0]?.id).toBe(
			enrollment.data.id,
		);
	});

	it("blocks recording a recommendation after review is finalized", async () => {
		const ready = harness([HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE]);
		const seeded = await seedEmployeeEmployment(ready);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const draft = await createCompensationReviewDraft(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-review-draft",
				idempotencyKey: "idem-review",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
			},
			ready,
		);
		expect(draft.ok).toBe(true);
		if (!draft.ok) return;

		const recommended = await recordCompensationRecommendation(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-review-rec",
				reviewId: draft.data.id,
				expectedVersion: draft.data.version,
				proposedBaseAmount: "90000",
				proposedCurrencyCode: "USD",
				effectiveFrom: "2025-07-01",
			},
			ready,
		);
		expect(recommended.ok).toBe(true);
		if (!recommended.ok) return;

		const finalized = await finalizeCompensationReview(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-review-fin",
				reviewId: recommended.data.id,
				expectedVersion: recommended.data.version,
			},
			ready,
		);
		expect(finalized.ok).toBe(true);
		if (!finalized.ok) return;

		const mutation = await recordCompensationRecommendation(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-review-after-fin",
				reviewId: finalized.data.id,
				expectedVersion: finalized.data.version,
				proposedBaseAmount: "95000",
				proposedCurrencyCode: "USD",
				effectiveFrom: "2025-08-01",
			},
			ready,
		);

		expect(mutation.ok).toBe(false);
	});

	it("rejects duplicate active benefit enrollment for the same plan", async () => {
		const ready = harness([HUMAN_RESOURCES_PERMISSION_BENEFITS_MANAGE]);
		const seeded = await seedEmployeeEmployment(ready);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const plan = await createBenefitPlan(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-plan-dup",
				code: "DEN",
				name: "Dental",
			},
			ready,
		);
		expect(plan.ok).toBe(true);
		if (!plan.ok) return;

		const first = await enrolBenefit(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-enrol-1",
				idempotencyKey: "idem-enrol-1",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				planId: plan.data.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);
		expect(first.ok).toBe(true);
		if (!first.ok) return;

		const duplicate = await enrolBenefit(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-enrol-2",
				idempotencyKey: "idem-enrol-2",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				planId: plan.data.id,
				effectiveFrom: "2025-02-01",
			},
			ready,
		);

		expect(duplicate.ok).toBe(false);
		if (duplicate.ok) return;
		expect(humanResourcesCodeFromResult(duplicate)).toBe(
			HUMAN_RESOURCES_ERROR_CONFLICT,
		);
	});

	it("emits compensation.changed.v1 and benefit-enrollment.changed.v1 on mutations", async () => {
		const ready = harness([
			HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE,
			HUMAN_RESOURCES_PERMISSION_BENEFITS_MANAGE,
		]);
		const seeded = await seedEmployeeEmployment(ready);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const compensation = await createEmployeeCompensation(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-comp-event",
				idempotencyKey: "idem-comp-event",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				baseAmount: "80000",
				currencyCode: "USD",
				effectiveFrom: "2025-01-01",
				reason: "Hire",
			},
			ready,
		);
		expect(compensation.ok).toBe(true);

		const plan = await createBenefitPlan(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-plan-event",
				code: "VIS",
				name: "Vision",
			},
			ready,
		);
		expect(plan.ok).toBe(true);
		if (!plan.ok) return;

		await enrolBenefit(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-enrol-event",
				idempotencyKey: "idem-enrol-event",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
				planId: plan.data.id,
				effectiveFrom: "2025-01-01",
			},
			ready,
		);

		const eventTypes = ready.ports.outbox.calls.map((call) => call.type);
		expect(eventTypes).toContain(HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT);
		expect(eventTypes).toContain(
			HUMAN_RESOURCES_BENEFIT_ENROLLMENT_CHANGED_EVENT,
		);
	});

	it("applies finalized review into employee compensation", async () => {
		const ready = harness([HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE]);
		const seeded = await seedEmployeeEmployment(ready);
		expect(seeded.ok).toBe(true);
		if (!seeded.ok) return;

		const draft = await createCompensationReviewDraft(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-apply-draft",
				idempotencyKey: "idem-apply-review",
				employeeId: seeded.employee.id,
				employmentId: seeded.employment.id,
			},
			ready,
		);
		expect(draft.ok).toBe(true);
		if (!draft.ok) return;

		const recommended = await recordCompensationRecommendation(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-apply-rec",
				reviewId: draft.data.id,
				expectedVersion: draft.data.version,
				proposedBaseAmount: "92000",
				proposedCurrencyCode: "USD",
				effectiveFrom: "2025-07-01",
			},
			ready,
		);
		expect(recommended.ok).toBe(true);
		if (!recommended.ok) return;

		const finalized = await finalizeCompensationReview(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-apply-fin",
				reviewId: recommended.data.id,
				expectedVersion: recommended.data.version,
			},
			ready,
		);
		expect(finalized.ok).toBe(true);
		if (!finalized.ok) return;

		const applied = await applyApprovedCompensationResult(
			{
				organizationId: ORG_A,
				actorUserId: ACTOR,
				correlationId: "corr-apply",
				reviewId: finalized.data.id,
				reason: "Annual review",
				idempotencyKey: "idem-apply-comp",
			},
			ready,
		);

		expect(applied.ok).toBe(true);
		if (!applied.ok) return;
		expect(applied.data.baseAmount).toBe("92000");
		expect(applied.data.currencyCode).toBe("USD");
	});

	it("does not import @afenda/payroll from compensation-benefits modules", () => {
		const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
		const modules = [
			"src/compensation-benefits/compensation-grade.ts",
			"src/compensation-benefits/salary-band.ts",
			"src/compensation-benefits/employee-compensation.ts",
			"src/compensation-benefits/compensation-review.ts",
			"src/compensation-benefits/benefit-plan.ts",
			"src/compensation-benefits/benefit-enrollment.ts",
			"src/shared/compensation-command.ts",
			"src/drizzle-compensation.ts",
		];

		for (const relativePath of modules) {
			const body = readFileSync(join(root, relativePath), "utf8");
			expect(body).not.toMatch(/@afenda\/payroll/);
			expect(body).not.toMatch(/payroll_/i);
		}
	});
});
