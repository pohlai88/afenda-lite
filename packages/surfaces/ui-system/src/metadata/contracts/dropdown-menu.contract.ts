import { defineManifestContract } from "./manifest.contract";

export const dropdownMenuContract = defineManifestContract({
	id: "ui.dropdown-menu.contract",
	component: "ui.dropdown-menu",
	purpose:
		"Provides a trigger-bound menu of related actions, choices, or navigation destinations.",
	ownership: {
		componentOwns: [
			"Menu disclosure, positioning, focus management, item semantics, submenus, and checked-option presentation.",
		],
		consumerOwns: [
			"Menu purpose, action ordering, authorization, destinations, command execution, and outcomes.",
		],
	},
	semanticBoundaries: [
		"Menu placement does not establish action authorization or equivalence.",
		"A checked menu item does not determine persistence or domain state.",
	],
	approvedVariants: {
		default: {
			meaning: "Ordinary menu item.",
			allowedWhen: ["The item does not represent a destructive consequence."],
		},
		destructive: {
			meaning: "Destructive menu item.",
			allowedWhen: ["The command has a concrete destructive consequence."],
			prohibitedWhen: [
				"Visual emphasis is being used as authorization or confirmation.",
			],
		},
	},
	rules: [
		"Use DropdownMenu for secondary actions that share one trigger context.",
		"Keep primary workflow actions visible outside the menu.",
		"Use semantic links for destinations and menu actions for commands.",
	],
	accessibility: [
		"Give the trigger an accessible name and expanded state.",
		"Preserve menu keyboard navigation, checked state, submenus, and focus restoration.",
		"Do not rely on shortcuts or icons as the only item labels.",
	],
	prohibitedUsage: [
		"Do not hide the only critical action in a dropdown.",
		"Do not mix unrelated subjects in one menu.",
		"Do not use disabled items as a substitute for permission guidance.",
	],
});
