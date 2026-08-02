import { defineAccountingOperationRegistry } from "../../kernel/operations/define-registry";

const OWNER = "journals" as const;

export const ACCOUNTING_JOURNAL_COMMANDS = defineAccountingOperationRegistry({
	createDraftJournal: {
		id: "accounting.journal.create",
		kind: "command",
		owner: OWNER,
		permission: "accounting.journal.create",
		publicName: "createDraftJournal",
	},
	addJournalLine: {
		id: "accounting.journal.line.add",
		kind: "command",
		owner: OWNER,
		permission: "accounting.journal.create",
		publicName: "addJournalLine",
	},
	postJournal: {
		id: "accounting.journal.post",
		kind: "command",
		owner: OWNER,
		permission: "accounting.journal.post",
		publicName: "postJournal",
	},
	reverseJournal: {
		id: "accounting.journal.reverse",
		kind: "command",
		owner: OWNER,
		permission: "accounting.journal.reverse",
		publicName: "reverseJournal",
	},
});

export const ACCOUNTING_JOURNAL_QUERIES = defineAccountingOperationRegistry({
	getJournalById: {
		id: "accounting.journal.get",
		kind: "query",
		owner: OWNER,
		permission: "accounting.journal.read",
		publicName: "getJournalById",
	},
	listJournals: {
		id: "accounting.journal.list",
		kind: "query",
		owner: OWNER,
		permission: "accounting.journal.read",
		publicName: "listJournals",
	},
	getTrialBalance: {
		id: "accounting.trial-balance.get",
		kind: "query",
		owner: OWNER,
		permission: "accounting.trial_balance.read",
		publicName: "getTrialBalance",
	},
	getLedgerAccountActivity: {
		id: "accounting.ledger_activity.get",
		kind: "query",
		owner: OWNER,
		permission: "accounting.ledger.read",
		publicName: "getLedgerAccountActivity",
	},
});
