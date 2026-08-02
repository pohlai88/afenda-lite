import { defineAccountingOperationRegistry } from "../../kernel/operations/define-registry";

const OWNER = "source-posting" as const;

export const ACCOUNTING_SOURCE_POSTING_COMMANDS =
	defineAccountingOperationRegistry({
		upsertPostingProfile: {
			id: "accounting.posting_profile.upsert",
			kind: "command",
			owner: OWNER,
			permission: "accounting.posting_rule.manage",
			publicName: "upsertPostingProfile",
		},
		postFinancialSourceEvent: {
			id: "accounting.source_event.post",
			kind: "command",
			owner: OWNER,
			permission: "accounting.journal.post",
			publicName: "postFinancialSourceEvent",
		},
		resolvePostingException: {
			id: "accounting.exception.resolve",
			kind: "command",
			owner: OWNER,
			permission: "accounting.exception.manage",
			publicName: "resolvePostingException",
		},
	});

export const ACCOUNTING_SOURCE_POSTING_QUERIES =
	defineAccountingOperationRegistry({
		getSourcePostingTrace: {
			id: "accounting.source_trace.get",
			kind: "query",
			owner: OWNER,
			permission: "accounting.journal.read",
			publicName: "getSourcePostingTrace",
		},
		listPostingExceptions: {
			id: "accounting.exceptions.list",
			kind: "query",
			owner: OWNER,
			permission: "accounting.exception.read",
			publicName: "listPostingExceptions",
		},
	});
