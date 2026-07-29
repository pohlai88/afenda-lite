import { defineManifestContract } from "./manifest.contract";

export const fileUploadContract = defineManifestContract({
	id: "ui.file-upload.contract",
	component: "ui.file-upload",
	purpose:
		"Provides labelled file selection and attachment-list presentation for controlled ERP uploads — supporting documents, policy PDFs, and remittance evidence — without owning transport, scanning, or durable storage.",
	ownership: {
		componentOwns: [
			"FileUpload labelled chooser chrome, accept/multiple/disabled passthrough to the file input, AttachmentList presentation, and per-file remove affordance wiring.",
		],
		consumerOwns: [
			"Authorization, file policy, malware scanning, upload transport, persistence, retention, queued-versus-persisted state, and failure recovery.",
		],
	},
	semanticBoundaries: [
		"Client acceptance does not prove that a file is safe, authorized, or persisted.",
		"accept attributes guide the OS chooser only — they are not security validation.",
		"Displayed AttachmentList rows do not prove server completion unless feature state marks them persisted.",
		"onRemove is a presentation callback — it does not authorize or complete deletion.",
	],
	approvedVariants: {
		single: {
			meaning: "One-file selection (default input without multiple).",
			allowedWhen: [
				"The workflow accepts exactly one attachment such as a signed policy PDF.",
			],
			prohibitedWhen: [
				"Operators must attach several evidence files in one step — use multiple.",
			],
		},
		multiple: {
			meaning: "Multi-file selection via the multiple attribute.",
			allowedWhen: [
				"Supporting document packs allow more than one file under feature count limits.",
			],
			prohibitedWhen: ["Domain policy permits only one file — omit multiple."],
		},
	},
	rules: [
		"This contract governs FileUpload, AttachmentList, and UiAttachment as one upload-presentation family.",
		"Declare accepted types, size limits, count limits, and duplicate policy before selection — surface guidance in description.",
		"Keep persisted attachments distinct from newly selected local files in feature state.",
		"Wire onFilesSelected to feature-owned queue handling; do not pretend selection is upload completion.",
		"Name remove actions with the affected file (AttachmentList supplies Remove {name}).",
		"Omit onRemove when the operator is not authorized to delete.",
	],
	accessibility: [
		"Provide a labelled keyboard-operable file chooser (Label + input association).",
		"Keep upload icons decorative when adjacent text already names the control.",
		"Give attachment remove actions names that identify the affected file.",
		"Expose AttachmentList with an accessible name when multiple lists appear on one page.",
	],
	prohibitedUsage: [
		"Do not rely on accept attributes as security validation.",
		"Do not display local selection as a completed persisted attachment.",
		"Do not remove attachments without feature-owned authorization and outcome handling.",
		"Do not encode approval or posting lifecycle in upload chrome — use StatusBadge on the record.",
		"Do not invent client-only malware or retention guarantees in the component.",
	],
});
