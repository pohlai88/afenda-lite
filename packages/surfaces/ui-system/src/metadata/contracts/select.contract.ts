import { defineManifestContract } from "./manifest.contract";

export const selectContract = defineManifestContract({
	id: "ui.select.contract",
	component: "ui.select",
	purpose:
		"Provides custom single selection from a bounded ERP option collection — modules, ledgers, posting periods, and similar closed lists.",
	ownership: {
		componentOwns: [
			"Select disclosure, listbox interaction, option presentation, scrolling, and controlled value callbacks.",
		],
		consumerOwns: [
			"Option loading, stable values, selected value, validation, permissions, and persistence.",
		],
	},
	semanticBoundaries: [
		"A visible option does not imply domain eligibility or authorization.",
		"Select presentation does not define empty-value or persistence policy.",
		"Select does not replace Combobox for searchable entry or RadioGroup for small always-visible sets.",
	],
	approvedSizes: {
		default: {
			meaning: "Standard select trigger.",
			allowedWhen: ["The control appears in an ordinary form field."],
		},
		sm: {
			meaning: "Compact select trigger.",
			allowedWhen: [
				"A dense form or toolbar preserves label and target clarity.",
			],
		},
	},
	rules: [
		"Use Select for bounded options that do not require search.",
		"Keep option values stable and separate from display labels.",
		"Represent loading, empty, unavailable, and validation states outside the option list when necessary.",
		"Group related options with SelectGroup and SelectLabel when the list has clear domains.",
		"Prefer RadioGroup when every option must stay visible without disclosure.",
	],
	accessibility: [
		"Associate the trigger with a visible label, description, and error.",
		"Preserve expanded, selected, disabled, and listbox-option semantics.",
		"Support keyboard opening, navigation, selection, and dismissal with visible focus.",
		"Name the trigger for the domain being chosen — Module, Period, Legal entity.",
	],
	prohibitedUsage: [
		"Do not use Select for freeform or searchable entry — use Combobox or SearchField.",
		"Do not use display labels as persistent identifiers.",
		"Do not treat omitted client options as server authorization.",
		"Do not use Select for multi-select filters without an approved multi-value control.",
		"Do not place long policy text inside option labels.",
	],
});
