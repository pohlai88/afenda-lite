import { defineManifestContract } from "./manifest.contract";

export const changeDiffContract = defineManifestContract({
	id: "ui.change-diff.contract",
	component: "ui.change-diff",
	purpose:
		"Presents labelled before-and-after field values from an authoritative ERP change record so operators can review amendments without inventing audit provenance inside the surface.",
	ownership: {
		componentOwns: [
			"Diff-row composition, before-and-after hierarchy, changed-value emphasis, unchanged styling, and consistent empty or placeholder presentation.",
		],
		consumerOwns: [
			"Change provenance, actor identity, timestamps, field labels, redaction, formatting, authorization, completeness of the compared set, and audit integrity.",
		],
	},
	semanticBoundaries: [
		"Visual difference does not prove who made a change, when it occurred, or whether the change was authorized.",
		"Omitted fields do not imply that no other changes occurred — the consumer owns completeness of the compared set.",
		"ChangeDiff does not replace StatusBadge for amendment lifecycle, Timeline for event history, or Alert for blocking failure.",
	],
	rules: [
		"This contract governs ChangeDiff and ChangeDiffRow as one review family.",
		"Supply values from an authoritative change source and format comparable values consistently.",
		"Mark changed={false} when before and after are intentionally identical so operators can distinguish reviewed-unchanged from amended fields.",
		"Represent missing, redacted, and empty values explicitly — never leave a blank cell that looks like absence of change.",
		"Order fields according to review importance or a stable audit schema.",
		"Keep ChangeDiff inside a named review surface such as a Card; feature code owns the amendment subject and actions.",
	],
	accessibility: [
		"Identify field labels and before-and-after values in logical reading order.",
		"Do not rely on color, background, or strike-through alone to communicate that a value changed.",
		"Expand ambiguous abbreviations and formatted identifiers in the visible label or value text.",
		"Preserve ChangeDiffRow screen-reader prefixes for previous and new values when composing custom content.",
	],
	prohibitedUsage: [
		"Do not calculate, invent, or mutate audit facts inside ChangeDiff.",
		"Do not expose redacted or unauthorized values.",
		"Do not present a partial field comparison as a complete audit record.",
		"Do not use ChangeDiff as a StatusBadge, Timeline, or live edit form substitute.",
		"Do not omit changed={false} for intentionally unchanged reviewed fields when the operator must confirm no drift.",
	],
});
