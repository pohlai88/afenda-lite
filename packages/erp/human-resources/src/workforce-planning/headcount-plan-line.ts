import type { Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_LINE_ADD,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_LINE_REMOVE,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_LINE_UPDATE,
} from "../module-ids";
import {
	addHeadcountPlanLineInputSchema,
	removeHeadcountPlanLineInputSchema,
	updateHeadcountPlanLineInputSchema,
} from "../schemas";
import { runWorkforcePlanningCommand } from "../shared/workforce-planning-command";
import type { HeadcountPlanLine } from "../types";

export const HUMAN_RESOURCES_AGGREGATE_HEADCOUNT_PLAN_LINE =
	"headcount-plan-line" as const;
export type HumanResourcesHeadcountPlanLineAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_HEADCOUNT_PLAN_LINE;

export async function addHeadcountPlanLine(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<HeadcountPlanLine>> {
	return runWorkforcePlanningCommand(input, options, {
		schema: addHeadcountPlanLineInputSchema,
		invalidMessage: "Invalid headcount plan line add input",
		command: HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_LINE_ADD,
		execute: (data, { store, ports }) =>
			store.addHeadcountPlanLine(
				{
					organizationId: data.organizationId,
					planId: data.planId,
					departmentId: data.departmentId ?? null,
					jobId: data.jobId ?? null,
					positionId: data.positionId ?? null,
					locationCode: data.locationCode?.trim() ?? null,
					employmentType: data.employmentType ?? null,
					plannedFte: data.plannedFte,
					plannedHeadcount: data.plannedHeadcount,
					costEnvelopeAmount: data.costEnvelopeAmount ?? null,
					costEnvelopeCurrencyCode: data.costEnvelopeCurrencyCode ?? null,
					createdBy: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function updateHeadcountPlanLine(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<HeadcountPlanLine>> {
	return runWorkforcePlanningCommand(input, options, {
		schema: updateHeadcountPlanLineInputSchema,
		invalidMessage: "Invalid headcount plan line update input",
		command: HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_LINE_UPDATE,
		execute: (data, { store, ports }) =>
			store.updateHeadcountPlanLine(
				{
					organizationId: data.organizationId,
					planLineId: data.planLineId,
					departmentId: data.departmentId,
					jobId: data.jobId,
					positionId: data.positionId,
					locationCode: data.locationCode,
					employmentType: data.employmentType,
					plannedFte: data.plannedFte,
					plannedHeadcount: data.plannedHeadcount,
					costEnvelopeAmount: data.costEnvelopeAmount,
					costEnvelopeCurrencyCode: data.costEnvelopeCurrencyCode,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function removeHeadcountPlanLine(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<void>> {
	return runWorkforcePlanningCommand(input, options, {
		schema: removeHeadcountPlanLineInputSchema,
		invalidMessage: "Invalid headcount plan line remove input",
		command: HUMAN_RESOURCES_COMMAND_HEADCOUNT_PLAN_LINE_REMOVE,
		execute: (data, { store, ports }) =>
			store.removeHeadcountPlanLine(
				{
					organizationId: data.organizationId,
					planLineId: data.planLineId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}
