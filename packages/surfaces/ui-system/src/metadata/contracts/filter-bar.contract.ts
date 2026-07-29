import { defineManifestContract } from "./manifest.contract";

export const filterBarContract = defineManifestContract({
	id: "ui.filter-bar.contract",
	component: "ui.filter-bar",
	purpose:
		"Composes related collection filters and explicit Apply/Reset actions in one labelled query surface for ERP lists — invoices, modules, or other filtered workbenches — without owning query policy or result fetching.",
	ownership: {
		componentOwns: [
			"FilterBar region layout, FilterBarGroup field clustering, FilterBarActions placement, responsive row stacking, and default Filters labelling.",
		],
		consumerOwns: [
			"Filter definitions, values, URL or saved-view sync, query translation, authorization, Apply/Reset semantics, and result fetching.",
		],
	},
	semanticBoundaries: [
		"Visible filter values do not define authoritative server query behavior.",
		"Apply confirmation is feature-owned — drafting fields does not mutate the collection until Apply runs.",
		"Clearing or resetting filters does not determine whether search, sorting, or saved-view state resets.",
		"FilterBar is layout chrome — it does not fetch, authorize, or prove eligibility of filtered rows.",
	],
	rules: [
		"This contract governs FilterBar, FilterBarGroup, and FilterBarActions as one filter-layout family.",
		"Group filters that affect the same collection and use governed field controls (SearchField, Select, Input).",
		"Make Apply and Reset explicit named actions for deferred filter workflows.",
		"Keep applied values synchronized with URL or saved-view state when the feature uses those surfaces.",
		"Surface unhealthy empty results with recovery copy — do not imply the collection is permanently empty.",
		"Override aria-label when multiple filter regions appear on one page.",
	],
	accessibility: [
		"Provide an accessible name for the filter region (default Filters; override per instance).",
		"Preserve each child control's label, description, and visible focus.",
		"Keep Apply and Reset keyboard operable with visible focus.",
		"Announce applied-criteria or result changes through live regions or the collection — not only via layout chrome.",
	],
	prohibitedUsage: [
		"Do not fetch data or own query policy inside FilterBar.",
		"Do not mix unrelated page actions into the filter group.",
		"Do not use hidden filters as authorization controls.",
		"Do not bury Apply/Reset in an unlabeled icon row.",
		"Do not encode lifecycle or approval state in filter chrome — use StatusBadge on result rows.",
	],
});
