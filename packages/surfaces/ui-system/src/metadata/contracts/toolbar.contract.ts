import { defineManifestContract } from "./manifest.contract";

export const toolbarContract = defineManifestContract({
	id: "ui.toolbar.contract",
	component: "ui.toolbar",
	purpose:
		"Composes related view and action controls for one local workspace context.",
	ownership: {
		componentOwns: [
			"Toolbar layout, related-control grouping, separators, wrapping, and consistent local density.",
		],
		consumerOwns: [
			"Control selection, action priority, labels, authorization, responsive reduction, and command behavior.",
		],
	},
	semanticBoundaries: [
		"Toolbar position does not make controls authorized or primary.",
		"Visual grouping does not make unrelated controls one workflow.",
	],
	rules: [
		"Include only controls that affect the same view or selected subject.",
		"Order controls by task frequency and consequence.",
		"Move filters into FilterBar and page-wide identity actions into PageHeader when those patterns apply.",
	],
	accessibility: [
		"Provide an accessible toolbar label when purpose is not apparent.",
		"Preserve each child control's semantics, name, and visible focus.",
		"Keep reading and focus order aligned with visual order.",
	],
	prohibitedUsage: [
		"Do not use Toolbar as a generic horizontal wrapper.",
		"Do not place unrelated page and row actions together.",
		"Do not hide required controls without an accessible responsive alternative.",
	],
});
