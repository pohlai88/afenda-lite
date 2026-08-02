import type { Result } from "@afenda/errors";

export type AccountingPeriodStatus = "open" | "soft_closed" | "closed";
export type JournalStatus = "draft" | "posted" | "reversed";
export type JournalType =
	| "manual"
	| "receivables"
	| "payables"
	| "payments"
	| "inventory"
	| "opening_balance"
	| "adjustment"
	| "reversal"
	| "system";
export type AccountType =
	| "asset"
	| "liability"
	| "equity"
	| "revenue"
	| "expense";
export type NormalBalance = "debit" | "credit";
export type PostingExceptionStatus = "open" | "resolved" | "retrying";

export interface AccountingPeriod {
	closedAt: Date | null;
	closedBy: string | null;
	closeReason: string | null;
	code: string;
	createdAt: Date;
	endDate: string;
	id: string;
	normalizedCode: string;
	openedBy: string;
	organizationId: string;
	reopenedAt: Date | null;
	reopenedBy: string | null;
	reopenReason: string | null;
	softClosed: boolean;
	softClosedAt: Date | null;
	softClosedBy: string | null;
	startDate: string;
	status: AccountingPeriodStatus;
	updatedAt: Date;
	version: number;
}

export interface ChartOfAccounts {
	code: string;
	createdAt: Date;
	createdBy: string;
	id: string;
	name: string;
	organizationId: string;
	status: "active" | "inactive";
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface LedgerAccount {
	accountType: AccountType;
	chartOfAccountId: string;
	code: string;
	createdAt: Date;
	createdBy: string;
	id: string;
	isControl: boolean;
	name: string;
	normalBalance: NormalBalance;
	normalizedCode: string;
	organizationId: string;
	status: "active" | "inactive";
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface AccountRoleMapping {
	accountRole: string;
	createdAt: Date;
	createdBy: string;
	id: string;
	ledgerAccountId: string;
	organizationId: string;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface PostingProfile {
	code: string;
	createdAt: Date;
	createdBy: string;
	eventType: string;
	id: string;
	lines: PostingProfileLine[];
	organizationId: string;
	status: "active" | "inactive";
	updatedAt: Date;
	updatedBy: string;
	version: number;
	versionNumber: number;
}

export interface PostingProfileLine {
	accountRole: string;
	id: string;
	lineNo: number;
	side: NormalBalance;
}

export interface JournalLine {
	accountCode: string;
	createdAt: Date;
	createdBy: string;
	credit: string;
	debit: string;
	description: string | null;
	id: string;
	journalId: string;
	ledgerAccountId: string | null;
	lineNumber: number;
	organizationId: string;
}

export interface LedgerPosting {
	accountCode: string;
	credit: string;
	debit: string;
	id: string;
	journalId: string;
	journalLineId: string;
	ledgerAccountId: string | null;
	organizationId: string;
	periodId: string;
	postedAt: Date;
	postedBy: string;
}

export interface Journal {
	code: string;
	createdAt: Date;
	createdBy: string;
	currencyCode: string;
	description: string | null;
	id: string;
	journalType: JournalType;
	lines: JournalLine[];
	normalizedCode: string;
	organizationId: string;
	periodId: string;
	postedAt: Date | null;
	postedBy: string | null;
	postings: LedgerPosting[];
	reversalOfJournalId: string | null;
	reversedAt: Date | null;
	reversedBy: string | null;
	reversedByJournalId: string | null;
	status: JournalStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface TrialBalanceRow {
	accountCode: string;
	balance: string;
	totalCredit: string;
	totalDebit: string;
}

export interface SourcePostingLink {
	causationId: string | null;
	createdAt: Date;
	createdBy: string;
	id: string;
	journalId: string;
	organizationId: string;
	postingRuleId: string;
	postingRuleVersion: number;
	sourceAggregateId: string;
	sourceEventId: string;
	sourceEventVersion: number;
	sourceModule: string;
}

export interface SourcePostingTrace {
	journal: Journal;
	link: SourcePostingLink;
}

export interface PostingException {
	createdAt: Date;
	createdBy: string;
	id: string;
	message: string;
	organizationId: string;
	payload: unknown;
	postingRuleCode: string | null;
	reasonCode: string;
	resolutionNote: string | null;
	resolvedAt: Date | null;
	resolvedBy: string | null;
	sourceAggregateId: string;
	sourceEventId: string;
	sourceEventVersion: number;
	sourceModule: string;
	status: PostingExceptionStatus;
	updatedAt: Date;
	updatedBy: string;
	version: number;
}

export interface LedgerAccountActivityRow {
	accountCode: string;
	credit: string;
	debit: string;
	journalCode: string;
	journalId: string;
	periodId: string;
	postedAt: Date;
}

export type AccountingEventType =
	| "accounting.journal.posted.v1"
	| "accounting.journal.reversed.v1";

export interface AccountingEffects {
	emit: (event: {
		type: AccountingEventType;
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		payload: Record<string, unknown>;
	}) => Promise<Result<void>>;
}
