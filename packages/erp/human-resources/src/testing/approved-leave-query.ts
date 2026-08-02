import { createProductionApprovedLeaveQuery } from "../composition/production/approved-leave-query";
import type { HumanResourcesStore } from "../composition/store/index";
import type { ApprovedLeaveQueryPort } from "../features/time/handoff/ports";
import { createStoreWorkCalendarLookup } from "../features/time/store-work-calendar-lookup";
import type { WorkCalendarLookupPort } from "../features/time/work-calendar";

/** Test/composition helper — store-backed approved leave query for Time. */
export function createStoreApprovedLeaveQuery(input: {
	store: HumanResourcesStore;
	lookup?: WorkCalendarLookupPort | undefined;
	defaultTimezone?: string | undefined;
}): ApprovedLeaveQueryPort {
	return createProductionApprovedLeaveQuery({
		store: input.store,
		lookup:
			input.lookup ?? createStoreWorkCalendarLookup({ store: input.store }),
		defaultTimezone: input.defaultTimezone,
	});
}
