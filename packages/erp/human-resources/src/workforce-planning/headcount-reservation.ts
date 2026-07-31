import { errorResult, type Result } from "@afenda/errors";
import type { z } from "zod";
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
import type { MutationPorts } from "../ports";
import {
	consumeHeadcountReservationInputSchema,
	getHeadcountAvailabilityInputSchema,
	getRecruitmentHeadcountHandoffInputSchema,
	listHeadcountReservationsInputSchema,
	releaseHeadcountReservationInputSchema,
	reserveHeadcountInputSchema,
} from "../schemas/workforce-planning";
import { conflict } from "../shared/domain-guards";
import { fingerprintHeadcountReservation } from "../shared/fingerprint";
import { buildMutationMeta } from "../shared/mutation-meta";
import { assertRequisitionAllowsHeadcountReservation } from "../shared/recruitment-guards";
import {
	runWorkforcePlanningCommand,
	runWorkforcePlanningQuery,
} from "../shared/workforce-planning-command";
import { assertReservationWithinAvailability } from "../shared/workforce-planning-guards";
import type { HumanResourcesStore } from "../store";
import type {
	HeadcountAvailability,
	HeadcountPlanLine,
	HeadcountReservation,
	HeadcountReservationListPage,
	RecruitmentHeadcountHandoff,
} from "../types";
import { computeLineAvailability } from "./availability";

export const HUMAN_RESOURCES_AGGREGATE_HEADCOUNT_RESERVATION =
	"headcount-reservation" as const;
export type HumanResourcesHeadcountReservationAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_HEADCOUNT_RESERVATION;

type ReserveHeadcountInput = z.infer<typeof reserveHeadcountInputSchema>;

async function findReservationReplay(input: {
	data: ReserveHeadcountInput;
	requestFingerprint: string;
	store: HumanResourcesStore;
}): Promise<Result<HeadcountReservation | null>> {
	const existingByKey =
		await input.store.findHeadcountReservationByIdempotencyKey({
			organizationId: input.data.organizationId,
			idempotencyKey: input.data.idempotencyKey,
		});
	if (!existingByKey.ok) {
		return existingByKey;
	}
	if (existingByKey.data === null) {
		return errorResult.ok(null);
	}
	if (
		existingByKey.data.createRequestFingerprint !== input.requestFingerprint
	) {
		return errorResult.fail("CONFLICT", {
			publicMessage: "The request conflicts with current state",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_CONFLICT,
			),
		});
	}
	return errorResult.ok(existingByKey.data.reservation);
}

async function loadReservablePlanLine(input: {
	data: ReserveHeadcountInput;
	store: HumanResourcesStore;
}): Promise<Result<HeadcountPlanLine>> {
	const line = await input.store.getHeadcountPlanLineById({
		organizationId: input.data.organizationId,
		planLineId: input.data.planLineId,
	});
	if (!line.ok) {
		return line;
	}
	if (line.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "The requested resource was not found",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			),
		});
	}

	const plan = await input.store.getHeadcountPlanById({
		organizationId: input.data.organizationId,
		planId: line.data.planId,
	});
	if (!plan.ok) {
		return plan;
	}
	if (plan.data === null || plan.data.status !== "approved") {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "The request is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			),
		});
	}

	const requisition = await input.store.getRequisitionById({
		organizationId: input.data.organizationId,
		requisitionId: input.data.requisitionId,
	});
	if (!requisition.ok) {
		return requisition;
	}
	if (requisition.data === null) {
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "The requested resource was not found",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_NOT_FOUND,
			),
		});
	}

	const statusGate = assertRequisitionAllowsHeadcountReservation(
		requisition.data.status,
	);
	if (!statusGate.ok) {
		return statusGate;
	}
	return errorResult.ok(line.data);
}

async function assertReservationCapacity(input: {
	data: ReserveHeadcountInput;
	line: HeadcountPlanLine;
	store: HumanResourcesStore;
}): Promise<Result<void>> {
	const existingActive =
		await input.store.findActiveHeadcountReservationForRequisition({
			organizationId: input.data.organizationId,
			requisitionId: input.data.requisitionId,
		});
	if (!existingActive.ok) {
		return existingActive;
	}
	if (existingActive.data !== null) {
		return conflict("Requisition already has an active headcount reservation");
	}

	const reservations = await input.store.listHeadcountReservationsByPlanLineId({
		organizationId: input.data.organizationId,
		planLineId: input.data.planLineId,
	});
	if (!reservations.ok) {
		return reservations;
	}
	const availability = computeLineAvailability({
		line: input.line,
		reservations: reservations.data,
	});
	return assertReservationWithinAvailability({
		availableFte: availability.availableFte,
		availableHeadcount: availability.availableHeadcount,
		reservedFte: input.data.reservedFte,
		reservedHeadcount: input.data.reservedHeadcount,
	});
}

async function executeReserveHeadcount(
	data: ReserveHeadcountInput,
	deps: { store: HumanResourcesStore; ports: MutationPorts },
): Promise<Result<HeadcountReservation>> {
	const requestFingerprint = fingerprintHeadcountReservation({
		planLineId: data.planLineId,
		requisitionId: data.requisitionId,
		reservedFte: data.reservedFte,
		reservedHeadcount: data.reservedHeadcount,
	});
	const replay = await findReservationReplay({
		data,
		requestFingerprint,
		store: deps.store,
	});
	if (!replay.ok) {
		return replay;
	}
	if (replay.data !== null) {
		return errorResult.ok(replay.data);
	}

	const line = await loadReservablePlanLine({ data, store: deps.store });
	if (!line.ok) {
		return line;
	}
	const capacity = await assertReservationCapacity({
		data,
		line: line.data,
		store: deps.store,
	});
	if (!capacity.ok) {
		return capacity;
	}

	return deps.store.reserveHeadcount(
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
		deps.ports,
		buildMutationMeta({
			correlationId: data.correlationId,
			operationId: HUMAN_RESOURCES_COMMAND_HEADCOUNT_RESERVE,
		}),
	);
}

export function reserveHeadcount(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<HeadcountReservation>> {
	return runWorkforcePlanningCommand(input, options, {
		schema: reserveHeadcountInputSchema,
		invalidMessage: "Invalid headcount reserve input",
		command: HUMAN_RESOURCES_COMMAND_HEADCOUNT_RESERVE,
		execute: executeReserveHeadcount,
	});
}

export function releaseHeadcountReservation(
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
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_HEADCOUNT_RESERVATION_RELEASE,
				}),
			),
	});
}

export function consumeHeadcountReservation(
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
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_HEADCOUNT_RESERVATION_CONSUME,
				}),
			),
	});
}

export function getHeadcountAvailability(
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
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}
			return errorResult.ok(availability.data);
		},
	});
}

export function listHeadcountReservations(
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

export function getRecruitmentHeadcountHandoff(
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
