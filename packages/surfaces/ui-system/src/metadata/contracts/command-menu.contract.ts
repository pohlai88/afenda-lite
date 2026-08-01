import { defineManifestContract } from "./manifest.contract";

export const commandMenuContract = defineManifestContract({
	id: "ui.command-menu.contract",
	component: "ui.command-menu",
	purpose:
		"Provides a normalized, grouped, keyboard-first workspace command palette over the governed CommandDialog while leaving authorization, routing, mutations, and outcomes to the consumer.",
	ownership: {
		componentOwns: [
			"Global shortcut handling, input-safe activation, catalogue normalization, duplicate rejection, search composition, focus containment, dismissal, and trigger focus restoration.",
		],
		consumerOwns: [
			"Authorized command catalogue, stable identifiers, destinations, mutation confirmation, execution, and outcome reporting.",
		],
	},
	semanticBoundaries: [
		"Catalogue presence does not imply authorization or availability.",
		"A shortcut accelerates discovery but never replaces visible critical actions.",
		"Client search matching does not define business priority.",
	],
	rules: [
		"Normalize identifiers and labels once before presenting commands.",
		"Ignore global shortcuts while an editable control owns input.",
		"Use the governed CommandDialog composition and grouped CommandItem structure.",
	],
	accessibility: [
		"Expose a named dialog, labelled combobox, listbox, groups, and options.",
		"Support keyboard opening, search, arrow navigation, selection, Escape dismissal, and focus restoration.",
		"Keep shortcut text supplemental and disabled commands unselectable.",
	],
	prohibitedUsage: [
		"Do not render a raw dialog, input, or option list in parallel with Command.",
		"Do not execute disabled, invalid, duplicate, or unauthorized commands.",
		"Do not hide required primary workflow actions only in the palette.",
	],
});
