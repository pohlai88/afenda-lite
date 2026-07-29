import { defineManifestContract } from "./manifest.contract";

export const searchFieldContract = defineManifestContract({
	id: "ui.search-field.contract",
	component: "ui.search-field",
	purpose:
		"Provides controlled query entry and clear interaction for ERP collection search such as suppliers, invoices, or payment runs.",
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
		"SearchField does not own Empty filtered-empty messaging or result ranking.",
	],
	rules: [
		"Use SearchField for collection search and state the searchable scope in its label or surrounding context.",
		"Keep the controlled query synchronized with feature URL or view state when applicable.",
		"Distinguish no search results from a genuinely empty collection.",
		"Pair with FilterBar when structured filters accompany free-text search.",
	],
	accessibility: [
		"Provide an accessible search label even when the visible layout is compact.",
		"Give the clear action an accessible name and visible focus.",
		"Coordinate result-count announcements with the collection rather than the input alone.",
	],
	prohibitedUsage: [
		"Do not use SearchField as a freeform notes field.",
		"Do not treat client-side filtering as authorization.",
		"Do not omit the clear control when operators must reset a non-empty query.",
	],
});
