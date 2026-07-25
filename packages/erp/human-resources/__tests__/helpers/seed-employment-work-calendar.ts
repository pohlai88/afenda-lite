import { expect } from "vitest";

import type { HumanResourcesCommandOptions } from "../../src/command-options";
import {
	assignEmploymentCalendar,
	createWorkCalendar,
} from "../../src/time/calendar";
import { STANDARD_WEEK } from "./time-parity-shared";

export async function seedEmploymentWorkCalendar(
	ready: HumanResourcesCommandOptions,
	input: {
		organizationId: string;
		actorUserId: string;
		employeeId: string;
		employmentId: string;
		suffix: string;
		timezone?: string;
		effectiveFrom?: string;
		codePrefix?: string;
	},
): Promise<void> {
	const timezone = input.timezone ?? "UTC";
	const effectiveFrom = input.effectiveFrom ?? "2025-01-01";
	const codePrefix = input.codePrefix ?? "CAL";
	const calendar = await createWorkCalendar(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-${codePrefix}-calendar-${input.suffix}`,
			idempotencyKey: `idem-${codePrefix}-calendar-${input.suffix}`,
			code: `${codePrefix}-${input.suffix}`,
			name: `Work calendar ${input.suffix}`,
			timezone,
			calendarVersion: "v1",
			workWeek: STANDARD_WEEK,
			standardHoursPerDay: "8.00",
			effectiveFrom,
		},
		ready,
	);
	expect(calendar.ok).toBe(true);
	if (!calendar.ok) {
		throw new Error("work calendar seed failed");
	}

	const assigned = await assignEmploymentCalendar(
		{
			organizationId: input.organizationId,
			actorUserId: input.actorUserId,
			correlationId: `corr-${codePrefix}-calendar-assign-${input.suffix}`,
			employeeId: input.employeeId,
			employmentId: input.employmentId,
			calendarId: calendar.data.id,
			effectiveFrom,
		},
		ready,
	);
	expect(assigned.ok).toBe(true);
	if (!assigned.ok) {
		throw new Error("employment calendar assignment failed");
	}
}
