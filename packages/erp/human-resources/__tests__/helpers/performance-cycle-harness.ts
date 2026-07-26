import { fail, type Result } from "@afenda/errors/result";

import type {
	HumanResourcesEmployeeId,
	HumanResourcesEmploymentId,
} from "../../src/brands";
import type { HumanResourcesCommandOptions } from "../../src/command-options";
import {
	addCycleParticipant,
	openPerformanceCycle,
	publishPerformanceCycle,
	setPerformanceCycleEligibility,
	setPerformanceCycleReviewPeriods,
} from "../../src/performance/performance-cycle";
import type { MutationPorts } from "../../src/ports";
import type { PerformanceCycle } from "../../src/types";

export const DEFAULT_PERFORMANCE_CYCLE_REVIEW_PERIODS = [
	{
		kind: "self_review" as const,
		periodStart: "2025-01-01",
		periodEnd: "2025-04-30",
	},
	{
		kind: "manager_review" as const,
		periodStart: "2025-05-01",
		periodEnd: "2025-08-31",
	},
];

type PublishHarnessInput = {
	organizationId: string;
	actorUserId: string;
	correlationIdPrefix: string;
	cycle: PerformanceCycle;
	ports?: MutationPorts;
};

type PublishOpenHarnessInput = PublishHarnessInput & {
	participant: {
		employeeId: HumanResourcesEmployeeId;
		employmentId: HumanResourcesEmploymentId;
	};
};

function toCycleFailure<T>(result: {
	ok: false;
	code: string;
	message: string;
	details?: unknown;
}): Result<T> {
	return fail(result.code, result.message, result.details);
}

async function publishPerformanceCycleFromDraft(
	ready: HumanResourcesCommandOptions,
	input: PublishHarnessInput,
): Promise<Result<PerformanceCycle>> {
	const options = input.ports ? { ...ready, ports: input.ports } : ready;
	let version = input.cycle.version;

	const periods = await setPerformanceCycleReviewPeriods(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `${input.correlationIdPrefix}-review-periods`,
			cycleId: input.cycle.id,
			periods: DEFAULT_PERFORMANCE_CYCLE_REVIEW_PERIODS,
			expectedVersion: version,
		},
		options,
	);
	if (!periods.ok) {
		return toCycleFailure(periods);
	}
	version += 1;

	const eligibility = await setPerformanceCycleEligibility(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `${input.correlationIdPrefix}-eligibility`,
			cycleId: input.cycle.id,
			minTenureDays: null,
			allowedEmploymentStatuses: ["active"],
			expectedVersion: version,
		},
		options,
	);
	if (!eligibility.ok) {
		return toCycleFailure(eligibility);
	}
	version += 1;

	return publishPerformanceCycle(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `${input.correlationIdPrefix}-publish`,
			cycleId: input.cycle.id,
			expectedVersion: version,
		},
		options,
	);
}

/** Configure and publish a draft cycle without opening (for transition / version tests). */
export async function publishPerformanceCycleReady(
	ready: HumanResourcesCommandOptions,
	input: PublishHarnessInput,
): Promise<Result<PerformanceCycle>> {
	return publishPerformanceCycleFromDraft(ready, input);
}

/** Configure, publish, enroll a participant, and open a draft performance cycle. */
export async function publishAndOpenPerformanceCycle(
	ready: HumanResourcesCommandOptions,
	input: PublishOpenHarnessInput,
): Promise<Result<PerformanceCycle>> {
	const options = input.ports ? { ...ready, ports: input.ports } : ready;
	const published = await publishPerformanceCycleFromDraft(ready, input);
	if (!published.ok) {
		return published;
	}

	const participant = await addCycleParticipant(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `${input.correlationIdPrefix}-participant`,
			cycleId: published.data.id,
			employeeId: input.participant.employeeId,
			employmentId: input.participant.employmentId,
		},
		options,
	);
	if (!participant.ok) {
		return toCycleFailure(participant);
	}

	return openPerformanceCycle(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `${input.correlationIdPrefix}-open`,
			cycleId: published.data.id,
			expectedVersion: published.data.version,
		},
		options,
	);
}
