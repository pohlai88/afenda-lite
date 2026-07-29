import { defineManifestContract } from "./manifest.contract";

export const tabsContract = defineManifestContract({
	id: "ui.tabs.contract",
	component: "ui.tabs",
	purpose:
		"Provides selection among peer ERP content panels within one local context — invoice overview versus activity, supplier identity versus remittance — without owning routing authorization or sequential workflow.",
	ownership: {
		componentOwns: [
			"Tablist interaction, selected-tab semantics, panel relationships, orientation, approved list variants, and keyboard focus movement.",
		],
		consumerOwns: [
			"Tab labels, panel content, controlled value, URL synchronization, permissions, and loading policy.",
		],
	},
	semanticBoundaries: [
		"Selected tab presentation does not determine route authorization or persisted workflow state.",
		"A hidden tab panel does not become absent from the domain model.",
		"Tabs does not replace Stepper for sequential workflow or Accordion for independently expandable sections.",
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
		"This contract governs Tabs, TabsList, TabsTrigger, and TabsContent as one family.",
		"Use Tabs for peer views, not sequential workflow steps.",
		"Keep tab labels short and stable.",
		"Synchronize selection with URL state when tabs represent navigable application views.",
		"Prefer Card composition for record-level peer panels.",
	],
	accessibility: [
		"Preserve tablist, tab, selected, controls, and tabpanel semantics.",
		"Support arrow-key focus movement and visible focus.",
		"Do not rely on color alone to distinguish the selected tab.",
		"Do not use disabled tabs as the only authorization control.",
	],
	prohibitedUsage: [
		"Do not use Tabs as a stepper or accordion substitute.",
		"Do not hide unauthorized tabs as the only authorization control.",
		"Do not place unrelated subjects in one tab set.",
		"Do not encode multi-step posting or approval flows as tab values.",
	],
});
