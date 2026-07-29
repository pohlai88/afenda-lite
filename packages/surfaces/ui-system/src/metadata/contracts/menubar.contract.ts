import { defineManifestContract } from "./manifest.contract";

export const menubarContract = defineManifestContract({
	id: "ui.menubar.contract",
	component: "ui.menubar",
	purpose:
		"Provides desktop keyboard command groups for ERP record workspaces — journal, invoice, and posting menus with items, checked choices, radio choices, shortcuts, and nested exports.",
	ownership: {
		componentOwns: [
			"Menubar disclosure, roving focus, menu positioning, item semantics, checked choices, submenus, and keyboard navigation.",
		],
		consumerOwns: [
			"Command grouping, labels, authorization, destinations, execution, shortcuts, responsive alternatives, and outcomes.",
		],
	},
	semanticBoundaries: [
		"A visible command does not imply authorization or availability.",
		"Menubar is a desktop command surface, not primary application navigation or mobile navigation.",
		"Menubar does not own StatusBadge lifecycle, PageHeader identity, or Sidebar routing.",
	],
	approvedVariants: {
		default: {
			meaning: "Ordinary command item.",
			allowedWhen: [
				"The command does not represent a destructive consequence.",
			],
		},
		destructive: {
			meaning: "Destructive command item.",
			allowedWhen: ["The command has a concrete destructive consequence."],
			prohibitedWhen: [
				"Visual treatment is being used as authorization or confirmation.",
			],
		},
	},
	rules: [
		"Group commands by stable desktop task context (Record, View, Export) and keep primary workflow actions visible on the page when they are critical.",
		"Use semantic links for destinations and menu items for commands.",
		"Disable unauthorized or unsafe commands (for example Delete posted record) rather than hiding them without explanation when discovery matters.",
		"Provide a separate responsive navigation or command pattern when the menubar cannot fit.",
		"Keep shortcuts supplemental — never the only accessible command name.",
	],
	accessibility: [
		"Give every trigger and item an accessible text label.",
		"Preserve arrow-key navigation, checked state, disabled state, submenus, Escape dismissal, and focus restoration.",
		"Expose shortcuts as supplemental text rather than the only command label.",
		"Announce disabled destructive commands so operators know the action exists but is unavailable.",
	],
	prohibitedUsage: [
		"Do not use Menubar as the product sidebar, mobile navigation, or an unlabeled icon strip.",
		"Do not hide the only critical Approve or Submit action inside a menu.",
		"Do not place domain command or permission logic inside the reusable component family.",
		"Do not treat menu open state as authorization success.",
	],
});
