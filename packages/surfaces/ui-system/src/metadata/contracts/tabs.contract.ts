import { defineManifestContract } from "./manifest.contract";

export const tabsContract = defineManifestContract({
	id: "ui.tabs.contract",
	component: "ui.tabs",
	purpose:
		"Provides selection among peer content panels within one local context.",
	ownership: {
		componentOwns: [
			"Tablist interaction, selected-tab semantics, panel relationships, orientation, and keyboard focus movement.",
		],
		consumerOwns: [
			"Tab labels, panel content, controlled value, URL synchronization, permissions, and loading policy.",
		],
	},
	semanticBoundaries: [
		"Selected tab presentation does not determine route authorization or persisted workflow state.",
		"A hidden tab panel does not become absent from the domain model.",
	],
	approvedVariants: {
		default: {
			meaning: "Contained tab list.",
			allowedWhen: [
				"Peer panels benefit from a compact grouped control background.",
			],
		},
		line: {
			meaning: "Underline-style tab list.",
			allowedWhen: [
				"Tabs belong directly to the surrounding surface and require lighter chrome.",
			],
		},
	},
	rules: [
		"Use Tabs for peer views, not sequential workflow steps.",
		"Keep tab labels short and stable.",
		"Synchronize selection with URL state when tabs represent navigable application views.",
	],
	accessibility: [
		"Preserve tablist, tab, selected, controls, and tabpanel semantics.",
		"Support arrow-key focus movement and visible focus.",
		"Do not rely on color alone to distinguish the selected tab.",
	],
	prohibitedUsage: [
		"Do not use Tabs as a stepper or accordion substitute.",
		"Do not hide unauthorized tabs as the only authorization control.",
		"Do not place unrelated subjects in one tab set.",
	],
});
