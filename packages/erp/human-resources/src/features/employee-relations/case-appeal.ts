import { errorResult, type Result } from "@afenda/errors";
import { buildMutationMeta } from "../../kernel/emissions/mutation-meta";
import type { HumanResourcesCommandOptions } from "../../kernel/execution/command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../../kernel/execution/error-codes";
import { fingerprintEmployeeCaseAppeal } from "../../kernel/identity/fingerprint";
import {
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RECORD_APPEAL,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RESOLVE_APPEAL,
} from "../../kernel/operations/module-ids";
import { runEmployeeRelationsCapabilityCommand } from "./run-operation";
import {
	recordEmployeeCaseAppealInputSchema,
	resolveEmployeeCaseAppealInputSchema,
} from "./schema";
import type { EmployeeCaseAppeal } from "./types";

export const HUMAN_RESOURCES_AGGREGATE_EMPLOYEE_CASE_APPEAL =
	"employee_case_appeal" as const;
export type HumanResourcesEmployeeCaseAppealAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_EMPLOYEE_CASE_APPEAL;

export function recordEmployeeCaseAppeal(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCaseAppeal>> {
	return runEmployeeRelationsCapabilityCommand(input, options, {
		schema: recordEmployeeCaseAppealInputSchema,
		invalidMessage: "Invalid employee case appeal record input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RECORD_APPEAL,
		storeMethods: [
			"getEmployeeCaseById",
			"findEmployeeCaseAppealByIdempotencyKey",
			"recordEmployeeCaseAppeal",
		],
		execute: async (data, { store, ports }) => {
			const loaded = await store.getEmployeeCaseById({
				organizationId: data.organizationId,
				caseId: data.caseId,
				actorUserId: data.actorUserId,
			});
			if (!loaded.ok) {
				return loaded;
			}
			if (
				loaded.data.findingCode === null ||
				loaded.data.findingRecordedAt === null
			) {
				return errorResult.fail("BAD_REQUEST", {
					publicMessage: "The request is invalid",
				});
			}
			const fingerprint = fingerprintEmployeeCaseAppeal({
				caseId: data.caseId,
				originalFindingCode: loaded.data.findingCode,
				originalFindingRecordedAt: loaded.data.findingRecordedAt.toISOString(),
			});
			const existing = await store.findEmployeeCaseAppealByIdempotencyKey({
				organizationId: data.organizationId,
				idempotencyKey: data.idempotencyKey,
			});
			if (!existing.ok) {
				return existing;
			}
			if (existing.data !== null) {
				if (existing.data.createRequestFingerprint !== fingerprint) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "The request conflicts with current state",
						internalContext: humanResourcesErrorDetails(
							HUMAN_RESOURCES_ERROR_CONFLICT,
						),
					});
				}
				return errorResult.ok(existing.data.appeal);
			}
			return store.recordEmployeeCaseAppeal(
				{
					organizationId: data.organizationId,
					caseId: data.caseId,
					appealGroundsSummary: data.appealGroundsSummary,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: fingerprint,
					expectedVersion: data.expectedVersion,
					createdBy: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RECORD_APPEAL,
				}),
			);
		},
	});
}

export function resolveEmployeeCaseAppeal(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCaseAppeal>> {
	return runEmployeeRelationsCapabilityCommand(input, options, {
		schema: resolveEmployeeCaseAppealInputSchema,
		invalidMessage: "Invalid employee case appeal resolve input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RESOLVE_APPEAL,
		storeMethods: ["resolveEmployeeCaseAppeal"],
		execute: (data, { store, ports }) =>
			store.resolveEmployeeCaseAppeal(
				{
					organizationId: data.organizationId,
					caseId: data.caseId,
					appealId: data.appealId,
					appealOutcomeCode: data.appealOutcomeCode,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
				},
				ports,
				buildMutationMeta({
					correlationId: data.correlationId,
					operationId: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RESOLVE_APPEAL,
				}),
			),
	});
}
