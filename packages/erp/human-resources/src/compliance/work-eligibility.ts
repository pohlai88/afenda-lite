import { fail, ok, type Result } from "@afenda/errors/result";
import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_CLOSE,
	HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_RECORD,
	HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_RENEW,
	HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_SUSPEND,
	HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_VERIFY,
	HUMAN_RESOURCES_QUERY_WORK_ELIGIBILITY_LIST_RISK,
} from "../module-ids";
import {
	getEmployeeWorkEligibilityInputSchema,
	listEmployeesWithWorkEligibilityRiskInputSchema,
	recordWorkEligibilityInputSchema,
	renewWorkEligibilityInputSchema,
	verifyWorkEligibilityInputSchema,
	workEligibilityTransitionInputSchema,
} from "../schemas/compliance";
import {
	runComplianceCommand,
	runComplianceEmployeeScopedQuery,
	runComplianceQuery,
} from "../shared/compliance-command";
import { assertValidDocumentDateRange } from "../shared/compliance-guards";
import { fingerprintWorkEligibilityRecord } from "../shared/fingerprint";
import { buildMutationMeta } from "../shared/mutation-meta";
import type { WorkEligibility, WorkEligibilityRiskListPage } from "../types";

export const HUMAN_RESOURCES_AGGREGATE_WORK_ELIGIBILITY =
	"work_eligibility" as const;
export type HumanResourcesWorkEligibilityAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_WORK_ELIGIBILITY;

const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 25;

export async function recordWorkEligibility(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<WorkEligibility>> {
	return runComplianceCommand(input, options, {
		schema: recordWorkEligibilityInputSchema,
		invalidMessage: "Invalid work eligibility record input",
		command: HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_RECORD,
		execute: async (data, { store, ports, documentReference }) => {
			const dateRange = assertValidDocumentDateRange({
				issuedOn: data.issuedOn,
				expiresOn: data.expiresOn ?? null,
			});
			if (!dateRange.ok) {
				return dateRange;
			}

			let normalizedDocumentRef: string | null = null;
			if (data.documentRef !== undefined) {
				const refCheck = await documentReference.validateReference({
					organizationId: data.organizationId,
					reference: data.documentRef,
					allowedKinds: [
						"passport",
						"work_authorization",
						"identity_document",
						"other",
					],
					requireImmutableVersion: true,
				});
				if (!refCheck.ok) {
					return refCheck;
				}
				normalizedDocumentRef = refCheck.data.reference;
			}

			const requestFingerprint = fingerprintWorkEligibilityRecord({
				employeeId: data.employeeId,
				countryCode: data.countryCode,
				jurisdiction: data.jurisdiction ?? null,
				issuedOn: data.issuedOn,
				expiresOn: data.expiresOn ?? null,
				documentRef: normalizedDocumentRef,
			});

			const existingByKey = await store.findWorkEligibilityByIdempotencyKey({
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
				return ok(existingByKey.data.eligibility);
			}

			return store.recordWorkEligibility(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					countryCode: data.countryCode,
					jurisdiction: data.jurisdiction ?? null,
					issuedOn: data.issuedOn,
					expiresOn: data.expiresOn ?? null,
					documentRef: normalizedDocumentRef ?? null,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: requestFingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operation: HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_RECORD,
					idempotencyKey: data.idempotencyKey,
				}),
			);
		},
	});
}

export async function verifyWorkEligibility(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<WorkEligibility>> {
	return runComplianceCommand(input, options, {
		schema: verifyWorkEligibilityInputSchema,
		invalidMessage: "Invalid work eligibility verify input",
		command: HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_VERIFY,
		execute: (data, { store, ports }) =>
			store.verifyWorkEligibility(
				{
					organizationId: data.organizationId,
					eligibilityId: data.eligibilityId,
					evidenceDate: data.evidenceDate,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operation: HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_VERIFY,
				}),
			),
	});
}

export async function suspendWorkEligibility(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<WorkEligibility>> {
	return runComplianceCommand(input, options, {
		schema: workEligibilityTransitionInputSchema,
		invalidMessage: "Invalid work eligibility suspend input",
		command: HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_SUSPEND,
		execute: (data, { store, ports }) =>
			store.suspendWorkEligibility(
				{
					organizationId: data.organizationId,
					eligibilityId: data.eligibilityId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operation: HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_SUSPEND,
				}),
			),
	});
}

export async function renewWorkEligibility(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<WorkEligibility>> {
	return runComplianceCommand(input, options, {
		schema: renewWorkEligibilityInputSchema,
		invalidMessage: "Invalid work eligibility renew input",
		command: HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_RENEW,
		execute: async (data, { store, ports, documentReference }) => {
			const dateRange = assertValidDocumentDateRange({
				issuedOn: data.issuedOn,
				expiresOn: data.expiresOn ?? null,
			});
			if (!dateRange.ok) {
				return dateRange;
			}

			let normalizedDocumentRef: string | null = null;
			if (data.documentRef !== undefined) {
				const refCheck = await documentReference.validateReference({
					organizationId: data.organizationId,
					reference: data.documentRef,
					allowedKinds: [
						"passport",
						"work_authorization",
						"identity_document",
						"other",
					],
					requireImmutableVersion: true,
				});
				if (!refCheck.ok) {
					return refCheck;
				}
				normalizedDocumentRef = refCheck.data.reference;
			}

			return store.renewWorkEligibility(
				{
					organizationId: data.organizationId,
					eligibilityId: data.eligibilityId,
					issuedOn: data.issuedOn,
					expiresOn: data.expiresOn ?? null,
					documentRef: normalizedDocumentRef,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operation: HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_RENEW,
				}),
			);
		},
	});
}

export async function closeWorkEligibility(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<WorkEligibility>> {
	return runComplianceCommand(input, options, {
		schema: workEligibilityTransitionInputSchema,
		invalidMessage: "Invalid work eligibility close input",
		command: HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_CLOSE,
		execute: (data, { store, ports }) =>
			store.closeWorkEligibility(
				{
					organizationId: data.organizationId,
					eligibilityId: data.eligibilityId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operation: HUMAN_RESOURCES_COMMAND_WORK_ELIGIBILITY_CLOSE,
				}),
			),
	});
}

export async function getEmployeeWorkEligibility(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<WorkEligibility | null>> {
	return runComplianceEmployeeScopedQuery(input, options, {
		schema: getEmployeeWorkEligibilityInputSchema,
		invalidMessage: "Invalid work eligibility get input",
		execute: async (data, { store }) => {
			return store.getActiveWorkEligibilityForEmployee({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
			});
		},
	});
}

export async function listEmployeesWithWorkEligibilityRisk(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<WorkEligibilityRiskListPage>> {
	return runComplianceQuery(input, options, {
		schema: listEmployeesWithWorkEligibilityRiskInputSchema,
		invalidMessage: "Invalid work eligibility risk list input",
		query: HUMAN_RESOURCES_QUERY_WORK_ELIGIBILITY_LIST_RISK,
		execute: (data, { store }) =>
			store.listEmployeesWithWorkEligibilityRisk({
				organizationId: data.organizationId,
				asOf: data.asOf,
				page: data.page ?? DEFAULT_PAGE,
				pageSize: data.pageSize ?? DEFAULT_PAGE_SIZE,
			}),
	});
}
