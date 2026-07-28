import { defineManifestContract } from "./manifest.contract";

export const contextMenuContract = defineManifestContract({
	id: "ui.context-menu.contract",
	component: "ui.context-menu",
	purpose:
		"Provides supplemental context-specific actions for a clearly identified target.",
	ownership: {
		componentOwns: [
			"Context-menu opening, positioning, focus management, item semantics, submenus, and checked-option presentation.",
		],
		consumerOwns: [
			"Target identity, action visibility, authorization, command execution, shortcuts, and outcomes.",
		],
	},
	semanticBoundaries: [
		"Context placement does not make an action authorized or safe.",
		"Menu presence does not replace discoverable primary actions.",
	],
	approvedVariants: {
		default: {
			meaning: "Ordinary contextual menu item.",
			allowedWhen: ["The item does not represent a destructive consequence."],
		},
		destructive: {
			meaning: "Destructive contextual menu item.",
			allowedWhen: ["The command has a concrete destructive consequence."],
			prohibitedWhen: [
				"Visual emphasis is being used as authorization or confirmation.",
			],
		},
	},
	rules: [
		"Use ContextMenu only for supplemental actions on an obvious target.",
		"Keep essential and frequently used actions visible elsewhere.",
		"Group, label, and order items by consequence and task frequency.",
	],
	accessibility: [
		"Provide equivalent keyboard access to every context-menu action.",
		"Preserve menu, menuitem, checked, disabled, and submenu semantics.",
		"Restore focus to the invoking target after dismissal.",
	],
	prohibitedUsage: [
		"Do not make ContextMenu the only path to critical actions.",
		"Do not place unrelated page commands in a target menu.",
		"Do not use disabled menu items to conceal missing authorization handling.",
	],
});
