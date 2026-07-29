import { defineManifestContract } from "./manifest.contract";

export const dateTimePickerContract = defineManifestContract({
	id: "ui.date-time-picker.contract",
	component: "ui.date-time-picker",
	purpose:
		"Composes labelled local date-and-time entry for ERP posting, approval, and period deadlines so operators enter one complete instant without treating the display as the persisted time zone.",
	ownership: {
		componentOwns: [
			"Date-time field composition, label and description association, invalid presentation, and native datetime-local entry chrome.",
		],
		consumerOwns: [
			"Time-zone meaning, allowed instants, precision, validation, conversion, persistence, and whether DatePicker is sufficient without time-of-day.",
		],
	},
	semanticBoundaries: [
		"Displayed local date and time do not determine the persisted time zone or canonical instant.",
		"A complete visual value does not prove that the instant is valid for the domain workflow.",
		"DateTimePicker does not replace DatePicker when time-of-day is not part of the domain value, or Calendar when only a date browse surface is required.",
	],
	rules: [
		"State the applicable organization time zone in the description whenever operators could interpret the value differently.",
		"Preserve the entered date and time after validation failure.",
		"Use DatePicker when time-of-day is not part of the domain value.",
		"Pair every DateTimePicker with a clear label naming the business instant — posting, approval deadline, or lock boundary.",
		"Keep disabled values readable when the period or deadline is locked and cannot be changed.",
	],
	accessibility: [
		"Provide a field label and associate description and error text with the datetime-local control.",
		"Preserve keyboard operation of the native date-time control.",
		"Associate validation feedback with the complete date-time field via aria-describedby and aria-invalid.",
		"Do not rely on colour alone to communicate invalid deadlines.",
	],
	prohibitedUsage: [
		"Do not silently convert between local and zoned time meanings inside the control.",
		"Do not use DateTimePicker for duration entry.",
		"Do not hide daylight-saving or unavailable-time errors behind automatic correction.",
		"Do not omit the organization time-zone context when posting or approval depends on it.",
		"Do not use DateTimePicker as an unlabeled decorative timestamp.",
	],
});
