import { fail, ok, type Result } from "@afenda/errors/result";
import type { z } from "zod";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_AMEND,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CORRECT,
	HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CREATE,
	HUMAN_RESOURCES_QUERY_EMPLOYMENT_AS_OF,
	HUMAN_RESOURCES_QUERY_EMPLOYMENT_GET,
	HUMAN_RESOURCES_QUERY_EMPLOYMENT_STATUS_HISTORY_LIST,
} from "../module-ids";
import {
	amendEmploymentInputSchema,
	correctEmploymentInputSchema,
	createEmploymentInputSchema,
	getEmploymentAsOfInputSchema,
	getEmploymentInputSchema,
	listEmploymentStatusHistoryInputSchema,
} from "../schemas/core";
import { runCoreCommand, runCoreQuery } from "../shared/core-command";
import {
	rehireRequiresEndedEmployment,
	resolveAmendEndsOn,
} from "../shared/domain-guards";
import {
	resolveEmploymentStatusAsOf,
	resolveLifecycleEffectiveOn,
} from "../shared/employment-history";
import {
	assertEmploymentStatusTransition,
	assertNoEmploymentOverlap,
} from "../shared/employment-status";
import { buildMutationMeta } from "../shared/mutation-meta";
import type { HumanResourcesCoreStore } from "../store/core";
import type { Employment, EmploymentStatusHistory } from "../types";

interface ValidatedEmploymentAmendment {
	endsOn: string | null;
	lifecycleEffectiveOn: string | undefined;
	startsOn: string;
}

async function validateEmploymentAmendment(
	store: HumanResourcesCoreStore,
	data: z.output<typeof amendEmploymentInputSchema>,
): Promise<Result<ValidatedEmploymentAmendment>> {
	const existing = await store.getEmploymentById({
		organizationId: data.organizationId,
		employmentId: data.employmentId,
	});
	if (!existing.ok) {
		return existing;
	}
	if (existing.data === null) {
		return fail(
			"NOT_FOUND",
			"Employment not found",
			humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
		);
	}
	if (data.status !== undefined) {
		const transitionCheck = assertEmploymentStatusTransition(
			existing.data.status,
			data.status,
		);
		if (!transitionCheck.ok) {
			return transitionCheck;
		}
	}
	const startsOn = data.startsOn ?? existing.data.startsOn;
	const endsOn = resolveAmendEndsOn({
		nextStatus: data.status,
		startsOn,
		endsOn: data.endsOn,
		previousEndsOn: existing.data.endsOn,
	});
	if (!endsOn.ok) {
		return endsOn;
	}
	const siblings = await store.listEmploymentsByEmployee({
		organizationId: data.organizationId,
		employeeId: existing.data.employeeId,
	});
	if (!siblings.ok) {
		return siblings;
	}
	const overlapCheck = assertNoEmploymentOverlap({
		candidateEmploymentId: data.employmentId,
		candidateStartsOn: startsOn,
		candidateEndsOn: endsOn.data,
		existing: siblings.data,
	});
	if (!overlapCheck.ok) {
		return overlapCheck;
	}
	const nextStatus = data.status ?? existing.data.status;
	const lifecycleEffectiveOn =
		data.status !== undefined && data.status !== existing.data.status
			? resolveLifecycleEffectiveOn({
					status: nextStatus,
					startsOn,
					endsOn: endsOn.data,
					...(data.effectiveOn === undefined
						? {}
						: { requestedEffectiveOn: data.effectiveOn }),
				})
			: undefined;
	return ok({ endsOn: endsOn.data, lifecycleEffectiveOn, startsOn });
}

export function createEmployment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Employment>> {
	return runCoreCommand(input, options, {
		schema: createEmploymentInputSchema,
		invalidMessage: "Invalid employment create input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CREATE,
		execute: async (data, { store, ports }) => {
			const openEmployment = await store.findOpenEmploymentByEmployee({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
			});
			if (!openEmployment.ok) {
				return openEmployment;
			}
			if (openEmployment.data !== null) {
				return rehireRequiresEndedEmployment();
			}

			const siblingEmployments = await store.listEmploymentsByEmployee({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
			});
			if (!siblingEmployments.ok) {
				return siblingEmployments;
			}
			const overlapCheck = assertNoEmploymentOverlap({
				candidateStartsOn: data.startsOn,
				candidateEndsOn: data.endsOn ?? null,
				existing: siblingEmployments.data,
			});
			if (!overlapCheck.ok) {
				return overlapCheck;
			}

			return store.createEmployment(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					startsOn: data.startsOn,
					endsOn: data.endsOn ?? null,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CREATE,
				}),
			);
		},
	});
}

export function amendEmployment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Employment>> {
	return runCoreCommand(input, options, {
		schema: amendEmploymentInputSchema,
		invalidMessage: "Invalid employment amend input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYMENT_AMEND,
		execute: async (data, { store, ports }) => {
			const amendment = await validateEmploymentAmendment(store, data);
			if (!amendment.ok) {
				return amendment;
			}

			return store.amendEmployment(
				{
					organizationId: data.organizationId,
					employmentId: data.employmentId,
					...(data.status === undefined ? {} : { status: data.status }),
					...(data.startsOn === undefined ? {} : { startsOn: data.startsOn }),
					endsOn: amendment.data.endsOn,
					...(amendment.data.lifecycleEffectiveOn === undefined
						? {}
						: {
								lifecycleEffectiveOn: amendment.data.lifecycleEffectiveOn,
							}),
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_EMPLOYMENT_AMEND,
				}),
			);
		},
	});
}

export function correctEmployment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Employment>> {
	return runCoreCommand(input, options, {
		schema: correctEmploymentInputSchema,
		invalidMessage: "Invalid employment correction input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CORRECT,
		execute: async (data, { store, ports }) => {
			const existing = await store.getEmploymentById({
				organizationId: data.organizationId,
				employmentId: data.employmentId,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data === null) {
				return fail(
					"NOT_FOUND",
					"Employment not found",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}

			const nextStatus = data.status ?? existing.data.status;
			if (existing.data.status === "terminated" && nextStatus === "active") {
				return fail(
					"BAD_REQUEST",
					"Cannot reopen a terminated employment; create a new employment for rehire",
					humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_INVALID_STATE_TRANSITION,
					),
				);
			}

			const startsOn = data.startsOn ?? existing.data.startsOn;
			const endsOn =
				data.endsOn === undefined ? existing.data.endsOn : data.endsOn;
			const siblingEmployments = await store.listEmploymentsByEmployee({
				organizationId: data.organizationId,
				employeeId: existing.data.employeeId,
			});
			if (!siblingEmployments.ok) {
				return siblingEmployments;
			}
			const overlapCheck = assertNoEmploymentOverlap({
				candidateEmploymentId: data.employmentId,
				candidateStartsOn: startsOn,
				candidateEndsOn: endsOn,
				existing: siblingEmployments.data,
			});
			if (!overlapCheck.ok) {
				return overlapCheck;
			}

			return store.correctEmployment(
				{
					organizationId: data.organizationId,
					employmentId: data.employmentId,
					status: data.status,
					startsOn: data.startsOn,
					endsOn: data.endsOn,
					reason: data.reason,
					evidenceReference: data.evidenceReference ?? null,
					effectiveOn: data.effectiveOn,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_EMPLOYMENT_CORRECT,
				}),
			);
		},
	});
}

export function getEmployment(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Employment>> {
	return runCoreQuery(input, options, {
		schema: getEmploymentInputSchema,
		invalidMessage: "Invalid employment get input",
		query: HUMAN_RESOURCES_QUERY_EMPLOYMENT_GET,
		execute: async (data, { store }) => {
			const employment = await store.getEmploymentById({
				organizationId: data.organizationId,
				employmentId: data.employmentId,
			});
			if (!employment.ok) {
				return employment;
			}
			if (employment.data === null) {
				return fail(
					"NOT_FOUND",
					"Employment not found",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}
			return ok(employment.data);
		},
	});
}

export function getEmploymentAsOf(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Employment | null>> {
	return runCoreQuery(input, options, {
		schema: getEmploymentAsOfInputSchema,
		invalidMessage: "Invalid employment as-of input",
		query: HUMAN_RESOURCES_QUERY_EMPLOYMENT_AS_OF,
		execute: async (data, { store }) =>
			store.findEmploymentByEmployeeAsOf({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				asOf: data.asOf,
			}),
	});
}

export function listEmploymentStatusHistory(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<
	Result<{
		history: EmploymentStatusHistory[];
		statusAsOf: ReturnType<typeof resolveEmploymentStatusAsOf> | null;
	}>
> {
	return runCoreQuery(input, options, {
		schema: listEmploymentStatusHistoryInputSchema,
		invalidMessage: "Invalid employment status history input",
		query: HUMAN_RESOURCES_QUERY_EMPLOYMENT_STATUS_HISTORY_LIST,
		execute: async (data, { store }) => {
			const history = await store.listEmploymentStatusHistory({
				organizationId: data.organizationId,
				employmentId: data.employmentId,
			});
			if (!history.ok) {
				return history;
			}
			return ok({
				history: history.data,
				statusAsOf:
					data.asOf === undefined
						? null
						: resolveEmploymentStatusAsOf({
								history: history.data,
								asOf: data.asOf,
							}),
			});
		},
	});
}
