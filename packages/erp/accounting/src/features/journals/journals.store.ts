import type { Result } from "@afenda/errors";

import type {
	AccountingEffects,
	Journal,
	JournalLine,
	JournalStatus,
	JournalType,
	LedgerAccountActivityRow,
	TrialBalanceRow,
} from "../../kernel/contracts/domain";

export interface AccountingJournalsStore {
	addLine: (record: {
		organizationId: string;
		journalId: string;
		accountCode: string;
		description: string | null;
		ledgerAccountId: string | null;
		debit: string;
		credit: string;
		actorUserId: string;
	}) => Promise<Result<JournalLine>>;
	createDraft: (record: {
		organizationId: string;
		periodId: string;
		code: string;
		normalizedCode: string;
		currencyCode: string;
		description: string | null;
		journalType: JournalType;
		actorUserId: string;
	}) => Promise<Result<Journal>>;
	getById: (
		organizationId: string,
		id: string,
	) => Promise<Result<Journal | null>>;
	getLedgerAccountActivity: (filter: {
		organizationId: string;
		accountCode?: string | undefined;
		periodId?: string | undefined;
	}) => Promise<Result<LedgerAccountActivityRow[]>>;
	list: (filter: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: JournalStatus | undefined;
		periodId?: string | undefined;
	}) => Promise<Result<Journal[]>>;
	post: (record: {
		organizationId: string;
		journalId: string;
		expectedVersion: number;
		actorUserId: string;
		correlationId: string;
		effects: AccountingEffects;
	}) => Promise<Result<Journal>>;
	reverse: (record: {
		organizationId: string;
		journalId: string;
		expectedVersion: number;
		reason: string;
		actorUserId: string;
		correlationId: string;
		effects: AccountingEffects;
	}) => Promise<Result<Journal>>;
	trialBalance: (filter: {
		organizationId: string;
		periodId?: string | undefined;
	}) => Promise<Result<TrialBalanceRow[]>>;
}
