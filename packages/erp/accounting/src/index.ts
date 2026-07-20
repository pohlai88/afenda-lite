import { fail, ok, type Result } from "@afenda/errors/result";
import { z } from "zod";
import { requireAccountingPermission } from "./authorization";
import type {
	AccountRoleMapping,
	AccountingCommandOptions,
	AccountingPeriod,
	ChartOfAccounts,
	Journal,
	JournalLine,
	JournalType,
	LedgerAccount,
	LedgerAccountActivityRow,
	PostingException,
	SourcePostingTrace,
	TrialBalanceRow,
} from "./model";

export type { AccountingCommandOptions } from "./model";
export type {
	AccountRoleMapping,
	AccountType,
	AccountingEffects,
	AccountingEventType,
	AccountingPeriod,
	AccountingPeriodStatus,
	AccountingStore,
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
} from "./model";
export type {
	AccountingAuthorizationPort,
	AccountingPermission,
} from "./authorization";
export { requireAccountingPermission } from "./authorization";
export { createMemoryStore } from "./memory-store";
export { createDrizzleAccountingStore } from "./drizzle-store";

function normalize(code: string): string {
	return code.toUpperCase().replace(/[\s-]+/g, "");
}

function resolveOpts(
	options: AccountingCommandOptions | undefined,
): Result<{
	store: NonNullable<AccountingCommandOptions["store"]>;
	authorization: NonNullable<AccountingCommandOptions["authorization"]>;
	effects: NonNullable<AccountingCommandOptions["effects"]>;
}> {
	if (!options?.store) return fail("BAD_REQUEST", "AccountingStore is required");
	if (!options?.authorization)
		return fail("BAD_REQUEST", "Authorization port is required");
	if (!options?.effects) return fail("BAD_REQUEST", "Effects port is required");
	return ok({
		store: options.store,
		authorization: options.authorization,
		effects: options.effects,
	});
}

const CreateChartOfAccountsInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	correlationId: z.string().min(1),
	code: z.string().min(1).max(50),
	name: z.string().min(1).max(200),
});

export async function createChartOfAccounts(
	input: z.infer<typeof CreateChartOfAccountsInput>,
	options?: AccountingCommandOptions,
): Promise<Result<ChartOfAccounts>> {
	const parsed = CreateChartOfAccountsInput.safeParse(input);
	if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.message);

	const opts = resolveOpts(options);
	if (!opts.ok) return opts;

	const authResult = await requireAccountingPermission(opts.data.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.account.manage",
	});
	if (!authResult.ok) return authResult;

	return opts.data.store.createChartOfAccounts({
		organizationId: parsed.data.organizationId,
		code: parsed.data.code,
		name: parsed.data.name,
		actorUserId: parsed.data.actorUserId,
	});
}

const CreateLedgerAccountInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	correlationId: z.string().min(1),
	chartOfAccountId: z.string().uuid(),
	code: z.string().min(1).max(50),
	name: z.string().min(1).max(200),
	accountType: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
	normalBalance: z.enum(["debit", "credit"]),
	isControl: z.boolean().default(false),
});

export async function createLedgerAccount(
	input: z.infer<typeof CreateLedgerAccountInput>,
	options?: AccountingCommandOptions,
): Promise<Result<LedgerAccount>> {
	const parsed = CreateLedgerAccountInput.safeParse(input);
	if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.message);

	const opts = resolveOpts(options);
	if (!opts.ok) return opts;

	const authResult = await requireAccountingPermission(opts.data.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.account.manage",
	});
	if (!authResult.ok) return authResult;

	return opts.data.store.createLedgerAccount({
		organizationId: parsed.data.organizationId,
		chartOfAccountId: parsed.data.chartOfAccountId,
		code: parsed.data.code,
		normalizedCode: normalize(parsed.data.code),
		name: parsed.data.name,
		accountType: parsed.data.accountType,
		normalBalance: parsed.data.normalBalance,
		isControl: parsed.data.isControl,
		actorUserId: parsed.data.actorUserId,
	});
}

const UpdateLedgerAccountInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	correlationId: z.string().min(1),
	id: z.string().uuid(),
	name: z.string().min(1).max(200),
	accountType: z.enum(["asset", "liability", "equity", "revenue", "expense"]),
	normalBalance: z.enum(["debit", "credit"]),
	isControl: z.boolean(),
	expectedVersion: z.number().int().positive(),
});

export async function updateLedgerAccount(
	input: z.infer<typeof UpdateLedgerAccountInput>,
	options?: AccountingCommandOptions,
): Promise<Result<LedgerAccount>> {
	const parsed = UpdateLedgerAccountInput.safeParse(input);
	if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.message);

	const opts = resolveOpts(options);
	if (!opts.ok) return opts;

	const authResult = await requireAccountingPermission(opts.data.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.account.manage",
	});
	if (!authResult.ok) return authResult;

	return opts.data.store.updateLedgerAccount({
		organizationId: parsed.data.organizationId,
		id: parsed.data.id,
		name: parsed.data.name,
		accountType: parsed.data.accountType,
		normalBalance: parsed.data.normalBalance,
		isControl: parsed.data.isControl,
		expectedVersion: parsed.data.expectedVersion,
		actorUserId: parsed.data.actorUserId,
	});
}

const DeactivateLedgerAccountInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	correlationId: z.string().min(1),
	id: z.string().uuid(),
	expectedVersion: z.number().int().positive(),
});

export async function deactivateLedgerAccount(
	input: z.infer<typeof DeactivateLedgerAccountInput>,
	options?: AccountingCommandOptions,
): Promise<Result<LedgerAccount>> {
	const parsed = DeactivateLedgerAccountInput.safeParse(input);
	if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.message);

	const opts = resolveOpts(options);
	if (!opts.ok) return opts;

	const authResult = await requireAccountingPermission(opts.data.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.account.manage",
	});
	if (!authResult.ok) return authResult;

	return opts.data.store.deactivateLedgerAccount({
		organizationId: parsed.data.organizationId,
		id: parsed.data.id,
		expectedVersion: parsed.data.expectedVersion,
		actorUserId: parsed.data.actorUserId,
	});
}

const ListLedgerAccountsInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	chartOfAccountId: z.string().uuid().optional(),
	status: z.enum(["active", "inactive"]).optional(),
});

export async function listLedgerAccounts(
	input: z.infer<typeof ListLedgerAccountsInput>,
	options?: AccountingCommandOptions,
): Promise<Result<LedgerAccount[]>> {
	const parsed = ListLedgerAccountsInput.safeParse(input);
	if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.message);

	const opts = resolveOpts(options);
	if (!opts.ok) return opts;

	const authResult = await requireAccountingPermission(opts.data.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.account.read",
	});
	if (!authResult.ok) return authResult;

	return opts.data.store.listLedgerAccounts({
		organizationId: parsed.data.organizationId,
		chartOfAccountId: parsed.data.chartOfAccountId,
		status: parsed.data.status,
	});
}

const MapAccountRoleInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	correlationId: z.string().min(1),
	accountRole: z.string().min(1).max(100),
	ledgerAccountId: z.string().uuid(),
});

export async function mapAccountRole(
	input: z.infer<typeof MapAccountRoleInput>,
	options?: AccountingCommandOptions,
): Promise<Result<AccountRoleMapping>> {
	const parsed = MapAccountRoleInput.safeParse(input);
	if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.message);

	const opts = resolveOpts(options);
	if (!opts.ok) return opts;

	const authResult = await requireAccountingPermission(opts.data.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.account.manage",
	});
	if (!authResult.ok) return authResult;

	return opts.data.store.mapAccountRole({
		organizationId: parsed.data.organizationId,
		accountRole: parsed.data.accountRole,
		ledgerAccountId: parsed.data.ledgerAccountId,
		actorUserId: parsed.data.actorUserId,
	});
}

const UpsertPostingProfileInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	correlationId: z.string().min(1),
	code: z.string().min(1).max(50),
	eventType: z.string().min(1).max(100),
	versionNumber: z.number().int().positive(),
	lines: z.array(
		z.object({
			lineNo: z.number().int().positive(),
			side: z.enum(["debit", "credit"]),
			accountRole: z.string().min(1).max(100),
		}),
	).min(1),
});

export async function upsertPostingProfile(
	input: z.infer<typeof UpsertPostingProfileInput>,
	options?: AccountingCommandOptions,
): Promise<Result<import("./model").PostingProfile>> {
	const parsed = UpsertPostingProfileInput.safeParse(input);
	if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.message);

	const opts = resolveOpts(options);
	if (!opts.ok) return opts;

	const authResult = await requireAccountingPermission(opts.data.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.posting_rule.manage",
	});
	if (!authResult.ok) return authResult;

	return opts.data.store.upsertPostingProfile({
		organizationId: parsed.data.organizationId,
		code: parsed.data.code,
		eventType: parsed.data.eventType,
		versionNumber: parsed.data.versionNumber,
		lines: parsed.data.lines,
		actorUserId: parsed.data.actorUserId,
	});
}

const CreateDraftJournalInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	correlationId: z.string().min(1),
	periodId: z.string().uuid(),
	code: z.string().min(1).max(50),
	currencyCode: z.string().length(3),
	description: z.string().max(500).nullable().default(null),
	journalType: z
		.enum([
			"manual",
			"receivables",
			"payables",
			"payments",
			"inventory",
			"opening_balance",
			"adjustment",
			"reversal",
			"system",
		])
		.default("manual"),
});

export async function createDraftJournal(
	input: z.infer<typeof CreateDraftJournalInput>,
	options?: AccountingCommandOptions,
): Promise<Result<Journal>> {
	const parsed = CreateDraftJournalInput.safeParse(input);
	if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.message);

	const opts = resolveOpts(options);
	if (!opts.ok) return opts;

	const authResult = await requireAccountingPermission(opts.data.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.journal.create",
	});
	if (!authResult.ok) return authResult;

	return opts.data.store.createDraft({
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

const AddJournalLineInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	correlationId: z.string().min(1),
	journalId: z.string().uuid(),
	accountCode: z.string().min(1).max(50),
	description: z.string().max(500).nullable().default(null),
	debit: z.string(),
	credit: z.string(),
});

export async function addJournalLine(
	input: z.infer<typeof AddJournalLineInput>,
	options?: AccountingCommandOptions,
): Promise<Result<JournalLine>> {
	const parsed = AddJournalLineInput.safeParse(input);
	if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.message);

	const opts = resolveOpts(options);
	if (!opts.ok) return opts;

	const authResult = await requireAccountingPermission(opts.data.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.journal.create",
	});
	if (!authResult.ok) return authResult;

	const normalizedCode = normalize(parsed.data.accountCode);
	const accountResult = await opts.data.store.resolveLedgerAccountByCode(
		parsed.data.organizationId,
		normalizedCode,
	);
	if (!accountResult.ok) return accountResult;

	let ledgerAccountId: string | null = null;
	if (accountResult.data) {
		if (accountResult.data.status !== "active") {
			return fail("VALIDATION_ERROR", `Ledger account '${parsed.data.accountCode}' is inactive`);
		}
		ledgerAccountId = accountResult.data.id;
	}

	return opts.data.store.addLine({
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

const PostJournalInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	correlationId: z.string().min(1),
	journalId: z.string().uuid(),
	expectedVersion: z.number().int().positive(),
});

export async function postJournal(
	input: z.infer<typeof PostJournalInput>,
	options?: AccountingCommandOptions,
): Promise<Result<Journal>> {
	const parsed = PostJournalInput.safeParse(input);
	if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.message);

	const opts = resolveOpts(options);
	if (!opts.ok) return opts;

	const authResult = await requireAccountingPermission(opts.data.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.journal.post",
	});
	if (!authResult.ok) return authResult;

	return opts.data.store.post({
		organizationId: parsed.data.organizationId,
		journalId: parsed.data.journalId,
		expectedVersion: parsed.data.expectedVersion,
		actorUserId: parsed.data.actorUserId,
		correlationId: parsed.data.correlationId,
		effects: opts.data.effects,
	});
}

const ReverseJournalInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	correlationId: z.string().min(1),
	journalId: z.string().uuid(),
	expectedVersion: z.number().int().positive(),
	reason: z.string().min(1).max(500),
});

export async function reverseJournal(
	input: z.infer<typeof ReverseJournalInput>,
	options?: AccountingCommandOptions,
): Promise<Result<Journal>> {
	const parsed = ReverseJournalInput.safeParse(input);
	if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.message);

	const opts = resolveOpts(options);
	if (!opts.ok) return opts;

	const authResult = await requireAccountingPermission(opts.data.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.journal.reverse",
	});
	if (!authResult.ok) return authResult;

	return opts.data.store.reverse({
		organizationId: parsed.data.organizationId,
		journalId: parsed.data.journalId,
		expectedVersion: parsed.data.expectedVersion,
		reason: parsed.data.reason,
		actorUserId: parsed.data.actorUserId,
		correlationId: parsed.data.correlationId,
		effects: opts.data.effects,
	});
}

const OpenAccountingPeriodInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	correlationId: z.string().min(1),
	code: z.string().min(1).max(50),
	startDate: z.string(),
	endDate: z.string(),
});

export async function openAccountingPeriod(
	input: z.infer<typeof OpenAccountingPeriodInput>,
	options?: AccountingCommandOptions,
): Promise<Result<AccountingPeriod>> {
	const parsed = OpenAccountingPeriodInput.safeParse(input);
	if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.message);

	const opts = resolveOpts(options);
	if (!opts.ok) return opts;

	const authResult = await requireAccountingPermission(opts.data.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.period.open",
	});
	if (!authResult.ok) return authResult;

	return opts.data.store.openPeriod({
		organizationId: parsed.data.organizationId,
		code: parsed.data.code,
		normalizedCode: normalize(parsed.data.code),
		startDate: parsed.data.startDate,
		endDate: parsed.data.endDate,
		actorUserId: parsed.data.actorUserId,
	});
}

const SoftCloseAccountingPeriodInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	correlationId: z.string().min(1),
	periodId: z.string().uuid(),
	expectedVersion: z.number().int().positive(),
});

export async function softCloseAccountingPeriod(
	input: z.infer<typeof SoftCloseAccountingPeriodInput>,
	options?: AccountingCommandOptions,
): Promise<Result<AccountingPeriod>> {
	const parsed = SoftCloseAccountingPeriodInput.safeParse(input);
	if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.message);

	const opts = resolveOpts(options);
	if (!opts.ok) return opts;

	const authResult = await requireAccountingPermission(opts.data.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.period.soft_close",
	});
	if (!authResult.ok) return authResult;

	return opts.data.store.softClosePeriod({
		organizationId: parsed.data.organizationId,
		periodId: parsed.data.periodId,
		expectedVersion: parsed.data.expectedVersion,
		actorUserId: parsed.data.actorUserId,
	});
}

const CloseAccountingPeriodInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	correlationId: z.string().min(1),
	periodId: z.string().uuid(),
	expectedVersion: z.number().int().positive(),
	closeReason: z.string().max(500).nullable().default(null),
});

export async function closeAccountingPeriod(
	input: z.infer<typeof CloseAccountingPeriodInput>,
	options?: AccountingCommandOptions,
): Promise<Result<AccountingPeriod>> {
	const parsed = CloseAccountingPeriodInput.safeParse(input);
	if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.message);

	const opts = resolveOpts(options);
	if (!opts.ok) return opts;

	const authResult = await requireAccountingPermission(opts.data.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.period.close",
	});
	if (!authResult.ok) return authResult;

	return opts.data.store.closePeriod({
		organizationId: parsed.data.organizationId,
		periodId: parsed.data.periodId,
		expectedVersion: parsed.data.expectedVersion,
		closeReason: parsed.data.closeReason,
		actorUserId: parsed.data.actorUserId,
	});
}

const ReopenAccountingPeriodInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	correlationId: z.string().min(1),
	periodId: z.string().uuid(),
	expectedVersion: z.number().int().positive(),
	reason: z.string().min(1).max(500),
});

export async function reopenAccountingPeriod(
	input: z.infer<typeof ReopenAccountingPeriodInput>,
	options?: AccountingCommandOptions,
): Promise<Result<AccountingPeriod>> {
	const parsed = ReopenAccountingPeriodInput.safeParse(input);
	if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.message);

	const opts = resolveOpts(options);
	if (!opts.ok) return opts;

	const authResult = await requireAccountingPermission(opts.data.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.period.reopen",
	});
	if (!authResult.ok) return authResult;

	return opts.data.store.reopenPeriod({
		organizationId: parsed.data.organizationId,
		periodId: parsed.data.periodId,
		expectedVersion: parsed.data.expectedVersion,
		reason: parsed.data.reason,
		actorUserId: parsed.data.actorUserId,
	});
}

const PostFinancialSourceEventInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	correlationId: z.string().min(1),
	sourceModule: z.string().min(1).max(100),
	sourceAggregateId: z.string().min(1),
	sourceEventId: z.string().min(1),
	sourceEventVersion: z.number().int().positive(),
	postingRuleCode: z.string().min(1).max(50),
	periodId: z.string().uuid(),
	currencyCode: z.string().length(3),
	description: z.string().max(500).nullable().default(null),
	amountByRole: z.record(z.string(), z.string()),
});

export async function postFinancialSourceEvent(
	input: z.infer<typeof PostFinancialSourceEventInput>,
	options?: AccountingCommandOptions,
): Promise<Result<Journal>> {
	const parsed = PostFinancialSourceEventInput.safeParse(input);
	if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.message);

	const opts = resolveOpts(options);
	if (!opts.ok) return opts;

	const { store, effects } = opts.data;
	const d = parsed.data;

	const profileResult = await store.getActivePostingProfile(d.organizationId, d.postingRuleCode);
	if (!profileResult.ok) return profileResult;
	if (!profileResult.data) {
		await store.createPostingException({
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
		return fail("NOT_FOUND", `Active posting profile '${d.postingRuleCode}' not found`);
	}

	const profile = profileResult.data;

	const existingLink = await store.findSourcePostingLink({
		organizationId: d.organizationId,
		sourceModule: d.sourceModule,
		sourceAggregateId: d.sourceAggregateId,
		sourceEventId: d.sourceEventId,
		sourceEventVersion: d.sourceEventVersion,
		postingRuleVersion: profile.versionNumber,
	});
	if (!existingLink.ok) return existingLink;

	if (existingLink.data) {
		const existingJournal = await store.getById(d.organizationId, existingLink.data.journalId);
		if (!existingJournal.ok) return existingJournal;
		if (existingJournal.data) return ok(existingJournal.data);
		return fail("NOT_FOUND", "Linked journal not found for existing source posting link");
	}

	type ResolvedLine = {
		accountCode: string;
		ledgerAccountId: string;
		side: "debit" | "credit";
		amount: string;
	};

	const resolvedLines: ResolvedLine[] = [];
	for (const profileLine of profile.lines) {
		const amount = d.amountByRole[profileLine.accountRole];
		if (!amount) {
			await store.createPostingException({
				organizationId: d.organizationId,
				sourceModule: d.sourceModule,
				sourceAggregateId: d.sourceAggregateId,
				sourceEventId: d.sourceEventId,
				sourceEventVersion: d.sourceEventVersion,
				postingRuleCode: d.postingRuleCode,
				reasonCode: "MISSING_AMOUNT_FOR_ROLE",
				message: `No amount provided for account role '${profileLine.accountRole}'`,
				payload: d,
				actorUserId: d.actorUserId,
			});
			return fail(
				"VALIDATION_ERROR",
				`No amount provided for account role '${profileLine.accountRole}'`,
			);
		}

		const roleMapping = await store.resolveAccountRole(
			d.organizationId,
			profileLine.accountRole,
		);
		if (!roleMapping.ok) return roleMapping;
		if (!roleMapping.data) {
			await store.createPostingException({
				organizationId: d.organizationId,
				sourceModule: d.sourceModule,
				sourceAggregateId: d.sourceAggregateId,
				sourceEventId: d.sourceEventId,
				sourceEventVersion: d.sourceEventVersion,
				postingRuleCode: d.postingRuleCode,
				reasonCode: "ACCOUNT_ROLE_NOT_MAPPED",
				message: `Account role '${profileLine.accountRole}' has no mapping`,
				payload: d,
				actorUserId: d.actorUserId,
			});
			return fail(
				"VALIDATION_ERROR",
				`Account role '${profileLine.accountRole}' has no mapping`,
			);
		}

		const ledgerAccounts = await store.listLedgerAccounts({
			organizationId: d.organizationId,
		});
		if (!ledgerAccounts.ok) return ledgerAccounts;

		const targetAccount = ledgerAccounts.data.find(
			(a) => a.id === roleMapping.data!.ledgerAccountId,
		);
		if (!targetAccount || targetAccount.status !== "active") {
			await store.createPostingException({
				organizationId: d.organizationId,
				sourceModule: d.sourceModule,
				sourceAggregateId: d.sourceAggregateId,
				sourceEventId: d.sourceEventId,
				sourceEventVersion: d.sourceEventVersion,
				postingRuleCode: d.postingRuleCode,
				reasonCode: "LEDGER_ACCOUNT_INACTIVE",
				message: `Ledger account for role '${profileLine.accountRole}' is inactive or not found`,
				payload: d,
				actorUserId: d.actorUserId,
			});
			return fail(
				"VALIDATION_ERROR",
				`Ledger account for role '${profileLine.accountRole}' is inactive or not found`,
			);
		}

		resolvedLines.push({
			accountCode: targetAccount.code,
			ledgerAccountId: targetAccount.id,
			side: profileLine.side,
			amount,
		});
	}

	const journalCode = `SYS-${d.sourceModule}-${d.sourceEventId}`.substring(0, 50);
	const journalType: JournalType =
		d.sourceModule === "receivables"
			? "receivables"
			: d.sourceModule === "payables"
				? "payables"
				: d.sourceModule === "payments"
					? "payments"
					: d.sourceModule === "inventory"
						? "inventory"
						: "system";

	const draftResult = await store.createDraft({
		organizationId: d.organizationId,
		periodId: d.periodId,
		code: journalCode,
		normalizedCode: normalize(journalCode),
		currencyCode: d.currencyCode,
		description: d.description ?? `Auto-posted from ${d.sourceModule}`,
		journalType,
		actorUserId: d.actorUserId,
	});
	if (!draftResult.ok) return draftResult;

	const journal = draftResult.data;

	for (const line of resolvedLines) {
		const lineResult = await store.addLine({
			organizationId: d.organizationId,
			journalId: journal.id,
			accountCode: line.accountCode,
			description: d.description,
			ledgerAccountId: line.ledgerAccountId,
			debit: line.side === "debit" ? line.amount : "0.00",
			credit: line.side === "credit" ? line.amount : "0.00",
			actorUserId: d.actorUserId,
		});
		if (!lineResult.ok) return lineResult;
	}

	const postResult = await store.post({
		organizationId: d.organizationId,
		journalId: journal.id,
		expectedVersion: 1,
		actorUserId: d.actorUserId,
		correlationId: d.correlationId,
		effects,
	});
	if (!postResult.ok) {
		await store.createPostingException({
			organizationId: d.organizationId,
			sourceModule: d.sourceModule,
			sourceAggregateId: d.sourceAggregateId,
			sourceEventId: d.sourceEventId,
			sourceEventVersion: d.sourceEventVersion,
			postingRuleCode: d.postingRuleCode,
			reasonCode: "POST_FAILED",
			message: postResult.message,
			payload: d,
			actorUserId: d.actorUserId,
		});
		return postResult;
	}

	await store.createSourcePostingLink({
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

	return ok(postResult.data);
}

const GetJournalByIdInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	journalId: z.string().uuid(),
});

export async function getJournalById(
	input: z.infer<typeof GetJournalByIdInput>,
	options?: AccountingCommandOptions,
): Promise<Result<Journal | null>> {
	const parsed = GetJournalByIdInput.safeParse(input);
	if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.message);

	const opts = resolveOpts(options);
	if (!opts.ok) return opts;

	const authResult = await requireAccountingPermission(opts.data.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.journal.read",
	});
	if (!authResult.ok) return authResult;

	return opts.data.store.getById(parsed.data.organizationId, parsed.data.journalId);
}

const ListJournalsInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	page: z.number().int().positive().default(1),
	pageSize: z.number().int().positive().max(100).default(20),
	status: z.enum(["draft", "posted", "reversed"]).optional(),
	periodId: z.string().uuid().optional(),
});

export async function listJournals(
	input: z.infer<typeof ListJournalsInput>,
	options?: AccountingCommandOptions,
): Promise<Result<Journal[]>> {
	const parsed = ListJournalsInput.safeParse(input);
	if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.message);

	const opts = resolveOpts(options);
	if (!opts.ok) return opts;

	const authResult = await requireAccountingPermission(opts.data.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.journal.read",
	});
	if (!authResult.ok) return authResult;

	return opts.data.store.list({
		organizationId: parsed.data.organizationId,
		page: parsed.data.page,
		pageSize: parsed.data.pageSize,
		status: parsed.data.status,
		periodId: parsed.data.periodId,
	});
}

const GetTrialBalanceInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	periodId: z.string().uuid().optional(),
});

export async function getTrialBalance(
	input: z.infer<typeof GetTrialBalanceInput>,
	options?: AccountingCommandOptions,
): Promise<Result<TrialBalanceRow[]>> {
	const parsed = GetTrialBalanceInput.safeParse(input);
	if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.message);

	const opts = resolveOpts(options);
	if (!opts.ok) return opts;

	const authResult = await requireAccountingPermission(opts.data.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.trial_balance.read",
	});
	if (!authResult.ok) return authResult;

	return opts.data.store.trialBalance({
		organizationId: parsed.data.organizationId,
		periodId: parsed.data.periodId,
	});
}

const GetLedgerAccountActivityInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	accountCode: z.string().optional(),
	periodId: z.string().uuid().optional(),
});

export async function getLedgerAccountActivity(
	input: z.infer<typeof GetLedgerAccountActivityInput>,
	options?: AccountingCommandOptions,
): Promise<Result<LedgerAccountActivityRow[]>> {
	const parsed = GetLedgerAccountActivityInput.safeParse(input);
	if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.message);

	const opts = resolveOpts(options);
	if (!opts.ok) return opts;

	const authResult = await requireAccountingPermission(opts.data.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.ledger.read",
	});
	if (!authResult.ok) return authResult;

	return opts.data.store.getLedgerAccountActivity({
		organizationId: parsed.data.organizationId,
		accountCode: parsed.data.accountCode,
		periodId: parsed.data.periodId,
	});
}

const GetSourcePostingTraceInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	journalId: z.string().uuid().optional(),
	sourceModule: z.string().optional(),
	sourceAggregateId: z.string().optional(),
	sourceEventId: z.string().optional(),
});

export async function getSourcePostingTrace(
	input: z.infer<typeof GetSourcePostingTraceInput>,
	options?: AccountingCommandOptions,
): Promise<Result<SourcePostingTrace[]>> {
	const parsed = GetSourcePostingTraceInput.safeParse(input);
	if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.message);

	const opts = resolveOpts(options);
	if (!opts.ok) return opts;

	const authResult = await requireAccountingPermission(opts.data.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.journal.read",
	});
	if (!authResult.ok) return authResult;

	return opts.data.store.getSourcePostingTrace({
		organizationId: parsed.data.organizationId,
		journalId: parsed.data.journalId,
		sourceModule: parsed.data.sourceModule,
		sourceAggregateId: parsed.data.sourceAggregateId,
		sourceEventId: parsed.data.sourceEventId,
	});
}

const ListPostingExceptionsInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	status: z.enum(["open", "resolved", "retrying"]).optional(),
});

export async function listPostingExceptions(
	input: z.infer<typeof ListPostingExceptionsInput>,
	options?: AccountingCommandOptions,
): Promise<Result<PostingException[]>> {
	const parsed = ListPostingExceptionsInput.safeParse(input);
	if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.message);

	const opts = resolveOpts(options);
	if (!opts.ok) return opts;

	const authResult = await requireAccountingPermission(opts.data.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.exception.read",
	});
	if (!authResult.ok) return authResult;

	return opts.data.store.listPostingExceptions({
		organizationId: parsed.data.organizationId,
		status: parsed.data.status,
	});
}

const ResolvePostingExceptionInput = z.object({
	organizationId: z.string().uuid(),
	actorUserId: z.string().uuid(),
	correlationId: z.string().min(1),
	id: z.string().uuid(),
	resolutionNote: z.string().min(1).max(1000),
	expectedVersion: z.number().int().positive(),
});

export async function resolvePostingException(
	input: z.infer<typeof ResolvePostingExceptionInput>,
	options?: AccountingCommandOptions,
): Promise<Result<PostingException>> {
	const parsed = ResolvePostingExceptionInput.safeParse(input);
	if (!parsed.success) return fail("VALIDATION_ERROR", parsed.error.message);

	const opts = resolveOpts(options);
	if (!opts.ok) return opts;

	const authResult = await requireAccountingPermission(opts.data.authorization, {
		organizationId: parsed.data.organizationId,
		actorUserId: parsed.data.actorUserId,
		permission: "accounting.exception.manage",
	});
	if (!authResult.ok) return authResult;

	return opts.data.store.resolvePostingException({
		organizationId: parsed.data.organizationId,
		id: parsed.data.id,
		resolutionNote: parsed.data.resolutionNote,
		expectedVersion: parsed.data.expectedVersion,
		actorUserId: parsed.data.actorUserId,
	});
}
