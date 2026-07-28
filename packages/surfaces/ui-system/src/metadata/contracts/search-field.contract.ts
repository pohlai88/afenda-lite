import { defineManifestContract } from "./manifest.contract";

export const searchFieldContract = defineManifestContract({
	id: "ui.search-field.contract",
	component: "ui.search-field",
	purpose:
		"Provides controlled query entry and clear interaction for collection search.",
	ownership: {
		componentOwns: [
			"Search-input presentation, query callbacks, clear action, and accessible search-control semantics.",
		],
		consumerOwns: [
			"Debouncing, query syntax, URL state, authorization, data fetching, ranking, and result policy.",
		],
	},
	semanticBoundaries: [
		"Entered text does not determine authoritative server search behavior.",
		"Clearing presentation does not determine whether other filters or URL state are reset.",
	],
	rules: [
		"Use SearchField for collection search and state the searchable scope in its label or surrounding context.",
		"Keep the controlled query synchronized with feature URL or view state when applicable.",
		"Distinguish no search results from a genuinely empty collection.",
	],
	accessibility: [
		"Provide an accessible search label even when the visible layout is compact.",
		"Give the clear action an accessible name and visible focus.",
		"Coordinate result-count announcements with the collection rather than the input alone.",
	],
	prohibitedUsage: [
		"Do not fetch data or own debounce policy inside SearchField.",
		"Do not use placeholder text as the only accessible name.",
		"Do not imply that client filtering enforces data authorization.",
	],
});
