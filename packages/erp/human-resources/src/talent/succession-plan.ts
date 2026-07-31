import { errorResult, type Result } from "@afenda/errors";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_SUCCESSION_CANDIDATE_APPROVE,
	HUMAN_RESOURCES_COMMAND_SUCCESSION_CANDIDATE_ASSESS_READINESS,
	HUMAN_RESOURCES_COMMAND_SUCCESSION_CANDIDATE_NOMINATE,
	HUMAN_RESOURCES_COMMAND_SUCCESSION_CANDIDATE_REMOVE,
	HUMAN_RESOURCES_COMMAND_SUCCESSION_PLAN_CLOSE,
	HUMAN_RESOURCES_COMMAND_SUCCESSION_PLAN_CREATE,
	HUMAN_RESOURCES_COMMAND_SUCCESSION_PLAN_UPDATE,
	HUMAN_RESOURCES_QUERY_POSITION_SUCCESSION_COVERAGE_GET,
	HUMAN_RESOURCES_QUERY_SUCCESSION_CANDIDATE_LIST,
	HUMAN_RESOURCES_QUERY_SUCCESSION_PLAN_GET,
	HUMAN_RESOURCES_QUERY_SUCCESSION_PLAN_LIST,
} from "../module-ids";
import {
	approveSuccessionCandidateInputSchema,
	assessSuccessionReadinessInputSchema,
	createSuccessionPlanInputSchema,
	getPositionSuccessionCoverageInputSchema,
	getSuccessionPlanByIdInputSchema,
	listSuccessionCandidatesInputSchema,
	listSuccessionPlansInputSchema,
	nominateSuccessionCandidateInputSchema,
	removeSuccessionCandidateInputSchema,
	successionPlanStatusTransitionInputSchema,
	updateSuccessionPlanInputSchema,
} from "../schemas/talent";
import { TALENT_SUCCESSION_SENSITIVE_FIELD_NAMES } from "../shared/field-projection";
import {
	fingerprintSuccessionCandidateCreate,
	fingerprintSuccessionPlanCreate,
} from "../shared/fingerprint";
import { buildMutationMeta } from "../shared/mutation-meta";
import { runTalentCommand, runTalentQuery } from "../shared/talent-command";
import type {
	PositionSuccessionCoverage,
	SuccessionCandidate,
	SuccessionCandidateListPage,
	SuccessionPlan,
	SuccessionPlanListPage,
} from "../types";
import {
	type ProjectedSuccessionCandidateListPage,
	projectSuccessionCandidateListFromDecision,
	SUCCESSION_CANDIDATE_SENSITIVE_FIELD_NAMES,
	talentSensitiveQueryRequestedFields,
} from "./talent-field-projection";

export const HUMAN_RESOURCES_AGGREGATE_SUCCESSION_PLAN =
	"succession-plan" as const;
export type HumanResourcesSuccessionPlanAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_SUCCESSION_PLAN;

export function createSuccessionPlan(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<SuccessionPlan>> {
	return runTalentCommand(input, options, {
		schema: createSuccessionPlanInputSchema,
		invalidMessage: "Invalid succession plan create input",
		command: HUMAN_RESOURCES_COMMAND_SUCCESSION_PLAN_CREATE,
		execute: async (data, { store, ports }) => {
			const requestFingerprint = fingerprintSuccessionPlanCreate({
				code: data.code,
				title: data.title,
				positionId: data.positionId,
			});

			const existingByKey = await store.findSuccessionPlanByIdempotencyKey({
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
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
						internalContext: humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CONFLICT,
						),
					});
				}
				return errorResult.ok(existingByKey.data.successionPlan);
			}

			return store.createSuccessionPlan(
				{
					organizationId: data.organizationId,
					code: data.code,
					title: data.title,
					positionId: data.positionId,
					allowsExternalCandidates: data.allowsExternalCandidates ?? false,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: requestFingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_SUCCESSION_PLAN_CREATE,
				}),
			);
		},
	});
}

export function updateSuccessionPlan(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<SuccessionPlan>> {
	return runTalentCommand(input, options, {
		schema: updateSuccessionPlanInputSchema,
		invalidMessage: "Invalid succession plan update input",
		command: HUMAN_RESOURCES_COMMAND_SUCCESSION_PLAN_UPDATE,
		execute: async (data, { store, ports }) =>
			await store.updateSuccessionPlan(
				{
					organizationId: data.organizationId,
					successionPlanId: data.successionPlanId,
					title: data.title,
					allowsExternalCandidates: data.allowsExternalCandidates,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_SUCCESSION_PLAN_UPDATE,
				}),
			),
	});
}

export function nominateSuccessionCandidate(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<SuccessionCandidate>> {
	return runTalentCommand(input, options, {
		schema: nominateSuccessionCandidateInputSchema,
		invalidMessage: "Invalid succession candidate nomination input",
		command: HUMAN_RESOURCES_COMMAND_SUCCESSION_CANDIDATE_NOMINATE,
		execute: async (data, { store, ports }) => {
			const employeeId = data.employeeId ?? null;
			const externalCandidateRef = data.externalCandidateRef ?? null;
			const requestFingerprint = fingerprintSuccessionCandidateCreate({
				successionPlanId: data.successionPlanId,
				employeeId,
				externalCandidateRef,
				nominatorUserId: data.nominatorUserId,
			});

			const existingByKey = await store.findSuccessionCandidateByIdempotencyKey(
				{
					organizationId: data.organizationId,
					idempotencyKey: data.idempotencyKey,
				},
			);
			if (!existingByKey.ok) {
				return existingByKey;
			}
			if (existingByKey.data !== null) {
				if (
					existingByKey.data.createRequestFingerprint !== requestFingerprint
				) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
						internalContext: humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CONFLICT,
						),
					});
				}
				return errorResult.ok(existingByKey.data.candidate);
			}

			return store.nominateSuccessionCandidate(
				{
					organizationId: data.organizationId,
					successionPlanId: data.successionPlanId,
					employeeId,
					externalCandidateRef,
					nominatorUserId: data.nominatorUserId,
					readiness: data.readiness,
					readinessEffectiveOn: data.readinessEffectiveOn,
					evidenceSummary: data.evidenceSummary,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: requestFingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_SUCCESSION_CANDIDATE_NOMINATE,
				}),
			);
		},
	});
}

export function assessSuccessionReadiness(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<SuccessionCandidate>> {
	return runTalentCommand(input, options, {
		schema: assessSuccessionReadinessInputSchema,
		invalidMessage: "Invalid succession readiness assessment input",
		command: HUMAN_RESOURCES_COMMAND_SUCCESSION_CANDIDATE_ASSESS_READINESS,
		execute: async (data, { store, ports }) =>
			await store.assessSuccessionReadiness(
				{
					organizationId: data.organizationId,
					candidateId: data.candidateId,
					readiness: data.readiness,
					readinessEffectiveOn: data.readinessEffectiveOn,
					evidenceSummary: data.evidenceSummary,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId:
						HUMAN_RESOURCES_COMMAND_SUCCESSION_CANDIDATE_ASSESS_READINESS,
				}),
			),
	});
}

export function approveSuccessionCandidate(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<SuccessionCandidate>> {
	return runTalentCommand(input, options, {
		schema: approveSuccessionCandidateInputSchema,
		invalidMessage: "Invalid succession candidate approval input",
		command: HUMAN_RESOURCES_COMMAND_SUCCESSION_CANDIDATE_APPROVE,
		execute: async (data, { store, ports }) =>
			await store.approveSuccessionCandidate(
				{
					organizationId: data.organizationId,
					candidateId: data.candidateId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_SUCCESSION_CANDIDATE_APPROVE,
				}),
			),
	});
}

export function removeSuccessionCandidate(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<SuccessionCandidate>> {
	return runTalentCommand(input, options, {
		schema: removeSuccessionCandidateInputSchema,
		invalidMessage: "Invalid succession candidate removal input",
		command: HUMAN_RESOURCES_COMMAND_SUCCESSION_CANDIDATE_REMOVE,
		execute: async (data, { store, ports }) =>
			await store.removeSuccessionCandidate(
				{
					organizationId: data.organizationId,
					candidateId: data.candidateId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_SUCCESSION_CANDIDATE_REMOVE,
				}),
			),
	});
}

export function closeSuccessionPlan(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<SuccessionPlan>> {
	return runTalentCommand(input, options, {
		schema: successionPlanStatusTransitionInputSchema,
		invalidMessage: "Invalid succession plan close input",
		command: HUMAN_RESOURCES_COMMAND_SUCCESSION_PLAN_CLOSE,
		execute: async (data, { store, ports }) =>
			await store.closeSuccessionPlan(
				{
					organizationId: data.organizationId,
					successionPlanId: data.successionPlanId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_SUCCESSION_PLAN_CLOSE,
				}),
			),
	});
}

export function getSuccessionPlanById(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<SuccessionPlan | null>> {
	return runTalentQuery(input, options, {
		schema: getSuccessionPlanByIdInputSchema,
		invalidMessage: "Invalid succession plan get input",
		query: HUMAN_RESOURCES_QUERY_SUCCESSION_PLAN_GET,
		execute: async (data, { store }) =>
			await store.getSuccessionPlanById({
				organizationId: data.organizationId,
				successionPlanId: data.successionPlanId,
			}),
	});
}

export function listSuccessionPlans(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<SuccessionPlanListPage>> {
	return runTalentQuery(input, options, {
		schema: listSuccessionPlansInputSchema,
		invalidMessage: "Invalid succession plan list input",
		query: HUMAN_RESOURCES_QUERY_SUCCESSION_PLAN_LIST,
		execute: async (data, { store }) =>
			await store.listSuccessionPlans({
				organizationId: data.organizationId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				positionId: data.positionId,
				status: data.status,
			}),
	});
}

export function listSuccessionCandidates(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ProjectedSuccessionCandidateListPage>> {
	return runTalentQuery(input, options, {
		schema: listSuccessionCandidatesInputSchema,
		invalidMessage: "Invalid succession candidate list input",
		query: HUMAN_RESOURCES_QUERY_SUCCESSION_CANDIDATE_LIST,
		resolveRequestedFields: () =>
			talentSensitiveQueryRequestedFields([
				...SUCCESSION_CANDIDATE_SENSITIVE_FIELD_NAMES,
				...TALENT_SUCCESSION_SENSITIVE_FIELD_NAMES,
			]),
		project: (value: SuccessionCandidateListPage, projection) =>
			projectSuccessionCandidateListFromDecision(value, projection),
		execute: async (data, { store }) =>
			await store.listSuccessionCandidates({
				organizationId: data.organizationId,
				successionPlanId: data.successionPlanId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				status: data.status,
			}),
	});
}

export function getPositionSuccessionCoverage(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PositionSuccessionCoverage>> {
	return runTalentQuery(input, options, {
		schema: getPositionSuccessionCoverageInputSchema,
		invalidMessage: "Invalid position succession coverage get input",
		query: HUMAN_RESOURCES_QUERY_POSITION_SUCCESSION_COVERAGE_GET,
		execute: async (data, { store }) =>
			await store.getPositionSuccessionCoverage({
				organizationId: data.organizationId,
				positionId: data.positionId,
			}),
	});
}
