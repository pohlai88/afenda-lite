import { defineManifestContract } from "./manifest.contract";

export const dialogContract = defineManifestContract({
	id: "ui.dialog.contract",
	component: "ui.dialog",
	purpose:
		"Provides a modal surface for focused ERP work — bounded record edits, reversible operation review, short policy configuration, or explicit acknowledgement — without claiming authorization, transactionality, or irreversible harm. Interrupt only for bounded work; reserve AlertDialog for difficult-to-recover harm.",
	ownership: {
		componentOwns: [
			"Modal dialog semantics, focus containment, overlay composition, labelled title and description, and Escape or close-button dismissal mechanics.",
		],
		consumerOwns: [
			"Workflow content, validation, authorization, submission, pending and retry state, unsaved-change policy, consequence copy in the description, and outcomes.",
		],
	},
	semanticBoundaries: [
		"Modal presentation does not make a workflow safe, authorized, or transactional.",
		"Closing behavior does not determine whether edits are discarded or persisted — feature code owns dirty-state protection.",
		"Dialog does not own irreversible harm confirmation — that belongs in AlertDialog when recovery is difficult or impossible.",
		"Dialog does not replace Sheet for large secondary panels or a dedicated page for multi-step workflows.",
		"Destructive styling is reserved for difficult-to-recover harm — never for Approve or other authority actions.",
	],
	rules: [
		"This contract governs Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, and DialogClose as one modal family.",
		"Use Dialog for focused bounded work that should interrupt the underlying surface — edit one record, review a reversible operation, configure a short policy, or acknowledge required guidance.",
		"Provide one clear title, a consequence-bearing description, a predictable Cancel or close path, and one dominant primary action.",
		"Keep Cancel as type=button and the committing action as type=submit when the Dialog hosts a form.",
		"Preserve field values after validation failure and keep the Dialog open until the operator corrects or cancels.",
		"Feature code owns pending submission — retain stable command wording while controls report busy progress.",
		"Use AlertDialog when the operator must confirm irreversible or difficult-to-recover harm.",
		"Keep complex or long-running workflows on a dedicated page or suitable Sheet.",
		"Keep title, description, focus containment, keyboard dismissal, error recovery, and action hierarchy coherent across narrow and high-contrast layouts.",
	],
	accessibility: [
		"Provide an accessible title and description associated with the dialog.",
		"Contain focus while open and restore it to a meaningful trigger on close.",
		"Keep all actions keyboard operable with visible focus, including Escape dismissal when dismissal is allowed.",
		"Associate validation errors with their fields and keep the dialog open until corrected or cancelled.",
		"Announce pending save state without inventing a second competing primary action.",
	],
	prohibitedUsage: [
		"Do not use Card as a substitute for DialogContent.",
		"Do not nest modal dialogs without an exceptional and reviewed interaction need.",
		"Do not dismiss a dirty workflow without feature-owned protection.",
		"Do not present competing primary actions or style Approve as destructive.",
		"Do not use Dialog for irreversible deletion, void, or permanent revoke — use AlertDialog.",
		"Do not overload Dialog with multi-step wizards that belong on a page or Sheet.",
		"Do not rely on the title alone — keep consequence meaning in the description.",
	],
});
