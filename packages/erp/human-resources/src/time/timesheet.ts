import { randomUUID } from "node:crypto";

import { fail, ok, type Result } from "@afenda/errors/result";

import {
	type HumanResourcesCommandOptions,
	requireApprovedLeaveQuery,
	requireWorkCalendar,
} from "../command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	humanResourcesErrorDetails,
} from "../error-codes";
import {
	HUMAN_RESOURCES_COMMAND_TIMESHEET_APPROVE,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_CREATE,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_ENTRY_ADD,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_ENTRY_REMOVE,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_ENTRY_UPDATE,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_GENERATE_ENTRIES,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_LOCK,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_REJECT,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_REOPEN,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_RETURN,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_SUBMIT,
	HUMAN_RESOURCES_COMMAND_TIMESHEET_SUPERSEDE,
	HUMAN_RESOURCES_QUERY_TIMESHEET_APPROVAL_DECISION_LIST,
	HUMAN_RESOURCES_QUERY_TIMESHEET_ENTRY_LIST,
	HUMAN_RESOURCES_QUERY_TIMESHEET_FOR_EMPLOYEE_PERIOD_GET,
	HUMAN_RESOURCES_QUERY_TIMESHEET_GET,
	HUMAN_RESOURCES_QUERY_TIMESHEET_LIST,
	HUMAN_RESOURCES_QUERY_TIMESHEET_TOTALS_GET,
} from "../module-ids";
import {
	addTimesheetEntryInputSchema,
	approveTimesheetInputSchema,
	createTimesheetInputSchema,
	generateTimesheetEntriesInputSchema,
	getTimesheetForEmployeePeriodInputSchema,
	getTimesheetInputSchema,
	getTimesheetTotalsInputSchema,
	listTimesheetApprovalDecisionsInputSchema,
	listTimesheetEntriesInputSchema,
	listTimesheetsInputSchema,
	lockTimesheetInputSchema,
	rejectTimesheetInputSchema,
	removeTimesheetEntryInputSchema,
	reopenTimesheetInputSchema,
	returnTimesheetInputSchema,
	submitTimesheetInputSchema,
	supersedeTimesheetInputSchema,
	updateTimesheetEntryInputSchema,
} from "../schemas/time";
import { runTimeCommand, runTimeQuery } from "../shared/time-command";
import type {
	Timesheet,
	TimesheetApprovalDecision,
	TimesheetEntry,
	TimesheetTotals,
} from "../types";

export async function createTimesheet(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Timesheet>> {
	return runTimeCommand(input, options, {
		schema: createTimesheetInputSchema,
		invalidMessage: "Invalid timesheet create input",
		command: HUMAN_RESOURCES_COMMAND_TIMESHEET_CREATE,
		execute: async (data, { store, ports }) => {
			const fingerprint = JSON.stringify({
				employeeId: data.employeeId,
				employmentId: data.employmentId ?? null,
				periodStart: data.periodStart,
				periodEnd: data.periodEnd,
			});
			const existing = await store.findTimesheetByIdempotencyKey({
				organizationId: data.organizationId,
				idempotencyKey: data.idempotencyKey,
			});
			if (!existing.ok) return existing;
			if (existing.data !== null) {
				if (existing.data.createRequestFingerprint !== fingerprint) {
					return fail(
						"CONFLICT",
						"Idempotency key reused with different payload",
						humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
					);
				}
				return ok(existing.data.timesheet);
			}
			return store.createTimesheet(
				{
					organizationId: data.organizationId,
					employeeId: data.employeeId,
					employmentId: data.employmentId ?? null,
					periodStart: data.periodStart,
					periodEnd: data.periodEnd,
					idempotencyKey: data.idempotencyKey,
					createRequestFingerprint: fingerprint,
					createdBy: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			);
		},
	});
}

export async function generateTimesheetEntries(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<{ timesheet: Timesheet; entries: TimesheetEntry[] }>> {
	return runTimeCommand(input, options, {
		schema: generateTimesheetEntriesInputSchema,
		invalidMessage: "Invalid timesheet generate entries input",
		command: HUMAN_RESOURCES_COMMAND_TIMESHEET_GENERATE_ENTRIES,
		execute: async (data, { store, ports }) => {
			const approvedLeave = requireApprovedLeaveQuery(options);
			if (!approvedLeave.ok) return approvedLeave;
			const workCalendar = requireWorkCalendar(options);
			if (!workCalendar.ok) return workCalendar;
			return store.generateTimesheetEntries(data, ports, {
				approvedLeave: approvedLeave.data,
				workCalendar: workCalendar.data,
			});
		},
	});
}

export async function addTimesheetEntry(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TimesheetEntry>> {
	return runTimeCommand(input, options, {
		schema: addTimesheetEntryInputSchema,
		invalidMessage: "Invalid timesheet entry add input",
		command: HUMAN_RESOURCES_COMMAND_TIMESHEET_ENTRY_ADD,
		execute: async (data, { store, ports }) =>
			store.addTimesheetEntry(
				{
					organizationId: data.organizationId,
					timesheetId: data.timesheetId,
					employeeId: data.employeeId,
					workDate: data.workDate,
					timezone: data.timezone,
					sourceType: data.sourceType,
					sourceReference: data.sourceReference ?? null,
					timeType: data.timeType,
					startedAt:
						data.startedAt !== undefined && data.startedAt !== null
							? new Date(data.startedAt)
							: null,
					endedAt:
						data.endedAt !== undefined && data.endedAt !== null
							? new Date(data.endedAt)
							: null,
					recordedMinutes: data.recordedMinutes,
					approvedMinutes: data.approvedMinutes ?? data.recordedMinutes,
					costCenterId: data.costCenterId ?? null,
					projectId: data.projectId ?? null,
					locationId: data.locationId ?? null,
					departmentId: data.departmentId ?? null,
					approvalReference: data.approvalReference ?? null,
					evidenceReference: data.evidenceReference ?? null,
					createdBy: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			),
	});
}

export async function updateTimesheetEntry(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TimesheetEntry>> {
	return runTimeCommand(input, options, {
		schema: updateTimesheetEntryInputSchema,
		invalidMessage: "Invalid timesheet entry update input",
		command: HUMAN_RESOURCES_COMMAND_TIMESHEET_ENTRY_UPDATE,
		execute: async (data, { store, ports }) =>
			store.updateTimesheetEntry(
				{
					organizationId: data.organizationId,
					entryId: data.entryId,
					workDate: data.workDate,
					timeType: data.timeType,
					startedAt:
						data.startedAt === undefined
							? undefined
							: data.startedAt === null
								? null
								: new Date(data.startedAt),
					endedAt:
						data.endedAt === undefined
							? undefined
							: data.endedAt === null
								? null
								: new Date(data.endedAt),
					recordedMinutes: data.recordedMinutes,
					approvedMinutes: data.approvedMinutes,
					costCenterId: data.costCenterId,
					projectId: data.projectId,
					locationId: data.locationId,
					departmentId: data.departmentId,
					approvalReference: data.approvalReference,
					evidenceReference: data.evidenceReference,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			),
	});
}

export async function removeTimesheetEntry(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<void>> {
	return runTimeCommand(input, options, {
		schema: removeTimesheetEntryInputSchema,
		invalidMessage: "Invalid timesheet entry remove input",
		command: HUMAN_RESOURCES_COMMAND_TIMESHEET_ENTRY_REMOVE,
		execute: async (data, { store, ports }) =>
			store.removeTimesheetEntry(data, ports),
	});
}

export async function submitTimesheet(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Timesheet>> {
	return runTimeCommand(input, options, {
		schema: submitTimesheetInputSchema,
		invalidMessage: "Invalid timesheet submit input",
		command: HUMAN_RESOURCES_COMMAND_TIMESHEET_SUBMIT,
		execute: async (data, { store, ports }) => {
			const timesheet = await store.getTimesheet({
				organizationId: data.organizationId,
				timesheetId: data.timesheetId,
			});
			if (!timesheet.ok) return timesheet;
			if (timesheet.data === null) {
				return fail("NOT_FOUND", "Timesheet not found");
			}
			const policy =
				timesheet.data.employmentId === null
					? ok(null)
					: await store.resolveTimePolicy({
							organizationId: data.organizationId,
							employmentId: timesheet.data.employmentId,
							asOf: timesheet.data.periodEnd,
						});
			if (!policy.ok) return policy;
			return store.submitTimesheet(
				{
					...data,
					submissionReference: randomUUID(),
					approvalPolicyId: policy.data?.id ?? null,
					requiredApprovalSteps: policy.data?.approvalSteps ?? ["line_manager"],
				},
				ports,
			);
		},
	});
}

export async function returnTimesheet(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Timesheet>> {
	return runTimeCommand(input, options, {
		schema: returnTimesheetInputSchema,
		invalidMessage: "Invalid timesheet return input",
		command: HUMAN_RESOURCES_COMMAND_TIMESHEET_RETURN,
		execute: async (data, { store, ports }) =>
			store.returnTimesheet(data, ports),
	});
}

export async function approveTimesheet(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Timesheet>> {
	return runTimeCommand(input, options, {
		schema: approveTimesheetInputSchema,
		invalidMessage: "Invalid timesheet approve input",
		command: HUMAN_RESOURCES_COMMAND_TIMESHEET_APPROVE,
		execute: async (data, { store, ports }) => {
			const authority = await store.resolveTimeApprovalAuthority({
				organizationId: data.organizationId,
				actorUserId: data.actorUserId,
				authority: data.authority,
				asOf: new Date().toISOString().slice(0, 10),
			});
			if (!authority.ok) return authority;
			if (authority.data === null) {
				return fail(
					"FORBIDDEN",
					"Actor does not hold the required approval authority",
					humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_FORBIDDEN),
				);
			}
			return store.approveTimesheet(
				{
					organizationId: data.organizationId,
					timesheetId: data.timesheetId,
					authority: data.authority,
					authorityAssignmentId: authority.data.id,
					approverNotes: data.approverNotes,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			);
		},
	});
}

export async function listTimesheetApprovalDecisions(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TimesheetApprovalDecision[]>> {
	return runTimeQuery(input, options, {
		schema: listTimesheetApprovalDecisionsInputSchema,
		invalidMessage: "Invalid timesheet approval decision list input",
		query: HUMAN_RESOURCES_QUERY_TIMESHEET_APPROVAL_DECISION_LIST,
		execute: async (data, { store }) =>
			store.listTimesheetApprovalDecisions({
				organizationId: data.organizationId,
				timesheetId: data.timesheetId,
				submissionReference: data.submissionReference,
			}),
	});
}

export async function rejectTimesheet(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Timesheet>> {
	return runTimeCommand(input, options, {
		schema: rejectTimesheetInputSchema,
		invalidMessage: "Invalid timesheet reject input",
		command: HUMAN_RESOURCES_COMMAND_TIMESHEET_REJECT,
		execute: async (data, { store, ports }) =>
			store.rejectTimesheet(data, ports),
	});
}

export async function reopenTimesheet(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Timesheet>> {
	return runTimeCommand(input, options, {
		schema: reopenTimesheetInputSchema,
		invalidMessage: "Invalid timesheet reopen input",
		command: HUMAN_RESOURCES_COMMAND_TIMESHEET_REOPEN,
		execute: async (data, { store, ports }) =>
			store.reopenTimesheet(data, ports),
	});
}

export async function lockTimesheet(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Timesheet>> {
	return runTimeCommand(input, options, {
		schema: lockTimesheetInputSchema,
		invalidMessage: "Invalid timesheet lock input",
		command: HUMAN_RESOURCES_COMMAND_TIMESHEET_LOCK,
		execute: async (data, { store, ports }) => store.lockTimesheet(data, ports),
	});
}

export async function supersedeTimesheet(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Timesheet>> {
	return runTimeCommand(input, options, {
		schema: supersedeTimesheetInputSchema,
		invalidMessage: "Invalid timesheet supersede input",
		command: HUMAN_RESOURCES_COMMAND_TIMESHEET_SUPERSEDE,
		execute: async (data, { store, ports }) => {
			const fingerprint = JSON.stringify({
				timesheetId: data.timesheetId,
				expectedVersion: data.expectedVersion,
			});
			return store.supersedeTimesheet(
				{
					organizationId: data.organizationId,
					timesheetId: data.timesheetId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
					idempotencyKey: data.idempotencyKey,
					createRequestFingerprint: fingerprint,
					correlationId: data.correlationId,
				},
				ports,
			);
		},
	});
}

export async function getTimesheet(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Timesheet | null>> {
	return runTimeQuery(input, options, {
		schema: getTimesheetInputSchema,
		invalidMessage: "Invalid timesheet get input",
		query: HUMAN_RESOURCES_QUERY_TIMESHEET_GET,
		execute: async (data, { store }) =>
			store.getTimesheet({
				organizationId: data.organizationId,
				timesheetId: data.timesheetId,
			}),
	});
}

export async function getTimesheetForEmployeePeriod(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Timesheet | null>> {
	return runTimeQuery(input, options, {
		schema: getTimesheetForEmployeePeriodInputSchema,
		invalidMessage: "Invalid timesheet for employee period input",
		query: HUMAN_RESOURCES_QUERY_TIMESHEET_FOR_EMPLOYEE_PERIOD_GET,
		execute: async (data, { store }) =>
			store.findTimesheetForEmployeePeriod({
				organizationId: data.organizationId,
				employeeId: data.employeeId,
				periodStart: data.periodStart,
				periodEnd: data.periodEnd,
			}),
	});
}

export async function listTimesheets(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Timesheet[]>> {
	return runTimeQuery(input, options, {
		schema: listTimesheetsInputSchema,
		invalidMessage: "Invalid timesheet list input",
		query: HUMAN_RESOURCES_QUERY_TIMESHEET_LIST,
		execute: async (data, { store }) => store.listTimesheets(data),
	});
}

export async function listTimesheetEntries(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TimesheetEntry[]>> {
	return runTimeQuery(input, options, {
		schema: listTimesheetEntriesInputSchema,
		invalidMessage: "Invalid timesheet entry list input",
		query: HUMAN_RESOURCES_QUERY_TIMESHEET_ENTRY_LIST,
		execute: async (data, { store }) => store.listTimesheetEntries(data),
	});
}

export async function getTimesheetTotals(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TimesheetTotals | null>> {
	return runTimeQuery(input, options, {
		schema: getTimesheetTotalsInputSchema,
		invalidMessage: "Invalid timesheet totals input",
		query: HUMAN_RESOURCES_QUERY_TIMESHEET_TOTALS_GET,
		execute: async (data, { store }) =>
			store.getTimesheetTotals({
				organizationId: data.organizationId,
				timesheetId: data.timesheetId,
			}),
	});
}
