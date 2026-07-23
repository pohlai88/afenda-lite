import { createDrizzleWorkCalendarLookup } from "@afenda/human-resources/adapters/drizzle";
import {
	createProductionWorkCalendar,
	type WorkCalendarPort,
} from "@afenda/human-resources";

/** Composition-root work calendar for leave segment expansion. */
export function createHumanResourcesWorkCalendarPort(): WorkCalendarPort {
	return createProductionWorkCalendar({
		lookup: createDrizzleWorkCalendarLookup(),
	});
}
