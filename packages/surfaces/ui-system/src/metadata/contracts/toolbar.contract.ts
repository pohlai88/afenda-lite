import { defineManifestContract } from "./manifest.contract";

export const toolbarContract = defineManifestContract({
	id: "ui.toolbar.contract",
	component: "ui.toolbar",
	purpose:
		"Composes related view and action controls for one local ERP workspace context — invoice detail tools, queue actions — without owning PageHeader identity or FilterBar criteria.",
	ownership: {
		componentOwns: [
			"Toolbar layout, ToolbarGroup clustering, ToolbarSeparator chrome, wrapping, role=toolbar, and consistent local density.",
		],
		consumerOwns: [
			"Control selection, action priority, labels, authorization, responsive reduction, and command behavior.",
		],
	},
	semanticBoundaries: [
		"Toolbar position does not make controls authorized or primary.",
		"Visual grouping does not make unrelated controls one workflow.",
		"Toolbar does not own PageHeader identity or FilterBar criteria.",
		"This contract governs Toolbar, ToolbarGroup, and ToolbarSeparator as one layout family.",
	],
	rules: [
		"Include only controls that affect the same view or selected subject.",
		"Order controls by task frequency and consequence.",
		"Move filters into FilterBar and page-wide identity actions into PageHeader when those patterns apply.",
		"Keep required Approve or Submit actions visible — do not bury them only in overflow.",
		"Override aria-label when multiple toolbars appear on one page.",
	],
	accessibility: [
		"Provide an accessible toolbar label when purpose is not apparent (default role=toolbar).",
		"Preserve each child control's semantics, name, and visible focus.",
		"Keep reading and focus order aligned with visual order.",
		"Keep ToolbarSeparator decorative (aria-hidden).",
	],
	prohibitedUsage: [
		"Do not use Toolbar as a generic horizontal wrapper.",
		"Do not place unrelated page and row actions together.",
		"Do not hide required controls without an accessible responsive alternative.",
		"Do not encode lifecycle or approval in toolbar chrome — use StatusBadge on the record.",
	],
});
