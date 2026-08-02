import type { Result } from "@afenda/errors";
import { errorResult } from "@afenda/errors";
import type { z } from "zod";

import type {
	AccountingEffects,
	Journal,
	JournalLine,
	LedgerAccount,
	LedgerAccountActivityRow,
	TrialBalanceRow,
} from "../../kernel/contracts/domain";
import {
	type AccountingAuthorizationPort,
	requireAccountingPermission,
} from "../../kernel/execution/authorization";
import {
	failInvalidAccountingInput,
	normalize,
} from "../../kernel/validation/parse-input";
import {
	AddJournalLineInput,
	CreateDraftJournalInput,
	GetJournalByIdInput,
	GetLedgerAccountActivityInput,
	GetTrialBalanceInput,
	ListJournalsInput,
	PostJournalInput,
	ReverseJournalInput,
} from "./journals.schema";
import type { AccountingJournalsStore } from "./journals.store";

export interface JournalsOperationDeps {
	authorization: AccountingAuthorizationPort;
	effects: AccountingEffects;
	/** Narrow ledger-master capability: resolve an account by normalized code. */
	resolveLedgerAccountByCode: (
		organizationId: string,
		normalizedCode: string,
	) => Promise<Result<LedgerAccount | null>>;
	store: AccountingJournalsStore;
}

export async function createDraftJournalOperation(
	input: z.infer<typeof CreateDraftJournalInput>,
	deps: JournalsOperationDeps,
): Promise<Result<Journal>> {
	const parsed = CreateDraftJournalInput.safeParse(input);
	if (!parsed.success) {
		return failInvalidAccountingInput(parsed.error);
	}
	const authResult = await requireAccountingPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.journal.create",
	});
	if (!authResult.ok) {
		return authResult;
	}
	return deps.store.createDraft({
		organizationId: parsed.data.organizationId,
		periodId: parsed.data.periodId,
		code: parsed.data.code,
		normalizedCode: normalize(parsed.data.code),
		currencyCode: parsed.data.currencyCode,
		description: parsed.data.description,
		journalType: parsed.data.journalType,
		actorUserId: parsed.data.actorUserId,
	});
}

export async function addJournalLineOperation(
	input: z.infer<typeof AddJournalLineInput>,
	deps: JournalsOperationDeps,
): Promise<Result<JournalLine>> {
	const parsed = AddJournalLineInput.safeParse(input);
	if (!parsed.success) {
		return failInvalidAccountingInput(parsed.error);
	}
	const authResult = await requireAccountingPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.journal.create",
	});
	if (!authResult.ok) {
		return authResult;
	}
	const normalizedCode = normalize(parsed.data.accountCode);
	const accountResult = await deps.resolveLedgerAccountByCode(
		parsed.data.organizationId,
		normalizedCode,
	);
	if (!accountResult.ok) {
		return accountResult;
	}
	let ledgerAccountId: string | null = null;
	if (accountResult.data) {
		if (accountResult.data.status !== "active") {
			return errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "The submitted data is invalid",
			});
		}
		ledgerAccountId = accountResult.data.id;
	}
	return deps.store.addLine({
		organizationId: parsed.data.organizationId,
		journalId: parsed.data.journalId,
		accountCode: parsed.data.accountCode,
		description: parsed.data.description,
		ledgerAccountId,
		debit: parsed.data.debit,
		credit: parsed.data.credit,
		actorUserId: parsed.data.actorUserId,
	});
}

export async function postJournalOperation(
	input: z.infer<typeof PostJournalInput>,
	deps: JournalsOperationDeps,
): Promise<Result<Journal>> {
	const parsed = PostJournalInput.safeParse(input);
	if (!parsed.success) {
		return failInvalidAccountingInput(parsed.error);
	}
	const authResult = await requireAccountingPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.journal.post",
	});
	if (!authResult.ok) {
		return authResult;
	}
	return deps.store.post({
		organizationId: parsed.data.organizationId,
		journalId: parsed.data.journalId,
		expectedVersion: parsed.data.expectedVersion,
		actorUserId: parsed.data.actorUserId,
		correlationId: parsed.data.correlationId,
		effects: deps.effects,
	});
}

export async function reverseJournalOperation(
	input: z.infer<typeof ReverseJournalInput>,
	deps: JournalsOperationDeps,
): Promise<Result<Journal>> {
	const parsed = ReverseJournalInput.safeParse(input);
	if (!parsed.success) {
		return failInvalidAccountingInput(parsed.error);
	}
	const authResult = await requireAccountingPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.journal.reverse",
	});
	if (!authResult.ok) {
		return authResult;
	}
	return deps.store.reverse({
		organizationId: parsed.data.organizationId,
		journalId: parsed.data.journalId,
		expectedVersion: parsed.data.expectedVersion,
		reason: parsed.data.reason,
		actorUserId: parsed.data.actorUserId,
		correlationId: parsed.data.correlationId,
		effects: deps.effects,
	});
}

export async function getJournalByIdOperation(
	input: z.infer<typeof GetJournalByIdInput>,
	deps: JournalsOperationDeps,
): Promise<Result<Journal | null>> {
	const parsed = GetJournalByIdInput.safeParse(input);
	if (!parsed.success) {
		return failInvalidAccountingInput(parsed.error);
	}
	const authResult = await requireAccountingPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.journal.read",
	});
	if (!authResult.ok) {
		return authResult;
	}
	return deps.store.getById(parsed.data.organizationId, parsed.data.journalId);
}

export async function listJournalsOperation(
	input: z.infer<typeof ListJournalsInput>,
	deps: JournalsOperationDeps,
): Promise<Result<Journal[]>> {
	const parsed = ListJournalsInput.safeParse(input);
	if (!parsed.success) {
		return failInvalidAccountingInput(parsed.error);
	}
	const authResult = await requireAccountingPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.journal.read",
	});
	if (!authResult.ok) {
		return authResult;
	}
	return deps.store.list({
		organizationId: parsed.data.organizationId,
		page: parsed.data.page,
		pageSize: parsed.data.pageSize,
		status: parsed.data.status,
		periodId: parsed.data.periodId,
	});
}

export async function getTrialBalanceOperation(
	input: z.infer<typeof GetTrialBalanceInput>,
	deps: JournalsOperationDeps,
): Promise<Result<TrialBalanceRow[]>> {
	const parsed = GetTrialBalanceInput.safeParse(input);
	if (!parsed.success) {
		return failInvalidAccountingInput(parsed.error);
	}
	const authResult = await requireAccountingPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.trial_balance.read",
	});
	if (!authResult.ok) {
		return authResult;
	}
	return deps.store.trialBalance({
		organizationId: parsed.data.organizationId,
		periodId: parsed.data.periodId,
	});
}

export async function getLedgerAccountActivityOperation(
	input: z.infer<typeof GetLedgerAccountActivityInput>,
	deps: JournalsOperationDeps,
): Promise<Result<LedgerAccountActivityRow[]>> {
	const parsed = GetLedgerAccountActivityInput.safeParse(input);
	if (!parsed.success) {
		return failInvalidAccountingInput(parsed.error);
	}
	const authResult = await requireAccountingPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.ledger.read",
	});
	if (!authResult.ok) {
		return authResult;
	}
	return deps.store.getLedgerAccountActivity({
		organizationId: parsed.data.organizationId,
		accountCode: parsed.data.accountCode,
		periodId: parsed.data.periodId,
	});
}
