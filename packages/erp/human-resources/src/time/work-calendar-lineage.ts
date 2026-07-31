import { errorResult, type Result } from "@afenda/errors";

import type { HumanResourcesWorkCalendarId } from "../brands";
import { selectEffectiveLineageRecord } from "../shared/effective-lineage";
import type { HumanResourcesStore } from "../store";
import type { WorkCalendar } from "../types";

export function lineageEligibleWorkCalendar(calendar: WorkCalendar): boolean {
	return calendar.status === "active" || calendar.status === "superseded";
}

export type WorkCalendarLineageStoreSlice = Pick<
	HumanResourcesStore,
	"getWorkCalendar" | "listWorkCalendars"
>;

export async function resolveWorkCalendarLineageAtAsOf(
	input: {
		organizationId: string;
		calendarId: HumanResourcesWorkCalendarId;
		asOf: string;
	},
	store: WorkCalendarLineageStoreSlice,
): Promise<Result<WorkCalendar | null>> {
	const calendar = await store.getWorkCalendar({
		organizationId: input.organizationId,
		calendarId: input.calendarId,
	});
	if (!calendar.ok) {
		return calendar;
	}
	if (calendar.data === null) {
		return errorResult.ok(null);
	}

	const selectedCalendar = calendar.data;
	const calendarFamily = await store.listWorkCalendars({
		organizationId: input.organizationId,
	});
	if (!calendarFamily.ok) {
		return calendarFamily;
	}

	return errorResult.ok(
		selectEffectiveLineageRecord({
			assignedId: selectedCalendar.id,
			records: calendarFamily.data.filter(
				(record) => record.code === selectedCalendar.code,
			),
			asOf: input.asOf,
			getPredecessorId: (record) => record.supersedesCalendarId,
			isEligible: lineageEligibleWorkCalendar,
		}),
	);
}
