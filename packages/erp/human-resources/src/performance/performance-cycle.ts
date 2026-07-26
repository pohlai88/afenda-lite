import { fail, ok, type Result } from "@afenda/errors/result";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_ADD_PARTICIPANT,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_CANCEL,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_CLOSE,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_CREATE,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_ENROLL_ELIGIBLE,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_OPEN,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_PUBLISH,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_REMOVE_PARTICIPANT,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_SET_ELIGIBILITY,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_SET_REVIEW_PERIODS,
	HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_UPDATE,
	HUMAN_RESOURCES_QUERY_PERFORMANCE_CYCLE_GET,
	HUMAN_RESOURCES_QUERY_PERFORMANCE_CYCLE_GET_ELIGIBILITY,
	HUMAN_RESOURCES_QUERY_PERFORMANCE_CYCLE_LIST,
	HUMAN_RESOURCES_QUERY_PERFORMANCE_CYCLE_LIST_PARTICIPANTS,
	HUMAN_RESOURCES_QUERY_PERFORMANCE_CYCLE_LIST_REVIEW_PERIODS,
} from "../module-ids";
import {
	addCycleParticipantInputSchema,
	createPerformanceCycleInputSchema,
	enrollEligibleCycleParticipantsInputSchema,
	getPerformanceCycleByIdInputSchema,
	getPerformanceCycleEligibilityInputSchema,
	listCycleParticipantsInputSchema,
	listPerformanceCycleReviewPeriodsInputSchema,
	listPerformanceCyclesInputSchema,
	performanceCycleStatusTransitionInputSchema,
	removeCycleParticipantInputSchema,
	setPerformanceCycleEligibilityInputSchema,
	setPerformanceCycleReviewPeriodsInputSchema,
	updatePerformanceCycleInputSchema,
} from "../schemas/performance";
import { fingerprintPerformanceCycleCreate } from "../shared/fingerprint";
import { buildMutationMeta } from "../shared/mutation-meta";
import {
	runPerformanceCommand,
	runPerformanceQuery,
} from "../shared/performance-command";
import { assertRatingScaleUniqueCodes } from "../shared/performance-rating";
import type {
	PerformanceCycle,
	PerformanceCycleEligibility,
	PerformanceCycleListPage,
	PerformanceCycleParticipant,
	PerformanceCycleReviewPeriod,
} from "../types";

export const HUMAN_RESOURCES_AGGREGATE_PERFORMANCE_CYCLE =
	"performance-cycle" as const;
export type HumanResourcesPerformanceCycleAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_PERFORMANCE_CYCLE;

export async function createPerformanceCycle(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycle>> {
	return runPerformanceCommand(input, options, {
		schema: createPerformanceCycleInputSchema,
		invalidMessage: "Invalid performance cycle create input",
		command: HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_CREATE,
		execute: async (data, { store, ports }) => {
			const scaleCheck = assertRatingScaleUniqueCodes(data.ratingScale);
			if (!scaleCheck.ok) {
				return scaleCheck;
			}

			const requestFingerprint = fingerprintPerformanceCycleCreate({
				code: data.code,
				name: data.name,
				periodStart: data.periodStart,
				periodEnd: data.periodEnd,
				weightingModel: data.weightingModel,
			});

			const existingByKey = await store.findPerformanceCycleByIdempotencyKey({
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
				return ok(existingByKey.data.cycle);
			}

			return store.createPerformanceCycle(
				{
					organizationId: data.organizationId,
					code: data.code,
					name: data.name,
					periodStart: data.periodStart,
					periodEnd: data.periodEnd,
					ratingScale: scaleCheck.data,
					weightingModel: data.weightingModel,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: requestFingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_CREATE,
				}),
			);
		},
	});
}

export async function updatePerformanceCycle(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycle>> {
	return runPerformanceCommand(input, options, {
		schema: updatePerformanceCycleInputSchema,
		invalidMessage: "Invalid performance cycle update input",
		command: HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_UPDATE,
		execute: async (data, { store, ports }) => {
			if (data.ratingScale !== undefined) {
				const scaleCheck = assertRatingScaleUniqueCodes(data.ratingScale);
				if (!scaleCheck.ok) {
					return scaleCheck;
				}
			}
			return store.updatePerformanceCycle(
				{
					organizationId: data.organizationId,
					cycleId: data.cycleId,
					name: data.name,
					periodStart: data.periodStart,
					periodEnd: data.periodEnd,
					ratingScale: data.ratingScale,
					weightingModel: data.weightingModel,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_UPDATE,
				}),
			);
		},
	});
}

export async function publishPerformanceCycle(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycle>> {
	return runPerformanceCommand(input, options, {
		schema: performanceCycleStatusTransitionInputSchema,
		invalidMessage: "Invalid performance cycle publish input",
		command: HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_PUBLISH,
		execute: (data, { store, ports }) =>
			store.publishPerformanceCycle(
				{
					organizationId: data.organizationId,
					cycleId: data.cycleId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_PUBLISH,
				}),
			),
	});
}

export async function openPerformanceCycle(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycle>> {
	return runPerformanceCommand(input, options, {
		schema: performanceCycleStatusTransitionInputSchema,
		invalidMessage: "Invalid performance cycle open input",
		command: HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_OPEN,
		execute: (data, { store, ports }) =>
			store.openPerformanceCycle(
				{
					organizationId: data.organizationId,
					cycleId: data.cycleId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_OPEN,
				}),
			),
	});
}

export async function closePerformanceCycle(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycle>> {
	return runPerformanceCommand(input, options, {
		schema: performanceCycleStatusTransitionInputSchema,
		invalidMessage: "Invalid performance cycle close input",
		command: HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_CLOSE,
		execute: (data, { store, ports }) =>
			store.closePerformanceCycle(
				{
					organizationId: data.organizationId,
					cycleId: data.cycleId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_CLOSE,
				}),
			),
	});
}

export async function cancelPerformanceCycle(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycle>> {
	return runPerformanceCommand(input, options, {
		schema: performanceCycleStatusTransitionInputSchema,
		invalidMessage: "Invalid performance cycle cancel input",
		command: HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_CANCEL,
		execute: (data, { store, ports }) =>
			store.cancelPerformanceCycle(
				{
					organizationId: data.organizationId,
					cycleId: data.cycleId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_CANCEL,
				}),
			),
	});
}

export async function setPerformanceCycleReviewPeriods(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycleReviewPeriod[]>> {
	return runPerformanceCommand(input, options, {
		schema: setPerformanceCycleReviewPeriodsInputSchema,
		invalidMessage: "Invalid performance cycle review periods input",
		command: HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_SET_REVIEW_PERIODS,
		execute: (data, { store, ports }) =>
			store.setPerformanceCycleReviewPeriods(
				{
					organizationId: data.organizationId,
					cycleId: data.cycleId,
					periods: data.periods,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId:
						HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_SET_REVIEW_PERIODS,
				}),
			),
	});
}

export async function listPerformanceCycleReviewPeriods(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycleReviewPeriod[]>> {
	return runPerformanceQuery(input, options, {
		schema: listPerformanceCycleReviewPeriodsInputSchema,
		invalidMessage: "Invalid performance cycle review periods list input",
		query: HUMAN_RESOURCES_QUERY_PERFORMANCE_CYCLE_LIST_REVIEW_PERIODS,
		execute: (data, { store }) =>
			store.listPerformanceCycleReviewPeriods({
				organizationId: data.organizationId,
				cycleId: data.cycleId,
			}),
	});
}

export async function setPerformanceCycleEligibility(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycleEligibility>> {
	return runPerformanceCommand(input, options, {
		schema: setPerformanceCycleEligibilityInputSchema,
		invalidMessage: "Invalid performance cycle eligibility input",
		command: HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_SET_ELIGIBILITY,
		execute: (data, { store, ports }) =>
			store.setPerformanceCycleEligibility(
				{
					organizationId: data.organizationId,
					cycleId: data.cycleId,
					minTenureDays: data.minTenureDays,
					allowedEmploymentStatuses: data.allowedEmploymentStatuses,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId:
						HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_SET_ELIGIBILITY,
				}),
			),
	});
}

export async function getPerformanceCycleEligibility(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycleEligibility | null>> {
	return runPerformanceQuery(input, options, {
		schema: getPerformanceCycleEligibilityInputSchema,
		invalidMessage: "Invalid performance cycle eligibility get input",
		query: HUMAN_RESOURCES_QUERY_PERFORMANCE_CYCLE_GET_ELIGIBILITY,
		execute: (data, { store }) =>
			store.getPerformanceCycleEligibility({
				organizationId: data.organizationId,
				cycleId: data.cycleId,
			}),
	});
}

export async function enrollEligibleCycleParticipants(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycleParticipant[]>> {
	return runPerformanceCommand(input, options, {
		schema: enrollEligibleCycleParticipantsInputSchema,
		invalidMessage: "Invalid performance cycle enrollment input",
		command: HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_ENROLL_ELIGIBLE,
		execute: (data, { store, ports }) =>
			store.enrollEligibleCycleParticipants(
				{
					organizationId: data.organizationId,
					cycleId: data.cycleId,
					asOfDate: data.asOfDate ?? new Date().toISOString().slice(0, 10),
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId:
						HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_ENROLL_ELIGIBLE,
				}),
			),
	});
}

export async function addCycleParticipant(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycleParticipant>> {
	return runPerformanceCommand(input, options, {
		schema: addCycleParticipantInputSchema,
		invalidMessage: "Invalid cycle participant add input",
		command: HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_ADD_PARTICIPANT,
		execute: (data, { store, ports }) =>
			store.addCycleParticipant(
				{
					organizationId: data.organizationId,
					cycleId: data.cycleId,
					employeeId: data.employeeId,
					employmentId: data.employmentId,
					asOfDate: data.asOfDate,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId:
						HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_ADD_PARTICIPANT,
				}),
			),
	});
}

export async function removeCycleParticipant(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycleParticipant>> {
	return runPerformanceCommand(input, options, {
		schema: removeCycleParticipantInputSchema,
		invalidMessage: "Invalid cycle participant remove input",
		command: HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_REMOVE_PARTICIPANT,
		execute: (data, { store, ports }) =>
			store.removeCycleParticipant(
				{
					organizationId: data.organizationId,
					cycleId: data.cycleId,
					participantId: data.participantId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId:
						HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_REMOVE_PARTICIPANT,
				}),
			),
	});
}

export async function getPerformanceCycleById(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycle | null>> {
	return runPerformanceQuery(input, options, {
		schema: getPerformanceCycleByIdInputSchema,
		invalidMessage: "Invalid performance cycle get input",
		query: HUMAN_RESOURCES_QUERY_PERFORMANCE_CYCLE_GET,
		execute: (data, { store }) =>
			store.getPerformanceCycleById({
				organizationId: data.organizationId,
				cycleId: data.cycleId,
			}),
	});
}

export async function listPerformanceCycles(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycleListPage>> {
	return runPerformanceQuery(input, options, {
		schema: listPerformanceCyclesInputSchema,
		invalidMessage: "Invalid performance cycle list input",
		query: HUMAN_RESOURCES_QUERY_PERFORMANCE_CYCLE_LIST,
		execute: (data, { store }) =>
			store.listPerformanceCycles({
				organizationId: data.organizationId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				status: data.status,
			}),
	});
}

export async function listCycleParticipants(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycleParticipant[]>> {
	return runPerformanceQuery(input, options, {
		schema: listCycleParticipantsInputSchema,
		invalidMessage: "Invalid cycle participants list input",
		query: HUMAN_RESOURCES_QUERY_PERFORMANCE_CYCLE_LIST_PARTICIPANTS,
		execute: (data, { store }) =>
			store.listCycleParticipants({
				organizationId: data.organizationId,
				cycleId: data.cycleId,
			}),
	});
}
