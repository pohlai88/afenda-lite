import { defineManifestContract } from "./manifest.contract";

export const bulkActionBarContract = defineManifestContract({
	id: "ui.bulk-action-bar.contract",
	component: "ui.bulk-action-bar",
	purpose:
		"Presents selected-record count and authorized bulk commands for an explicit ERP collection selection — invoices, suppliers, or other multi-select workbench rows — without proving eligibility or atomic success.",
	ownership: {
		componentOwns: [
			"Bulk-action region layout, selected-count presentation via selectionLabel, action composition slot, and null render when selectedCount is below 1.",
		],
		consumerOwns: [
			"Selection identity, eligibility, authorization, command execution, confirmation, clear-selection control inside actions, partial failure, and outcomes.",
		],
	},
	semanticBoundaries: [
		"Selection count does not prove that every record is eligible or authorized.",
		"Bar visibility does not determine command safety or atomicity.",
		"Composed Button labels do not grant permission — feature Actions revalidate before execution.",
		"BulkActionBar is not a Toolbar substitute for page-level single-record commands.",
	],
	rules: [
		"Show the exact selected count and operate only on stable selected identities.",
		"Name the record type in selectionLabel when the domain is not obvious from surrounding chrome.",
		"Revalidate eligibility and permissions before executing each bulk command.",
		"Explain partial success and retain unresolved selections when appropriate.",
		"Place clear-selection and bulk commands in the actions slot — the component does not ship a built-in clear control.",
		"Omit unauthorized commands instead of rendering permanently disabled placeholders.",
	],
	accessibility: [
		"Announce meaningful selection-count changes without excessive repetition (aria-live on the count).",
		"Expose the bar as a labelled region (default Bulk actions) so operators can find it.",
		"Give actions names that identify their bulk scope (for example Export selected, not Go).",
		"Keep clear-selection and every command keyboard operable with visible focus.",
	],
	prohibitedUsage: [
		"Do not derive authorization from client selection.",
		"Do not imply atomic success when individual records can fail.",
		"Do not show fake or permanently disabled bulk actions.",
		"Do not keep the bar visible with selectedCount below 1 — the component must stay absent.",
		"Do not encode lifecycle or approval state in the bar chrome — use StatusBadge on the rows.",
	],
});
