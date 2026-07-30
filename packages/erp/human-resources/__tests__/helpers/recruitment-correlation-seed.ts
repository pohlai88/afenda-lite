import type { HumanResourcesCommandOptions } from "../../src/command-options";
import { createPosition } from "../../src/organization/position";
import { createCandidate } from "../../src/recruitment/candidate";
import {
	approveRequisition,
	createDraftRequisition,
	openRequisition,
	submitRequisition,
} from "../../src/recruitment/requisition";
import { candidateConsentFixture } from "./candidate-consent-fixture";
import { seedDefaultHiringManager } from "./recruitment-requisition-fixture";
import { seedDepartmentAndJob } from "./seed-department-and-job";

type SeedReady = HumanResourcesCommandOptions & {
	store: NonNullable<HumanResourcesCommandOptions["store"]>;
};

/**
 * Seeds department/job/position and opens a requisition for recruitment
 * correlation / domain-event fixtures.
 */
export async function seedOpenRequisitionForCorrelation(
	ready: SeedReady,
	input: {
		organizationId: string;
		actorUserId: string;
		code: string;
		correlationPrefix: string;
	},
) {
	const orgSeed = await seedDepartmentAndJob(ready, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: `${input.correlationPrefix}-org`,
	});
	if (orgSeed === null) {
		throw new Error(
			"Failed to seed department/job for recruitment correlation",
		);
	}

	const position = await createPosition(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `${input.correlationPrefix}-pos`,
			code: `P-${input.code}`,
			title: `Position ${input.code}`,
			departmentId: orgSeed.departmentId,
			jobId: orgSeed.jobId,
		},
		ready,
	);
	if (!position.ok) {
		return position;
	}

	const manager = await seedDefaultHiringManager(ready, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		tag: input.code,
	});
	if (!manager.ok) {
		throw new Error(
			"Failed to seed hiring manager for recruitment correlation",
		);
	}

	const draft = await createDraftRequisition(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `${input.correlationPrefix}-draft`,
			idempotencyKey: `idem-${input.correlationPrefix}-draft`,
			code: input.code,
			title: `Req ${input.code}`,
			jobId: orgSeed.jobId,
			positionId: position.data.id,
			departmentId: orgSeed.departmentId,
			hiringManagerEmployeeId: manager.employeeId,
		},
		ready,
	);
	if (!draft.ok) {
		return draft;
	}

	const submitted = await submitRequisition(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `${input.correlationPrefix}-submit`,
			requisitionId: draft.data.id,
			expectedVersion: draft.data.version,
		},
		ready,
	);
	if (!submitted.ok) {
		return submitted;
	}

	return {
		ok: true as const,
		submitted,
		jobId: orgSeed.jobId,
		departmentId: orgSeed.departmentId,
		positionId: position.data.id,
	};
}

export async function seedCandidateForCorrelation(
	ready: SeedReady,
	input: {
		organizationId: string;
		actorUserId: string;
		email: string;
		correlationId: string;
		idempotencyKey: string;
	},
) {
	return await createCandidate(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: input.correlationId,
			idempotencyKey: input.idempotencyKey,
			displayName: "Corr Candidate",
			email: input.email,
			...candidateConsentFixture(),
		},
		ready,
	);
}

export async function approveAndOpenRequisitionForCorrelation(
	ready: SeedReady,
	input: {
		organizationId: string;
		actorUserId: string;
		requisitionId: string;
		expectedVersion: number;
		approveCorrelationId: string;
		openCorrelationId: string;
	},
) {
	const approved = await approveRequisition(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: input.approveCorrelationId,
			requisitionId: input.requisitionId,
			expectedVersion: input.expectedVersion,
		},
		ready,
	);
	if (!approved.ok) {
		return approved;
	}

	return openRequisition(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: input.openCorrelationId,
			requisitionId: approved.data.id,
			expectedVersion: approved.data.version,
		},
		ready,
	);
}
