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

export interface AccountingStore {
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
	closePeriod: (record: {
		organizationId: string;
		periodId: string;
		expectedVersion: number;
		closeReason: string | null;
		actorUserId: string;
	}) => Promise<Result<AccountingPeriod>>;
	createChartOfAccounts: (record: {
		organizationId: string;
		code: string;
		name: string;
		actorUserId: string;
	}) => Promise<Result<ChartOfAccounts>>;
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
	createLedgerAccount: (record: {
		organizationId: string;
		chartOfAccountId: string;
		code: string;
		normalizedCode: string;
		name: string;
		accountType: AccountType;
		normalBalance: NormalBalance;
		isControl: boolean;
		actorUserId: string;
	}) => Promise<Result<LedgerAccount>>;
	createPostingException: (record: {
		organizationId: string;
		sourceModule: string;
		sourceAggregateId: string;
		sourceEventId: string;
		sourceEventVersion: number;
		postingRuleCode: string | null;
		reasonCode: string;
		message: string;
		payload: unknown;
		actorUserId: string;
	}) => Promise<Result<PostingException>>;
	createSourcePostingLink: (record: {
		organizationId: string;
		sourceModule: string;
		sourceAggregateId: string;
		sourceEventId: string;
		sourceEventVersion: number;
		postingRuleId: string;
		postingRuleVersion: number;
		journalId: string;
		causationId: string | null;
		actorUserId: string;
	}) => Promise<Result<SourcePostingLink>>;
	deactivateLedgerAccount: (record: {
		organizationId: string;
		id: string;
		expectedVersion: number;
		actorUserId: string;
	}) => Promise<Result<LedgerAccount>>;
	findSourcePostingLink: (record: {
		organizationId: string;
		sourceModule: string;
		sourceAggregateId: string;
		sourceEventId: string;
		sourceEventVersion: number;
		postingRuleVersion: number;
	}) => Promise<Result<SourcePostingLink | null>>;
	getActivePostingProfile: (
		organizationId: string,
		code: string,
	) => Promise<Result<PostingProfile | null>>;
	getById: (
		organizationId: string,
		id: string,
	) => Promise<Result<Journal | null>>;
	getLedgerAccountActivity: (filter: {
		organizationId: string;
		accountCode?: string | undefined;
		periodId?: string | undefined;
	}) => Promise<Result<LedgerAccountActivityRow[]>>;
	getSourcePostingTrace: (filter: {
		organizationId: string;
		journalId?: string | undefined;
		sourceModule?: string | undefined;
		sourceAggregateId?: string | undefined;
		sourceEventId?: string | undefined;
	}) => Promise<Result<SourcePostingTrace[]>>;
	list: (filter: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: JournalStatus | undefined;
		periodId?: string | undefined;
	}) => Promise<Result<Journal[]>>;
	listLedgerAccounts: (filter: {
		organizationId: string;
		chartOfAccountId?: string | undefined;
		status?: "active" | "inactive" | undefined;
	}) => Promise<Result<LedgerAccount[]>>;
	listPostingExceptions: (filter: {
		organizationId: string;
		status?: PostingExceptionStatus | undefined;
	}) => Promise<Result<PostingException[]>>;
	mapAccountRole: (record: {
		organizationId: string;
		accountRole: string;
		ledgerAccountId: string;
		actorUserId: string;
	}) => Promise<Result<AccountRoleMapping>>;
	openPeriod: (record: {
		organizationId: string;
		code: string;
		normalizedCode: string;
		startDate: string;
		endDate: string;
		actorUserId: string;
	}) => Promise<Result<AccountingPeriod>>;
	post: (record: {
		organizationId: string;
		journalId: string;
		expectedVersion: number;
		actorUserId: string;
		correlationId: string;
		effects: AccountingEffects;
	}) => Promise<Result<Journal>>;
	reopenPeriod: (record: {
		organizationId: string;
		periodId: string;
		expectedVersion: number;
		reason: string;
		actorUserId: string;
	}) => Promise<Result<AccountingPeriod>>;
	resolveAccountRole: (
		organizationId: string,
		accountRole: string,
	) => Promise<Result<AccountRoleMapping | null>>;
	resolveLedgerAccountByCode: (
		organizationId: string,
		normalizedCode: string,
	) => Promise<Result<LedgerAccount | null>>;
	resolvePostingException: (record: {
		organizationId: string;
		id: string;
		resolutionNote: string;
		expectedVersion: number;
		actorUserId: string;
	}) => Promise<Result<PostingException>>;
	reverse: (record: {
		organizationId: string;
		journalId: string;
		expectedVersion: number;
		reason: string;
		actorUserId: string;
		correlationId: string;
		effects: AccountingEffects;
	}) => Promise<Result<Journal>>;
	softClosePeriod: (record: {
		organizationId: string;
		periodId: string;
		expectedVersion: number;
		actorUserId: string;
	}) => Promise<Result<AccountingPeriod>>;
	trialBalance: (filter: {
		organizationId: string;
		periodId?: string | undefined;
	}) => Promise<Result<TrialBalanceRow[]>>;
	updateLedgerAccount: (record: {
		organizationId: string;
		id: string;
		name: string;
		accountType: AccountType;
		normalBalance: NormalBalance;
		isControl: boolean;
		expectedVersion: number;
		actorUserId: string;
	}) => Promise<Result<LedgerAccount>>;
	upsertPostingProfile: (record: {
		organizationId: string;
		code: string;
		eventType: string;
		versionNumber: number;
		lines: Array<{ lineNo: number; side: NormalBalance; accountRole: string }>;
		actorUserId: string;
	}) => Promise<Result<PostingProfile>>;
}

export interface AccountingCommandOptions {
	authorization?: import("./authorization").AccountingAuthorizationPort;
	effects?: AccountingEffects;
	store?: AccountingStore;
}
