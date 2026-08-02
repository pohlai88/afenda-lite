import { randomUUID } from "node:crypto";

import type { Result } from "@afenda/errors";
import {
	approveRequisition,
	assignHiringManager,
	createDraftRequisition,
	openRequisition,
	submitRequisition,
} from "../../src/features/recruitment/requisition";
import { createEmployee } from "../../src/features/workforce-records/employment/employee";
import { createEmployment } from "../../src/features/workforce-records/employment/employment";
import type { JobRequisition } from "../../src/kernel/contracts";
import type { HumanResourcesCommandOptions } from "../../src/kernel/execution/command-options";
import {
	runSequential,
	sequentialReturn,
} from "../../src/kernel/execution/run-sequential";
import type { HumanResourcesEmployeeId } from "../../src/kernel/identity/brands";
import { humanResourcesCodeFromResult } from "./result-details";

export type RequisitionPipelineTarget = "approved" | "open";

export interface RequisitionPipelineInput {
	actorUserId: string;
	code?: string;
	departmentId?: JobRequisition["departmentId"];
	jobId?: JobRequisition["jobId"];
	organizationId: string;
	positionId?: JobRequisition["positionId"];
	tag: string;
	targetStatus: RequisitionPipelineTarget;
	title?: string;
}

export async function seedActiveEmployee(
	ready: HumanResourcesCommandOptions,
	input: {
		organizationId: string;
		actorUserId: string;
		employeeNumber: string;
		legalName: string;
		startsOn?: string;
	},
): Promise<{ ok: true; employeeId: HumanResourcesEmployeeId } | { ok: false }> {
	const employee = await createEmployee(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: randomUUID(),
			idempotencyKey: randomUUID(),
			employeeNumber: input.employeeNumber,
			legalName: input.legalName,
		},
		ready,
	);
	if (!employee.ok) {
		return { ok: false };
	}

	const employment = await createEmployment(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: randomUUID(),
			employeeId: employee.data.id,
			startsOn: input.startsOn ?? "2020-01-01",
		},
		ready,
	);
	if (!employment.ok) {
		return { ok: false };
	}

	return { ok: true, employeeId: employee.data.id };
}

export async function ensureRequisitionHiringManager(
	ready: HumanResourcesCommandOptions,
	input: {
		organizationId: string;
		actorUserId: string;
		requisition: JobRequisition;
		hiringManagerEmployeeId: HumanResourcesEmployeeId;
		correlationId?: string;
	},
): Promise<
	| { ok: true; requisition: JobRequisition }
	| { ok: false; error: Awaited<ReturnType<typeof assignHiringManager>> }
> {
	if (
		input.requisition.hiringManagerEmployeeId === input.hiringManagerEmployeeId
	) {
		return { ok: true, requisition: input.requisition };
	}

	const assigned = await assignHiringManager(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: input.correlationId ?? randomUUID(),
			requisitionId: input.requisition.id,
			hiringManagerEmployeeId: input.hiringManagerEmployeeId,
			expectedVersion: input.requisition.version,
		},
		ready,
	);
	if (!assigned.ok) {
		return { ok: false, error: assigned };
	}
	return { ok: true, requisition: assigned.data };
}

export async function seedDefaultHiringManager(
	ready: HumanResourcesCommandOptions,
	input: {
		organizationId: string;
		actorUserId: string;
		tag: string;
	},
): Promise<{ ok: true; employeeId: HumanResourcesEmployeeId } | { ok: false }> {
	return await seedActiveEmployee(ready, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		employeeNumber: `HM-${input.tag}`.slice(0, 32),
		legalName: `Hiring Manager ${input.tag}`,
	});
}

export async function seedRequisitionPipeline(
	ready: HumanResourcesCommandOptions,
	input: RequisitionPipelineInput,
): Promise<Result<JobRequisition>> {
	const manager = await seedDefaultHiringManager(ready, {
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		tag: input.tag,
	});
	if (!manager.ok) {
		throw new Error("Failed to seed hiring manager for requisition pipeline");
	}

	const draft = await createDraftRequisition(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-req-${input.tag}`,
			idempotencyKey: `idem-req-${input.tag}`,
			code: (input.code ?? `REQ-${input.tag}`).slice(0, 64),
			title: input.title ?? "Hire",
			jobId: input.jobId,
			positionId: input.positionId,
			departmentId: input.departmentId,
			hiringManagerEmployeeId: manager.employeeId,
		},
		ready,
	);
	if (!draft.ok) {
		return draft;
	}

	let requisition = draft.data;
	const transitions =
		input.targetStatus === "approved"
			? ([
					[submitRequisition, `corr-req-submit-${input.tag}`],
					[approveRequisition, `corr-req-approve-${input.tag}`],
				] as const)
			: ([
					[submitRequisition, `corr-req-submit-${input.tag}`],
					[approveRequisition, `corr-req-approve-${input.tag}`],
					[openRequisition, `corr-req-open-${input.tag}`],
				] as const);

	const sequentialOutcome1 = await runSequential(
		transitions,
		async ([cmd, correlationId]) => {
			const next = await cmd(
				{
					organizationId: input.organizationId,
					actorUserId: input.actorUserId,
					correlationId,
					requisitionId: requisition.id,
					expectedVersion: requisition.version,
				},
				ready,
			);
			if (!next.ok) {
				return sequentialReturn(next);
			}
			requisition = next.data;
		},
	);
	if (sequentialOutcome1.kind === "return") {
		return sequentialOutcome1.value;
	}

	return { ok: true, data: requisition };
}

export function expectRequisitionPipeline(
	result: Awaited<ReturnType<typeof seedRequisitionPipeline>>,
	label = "seedRequisitionPipeline",
): asserts result is { ok: true; data: JobRequisition } {
	if (!result.ok) {
		throw new Error(
			`${label} failed: ${result.code} ${result.message} (${humanResourcesCodeFromResult(result) ?? "unknown"})`,
		);
	}
}
