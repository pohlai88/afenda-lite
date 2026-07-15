/**
 * Calendar shell types for AdminCN kit.
 * Adapted from archive `types/apps/calendar-types` (no apps/* nest).
 */

export type CalendarView = "month" | "week" | "day" | "agenda";

export type CalendarEventType =
	| "family"
	| "business"
	| "personal"
	| "holiday"
	| "etc";

/** Archive alias used by calendar-utils / Studio DNA */
export type events = CalendarEventType;

export interface CalendarEvent {
	id: string;
	title: string;
	description?: string;
	start: Date;
	end: Date;
	allDay?: boolean;
	color?: CalendarEventType;
	location?: string;
}

/** Prefer `CalendarEventType`; `EventColor` kept for Studio import parity. */
export type EventColor = CalendarEventType;
