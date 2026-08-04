import {
	type ClockPort,
	canonicalDateSchema,
	canonicalInstantSchema,
} from "@afenda/corporate-administration";

function calendarPart(
	parts: readonly Intl.DateTimeFormatPart[],
	type: "year" | "month" | "day",
): string {
	const value = parts.find((part) => part.type === type)?.value;
	if (value === undefined) {
		throw new RangeError(`Unable to resolve ${type} for IANA time zone`);
	}
	return value;
}

/**
 * Deterministic test clock configured from one canonical UTC instant.
 *
 * `now()` returns a fresh `Date` on every call. `today()` delegates IANA-zone
 * interpretation to `Intl.DateTimeFormat`, independently of the machine's
 * local time zone, and propagates its `RangeError` for an invalid zone.
 *
 * Test-only helper; it is intentionally not exported from the package.
 */
export function createFixedCorporateAdministrationClock(
	instant: string,
): ClockPort {
	const canonicalInstant = canonicalInstantSchema.parse(instant);
	const epochMilliseconds = new Date(canonicalInstant).getTime();

	return Object.freeze({
		now(): Date {
			return new Date(epochMilliseconds);
		},
		today(timeZoneIana: string) {
			const parts = new Intl.DateTimeFormat("en-US", {
				timeZone: timeZoneIana,
				year: "numeric",
				month: "2-digit",
				day: "2-digit",
			}).formatToParts(epochMilliseconds);
			const year = calendarPart(parts, "year").padStart(4, "0");
			return canonicalDateSchema.parse(
				`${year}-${calendarPart(parts, "month")}-${calendarPart(parts, "day")}`,
			);
		},
	});
}
