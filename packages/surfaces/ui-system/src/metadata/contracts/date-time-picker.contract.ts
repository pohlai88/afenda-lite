import { defineManifestContract } from "./manifest.contract";

export const dateTimePickerContract = defineManifestContract({
	id: "ui.date-time-picker.contract",
	component: "ui.date-time-picker",
	purpose:
		"Composes governed date and time entry for a local or explicitly zoned ERP value.",
	ownership: {
		componentOwns: [
			"Date-time entry composition, calendar disclosure, time controls, formatted presentation, and controlled callbacks.",
		],
		consumerOwns: [
			"Time-zone meaning, allowed instants, precision, validation, conversion, and persistence.",
		],
	},
	semanticBoundaries: [
		"Displayed local date and time do not determine the persisted time zone or instant.",
		"A complete visual value does not prove that the instant is valid for the domain workflow.",
	],
	rules: [
		"State the applicable time zone whenever users could interpret the value differently.",
		"Preserve the entered date and time after validation failure.",
		"Use DatePicker when time-of-day is not part of the domain value.",
	],
	accessibility: [
		"Provide a shared field label and clear names for date and time controls.",
		"Preserve keyboard operation across all controls and disclosures.",
		"Associate validation feedback with the complete date-time field.",
	],
	prohibitedUsage: [
		"Do not silently convert between local and zoned time meanings.",
		"Do not use DateTimePicker for duration entry.",
		"Do not hide daylight-saving or unavailable-time errors behind automatic correction.",
	],
});
