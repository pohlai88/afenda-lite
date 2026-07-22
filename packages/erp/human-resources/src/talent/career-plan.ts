import { fail, ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_CAREER_PLAN_ACKNOWLEDGE,
	HUMAN_RESOURCES_COMMAND_CAREER_PLAN_ACTION_ADD,
	HUMAN_RESOURCES_COMMAND_CAREER_PLAN_ACTION_COMPLETE,
	HUMAN_RESOURCES_COMMAND_CAREER_PLAN_CLOSE,
	HUMAN_RESOURCES_COMMAND_CAREER_PLAN_CREATE,
	HUMAN_RESOURCES_COMMAND_CAREER_PLAN_UPDATE,
	HUMAN_RESOURCES_QUERY_CAREER_PLAN_GET,
	HUMAN_RESOURCES_QUERY_CAREER_PLAN_LIST_BY_EMPLOYEE,
} from "../module-ids";
import {
	acknowledgeCareerPlanInputSchema,
	addCareerPlanActionInputSchema,
	closeCareerPlanInputSchema,
	completeCareerPlanActionInputSchema,
	createCareerPlanInputSchema,
	getCareerPlanByIdInputSchema,
	listEmployeeCareerPlansInputSchema,
	updateCareerPlanInputSchema,
} from "../schemas";
import { fingerprintCareerPlanCreate } from "../shared/fingerprint";
import { runTalentCommand, runTalentQuery } from "../shared/talent-command";
import type {
	CareerPlan,
	CareerPlanAction,
	CareerPlanListPage,
	CareerPlanWithActions,
} from "../types";

export const HUMAN_RESOURCES_AGGREGATE_CAREER_PLAN = "career-plan" as const;
export type HumanResourcesCareerPlanAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_CAREER_PLAN;

export async function createCareerPlan(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CareerPlan>> {
	return runTalentCommand(input, options, {
		schema: createCareerPlanInputSchema,
		invalidMessage: "Invalid career plan create input",
		command: HUMAN_RESOURCES_COMMAND_CAREER_PLAN_CREATE,
		execute: async (data, { store, ports }) => {
			const requestFingerprint = fingerprintCareerPlanCreate({
				employeeId: data.employeeId,
				code: data.code,
				title: data.title,
			});

			const existingByKey = await store.findCareerPlanByIdempotencyKey({
				organizationId: data.organizationId,
				idempotencyKey: data.idempotencyKey,
			});
			if (!existingByKey.ok) {
				return existingByKey;
			}
			if (existingByKey.data !== null) {
				if (
					existingByKey.data.createRequestFingerprint !== requestFingerprint
				) {
					return fail(
						"CONFLICT",
						"Idempotency key reused with different payload",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
				return ok(existingByKey.data.careerPlan);
			}

			return await store.createCareerPlan(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					ownerUserId: data.ownerUserId,
					code: data.code,
					title: data.title,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: requestFingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function updateCareerPlan(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CareerPlan>> {
	return runTalentCommand(input, options, {
		schema: updateCareerPlanInputSchema,
		invalidMessage: "Invalid career plan update input",
		command: HUMAN_RESOURCES_COMMAND_CAREER_PLAN_UPDATE,
		execute: async (data, { store, ports }) => {
			return await store.updateCareerPlan(
				{
					organizationId: data.organizationId,
					careerPlanId: data.careerPlanId,
					title: data.title,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function acknowledgeCareerPlan(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CareerPlan>> {
	return runTalentCommand(input, options, {
		schema: acknowledgeCareerPlanInputSchema,
		invalidMessage: "Invalid career plan acknowledge input",
		command: HUMAN_RESOURCES_COMMAND_CAREER_PLAN_ACKNOWLEDGE,
		execute: async (data, { store, ports }) => {
			return await store.acknowledgeCareerPlan(
				{
					organizationId: data.organizationId,
					careerPlanId: data.careerPlanId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function addCareerPlanAction(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CareerPlanAction>> {
	return runTalentCommand(input, options, {
		schema: addCareerPlanActionInputSchema,
		invalidMessage: "Invalid career plan action add input",
		command: HUMAN_RESOURCES_COMMAND_CAREER_PLAN_ACTION_ADD,
		execute: async (data, { store, ports }) => {
			return await store.addCareerPlanAction(
				{
					organizationId: data.organizationId,
					careerPlanId: data.careerPlanId,
					title: data.title,
					dueOn: data.dueOn ?? null,
					learningAssignmentId: data.learningAssignmentId ?? null,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function completeCareerPlanAction(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CareerPlanAction>> {
	return runTalentCommand(input, options, {
		schema: completeCareerPlanActionInputSchema,
		invalidMessage: "Invalid career plan action complete input",
		command: HUMAN_RESOURCES_COMMAND_CAREER_PLAN_ACTION_COMPLETE,
		execute: async (data, { store, ports }) => {
			return await store.completeCareerPlanAction(
				{
					organizationId: data.organizationId,
					actionId: data.actionId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function closeCareerPlan(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CareerPlan>> {
	return runTalentCommand(input, options, {
		schema: closeCareerPlanInputSchema,
		invalidMessage: "Invalid career plan close input",
		command: HUMAN_RESOURCES_COMMAND_CAREER_PLAN_CLOSE,
		execute: async (data, { store, ports }) => {
			return await store.closeCareerPlan(
				{
					organizationId: data.organizationId,
					careerPlanId: data.careerPlanId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function getCareerPlanById(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CareerPlanWithActions | null>> {
	return runTalentQuery(input, options, {
		schema: getCareerPlanByIdInputSchema,
		invalidMessage: "Invalid career plan get input",
		query: HUMAN_RESOURCES_QUERY_CAREER_PLAN_GET,
		execute: async (data, { store }) => {
			return await store.getCareerPlanById({
				organizationId: data.organizationId,
				careerPlanId: data.careerPlanId,
			});
		},
	});
}

export async function listEmployeeCareerPlans(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CareerPlanListPage>> {
	return runTalentQuery(input, options, {
		schema: listEmployeeCareerPlansInputSchema,
		invalidMessage: "Invalid employee career plan list input",
		query: HUMAN_RESOURCES_QUERY_CAREER_PLAN_LIST_BY_EMPLOYEE,
		execute: async (data, { store }) => {
			return await store.listEmployeeCareerPlans({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				status: data.status,
			});
		},
	});
}
