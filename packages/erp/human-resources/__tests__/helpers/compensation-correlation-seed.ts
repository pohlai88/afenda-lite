import { expect } from "vitest";

import { createBenefitPlan } from "../../src/compensation-benefits/benefit-plan";
import { createMemoryCurrencyLookup } from "../../src/compensation-benefits/currency-lookup";
import {
	createCompensationReviewDraft,
	finalizeCompensationReview,
	recordCompensationRecommendation,
} from "../../src/compensation-benefits/compensation-review";
import type { HumanResourcesCommandOptions } from "../../src/command-options";
import { createEmployee } from "../../src/core/employee";
import { createEmployment } from "../../src/core/employment";
import {
	HUMAN_RESOURCES_PERMISSION_BENEFITS_MANAGE,
	HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
	HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
} from "../../src/permissions";
import { createGrantingHumanResourcesAuthorization } from "./memory-authorization";

export async function seedCompensationCorrelationFixture(input: {
	organizationId: string;
	actorUserId: string;
	ready: HumanResourcesCommandOptions & {
		store: NonNullable<HumanResourcesCommandOptions["store"]>;
	};
	suffix?: string;
}) {
	const suffix = input.suffix ?? "a";
	const seedReady = {
		...input.ready,
		currency: createMemoryCurrencyLookup(),
		authorization: createGrantingHumanResourcesAuthorization([
			HUMAN_RESOURCES_PERMISSION_EMPLOYEE_CREATE,
			HUMAN_RESOURCES_PERMISSION_EMPLOYMENT_MANAGE,
			HUMAN_RESOURCES_PERMISSION_COMPENSATION_MANAGE,
			HUMAN_RESOURCES_PERMISSION_BENEFITS_MANAGE,
		]),
	};

	const employee = await createEmployee(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-comp-corr-emp-${suffix}`,
			idempotencyKey: `idem-comp-corr-emp-${suffix}`,
			employeeNumber: `E-COMP-CORR-${suffix}`,
			legalName: "Comp Correlation Worker",
		},
		seedReady,
	);
	expect(employee.ok).toBe(true);
	if (!employee.ok) {
		throw employee.error;
	}

	const employment = await createEmployment(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-comp-corr-employ-${suffix}`,
			employeeId: employee.data.id,
			startsOn: "2025-01-01",
		},
		seedReady,
	);
	expect(employment.ok).toBe(true);
	if (!employment.ok) {
		throw employment.error;
	}

	const plan = await createBenefitPlan(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-comp-corr-plan-${suffix}`,
			code: `MED-CORR-${suffix}`,
			name: "Medical Correlation Plan",
		},
		seedReady,
	);
	expect(plan.ok).toBe(true);
	if (!plan.ok) {
		throw plan.error;
	}

	return {
		employee: employee.data,
		employment: employment.data,
		plan: plan.data,
		seedReady,
	};
}

export async function seedFinalizedCompensationReview(input: {
	organizationId: string;
	actorUserId: string;
	seedReady: HumanResourcesCommandOptions;
	employeeId: string;
	employmentId: string;
	suffix: string;
}) {
	const draft = await createCompensationReviewDraft(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-comp-review-draft-${input.suffix}`,
			idempotencyKey: `idem-comp-review-${input.suffix}`,
			employeeId: input.employeeId,
			employmentId: input.employmentId,
		},
		input.seedReady,
	);
	expect(draft.ok).toBe(true);
	if (!draft.ok) {
		throw draft.error;
	}

	const recommended = await recordCompensationRecommendation(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-comp-review-rec-${input.suffix}`,
			reviewId: draft.data.id,
			expectedVersion: draft.data.version,
			proposedBaseAmount: "90000",
			proposedCurrencyCode: "USD",
			effectiveFrom: "2025-07-01",
		},
		input.seedReady,
	);
	expect(recommended.ok).toBe(true);
	if (!recommended.ok) {
		throw recommended.error;
	}

	const finalized = await finalizeCompensationReview(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-comp-review-fin-${input.suffix}`,
			reviewId: recommended.data.id,
			expectedVersion: recommended.data.version,
		},
		input.seedReady,
	);
	expect(finalized.ok).toBe(true);
	if (!finalized.ok) {
		throw finalized.error;
	}

	return finalized.data;
}
