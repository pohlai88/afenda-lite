import { expect } from "vitest";

import type { HumanResourcesCommandOptions } from "../../src/command-options";
import { createEmployee } from "../../src/core/employee";
import { createEmployment } from "../../src/core/employment";
import { activateShift, createShift } from "../../src/time/shift";
import type {
	AttendanceExceptionType,
	Employee,
	Employment,
	Shift,
} from "../../src/types";
import { runDrizzleParity } from "./database-gate";
import type { WorkforceStoreAdapter } from "./hr-parity-harness";

export { runDrizzleParity };

export const STANDARD_WEEK = [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
	dayOfWeek: dayOfWeek as 0 | 1 | 2 | 3 | 4 | 5 | 6,
	isWorkingDay: dayOfWeek >= 1 && dayOfWeek <= 5,
	standardStartTime: dayOfWeek >= 1 && dayOfWeek <= 5 ? "09:00" : null,
	standardEndTime: dayOfWeek >= 1 && dayOfWeek <= 5 ? "17:00" : null,
	standardMinutes: dayOfWeek >= 1 && dayOfWeek <= 5 ? 480 : null,
}));

export const ALL_ATTENDANCE_EXCEPTION_TYPES = [
	"late_arrival",
	"early_departure",
	"absence",
	"missing_clock_in",
	"missing_clock_out",
	"unplanned_attendance",
	"overlapping_attendance",
	"excessive_break",
	"insufficient_rest",
	"schedule_mismatch",
	"location_mismatch",
	"overtime_candidate",
] as const satisfies readonly AttendanceExceptionType[];

type MissingAttendanceExceptionType = Exclude<
	AttendanceExceptionType,
	(typeof ALL_ATTENDANCE_EXCEPTION_TYPES)[number]
>;

export const ATTENDANCE_EXCEPTION_INVENTORY_IS_EXHAUSTIVE: MissingAttendanceExceptionType extends never
	? true
	: never = true;

export const ATTENDANCE_EXCEPTION_SEVERITY = {
	late_arrival: "warning",
	early_departure: "warning",
	absence: "warning",
	missing_clock_in: "critical",
	missing_clock_out: "warning",
	unplanned_attendance: "info",
	overlapping_attendance: "critical",
	excessive_break: "warning",
	insufficient_rest: "critical",
	schedule_mismatch: "warning",
	location_mismatch: "warning",
	overtime_candidate: "info",
} as const satisfies Record<
	AttendanceExceptionType,
	"info" | "warning" | "critical"
>;

export function uniqueSuffix(adapter: WorkforceStoreAdapter): string {
	return `${adapter}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export async function seedParityEmployeeEmployment(
	ready: HumanResourcesCommandOptions,
	input: {
		organizationId: string;
		actorUserId: string;
		suffix: string;
		correlationTag: string;
	},
): Promise<{ employee: Employee; employment: Employment }> {
	const employee = await createEmployee(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-${input.correlationTag}-emp-${input.suffix}`,
			idempotencyKey: `idem-${input.correlationTag}-emp-${input.suffix}`,
			employeeNumber: `E-${input.correlationTag}-${input.suffix}`.slice(0, 64),
			legalName: `Worker ${input.suffix}`,
		},
		ready,
	);
	expect(employee.ok).toBe(true);
	if (!employee.ok) throw new Error("employee seed failed");
	const employment = await createEmployment(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-${input.correlationTag}-employ-${input.suffix}`,
			employeeId: employee.data.id,
			startsOn: "2025-01-01",
		},
		ready,
	);
	expect(employment.ok).toBe(true);
	if (!employment.ok) throw new Error("employment seed failed");
	return { employee: employee.data, employment: employment.data };
}

export async function seedDraftShift(
	ready: HumanResourcesCommandOptions,
	input: {
		organizationId: string;
		actorUserId: string;
		suffix: string;
		correlationTag: string;
		code: string;
	},
): Promise<Shift> {
	const created = await createShift(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-${input.correlationTag}-shift-${input.suffix}-${input.code}`,
			idempotencyKey: `idem-${input.correlationTag}-shift-${input.suffix}-${input.code}`,
			code: `SH-${input.correlationTag}-${input.code}-${input.suffix}`.slice(
				0,
				64,
			),
			name: `Shift ${input.code}`,
			shiftKind: "fixed",
			startLocal: "09:00",
			endLocal: "17:00",
			expectedMinutes: 480,
			effectiveFrom: "2025-01-01",
		},
		ready,
	);
	expect(created.ok).toBe(true);
	if (!created.ok) {
		throw new Error(`createShift failed: ${created.message}`);
	}
	return created.data;
}

export async function seedActiveShift(
	ready: HumanResourcesCommandOptions,
	input: {
		organizationId: string;
		actorUserId: string;
		suffix: string;
		correlationTag: string;
		code: string;
	},
): Promise<Shift> {
	const draft = await seedDraftShift(ready, input);
	const activated = await activateShift(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-${input.correlationTag}-act-${input.suffix}-${input.code}`,
			shiftId: draft.id,
			expectedVersion: draft.version,
		},
		ready,
	);
	expect(activated.ok).toBe(true);
	if (!activated.ok) {
		throw new Error(`activateShift failed: ${activated.message}`);
	}
	return activated.data;
}
