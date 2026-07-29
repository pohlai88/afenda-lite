import { defineManifestContract } from "./manifest.contract";

export const timelineContract = defineManifestContract({
	id: "ui.timeline.contract",
	component: "ui.timeline",
	purpose:
		"Presents chronological ERP events and audit entries with actor, time, state, and supporting detail — invoice activity, posting batches, remittance history — without owning provenance, completeness, or legal validity.",
	ownership: {
		componentOwns: [
			"Chronological event layout, markers, connectors, metadata hierarchy, and audit-entry composition.",
		],
		consumerOwns: [
			"Event provenance, ordering, actor identity, timestamps, redaction, authorization, and audit integrity.",
		],
	},
	semanticBoundaries: [
		"Timeline order does not prove causal order or audit completeness.",
		"Visual event status does not establish legal or domain validity.",
		"Timeline does not replace StatusBadge for lifecycle, Table for tabular facts, or KeyValue for static metadata.",
	],
	rules: [
		"This contract governs Timeline, TimelineEntry, and AuditTrail as one chronological family.",
		"Sort from authoritative timestamps with a declared ordering policy.",
		"Distinguish system, user, imported, and corrected events when relevant.",
		"Display time-zone context and preserve immutable audit wording.",
		"Explain filtered histories — do not present a partial trail as complete.",
		"Prefer Card composition for invoice and batch audit panels.",
	],
	accessibility: [
		"Use ordered structure and meaningful event headings.",
		"Expose actor, time, action, and status in logical reading order.",
		"Do not rely on marker shape or color alone to distinguish event types.",
		"Keep decorative icons aria-hidden when titles already convey meaning.",
	],
	prohibitedUsage: [
		"Do not fabricate missing audit facts inside Timeline.",
		"Do not expose redacted actors or event data.",
		"Do not present a filtered history as complete without explanation.",
		"Do not invent timestamps or actors when the audit store has no record.",
	],
});
