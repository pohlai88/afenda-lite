import { defineManifestContract } from "./manifest.contract";

export const savedViewSelectContract = defineManifestContract({
	id: "ui.saved-view-select.contract",
	component: "ui.saved-view-select",
	purpose:
		"Provides selection of a previously saved collection-view configuration.",
	ownership: {
		componentOwns: [
			"Saved-view option presentation, controlled selection, and accessible select interaction.",
		],
		consumerOwns: [
			"View loading, ownership, sharing, authorization, persistence, URL application, and default policy.",
		],
	},
	semanticBoundaries: [
		"Selecting a saved view does not determine whether its filters remain authorized or valid.",
		"Default presentation does not establish organization-wide or user-wide persistence policy.",
	],
	rules: [
		"Use stable saved-view identifiers and distinguish personal, shared, and default meaning in feature data.",
		"Revalidate saved criteria when permissions or available fields change.",
		"Represent missing, stale, or inaccessible saved views explicitly.",
	],
	accessibility: [
		"Provide a clear label describing which collection view will change.",
		"Preserve keyboard selection and visible focus.",
		"Announce an applied view through the surrounding collection-state strategy when necessary.",
	],
	prohibitedUsage: [
		"Do not store view definitions inside the reusable selector.",
		"Do not apply unauthorized filters merely because they exist in a saved view.",
		"Do not use display names as persistent saved-view identifiers.",
	],
});
