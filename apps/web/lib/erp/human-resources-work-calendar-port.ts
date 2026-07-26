import {
	createProductionWorkCalendar,
	type WorkCalendarPort,
} from "@afenda/human-resources";
import { createDrizzleWorkCalendarLookup } from "@afenda/human-resources/adapters/drizzle";

/** Composition-root work calendar for leave segment expansion. */
export function createHumanResourcesWorkCalendarPort(): WorkCalendarPort {
	return createProductionWorkCalendar({
		lookup: createDrizzleWorkCalendarLookup(),
	});
}
