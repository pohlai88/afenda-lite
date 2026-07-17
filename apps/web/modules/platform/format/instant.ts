/**
 * Deterministic instant display for RSC + client hydration.
 * Always formats in UTC with a fixed locale — never bare `toLocaleString()`.
 */

const DISPLAY_LOCALE = "en-GB";

const UTC_DATETIME: Intl.DateTimeFormatOptions = {
	year: "numeric",
	month: "short",
	day: "numeric",
	hour: "2-digit",
	minute: "2-digit",
	second: "2-digit",
	hour12: false,
	timeZone: "UTC",
};

const UTC_DATE: Intl.DateTimeFormatOptions = {
	year: "numeric",
	month: "short",
	day: "numeric",
	timeZone: "UTC",
};

function parseInstantMs(value: string): number | null {
	const parsed = Date.parse(value);
	if (Number.isNaN(parsed)) {
		return null;
	}
	return parsed;
}

/** Date + time in UTC (audit / submitted-at style). */
export function formatInstantUtc(value: string | null | undefined): string {
	if (value == null || value.trim().length === 0) {
		return "—";
	}
	const ms = parseInstantMs(value);
	if (ms === null) {
		return value;
	}
	return `${new Intl.DateTimeFormat(DISPLAY_LOCALE, UTC_DATETIME).format(ms)} UTC`;
}

/** Calendar date in UTC (due-date / list columns). */
export function formatInstantUtcDate(value: string | null | undefined): string {
	if (value == null || value.trim().length === 0) {
		return "—";
	}
	const ms = parseInstantMs(value);
	if (ms === null) {
		return value;
	}
	return new Intl.DateTimeFormat(DISPLAY_LOCALE, UTC_DATE).format(ms);
}
