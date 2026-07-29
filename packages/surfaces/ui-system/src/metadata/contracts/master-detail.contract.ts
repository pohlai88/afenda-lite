import { defineManifestContract } from "./manifest.contract";

export const masterDetailContract = defineManifestContract({
	id: "ui.master-detail.contract",
	component: "ui.master-detail",
	purpose:
		"Composes a selectable ERP master collection beside the detail view for its current subject so operators can scan invoices, suppliers, or payment runs and inspect one record without leaving the workspace.",
	ownership: {
		componentOwns: [
			"Master-detail layout, primary and secondary region composition, default panel sizes, resize handle, and panel hierarchy.",
		],
		consumerOwns: [
			"Collection data, selected identity, URL state, permissions, fetching, empty states, and detail workflow actions.",
		],
	},
	semanticBoundaries: [
		"Visible detail does not prove that the selected record remains authorized or current.",
		"Panel prominence does not establish record ownership, approval state, or workflow priority.",
		"MasterDetail does not own StatusBadge lifecycle, FilterBar criteria, or PageHeader identity.",
		"Resize allocation does not encode business priority — Resizable chrome is presentation only.",
	],
	rules: [
		"This contract governs MasterDetail, MasterDetailPrimary, and MasterDetailSecondary as one layout family.",
		"Use stable record identity and synchronize selection with navigable state when appropriate.",
		"Represent no selection, missing record, loading, and permission loss explicitly in the detail pane.",
		"Provide a usable narrow-screen alternative to simultaneous panels when the viewport cannot host both regions.",
		"Keep primary record actions in the detail pane or PageHeader — not only in the master list.",
		"Prefer MasterDetail for true list→subject inspection; use Resizable alone for unrelated peer panels.",
	],
	accessibility: [
		"Label master and detail regions clearly (aria-label or visible headings).",
		"Move or announce context predictably when selection changes.",
		"Keep collection and detail actions keyboard operable without focus loss.",
		"Preserve a usable minimum size so required actions remain reachable after resize.",
	],
	prohibitedUsage: [
		"Do not derive authoritative selection from row position alone.",
		"Do not keep inaccessible detail visible after permission changes.",
		"Do not use MasterDetail for unrelated peer panels that are not list→subject.",
		"Do not encode domain lifecycle in panel size or selection styling alone — use StatusBadge.",
		"Do not bury Approve or Submit only in the master list when they apply to the selected record.",
	],
});
