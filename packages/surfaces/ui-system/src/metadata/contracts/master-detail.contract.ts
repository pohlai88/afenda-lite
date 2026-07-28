import { defineManifestContract } from "./manifest.contract";

export const masterDetailContract = defineManifestContract({
	id: "ui.master-detail.contract",
	component: "ui.master-detail",
	purpose:
		"Composes a selectable master collection beside the detail view for its current subject.",
	ownership: {
		componentOwns: [
			"Master-detail layout, primary and secondary region composition, responsive presentation, and panel hierarchy.",
		],
		consumerOwns: [
			"Collection data, selected identity, URL state, permissions, fetching, empty states, and detail workflow.",
		],
	},
	semanticBoundaries: [
		"Visible detail does not prove that the selected record remains authorized or current.",
		"Panel prominence does not establish record ownership or workflow priority.",
	],
	rules: [
		"Use stable record identity and synchronize selection with navigable state when appropriate.",
		"Represent no selection, missing record, loading, and permission loss explicitly.",
		"Provide a usable narrow-screen alternative to simultaneous panels.",
	],
	accessibility: [
		"Label master and detail regions clearly.",
		"Move or announce context predictably when selection changes.",
		"Keep collection and detail actions keyboard operable without focus loss.",
	],
	prohibitedUsage: [
		"Do not derive authoritative selection from row position.",
		"Do not keep inaccessible detail visible after permission changes.",
		"Do not use MasterDetail for unrelated peer panels.",
	],
});
