import { defineManifestContract } from "./manifest.contract";

export const treeViewContract = defineManifestContract({
	id: "ui.tree-view.contract",
	component: "ui.tree-view",
	purpose:
		"Presents hierarchical ERP records — module navigation or chart-of-accounts trees — with controlled expansion, selection, and node presentation without owning routing or authorization.",
	ownership: {
		componentOwns: [
			"Tree hierarchy rendering, expansion interaction, selected presentation, tree/treeitem ARIA, and expand/collapse affordances.",
		],
		consumerOwns: [
			"Hierarchy data, stable node identity, lazy loading, selection meaning, authorization, actions, and persistence.",
		],
	},
	semanticBoundaries: [
		"Expanded presentation does not prove that all descendants are loaded or authorized.",
		"Selected styling does not establish domain ownership or command eligibility.",
		"TreeView does not own routing destinations or StatusBadge lifecycle.",
		"Disabled nodes remain visible for review but do not accept selection.",
	],
	rules: [
		"Use stable node identifiers and preserve expansion across equivalent refreshes.",
		"Represent loading, missing, inaccessible, and leaf states explicitly in feature state.",
		"Keep node actions separate from selection and expansion controls.",
		"Prefer TreeView for true hierarchies; prefer flat lists or Tabs when depth is not material.",
		"Wire onSelect and onExpandedChange from feature-owned state.",
	],
	accessibility: [
		"Preserve tree, treeitem, level, expanded, selected, and focus semantics.",
		"Support keyboard traversal, expansion, collapse, and selection.",
		"Name expand/collapse controls with the affected node label.",
		"Expose disabled nodes with aria-disabled without removing them from the tree.",
	],
	prohibitedUsage: [
		"Do not derive authorization from hidden or collapsed nodes.",
		"Do not use row position as node identity.",
		"Do not make a whole node ambiguous when it contains multiple actions.",
		"Do not encode lifecycle or approval in tree chrome — use StatusBadge beside the selected record.",
	],
});
