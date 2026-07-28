import { defineManifestContract } from "./manifest.contract";

export const buttonGroupContract = defineManifestContract({
	id: "ui.button-group.contract",
	component: "ui.button-group",
	purpose:
		"Groups closely related controls into one visually and semantically coherent action set.",
	ownership: {
		componentOwns: [
			"Action-group layout, orientation, shared borders, separators, and group semantics.",
		],
		consumerOwns: [
			"Action relationship, ordering, labels, authorization, command behavior, and responsive suitability.",
		],
	},
	semanticBoundaries: [
		"Visual grouping does not make actions equivalent in authority or consequence.",
		"Orientation does not determine keyboard behavior of child controls.",
	],
	approvedVariants: {
		horizontal: {
			meaning: "Inline related-action group.",
			allowedWhen: [
				"Controls fit in reading order without crowding or wrapping.",
			],
		},
		vertical: {
			meaning: "Stacked related-action group.",
			allowedWhen: [
				"Available width or action labels require vertical composition.",
			],
		},
	},
	rules: [
		"Group only controls that operate on the same subject or decision context.",
		"Keep primary emphasis on child Button variants rather than group position.",
		"Use ButtonGroupText only for directly related non-interactive context.",
	],
	accessibility: [
		"Provide an accessible group label when purpose is not apparent.",
		"Preserve each child control's name, semantics, and focus.",
		"Keep visual separators non-interactive and non-duplicative.",
	],
	prohibitedUsage: [
		"Do not group unrelated page commands.",
		"Do not use ButtonGroup as a generic toolbar or layout wrapper.",
		"Do not make the group itself clickable.",
	],
});
