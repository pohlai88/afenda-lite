import type {
	AccountingPeriod,
	AccountRoleMapping,
	ChartOfAccounts,
	Journal,
	LedgerAccount,
	PostingException,
	PostingProfile,
	SourcePostingLink,
} from "../contracts/domain";

/**
 * Shared in-memory domain state for the parity adapter.
 * Package-wide kernel primitive: several feature memory slices operate on the
 * same collections, so the state shape and lookup helpers have one owner here.
 */
export interface MemoryAccountingState {
	accountRoleMappings: AccountRoleMapping[];
	chartOfAccounts: ChartOfAccounts[];
	journals: Journal[];
	ledgerAccounts: LedgerAccount[];
	periods: AccountingPeriod[];
	postingExceptions: PostingException[];
	postingProfiles: PostingProfile[];
	sourcePostingLinks: SourcePostingLink[];
}

export function createMemoryAccountingState(): MemoryAccountingState {
	return {
		accountRoleMappings: [],
		chartOfAccounts: [],
		journals: [],
		ledgerAccounts: [],
		periods: [],
		postingExceptions: [],
		postingProfiles: [],
		sourcePostingLinks: [],
	};
}

export function findPeriod(
	state: MemoryAccountingState,
	organizationId: string,
	periodId: string,
): AccountingPeriod | undefined {
	return state.periods.find(
		(p) => p.organizationId === organizationId && p.id === periodId,
	);
}

export function findJournal(
	state: MemoryAccountingState,
	organizationId: string,
	journalId: string,
): Journal | undefined {
	return state.journals.find(
		(j) => j.organizationId === organizationId && j.id === journalId,
	);
}
