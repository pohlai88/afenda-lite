import type { Result } from "@afenda/errors/result";

import type { AccountingAuthorizationPort } from "./authorization";

export type AccountingPeriodStatus = "open" | "closed";
export type JournalStatus = "draft" | "posted" | "reversed";

export type AccountingPeriod = {
	id: string;
	organizationId: string;
	code: string;
	normalizedCode: string;
	startDate: string;
	endDate: string;
	status: AccountingPeriodStatus;
	version: number;
	openedBy: string;
	closedBy: string | null;
	closedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
};

export type JournalLine = {
	id: string;
	organizationId: string;
	journalId: string;
	lineNumber: number;
	accountCode: string;
	description: string | null;
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
		actorUserId: string;
	}): Promise<Result<Journal>>;
	addLine(record: {
		organizationId: string;
		journalId: string;
		accountCode: string;
		description: string | null;
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
	closePeriod(record: {
		organizationId: string;
		periodId: string;
		expectedVersion: number;
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
};

export type AccountingCommandOptions = {
	store?: AccountingStore;
	authorization?: AccountingAuthorizationPort;
	effects?: AccountingEffects;
};
