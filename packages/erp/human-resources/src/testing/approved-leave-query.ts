import { createProductionApprovedLeaveQuery } from "../production-approved-leave-query";
import type { HumanResourcesStore } from "../store";
import type { ApprovedLeaveQueryPort } from "../time/handoff/ports";
import type { WorkCalendarLookupPort } from "../work-calendar";
import { createStoreWorkCalendarLookup } from "./store-work-calendar-lookup";

/** Test/composition helper — store-backed approved leave query for Time. */
export function createStoreApprovedLeaveQuery(input: {
	store: HumanResourcesStore;
	lookup?: WorkCalendarLookupPort;
	defaultTimezone?: string;
}): ApprovedLeaveQueryPort {
	return createProductionApprovedLeaveQuery({
		store: input.store,
		lookup:
			input.lookup ?? createStoreWorkCalendarLookup({ store: input.store }),
		defaultTimezone: input.defaultTimezone,
	});
}
