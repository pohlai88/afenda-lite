import { randomUUID } from "node:crypto";

import type { Result } from "@afenda/errors/result";

import type { HumanResourcesEmployeeId } from "../../src/brands";
import type { HumanResourcesCommandOptions } from "../../src/command-options";
import { createEmployee } from "../../src/core/employee";
import { createEmployment } from "../../src/core/employment";
import {
	approveRequisition,
	assignHiringManager,
	createDraftRequisition,
	openRequisition,
	submitRequisition,
} from "../../src/recruitment/requisition";
import type { JobRequisition } from "../../src/types";
import { humanResourcesCodeFromResult } from "./result-details";

export type RequisitionPipelineTarget = "approved" | "open";

export type RequisitionPipelineInput = {
	organizationId: string;
	actorUserId: string;
	tag: string;
	targetStatus: RequisitionPipelineTarget;
	title?: string;
	code?: string;
	jobId?: JobRequisition["jobId"];
	positionId?: JobRequisition["positionId"];
	departmentId?: JobRequisition["departmentId"];
};

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
	if (input.requisition.hiringManagerEmployeeId === input.hiringManagerEmployeeId) {
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
): Promise<
	| { ok: true; employeeId: HumanResourcesEmployeeId }
	| { ok: false }
> {
	return seedActiveEmployee(ready, {
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

	for (const [cmd, correlationId] of transitions) {
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
			return next;
		}
		requisition = next.data;
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
