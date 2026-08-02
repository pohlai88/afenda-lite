import { definePayablesOperationRegistry } from "../../kernel/operations/define-registry";

const OWNER = "credit-notes" as const;

export const PAYABLES_CREDIT_NOTE_COMMANDS = definePayablesOperationRegistry({
	issueSupplierCreditNote: {
		id: "payables.credit_note.issue",
		kind: "command",
		owner: OWNER,
		permission: "payables.manage",
		publicName: "issueSupplierCreditNote",
	},
	createDraftSupplierCreditNote: {
		id: "payables.credit_note.create",
		kind: "command",
		owner: OWNER,
		permission: "payables.manage",
		publicName: "createDraftSupplierCreditNote",
	},
	addSupplierCreditNoteLine: {
		id: "payables.credit_note.line.add",
		kind: "command",
		owner: OWNER,
		permission: "payables.manage",
		publicName: "addSupplierCreditNoteLine",
	},
	postSupplierCreditNote: {
		id: "payables.credit_note.post",
		kind: "command",
		owner: OWNER,
		permission: "payables.manage",
		publicName: "postSupplierCreditNote",
	},
});
