import { defineManifestContract } from "./manifest.contract";

export const asyncStateContract = defineManifestContract({
	id: "ui.async-state.contract",
	component: "ui.async-state",
	purpose:
		"Presents mutually exclusive loading, empty, filtered-empty, error, and ready states for asynchronous content.",
	ownership: {
		componentOwns: [
			"Async-state presentation, state-specific content composition, retry slot, and consistent region hierarchy.",
		],
		consumerOwns: [
			"State derivation, fetching, authorization, retry behavior, stale-data policy, and outcome truth.",
		],
	},
	semanticBoundaries: [
		"Presentation state does not derive authoritative request or domain state.",
		"Ready presentation does not prove that data is current, complete, or authorized.",
	],
	rules: [
		"Supply exactly one truthful state from feature-owned async logic.",
		"Distinguish true empty from filtered-empty and permission-limited results.",
		"Connect retry actions to real idempotent or safely handled feature behavior.",
	],
	accessibility: [
		"Expose state changes through one coordinated region without duplicate announcements.",
		"Keep retry actions keyboard operable and clearly named.",
		"Do not rely on animation, illustration, or color alone for state meaning.",
	],
	prohibitedUsage: [
		"Do not fetch data or infer permissions inside AsyncState.",
		"Do not show ready content after a terminal error without stale-data explanation.",
		"Do not render fake retry or creation actions.",
	],
});
