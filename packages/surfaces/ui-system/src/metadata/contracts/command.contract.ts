import { defineManifestContract } from "./manifest.contract";

export const commandContract = defineManifestContract({
	id: "ui.command.contract",
	component: "ui.command",
	purpose:
		"Provides keyboard-oriented discovery and selection of ERP navigation destinations or operator commands from a searchable, grouped catalogue — never a replacement for visible critical actions, confirmation, authorization, or lifecycle policy.",
	ownership: {
		componentOwns: [
			"Command search input, grouped result presentation, keyboard navigation, selection interaction, empty state, and optional CommandDialog chrome with focus containment and dismissal.",
		],
		consumerOwns: [
			"Command catalogue, filtering beyond client match, authorization, destinations, execution, confirmation for mutations, shortcuts as optional accelerators, and outcome handling.",
		],
	},
	semanticBoundaries: [
		"A listed command does not imply authorization, availability, or successful execution.",
		"Client ranking and filter text do not define business priority or server search policy.",
		"Command does not own routing, mutations, or preference persistence.",
		"Shortcuts and icons reinforce labels — they never replace visible wording.",
		"Catalogue presence is not StatusBadge-style lifecycle authority.",
	],
	rules: [
		"Use stable command values and concise verb-led action-oriented labels.",
		"Separate navigation destinations from mutating commands through wording, grouping, and behavior.",
		"Represent no-results and unavailable command states explicitly with task-specific empty copy.",
		"Expose keyboard shortcuts as supplemental text — never as the only instruction.",
		"Prefer Command for searchable catalogues; prefer visible Buttons for required primary actions on the current surface.",
		"Keep labels understandable when icons, shortcuts, and colour treatment are unavailable.",
		"Keep search, grouping, active-item focus, empty results, and dismissal coherent in keyboard-only and high-contrast use.",
	],
	accessibility: [
		"Provide a labelled command input and preserve listbox-option semantics.",
		"Support keyboard search, arrow navigation, selection, and Escape dismissal.",
		"Announce empty results without repeatedly announcing unchanged options.",
		"Keep disabled items visible when policy requires them known but unselectable.",
		"Ensure active-item meaning and shortcuts remain understandable without relying on colour or icons alone.",
	],
	prohibitedUsage: [
		"Do not execute unauthorized commands because they appear in the list.",
		"Do not use Command as a hidden replacement for required visible actions such as Approve or Submit.",
		"Do not place domain command logic inside the reusable component family.",
		"Do not treat presence in the palette as StatusBadge-style lifecycle authority.",
		"Do not use ambiguous command nouns that obscure whether the action opens, searches, submits, or approves.",
	],
});
