import { defineManifestContract } from "./manifest.contract";

export const fileUploadContract = defineManifestContract({
	id: "ui.file-upload.contract",
	component: "ui.file-upload",
	purpose:
		"Provides file selection, drop interaction, and attachment-list presentation for controlled ERP uploads.",
	ownership: {
		componentOwns: [
			"File chooser and drop interaction, selected-file presentation, attachment actions, and local progress display.",
		],
		consumerOwns: [
			"Authorization, file policy, malware scanning, upload transport, persistence, retention, and failure recovery.",
		],
	},
	semanticBoundaries: [
		"Client acceptance does not prove that a file is safe, authorized, or persisted.",
		"Displayed progress does not determine server completion or durable attachment state.",
	],
	rules: [
		"Declare accepted types, size limits, count limits, and duplicate policy before selection.",
		"Represent queued, uploading, complete, failed, and removable states explicitly.",
		"Keep persisted attachments distinct from newly selected local files.",
	],
	accessibility: [
		"Provide a labelled keyboard-operable file chooser in addition to drag and drop.",
		"Announce upload failures and completion without relying on progress graphics alone.",
		"Give attachment remove and retry actions names that identify the affected file.",
	],
	prohibitedUsage: [
		"Do not rely on accept attributes as security validation.",
		"Do not display local selection as a completed persisted attachment.",
		"Do not remove attachments without feature-owned authorization and outcome handling.",
	],
});
