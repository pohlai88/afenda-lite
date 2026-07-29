import { defineManifestContract } from "./manifest.contract";

export const datePickerContract = defineManifestContract({
	id: "ui.date-picker.contract",
	component: "ui.date-picker",
	purpose:
		"Composes labelled ERP single-date and date-range selection with calendar disclosure — posting cut-offs, due dates, and collection windows — without owning time zone, instant semantics, or domain eligibility.",
	ownership: {
		componentOwns: [
			"DatePicker and DateRangePicker disclosure, Calendar composition, formatted selection presentation, trigger chrome, and controlled change callbacks.",
		],
		consumerOwns: [
			"Date availability, locale, week-start, time zone, range policy, validation, FormField labelling, persistence, and whether DateTimePicker is required instead.",
		],
	},
	semanticBoundaries: [
		"Displayed local dates do not determine storage time zone or instant semantics.",
		"A completed visual range does not prove that the range is valid for the domain workflow.",
		"Enabled calendar cells do not authorize posting or ledger openness.",
		"DatePicker is day selection — DateTimePicker owns date-time and instant capture.",
		"DatePicker owns field chrome; Calendar remains the embedded grid primitive without trigger/popover.",
	],
	approvedVariants: {
		single: {
			meaning: "One calendar date via DatePicker.",
			allowedWhen: [
				"The field requires exactly one posting, due, invoice, or cut-off date.",
			],
			prohibitedWhen: [
				"The workflow needs an inclusive from/to window — use DateRangePicker.",
				"The workflow needs time-of-day or an instant — use DateTimePicker.",
			],
		},
		range: {
			meaning: "Inclusive date range via DateRangePicker.",
			allowedWhen: [
				"The workflow needs a continuous from/to window such as collection or reporting.",
			],
			prohibitedWhen: ["Only one date is meaningful — use DatePicker."],
		},
	},
	rules: [
		"This contract governs DatePicker and DateRangePicker as one date-field family.",
		"Use DatePicker for one calendar date and DateRangePicker for an inclusive bounded range.",
		"State date constraints before selection and preserve the user's value after validation failure.",
		"Format displayed dates consistently with the active locale and workflow context.",
		"Pair every picker with FormField (or equivalent) so the date's business meaning is labelled.",
		"Prefer Calendar when the layout needs an always-visible grid without field chrome.",
		"Leave incomplete ranges incomplete until both ends are selected — do not invent a missing to date in the control.",
		"Show domain-specific placeholders when the empty state needs context beyond Pick a date.",
	],
	accessibility: [
		"Provide an associated label and expose the current formatted value.",
		"Preserve keyboard operation across trigger, calendar navigation, selection, and dismissal.",
		"Associate date validation errors with the picker control via aria-invalid and aria-describedby.",
		"Keep the calendar icon decorative (aria-hidden) when the button text already names the value.",
	],
	prohibitedUsage: [
		"Do not use a date picker for date-time or instant selection.",
		"Do not silently repair reversed, incomplete, or disallowed ranges.",
		"Do not infer domain eligibility from enabled calendar cells alone.",
		"Do not ship an unlabeled DatePicker trigger in product forms.",
		"Do not encode approval or posting lifecycle in the picker chrome — use StatusBadge on the record.",
	],
});
