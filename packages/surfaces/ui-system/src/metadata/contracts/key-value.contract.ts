import { defineManifestContract } from "./manifest.contract";

export const keyValueContract = defineManifestContract({
	id: "ui.key-value.contract",
	component: "ui.key-value",
	purpose:
		"Presents labelled read-only values and compact metadata lists with consistent hierarchy.",
	ownership: {
		componentOwns: [
			"Label-value composition, list spacing, approved orientations, sizes, and read-only hierarchy.",
		],
		consumerOwns: [
			"Labels, formatted values, units, redaction, permissions, ordering, and domain meaning.",
		],
	},
	semanticBoundaries: [
		"Read-only presentation does not prove that a value is current, complete, or authoritative.",
		"Horizontal placement does not imply equivalence or comparison.",
	],
	approvedVariants: {
		vertical: {
			meaning: "Stacked label and value.",
			allowedWhen: ["Values need clear hierarchy or may wrap."],
		},
		horizontal: {
			meaning: "Opposed label and value.",
			allowedWhen: [
				"Compact labels and values remain readable across the available width.",
			],
		},
		inline: {
			meaning: "Compact inline label and value.",
			allowedWhen: ["Short metadata appears in a dense repeated context."],
		},
	},
	approvedSizes: {
		sm: {
			meaning: "Compact metadata size.",
			allowedWhen: ["Dense rows or supporting metadata are shown."],
		},
		md: {
			meaning: "Default metadata size.",
			allowedWhen: ["Ordinary record detail is shown."],
		},
		lg: {
			meaning: "Prominent metadata size.",
			allowedWhen: ["A sparse summary requires stronger value emphasis."],
		},
	},
	rules: [
		"Format comparable values with consistent units and precision.",
		"Order fields according to task importance rather than database order.",
		"Use structured controls instead when values are editable.",
	],
	accessibility: [
		"Keep labels programmatically and visually associated with values.",
		"Expand abbreviations that are not broadly understood.",
		"Do not rely on alignment, color, or typography alone to identify labels.",
	],
	prohibitedUsage: [
		"Do not use KeyValue as an editable form field.",
		"Do not expose unauthorized or unredacted data.",
		"Do not present stale or estimated values without feature-owned context.",
	],
});
