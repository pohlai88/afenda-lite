import { randomUUID } from "node:crypto";

import {
	accountingPeriod,
	and,
	db,
	desc,
	eq,
	journal,
	journalLine,
	ledgerPosting,
	runNeonHttpTransaction,
} from "@afenda/db";
import { fail, failFromUnknown, ok, type Result } from "@afenda/errors/result";
import { z } from "zod";

import type {
	AccountRoleMapping,
	AccountType,
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
	SourcePostingLink,
	SourcePostingTrace,
	TrialBalanceRow,
} from "./model";

const postingProfileLineSqlSchema = z.object({
	id: z.string().uuid(),
	lineNo: z.number().int().positive(),
	side: z.enum(["debit", "credit"]),
	accountRole: z.string().min(1),
});

type AccountRoleMappingSqlRow = {
	id: string;
	organization_id: string;
	account_role: string;
	ledger_account_id: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

type SourcePostingLinkSqlRow = {
	id: string;
	organization_id: string;
	source_module: string;
	source_aggregate_id: string;
	source_event_id: string;
	source_event_version: number;
	posting_rule_id: string;
	posting_rule_version: number;
	journal_id: string;
	causation_id: string | null;
	created_by: string;
	created_at: Date;
};

function mapAccountRoleSql(row: AccountRoleMappingSqlRow): AccountRoleMapping {
	return {
		id: row.id,
		organizationId: row.organization_id,
		accountRole: row.account_role,
		ledgerAccountId: row.ledger_account_id,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

function mapSourcePostingLinkSql(row: SourcePostingLinkSqlRow): SourcePostingLink {
	return {
		id: row.id,
		organizationId: row.organization_id,
		sourceModule: row.source_module,
		sourceAggregateId: row.source_aggregate_id,
		sourceEventId: row.source_event_id,
		sourceEventVersion: row.source_event_version,
		postingRuleId: row.posting_rule_id,
		postingRuleVersion: row.posting_rule_version,
		journalId: row.journal_id,
		causationId: row.causation_id,
		createdBy: row.created_by,
		createdAt: row.created_at,
	};
}

function periodStatus(value: string): AccountingPeriodStatus {
	if (value === "open" || value === "soft_closed" || value === "closed") return value;
	throw new Error(`Invalid accounting_period.status: ${value}`);
}

function journalStatus(value: string): JournalStatus {
	if (value === "draft" || value === "posted" || value === "reversed")
		return value;
	throw new Error(`Invalid journal.status: ${value}`);
}

function journalType(value: string | null | undefined): JournalType {
	switch (value) {
		case "manual":
		case "receivables":
		case "payables":
		case "payments":
		case "inventory":
		case "opening_balance":
		case "adjustment":
		case "reversal":
		case "system":
			return value;
		default:
			return "manual";
	}
}

function accountType(value: string): AccountType {
	switch (value) {
		case "asset":
		case "liability":
		case "equity":
		case "revenue":
		case "expense":
			return value;
		default:
			throw new Error(`Invalid ledger_account.account_type: ${value}`);
	}
}

function normalBalance(value: string): NormalBalance {
	switch (value) {
		case "debit":
		case "credit":
			return value;
		default:
			throw new Error(`Invalid ledger_account.normal_balance: ${value}`);
	}
}

function exceptionStatus(value: string): PostingExceptionStatus {
	switch (value) {
		case "open":
		case "resolved":
		case "retrying":
			return value;
		default:
			throw new Error(`Invalid financial_posting_exception.status: ${value}`);
	}
}

function mapPeriod(
	row: typeof accountingPeriod.$inferSelect,
): AccountingPeriod {
	return {
		id: row.id,
		organizationId: row.organizationId,
		code: row.code,
		normalizedCode: row.code.trim().toUpperCase(),
		startDate: row.startsOn,
		endDate: row.endsOn,
		status: periodStatus(row.status),
		softClosed: row.softClosed,
		softClosedAt: row.softClosedAt,
		softClosedBy: row.softClosedBy,
		reopenReason: row.reopenReason,
		reopenedAt: row.reopenedAt,
		reopenedBy: row.reopenedBy,
		closeReason: row.closeReason,
		version: row.version,
		openedBy: row.createdBy,
		closedBy: row.closedBy,
		closedAt: row.closedAt,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
	};
}

function mapLine(row: typeof journalLine.$inferSelect): JournalLine {
	return {
		id: row.id,
		organizationId: row.organizationId,
		journalId: row.journalId,
		lineNumber: row.lineNo,
		accountCode: row.accountCode,
		description: row.accountName,
		ledgerAccountId: row.ledgerAccountId,
		debit: row.debitAmount,
		credit: row.creditAmount,
		createdBy: row.createdBy,
		createdAt: row.createdAt,
	};
}

function mapPosting(row: typeof ledgerPosting.$inferSelect): LedgerPosting {
	if (row.periodId === null) {
		throw new Error("ledger_posting.period_id is required for accounting");
	}
	return {
		id: row.id,
		organizationId: row.organizationId,
		journalId: row.journalId,
		journalLineId: row.journalLineId,
		periodId: row.periodId,
		accountCode: row.accountCode,
		ledgerAccountId: row.ledgerAccountId,
		debit: row.debitAmount,
		credit: row.creditAmount,
		postedAt: row.postedAt,
		postedBy: row.createdBy,
	};
}

function mapJournal(
	row: typeof journal.$inferSelect,
	lines: JournalLine[],
	postings: LedgerPosting[],
): Journal {
	if (row.periodId === null) {
		throw new Error("journal.period_id is required for accounting");
	}
	return {
		id: row.id,
		organizationId: row.organizationId,
		periodId: row.periodId,
		code: row.code,
		normalizedCode: row.normalizedCode,
		currencyCode: row.currencyCode,
		description: row.description,
		status: journalStatus(row.status),
		journalType: journalType(row.journalType),
		reversalOfJournalId: row.reversalOfJournalId,
		reversedByJournalId: row.reversedByJournalId,
		version: row.version,
		createdBy: row.createdBy,
		updatedBy: row.updatedBy,
		postedAt: row.postedAt,
		postedBy: row.postedBy,
		reversedAt: row.reversedAt,
		reversedBy: row.reversedBy,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt,
		lines,
		postings,
	};
}

type LedgerAccountSqlRow = {
	id: string;
	organization_id: string;
	chart_of_account_id: string;
	code: string;
	normalized_code: string;
	name: string;
	account_type: string;
	normal_balance: string;
	is_control: boolean;
	status: string;
	version: number;
	created_by: string;
	updated_by: string;
	created_at: Date;
	updated_at: Date;
};

function mapLedgerAccountSql(row: LedgerAccountSqlRow): LedgerAccount {
	const status = row.status === "inactive" ? "inactive" : "active";
	return {
		id: row.id,
		organizationId: row.organization_id,
		chartOfAccountId: row.chart_of_account_id,
		code: row.code,
		normalizedCode: row.normalized_code,
		name: row.name,
		accountType: accountType(row.account_type),
		normalBalance: normalBalance(row.normal_balance),
		isControl: row.is_control,
		status,
		version: row.version,
		createdBy: row.created_by,
		updatedBy: row.updated_by,
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	};
}

async function reloadJournal(
	store: DrizzleAccountingStore,
	organizationId: string,
	id: string,
	message: string,
): Promise<Result<Journal>> {
	const loaded = await store.getById(organizationId, id);
	if (!loaded.ok) return loaded;
	return loaded.data === null
		? fail("INTERNAL_ERROR", message)
		: ok(loaded.data);
}

async function reloadPeriod(
	organizationId: string,
	id: string,
	message: string,
): Promise<Result<AccountingPeriod>> {
	const [row] = await db
		.select()
		.from(accountingPeriod)
		.where(
			and(
				eq(accountingPeriod.organizationId, organizationId),
				eq(accountingPeriod.id, id),
			),
		)
		.limit(1);
	return row === undefined
		? fail("INTERNAL_ERROR", message)
		: ok(mapPeriod(row));
}

export class DrizzleAccountingStore implements AccountingStore {
	async openPeriod(
		record: Parameters<AccountingStore["openPeriod"]>[0],
	): Promise<Result<AccountingPeriod>> {
		const id = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[{ id: string }[]]>(
				(sql) => [
					sql`
						INSERT INTO accounting_period (
							id, organization_id, code, name, starts_on, ends_on,
							status, version, created_by, updated_by
						)
						SELECT ${id}, ${record.organizationId}, ${record.normalizedCode},
							${record.code}, ${record.startDate}::date,
							${record.endDate}::date, 'open', 1, ${record.actorUserId},
							${record.actorUserId}
						WHERE NOT EXISTS (
							SELECT 1 FROM accounting_period
							WHERE organization_id = ${record.organizationId}
								AND daterange(starts_on, ends_on, '[]')
									&& daterange(${record.startDate}::date, ${record.endDate}::date, '[]')
						)
						RETURNING id
					`,
				],
				{ isolationLevel: "Serializable" },
			);
			if (rows[0] === undefined) {
				return fail("CONFLICT", "Accounting periods cannot overlap");
			}
			return reloadPeriod(
				record.organizationId,
				id,
				"Created accounting period missing",
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to open accounting period");
		}
	}

	async softClosePeriod(
		record: Parameters<AccountingStore["softClosePeriod"]>[0],
	): Promise<Result<AccountingPeriod>> {
		try {
			const [rows] = await runNeonHttpTransaction<[{ id: string }[]]>((sql) => [
				sql`
					UPDATE accounting_period
					SET status = 'soft_closed', soft_closed = true,
						soft_closed_at = now(), soft_closed_by = ${record.actorUserId},
						version = version + 1, updated_at = now()
					WHERE id = ${record.periodId}
						AND organization_id = ${record.organizationId}
						AND status = 'open' AND version = ${record.expectedVersion}
					RETURNING id
				`,
			]);
			if (rows[0] === undefined) {
				return fail("CONFLICT", "Accounting period soft-close conflict");
			}
			return reloadPeriod(
				record.organizationId,
				record.periodId,
				"Soft-closed accounting period missing",
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to soft-close accounting period");
		}
	}

	async closePeriod(
		record: Parameters<AccountingStore["closePeriod"]>[0],
	): Promise<Result<AccountingPeriod>> {
		try {
			const [rows] = await runNeonHttpTransaction<[{ id: string }[]]>((sql) => [
				sql`
					UPDATE accounting_period
					SET status = 'closed', version = version + 1,
						close_reason = ${record.closeReason},
						closed_by = ${record.actorUserId}, closed_at = now(), updated_at = now()
					WHERE id = ${record.periodId}
						AND organization_id = ${record.organizationId}
						AND status = 'soft_closed' AND version = ${record.expectedVersion}
					RETURNING id
				`,
			]);
			if (rows[0] === undefined) {
				return fail("CONFLICT", "Accounting period close conflict");
			}
			return reloadPeriod(
				record.organizationId,
				record.periodId,
				"Closed accounting period missing",
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to close accounting period");
		}
	}

	async reopenPeriod(
		record: Parameters<AccountingStore["reopenPeriod"]>[0],
	): Promise<Result<AccountingPeriod>> {
		try {
			const [rows] = await runNeonHttpTransaction<[{ id: string }[]]>((sql) => [
				sql`
					UPDATE accounting_period
					SET status = 'open', soft_closed = false,
						reopen_reason = ${record.reason},
						reopened_at = now(), reopened_by = ${record.actorUserId},
						version = version + 1, updated_at = now()
					WHERE id = ${record.periodId}
						AND organization_id = ${record.organizationId}
						AND status IN ('soft_closed', 'closed')
						AND version = ${record.expectedVersion}
					RETURNING id
				`,
			]);
			if (rows[0] === undefined) {
				return fail("CONFLICT", "Accounting period reopen conflict");
			}
			return reloadPeriod(
				record.organizationId,
				record.periodId,
				"Reopened accounting period missing",
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to reopen accounting period");
		}
	}

	async createDraft(
		record: Parameters<AccountingStore["createDraft"]>[0],
	): Promise<Result<Journal>> {
		const id = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[{ id: string }[]]>((sql) => [
				sql`
					INSERT INTO journal (
						id, organization_id, period_id, code, normalized_code, description,
						currency_code, journal_type, status, version, created_by, updated_by
					)
					SELECT ${id}, organization_id, id, ${record.code}, ${record.normalizedCode},
						${record.description}, ${record.currencyCode}, ${record.journalType},
						'draft', 1, ${record.actorUserId}, ${record.actorUserId}
					FROM accounting_period
					WHERE id = ${record.periodId}
						AND organization_id = ${record.organizationId}
					RETURNING id
				`,
			]);
			if (rows[0] === undefined) {
				return fail("NOT_FOUND", "Accounting period not found");
			}
			return reloadJournal(
				this,
				record.organizationId,
				id,
				"Created journal missing",
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to create journal");
		}
	}

	async addLine(
		record: Parameters<AccountingStore["addLine"]>[0],
	): Promise<Result<JournalLine>> {
		const id = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<
				[
					Array<{
						id: string;
						organization_id: string;
						journal_id: string;
						line_no: number;
						account_code: string;
						account_name: string | null;
						ledger_account_id: string | null;
						debit_amount: string;
						credit_amount: string;
						created_by: string;
						created_at: Date;
					}>,
				]
			>((sql) => [
				sql`
					WITH eligible AS (
						SELECT j.id, COALESCE(MAX(l.line_no), 0) + 1 AS next_line
						FROM journal j
						LEFT JOIN journal_line l
							ON l.journal_id = j.id AND l.organization_id = j.organization_id
						WHERE j.id = ${record.journalId}
							AND j.organization_id = ${record.organizationId}
							AND j.status = 'draft'
						GROUP BY j.id
					),
					inserted AS (
						INSERT INTO journal_line (
							id, organization_id, journal_id, line_no, account_code,
							account_name, ledger_account_id, debit_amount, credit_amount,
							version, created_by, updated_by
						)
						SELECT ${id}, ${record.organizationId}, id, next_line,
							${record.accountCode}, ${record.description},
							${record.ledgerAccountId}, ${record.debit},
							${record.credit}, 1, ${record.actorUserId}, ${record.actorUserId}
						FROM eligible RETURNING *
					)
					SELECT inserted.* FROM inserted
				`,
			]);
			const row = rows[0];
			if (row === undefined)
				return fail("CONFLICT", "Journal line add conflict");
			return ok({
				id: row.id,
				organizationId: row.organization_id,
				journalId: row.journal_id,
				lineNumber: row.line_no,
				accountCode: row.account_code,
				description: row.account_name,
				ledgerAccountId: row.ledger_account_id,
				debit: row.debit_amount,
				credit: row.credit_amount,
				createdBy: row.created_by,
				createdAt: row.created_at,
			});
		} catch (error) {
			return failFromUnknown(error, "Failed to add journal line");
		}
	}

	async post(
		record: Parameters<AccountingStore["post"]>[0],
	): Promise<Result<Journal>> {
		const eventId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[{ id: string }[]]>((sql) => [
				sql`
					WITH eligible AS (
						SELECT j.*
						FROM journal j
						JOIN accounting_period p
							ON p.id = j.period_id AND p.organization_id = j.organization_id
						JOIN journal_line l
							ON l.journal_id = j.id AND l.organization_id = j.organization_id
						WHERE j.id = ${record.journalId}
							AND j.organization_id = ${record.organizationId}
							AND j.status = 'draft' AND j.version = ${record.expectedVersion}
							AND p.status = 'open'
						GROUP BY j.id
						HAVING COUNT(l.id) >= 1
							AND SUM(l.debit_amount::numeric) = SUM(l.credit_amount::numeric)
					),
					mutated AS (
						UPDATE journal j
						SET status = 'posted', posted_at = now(),
							posted_by = ${record.actorUserId}, updated_at = now(),
							updated_by = ${record.actorUserId}, version = j.version + 1
						FROM eligible e
						WHERE j.id = e.id AND j.organization_id = e.organization_id
						RETURNING j.*
					),
					posted AS (
						INSERT INTO ledger_posting (
							id, organization_id, journal_id, journal_line_id, period_id,
							account_code, ledger_account_id, debit_amount, credit_amount,
							version, created_by, updated_by
						)
						SELECT gen_random_uuid(), l.organization_id, l.journal_id, l.id,
							m.period_id, l.account_code, l.ledger_account_id,
							l.debit_amount, l.credit_amount, 1,
							${record.actorUserId}, ${record.actorUserId}
						FROM journal_line l
						JOIN mutated m
							ON m.id = l.journal_id AND m.organization_id = l.organization_id
						RETURNING id
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT ${eventId}, organization_id, 'accounting.journal.posted.v1',
							'accounting', ${record.correlationId}, ${record.actorUserId},
							jsonb_build_object(
								'organizationId', organization_id, 'entityId', id,
								'periodId', period_id, 'code', code,
								'actorId', ${record.actorUserId},
								'correlationId', ${record.correlationId}
							), 'pending', 0
						FROM mutated WHERE EXISTS (SELECT 1 FROM posted)
						RETURNING id
					)
					SELECT mutated.id FROM mutated, outboxed
				`,
			]);
			if (rows[0] === undefined)
				return fail("CONFLICT", "Journal post conflict");
			return reloadJournal(
				this,
				record.organizationId,
				record.journalId,
				"Posted journal missing",
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to post journal");
		}
	}

	async reverse(
		record: Parameters<AccountingStore["reverse"]>[0],
	): Promise<Result<Journal>> {
		const reversalId = randomUUID();
		const eventId = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[{ id: string }[]]>((sql) => [
				sql`
					WITH eligible AS (
						SELECT j.*
						FROM journal j
						JOIN accounting_period p
							ON p.id = j.period_id AND p.organization_id = j.organization_id
						WHERE j.id = ${record.journalId}
							AND j.organization_id = ${record.organizationId}
							AND j.status = 'posted' AND j.version = ${record.expectedVersion}
							AND j.reversed_by_journal_id IS NULL
							AND p.status = 'open'
					),
					reversal_journal AS (
						INSERT INTO journal (
							id, organization_id, period_id, code, normalized_code,
							description, currency_code, journal_type,
							reversal_of_journal_id, status, version,
							posted_at, posted_by, created_by, updated_by
						)
						SELECT ${reversalId}, e.organization_id, e.period_id,
							'REV-' || e.code, 'REV-' || e.normalized_code,
							${record.reason}, e.currency_code, 'reversal',
							e.id, 'posted', 1,
							now(), ${record.actorUserId},
							${record.actorUserId}, ${record.actorUserId}
						FROM eligible e
						RETURNING *
					),
					reversal_lines AS (
						INSERT INTO journal_line (
							id, organization_id, journal_id, line_no, account_code,
							account_name, ledger_account_id,
							debit_amount, credit_amount, version, created_by, updated_by
						)
						SELECT gen_random_uuid(), l.organization_id, ${reversalId},
							l.line_no, l.account_code,
							'Reversal: ' || COALESCE(l.account_name, ''),
							l.ledger_account_id,
							l.credit_amount, l.debit_amount, 1,
							${record.actorUserId}, ${record.actorUserId}
						FROM journal_line l
						JOIN eligible e ON e.id = l.journal_id AND e.organization_id = l.organization_id
						RETURNING *
					),
					reversal_postings AS (
						INSERT INTO ledger_posting (
							id, organization_id, journal_id, journal_line_id, period_id,
							account_code, ledger_account_id,
							debit_amount, credit_amount, version, created_by, updated_by
						)
						SELECT gen_random_uuid(), rl.organization_id, rl.journal_id,
							rl.id, rj.period_id, rl.account_code, rl.ledger_account_id,
							rl.debit_amount, rl.credit_amount, 1,
							${record.actorUserId}, ${record.actorUserId}
						FROM reversal_lines rl
						JOIN reversal_journal rj ON rj.id = rl.journal_id
						RETURNING id
					),
					mutated AS (
						UPDATE journal j
						SET status = 'reversed', reversed_at = now(),
							reversed_by = ${record.actorUserId},
							reversed_by_journal_id = ${reversalId},
							updated_at = now(), updated_by = ${record.actorUserId},
							version = j.version + 1
						FROM eligible e
						WHERE j.id = e.id AND j.organization_id = e.organization_id
							AND EXISTS (SELECT 1 FROM reversal_postings)
						RETURNING j.*
					),
					outboxed AS (
						INSERT INTO platform_domain_event (
							id, organization_id, type, source_module, correlation_id,
							actor_user_id, payload, status, attempts
						)
						SELECT ${eventId}, organization_id, 'accounting.journal.reversed.v1',
							'accounting', ${record.correlationId}, ${record.actorUserId},
							jsonb_build_object(
								'organizationId', organization_id, 'entityId', id,
								'reversalJournalId', ${reversalId},
								'reason', ${record.reason},
								'actorId', ${record.actorUserId},
								'correlationId', ${record.correlationId}
							), 'pending', 0 FROM mutated RETURNING id
					)
					SELECT ${reversalId}::uuid AS id FROM mutated, outboxed
				`,
			]);
			if (rows[0] === undefined) {
				return fail("CONFLICT", "Journal reversal conflict");
			}
			return reloadJournal(
				this,
				record.organizationId,
				reversalId,
				"Reversal journal missing",
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to reverse journal");
		}
	}

	async getById(
		organizationId: string,
		id: string,
	): Promise<Result<Journal | null>> {
		try {
			const [header] = await db
				.select()
				.from(journal)
				.where(
					and(eq(journal.organizationId, organizationId), eq(journal.id, id)),
				)
				.limit(1);
			if (header === undefined) return ok(null);
			const [lines, postings] = await Promise.all([
				db
					.select()
					.from(journalLine)
					.where(
						and(
							eq(journalLine.organizationId, organizationId),
							eq(journalLine.journalId, id),
						),
					),
				db
					.select()
					.from(ledgerPosting)
					.where(
						and(
							eq(ledgerPosting.organizationId, organizationId),
							eq(ledgerPosting.journalId, id),
						),
					),
			]);
			return ok(
				mapJournal(header, lines.map(mapLine), postings.map(mapPosting)),
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to load journal");
		}
	}

	async list(
		filter: Parameters<AccountingStore["list"]>[0],
	): Promise<Result<Journal[]>> {
		try {
			const conditions = [eq(journal.organizationId, filter.organizationId)];
			if (filter.status !== undefined) {
				conditions.push(eq(journal.status, filter.status));
			}
			if (filter.periodId !== undefined) {
				conditions.push(eq(journal.periodId, filter.periodId));
			}
			const headers = await db
				.select()
				.from(journal)
				.where(and(...conditions))
				.orderBy(desc(journal.updatedAt), desc(journal.id))
				.limit(filter.pageSize)
				.offset((filter.page - 1) * filter.pageSize);
			const loaded = await Promise.all(
				headers.map((row) => this.getById(filter.organizationId, row.id)),
			);
			const journals: Journal[] = [];
			for (const result of loaded) {
				if (!result.ok) return result;
				if (result.data === null) {
					return fail("INTERNAL_ERROR", "Listed journal missing");
				}
				journals.push(result.data);
			}
			return ok(journals);
		} catch (error) {
			return failFromUnknown(error, "Failed to list journals");
		}
	}

	async trialBalance(
		filter: Parameters<AccountingStore["trialBalance"]>[0],
	): Promise<Result<TrialBalanceRow[]>> {
		try {
			const [rows] = await runNeonHttpTransaction<
				[
					Array<{
						account_code: string;
						total_debit: string;
						total_credit: string;
						balance: string;
					}>,
				]
			>(
				(sql) => [
					sql`
						SELECT account_code,
							SUM(debit_amount::numeric)::text AS total_debit,
							SUM(credit_amount::numeric)::text AS total_credit,
							(SUM(debit_amount::numeric) - SUM(credit_amount::numeric))::text AS balance
						FROM ledger_posting
						WHERE organization_id = ${filter.organizationId}
							AND (${filter.periodId ?? null}::uuid IS NULL
								OR period_id = ${filter.periodId ?? null}::uuid)
						GROUP BY account_code
						ORDER BY account_code
					`,
				],
				{ readOnly: true },
			);
			return ok(
				rows.map((row) => ({
					accountCode: row.account_code,
					totalDebit: row.total_debit,
					totalCredit: row.total_credit,
					balance: row.balance,
				})),
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to calculate trial balance");
		}
	}

	async createChartOfAccounts(
		record: Parameters<AccountingStore["createChartOfAccounts"]>[0],
	): Promise<Result<ChartOfAccounts>> {
		const id = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[{ id: string }[]]>((sql) => [
				sql`
					INSERT INTO chart_of_account (id, organization_id, code, name, status, version, created_by, updated_by)
					VALUES (${id}, ${record.organizationId}, ${record.code}, ${record.name}, 'active', 1, ${record.actorUserId}, ${record.actorUserId})
					ON CONFLICT (organization_id, code) DO NOTHING
					RETURNING id
				`,
			]);
			if (rows[0] === undefined) return fail("CONFLICT", "Chart of accounts code already exists");
			return ok({
				id, organizationId: record.organizationId, code: record.code,
				name: record.name, status: "active" as const, version: 1,
				createdBy: record.actorUserId, updatedBy: record.actorUserId,
				createdAt: new Date(), updatedAt: new Date(),
			});
		} catch (error) {
			return failFromUnknown(error, "Failed to create chart of accounts");
		}
	}

	async createLedgerAccount(
		record: Parameters<AccountingStore["createLedgerAccount"]>[0],
	): Promise<Result<LedgerAccount>> {
		const id = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[{ id: string }[]]>((sql) => [
				sql`
					INSERT INTO ledger_account (
						id, organization_id, chart_of_account_id, code, normalized_code,
						name, account_type, normal_balance, is_control, status, version,
						created_by, updated_by
					) VALUES (
						${id}, ${record.organizationId}, ${record.chartOfAccountId},
						${record.code}, ${record.normalizedCode}, ${record.name},
						${record.accountType}, ${record.normalBalance}, ${record.isControl},
						'active', 1, ${record.actorUserId}, ${record.actorUserId}
					) RETURNING id
				`,
			]);
			if (rows[0] === undefined) return fail("CONFLICT", "Ledger account code already exists");
			const now = new Date();
			return ok({
				id, organizationId: record.organizationId,
				chartOfAccountId: record.chartOfAccountId,
				code: record.code, normalizedCode: record.normalizedCode,
				name: record.name, accountType: record.accountType,
				normalBalance: record.normalBalance, isControl: record.isControl,
				status: "active" as const, version: 1,
				createdBy: record.actorUserId, updatedBy: record.actorUserId,
				createdAt: now, updatedAt: now,
			});
		} catch (error) {
			return failFromUnknown(error, "Failed to create ledger account");
		}
	}

	async updateLedgerAccount(
		record: Parameters<AccountingStore["updateLedgerAccount"]>[0],
	): Promise<Result<LedgerAccount>> {
		try {
			const [rows] = await runNeonHttpTransaction<[LedgerAccountSqlRow[]]>(
				(sql) => [
					sql`
					UPDATE ledger_account
					SET name = ${record.name}, account_type = ${record.accountType},
						normal_balance = ${record.normalBalance}, is_control = ${record.isControl},
						version = version + 1, updated_by = ${record.actorUserId}, updated_at = now()
					WHERE id = ${record.id} AND organization_id = ${record.organizationId}
						AND version = ${record.expectedVersion}
					RETURNING *
				`,
				],
			);
			const row = rows[0];
			if (row === undefined) return fail("CONFLICT", "Version mismatch");
			return ok(mapLedgerAccountSql(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to update ledger account");
		}
	}

	async deactivateLedgerAccount(
		record: Parameters<AccountingStore["deactivateLedgerAccount"]>[0],
	): Promise<Result<LedgerAccount>> {
		try {
			const [rows] = await runNeonHttpTransaction<[LedgerAccountSqlRow[]]>(
				(sql) => [
					sql`
					UPDATE ledger_account
					SET status = 'inactive', version = version + 1,
						updated_by = ${record.actorUserId}, updated_at = now()
					WHERE id = ${record.id} AND organization_id = ${record.organizationId}
						AND status = 'active' AND version = ${record.expectedVersion}
					RETURNING *
				`,
				],
			);
			const row = rows[0];
			if (row === undefined) return fail("CONFLICT", "Deactivation conflict");
			return ok(mapLedgerAccountSql(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to deactivate ledger account");
		}
	}

	async listLedgerAccounts(
		filter: Parameters<AccountingStore["listLedgerAccounts"]>[0],
	): Promise<Result<LedgerAccount[]>> {
		try {
			const [rows] = await runNeonHttpTransaction<[LedgerAccountSqlRow[]]>(
				(sql) => [
					sql`
					SELECT * FROM ledger_account
					WHERE organization_id = ${filter.organizationId}
						AND (${filter.chartOfAccountId ?? null}::uuid IS NULL
							OR chart_of_account_id = ${filter.chartOfAccountId ?? null}::uuid)
						AND (${filter.status ?? null}::text IS NULL
							OR status = ${filter.status ?? null}::text)
					ORDER BY code
				`,
				],
				{ readOnly: true },
			);
			return ok(rows.map(mapLedgerAccountSql));
		} catch (error) {
			return failFromUnknown(error, "Failed to list ledger accounts");
		}
	}

	async resolveLedgerAccountByCode(
		organizationId: string,
		normalizedCode: string,
	): Promise<Result<LedgerAccount | null>> {
		try {
			const [rows] = await runNeonHttpTransaction<[LedgerAccountSqlRow[]]>(
				(sql) => [
					sql`
					SELECT * FROM ledger_account
					WHERE organization_id = ${organizationId}
						AND normalized_code = ${normalizedCode}
					LIMIT 1
				`,
				],
				{ readOnly: true },
			);
			const row = rows[0];
			return ok(row === undefined ? null : mapLedgerAccountSql(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to resolve ledger account");
		}
	}

	async mapAccountRole(
		record: Parameters<AccountingStore["mapAccountRole"]>[0],
	): Promise<Result<AccountRoleMapping>> {
		const id = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[AccountRoleMappingSqlRow[]]>(
				(sql) => [
					sql`
					INSERT INTO account_role_mapping (id, organization_id, account_role, ledger_account_id, version, created_by, updated_by)
					VALUES (${id}, ${record.organizationId}, ${record.accountRole}, ${record.ledgerAccountId}, 1, ${record.actorUserId}, ${record.actorUserId})
					ON CONFLICT (organization_id, account_role) DO UPDATE
					SET ledger_account_id = EXCLUDED.ledger_account_id, version = account_role_mapping.version + 1,
						updated_by = EXCLUDED.updated_by, updated_at = now()
					RETURNING *
				`,
				],
			);
			const row = rows[0];
			if (row === undefined) return fail("INTERNAL_ERROR", "Upsert returned nothing");
			return ok(mapAccountRoleSql(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to map account role");
		}
	}

	async resolveAccountRole(
		organizationId: string,
		accountRole: string,
	): Promise<Result<AccountRoleMapping | null>> {
		try {
			const [rows] = await runNeonHttpTransaction<[AccountRoleMappingSqlRow[]]>(
				(sql) => [
					sql`
					SELECT * FROM account_role_mapping
					WHERE organization_id = ${organizationId} AND account_role = ${accountRole}
					LIMIT 1
				`,
				],
				{ readOnly: true },
			);
			const row = rows[0];
			return ok(row === undefined ? null : mapAccountRoleSql(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to resolve account role");
		}
	}

	async upsertPostingProfile(
		record: Parameters<AccountingStore["upsertPostingProfile"]>[0],
	): Promise<Result<PostingProfile>> {
		const id = randomUUID();
		const lineRows = record.lines.map((line) => ({
			id: randomUUID(),
			lineNo: line.lineNo,
			side: line.side,
			accountRole: line.accountRole,
		}));
		try {
			const [profileRows] = await runNeonHttpTransaction<
				[{ id: string; version: number }[]]
			>((sql) => {
				const statements = [
					sql`
						INSERT INTO posting_profile (
							id, organization_id, code, event_type, version_number,
							status, version, created_by, updated_by
						)
						VALUES (
							${id}, ${record.organizationId}, ${record.code},
							${record.eventType}, ${record.versionNumber}, 'active', 1,
							${record.actorUserId}, ${record.actorUserId}
						)
						ON CONFLICT (organization_id, code, version_number) DO UPDATE
						SET event_type = EXCLUDED.event_type, status = 'active',
							version = posting_profile.version + 1,
							updated_by = EXCLUDED.updated_by, updated_at = now()
						RETURNING id, version
					`,
					sql`
						DELETE FROM posting_profile_line
						WHERE organization_id = ${record.organizationId}
							AND posting_profile_id IN (
								SELECT id FROM posting_profile
								WHERE organization_id = ${record.organizationId}
									AND code = ${record.code}
									AND version_number = ${record.versionNumber}
							)
					`,
				];
				for (const line of lineRows) {
					statements.push(sql`
						INSERT INTO posting_profile_line (
							id, organization_id, posting_profile_id, line_no, side,
							account_role, version, created_by, updated_by
						)
						SELECT ${line.id}, ${record.organizationId}, pp.id,
							${line.lineNo}, ${line.side}, ${line.accountRole}, 1,
							${record.actorUserId}, ${record.actorUserId}
						FROM posting_profile pp
						WHERE pp.organization_id = ${record.organizationId}
							AND pp.code = ${record.code}
							AND pp.version_number = ${record.versionNumber}
					`);
				}
				return statements;
			});
			const profile = profileRows[0];
			if (profile === undefined) {
				return fail("INTERNAL_ERROR", "Posting profile upsert returned nothing");
			}
			const now = new Date();
			return ok({
				id: profile.id,
				organizationId: record.organizationId,
				code: record.code,
				eventType: record.eventType,
				versionNumber: record.versionNumber,
				status: "active",
				version: profile.version,
				lines: lineRows,
				createdBy: record.actorUserId,
				updatedBy: record.actorUserId,
				createdAt: now,
				updatedAt: now,
			});
		} catch (error) {
			return failFromUnknown(error, "Failed to upsert posting profile");
		}
	}

	async getActivePostingProfile(
		organizationId: string,
		code: string,
	): Promise<Result<PostingProfile | null>> {
		try {
			const [rows] = await runNeonHttpTransaction<
				[
					Array<{
						id: string;
						organization_id: string;
						code: string;
						event_type: string;
						version_number: number;
						status: string;
						version: number;
						lines: unknown;
						created_by: string;
						updated_by: string;
						created_at: Date;
						updated_at: Date;
					}>,
				]
			>(
				(sql) => [
					sql`
					SELECT pp.*, json_agg(json_build_object(
						'id', ppl.id, 'lineNo', ppl.line_no,
						'side', ppl.side, 'accountRole', ppl.account_role
					) ORDER BY ppl.line_no) FILTER (WHERE ppl.id IS NOT NULL) AS lines
					FROM posting_profile pp
					LEFT JOIN posting_profile_line ppl ON ppl.posting_profile_id = pp.id
					WHERE pp.organization_id = ${organizationId}
						AND pp.code = ${code} AND pp.status = 'active'
					GROUP BY pp.id
					ORDER BY pp.version_number DESC
					LIMIT 1
				`,
				],
				{ readOnly: true },
			);
			const r = rows[0];
			if (r === undefined) return ok(null);
			const parsedLines = z
				.array(postingProfileLineSqlSchema)
				.safeParse(r.lines ?? []);
			if (!parsedLines.success) {
				return fail("INTERNAL_ERROR", "Invalid posting profile lines payload");
			}
			return ok({
				id: r.id,
				organizationId: r.organization_id,
				code: r.code,
				eventType: r.event_type,
				versionNumber: r.version_number,
				status: r.status === "inactive" ? "inactive" : "active",
				version: r.version,
				lines: parsedLines.data,
				createdBy: r.created_by,
				updatedBy: r.updated_by,
				createdAt: r.created_at,
				updatedAt: r.updated_at,
			});
		} catch (error) {
			return failFromUnknown(error, "Failed to get active posting profile");
		}
	}

	async findSourcePostingLink(
		record: Parameters<AccountingStore["findSourcePostingLink"]>[0],
	): Promise<Result<SourcePostingLink | null>> {
		try {
			const [rows] = await runNeonHttpTransaction<[SourcePostingLinkSqlRow[]]>(
				(sql) => [
					sql`
					SELECT * FROM source_posting_link
					WHERE organization_id = ${record.organizationId}
						AND source_module = ${record.sourceModule}
						AND source_aggregate_id = ${record.sourceAggregateId}
						AND source_event_id = ${record.sourceEventId}
						AND source_event_version = ${record.sourceEventVersion}
						AND posting_rule_version = ${record.postingRuleVersion}
					LIMIT 1
				`,
				],
				{ readOnly: true },
			);
			const row = rows[0];
			return ok(row === undefined ? null : mapSourcePostingLinkSql(row));
		} catch (error) {
			return failFromUnknown(error, "Failed to find source posting link");
		}
	}

	async createSourcePostingLink(
		record: Parameters<AccountingStore["createSourcePostingLink"]>[0],
	): Promise<Result<SourcePostingLink>> {
		const id = randomUUID();
		try {
			await runNeonHttpTransaction<[{ id: string }[]]>((sql) => [
				sql`
					INSERT INTO source_posting_link (
						id, organization_id, source_module, source_aggregate_id,
						source_event_id, source_event_version, posting_rule_id,
						posting_rule_version, journal_id, causation_id, created_by
					) VALUES (
						${id}, ${record.organizationId}, ${record.sourceModule},
						${record.sourceAggregateId}, ${record.sourceEventId},
						${record.sourceEventVersion}, ${record.postingRuleId},
						${record.postingRuleVersion}, ${record.journalId},
						${record.causationId}, ${record.actorUserId}
					) RETURNING id
				`,
			]);
			return ok({
				id, organizationId: record.organizationId,
				sourceModule: record.sourceModule,
				sourceAggregateId: record.sourceAggregateId,
				sourceEventId: record.sourceEventId,
				sourceEventVersion: record.sourceEventVersion,
				postingRuleId: record.postingRuleId,
				postingRuleVersion: record.postingRuleVersion,
				journalId: record.journalId,
				causationId: record.causationId,
				createdBy: record.actorUserId, createdAt: new Date(),
			});
		} catch (error) {
			return failFromUnknown(error, "Failed to create source posting link");
		}
	}

	async createPostingException(
		record: Parameters<AccountingStore["createPostingException"]>[0],
	): Promise<Result<PostingException>> {
		const id = randomUUID();
		try {
			await runNeonHttpTransaction<[{ id: string }[]]>((sql) => [
				sql`
					INSERT INTO financial_posting_exception (
						id, organization_id, source_module, source_aggregate_id,
						source_event_id, source_event_version, posting_rule_code,
						reason_code, message, status, payload, version, created_by, updated_by
					) VALUES (
						${id}, ${record.organizationId}, ${record.sourceModule},
						${record.sourceAggregateId}, ${record.sourceEventId},
						${record.sourceEventVersion}, ${record.postingRuleCode},
						${record.reasonCode}, ${record.message}, 'open',
						${JSON.stringify(record.payload)}::jsonb, 1,
						${record.actorUserId}, ${record.actorUserId}
					) RETURNING id
				`,
			]);
			const now = new Date();
			return ok({
				id, organizationId: record.organizationId,
				sourceModule: record.sourceModule,
				sourceAggregateId: record.sourceAggregateId,
				sourceEventId: record.sourceEventId,
				sourceEventVersion: record.sourceEventVersion,
				postingRuleCode: record.postingRuleCode,
				reasonCode: record.reasonCode, message: record.message,
				status: "open" as const, resolutionNote: null,
				resolvedBy: null, resolvedAt: null,
				payload: record.payload, version: 1,
				createdBy: record.actorUserId, updatedBy: record.actorUserId,
				createdAt: now, updatedAt: now,
			});
		} catch (error) {
			return failFromUnknown(error, "Failed to create posting exception");
		}
	}

	async listPostingExceptions(
		filter: Parameters<AccountingStore["listPostingExceptions"]>[0],
	): Promise<Result<PostingException[]>> {
		try {
			const [rows] = await runNeonHttpTransaction<
				[
					Array<{
						id: string;
						organization_id: string;
						source_module: string;
						source_aggregate_id: string;
						source_event_id: string;
						source_event_version: number;
						posting_rule_code: string | null;
						reason_code: string;
						message: string;
						status: string;
						resolution_note: string | null;
						resolved_by: string | null;
						resolved_at: Date | null;
						payload: unknown;
						version: number;
						created_by: string;
						updated_by: string;
						created_at: Date;
						updated_at: Date;
					}>,
				]
			>(
				(sql) => [
					sql`
					SELECT * FROM financial_posting_exception
					WHERE organization_id = ${filter.organizationId}
						AND (${filter.status ?? null}::text IS NULL
							OR status = ${filter.status ?? null}::text)
					ORDER BY created_at DESC
				`,
				],
				{ readOnly: true },
			);
			return ok(
				rows.map((r) => ({
					id: r.id,
					organizationId: r.organization_id,
					sourceModule: r.source_module,
					sourceAggregateId: r.source_aggregate_id,
					sourceEventId: r.source_event_id,
					sourceEventVersion: r.source_event_version,
					postingRuleCode: r.posting_rule_code,
					reasonCode: r.reason_code,
					message: r.message,
					status: exceptionStatus(r.status),
					resolutionNote: r.resolution_note,
					resolvedBy: r.resolved_by,
					resolvedAt: r.resolved_at,
					payload: r.payload,
					version: r.version,
					createdBy: r.created_by,
					updatedBy: r.updated_by,
					createdAt: r.created_at,
					updatedAt: r.updated_at,
				})),
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to list posting exceptions");
		}
	}

	async resolvePostingException(
		record: Parameters<AccountingStore["resolvePostingException"]>[0],
	): Promise<Result<PostingException>> {
		try {
			const [rows] = await runNeonHttpTransaction<
				[
					Array<{
						id: string;
						organization_id: string;
						source_module: string;
						source_aggregate_id: string;
						source_event_id: string;
						source_event_version: number;
						posting_rule_code: string | null;
						reason_code: string;
						message: string;
						status: string;
						resolution_note: string | null;
						resolved_by: string | null;
						resolved_at: Date | null;
						payload: unknown;
						version: number;
						created_by: string;
						updated_by: string;
						created_at: Date;
						updated_at: Date;
					}>,
				]
			>((sql) => [
				sql`
					UPDATE financial_posting_exception
					SET status = 'resolved', resolution_note = ${record.resolutionNote},
						resolved_by = ${record.actorUserId}, resolved_at = now(),
						version = version + 1, updated_by = ${record.actorUserId}, updated_at = now()
					WHERE id = ${record.id} AND organization_id = ${record.organizationId}
						AND version = ${record.expectedVersion} AND status != 'resolved'
					RETURNING *
				`,
			]);
			const r = rows[0];
			if (r === undefined) return fail("CONFLICT", "Exception resolve conflict");
			return ok({
				id: r.id,
				organizationId: r.organization_id,
				sourceModule: r.source_module,
				sourceAggregateId: r.source_aggregate_id,
				sourceEventId: r.source_event_id,
				sourceEventVersion: r.source_event_version,
				postingRuleCode: r.posting_rule_code,
				reasonCode: r.reason_code,
				message: r.message,
				status: exceptionStatus(r.status),
				resolutionNote: r.resolution_note,
				resolvedBy: r.resolved_by,
				resolvedAt: r.resolved_at,
				payload: r.payload,
				version: r.version,
				createdBy: r.created_by,
				updatedBy: r.updated_by,
				createdAt: r.created_at,
				updatedAt: r.updated_at,
			});
		} catch (error) {
			return failFromUnknown(error, "Failed to resolve posting exception");
		}
	}

	async getSourcePostingTrace(
		filter: Parameters<AccountingStore["getSourcePostingTrace"]>[0],
	): Promise<Result<SourcePostingTrace[]>> {
		try {
			const [rows] = await runNeonHttpTransaction<
				[
					Array<{
						id: string;
						organization_id: string;
						source_module: string;
						source_aggregate_id: string;
						source_event_id: string;
						source_event_version: number;
						posting_rule_id: string;
						posting_rule_version: number;
						journal_id: string;
						causation_id: string | null;
						created_by: string;
						created_at: Date;
					}>,
				]
			>(
				(sql) => [
					sql`
					SELECT * FROM source_posting_link
					WHERE organization_id = ${filter.organizationId}
						AND (${filter.journalId ?? null}::uuid IS NULL
							OR journal_id = ${filter.journalId ?? null}::uuid)
						AND (${filter.sourceModule ?? null}::text IS NULL
							OR source_module = ${filter.sourceModule ?? null}::text)
						AND (${filter.sourceAggregateId ?? null}::text IS NULL
							OR source_aggregate_id = ${filter.sourceAggregateId ?? null}::text)
						AND (${filter.sourceEventId ?? null}::text IS NULL
							OR source_event_id = ${filter.sourceEventId ?? null}::text)
				`,
				],
				{ readOnly: true },
			);
			const traces: SourcePostingTrace[] = [];
			for (const r of rows) {
				const link: SourcePostingLink = {
					id: r.id,
					organizationId: r.organization_id,
					sourceModule: r.source_module,
					sourceAggregateId: r.source_aggregate_id,
					sourceEventId: r.source_event_id,
					sourceEventVersion: r.source_event_version,
					postingRuleId: r.posting_rule_id,
					postingRuleVersion: r.posting_rule_version,
					journalId: r.journal_id,
					causationId: r.causation_id,
					createdBy: r.created_by,
					createdAt: r.created_at,
				};
				const journalResult = await this.getById(
					filter.organizationId,
					link.journalId,
				);
				if (journalResult.ok && journalResult.data) {
					traces.push({ link, journal: journalResult.data });
				}
			}
			return ok(traces);
		} catch (error) {
			return failFromUnknown(error, "Failed to get source posting trace");
		}
	}

	async getLedgerAccountActivity(
		filter: Parameters<AccountingStore["getLedgerAccountActivity"]>[0],
	): Promise<Result<LedgerAccountActivityRow[]>> {
		try {
			const [rows] = await runNeonHttpTransaction<
				[
					Array<{
						journal_id: string;
						journal_code: string;
						period_id: string;
						account_code: string;
						debit_amount: string;
						credit_amount: string;
						posted_at: Date;
					}>,
				]
			>(
				(sql) => [
					sql`
					SELECT lp.journal_id, j.code AS journal_code, lp.period_id,
						lp.account_code, lp.debit_amount, lp.credit_amount,
						lp.posted_at
					FROM ledger_posting lp
					JOIN journal j ON j.id = lp.journal_id
					WHERE lp.organization_id = ${filter.organizationId}
						AND (${filter.accountCode ?? null}::text IS NULL
							OR lp.account_code = ${filter.accountCode ?? null}::text)
						AND (${filter.periodId ?? null}::uuid IS NULL
							OR lp.period_id = ${filter.periodId ?? null}::uuid)
					ORDER BY lp.posted_at
				`,
				],
				{ readOnly: true },
			);
			return ok(
				rows.map((r) => ({
					journalId: r.journal_id,
					journalCode: r.journal_code,
					periodId: r.period_id,
					accountCode: r.account_code,
					debit: r.debit_amount,
					credit: r.credit_amount,
					postedAt: r.posted_at,
				})),
			);
		} catch (error) {
			return failFromUnknown(error, "Failed to get ledger account activity");
		}
	}
}

export function createDrizzleAccountingStore(): DrizzleAccountingStore {
	return new DrizzleAccountingStore();
}
