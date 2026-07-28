import { defineManifestContract } from "./manifest.contract";

export const toggleGroupContract = defineManifestContract({
	id: "ui.toggle-group.contract",
	component: "ui.toggle-group",
	purpose:
		"Groups related toggle controls for single or multiple transient selections.",
	ownership: {
		componentOwns: [
			"Toggle-group interaction, single or multiple selection mechanics, item composition, and keyboard focus.",
		],
		consumerOwns: [
			"Selection meaning, controlled values, labels, validation, authorization, and persistence.",
		],
	},
	semanticBoundaries: [
		"Pressed presentation does not prove that a domain setting was persisted.",
		"Group mode does not determine whether selected values are mutually exclusive in the domain.",
	],
	approvedVariants: {
		default: {
			meaning: "Unbounded toggle-group treatment.",
			allowedWhen: ["Peer choices are clear without persistent item borders."],
		},
		outline: {
			meaning: "Outlined toggle-group treatment.",
			allowedWhen: ["Peer choices need a visible bounded control surface."],
		},
	},
	approvedSizes: {
		default: {
			meaning: "Standard toggle-group target.",
			allowedWhen: ["Ordinary view or formatting choices are shown."],
		},
		sm: {
			meaning: "Compact toggle-group target.",
			allowedWhen: ["Dense toolbar choices remain readable and operable."],
		},
		lg: {
			meaning: "Prominent toggle-group target.",
			allowedWhen: ["A sparse choice set needs stronger control emphasis."],
		},
	},
	rules: [
		"Use ToggleGroup for compact peer view or formatting choices.",
		"Choose single or multiple mode from the actual selection model.",
		"Keep every item label or accessible name distinct.",
	],
	accessibility: [
		"Provide an accessible group label when purpose is not apparent.",
		"Preserve pressed or selected state, keyboard movement, and visible focus.",
		"Name icon-only items programmatically.",
	],
	prohibitedUsage: [
		"Do not use ToggleGroup for consequential commands.",
		"Do not conceal persistence failures behind pressed state.",
		"Do not mix unrelated choices in one group.",
	],
});
