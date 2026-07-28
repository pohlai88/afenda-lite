import { defineManifestContract } from "./manifest.contract";

export const emptyContract = defineManifestContract({
	id: "ui.empty.contract",
	component: "ui.empty",
	purpose:
		"Presents a clear empty, filtered-empty, or unavailable-content explanation with optional real next action.",
	ownership: {
		componentOwns: [
			"Empty-state hierarchy, approved spacing sizes, illustration placement, message composition, and action slot.",
		],
		consumerOwns: [
			"State classification, wording, authorization, recovery action, destinations, and collection behavior.",
		],
	},
	semanticBoundaries: [
		"Empty presentation does not determine whether data is absent, filtered, restricted, or failed.",
		"A displayed action does not imply that the capability is authorized or implemented.",
	],
	approvedSizes: {
		sm: {
			meaning: "Compact empty state.",
			allowedWhen: [
				"A bounded panel or dense collection needs concise feedback.",
			],
		},
		md: {
			meaning: "Default empty state.",
			allowedWhen: [
				"An ordinary collection or section has no displayable content.",
			],
		},
		lg: {
			meaning: "Prominent empty state.",
			allowedWhen: [
				"A sparse page-level surface requires a primary explanation.",
			],
		},
	},
	rules: [
		"Distinguish true empty, filtered-empty, permission-limited, and failed states.",
		"Offer an action only when it connects to real authorized behavior.",
		"Use concise wording that explains why content is absent and what can happen next.",
	],
	accessibility: [
		"Expose the heading and description in logical reading order.",
		"Keep recovery actions keyboard operable with clear names.",
		"Do not rely on illustration or color to communicate the state.",
	],
	prohibitedUsage: [
		"Do not use Empty for loading or error states without truthful explanation.",
		"Do not render fake or permanently disabled actions.",
		"Do not infer collection state inside the presentation component.",
	],
});
