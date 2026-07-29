import { defineManifestContract } from "./manifest.contract";

export const contextMenuContract = defineManifestContract({
	id: "ui.context-menu.contract",
	component: "ui.context-menu",
	purpose:
		"Provides supplemental context-specific actions for a clearly identified ERP target such as an invoice row, supplier card, or attachment region — never the sole path to critical workflow commands, authorization, or lifecycle authority.",
	ownership: {
		componentOwns: [
			"Context-menu opening, positioning, focus management, item semantics (default · destructive · checkbox · radio · submenu), checked-option presentation, and destructive item styling.",
		],
		consumerOwns: [
			"Target identity and meaning, action visibility hierarchy, authorization, command execution, confirmation for destructive work, shortcuts as optional accelerators, and outcomes.",
		],
	},
	semanticBoundaries: [
		"Context placement does not make an action authorized, safe, or confirmed.",
		"Menu presence does not replace discoverable primary actions on the record surface.",
		"ContextMenu does not own routing, mutations, or preference persistence.",
		"Disabled menu items do not replace server authorization or StatusBadge lifecycle.",
		"Shortcuts are optional accelerators — never the only instruction for an item.",
	],
	approvedVariants: {
		default: {
			meaning:
				"Ordinary contextual menu item for a non-destructive supplemental action.",
			allowedWhen: ["The item does not represent a destructive consequence."],
		},
		destructive: {
			meaning:
				"Destructive contextual menu item with concrete irreversible or hard-to-undo consequence.",
			allowedWhen: ["The command has a concrete destructive consequence."],
			prohibitedWhen: [
				"Visual emphasis is being used as authorization or confirmation.",
			],
		},
	},
	rules: [
		"Use ContextMenu only for supplemental actions on an unmistakable target.",
		"Keep essential and frequently used actions visible elsewhere as Buttons or toolbar controls.",
		"Group, label, and order items by consequence and task frequency.",
		"Use the destructive variant only when the command has a concrete destructive consequence.",
		"Provide keyboard-equivalent access for every action that appears in the menu.",
		"Preserve target meaning, item grouping, focus restoration, and consequences without relying on colour or pointer interaction alone.",
	],
	accessibility: [
		"Provide equivalent keyboard access to every context-menu action.",
		"Preserve menu, menuitem, checked, disabled, and submenu semantics.",
		"Restore focus to the invoking target after Escape or other dismissal.",
		"Keep shortcuts supplemental — never the only instruction for an item.",
		"Remain legible in high-contrast presentation without relying on colour alone.",
	],
	prohibitedUsage: [
		"Do not make ContextMenu the only path to critical actions such as Approve or Submit.",
		"Do not place unrelated page commands in a target menu.",
		"Do not use disabled menu items to conceal missing authorization handling.",
		"Do not treat menu presence or item styling as StatusBadge-style lifecycle authority.",
		"Do not attach actions to ambiguous unlabeled whitespace that obscures the affected record.",
	],
});
