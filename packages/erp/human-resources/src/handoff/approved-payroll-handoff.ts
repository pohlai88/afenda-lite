import { fail, type Result } from "@afenda/errors/result";
import type { ApprovedPayrollHandoff } from "@afenda/events/schemas";
import { z } from "zod";

import {
	humanResourcesEmployeeIdSchema,
	humanResourcesLeaveRequestIdSchema,
	humanResourcesTimesheetIdSchema,
} from "../brands";
import type { HumanResourcesCommandOptions } from "../command-options";
import { resolveAssignmentContext } from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_NOT_FOUND,
	humanResourcesErrorDetails,
} from "../error-codes";
import { HUMAN_RESOURCES_QUERY_APPROVED_PAYROLL_HANDOFF_GET } from "../module-ids";
import {
	humanResourcesMutationContextSchema,
	isoDateSchema,
} from "../schemas/common";
import { runCompensationQuery } from "../shared/compensation-command";
import { mapApprovedPayrollHandoff } from "./map-approved-payroll-handoff";

export const assembleApprovedPayrollHandoffInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
			effectiveDate: isoDateSchema,
			timesheetId: humanResourcesTimesheetIdSchema.optional(),
			leaveRequestIds: z
				.array(humanResourcesLeaveRequestIdSchema)
				.max(50)
				.optional(),
		})
		.strict();

export type AssembleApprovedPayrollHandoffInput = z.infer<
	typeof assembleApprovedPayrollHandoffInputSchema
>;

export function assembleApprovedPayrollHandoff(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<ApprovedPayrollHandoff | null>> {
	return runCompensationQuery<
		typeof assembleApprovedPayrollHandoffInputSchema,
		ApprovedPayrollHandoff | null
	>(input, options, {
		schema: assembleApprovedPayrollHandoffInputSchema,
		invalidMessage: "Invalid approved payroll handoff assembly input",
		query: HUMAN_RESOURCES_QUERY_APPROVED_PAYROLL_HANDOFF_GET,
		execute: async (data, { store }) => {
			const compensationHandoff = await store.getApprovedCompensationHandoff({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
			});
			if (!compensationHandoff.ok) {
				return compensationHandoff;
			}
			if (compensationHandoff.data === null) {
				return { ok: true, data: null };
			}

			const employmentId =
				compensationHandoff.data.activeCompensation?.employmentId;
			if (!employmentId) {
				return { ok: true, data: null };
			}

			const assignment = await store.findAssignmentByEmploymentAsOf({
				organizationId: data.organizationId,
				employmentId,
				asOf: data.effectiveDate,
			});
			if (!assignment.ok) {
				return assignment;
			}
			if (assignment.data === null) {
				return fail(
					"NOT_FOUND",
					"No assignment found for payroll handoff effective date",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_NOT_FOUND),
				);
			}

			const leaveHandoffs: import("../types").ApprovedLeaveHandoff[] = [];
			const leaveRequestIds = data.leaveRequestIds ?? [];
			async function collectLeaveHandoffs(
				index: number,
			): Promise<Result<void>> {
				const requestId = leaveRequestIds[index];
				if (requestId === undefined) {
					return { ok: true, data: undefined };
				}
				const leaveHandoff = await store.getApprovedLeaveHandoff({
					organizationId: data.organizationId,
					requestId,
					correlationId: data.correlationId,
				});
				if (!leaveHandoff.ok) {
					return leaveHandoff;
				}
				if (leaveHandoff.data) {
					leaveHandoffs.push(leaveHandoff.data);
				}
				return collectLeaveHandoffs(index + 1);
			}
			const collectedLeaveHandoffs = await collectLeaveHandoffs(0);
			if (!collectedLeaveHandoffs.ok) {
				return collectedLeaveHandoffs;
			}

			let timeHandoff: import("../types").ApprovedTimeHandoff | null = null;
			if (data.timesheetId) {
				const timeResult = await store.getApprovedTimeHandoff({
					organizationId: data.organizationId,
					timesheetId: data.timesheetId,
				});
				if (!timeResult.ok) {
					return timeResult;
				}
				timeHandoff = timeResult.data;
			}

			const assignmentContextPort = resolveAssignmentContext(options);
			const contextResult = await assignmentContextPort.resolveAsOf({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				employmentId,
				asOf: data.effectiveDate,
			});
			if (!contextResult.ok) {
				return contextResult;
			}
			const assignmentContext = contextResult.data;

			return mapApprovedPayrollHandoff({
				compensationHandoff: compensationHandoff.data,
				leaveHandoffs,
				timeHandoff,
				assignment: assignment.data,
				assignmentContext,
				effectiveDate: data.effectiveDate,
				correlationId: data.correlationId,
			});
		},
	});
}
