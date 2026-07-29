import { defineManifestContract } from "./manifest.contract";

export const inputContract = defineManifestContract({
	id: "ui.input.contract",
	component: "ui.input",
	purpose:
		"Provides a single-line browser-native input for textual and scalar ERP data entry — supplier references, emails, and search terms — without owning field labelling, parsing, validation, or persistence.",
	ownership: {
		componentOwns: [
			"Native single-line input rendering, browser input semantics, primitive value entry, focus and invalid chrome, and accessibility-attribute forwarding.",
		],
		consumerOwns: [
			"Labelling via FormField or Field, parsing, normalization, validation, authorization, persistence, and domain meaning.",
		],
	},
	semanticBoundaries: [
		"The selected HTML input type does not define domain parsing or validation policy.",
		"Invalid presentation does not determine whether the current value is authoritative or persisted.",
		"Read-only or disabled presentation does not determine authorization or submission policy.",
		"Input does not replace Textarea for multiline content, Select/Combobox for bounded choice, or NumericInput/DatePicker for governed scalar domains.",
	],
	rules: [
		"Use Input within a labelled field composition such as FormField or Field.",
		"Input owns native single-line control rendering and attribute forwarding; it does not own labels, help text, errors, or field layout.",
		"Choose the appropriate HTML input type, inputMode, and autocomplete value for the data being collected.",
		"Feature code owns parsing, normalization, validation, authorization, and domain policy.",
		"Use specialized controls for money, quantity, percentage, date, time, selection, and multiline content when those semantics are required.",
		"Use read-only when a value should remain visible and selectable but cannot be edited.",
		"Use disabled only when the control must not participate in interaction or form submission.",
		"Preserve the user's entered value when validation fails.",
		"Placeholder text may provide an example or format hint but must not replace the field label.",
		"Prefer Card + FormField composition for supplier identity, ledger search, and similar ERP entry workbenches.",
	],
	accessibility: [
		"Every input must have an associated visible label or equivalent accessible name.",
		"Associate supporting descriptions and validation errors with the input.",
		"Expose required, invalid, disabled, and read-only states through native or ARIA semantics.",
		"Use aria-invalid only when the current value is known to be invalid.",
		"Do not communicate validation state through color, border treatment, or placeholder text alone.",
		"Preserve visible keyboard focus treatment.",
		"Ensure autocomplete behavior does not expose or incorrectly populate sensitive or unrelated data.",
	],
	prohibitedUsage: [
		"Do not use Input for multiline content.",
		"Do not use Input where a bounded choice control is more appropriate.",
		"Do not use Input as a formatted display value or read-only data-layout primitive when plain text or a key-value component is more appropriate.",
		"Do not use a plain text input for money, quantity, percentage, date, or time when a governed specialized control exists.",
		"Do not hide the field label without providing an equivalent accessible name.",
		"Do not use placeholder text as the only instruction, label, or validation message.",
		"Do not implement domain validation, permission checks, or submission behavior inside Input.",
		"Do not use disabled merely to prevent editing when the value should remain readable and submitted.",
		"Do not silently transform the user's value while they are typing unless the behavior is predictable and preserves cursor position.",
	],
});
