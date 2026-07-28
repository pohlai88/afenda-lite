import { defineManifestContract } from "./manifest.contract";

export const changeDiffContract = defineManifestContract({
	id: "ui.change-diff.contract",
	component: "ui.change-diff",
	purpose:
		"Presents labelled before-and-after values for an authoritative change record.",
	ownership: {
		componentOwns: [
			"Diff-row composition, before-and-after hierarchy, changed-value emphasis, and consistent empty-value presentation.",
		],
		consumerOwns: [
			"Change provenance, field labels, redaction, formatting, authorization, and audit integrity.",
		],
	},
	semanticBoundaries: [
		"Visual difference does not prove who made a change or whether it was valid.",
		"Omitted fields do not imply that no other changes occurred.",
	],
	rules: [
		"Supply values from an authoritative change source and format comparable values consistently.",
		"Represent missing, redacted, and unchanged values explicitly.",
		"Order fields according to review importance or stable audit schema.",
	],
	accessibility: [
		"Identify field labels and before-and-after values in logical reading order.",
		"Do not rely on color or strike-through alone to communicate change.",
		"Expand ambiguous abbreviations and formatted identifiers.",
	],
	prohibitedUsage: [
		"Do not calculate audit facts inside ChangeDiff.",
		"Do not expose redacted or unauthorized values.",
		"Do not present a partial comparison as a complete audit record.",
	],
});
