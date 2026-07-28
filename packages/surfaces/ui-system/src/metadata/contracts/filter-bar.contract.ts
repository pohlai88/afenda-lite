import { defineManifestContract } from "./manifest.contract";

export const filterBarContract = defineManifestContract({
	id: "ui.filter-bar.contract",
	component: "ui.filter-bar",
	purpose:
		"Composes related collection filters and filter actions in one controlled query surface.",
	ownership: {
		componentOwns: [
			"Filter grouping, responsive layout, action placement, and consistent local density.",
		],
		consumerOwns: [
			"Filter definitions, values, URL state, query translation, authorization, persistence, and result fetching.",
		],
	},
	semanticBoundaries: [
		"Visible filter values do not define authoritative server query behavior.",
		"Clearing filters does not determine whether search, sorting, or saved-view state resets.",
	],
	rules: [
		"Group filters that affect the same collection and use governed field controls.",
		"Keep applied values synchronized with URL or saved-view state when applicable.",
		"Make reset and apply behavior explicit for deferred filter workflows.",
	],
	accessibility: [
		"Provide an accessible label for the filter region.",
		"Preserve each child control's label, description, and visible focus.",
		"Announce result changes through the collection rather than the layout wrapper.",
	],
	prohibitedUsage: [
		"Do not fetch data or own query policy inside FilterBar.",
		"Do not mix unrelated page actions into the filter group.",
		"Do not use hidden filters as authorization controls.",
	],
});
