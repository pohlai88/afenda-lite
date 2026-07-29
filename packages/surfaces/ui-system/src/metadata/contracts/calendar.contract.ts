import { defineManifestContract } from "./manifest.contract";

export const calendarContract = defineManifestContract({
	id: "ui.calendar.contract",
	component: "ui.calendar",
	purpose:
		"Provides calendar-grid interaction for selecting governed ERP dates and date ranges — posting cut-offs, collection windows, and other embedded scheduling panels — without owning form-field chrome, time zone, locale, or eligibility policy.",
	ownership: {
		componentOwns: [
			"Calendar navigation, date-grid presentation (react-day-picker DayPicker), focus movement, selection styling for single and range modes, and disabled-day presentation from consumer matchers.",
		],
		consumerOwns: [
			"Operational meaning, permitted dates, disabled-day policy, locale, week-start, time zone, controlled selected values, validation, persistence, authorization, and whether DatePicker field chrome is required instead.",
		],
	},
	semanticBoundaries: [
		"A visually available date does not imply domain eligibility or ledger openness.",
		"Calendar selection does not determine time-zone conversion or persistence policy.",
		"Disabled-day styling guides interaction — it does not replace Action or schema validation.",
		"Calendar is the grid primitive — DatePicker owns labelled trigger and popover field composition.",
		"Calendar exposes selection modes (single · range), not a visual size scale.",
	],
	approvedVariants: {
		single: {
			meaning: "One governed date selection.",
			allowedWhen: [
				"The consuming field or panel requires exactly one posting, due, or cut-off date.",
			],
			prohibitedWhen: [
				"The workflow needs an inclusive from/to window — use range.",
			],
		},
		range: {
			meaning: "Inclusive date-range selection.",
			allowedWhen: [
				"The consuming workflow needs a continuous from/to window such as a collection or reporting period.",
			],
			prohibitedWhen: ["Only one date is meaningful — use single."],
		},
	},
	rules: [
		"Supply selection mode and controlled values that match the consuming workflow's domain meaning.",
		"Declare unavailable dates from feature policy rather than styling them locally.",
		"Keep locale, week-start, and date formatting consistent within one workflow.",
		"Provide a labelled field, aria-labelledby, or explicit scheduling heading — never an unlabeled decorative grid.",
		"Prefer DatePicker when operators need text-field entry plus popover chrome; keep Calendar for embedded panels.",
		"Fix defaultMonth/month in Storybook evidence so visual review stays deterministic.",
		"Surround Calendar with persistent task context (role, taxonomy, lifecycle) — Calendar owns date interaction only.",
		"Do not invent a Calendar size scale to solve page-composition density.",
	],
	accessibility: [
		"Preserve grid, row, gridcell, and button semantics supplied by the calendar implementation.",
		"Keep keyboard date navigation and visible focus available — Tab into controls, arrows through the day grid, Enter or Space to select.",
		"Expose selected, current, focused, outside-month, and unavailable dates without relying on color alone.",
		"Associate the grid with a visible label or aria-labelledby describing what the date governs.",
		"Do not replace day buttons with decorative spans, remove accessible names, suppress focus rings, or intercept arrow-key navigation.",
	],
	prohibitedUsage: [
		"Do not use Calendar without a labelled field or an explicit scheduling context.",
		"Do not infer date authorization from presentation state.",
		"Do not replace date validation with disabled-day styling alone.",
		"Do not encode approval or posting lifecycle in the calendar chrome — use StatusBadge on the record.",
		"Do not treat Calendar as a drop-in replacement for DatePicker form fields.",
		"Do not leave an unexplained date grid that forces operators to infer the business event.",
	],
});
