import { errorResult, type Result } from "@afenda/errors";
import type { z } from "zod";

import type {
	AccountingEffects,
	AccountRoleMapping,
	Journal,
	JournalLine,
	LedgerAccount,
	PostingException,
	PostingProfile,
	PostingProfileLine,
	SourcePostingTrace,
} from "../../kernel/contracts/domain";
import { collectSequentially } from "../../kernel/execution/async";
import {
	type AccountingAuthorizationPort,
	requireAccountingPermission,
} from "../../kernel/execution/authorization";
import {
	failInvalidAccountingInput,
	normalize,
} from "../../kernel/validation/parse-input";
import {
	GetSourcePostingTraceInput,
	ListPostingExceptionsInput,
	PostFinancialSourceEventInput,
	ResolvePostingExceptionInput,
	UpsertPostingProfileInput,
} from "./source-posting.schema";
import type { AccountingSourcePostingStore } from "./source-posting.store";

/** Narrow journals capability used by source-event orchestration. */
export interface SourcePostingJournalCapability {
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
		journalType: Journal["journalType"];
		actorUserId: string;
	}) => Promise<Result<Journal>>;
	getById: (
		organizationId: string,
		id: string,
	) => Promise<Result<Journal | null>>;
	post: (record: {
		organizationId: string;
		journalId: string;
		expectedVersion: number;
		actorUserId: string;
		correlationId: string;
		effects: AccountingEffects;
	}) => Promise<Result<Journal>>;
}

/** Narrow ledger-master capability used by role resolution. */
export interface SourcePostingLedgerCapability {
	listLedgerAccounts: (filter: {
		organizationId: string;
	}) => Promise<Result<LedgerAccount[]>>;
	resolveAccountRole: (
		organizationId: string,
		accountRole: string,
	) => Promise<Result<AccountRoleMapping | null>>;
}

export interface SourcePostingOperationDeps {
	authorization: AccountingAuthorizationPort;
	effects: AccountingEffects;
	journals: SourcePostingJournalCapability;
	ledger: SourcePostingLedgerCapability;
	store: AccountingSourcePostingStore;
}

const ACCOUNTING_POSTING_FAILED_EXCEPTION_MESSAGE =
	"Accounting posting failed for source event";

function journalTypeForSourceModule(
	sourceModule: string,
): Journal["journalType"] {
	switch (sourceModule) {
		case "receivables":
		case "payables":
		case "payments":
		case "inventory":
			return sourceModule;
		default:
			return "system";
	}
}

type FinancialSourceEvent = z.infer<typeof PostFinancialSourceEventInput>;

interface ResolvedPostingLine {
	accountCode: string;
	amount: string;
	ledgerAccountId: string;
	side: "debit" | "credit";
}

async function recordSourcePostingException(
	store: AccountingSourcePostingStore,
	event: FinancialSourceEvent,
	reasonCode: string,
	message: string,
): Promise<void> {
	await store.createPostingException({
		organizationId: event.organizationId,
		sourceModule: event.sourceModule,
		sourceAggregateId: event.sourceAggregateId,
		sourceEventId: event.sourceEventId,
		sourceEventVersion: event.sourceEventVersion,
		postingRuleCode: event.postingRuleCode,
		reasonCode,
		message,
		payload: event,
		actorUserId: event.actorUserId,
	});
}

async function resolvePostingProfileLine(
	deps: SourcePostingOperationDeps,
	event: FinancialSourceEvent,
	profileLine: PostingProfileLine,
): Promise<Result<ResolvedPostingLine>> {
	const amount = event.amountByRole[profileLine.accountRole];
	if (!amount) {
		const message = `No amount provided for account role '${profileLine.accountRole}'`;
		await recordSourcePostingException(
			deps.store,
			event,
			"MISSING_AMOUNT_FOR_ROLE",
			message,
		);
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
		});
	}

	const roleMapping = await deps.ledger.resolveAccountRole(
		event.organizationId,
		profileLine.accountRole,
	);
	if (!roleMapping.ok) {
		return roleMapping;
	}
	if (!roleMapping.data) {
		const message = `Account role '${profileLine.accountRole}' has no mapping`;
		await recordSourcePostingException(
			deps.store,
			event,
			"ACCOUNT_ROLE_NOT_MAPPED",
			message,
		);
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
		});
	}

	const ledgerAccounts = await deps.ledger.listLedgerAccounts({
		organizationId: event.organizationId,
	});
	if (!ledgerAccounts.ok) {
		return ledgerAccounts;
	}
	const targetAccount = ledgerAccounts.data.find(
		(account) => account.id === roleMapping.data?.ledgerAccountId,
	);
	if (targetAccount?.status !== "active") {
		const message = `Ledger account for role '${profileLine.accountRole}' is inactive or not found`;
		await recordSourcePostingException(
			deps.store,
			event,
			"LEDGER_ACCOUNT_INACTIVE",
			message,
		);
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "The submitted data is invalid",
		});
	}

	return errorResult.ok({
		accountCode: targetAccount.code,
		ledgerAccountId: targetAccount.id,
		side: profileLine.side,
		amount,
	});
}

export async function upsertPostingProfileOperation(
	input: z.infer<typeof UpsertPostingProfileInput>,
	deps: SourcePostingOperationDeps,
): Promise<Result<PostingProfile>> {
	const parsed = UpsertPostingProfileInput.safeParse(input);
	if (!parsed.success) {
		return failInvalidAccountingInput(parsed.error);
	}
	const authResult = await requireAccountingPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.posting_rule.manage",
	});
	if (!authResult.ok) {
		return authResult;
	}
	return deps.store.upsertPostingProfile({
		organizationId: parsed.data.organizationId,
		code: parsed.data.code,
		eventType: parsed.data.eventType,
		versionNumber: parsed.data.versionNumber,
		lines: parsed.data.lines,
		actorUserId: parsed.data.actorUserId,
	});
}

export async function postFinancialSourceEventOperation(
	input: z.infer<typeof PostFinancialSourceEventInput>,
	deps: SourcePostingOperationDeps,
): Promise<Result<Journal>> {
	const parsed = PostFinancialSourceEventInput.safeParse(input);
	if (!parsed.success) {
		return failInvalidAccountingInput(parsed.error);
	}

	// Mode B fix: this operation previously enforced no permission at all.
	// The module manifest has always declared accounting.source_event.post ->
	// accounting.journal.post; the code now enforces that declaration.
	const authResult = await requireAccountingPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.journal.post",
	});
	if (!authResult.ok) {
		return authResult;
	}

	const d = parsed.data;

	const profileResult = await deps.store.getActivePostingProfile(
		d.organizationId,
		d.postingRuleCode,
	);
	if (!profileResult.ok) {
		return profileResult;
	}
	if (!profileResult.data) {
		await deps.store.createPostingException({
			organizationId: d.organizationId,
			sourceModule: d.sourceModule,
			sourceAggregateId: d.sourceAggregateId,
			sourceEventId: d.sourceEventId,
			sourceEventVersion: d.sourceEventVersion,
			postingRuleCode: d.postingRuleCode,
			reasonCode: "POSTING_PROFILE_NOT_FOUND",
			message: `Active posting profile '${d.postingRuleCode}' not found`,
			payload: d,
			actorUserId: d.actorUserId,
		});
		return errorResult.fail("NOT_FOUND", {
			publicMessage: "The requested resource was not found",
		});
	}

	const profile = profileResult.data;

	const existingLink = await deps.store.findSourcePostingLink({
		organizationId: d.organizationId,
		sourceModule: d.sourceModule,
		sourceAggregateId: d.sourceAggregateId,
		sourceEventId: d.sourceEventId,
		sourceEventVersion: d.sourceEventVersion,
		postingRuleVersion: profile.versionNumber,
	});
	if (!existingLink.ok) {
		return existingLink;
	}

	if (existingLink.data) {
		const existingJournal = await deps.journals.getById(
			d.organizationId,
			existingLink.data.journalId,
		);
		if (!existingJournal.ok) {
			return existingJournal;
		}
		if (existingJournal.data) {
			return errorResult.ok(existingJournal.data);
		}
		return errorResult.fail("NOT_FOUND", {
			publicMessage:
				"Linked journal not found for existing source posting link",
		});
	}

	const resolvedLines = await collectSequentially(
		profile.lines,
		(profileLine) => resolvePostingProfileLine(deps, d, profileLine),
	);
	if (!resolvedLines.ok) {
		return resolvedLines;
	}

	const journalCode = `SYS-${d.sourceModule}-${d.sourceEventId}`.slice(0, 50);
	const journalType = journalTypeForSourceModule(d.sourceModule);

	const draftResult = await deps.journals.createDraft({
		organizationId: d.organizationId,
		periodId: d.periodId,
		code: journalCode,
		normalizedCode: normalize(journalCode),
		currencyCode: d.currencyCode,
		description: d.description ?? `Auto-posted from ${d.sourceModule}`,
		journalType,
		actorUserId: d.actorUserId,
	});
	if (!draftResult.ok) {
		return draftResult;
	}

	const journal = draftResult.data;

	const lineResults = await collectSequentially(resolvedLines.data, (line) =>
		deps.journals.addLine({
			organizationId: d.organizationId,
			journalId: journal.id,
			accountCode: line.accountCode,
			description: d.description,
			ledgerAccountId: line.ledgerAccountId,
			debit: line.side === "debit" ? line.amount : "0.00",
			credit: line.side === "credit" ? line.amount : "0.00",
			actorUserId: d.actorUserId,
		}),
	);
	if (!lineResults.ok) {
		return lineResults;
	}

	const postResult = await deps.journals.post({
		organizationId: d.organizationId,
		journalId: journal.id,
		expectedVersion: 1,
		actorUserId: d.actorUserId,
		correlationId: d.correlationId,
		effects: deps.effects,
	});
	if (!postResult.ok) {
		await deps.store.createPostingException({
			organizationId: d.organizationId,
			sourceModule: d.sourceModule,
			sourceAggregateId: d.sourceAggregateId,
			sourceEventId: d.sourceEventId,
			sourceEventVersion: d.sourceEventVersion,
			postingRuleCode: d.postingRuleCode,
			reasonCode: "POST_FAILED",
			message: ACCOUNTING_POSTING_FAILED_EXCEPTION_MESSAGE,
			payload: d,
			actorUserId: d.actorUserId,
		});
		return postResult;
	}

	await deps.store.createSourcePostingLink({
		organizationId: d.organizationId,
		sourceModule: d.sourceModule,
		sourceAggregateId: d.sourceAggregateId,
		sourceEventId: d.sourceEventId,
		sourceEventVersion: d.sourceEventVersion,
		postingRuleId: profile.id,
		postingRuleVersion: profile.versionNumber,
		journalId: postResult.data.id,
		causationId: d.correlationId,
		actorUserId: d.actorUserId,
	});

	return errorResult.ok(postResult.data);
}

export async function getSourcePostingTraceOperation(
	input: z.infer<typeof GetSourcePostingTraceInput>,
	deps: SourcePostingOperationDeps,
): Promise<Result<SourcePostingTrace[]>> {
	const parsed = GetSourcePostingTraceInput.safeParse(input);
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
	return deps.store.getSourcePostingTrace({
		organizationId: parsed.data.organizationId,
		journalId: parsed.data.journalId,
		sourceModule: parsed.data.sourceModule,
		sourceAggregateId: parsed.data.sourceAggregateId,
		sourceEventId: parsed.data.sourceEventId,
	});
}

export async function listPostingExceptionsOperation(
	input: z.infer<typeof ListPostingExceptionsInput>,
	deps: SourcePostingOperationDeps,
): Promise<Result<PostingException[]>> {
	const parsed = ListPostingExceptionsInput.safeParse(input);
	if (!parsed.success) {
		return failInvalidAccountingInput(parsed.error);
	}
	const authResult = await requireAccountingPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.exception.read",
	});
	if (!authResult.ok) {
		return authResult;
	}
	return deps.store.listPostingExceptions({
		organizationId: parsed.data.organizationId,
		status: parsed.data.status,
	});
}

export async function resolvePostingExceptionOperation(
	input: z.infer<typeof ResolvePostingExceptionInput>,
	deps: SourcePostingOperationDeps,
): Promise<Result<PostingException>> {
	const parsed = ResolvePostingExceptionInput.safeParse(input);
	if (!parsed.success) {
		return failInvalidAccountingInput(parsed.error);
	}
	const authResult = await requireAccountingPermission(deps.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.exception.manage",
	});
	if (!authResult.ok) {
		return authResult;
	}
	return deps.store.resolvePostingException({
		organizationId: parsed.data.organizationId,
		id: parsed.data.id,
		resolutionNote: parsed.data.resolutionNote,
		expectedVersion: parsed.data.expectedVersion,
		actorUserId: parsed.data.actorUserId,
	});
}
