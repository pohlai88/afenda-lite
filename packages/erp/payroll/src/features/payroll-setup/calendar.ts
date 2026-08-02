import { errorResult, type Result } from "@afenda/errors";
import type { PayrollCalendar } from "../../kernel/contracts/projected-types";
import { buildPayrollCreateFingerprint } from "../../kernel/identity/create-fingerprint";
import {
	PAYROLL_COMMAND_SETUP_CALENDAR_ARCHIVE,
	PAYROLL_COMMAND_SETUP_CALENDAR_CREATE,
	PAYROLL_COMMAND_SETUP_CALENDAR_UPDATE,
	PAYROLL_QUERY_SETUP_CALENDAR_GET,
	PAYROLL_QUERY_SETUP_CALENDAR_LIST,
} from "../../kernel/operations/module-ids";
import {
	archivePayrollCalendarInputSchema,
	createPayrollCalendarInputSchema,
	getPayrollCalendarInputSchema,
	listPayrollCalendarsInputSchema,
	updatePayrollCalendarInputSchema,
} from "./setup.schema";
import type {
	PayrollSetupCommandOptions,
	PayrollSetupQueryOptions,
} from "./setup-operation";
import {
	runPayrollSetupCommand,
	runPayrollSetupQuery,
} from "./setup-operation";

export function createPayrollCalendar(
	input: unknown,
	options: PayrollSetupCommandOptions = {},
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
					return errorResult.fail("CONFLICT", {
						publicMessage: "Idempotency key reused with different payload",
					});
				}
				return errorResult.ok(existing.data.calendar);
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

export function updatePayrollCalendar(
	input: unknown,
	options: PayrollSetupCommandOptions = {},
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

export function archivePayrollCalendar(
	input: unknown,
	options: PayrollSetupCommandOptions = {},
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

export function getPayrollCalendar(
	input: unknown,
	options: PayrollSetupQueryOptions = {},
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

export function listPayrollCalendars(
	input: unknown,
	options: PayrollSetupQueryOptions = {},
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
