import { defineManifestContract } from "./manifest.contract";

export const buttonGroupContract = defineManifestContract({
	id: "ui.button-group.contract",
	component: "ui.button-group",
	purpose:
		"Groups closely related ERP controls into one visually and semantically coherent action set on a shared subject — paired decisions, peer exports, or stacked record actions — without becoming a page toolbar.",
	ownership: {
		componentOwns: [
			"Action-group layout, orientation (horizontal | vertical), shared borders, ButtonGroupSeparator, ButtonGroupText presentation, and role=group semantics.",
		],
		consumerOwns: [
			"Action relationship, ordering, labels, authorization, command behavior, accessible group naming, and whether BulkActionBar or Toolbar is the better surface.",
		],
	},
	semanticBoundaries: [
		"Visual grouping does not make actions equivalent in authority or consequence.",
		"Orientation does not determine keyboard behavior of child controls.",
		"ButtonGroupText is non-interactive context — it does not encode lifecycle or grant permission.",
		"ButtonGroup is not BulkActionBar: multi-row selection chrome stays on the bulk surface.",
		"ButtonGroup is not Toolbar: page-wide command strips stay on Toolbar.",
	],
	approvedVariants: {
		horizontal: {
			meaning: "Inline related-action group.",
			allowedWhen: [
				"Controls fit in reading order without crowding or wrapping — typical invoice Approve / Reject peers.",
			],
			prohibitedWhen: [
				"Labels or available width require stacking — prefer vertical.",
			],
		},
		vertical: {
			meaning: "Stacked related-action group.",
			allowedWhen: [
				"Available width or action labels require vertical composition.",
			],
			prohibitedWhen: [
				"Inline peer options fit comfortably — prefer horizontal.",
			],
		},
	},
	rules: [
		"This contract governs ButtonGroup, ButtonGroupSeparator, ButtonGroupText, and buttonGroupVariants as one action-group family.",
		"Group only controls that operate on the same subject or decision context.",
		"Keep primary emphasis on child Button variants rather than group position.",
		"Use ButtonGroupText only for directly related non-interactive context such as selection count.",
		"Provide aria-label (or equivalent) on the group when purpose is not apparent from surrounding chrome.",
		"Omit unauthorized peers instead of leaving permanently disabled decoys when the operator can never run them.",
	],
	accessibility: [
		"Provide an accessible group label when purpose is not apparent.",
		"Preserve each child control's name, semantics, and focus.",
		"Keep visual separators non-interactive and non-duplicative.",
		"Do not make the ButtonGroup root itself a click target.",
	],
	prohibitedUsage: [
		"Do not group unrelated page commands.",
		"Do not use ButtonGroup as a generic toolbar or layout wrapper.",
		"Do not make the group itself clickable.",
		"Do not replace BulkActionBar for multi-select collection commands.",
		"Do not encode approval or posting state in ButtonGroupText — use StatusBadge on the record.",
	],
});
