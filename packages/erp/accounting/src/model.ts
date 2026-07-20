import type { Result } from "@afenda/errors/result";

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
export type AccountType = "asset" | "liability" | "equity" | "revenue" | "expense";
export type NormalBalance = "debit" | "credit";
export type PostingExceptionStatus = "open" | "resolved" | "retrying";

export type AccountingPeriod = {
	id: string;
	organizationId: string;
	code: string;
	normalizedCode: string;
	startDate: string;
	endDate: string;
	status: AccountingPeriodStatus;
	softClosed: boolean;
	softClosedAt: Date | null;
	softClosedBy: string | null;
	reopenReason: string | null;
	reopenedAt: Date | null;
	reopenedBy: string | null;
	closeReason: string | null;
	version: number;
	openedBy: string;
	closedBy: string | null;
	closedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
};

export type ChartOfAccounts = {
	id: string;
	organizationId: string;
	code: string;
	name: string;
	status: "active" | "inactive";
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type LedgerAccount = {
	id: string;
	organizationId: string;
	chartOfAccountId: string;
	code: string;
	normalizedCode: string;
	name: string;
	accountType: AccountType;
	normalBalance: NormalBalance;
	isControl: boolean;
	status: "active" | "inactive";
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type AccountRoleMapping = {
	id: string;
	organizationId: string;
	accountRole: string;
	ledgerAccountId: string;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type PostingProfile = {
	id: string;
	organizationId: string;
	code: string;
	eventType: string;
	versionNumber: number;
	status: "active" | "inactive";
	version: number;
	lines: PostingProfileLine[];
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type PostingProfileLine = {
	id: string;
	lineNo: number;
	side: NormalBalance;
	accountRole: string;
};

export type JournalLine = {
	id: string;
	organizationId: string;
	journalId: string;
	lineNumber: number;
	accountCode: string;
	description: string | null;
	ledgerAccountId: string | null;
	debit: string;
	credit: string;
	createdBy: string;
	createdAt: Date;
};

export type LedgerPosting = {
	id: string;
	organizationId: string;
	journalId: string;
	journalLineId: string;
	periodId: string;
	accountCode: string;
	ledgerAccountId: string | null;
	debit: string;
	credit: string;
	postedAt: Date;
	postedBy: string;
};

export type Journal = {
	id: string;
	organizationId: string;
	periodId: string;
	code: string;
	normalizedCode: string;
	currencyCode: string;
	description: string | null;
	status: JournalStatus;
	journalType: JournalType;
	reversalOfJournalId: string | null;
	reversedByJournalId: string | null;
	version: number;
	createdBy: string;
	updatedBy: string;
	postedAt: Date | null;
	postedBy: string | null;
	reversedAt: Date | null;
	reversedBy: string | null;
	createdAt: Date;
	updatedAt: Date;
	lines: JournalLine[];
	postings: LedgerPosting[];
};

export type TrialBalanceRow = {
	accountCode: string;
	totalDebit: string;
	totalCredit: string;
	balance: string;
};

export type SourcePostingLink = {
	id: string;
	organizationId: string;
	sourceModule: string;
	sourceAggregateId: string;
	sourceEventId: string;
	sourceEventVersion: number;
	postingRuleId: string;
	postingRuleVersion: number;
	journalId: string;
	causationId: string | null;
	createdBy: string;
	createdAt: Date;
};

export type SourcePostingTrace = {
	link: SourcePostingLink;
	journal: Journal;
};

export type PostingException = {
	id: string;
	organizationId: string;
	sourceModule: string;
	sourceAggregateId: string;
	sourceEventId: string;
	sourceEventVersion: number;
	postingRuleCode: string | null;
	reasonCode: string;
	message: string;
	status: PostingExceptionStatus;
	resolutionNote: string | null;
	resolvedBy: string | null;
	resolvedAt: Date | null;
	payload: unknown;
	version: number;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
};

export type LedgerAccountActivityRow = {
	journalId: string;
	journalCode: string;
	periodId: string;
	accountCode: string;
	debit: string;
	credit: string;
	postedAt: Date;
};

export type AccountingEventType =
	| "accounting.journal.posted.v1"
	| "accounting.journal.reversed.v1";

export type AccountingEffects = {
	emit(event: {
		type: AccountingEventType;
		organizationId: string;
		actorUserId: string;
		correlationId: string;
		payload: Record<string, unknown>;
	}): Promise<Result<void>>;
};

export type AccountingStore = {
	createDraft(record: {
		organizationId: string;
		periodId: string;
		code: string;
		normalizedCode: string;
		currencyCode: string;
		description: string | null;
		journalType: JournalType;
		actorUserId: string;
	}): Promise<Result<Journal>>;
	addLine(record: {
		organizationId: string;
		journalId: string;
		accountCode: string;
		description: string | null;
		ledgerAccountId: string | null;
		debit: string;
		credit: string;
		actorUserId: string;
	}): Promise<Result<JournalLine>>;
	post(record: {
		organizationId: string;
		journalId: string;
		expectedVersion: number;
		actorUserId: string;
		correlationId: string;
		effects: AccountingEffects;
	}): Promise<Result<Journal>>;
	reverse(record: {
		organizationId: string;
		journalId: string;
		expectedVersion: number;
		reason: string;
		actorUserId: string;
		correlationId: string;
		effects: AccountingEffects;
	}): Promise<Result<Journal>>;
	openPeriod(record: {
		organizationId: string;
		code: string;
		normalizedCode: string;
		startDate: string;
		endDate: string;
		actorUserId: string;
	}): Promise<Result<AccountingPeriod>>;
	softClosePeriod(record: {
		organizationId: string;
		periodId: string;
		expectedVersion: number;
		actorUserId: string;
	}): Promise<Result<AccountingPeriod>>;
	closePeriod(record: {
		organizationId: string;
		periodId: string;
		expectedVersion: number;
		closeReason: string | null;
		actorUserId: string;
	}): Promise<Result<AccountingPeriod>>;
	reopenPeriod(record: {
		organizationId: string;
		periodId: string;
		expectedVersion: number;
		reason: string;
		actorUserId: string;
	}): Promise<Result<AccountingPeriod>>;
	getById(organizationId: string, id: string): Promise<Result<Journal | null>>;
	list(filter: {
		organizationId: string;
		page: number;
		pageSize: number;
		status?: JournalStatus;
		periodId?: string;
	}): Promise<Result<Journal[]>>;
	trialBalance(filter: {
		organizationId: string;
		periodId?: string;
	}): Promise<Result<TrialBalanceRow[]>>;
	createChartOfAccounts(record: {
		organizationId: string;
		code: string;
		name: string;
		actorUserId: string;
	}): Promise<Result<ChartOfAccounts>>;
	createLedgerAccount(record: {
		organizationId: string;
		chartOfAccountId: string;
		code: string;
		normalizedCode: string;
		name: string;
		accountType: AccountType;
		normalBalance: NormalBalance;
		isControl: boolean;
		actorUserId: string;
	}): Promise<Result<LedgerAccount>>;
	updateLedgerAccount(record: {
		organizationId: string;
		id: string;
		name: string;
		accountType: AccountType;
		normalBalance: NormalBalance;
		isControl: boolean;
		expectedVersion: number;
		actorUserId: string;
	}): Promise<Result<LedgerAccount>>;
	deactivateLedgerAccount(record: {
		organizationId: string;
		id: string;
		expectedVersion: number;
		actorUserId: string;
	}): Promise<Result<LedgerAccount>>;
	listLedgerAccounts(filter: {
		organizationId: string;
		chartOfAccountId?: string;
		status?: "active" | "inactive";
	}): Promise<Result<LedgerAccount[]>>;
	resolveLedgerAccountByCode(
		organizationId: string,
		normalizedCode: string,
	): Promise<Result<LedgerAccount | null>>;
	mapAccountRole(record: {
		organizationId: string;
		accountRole: string;
		ledgerAccountId: string;
		actorUserId: string;
	}): Promise<Result<AccountRoleMapping>>;
	resolveAccountRole(
		organizationId: string,
		accountRole: string,
	): Promise<Result<AccountRoleMapping | null>>;
	upsertPostingProfile(record: {
		organizationId: string;
		code: string;
		eventType: string;
		versionNumber: number;
		lines: Array<{ lineNo: number; side: NormalBalance; accountRole: string }>;
		actorUserId: string;
	}): Promise<Result<PostingProfile>>;
	getActivePostingProfile(
		organizationId: string,
		code: string,
	): Promise<Result<PostingProfile | null>>;
	findSourcePostingLink(record: {
		organizationId: string;
		sourceModule: string;
		sourceAggregateId: string;
		sourceEventId: string;
		sourceEventVersion: number;
		postingRuleVersion: number;
	}): Promise<Result<SourcePostingLink | null>>;
	createSourcePostingLink(record: {
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
	}): Promise<Result<SourcePostingLink>>;
	createPostingException(record: {
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
	}): Promise<Result<PostingException>>;
	listPostingExceptions(filter: {
		organizationId: string;
		status?: PostingExceptionStatus;
	}): Promise<Result<PostingException[]>>;
	resolvePostingException(record: {
		organizationId: string;
		id: string;
		resolutionNote: string;
		expectedVersion: number;
		actorUserId: string;
	}): Promise<Result<PostingException>>;
	getSourcePostingTrace(filter: {
		organizationId: string;
		journalId?: string;
		sourceModule?: string;
		sourceAggregateId?: string;
		sourceEventId?: string;
	}): Promise<Result<SourcePostingTrace[]>>;
	getLedgerAccountActivity(filter: {
		organizationId: string;
		accountCode?: string;
		periodId?: string;
	}): Promise<Result<LedgerAccountActivityRow[]>>;
};

export type AccountingCommandOptions = {
	store?: AccountingStore;
	authorization?: import("./authorization").AccountingAuthorizationPort;
	effects?: AccountingEffects;
};
