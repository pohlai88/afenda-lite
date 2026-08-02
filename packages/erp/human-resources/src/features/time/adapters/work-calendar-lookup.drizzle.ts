import type { AssignmentContextQueryPort } from "../handoff/ports";
import {
	createStoreWorkCalendarLookup,
	type StoreWorkCalendarLookupStore,
} from "../store-work-calendar-lookup";
import type {
	WorkCalendarLookupPort,
	WorkWeekDayPattern,
} from "../work-calendar";

const DEFAULT_MON_FRI_WEEK: WorkWeekDayPattern[] = [
	{
		dayOfWeek: 0,
		isWorkingDay: false,
		standardStartTime: null,
		standardEndTime: null,
		standardMinutes: null,
	},
	{
		dayOfWeek: 1,
		isWorkingDay: true,
		standardStartTime: "09:00",
		standardEndTime: "17:00",
		standardMinutes: 480,
	},
	{
		dayOfWeek: 2,
		isWorkingDay: true,
		standardStartTime: "09:00",
		standardEndTime: "17:00",
		standardMinutes: 480,
	},
	{
		dayOfWeek: 3,
		isWorkingDay: true,
		standardStartTime: "09:00",
		standardEndTime: "17:00",
		standardMinutes: 480,
	},
	{
		dayOfWeek: 4,
		isWorkingDay: true,
		standardStartTime: "09:00",
		standardEndTime: "17:00",
		standardMinutes: 480,
	},
	{
		dayOfWeek: 5,
		isWorkingDay: true,
		standardStartTime: "09:00",
		standardEndTime: "17:00",
		standardMinutes: 480,
	},
	{
		dayOfWeek: 6,
		isWorkingDay: false,
		standardStartTime: null,
		standardEndTime: null,
		standardMinutes: null,
	},
];

export function createDrizzleWorkCalendarLookup(input: {
	store: StoreWorkCalendarLookupStore;
	assignmentContext: AssignmentContextQueryPort;
}): WorkCalendarLookupPort {
	return createStoreWorkCalendarLookup({
		store: input.store,
		assignmentContext: input.assignmentContext,
	});
}

export { DEFAULT_MON_FRI_WEEK };
