import { defineManifestContract } from "./manifest.contract";

export const treeViewContract = defineManifestContract({
	id: "ui.tree-view.contract",
	component: "ui.tree-view",
	purpose:
		"Presents hierarchical records with controlled expansion, selection, and node actions.",
	ownership: {
		componentOwns: [
			"Tree hierarchy rendering, expansion interaction, selected presentation, keyboard navigation, and node composition.",
		],
		consumerOwns: [
			"Hierarchy data, stable node identity, lazy loading, selection meaning, authorization, actions, and persistence.",
		],
	},
	semanticBoundaries: [
		"Expanded presentation does not prove that all descendants are loaded or authorized.",
		"Selected styling does not establish domain ownership or command eligibility.",
	],
	rules: [
		"Use stable node identifiers and preserve expansion across equivalent refreshes.",
		"Represent loading, missing, inaccessible, and leaf states explicitly.",
		"Keep node actions separate from selection and expansion controls.",
	],
	accessibility: [
		"Preserve tree, treeitem, level, expanded, selected, and focus semantics.",
		"Support keyboard traversal, expansion, collapse, and selection.",
		"Give node actions names that identify both action and target.",
	],
	prohibitedUsage: [
		"Do not derive authorization from hidden or collapsed nodes.",
		"Do not use row position as node identity.",
		"Do not make a whole node ambiguous when it contains multiple actions.",
	],
});
