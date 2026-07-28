import { defineManifestContract } from "./manifest.contract";

export const timelineContract = defineManifestContract({
	id: "ui.timeline.contract",
	component: "ui.timeline",
	purpose:
		"Presents chronological events and audit entries with actor, time, state, and supporting detail.",
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
	],
	rules: [
		"Sort from authoritative timestamps with a declared ordering policy.",
		"Distinguish system, user, imported, and corrected events when relevant.",
		"Display time-zone context and preserve immutable audit wording.",
	],
	accessibility: [
		"Use ordered structure and meaningful event headings.",
		"Expose actor, time, action, and status in logical reading order.",
		"Do not rely on marker shape or color alone to distinguish event types.",
	],
	prohibitedUsage: [
		"Do not fabricate missing audit facts inside Timeline.",
		"Do not expose redacted actors or event data.",
		"Do not present a filtered history as complete without explanation.",
	],
});
