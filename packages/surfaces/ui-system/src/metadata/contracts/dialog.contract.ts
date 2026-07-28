import { defineManifestContract } from "./manifest.contract";

export const dialogContract = defineManifestContract({
	id: "ui.dialog.contract",
	component: "ui.dialog",
	purpose:
		"Provides a modal surface for focused information, editing, or bounded workflow interaction.",
	ownership: {
		componentOwns: [
			"Modal dialog semantics, focus containment, overlay composition, labelled content, and dismissal mechanics.",
		],
		consumerOwns: [
			"Workflow content, validation, authorization, submission, unsaved-change policy, and outcomes.",
		],
	},
	semanticBoundaries: [
		"Modal presentation does not make a workflow safe, authorized, or transactional.",
		"Closing behavior does not determine whether edits are discarded or persisted.",
	],
	rules: [
		"Use Dialog for focused bounded work that should interrupt the underlying surface.",
		"Provide one clear title and predictable closing path.",
		"Keep complex or long-running workflows on a dedicated page or suitable sheet.",
	],
	accessibility: [
		"Provide an accessible title and description where needed.",
		"Contain focus while open and restore it to a meaningful trigger on close.",
		"Keep all actions keyboard operable with visible focus.",
	],
	prohibitedUsage: [
		"Do not use Card as a substitute for DialogContent.",
		"Do not nest modal dialogs without an exceptional and reviewed interaction need.",
		"Do not dismiss a dirty workflow without feature-owned protection.",
	],
});
