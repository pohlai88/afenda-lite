import type { Result } from "@afenda/errors/result";

import type { HumanResourcesCommandOptions } from "../command-options";
import {
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_CREATE,
	HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_END,
} from "../module-ids";
import {
	createEmployeeCompensationInputSchema,
	endEmployeeCompensationInputSchema,
} from "../schemas";
import {
	assertCurrencyExists,
	runCompensationCommand,
} from "../shared/compensation-command";
import { fingerprintEmployeeCompensationCreate } from "../shared/fingerprint";
import type { EmployeeCompensation } from "../types";

export const HUMAN_RESOURCES_AGGREGATE_EMPLOYEE_COMPENSATION =
	"employee_compensation" as const;
export type HumanResourcesEmployeeCompensationAggregate =
	typeof HUMAN_RESOURCES_AGGREGATE_EMPLOYEE_COMPENSATION;

export async function createEmployeeCompensation(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<EmployeeCompensation>> {
	return runCompensationCommand(input, options, {
		schema: createEmployeeCompensationInputSchema,
		invalidMessage: "Invalid employee compensation create input",
		command: HUMAN_RESOURCES_COMMAND_EMPLOYEE_COMPENSATION_CREATE,
		execute: async (data, { store, ports, currency }) => {
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
					effectiveFrom: data.effectiveFrom,
					reason: data.reason,
					sourceReviewId: data.sourceReviewId ?? null,
					createIdempotencyKey: data.idempotencyKey,
					createRequestFingerprint: fingerprint,
					createdBy: data.actorUserId,
				},
				ports,
				{ correlationId: data.correlationId },
			);
		},
	});
}

export async function endEmployeeCompensation(
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
				{ correlationId: data.correlationId },
			),
	});
}
