import { defineManifestContract } from "./manifest.contract";

export const emptyContract = defineManifestContract({
	id: "ui.empty.contract",
	component: "ui.empty",
	purpose:
		"Presents a clear empty, filtered-empty, or unavailable-content explanation for an ERP collection or panel, with an optional recovery action that maps to real authorized behavior.",
	ownership: {
		componentOwns: [
			"Empty-state hierarchy, approved spacing sizes, illustration placement, message composition, and action slot.",
		],
		consumerOwns: [
			"State classification (true empty, filtered, permission-limited, failed), wording, authorization, recovery action, destinations, and collection behavior.",
		],
	},
	semanticBoundaries: [
		"Empty presentation does not determine whether data is absent, filtered, restricted, or failed — the consumer classifies the state.",
		"A displayed action does not imply that the capability is authorized or implemented.",
		"Empty does not own loading, error, or StatusBadge lifecycle semantics.",
	],
	approvedSizes: {
		sm: {
			meaning: "Compact empty state for a bounded panel or dense collection.",
			allowedWhen: [
				"A bounded panel or dense collection needs concise feedback.",
			],
		},
		md: {
			meaning: "Default empty state for an ordinary collection or section.",
			allowedWhen: [
				"An ordinary collection or section has no displayable content.",
			],
		},
		lg: {
			meaning: "Prominent empty state for a sparse page-level surface.",
			allowedWhen: [
				"A sparse page-level surface requires a primary explanation.",
			],
		},
	},
	rules: [
		"Distinguish true empty, filtered-empty, permission-limited, and failed states in wording and actions.",
		"Offer an action only when it connects to real authorized behavior.",
		"Use concise wording that explains why content is absent and what can happen next.",
		"Prefer size=sm inside Cards and side panels; size=md for list sections; size=lg for page-level first-run surfaces.",
		"Keep icons decorative — never the only signal of emptiness.",
	],
	accessibility: [
		"Expose the heading and description in logical reading order.",
		"Keep recovery actions keyboard operable with clear names.",
		"Do not rely on illustration or color alone to communicate the state.",
		"Preserve a labelled region so assistive technology can locate the empty explanation.",
	],
	prohibitedUsage: [
		"Do not use Empty for loading or error states without truthful explanation — prefer Spinner, Skeleton, or Alert.",
		"Do not render fake or permanently disabled recovery actions.",
		"Do not infer collection state inside the presentation component.",
		"Do not treat Empty as StatusBadge-style lifecycle authority.",
	],
});
