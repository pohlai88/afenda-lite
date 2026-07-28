import { defineManifestContract } from "./manifest.contract";

export const datePickerContract = defineManifestContract({
	id: "ui.date-picker.contract",
	component: "ui.date-picker",
	purpose:
		"Composes labelled single-date and date-range selection with calendar disclosure.",
	ownership: {
		componentOwns: [
			"Date-picker disclosure, calendar composition, formatted selection presentation, and controlled change callbacks.",
		],
		consumerOwns: [
			"Date availability, locale, time zone, range policy, validation, and domain persistence.",
		],
	},
	semanticBoundaries: [
		"Displayed local dates do not determine storage time zone or instant semantics.",
		"A completed visual range does not prove that the range is valid for the domain workflow.",
	],
	rules: [
		"Use DatePicker for one calendar date and DateRangePicker for an inclusive bounded range.",
		"State date constraints before selection and preserve the user's value after validation failure.",
		"Format displayed dates consistently with the active locale and workflow context.",
	],
	accessibility: [
		"Provide an associated label and expose the current formatted value.",
		"Preserve keyboard operation across trigger, calendar navigation, selection, and dismissal.",
		"Associate date validation errors with the picker control.",
	],
	prohibitedUsage: [
		"Do not use a date picker for date-time or instant selection.",
		"Do not silently repair reversed, incomplete, or disallowed ranges.",
		"Do not infer domain eligibility from enabled calendar cells alone.",
	],
});
