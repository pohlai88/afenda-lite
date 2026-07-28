import { defineManifestContract } from "./manifest.contract";

export const comboboxContract = defineManifestContract({
	id: "ui.combobox.contract",
	component: "ui.combobox",
	purpose: "Provides searchable selection from a bounded ERP option set.",
	ownership: {
		componentOwns: [
			"Searchable listbox interaction, option presentation, keyboard navigation, and controlled selection callbacks.",
		],
		consumerOwns: [
			"Option loading, filtering policy, stable values, permissions, validation, and persistence.",
		],
	},
	semanticBoundaries: [
		"A visible option does not imply that the user is authorized to select it.",
		"Client filtering does not define authoritative search or eligibility rules.",
	],
	rules: [
		"Use stable option values that are distinct from display labels.",
		"Represent loading, no-results, unavailable, and error states explicitly.",
		"Preserve the current valid selection while options refresh.",
	],
	accessibility: [
		"Provide a labelled control with combobox, listbox, option, expanded, and selected semantics.",
		"Support keyboard opening, navigation, selection, and dismissal.",
		"Announce result-state changes without repeatedly announcing unchanged options.",
	],
	prohibitedUsage: [
		"Do not use Combobox for freeform text that is not constrained to options.",
		"Do not use option labels as persistent identifiers.",
		"Do not treat omission from a client option list as server-side authorization.",
	],
});
