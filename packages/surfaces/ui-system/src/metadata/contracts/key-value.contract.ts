import { defineManifestContract } from "./manifest.contract";

export const keyValueContract = defineManifestContract({
	id: "ui.key-value.contract",
	component: "ui.key-value",
	purpose:
		"Presents labelled read-only ERP values and compact metadata lists — invoice identity, remittance facts, organization codes — with consistent hierarchy, without owning formatting policy, freshness, or editability.",
	ownership: {
		componentOwns: [
			"Label-value composition, list spacing, approved orientations, sizes, loading placeholder chrome, and optional copy presentation for string values.",
		],
		consumerOwns: [
			"Labels, formatted values, units, redaction, permissions, ordering, domain meaning, and whether a value may be copied or shown.",
		],
	},
	semanticBoundaries: [
		"Read-only presentation does not prove that a value is current, complete, or authoritative.",
		"Horizontal placement does not imply equivalence or comparison.",
		"KeyValue does not replace FormField for editable entry, StatusBadge for lifecycle, or MetricCard for trend summaries.",
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
		"This contract governs KeyValue and KeyValueList as one read-only metadata family.",
		"Format comparable values with consistent units and precision.",
		"Order fields according to task importance rather than database order.",
		"Use structured controls instead when values are editable.",
		"Use copyable only for exact string identifiers operators need to paste elsewhere.",
		"Prefer Card composition for invoice, remittance, and supplier summary panels.",
	],
	accessibility: [
		"Keep labels programmatically and visually associated with values via description-list semantics.",
		"Expand abbreviations that are not broadly understood.",
		"Do not rely on alignment, color, or typography alone to identify labels.",
		"Give copy controls an explicit accessible name or title describing what is copied.",
		"Do not invent factual content while loading — use the loading placeholder.",
	],
	prohibitedUsage: [
		"Do not use KeyValue as an editable form field.",
		"Do not expose unauthorized or unredacted data.",
		"Do not present stale or estimated values without feature-owned context.",
		"Do not use KeyValue for money entry, selection, or commands.",
		"Do not omit labels or rely on value formatting alone to identify the field.",
	],
});
