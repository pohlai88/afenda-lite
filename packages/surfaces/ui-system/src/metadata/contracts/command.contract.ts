import { defineManifestContract } from "./manifest.contract";

export const commandContract = defineManifestContract({
	id: "ui.command.contract",
	component: "ui.command",
	purpose:
		"Provides keyboard-oriented discovery and selection of commands or navigation destinations.",
	ownership: {
		componentOwns: [
			"Command search, grouped result presentation, keyboard navigation, selection interaction, and empty state.",
		],
		consumerOwns: [
			"Command catalogue, filtering, authorization, destinations, execution, shortcuts, and outcome handling.",
		],
	},
	semanticBoundaries: [
		"A listed command does not imply authorization or availability.",
		"Client ranking does not define business priority or server search policy.",
	],
	rules: [
		"Use stable command values and concise action-oriented labels.",
		"Separate navigation destinations from mutating commands through wording and behavior.",
		"Represent no results and unavailable command states explicitly.",
	],
	accessibility: [
		"Provide a labelled command input and preserve listbox-option semantics.",
		"Support keyboard search, navigation, selection, and dismissal.",
		"Expose shortcuts as supplemental text rather than the only instruction.",
	],
	prohibitedUsage: [
		"Do not execute unauthorized commands because they appear in the list.",
		"Do not use Command as a hidden replacement for required visible actions.",
		"Do not place domain command logic inside the reusable component family.",
	],
});
