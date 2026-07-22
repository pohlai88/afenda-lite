import { fail, ok, type Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RECORD_APPEAL,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RESOLVE_APPEAL,
} from "../module-ids";
import {
	recordEmployeeCaseAppealInputSchema,
	resolveEmployeeCaseAppealInputSchema,
} from "./schemas";
import { fingerprintEmployeeCaseAppeal } from "../shared/fingerprint";
import { runEmployeeRelationsCommand } from "../shared/employee-relations-command";
import type { EmployeeCaseAppeal } from "./types";

export const HUMAN_RESOURCES_AGGREGATE_EMPLOYEE_CASE_APPEAL =
	"employee_case_appeal" as const;
export type HumanResourcesEmployeeCaseAppealAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_EMPLOYEE_CASE_APPEAL;

export async function recordEmployeeCaseAppeal(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCaseAppeal>> {
	return runEmployeeRelationsCommand(input, options, {
		schema: recordEmployeeCaseAppealInputSchema,
		invalidMessage: "Invalid employee case appeal record input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RECORD_APPEAL,
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
				return fail("BAD_REQUEST", "Finding must be recorded before an appeal");
			}
			const fingerprint = fingerprintEmployeeCaseAppeal({
				caseId: data.caseId,
				originalFindingCode: loaded.data.findingCode,
				originalFindingRecordedAt:
					loaded.data.findingRecordedAt.toISOString(),
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
					return fail(
						"CONFLICT",
						"Idempotency key reused with different payload",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
				return ok(existing.data.appeal);
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
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function resolveEmployeeCaseAppeal(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCaseAppeal>> {
	return runEmployeeRelationsCommand(input, options, {
		schema: resolveEmployeeCaseAppealInputSchema,
		invalidMessage: "Invalid employee case appeal resolve input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_CASE_RESOLVE_APPEAL,
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
				{ correlationId: data.correlationId },
			),
	});
}
