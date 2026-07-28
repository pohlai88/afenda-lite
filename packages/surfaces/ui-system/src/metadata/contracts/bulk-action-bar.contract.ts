import { defineManifestContract } from "./manifest.contract";

export const bulkActionBarContract = defineManifestContract({
	id: "ui.bulk-action-bar.contract",
	component: "ui.bulk-action-bar",
	purpose:
		"Presents selected-record count and authorized actions that apply to an explicit collection selection.",
	ownership: {
		componentOwns: [
			"Bulk-action layout, selected-count presentation, action composition, and clear-selection affordance.",
		],
		consumerOwns: [
			"Selection identity, eligibility, authorization, command execution, confirmation, partial failure, and outcomes.",
		],
	},
	semanticBoundaries: [
		"Selection count does not prove that every record is eligible or authorized.",
		"Bar visibility does not determine command safety or atomicity.",
	],
	rules: [
		"Show the exact selected count and operate only on stable selected identities.",
		"Revalidate eligibility and permissions before executing each bulk command.",
		"Explain partial success and retain unresolved selections when appropriate.",
	],
	accessibility: [
		"Announce meaningful selection-count changes without excessive repetition.",
		"Give actions names that identify their bulk scope.",
		"Keep clear-selection and every command keyboard operable with visible focus.",
	],
	prohibitedUsage: [
		"Do not derive authorization from client selection.",
		"Do not imply atomic success when individual records can fail.",
		"Do not show fake or permanently disabled bulk actions.",
	],
});
