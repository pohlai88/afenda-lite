import { randomUUID } from "node:crypto";

import { errorResult, type Result } from "@afenda/errors";
import type {
	Timesheet,
	TimesheetApprovalDecision,
	TimesheetEntry,
	TimesheetTotals,
} from "../../kernel/contracts";
import {
	type HumanResourcesCommandOptions,
	requireApprovedLeaveQuery,
	requireWorkCalendar,
} from "../../kernel/execution/command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	HUMAN_RESOURCES_ERROR_FORBIDDEN,
	humanResourcesErrorDetails,
} from "../../kernel/execution/error-codes";
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
} from "../../kernel/operations/module-ids";
import {
	runTimeCapabilityCommand,
	runTimeCapabilityQuery,
} from "./run-operation";
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
} from "./schema";

export async function createTimesheet(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Timesheet>> {
	return await runTimeCapabilityCommand(input, options, {
		schema: createTimesheetInputSchema,
		invalidMessage: "Invalid timesheet create input",
		command: HUMAN_RESOURCES_COMMAND_TIMESHEET_CREATE,
		storeMethods: ["createTimesheet", "findTimesheetByIdempotencyKey"],
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
				return errorResult.ok(existing.data.timesheet);
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
	return await runTimeCapabilityCommand(input, options, {
		schema: generateTimesheetEntriesInputSchema,
		invalidMessage: "Invalid timesheet generate entries input",
		command: HUMAN_RESOURCES_COMMAND_TIMESHEET_GENERATE_ENTRIES,
		storeMethods: ["generateTimesheetEntries"],
		execute: async (data, { store, ports }) => {
			const approvedLeave = requireApprovedLeaveQuery(options);
			if (!approvedLeave.ok) {
				return await approvedLeave;
			}
			const workCalendar = requireWorkCalendar(options);
			if (!workCalendar.ok) {
				return await workCalendar;
			}
			return await store.generateTimesheetEntries(data, ports, {
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
	return await runTimeCapabilityCommand(input, options, {
		schema: addTimesheetEntryInputSchema,
		invalidMessage: "Invalid timesheet entry add input",
		command: HUMAN_RESOURCES_COMMAND_TIMESHEET_ENTRY_ADD,
		storeMethods: ["addTimesheetEntry"],
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
	return await runTimeCapabilityCommand(input, options, {
		schema: updateTimesheetEntryInputSchema,
		invalidMessage: "Invalid timesheet entry update input",
		command: HUMAN_RESOURCES_COMMAND_TIMESHEET_ENTRY_UPDATE,
		storeMethods: ["updateTimesheetEntry"],
		execute: async (data, { store, ports }) =>
			store.updateTimesheetEntry(
				{
					organizationId: data.organizationId,
					entryId: data.entryId,
					workDate: data.workDate,
					timeType: data.timeType,
					startedAt: (() => {
						if (data.startedAt === undefined) {
							return;
						}
						if (data.startedAt === null) {
							return null;
						}
						return new Date(data.startedAt);
					})(),
					endedAt: (() => {
						if (data.endedAt === undefined) {
							return;
						}
						if (data.endedAt === null) {
							return null;
						}
						return new Date(data.endedAt);
					})(),
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
	return await runTimeCapabilityCommand(input, options, {
		schema: removeTimesheetEntryInputSchema,
		invalidMessage: "Invalid timesheet entry remove input",
		command: HUMAN_RESOURCES_COMMAND_TIMESHEET_ENTRY_REMOVE,
		storeMethods: ["removeTimesheetEntry"],
		execute: async (data, { store, ports }) =>
			store.removeTimesheetEntry(data, ports),
	});
}

export async function submitTimesheet(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Timesheet>> {
	return await runTimeCapabilityCommand(input, options, {
		schema: submitTimesheetInputSchema,
		invalidMessage: "Invalid timesheet submit input",
		command: HUMAN_RESOURCES_COMMAND_TIMESHEET_SUBMIT,
		storeMethods: ["getTimesheet", "resolveTimePolicy", "submitTimesheet"],
		execute: async (data, { store, ports }) => {
			const timesheet = await store.getTimesheet({
				organizationId: data.organizationId,
				timesheetId: data.timesheetId,
			});
			if (!timesheet.ok) {
				return timesheet;
			}
			if (timesheet.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "The requested resource was not found",
				});
			}
			const policy =
				timesheet.data.employmentId === null
					? errorResult.ok(null)
					: await store.resolveTimePolicy({
							organizationId: data.organizationId,
							employmentId: timesheet.data.employmentId,
							asOf: timesheet.data.periodEnd,
						});
			if (!policy.ok) {
				return policy;
			}
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
	return await runTimeCapabilityCommand(input, options, {
		schema: returnTimesheetInputSchema,
		invalidMessage: "Invalid timesheet return input",
		command: HUMAN_RESOURCES_COMMAND_TIMESHEET_RETURN,
		storeMethods: ["returnTimesheet"],
		execute: async (data, { store, ports }) =>
			store.returnTimesheet(data, ports),
	});
}

export async function approveTimesheet(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Timesheet>> {
	return await runTimeCapabilityCommand(input, options, {
		schema: approveTimesheetInputSchema,
		invalidMessage: "Invalid timesheet approve input",
		command: HUMAN_RESOURCES_COMMAND_TIMESHEET_APPROVE,
		storeMethods: ["approveTimesheet", "resolveTimeApprovalAuthority"],
		execute: async (data, { store, ports }) => {
			const authority = await store.resolveTimeApprovalAuthority({
				organizationId: data.organizationId,
				actorUserId: data.actorUserId,
				authority: data.authority,
				asOf: new Date().toISOString().slice(0, 10),
			});
			if (!authority.ok) {
				return authority;
			}
			if (authority.data === null) {
				return errorResult.fail("FORBIDDEN", {
					internalContext: humanResourcesErrorDetails(
						HUMAN_RESOURCES_ERROR_FORBIDDEN,
					),
				});
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
	return await runTimeCapabilityQuery(input, options, {
		schema: listTimesheetApprovalDecisionsInputSchema,
		invalidMessage: "Invalid timesheet approval decision list input",
		query: HUMAN_RESOURCES_QUERY_TIMESHEET_APPROVAL_DECISION_LIST,
		storeMethods: ["listTimesheetApprovalDecisions"],
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
	return await runTimeCapabilityCommand(input, options, {
		schema: rejectTimesheetInputSchema,
		invalidMessage: "Invalid timesheet reject input",
		command: HUMAN_RESOURCES_COMMAND_TIMESHEET_REJECT,
		storeMethods: ["rejectTimesheet"],
		execute: async (data, { store, ports }) =>
			store.rejectTimesheet(data, ports),
	});
}

export async function reopenTimesheet(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Timesheet>> {
	return await runTimeCapabilityCommand(input, options, {
		schema: reopenTimesheetInputSchema,
		invalidMessage: "Invalid timesheet reopen input",
		command: HUMAN_RESOURCES_COMMAND_TIMESHEET_REOPEN,
		storeMethods: ["reopenTimesheet"],
		execute: async (data, { store, ports }) =>
			store.reopenTimesheet(data, ports),
	});
}

export async function lockTimesheet(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Timesheet>> {
	return await runTimeCapabilityCommand(input, options, {
		schema: lockTimesheetInputSchema,
		invalidMessage: "Invalid timesheet lock input",
		command: HUMAN_RESOURCES_COMMAND_TIMESHEET_LOCK,
		storeMethods: ["lockTimesheet"],
		execute: async (data, { store, ports }) => store.lockTimesheet(data, ports),
	});
}

export async function supersedeTimesheet(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<Timesheet>> {
	return await runTimeCapabilityCommand(input, options, {
		schema: supersedeTimesheetInputSchema,
		invalidMessage: "Invalid timesheet supersede input",
		command: HUMAN_RESOURCES_COMMAND_TIMESHEET_SUPERSEDE,
		storeMethods: ["supersedeTimesheet"],
		execute: async (data, { store, ports }) => {
			const fingerprint = JSON.stringify({
				timesheetId: data.timesheetId,
				expectedVersion: data.expectedVersion,
			});
			return await store.supersedeTimesheet(
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
	return await runTimeCapabilityQuery(input, options, {
		schema: getTimesheetInputSchema,
		invalidMessage: "Invalid timesheet get input",
		query: HUMAN_RESOURCES_QUERY_TIMESHEET_GET,
		storeMethods: ["getTimesheet"],
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
	return await runTimeCapabilityQuery(input, options, {
		schema: getTimesheetForEmployeePeriodInputSchema,
		invalidMessage: "Invalid timesheet for employee period input",
		query: HUMAN_RESOURCES_QUERY_TIMESHEET_FOR_EMPLOYEE_PERIOD_GET,
		storeMethods: ["findTimesheetForEmployeePeriod"],
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
	return await runTimeCapabilityQuery(input, options, {
		schema: listTimesheetsInputSchema,
		invalidMessage: "Invalid timesheet list input",
		query: HUMAN_RESOURCES_QUERY_TIMESHEET_LIST,
		storeMethods: ["listTimesheets"],
		execute: async (data, { store }) => store.listTimesheets(data),
	});
}

export async function listTimesheetEntries(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TimesheetEntry[]>> {
	return await runTimeCapabilityQuery(input, options, {
		schema: listTimesheetEntriesInputSchema,
		invalidMessage: "Invalid timesheet entry list input",
		query: HUMAN_RESOURCES_QUERY_TIMESHEET_ENTRY_LIST,
		storeMethods: ["listTimesheetEntries"],
		execute: async (data, { store }) => store.listTimesheetEntries(data),
	});
}

export async function getTimesheetTotals(
	input: unknown,
	options: HumanResourcesCommandOptions = {},
): Promise<Result<TimesheetTotals | null>> {
	return await runTimeCapabilityQuery(input, options, {
		schema: getTimesheetTotalsInputSchema,
		invalidMessage: "Invalid timesheet totals input",
		query: HUMAN_RESOURCES_QUERY_TIMESHEET_TOTALS_GET,
		storeMethods: ["getTimesheetTotals"],
		execute: async (data, { store }) =>
			store.getTimesheetTotals({
				organizationId: data.organizationId,
				timesheetId: data.timesheetId,
			}),
	});
}
