import { defineManifestContract } from "./manifest.contract";

export const comboboxContract = defineManifestContract({
	id: "ui.combobox.contract",
	component: "ui.combobox",
	purpose:
		"Provides searchable single or multi selection from a bounded ERP option set so operators can find and choose stable values without freeform text entry — never authorization, validation, or lifecycle authority.",
	ownership: {
		componentOwns: [
			"Searchable listbox interaction, option presentation, keyboard navigation, expanded state, empty-result presentation from consumer copy, and controlled selection callbacks.",
		],
		consumerOwns: [
			"Option loading, filtering policy beyond client label match, stable values distinct from labels, permissions, validation, empty and error messaging, persistence, and whether Select is preferred for short non-search lists.",
		],
	},
	semanticBoundaries: [
		"A visible option does not imply that the operator is authorized to select it.",
		"Client-side label filtering does not define authoritative search, eligibility, or tenancy rules.",
		"Combobox does not own option catalogs, remote search, or form validation messages.",
		"Omission from a client option list is not server-side authorization.",
		"A selected option is not an approval — StatusBadge owns lifecycle meaning.",
		"Search narrows the supplied catalogue; it does not create new values.",
	],
	rules: [
		"Use stable option values that are distinct from display labels.",
		"Represent loading, no-results, unavailable, disabled, and invalid states explicitly through consumer-owned UI.",
		"Preserve the current valid selection while options refresh.",
		"Prefer Combobox when operators must search a bounded set; prefer Select when the list is short and search is unnecessary.",
		"Use multiple mode only when the field truly accepts several concurrent selections.",
		"Pair the control with a visible Label or an explicit aria-label that names the ERP field.",
		"Provide task-specific empty copy that names the searched entity and outcome.",
		"Keep keyboard search, selection state, empty results, disabled options, and focus understandable across narrow layouts and high-contrast presentation.",
	],
	accessibility: [
		"Provide a labelled control with combobox, listbox, option, expanded, and selected semantics.",
		"Support keyboard opening, navigation, selection, and Escape dismissal.",
		"Announce empty-result state without repeatedly announcing unchanged options.",
		"Keep disabled options in the catalogue when policy requires them visible but unselectable.",
		"Disabled controls block interaction without implying authorization success or failure.",
	],
	prohibitedUsage: [
		"Do not use Combobox for freeform text that is not constrained to options.",
		"Do not use option labels as persistent identifiers.",
		"Do not treat omission from a client option list as server-side authorization.",
		"Do not encode domain lifecycle or approval state in selected option presentation alone — pair with StatusBadge when lifecycle matters.",
		"Do not use vague empty copy such as “No data” that obscures what was searched.",
	],
});
