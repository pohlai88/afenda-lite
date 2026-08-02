import type { Result } from "@afenda/errors";
import type { z } from "zod";
import {
	addJournalLineOperation,
	createDraftJournalOperation,
	getJournalByIdOperation,
	getLedgerAccountActivityOperation,
	getTrialBalanceOperation,
	type JournalsOperationDeps,
	listJournalsOperation,
	postJournalOperation,
	reverseJournalOperation,
} from "../features/journals/journals.operations";
import type {
	AddJournalLineInput,
	CreateDraftJournalInput,
	GetJournalByIdInput,
	GetLedgerAccountActivityInput,
	GetTrialBalanceInput,
	ListJournalsInput,
	PostJournalInput,
	ReverseJournalInput,
} from "../features/journals/journals.schema";
import {
	createChartOfAccountsOperation,
	createLedgerAccountOperation,
	deactivateLedgerAccountOperation,
	type LedgerMasterOperationDeps,
	listLedgerAccountsOperation,
	mapAccountRoleOperation,
	updateLedgerAccountOperation,
} from "../features/ledger-master/ledger-master.operations";
import type {
	CreateChartOfAccountsInput,
	CreateLedgerAccountInput,
	DeactivateLedgerAccountInput,
	ListLedgerAccountsInput,
	MapAccountRoleInput,
	UpdateLedgerAccountInput,
} from "../features/ledger-master/ledger-master.schema";
import {
	closeAccountingPeriodOperation,
	openAccountingPeriodOperation,
	type PeriodsOperationDeps,
	reopenAccountingPeriodOperation,
	softCloseAccountingPeriodOperation,
} from "../features/periods/periods.operations";
import type {
	CloseAccountingPeriodInput,
	OpenAccountingPeriodInput,
	ReopenAccountingPeriodInput,
	SoftCloseAccountingPeriodInput,
} from "../features/periods/periods.schema";
import {
	getSourcePostingTraceOperation,
	listPostingExceptionsOperation,
	postFinancialSourceEventOperation,
	resolvePostingExceptionOperation,
	type SourcePostingOperationDeps,
	upsertPostingProfileOperation,
} from "../features/source-posting/source-posting.operations";
import type {
	GetSourcePostingTraceInput,
	ListPostingExceptionsInput,
	PostFinancialSourceEventInput,
	ResolvePostingExceptionInput,
	UpsertPostingProfileInput,
} from "../features/source-posting/source-posting.schema";
import type {
	AccountingPeriod,
	AccountRoleMapping,
	ChartOfAccounts,
	Journal,
	JournalLine,
	LedgerAccount,
	LedgerAccountActivityRow,
	PostingException,
	PostingProfile,
	SourcePostingTrace,
	TrialBalanceRow,
} from "../kernel/contracts/domain";
import { type AccountingCommandOptions, resolveOpts } from "./contracts";

type Resolved = Extract<ReturnType<typeof resolveOpts>, { ok: true }>["data"];

function journalsDeps(resolved: Resolved): JournalsOperationDeps {
	return {
		authorization: resolved.authorization,
		effects: resolved.effects,
		resolveLedgerAccountByCode: resolved.store.resolveLedgerAccountByCode,
		store: resolved.store,
	};
}

function ledgerDeps(resolved: Resolved): LedgerMasterOperationDeps {
	return {
		authorization: resolved.authorization,
		store: resolved.store,
	};
}

function periodsDeps(resolved: Resolved): PeriodsOperationDeps {
	return {
		authorization: resolved.authorization,
		store: resolved.store,
	};
}

function sourcePostingDeps(resolved: Resolved): SourcePostingOperationDeps {
	return {
		authorization: resolved.authorization,
		effects: resolved.effects,
		journals: resolved.store,
		ledger: resolved.store,
		store: resolved.store,
	};
}

export function createChartOfAccounts(
	input: z.infer<typeof CreateChartOfAccountsInput>,
	options?: AccountingCommandOptions,
): Promise<Result<ChartOfAccounts>> {
	const opts = resolveOpts(options);
	if (!opts.ok) {
		return Promise.resolve(opts);
	}
	return createChartOfAccountsOperation(input, ledgerDeps(opts.data));
}

export function createLedgerAccount(
	input: z.infer<typeof CreateLedgerAccountInput>,
	options?: AccountingCommandOptions,
): Promise<Result<LedgerAccount>> {
	const opts = resolveOpts(options);
	if (!opts.ok) {
		return Promise.resolve(opts);
	}
	return createLedgerAccountOperation(input, ledgerDeps(opts.data));
}

export function updateLedgerAccount(
	input: z.infer<typeof UpdateLedgerAccountInput>,
	options?: AccountingCommandOptions,
): Promise<Result<LedgerAccount>> {
	const opts = resolveOpts(options);
	if (!opts.ok) {
		return Promise.resolve(opts);
	}
	return updateLedgerAccountOperation(input, ledgerDeps(opts.data));
}

export function deactivateLedgerAccount(
	input: z.infer<typeof DeactivateLedgerAccountInput>,
	options?: AccountingCommandOptions,
): Promise<Result<LedgerAccount>> {
	const opts = resolveOpts(options);
	if (!opts.ok) {
		return Promise.resolve(opts);
	}
	return deactivateLedgerAccountOperation(input, ledgerDeps(opts.data));
}

export function listLedgerAccounts(
	input: z.infer<typeof ListLedgerAccountsInput>,
	options?: AccountingCommandOptions,
): Promise<Result<LedgerAccount[]>> {
	const opts = resolveOpts(options);
	if (!opts.ok) {
		return Promise.resolve(opts);
	}
	return listLedgerAccountsOperation(input, ledgerDeps(opts.data));
}

export function mapAccountRole(
	input: z.infer<typeof MapAccountRoleInput>,
	options?: AccountingCommandOptions,
): Promise<Result<AccountRoleMapping>> {
	const opts = resolveOpts(options);
	if (!opts.ok) {
		return Promise.resolve(opts);
	}
	return mapAccountRoleOperation(input, ledgerDeps(opts.data));
}

export function upsertPostingProfile(
	input: z.infer<typeof UpsertPostingProfileInput>,
	options?: AccountingCommandOptions,
): Promise<Result<PostingProfile>> {
	const opts = resolveOpts(options);
	if (!opts.ok) {
		return Promise.resolve(opts);
	}
	return upsertPostingProfileOperation(input, sourcePostingDeps(opts.data));
}

export function createDraftJournal(
	input: z.infer<typeof CreateDraftJournalInput>,
	options?: AccountingCommandOptions,
): Promise<Result<Journal>> {
	const opts = resolveOpts(options);
	if (!opts.ok) {
		return Promise.resolve(opts);
	}
	return createDraftJournalOperation(input, journalsDeps(opts.data));
}

export function addJournalLine(
	input: z.infer<typeof AddJournalLineInput>,
	options?: AccountingCommandOptions,
): Promise<Result<JournalLine>> {
	const opts = resolveOpts(options);
	if (!opts.ok) {
		return Promise.resolve(opts);
	}
	return addJournalLineOperation(input, journalsDeps(opts.data));
}

export function postJournal(
	input: z.infer<typeof PostJournalInput>,
	options?: AccountingCommandOptions,
): Promise<Result<Journal>> {
	const opts = resolveOpts(options);
	if (!opts.ok) {
		return Promise.resolve(opts);
	}
	return postJournalOperation(input, journalsDeps(opts.data));
}

export function reverseJournal(
	input: z.infer<typeof ReverseJournalInput>,
	options?: AccountingCommandOptions,
): Promise<Result<Journal>> {
	const opts = resolveOpts(options);
	if (!opts.ok) {
		return Promise.resolve(opts);
	}
	return reverseJournalOperation(input, journalsDeps(opts.data));
}

export function openAccountingPeriod(
	input: z.infer<typeof OpenAccountingPeriodInput>,
	options?: AccountingCommandOptions,
): Promise<Result<AccountingPeriod>> {
	const opts = resolveOpts(options);
	if (!opts.ok) {
		return Promise.resolve(opts);
	}
	return openAccountingPeriodOperation(input, periodsDeps(opts.data));
}

export function softCloseAccountingPeriod(
	input: z.infer<typeof SoftCloseAccountingPeriodInput>,
	options?: AccountingCommandOptions,
): Promise<Result<AccountingPeriod>> {
	const opts = resolveOpts(options);
	if (!opts.ok) {
		return Promise.resolve(opts);
	}
	return softCloseAccountingPeriodOperation(input, periodsDeps(opts.data));
}

export function closeAccountingPeriod(
	input: z.infer<typeof CloseAccountingPeriodInput>,
	options?: AccountingCommandOptions,
): Promise<Result<AccountingPeriod>> {
	const opts = resolveOpts(options);
	if (!opts.ok) {
		return Promise.resolve(opts);
	}
	return closeAccountingPeriodOperation(input, periodsDeps(opts.data));
}

export function reopenAccountingPeriod(
	input: z.infer<typeof ReopenAccountingPeriodInput>,
	options?: AccountingCommandOptions,
): Promise<Result<AccountingPeriod>> {
	const opts = resolveOpts(options);
	if (!opts.ok) {
		return Promise.resolve(opts);
	}
	return reopenAccountingPeriodOperation(input, periodsDeps(opts.data));
}

export function postFinancialSourceEvent(
	input: z.infer<typeof PostFinancialSourceEventInput>,
	options?: AccountingCommandOptions,
): Promise<Result<Journal>> {
	const opts = resolveOpts(options);
	if (!opts.ok) {
		return Promise.resolve(opts);
	}
	return postFinancialSourceEventOperation(input, sourcePostingDeps(opts.data));
}

export function getJournalById(
	input: z.infer<typeof GetJournalByIdInput>,
	options?: AccountingCommandOptions,
): Promise<Result<Journal | null>> {
	const opts = resolveOpts(options);
	if (!opts.ok) {
		return Promise.resolve(opts);
	}
	return getJournalByIdOperation(input, journalsDeps(opts.data));
}

export function listJournals(
	input: z.infer<typeof ListJournalsInput>,
	options?: AccountingCommandOptions,
): Promise<Result<Journal[]>> {
	const opts = resolveOpts(options);
	if (!opts.ok) {
		return Promise.resolve(opts);
	}
	return listJournalsOperation(input, journalsDeps(opts.data));
}

export function getTrialBalance(
	input: z.infer<typeof GetTrialBalanceInput>,
	options?: AccountingCommandOptions,
): Promise<Result<TrialBalanceRow[]>> {
	const opts = resolveOpts(options);
	if (!opts.ok) {
		return Promise.resolve(opts);
	}
	return getTrialBalanceOperation(input, journalsDeps(opts.data));
}

export function getLedgerAccountActivity(
	input: z.infer<typeof GetLedgerAccountActivityInput>,
	options?: AccountingCommandOptions,
): Promise<Result<LedgerAccountActivityRow[]>> {
	const opts = resolveOpts(options);
	if (!opts.ok) {
		return Promise.resolve(opts);
	}
	return getLedgerAccountActivityOperation(input, journalsDeps(opts.data));
}

export function getSourcePostingTrace(
	input: z.infer<typeof GetSourcePostingTraceInput>,
	options?: AccountingCommandOptions,
): Promise<Result<SourcePostingTrace[]>> {
	const opts = resolveOpts(options);
	if (!opts.ok) {
		return Promise.resolve(opts);
	}
	return getSourcePostingTraceOperation(input, sourcePostingDeps(opts.data));
}

export function listPostingExceptions(
	input: z.infer<typeof ListPostingExceptionsInput>,
	options?: AccountingCommandOptions,
): Promise<Result<PostingException[]>> {
	const opts = resolveOpts(options);
	if (!opts.ok) {
		return Promise.resolve(opts);
	}
	return listPostingExceptionsOperation(input, sourcePostingDeps(opts.data));
}

export function resolvePostingException(
	input: z.infer<typeof ResolvePostingExceptionInput>,
	options?: AccountingCommandOptions,
): Promise<Result<PostingException>> {
	const opts = resolveOpts(options);
	if (!opts.ok) {
		return Promise.resolve(opts);
	}
	return resolvePostingExceptionOperation(input, sourcePostingDeps(opts.data));
}
