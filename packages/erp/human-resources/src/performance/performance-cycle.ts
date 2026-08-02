import { errorResult, type Result } from "@afenda/errors";
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
import { assertRatingScaleUniqueCodes } from "../shared/performance-rating";
import type {
	PerformanceCycle,
	PerformanceCycleEligibility,
	PerformanceCycleListPage,
	PerformanceCycleParticipant,
	PerformanceCycleReviewPeriod,
} from "../types";
import {
	runPerformanceCapabilityCommand,
	runPerformanceCapabilityQuery,
} from "./run-operation";

export const HUMAN_RESOURCES_AGGREGATE_PERFORMANCE_CYCLE =
	"performance-cycle" as const;
export type HumanResourcesPerformanceCycleAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_PERFORMANCE_CYCLE;

export function createPerformanceCycle(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycle>> {
	return runPerformanceCapabilityCommand(input, options, {
		storeMethods: [
			"createPerformanceCycle",
			"findPerformanceCycleByIdempotencyKey",
		],
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
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
						internalContext: humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CONFLICT,
						),
					});
				}
				return errorResult.ok(existingByKey.data.cycle);
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

export function updatePerformanceCycle(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycle>> {
	return runPerformanceCapabilityCommand(input, options, {
		storeMethods: ["updatePerformanceCycle"],
		schema: updatePerformanceCycleInputSchema,
		invalidMessage: "Invalid performance cycle update input",
		command: HUMAN_RESOURCES_COMMAND_PERFORMANCE_CYCLE_UPDATE,
		execute: (data, { store, ports }) => {
			if (data.ratingScale !== undefined) {
				const scaleCheck = assertRatingScaleUniqueCodes(data.ratingScale);
				if (!scaleCheck.ok) {
					return Promise.resolve(scaleCheck);
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

export function publishPerformanceCycle(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycle>> {
	return runPerformanceCapabilityCommand(input, options, {
		storeMethods: ["publishPerformanceCycle"],
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

export function openPerformanceCycle(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycle>> {
	return runPerformanceCapabilityCommand(input, options, {
		storeMethods: ["openPerformanceCycle"],
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

export function closePerformanceCycle(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycle>> {
	return runPerformanceCapabilityCommand(input, options, {
		storeMethods: ["closePerformanceCycle"],
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

export function cancelPerformanceCycle(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycle>> {
	return runPerformanceCapabilityCommand(input, options, {
		storeMethods: ["cancelPerformanceCycle"],
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

export function setPerformanceCycleReviewPeriods(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycleReviewPeriod[]>> {
	return runPerformanceCapabilityCommand(input, options, {
		storeMethods: ["setPerformanceCycleReviewPeriods"],
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

export function listPerformanceCycleReviewPeriods(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycleReviewPeriod[]>> {
	return runPerformanceCapabilityQuery(input, options, {
		storeMethods: ["listPerformanceCycleReviewPeriods"],
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

export function setPerformanceCycleEligibility(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycleEligibility>> {
	return runPerformanceCapabilityCommand(input, options, {
		storeMethods: ["setPerformanceCycleEligibility"],
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

export function getPerformanceCycleEligibility(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycleEligibility | null>> {
	return runPerformanceCapabilityQuery(input, options, {
		storeMethods: ["getPerformanceCycleEligibility"],
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

export function enrollEligibleCycleParticipants(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycleParticipant[]>> {
	return runPerformanceCapabilityCommand(input, options, {
		storeMethods: ["enrollEligibleCycleParticipants"],
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

export function addCycleParticipant(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycleParticipant>> {
	return runPerformanceCapabilityCommand(input, options, {
		storeMethods: ["addCycleParticipant"],
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

export function removeCycleParticipant(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycleParticipant>> {
	return runPerformanceCapabilityCommand(input, options, {
		storeMethods: ["removeCycleParticipant"],
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

export function getPerformanceCycleById(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycle | null>> {
	return runPerformanceCapabilityQuery(input, options, {
		storeMethods: ["getPerformanceCycleById"],
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

export function listPerformanceCycles(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycleListPage>> {
	return runPerformanceCapabilityQuery(input, options, {
		storeMethods: ["listPerformanceCycles"],
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

export function listCycleParticipants(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PerformanceCycleParticipant[]>> {
	return runPerformanceCapabilityQuery(input, options, {
		storeMethods: ["listCycleParticipants"],
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
