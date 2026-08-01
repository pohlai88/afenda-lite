import { defineManifestContract } from "./manifest.contract";

export const activityDialogContract = defineManifestContract({
	id: "ui.activity-dialog.contract",
	component: "ui.activity-dialog",
	purpose:
		"Presents ordered ERP record activity in a responsive governed dialog with actor, timestamp, message, attachment, and tag treatments without owning audit truth, retrieval, or retention policy.",
	ownership: {
		componentOwns: [
			"Dialog disclosure, ordered scrollable history, actor fallback presentation, timestamp structure, attachment and message framing, tag de-duplication, and empty presentation.",
		],
		consumerOwns: [
			"Authorized activity retrieval, event ordering, actor truth, summaries, attachment access, audit classification, retention, and redaction.",
		],
	},
	semanticBoundaries: [
		"Rendered history does not establish audit completeness or legal retention.",
		"Tags are descriptive labels and not StatusBadge lifecycle authority.",
		"Attachment names do not imply access or file safety.",
	],
	rules: [
		"Use the governed Dialog, ScrollArea, Avatar, Empty, and Badge composition.",
		"Preserve chronological ordering supplied by the consumer.",
		"Normalize duplicate and blank presentation tags without changing source events.",
	],
	accessibility: [
		"Expose a named dialog and ordered Recent activity list.",
		"Keep actor, summary, time, messages, files, and tags readable without icon or colour dependence.",
		"Restore focus to the trigger on dismissal through Dialog semantics.",
	],
	prohibitedUsage: [
		"Do not use a raw dialog or unordered decorative event stack.",
		"Do not claim the rendered list is the audit system of record.",
		"Do not expose unauthorized attachment data.",
	],
});
