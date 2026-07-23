import {
	type ApprovedLeaveQueryPort,
	createProductionApprovedLeaveQuery,
} from "@afenda/human-resources";
import { createDrizzleWorkCalendarLookup } from "@afenda/human-resources/adapters/drizzle";
import { resolveHumanResourcesStore } from "@afenda/human-resources/resolve-store";

/** Composition-root approved leave query for Time timesheet generation. */
export function createHumanResourcesApprovedLeaveQueryPort(): ApprovedLeaveQueryPort {
	return createProductionApprovedLeaveQuery({
		store: resolveHumanResourcesStore(),
		lookup: createDrizzleWorkCalendarLookup(),
	});
}
