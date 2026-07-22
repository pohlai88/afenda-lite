import type { Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_COMMAND_BENEFIT_PLAN_ARCHIVE,
	HUMAN_RESOURCES_COMMAND_BENEFIT_PLAN_CREATE,
	HUMAN_RESOURCES_COMMAND_BENEFIT_PLAN_UPDATE,
} from "../module-ids";
import {
	archiveBenefitPlanInputSchema,
	createBenefitPlanInputSchema,
	updateBenefitPlanInputSchema,
} from "../schemas/compensation";
import { runCompensationCommand } from "../shared/compensation-command";
import type { BenefitPlan } from "../types";

export const HUMAN_RESOURCES_AGGREGATE_BENEFIT_PLAN = "benefit_plan" as const;
export type HumanResourcesBenefitPlanAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_BENEFIT_PLAN;

export async function createBenefitPlan(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<BenefitPlan>> {
	return runCompensationCommand(input, options, {
		schema: createBenefitPlanInputSchema,
		invalidMessage: "Invalid benefit plan create input",
		command: HUMAN_RESOURCES_COMMAND_BENEFIT_PLAN_CREATE,
		execute: (data, { store, ports }) =>
			store.createBenefitPlan(
				{
					organizationId: data.organizationId,
					code: data.code,
					name: data.name,
					eligibilityNote: data.eligibilityNote ?? null,
					createdBy: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function updateBenefitPlan(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<BenefitPlan>> {
	return runCompensationCommand(input, options, {
		schema: updateBenefitPlanInputSchema,
		invalidMessage: "Invalid benefit plan update input",
		command: HUMAN_RESOURCES_COMMAND_BENEFIT_PLAN_UPDATE,
		execute: (data, { store, ports }) =>
			store.updateBenefitPlan(
				{
					organizationId: data.organizationId,
					planId: data.planId,
					name: data.name,
					eligibilityNote: data.eligibilityNote,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function archiveBenefitPlan(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<BenefitPlan>> {
	return runCompensationCommand(input, options, {
		schema: archiveBenefitPlanInputSchema,
		invalidMessage: "Invalid benefit plan archive input",
		command: HUMAN_RESOURCES_COMMAND_BENEFIT_PLAN_ARCHIVE,
		execute: (data, { store, ports }) =>
			store.archiveBenefitPlan(
				{
					organizationId: data.organizationId,
					planId: data.planId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}
