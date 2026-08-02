import "server-only";

export type { DrizzleAccountingStore } from "./composition/adapters/drizzle";
export { createDrizzleAccountingStore } from "./composition/adapters/drizzle";
export type { AccountingStore } from "./composition/store/contract";
export {
	addJournalLine,
	closeAccountingPeriod,
	createChartOfAccounts,
	createDraftJournal,
	createLedgerAccount,
	deactivateLedgerAccount,
	getJournalById,
	getLedgerAccountActivity,
	getSourcePostingTrace,
	getTrialBalance,
	listJournals,
	listLedgerAccounts,
	listPostingExceptions,
	mapAccountRole,
	openAccountingPeriod,
	postFinancialSourceEvent,
	postJournal,
	reopenAccountingPeriod,
	resolvePostingException,
	reverseJournal,
	softCloseAccountingPeriod,
	updateLedgerAccount,
	upsertPostingProfile,
} from "./facade/capabilities";
export type { AccountingCommandOptions } from "./facade/contracts";
export type {
	AccountingEffects,
	AccountingEventType,
	AccountingPeriod,
	AccountingPeriodStatus,
	AccountRoleMapping,
	AccountType,
	ChartOfAccounts,
	Journal,
	JournalLine,
	JournalStatus,
	JournalType,
	LedgerAccount,
	LedgerAccountActivityRow,
	LedgerPosting,
	NormalBalance,
	PostingException,
	PostingExceptionStatus,
	PostingProfile,
	PostingProfileLine,
	SourcePostingLink,
	SourcePostingTrace,
	TrialBalanceRow,
} from "./kernel/contracts/domain";
export {
	type AccountingAuthorizationPort,
	type AccountingPermission,
	requireAccountingPermission,
} from "./kernel/execution/authorization";
export { createMemoryStore } from "./testing/memory-store";
