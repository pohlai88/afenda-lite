import { defineManifestContract } from "./manifest.contract";

export const alertDialogContract = defineManifestContract({
	id: "ui.alert-dialog.contract",
	component: "ui.alert-dialog",
	purpose:
		"Provides a blocking confirmation surface for consequential decisions requiring explicit acknowledgement.",
	ownership: {
		componentOwns: [
			"Modal alert-dialog semantics, focus containment, labelled content, cancel and action composition, and dismissal behavior.",
		],
		consumerOwns: [
			"Consequence wording, confirmation policy, authorization, command execution, pending state, and outcome handling.",
		],
	},
	semanticBoundaries: [
		"Alert-dialog presentation does not determine whether an action is destructive or authorized.",
		"Confirmation does not make a command idempotent or successful.",
	],
	approvedSizes: {
		default: {
			meaning: "Standard confirmation width.",
			allowedWhen: ["The consequence needs ordinary explanatory content."],
		},
		sm: {
			meaning: "Compact confirmation width.",
			allowedWhen: ["A short decision remains clear without dense content."],
		},
	},
	rules: [
		"Use AlertDialog for consequential actions that require an explicit decision.",
		"Describe the concrete consequence and provide a safe cancel path.",
		"Prevent repeated confirmation while the submitted command is pending.",
	],
	accessibility: [
		"Provide an accessible title and consequence description.",
		"Move focus into the dialog and restore it predictably on close.",
		"Keep cancel and confirm actions keyboard operable with visible focus.",
	],
	prohibitedUsage: [
		"Do not use AlertDialog for ordinary information or complex forms.",
		"Do not close on implicit interaction when an explicit decision is required.",
		"Do not place authorization or command execution inside the reusable overlay.",
	],
});
