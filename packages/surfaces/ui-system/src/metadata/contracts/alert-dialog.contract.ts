import { defineManifestContract } from "./manifest.contract";

export const alertDialogContract = defineManifestContract({
	id: "ui.alert-dialog.contract",
	component: "ui.alert-dialog",
	purpose:
		"Provides a blocking confirmation surface for irreversible or difficult-to-recover ERP decisions that require an explicit Cancel-versus-Confirm choice.",
	ownership: {
		componentOwns: [
			"Modal alert-dialog semantics, focus containment, labelled title and description, cancel and action composition, size presentation, and dismissal behavior.",
		],
		consumerOwns: [
			"Consequence wording, confirmation policy, authorization, command execution, pending and retry state, and post-confirm outcome handling.",
		],
	},
	semanticBoundaries: [
		"AlertDialog presentation does not determine whether an action is authorized, destructive by policy, or already executed.",
		"Confirming does not make a command idempotent, successful, or safe to retry without feature-owned pending protection.",
		"AlertDialog does not own reversible review workflows — those belong in Dialog when a governed undo or reversal path exists.",
	],
	approvedSizes: {
		default: {
			meaning:
				"Standard confirmation width for ordinary consequence explanation.",
			allowedWhen: [
				"The operator needs a clear title, consequence description, and Cancel versus Confirm actions.",
			],
			prohibitedWhen: [
				"The content is a multi-field form or long-running workflow that belongs on a page, Sheet, or Dialog edit surface.",
			],
		},
		sm: {
			meaning: "Compact confirmation width for a short, unambiguous decision.",
			allowedWhen: [
				"A brief consequence remains clear without dense explanatory content.",
			],
			prohibitedWhen: [
				"The consequence requires multi-paragraph explanation or supporting field review.",
			],
		},
	},
	rules: [
		"Use AlertDialog for deleting, permanently voiding, destructive reversal, or other difficult-to-recover harm.",
		"Describe the concrete record and consequence; keep Cancel as the safe path and one Confirm primary.",
		"Use Dialog for material but reversible operations such as posting review when a governed reversal workflow exists.",
		"Prevent repeated confirmation while the submitted command is pending; retain stable command wording.",
		"Keep content short — title, consequence, Cancel, Confirm. Do not place complex forms inside AlertDialog.",
		"Style the confirm action as destructive only when the outcome is harmful; do not style Approve as destructive.",
	],
	accessibility: [
		"Provide an accessible title and consequence description associated with the alert dialog.",
		"Move focus into the dialog on open and restore it to a meaningful trigger on close.",
		"Keep Cancel and Confirm keyboard operable with visible focus.",
		"Announce pending confirmation state without replacing the accessible name of the confirm action unless the Button contract requires otherwise.",
	],
	prohibitedUsage: [
		"Do not use AlertDialog for ordinary information, notices, or complex edit forms.",
		"Do not use AlertDialog for reversible posting review that belongs in Dialog.",
		"Do not close on implicit interaction when an explicit decision is required.",
		"Do not place authorization, validation rules, or command execution inside the reusable overlay primitive.",
		"Do not present competing primary actions or omit a safe Cancel path.",
	],
});
