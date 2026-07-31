import { errorResult, type Result } from "@afenda/errors";
import type { HumanResourcesCommandOptions } from "../command-options";
import { getEmployment } from "../core/employment";
import {
	HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_ACTIVATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_AMEND,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_APPROVE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_CORRECT,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_CREATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_END,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_SCHEDULE,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_COMPENSATION_GET,
	HUMAN_RESOURCES_QUERY_EMPLOYEE_COMPENSATION_LIST,
} from "../module-ids";
import {
	activateEmployeeCompensationInputSchema,
	amendEmployeeCompensationInputSchema,
	approveEmployeeCompensationInputSchema,
	correctEmployeeCompensationInputSchema,
	createEmployeeCompensationInputSchema,
	endEmployeeCompensationInputSchema,
	getEmployeeCompensationInputSchema,
	listEmployeeCompensationsInputSchema,
	scheduleEmployeeCompensationChangeInputSchema,
} from "../schemas/compensation";
import {
	assertCurrencyExists,
	runCompensationCommand,
	runCompensationQuery,
} from "../shared/compensation-command";
import { notFound } from "../shared/domain-guards";
import {
	projectEmployeeCompensationByFieldAccess,
	projectEmployeeCompensationListPage,
} from "../shared/employee-compensation-projection";
import { EMPLOYEE_COMPENSATION_QUERY_FIELDS } from "../shared/employee-compensation-query-fields";
import {
	fingerprintEmployeeCompensationCorrection,
	fingerprintEmployeeCompensationCreate,
} from "../shared/fingerprint";
import { buildMutationMeta } from "../shared/mutation-meta";
import type {
	EmployeeCompensation,
	EmployeeCompensationListPage,
} from "../types";

export const HUMAN_RESOURCES_AGGREGATE_EMPLOYEE_COMPENSATION =
	"employee_compensation" as const;
export type HumanResourcesEmployeeCompensationAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_EMPLOYEE_COMPENSATION;

async function assertEmploymentAssignmentScope(
	input: {
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		employeeId: string;
		employmentId: string;
	},
	options: HumanResourcesCommandOptions,
): Promise<Result<void>> {
	const employment = await getEmployment(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: input.correlationId,
			employmentId: input.employmentId,
		},
		options,
	);
	if (!employment.ok) {
		return employment;
	}
	if (employment.data.employeeId !== input.employeeId) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "The request is invalid",
			internalContext: humanResourcesErrorDetails(
				HUMAN_RESOURCES_ERROR_CROSS_ORGANIZATION_REFERENCE,
			),
		});
	}
	return { ok: true, data: undefined };
}

export function createEmployeeCompensation(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCompensation>> {
	return runCompensationCommand(input, options, {
		schema: createEmployeeCompensationInputSchema,
		invalidMessage: "Invalid employee compensation create input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_CREATE,
		execute: async (data, { store, ports, currency }) => {
			const scope = await assertEmploymentAssignmentScope(
				{
					organizationId: data.organizationId,
					actorUserId: data.actorUserId,
					correlationId: data.correlationId,
					employeeId: data.employeeId,
					employmentId: data.employmentId,
				},
				options,
			);
			if (!scope.ok) {
				return scope;
			}
			const currencyCheck = await assertCurrencyExists(
				currency,
				data.currencyCode,
			);
			if (!currencyCheck.ok) {
				return currencyCheck;
			}
			const fingerprint = fingerprintEmployeeCompensationCreate({
				employmentId: data.employmentId,
				baseAmount: data.baseAmount,
				currencyCode: data.currencyCode,
				payFrequency: data.payFrequency,
				effectiveFrom: data.effectiveFrom,
				reason: data.reason,
			});
			return store.createEmployeeCompensation(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					employmentId: data.employmentId,
					gradeId: data.gradeId ?? null,
					salaryBandId: data.salaryBandId ?? null,
					baseAmount: data.baseAmount,
					currencyCode: data.currencyCode,
					payFrequency: data.payFrequency,
					effectiveFrom: data.effectiveFrom,
					effectiveTo: data.effectiveTo ?? null,
					reason: data.reason,
					confidentialNote: data.confidentialNote ?? null,
					supersedesCompensationId: null,
					sourceReviewId: data.sourceReviewId ?? null,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: fingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_CREATE,
				}),
			);
		},
	});
}

export function amendEmployeeCompensation(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCompensation>> {
	return runCompensationCommand(input, options, {
		schema: amendEmployeeCompensationInputSchema,
		invalidMessage: "Invalid employee compensation amend input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_AMEND,
		execute: async (data, { store, ports, currency }) => {
			if (data.currencyCode !== undefined) {
				const currencyCheck = await assertCurrencyExists(
					currency,
					data.currencyCode,
				);
				if (!currencyCheck.ok) {
					return currencyCheck;
				}
			}
			return store.amendEmployeeCompensation(
				{
					organizationId: data.organizationId,
					compensationId: data.compensationId,
					baseAmount: data.baseAmount,
					currencyCode: data.currencyCode,
					payFrequency: data.payFrequency,
					effectiveFrom: data.effectiveFrom,
					effectiveTo: data.effectiveTo,
					reason: data.reason,
					gradeId: data.gradeId,
					salaryBandId: data.salaryBandId,
					confidentialNote: data.confidentialNote,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_AMEND,
				}),
			);
		},
	});
}

export function approveEmployeeCompensation(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCompensation>> {
	return runCompensationCommand(input, options, {
		schema: approveEmployeeCompensationInputSchema,
		invalidMessage: "Invalid employee compensation approve input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_APPROVE,
		execute: (data, { store, ports }) =>
			store.approveEmployeeCompensation(
				{
					organizationId: data.organizationId,
					compensationId: data.compensationId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_APPROVE,
				}),
			),
	});
}

export function scheduleEmployeeCompensationChange(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCompensation>> {
	return runCompensationCommand(input, options, {
		schema: scheduleEmployeeCompensationChangeInputSchema,
		invalidMessage: "Invalid employee compensation schedule input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_SCHEDULE,
		execute: async (data, { store, ports, currency }) => {
			const currencyCheck = await assertCurrencyExists(
				currency,
				data.currencyCode,
			);
			if (!currencyCheck.ok) {
				return currencyCheck;
			}
			const active = await store.getEmployeeCompensation({
				organizationId: data.organizationId,
				compensationId: data.compensationId,
			});
			if (!active.ok) {
				return active;
			}
			if (active.data === null) {
				return notFound("Employee compensation not found");
			}
			const fingerprint = fingerprintEmployeeCompensationCreate({
				employmentId: active.data.employmentId,
				baseAmount: data.baseAmount,
				currencyCode: data.currencyCode,
				payFrequency: data.payFrequency,
				effectiveFrom: data.effectiveFrom,
				reason: data.reason,
			});
			return store.scheduleEmployeeCompensationChange(
				{
					organizationId: data.organizationId,
					compensationId: data.compensationId,
					baseAmount: data.baseAmount,
					currencyCode: data.currencyCode,
					payFrequency: data.payFrequency,
					effectiveFrom: data.effectiveFrom,
					reason: data.reason,
					gradeId: data.gradeId ?? null,
					salaryBandId: data.salaryBandId ?? null,
					confidentialNote: data.confidentialNote ?? null,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: fingerprint,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_SCHEDULE,
				}),
			);
		},
	});
}

export function activateEmployeeCompensation(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCompensation>> {
	return runCompensationCommand(input, options, {
		schema: activateEmployeeCompensationInputSchema,
		invalidMessage: "Invalid employee compensation activate input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_ACTIVATE,
		execute: (data, { store, ports }) =>
			store.activateEmployeeCompensation(
				{
					organizationId: data.organizationId,
					compensationId: data.compensationId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_ACTIVATE,
				}),
			),
	});
}

export function correctEmployeeCompensation(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCompensation>> {
	return runCompensationCommand(input, options, {
		schema: correctEmployeeCompensationInputSchema,
		invalidMessage: "Invalid employee compensation correct input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_CORRECT,
		execute: async (data, { store, ports, currency }) => {
			const currencyCheck = await assertCurrencyExists(
				currency,
				data.currencyCode,
			);
			if (!currencyCheck.ok) {
				return currencyCheck;
			}
			const fingerprint = fingerprintEmployeeCompensationCorrection({
				predecessorId: data.compensationId,
				baseAmount: data.baseAmount,
				currencyCode: data.currencyCode,
				payFrequency: data.payFrequency,
				effectiveFrom: data.effectiveFrom,
				reason: data.reason,
			});
			return store.correctEmployeeCompensation(
				{
					organizationId: data.organizationId,
					compensationId: data.compensationId,
					baseAmount: data.baseAmount,
					currencyCode: data.currencyCode,
					payFrequency: data.payFrequency,
					effectiveFrom: data.effectiveFrom,
					effectiveTo: data.effectiveTo ?? null,
					reason: data.reason,
					evidenceReference: data.evidenceReference ?? null,
					gradeId: data.gradeId ?? null,
					salaryBandId: data.salaryBandId ?? null,
					confidentialNote: data.confidentialNote ?? null,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: fingerprint,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_CORRECT,
				}),
			);
		},
	});
}

export function endEmployeeCompensation(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCompensation>> {
	return runCompensationCommand(input, options, {
		schema: endEmployeeCompensationInputSchema,
		invalidMessage: "Invalid employee compensation end input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_END,
		execute: (data, { store, ports }) =>
			store.endEmployeeCompensation(
				{
					organizationId: data.organizationId,
					compensationId: data.compensationId,
					endsOn: data.endsOn,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_END,
				}),
			),
	});
}

export function getEmployeeCompensation(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Partial<EmployeeCompensation>>> {
	return runCompensationQuery<
		typeof getEmployeeCompensationInputSchema,
		EmployeeCompensation,
		Partial<EmployeeCompensation>
	>(input, options, {
		schema: getEmployeeCompensationInputSchema,
		invalidMessage: "Invalid employee compensation get input",
		query: HUMAN_RESOURCES_QUERY_EMPLOYEE_COMPENSATION_GET,
		resolveRequestedFields: () => [...EMPLOYEE_COMPENSATION_QUERY_FIELDS],
		project: (value: EmployeeCompensation, projection) =>
			projectEmployeeCompensationByFieldAccess(value, projection),
		execute: async (data, { store }) => {
			const compensation = await store.getEmployeeCompensation({
				organizationId: data.organizationId,
				compensationId: data.compensationId,
			});
			if (!compensation.ok) {
				return compensation;
			}
			if (compensation.data === null) {
				return notFound("Employee compensation not found");
			}
			return errorResult.ok(compensation.data);
		},
	});
}

export function listEmployeeCompensationsByEmployee(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<
	Result<{
		compensations: Partial<EmployeeCompensation>[];
		totalCount: number;
		page: number;
		pageSize: number;
	}>
> {
	return runCompensationQuery<
		typeof listEmployeeCompensationsInputSchema,
		EmployeeCompensationListPage,
		{
			compensations: Partial<EmployeeCompensation>[];
			totalCount: number;
			page: number;
			pageSize: number;
		}
	>(input, options, {
		schema: listEmployeeCompensationsInputSchema,
		invalidMessage: "Invalid employee compensation list input",
		query: HUMAN_RESOURCES_QUERY_EMPLOYEE_COMPENSATION_LIST,
		resolveRequestedFields: () => [...EMPLOYEE_COMPENSATION_QUERY_FIELDS],
		project: (
			value: {
				compensations: EmployeeCompensation[];
				totalCount: number;
				page: number;
				pageSize: number;
			},
			projection,
		) => projectEmployeeCompensationListPage(value, projection),
		execute: (data, { store }) =>
			store.listEmployeeCompensationsByEmployee({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				page: data.page,
				pageSize: data.pageSize,
			}),
	});
}
