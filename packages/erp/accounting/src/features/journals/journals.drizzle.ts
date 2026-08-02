import { randomUUID } from "node:crypto";

import {
	database as afendaDatabase,
	and,
	desc,
	eq,
	journal,
	journalLine,
	ledgerPosting,
} from "@afenda/db";
import {
	errorIngress,
	errorProject,
	errorResult,
	type Result,
} from "@afenda/errors";

import type {
	Journal,
	JournalLine,
	JournalStatus,
	JournalType,
	LedgerAccountActivityRow,
	LedgerPosting,
	TrialBalanceRow,
} from "../../kernel/contracts/domain";
import type { AccountingJournalsStore } from "./journals.store";

function failFromPersistence(error: unknown, _fallbackMessage: string) {
	return errorProject.result(
		errorIngress.postgres(error, { operation: "persistence.postgres" }),
	);
}

interface TrialBalanceSqlRow {
	account_code: string;
	balance: string;
	total_credit: string;
	total_debit: string;
}

interface LedgerAccountActivitySqlRow {
	account_code: string;
	credit_amount: string;
	debit_amount: string;
	journal_code: string;
	journal_id: string;
	period_id: string;
	posted_at: Date;
}

function journalStatus(value: string): JournalStatus {
	if (value === "draft" || value === "posted" || value === "reversed") {
		return value;
	}
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

async function getById(
	organizationId: string,
	id: string,
): Promise<Result<Journal | null>> {
	try {
		const [header] = await afendaDatabase.client
			.select()
			.from(journal)
			.where(
				and(eq(journal.organizationId, organizationId), eq(journal.id, id)),
			)
			.limit(1);
		if (header === undefined) {
			return errorResult.ok(null);
		}
		const [lines, postings] = await Promise.all([
			afendaDatabase.client
				.select()
				.from(journalLine)
				.where(
					and(
						eq(journalLine.organizationId, organizationId),
						eq(journalLine.journalId, id),
					),
				),
			afendaDatabase.client
				.select()
				.from(ledgerPosting)
				.where(
					and(
						eq(ledgerPosting.organizationId, organizationId),
						eq(ledgerPosting.journalId, id),
					),
				),
		]);
		return errorResult.ok(
			mapJournal(header, lines.map(mapLine), postings.map(mapPosting)),
		);
	} catch (error) {
		return failFromPersistence(error, "Failed to load journal");
	}
}

async function reloadJournal(
	organizationId: string,
	id: string,
	_message: string,
): Promise<Result<Journal>> {
	const loaded = await getById(organizationId, id);
	if (!loaded.ok) {
		return loaded;
	}
	return loaded.data === null
		? errorResult.fail("INTERNAL_ERROR")
		: errorResult.ok(loaded.data);
}

export const drizzleJournalsMethods: AccountingJournalsStore = {
	async createDraft(
		record: Parameters<AccountingJournalsStore["createDraft"]>[0],
	): Promise<Result<Journal>> {
		const id = randomUUID();
		try {
			const [rows] = await afendaDatabase.transaction((sql) => [
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
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "Accounting period not found",
				});
			}
			return reloadJournal(
				record.organizationId,
				id,
				"Created journal missing",
			);
		} catch (error) {
			return failFromPersistence(error, "Failed to create journal");
		}
	},

	async addLine(
		record: Parameters<AccountingJournalsStore["addLine"]>[0],
	): Promise<Result<JournalLine>> {
		const id = randomUUID();
		try {
			const [rows] = await afendaDatabase.transaction((sql) => [
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
			const [row] = rows;
			if (row === undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Journal line add conflict",
				});
			}
			return errorResult.ok({
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
			return failFromPersistence(error, "Failed to add journal line");
		}
	},

	async post(
		record: Parameters<AccountingJournalsStore["post"]>[0],
	): Promise<Result<Journal>> {
		const eventId = randomUUID();
		try {
			const [rows] = await afendaDatabase.transaction((sql) => [
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
			if (rows[0] === undefined) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Journal post conflict",
				});
			}
			return reloadJournal(
				record.organizationId,
				record.journalId,
				"Posted journal missing",
			);
		} catch (error) {
			return failFromPersistence(error, "Failed to post journal");
		}
	},

	async reverse(
		record: Parameters<AccountingJournalsStore["reverse"]>[0],
	): Promise<Result<Journal>> {
		const reversalId = randomUUID();
		const eventId = randomUUID();
		try {
			const [rows] = await afendaDatabase.transaction((sql) => [
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
				return errorResult.fail("CONFLICT", {
					publicMessage: "Journal reversal conflict",
				});
			}
			return reloadJournal(
				record.organizationId,
				reversalId,
				"Reversal journal missing",
			);
		} catch (error) {
			return failFromPersistence(error, "Failed to reverse journal");
		}
	},

	getById,

	async list(
		filter: Parameters<AccountingJournalsStore["list"]>[0],
	): Promise<Result<Journal[]>> {
		try {
			const conditions = [eq(journal.organizationId, filter.organizationId)];
			if (filter.status !== undefined) {
				conditions.push(eq(journal.status, filter.status));
			}
			if (filter.periodId !== undefined) {
				conditions.push(eq(journal.periodId, filter.periodId));
			}
			const headers = await afendaDatabase.client
				.select()
				.from(journal)
				.where(and(...conditions))
				.orderBy(desc(journal.updatedAt), desc(journal.id))
				.limit(filter.pageSize)
				.offset((filter.page - 1) * filter.pageSize);
			const loaded = await Promise.all(
				headers.map((row) => getById(filter.organizationId, row.id)),
			);
			const journals: Journal[] = [];
			for (const result of loaded) {
				if (!result.ok) {
					return result;
				}
				if (result.data === null) {
					return errorResult.fail("INTERNAL_ERROR");
				}
				journals.push(result.data);
			}
			return errorResult.ok(journals);
		} catch (error) {
			return failFromPersistence(error, "Failed to list journals");
		}
	},

	async trialBalance(
		filter: Parameters<AccountingJournalsStore["trialBalance"]>[0],
	): Promise<Result<TrialBalanceRow[]>> {
		try {
			const [rows] = await afendaDatabase.transaction(
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
			return errorResult.ok(
				rows.map((row: TrialBalanceSqlRow) => ({
					accountCode: row.account_code,
					totalDebit: row.total_debit,
					totalCredit: row.total_credit,
					balance: row.balance,
				})),
			);
		} catch (error) {
			return failFromPersistence(error, "Failed to calculate trial balance");
		}
	},

	async getLedgerAccountActivity(
		filter: Parameters<AccountingJournalsStore["getLedgerAccountActivity"]>[0],
	): Promise<Result<LedgerAccountActivityRow[]>> {
		try {
			const [rows] = await afendaDatabase.transaction(
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
			return errorResult.ok(
				rows.map((r: LedgerAccountActivitySqlRow) => ({
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
			return failFromPersistence(
				error,
				"Failed to get ledger account activity",
			);
		}
	},
};
