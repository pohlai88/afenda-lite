import { fail, ok, type Result } from "@afenda/errors/result";

import type { PayrollCommandOptions } from "../command-options";
import {
	PAYROLL_ERROR_CONFLICT,
	payrollErrorDetails,
} from "../error-codes";
import {
	PAYROLL_COMMAND_SETUP_CALENDAR_ARCHIVE,
	PAYROLL_COMMAND_SETUP_CALENDAR_CREATE,
	PAYROLL_COMMAND_SETUP_CALENDAR_UPDATE,
	PAYROLL_QUERY_SETUP_CALENDAR_GET,
	PAYROLL_QUERY_SETUP_CALENDAR_LIST,
} from "../module-ids";
import {
	archivePayrollCalendarInputSchema,
	createPayrollCalendarInputSchema,
	getPayrollCalendarInputSchema,
	listPayrollCalendarsInputSchema,
	updatePayrollCalendarInputSchema,
} from "../schemas/setup";
import { buildPayrollCreateFingerprint } from "../shared/create-fingerprint";
import {
	runPayrollSetupCommand,
	runPayrollSetupQuery,
} from "../shared/setup-command";
import type { PayrollCalendar } from "../types";

export async function createPayrollCalendar(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollCalendar>> {
	return runPayrollSetupCommand(input, options, {
		schema: createPayrollCalendarInputSchema,
		invalidMessage: "Invalid payroll calendar create input",
		command: PAYROLL_COMMAND_SETUP_CALENDAR_CREATE,
		execute: async (data, { store, ports }) => {
			const fingerprint = buildPayrollCreateFingerprint({
				code: data.code,
				name: data.name,
				timezone: data.timezone,
				effectiveFrom: data.effectiveFrom,
				effectiveTo: data.effectiveTo ?? null,
			});
			const existing = await store.findCalendarByIdempotencyKey({
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
						payrollErrorDetails(PAYROLL_ERROR_CONFLICT),
					);
				}
				return ok(existing.data.calendar);
			}
			return store.createCalendar(
				{
					organizationId: data.organizationId,
					code: data.code,
					name: data.name,
					timezone: data.timezone,
					effectiveFrom: data.effectiveFrom,
					effectiveTo: data.effectiveTo ?? null,
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

export async function updatePayrollCalendar(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollCalendar>> {
	return runPayrollSetupCommand(input, options, {
		schema: updatePayrollCalendarInputSchema,
		invalidMessage: "Invalid payroll calendar update input",
		command: PAYROLL_COMMAND_SETUP_CALENDAR_UPDATE,
		execute: async (data, { store, ports }) =>
			store.updateCalendar(
				{
					organizationId: data.organizationId,
					calendarId: data.calendarId,
					name: data.name,
					timezone: data.timezone,
					effectiveTo: data.effectiveTo,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			),
	});
}

export async function archivePayrollCalendar(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollCalendar>> {
	return runPayrollSetupCommand(input, options, {
		schema: archivePayrollCalendarInputSchema,
		invalidMessage: "Invalid payroll calendar archive input",
		command: PAYROLL_COMMAND_SETUP_CALENDAR_ARCHIVE,
		execute: async (data, { store, ports }) =>
			store.archiveCalendar(
				{
					organizationId: data.organizationId,
					calendarId: data.calendarId,
					expectedVersion: data.expectedVersion,
					actorUserId: data.actorUserId,
					correlationId: data.correlationId,
				},
				ports,
			),
	});
}

export async function getPayrollCalendar(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollCalendar | null>> {
	return runPayrollSetupQuery(input, options, {
		schema: getPayrollCalendarInputSchema,
		invalidMessage: "Invalid payroll calendar get input",
		query: PAYROLL_QUERY_SETUP_CALENDAR_GET,
		execute: async (data, { store }) =>
			store.getCalendar({
				organizationId: data.organizationId,
				calendarId: data.calendarId,
			}),
	});
}

export async function listPayrollCalendars(
	input: unknown,
	options: PayrollCommandOptions = {},
): Promise<Result<PayrollCalendar[]>> {
	return runPayrollSetupQuery(input, options, {
		schema: listPayrollCalendarsInputSchema,
		invalidMessage: "Invalid payroll calendar list input",
		query: PAYROLL_QUERY_SETUP_CALENDAR_LIST,
		execute: async (data, { store }) =>
			store.listCalendars({
				organizationId: data.organizationId,
				status: data.status,
			}),
	});
}

export const PAYROLL_AGGREGATE_CALENDAR = "calendar" as const;
export type PayrollCalendarAggregate = typeof PAYROLL_AGGREGATE_CALENDAR;
