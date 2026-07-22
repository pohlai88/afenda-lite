import { fail, ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_RESERVATION_CONSUME,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_RESERVATION_RELEASE,
	HUMAN_RESOURCES_COMMAND_HEADCOUNT_RESERVE,
	HUMAN_RESOURCES_QUERY_HEADCOUNT_AVAILABILITY_GET,
	HUMAN_RESOURCES_QUERY_HEADCOUNT_RESERVATION_LIST,
	HUMAN_RESOURCES_QUERY_RECRUITMENT_HEADCOUNT_HANDOFF_GET,
} from "../module-ids";
import {
	consumeHeadcountReservationInputSchema,
	getHeadcountAvailabilityInputSchema,
	getRecruitmentHeadcountHandoffInputSchema,
	listHeadcountReservationsInputSchema,
	releaseHeadcountReservationInputSchema,
	reserveHeadcountInputSchema,
} from "../schemas";
import { fingerprintHeadcountReservation } from "../shared/fingerprint";
import {
	runWorkforcePlanningCommand,
	runWorkforcePlanningQuery,
} from "../shared/workforce-planning-command";
import { assertReservationWithinAvailability } from "../shared/workforce-planning-guards";
import type {
	HeadcountAvailability,
	HeadcountReservation,
	HeadcountReservationListPage,
	RecruitmentHeadcountHandoff,
} from "../types";
import { computeLineAvailability } from "./availability";

export const HUMAN_RESOURCES_AGGREGATE_HEADCOUNT_RESERVATION =
	"headcount-reservation" as const;
export type HumanResourcesHeadcountReservationAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_HEADCOUNT_RESERVATION;

export async function reserveHeadcount(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<HeadcountReservation>> {
	return runWorkforcePlanningCommand(input, options, {
		schema: reserveHeadcountInputSchema,
		invalidMessage: "Invalid headcount reserve input",
		command: HUMAN_RESOURCES_COMMAND_HEADCOUNT_RESERVE,
		execute: async (data, { store, ports }) => {
			const requestFingerprint = fingerprintHeadcountReservation({
				planLineId: data.planLineId,
				requisitionId: data.requisitionId,
				reservedFte: data.reservedFte,
				reservedHeadcount: data.reservedHeadcount,
			});

			const existingByKey = await store.findHeadcountReservationByIdempotencyKey(
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
					return fail(
						"CONFLICT",
						"Idempotency key reused with different payload",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
				return ok(existingByKey.data.reservation);
			}

			const line = await store.getHeadcountPlanLineById({
				organizationId: data.organizationId,
				planLineId: data.planLineId,
			});
			if (!line.ok) {
				return line;
			}
			if (line.data === null) {
				return fail(
					"NOT_FOUND",
					"Headcount plan line not found",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}

			const plan = await store.getHeadcountPlanById({
				organizationId: data.organizationId,
				planId: line.data.planId,
			});
			if (!plan.ok) {
				return plan;
			}
			if (plan.data === null || plan.data.status !== "approved") {
				return fail(
					"BAD_REQUEST",
					"Headcount reservations require an approved plan line",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}

			const requisition = await store.getRequisitionById({
				organizationId: data.organizationId,
				requisitionId: data.requisitionId,
			});
			if (!requisition.ok) {
				return requisition;
			}
			if (requisition.data === null) {
				return fail(
					"NOT_FOUND",
					"Requisition not found",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}

			const reservations = await store.listHeadcountReservationsByPlanLineId({
				organizationId: data.organizationId,
				planLineId: data.planLineId,
			});
			if (!reservations.ok) {
				return reservations;
			}
			const availability = computeLineAvailability({
				line: line.data,
				reservations: reservations.data,
			});

			const withinAvailability = assertReservationWithinAvailability({
				availableFte: availability.availableFte,
				availableHeadcount: availability.availableHeadcount,
				reservedFte: data.reservedFte,
				reservedHeadcount: data.reservedHeadcount,
			});
			if (!withinAvailability.ok) {
				return withinAvailability;
			}

			return store.reserveHeadcount(
				{
					organizationId: data.organizationId,
					planLineId: data.planLineId,
					requisitionId: data.requisitionId,
					reservedFte: data.reservedFte,
					reservedHeadcount: data.reservedHeadcount,
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

export async function releaseHeadcountReservation(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<HeadcountReservation>> {
	return runWorkforcePlanningCommand(input, options, {
		schema: releaseHeadcountReservationInputSchema,
		invalidMessage: "Invalid headcount reservation release input",
		command: HUMAN_RESOURCES_COMMAND_HEADCOUNT_RESERVATION_RELEASE,
		execute: (data, { store, ports }) =>
			store.releaseHeadcountReservation(
				{
					organizationId: data.organizationId,
					reservationId: data.reservationId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function consumeHeadcountReservation(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<HeadcountReservation>> {
	return runWorkforcePlanningCommand(input, options, {
		schema: consumeHeadcountReservationInputSchema,
		invalidMessage: "Invalid headcount reservation consume input",
		command: HUMAN_RESOURCES_COMMAND_HEADCOUNT_RESERVATION_CONSUME,
		execute: (data, { store, ports }) =>
			store.consumeHeadcountReservation(
				{
					organizationId: data.organizationId,
					reservationId: data.reservationId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			),
	});
}

export async function getHeadcountAvailability(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<HeadcountAvailability>> {
	return runWorkforcePlanningQuery(input, options, {
		schema: getHeadcountAvailabilityInputSchema,
		invalidMessage: "Invalid headcount availability get input",
		query: HUMAN_RESOURCES_QUERY_HEADCOUNT_AVAILABILITY_GET,
		execute: async (data, { store }) => {
			const availability = await store.getHeadcountAvailability({
				organizationId: data.organizationId,
				planLineId: data.planLineId,
			});
			if (!availability.ok) {
				return availability;
			}
			if (availability.data === null) {
				return fail(
					"NOT_FOUND",
					"Headcount plan line not found",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}
			return ok(availability.data);
		},
	});
}

export async function listHeadcountReservations(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<HeadcountReservationListPage>> {
	return runWorkforcePlanningQuery(input, options, {
		schema: listHeadcountReservationsInputSchema,
		invalidMessage: "Invalid headcount reservation list input",
		query: HUMAN_RESOURCES_QUERY_HEADCOUNT_RESERVATION_LIST,
		execute: (data, { store }) =>
			store.listHeadcountReservations({
				organizationId: data.organizationId,
				page: data.page ?? 1,
				pageSize: data.pageSize ?? 20,
				planId: data.planId,
				requisitionId: data.requisitionId,
			}),
	});
}

export async function getRecruitmentHeadcountHandoff(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<RecruitmentHeadcountHandoff>> {
	return runWorkforcePlanningQuery(input, options, {
		schema: getRecruitmentHeadcountHandoffInputSchema,
		invalidMessage: "Invalid recruitment headcount handoff get input",
		query: HUMAN_RESOURCES_QUERY_RECRUITMENT_HEADCOUNT_HANDOFF_GET,
		execute: (data, { store }) =>
			store.getRecruitmentHeadcountHandoff({
				organizationId: data.organizationId,
				requisitionId: data.requisitionId,
			}),
	});
}
