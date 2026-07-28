import { defineManifestContract } from "./manifest.contract";

export const calendarContract = defineManifestContract({
	id: "ui.calendar.contract",
	component: "ui.calendar",
	purpose:
		"Provides calendar-grid interaction for selecting governed dates and date ranges.",
	ownership: {
		componentOwns: [
			"Calendar navigation, date-grid semantics, focus movement, and selection presentation.",
		],
		consumerOwns: [
			"Permitted dates, locale, time zone, selected values, validation, and domain scheduling policy.",
		],
	},
	semanticBoundaries: [
		"A visually available date does not imply domain eligibility.",
		"Calendar selection does not determine time-zone conversion or persistence policy.",
	],
	rules: [
		"Supply selection mode and controlled values that match the consuming field semantics.",
		"Declare unavailable dates from feature policy rather than styling them locally.",
		"Keep locale, week-start, and date formatting consistent within one workflow.",
	],
	accessibility: [
		"Preserve grid, row, gridcell, and button semantics supplied by the calendar implementation.",
		"Keep keyboard date navigation and visible focus available.",
		"Expose selected, current, and unavailable dates without relying on color alone.",
	],
	prohibitedUsage: [
		"Do not use Calendar without a labelled field or an explicit scheduling context.",
		"Do not infer date authorization from presentation state.",
		"Do not replace date validation with disabled-day styling alone.",
	],
});
