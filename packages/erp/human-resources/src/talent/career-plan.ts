import { fail, ok, type Result } from "@afenda/errors/result";
import type { HumanResourcesCommandOptions } from "../command-options";
import { resolveCommandDeps } from "../command-options";
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
} from "../schemas/talent";
import { fingerprintCareerPlanCreate } from "../shared/fingerprint";
import { buildMutationMeta } from "../shared/mutation-meta";
import {
	resolveTalentProfileResourceForEmployee,
	resolveTalentProfileResourceFromCareerPlan,
	runTalentCommand,
} from "../shared/talent-command";
import type {
	CareerPlan,
	CareerPlanAction,
	CareerPlanListPage,
	CareerPlanWithActions,
} from "../types";
import {
	runAuthorizedTalentLoadedReadQuery,
	runAuthorizedTalentSubjectListQuery,
} from "./authorized-talent-read";
import {
	projectCareerPlanFromDecision,
	projectCareerPlanWithActionsFromDecision,
	talentSensitiveQueryRequestedFields,
} from "./talent-field-projection";

export const HUMAN_RESOURCES_AGGREGATE_CAREER_PLAN = "career-plan" as const;
export type HumanResourcesCareerPlanAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_CAREER_PLAN;

export function createCareerPlan(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CareerPlan>> {
	return runTalentCommand(input, options, {
		schema: createCareerPlanInputSchema,
		invalidMessage: "Invalid career plan create input",
		command: HUMAN_RESOURCES_COMMAND_CAREER_PLAN_CREATE,
		resolveResource: async (data, opts) =>
			resolveTalentProfileResourceForEmployee(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
				},
				opts,
			),
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

			return store.createCareerPlan(
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
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_CAREER_PLAN_CREATE,
				}),
			);
		},
	});
}

export function updateCareerPlan(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CareerPlan>> {
	return runTalentCommand(input, options, {
		schema: updateCareerPlanInputSchema,
		invalidMessage: "Invalid career plan update input",
		command: HUMAN_RESOURCES_COMMAND_CAREER_PLAN_UPDATE,
		resolveResource: (data, opts) =>
			resolveTalentProfileResourceFromCareerPlan(data, opts),
		execute: async (data, { store, ports }) =>
			await store.updateCareerPlan(
				{
					organizationId: data.organizationId,
					careerPlanId: data.careerPlanId,
					title: data.title,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_CAREER_PLAN_UPDATE,
				}),
			),
	});
}

export function acknowledgeCareerPlan(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CareerPlan>> {
	return runTalentCommand(input, options, {
		schema: acknowledgeCareerPlanInputSchema,
		invalidMessage: "Invalid career plan acknowledge input",
		command: HUMAN_RESOURCES_COMMAND_CAREER_PLAN_ACKNOWLEDGE,
		resolveResource: (data, opts) =>
			resolveTalentProfileResourceFromCareerPlan(data, opts),
		execute: async (data, { store, ports }) =>
			await store.acknowledgeCareerPlan(
				{
					organizationId: data.organizationId,
					careerPlanId: data.careerPlanId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_CAREER_PLAN_ACKNOWLEDGE,
				}),
			),
	});
}

export function addCareerPlanAction(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CareerPlanAction>> {
	return runTalentCommand(input, options, {
		schema: addCareerPlanActionInputSchema,
		invalidMessage: "Invalid career plan action add input",
		command: HUMAN_RESOURCES_COMMAND_CAREER_PLAN_ACTION_ADD,
		resolveResource: (data, opts) =>
			resolveTalentProfileResourceFromCareerPlan(data, opts),
		execute: async (data, { store, ports }) =>
			await store.addCareerPlanAction(
				{
					organizationId: data.organizationId,
					careerPlanId: data.careerPlanId,
					title: data.title,
					dueOn: data.dueOn ?? null,
					learningAssignmentId: data.learningAssignmentId ?? null,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_CAREER_PLAN_ACTION_ADD,
				}),
			),
	});
}

export function completeCareerPlanAction(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CareerPlanAction>> {
	return runTalentCommand(input, options, {
		schema: completeCareerPlanActionInputSchema,
		invalidMessage: "Invalid career plan action complete input",
		command: HUMAN_RESOURCES_COMMAND_CAREER_PLAN_ACTION_COMPLETE,
		resolveResource: async (data, opts) => {
			const { store } = resolveCommandDeps(opts);
			const action = await store.getCareerPlanActionById({
				organizationId: data.organizationId,
				actionId: data.actionId,
			});
			if (!action.ok || action.data === null) {
				return;
			}
			return resolveTalentProfileResourceFromCareerPlan(
				{
					organizationId: data.organizationId,
					careerPlanId: action.data.careerPlanId,
				},
				opts,
			);
		},
		execute: async (data, { store, ports }) =>
			await store.completeCareerPlanAction(
				{
					organizationId: data.organizationId,
					actionId: data.actionId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_CAREER_PLAN_ACTION_COMPLETE,
				}),
			),
	});
}

export function closeCareerPlan(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CareerPlan>> {
	return runTalentCommand(input, options, {
		schema: closeCareerPlanInputSchema,
		invalidMessage: "Invalid career plan close input",
		command: HUMAN_RESOURCES_COMMAND_CAREER_PLAN_CLOSE,
		resolveResource: (data, opts) =>
			resolveTalentProfileResourceFromCareerPlan(data, opts),
		execute: async (data, { store, ports }) =>
			await store.closeCareerPlan(
				{
					organizationId: data.organizationId,
					careerPlanId: data.careerPlanId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_CAREER_PLAN_CLOSE,
				}),
			),
	});
}

export function getCareerPlanById(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CareerPlanWithActions | null>> {
	return runAuthorizedTalentLoadedReadQuery(input, options, {
		schema: getCareerPlanByIdInputSchema,
		invalidMessage: "Invalid career plan get input",
		query: HUMAN_RESOURCES_QUERY_CAREER_PLAN_GET,
		load: async ({ data, store }) =>
			store.getCareerPlanById({
				organizationId: data.organizationId,
				careerPlanId: data.careerPlanId,
			}),
		resolveResourceFromLoaded: async (data, careerPlan, opts) =>
			resolveTalentProfileResourceForEmployee(
				{
					organizationId: data.organizationId,
					employeeId: careerPlan.employeeId,
					resourceId: data.careerPlanId,
				},
				opts,
			),
		resolveRequestedFields: () => talentSensitiveQueryRequestedFields(),
		project: (value: CareerPlanWithActions, projection) =>
			projectCareerPlanWithActionsFromDecision(value, projection),
		execute: async ({ loaded }) => ok(loaded),
	});
}

export function listEmployeeCareerPlans(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<CareerPlanListPage>> {
	return runAuthorizedTalentSubjectListQuery<
		typeof listEmployeeCareerPlansInputSchema,
		"careerPlans",
		CareerPlan,
		CareerPlan,
		CareerPlanListPage
	>(input, options, {
		schema: listEmployeeCareerPlansInputSchema,
		invalidMessage: "Invalid employee career plan list input",
		query: HUMAN_RESOURCES_QUERY_CAREER_PLAN_LIST_BY_EMPLOYEE,
		itemsKey: "careerPlans",
		resolveRequestedFields: () => talentSensitiveQueryRequestedFields(),
		projectItem: (plan, projection) =>
			projectCareerPlanFromDecision(plan, projection),
		loadPage: async ({ data, store }) =>
			store.listEmployeeCareerPlans({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				status: data.status,
			}),
	});
}
