import { errorResult, type Result } from "@afenda/errors";
import type { PriorEmployerYtd } from "../../kernel/contracts";
import { buildMutationMeta } from "../../kernel/emissions/mutation-meta";
import type { HumanResourcesCommandOptions } from "../../kernel/execution/command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../../kernel/execution/error-codes";
import { fingerprintPriorEmployerYtdRecord } from "../../kernel/identity/fingerprint";
import {
	HUMAN_RESOURCES_COMMAND_PRIOR_EMPLOYER_YTD_RECORD,
	HUMAN_RESOURCES_QUERY_PRIOR_EMPLOYER_YTD_LIST,
} from "./operation-registry";
import {
	isStatutorySubjectRestricted,
	statutorySubjectRestrictedFailure,
} from "./privacy";
import {
	runStatutoryProfileCapabilityCommand,
	runStatutoryProfileCapabilityQuery,
} from "./run-operation";
import {
	listPriorEmployerYtdInputSchema,
	recordPriorEmployerYtdInputSchema,
} from "./schema";

export const HUMAN_RESOURCES_AGGREGATE_PRIOR_EMPLOYER_YTD =
	"prior_employer_ytd" as const;
export type HumanResourcesPriorEmployerYtdAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_PRIOR_EMPLOYER_YTD;

/**
 * Mid-year joiners carry prior-employer figures into the hire year. HR asserts
 * them once per employee, tax year, and jurisdiction; payroll consumes them
 * through the handoff and never restates them.
 */
export function recordPriorEmployerYtd(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PriorEmployerYtd>> {
	return runStatutoryProfileCapabilityCommand(input, options, {
		schema: recordPriorEmployerYtdInputSchema,
		invalidMessage: "Invalid prior-employer year-to-date input",
		command: HUMAN_RESOURCES_COMMAND_PRIOR_EMPLOYER_YTD_RECORD,
		storeMethods: [
			"getEmployeeById",
			"findPriorEmployerYtdByIdempotencyKey",
			"findPriorEmployerYtdByTaxYear",
			"recordPriorEmployerYtd",
		],
		execute: async (data, { store, ports }) => {
			const requestFingerprint = fingerprintPriorEmployerYtdRecord({
				employeeId: data.employeeId,
				jurisdictionCode: data.jurisdictionCode,
				taxYear: data.taxYear,
				priorEmployerName: data.priorEmployerName ?? null,
				grossAmount: data.grossAmount,
				taxWithheldAmount: data.taxWithheldAmount,
				statutoryContributionAmount: data.statutoryContributionAmount,
				currencyCode: data.currencyCode,
				recordedOn: data.recordedOn,
			});

			const existingByKey = await store.findPriorEmployerYtdByIdempotencyKey({
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
				return errorResult.ok(existingByKey.data.record);
			}

			const employee = await store.getEmployeeById({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
			});
			if (!employee.ok) {
				return employee;
			}
			if (employee.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_NOT_FOUND,
					),
				});
			}

			const existingForYear = await store.findPriorEmployerYtdByTaxYear({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				taxYear: data.taxYear,
				jurisdictionCode: data.jurisdictionCode,
			});
			if (!existingForYear.ok) {
				return existingForYear;
			}
			if (existingForYear.data !== null) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_CONFLICT,
					),
				});
			}

			return store.recordPriorEmployerYtd(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					jurisdictionCode: data.jurisdictionCode,
					taxYear: data.taxYear,
					priorEmployerName: data.priorEmployerName ?? null,
					grossAmount: data.grossAmount,
					taxWithheldAmount: data.taxWithheldAmount,
					statutoryContributionAmount: data.statutoryContributionAmount,
					currencyCode: data.currencyCode,
					recordedOn: data.recordedOn,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: requestFingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_PRIOR_EMPLOYER_YTD_RECORD,
				}),
			);
		},
	});
}

export function listPriorEmployerYtd(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<PriorEmployerYtd[]>> {
	return runStatutoryProfileCapabilityQuery(input, options, {
		schema: listPriorEmployerYtdInputSchema,
		invalidMessage: "Invalid prior-employer year-to-date list input",
		query: HUMAN_RESOURCES_QUERY_PRIOR_EMPLOYER_YTD_LIST,
		storeMethods: ["listPriorEmployerYtd"],
		execute: async (data, { store, options: resolvedOptions }) => {
			const restricted = await isStatutorySubjectRestricted(
				{
					organizationId: data.organizationId,
					actorUserId: data.actorUserId,
					correlationId: data.correlationId,
					employeeId: data.employeeId,
				},
				resolvedOptions,
			);
			if (!restricted.ok) {
				return restricted;
			}
			if (restricted.data) {
				return statutorySubjectRestrictedFailure();
			}
			return store.listPriorEmployerYtd({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				taxYear: data.taxYear,
			});
		},
	});
}
