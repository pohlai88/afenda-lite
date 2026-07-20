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

import type {
	AccountingPeriod,
	AccountingPeriodStatus,
	AccountingStore,
	Journal,
	JournalLine,
	JournalStatus,
	LedgerPosting,
	TrialBalanceRow,
} from "./model";

function periodStatus(value: string): AccountingPeriodStatus {
	if (value === "open" || value === "closed") return value;
	throw new Error(`Invalid accounting_period.status: ${value}`);
}

function journalStatus(value: string): JournalStatus {
	if (value === "draft" || value === "posted" || value === "reversed")
		return value;
	throw new Error(`Invalid journal.status: ${value}`);
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
		reversalOfJournalId: null,
		reversedByJournalId: null,
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

	async closePeriod(
		record: Parameters<AccountingStore["closePeriod"]>[0],
	): Promise<Result<AccountingPeriod>> {
		try {
			const [rows] = await runNeonHttpTransaction<[{ id: string }[]]>((sql) => [
				sql`
					UPDATE accounting_period
					SET status = 'closed', version = version + 1,
						closed_by = ${record.actorUserId}, closed_at = now(), updated_at = now()
					WHERE id = ${record.periodId}
						AND organization_id = ${record.organizationId}
						AND status = 'open' AND version = ${record.expectedVersion}
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

	async createDraft(
		record: Parameters<AccountingStore["createDraft"]>[0],
	): Promise<Result<Journal>> {
		const id = randomUUID();
		try {
			const [rows] = await runNeonHttpTransaction<[{ id: string }[]]>((sql) => [
				sql`
					INSERT INTO journal (
						id, organization_id, period_id, code, normalized_code, description,
						currency_code, status, version, created_by, updated_by
					)
					SELECT ${id}, organization_id, id, ${record.code}, ${record.normalizedCode},
						${record.description}, ${record.currencyCode}, 'draft', 1, ${record.actorUserId},
						${record.actorUserId}
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
							account_name, debit_amount, credit_amount, version, created_by, updated_by
						)
						SELECT ${id}, ${record.organizationId}, id, next_line,
							${record.accountCode}, ${record.description}, ${record.debit},
							${record.credit}, 1, ${record.actorUserId}, ${record.actorUserId}
						FROM eligible RETURNING *
					),
					bumped AS (
						UPDATE journal SET version = version + 1,
							updated_by = ${record.actorUserId}, updated_at = now()
						WHERE id = ${record.journalId}
							AND organization_id = ${record.organizationId}
							AND EXISTS (SELECT 1 FROM inserted)
						RETURNING id
					)
					SELECT inserted.* FROM inserted, bumped
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
						HAVING COUNT(l.id) >= 2
							AND SUM(l.debit_amount::numeric) > 0
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
							account_code, debit_amount, credit_amount, version,
							created_by, updated_by
						)
						SELECT gen_random_uuid(), l.organization_id, l.journal_id, l.id,
							m.period_id, l.account_code, l.debit_amount, l.credit_amount, 1,
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
								'reversalOfJournalId', NULL,
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
							AND p.status = 'open'
					),
					posted AS (
						INSERT INTO ledger_posting (
							id, organization_id, journal_id, journal_line_id, period_id,
							account_code, debit_amount, credit_amount, version,
							created_by, updated_by
						)
						SELECT gen_random_uuid(), l.organization_id, l.journal_id, l.id,
							e.period_id, l.account_code, l.credit_amount, l.debit_amount, 1,
							${record.actorUserId}, ${record.actorUserId}
						FROM journal_line l
						JOIN eligible e
							ON e.id = l.journal_id AND e.organization_id = l.organization_id
						RETURNING id
					),
					mutated AS (
						UPDATE journal j
						SET status = 'reversed', reversed_at = now(),
							reversed_by = ${record.actorUserId},
							updated_at = now(), updated_by = ${record.actorUserId},
							version = j.version + 1
						FROM eligible e
						WHERE j.id = e.id AND j.organization_id = e.organization_id
							AND EXISTS (SELECT 1 FROM posted)
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
								'periodId', period_id, 'code', code,
								'reversalOfJournalId', NULL,
								'reversalPostingIds', (SELECT jsonb_agg(id) FROM posted),
								'reason', ${record.reason},
								'actorId', ${record.actorUserId},
								'correlationId', ${record.correlationId}
							), 'pending', 0 FROM mutated RETURNING id
					)
					SELECT mutated.id FROM mutated, outboxed
				`,
			]);
			if (rows[0] === undefined) {
				return fail("CONFLICT", "Journal reversal conflict");
			}
			return reloadJournal(
				this,
				record.organizationId,
				record.journalId,
				"Reversed journal missing",
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
}

export function createDrizzleAccountingStore(): DrizzleAccountingStore {
	return new DrizzleAccountingStore();
}
