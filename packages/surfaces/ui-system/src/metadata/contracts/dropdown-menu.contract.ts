import { defineManifestContract } from "./manifest.contract";

export const dropdownMenuContract = defineManifestContract({
	id: "ui.dropdown-menu.contract",
	component: "ui.dropdown-menu",
	purpose:
		"Provides a trigger-bound menu of related secondary actions, density choices, or navigation destinations for one ERP subject such as an invoice workbench or supplier record — never the sole path to critical workflow actions, authorization, confirmation, or lifecycle authority.",
	ownership: {
		componentOwns: [
			"Menu disclosure, positioning, focus management, item semantics (default · destructive · checkbox · radio · submenu), checked-option presentation, and destructive item styling.",
		],
		consumerOwns: [
			"Menu purpose, trigger naming, action ordering, authorization, destinations, command execution, confirmation for destructive work, shortcuts as optional accelerators, and outcomes.",
		],
	},
	semanticBoundaries: [
		"Menu placement does not establish action authorization, safety, or confirmation.",
		"A checked menu item does not determine persistence, domain lifecycle, or StatusBadge authority.",
		"DropdownMenu does not own routing, mutations, or preference storage.",
		"Disabled menu items do not replace server authorization.",
		"Shortcuts are optional accelerators — never the only instruction for an item.",
	],
	approvedVariants: {
		default: {
			meaning:
				"Ordinary menu item for a non-destructive secondary action or destination.",
			allowedWhen: ["The item does not represent a destructive consequence."],
		},
		destructive: {
			meaning:
				"Destructive menu item with a concrete irreversible or hard-to-undo consequence.",
			allowedWhen: ["The command has a concrete destructive consequence."],
			prohibitedWhen: [
				"Visual emphasis is being used as authorization or confirmation.",
			],
		},
	},
	rules: [
		"Use DropdownMenu for secondary actions that share one explicit trigger context.",
		"Keep primary workflow actions visible outside the menu as Buttons or toolbar controls.",
		"Use semantic links for destinations and menu actions for commands.",
		"Group, label, and order items by consequence and task frequency.",
		"Use the destructive variant only when the command has a concrete destructive consequence.",
		"Name the trigger by scope when possible; a generic More trigger needs unmistakable record context and an accessible name.",
		"Keep trigger meaning, item grouping, focus state, submenus, and consequences understandable without colour, icons, or pointer interaction alone.",
	],
	accessibility: [
		"Give the trigger an accessible name and expanded state.",
		"Preserve menu keyboard navigation, checked state, submenus, Escape dismissal, and focus restoration to the trigger.",
		"Do not rely on shortcuts or icons as the only item labels.",
		"Provide keyboard-equivalent access for every action that appears in the menu.",
		"Remain legible in high-contrast presentation without relying on colour alone.",
	],
	prohibitedUsage: [
		"Do not hide the only critical action such as Approve or Submit in a dropdown.",
		"Do not mix unrelated subjects in one menu.",
		"Do not use disabled items as a substitute for permission guidance.",
		"Do not treat menu presence or item styling as StatusBadge-style lifecycle authority.",
		"Do not use an unexplained More trigger when the affected record or scope is ambiguous.",
	],
});
