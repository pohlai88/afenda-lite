import { randomUUID } from "node:crypto";

import { errorResult, type Result } from "@afenda/errors";

import type {
	AccountingPeriod,
	Journal,
	JournalLine,
	LedgerAccountActivityRow,
	LedgerPosting,
	TrialBalanceRow,
} from "../../kernel/contracts/domain";
import { resolveOperation } from "../../kernel/execution/async";
import {
	findJournal,
	findPeriod,
	type MemoryAccountingState,
} from "../../kernel/memory/state";
import { normalize } from "../../kernel/validation/parse-input";
import type { AccountingJournalsStore } from "./journals.store";

function validateJournalPosting(
	journal: Journal,
	period: AccountingPeriod | undefined,
	expectedVersion: number,
): Result<void> {
	if (journal.status !== "draft") {
		return errorResult.fail("CONFLICT", {
			publicMessage: "Journal is not in draft status",
		});
	}
	if (journal.version !== expectedVersion) {
		return errorResult.fail("CONFLICT", { publicMessage: "Version mismatch" });
	}
	if (journal.lines.length === 0) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Journal has no lines",
		});
	}
	if (!period) {
		return errorResult.fail("NOT_FOUND", { publicMessage: "Period not found" });
	}
	if (period.status !== "open") {
		return errorResult.fail("CONFLICT", {
			publicMessage: "The request conflicts with current state",
		});
	}
	const totals = journal.lines.reduce(
		(accumulator, line) => ({
			debit: accumulator.debit + Number.parseFloat(line.debit),
			credit: accumulator.credit + Number.parseFloat(line.credit),
		}),
		{ debit: 0, credit: 0 },
	);
	return Math.abs(totals.debit - totals.credit) > 0.001
		? errorResult.fail("VALIDATION_ERROR", {
				publicMessage: "Journal does not balance: debits must equal credits",
			})
		: errorResult.ok(undefined);
}

function buildLedgerPostings(
	journal: Journal,
	actorUserId: string,
	postedAt: Date,
): LedgerPosting[] {
	return journal.lines.map((line) => ({
		id: randomUUID(),
		organizationId: journal.organizationId,
		journalId: journal.id,
		journalLineId: line.id,
		periodId: journal.periodId,
		accountCode: line.accountCode,
		ledgerAccountId: line.ledgerAccountId,
		debit: line.debit,
		credit: line.credit,
		postedAt,
		postedBy: actorUserId,
	}));
}

function rollbackJournalPosting(
	journal: Journal,
	previous: { status: Journal["status"]; version: number },
	newPostings: readonly LedgerPosting[],
): void {
	journal.status = previous.status;
	journal.postedAt = null;
	journal.postedBy = null;
	journal.version = previous.version;
	const newPostingIds = new Set(newPostings.map((posting) => posting.id));
	journal.postings = journal.postings.filter(
		(posting) => !newPostingIds.has(posting.id),
	);
}

function buildLedgerAccountActivity(
	journals: readonly Journal[],
	filter: Parameters<AccountingJournalsStore["getLedgerAccountActivity"]>[0],
): LedgerAccountActivityRow[] {
	return journals
		.filter((journal) => journal.organizationId === filter.organizationId)
		.filter((journal) => journal.status !== "draft")
		.filter(
			(journal) =>
				filter.periodId === undefined || journal.periodId === filter.periodId,
		)
		.flatMap((journal) =>
			journal.postings
				.filter(
					(posting) =>
						filter.accountCode === undefined ||
						posting.accountCode === filter.accountCode,
				)
				.map((posting) => ({
					journalId: journal.id,
					journalCode: journal.code,
					periodId: journal.periodId,
					accountCode: posting.accountCode,
					debit: posting.debit,
					credit: posting.credit,
					postedAt: posting.postedAt,
				})),
		);
}

export function createMemoryJournalsMethods(
	state: MemoryAccountingState,
): AccountingJournalsStore {
	return {
		createDraft(record): Promise<Result<Journal>> {
			return resolveOperation(() => {
				const existing = state.journals.find(
					(j) =>
						j.organizationId === record.organizationId &&
						j.normalizedCode === record.normalizedCode,
				);
				if (existing) {
					return errorResult.fail("CONFLICT", {
						publicMessage: "Journal code already exists",
					});
				}
				const now = new Date();
				const journal: Journal = {
					id: randomUUID(),
					organizationId: record.organizationId,
					periodId: record.periodId,
					code: record.code,
					normalizedCode: record.normalizedCode,
					currencyCode: record.currencyCode,
					description: record.description,
					status: "draft",
					journalType: record.journalType,
					reversalOfJournalId: null,
					reversedByJournalId: null,
					version: 1,
					createdBy: record.actorUserId,
					updatedBy: record.actorUserId,
					postedAt: null,
					postedBy: null,
					reversedAt: null,
					reversedBy: null,
					createdAt: now,
					updatedAt: now,
					lines: [],
					postings: [],
				};
				state.journals.push(journal);
				return errorResult.ok(journal);
			});
		},

		addLine(record): Promise<Result<JournalLine>> {
			return resolveOperation(() => {
				const journal = findJournal(
					state,
					record.organizationId,
					record.journalId,
				);
				if (!journal) {
					return errorResult.fail("NOT_FOUND", {
						publicMessage: "Journal not found",
					});
				}
				if (journal.status !== "draft") {
					return errorResult.fail("CONFLICT", {
						publicMessage: "Journal is not in draft status",
					});
				}
				const lineNumber = journal.lines.length + 1;
				const line: JournalLine = {
					id: randomUUID(),
					organizationId: record.organizationId,
					journalId: record.journalId,
					lineNumber,
					accountCode: record.accountCode,
					description: record.description,
					ledgerAccountId: record.ledgerAccountId,
					debit: record.debit,
					credit: record.credit,
					createdBy: record.actorUserId,
					createdAt: new Date(),
				};
				journal.lines.push(line);
				return errorResult.ok(line);
			});
		},

		async post(record): Promise<Result<Journal>> {
			const journal = findJournal(
				state,
				record.organizationId,
				record.journalId,
			);
			if (!journal) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "Journal not found",
				});
			}
			const period = findPeriod(state, record.organizationId, journal.periodId);
			const validation = validateJournalPosting(
				journal,
				period,
				record.expectedVersion,
			);
			if (!validation.ok) {
				return validation;
			}

			const now = new Date();
			const previous = { status: journal.status, version: journal.version };

			journal.status = "posted";
			journal.postedAt = now;
			journal.postedBy = record.actorUserId;
			journal.updatedBy = record.actorUserId;
			journal.updatedAt = now;
			journal.version += 1;

			const newPostings = buildLedgerPostings(journal, record.actorUserId, now);
			journal.postings.push(...newPostings);

			const emitResult = await record.effects.emit({
				type: "accounting.journal.posted.v1",
				organizationId: record.organizationId,
				actorUserId: record.actorUserId,
				correlationId: record.correlationId,
				payload: { journalId: journal.id, code: journal.code },
			});
			if (!emitResult.ok) {
				rollbackJournalPosting(journal, previous, newPostings);
				return emitResult;
			}

			return errorResult.ok(journal);
		},

		async reverse(record): Promise<Result<Journal>> {
			const original = findJournal(
				state,
				record.organizationId,
				record.journalId,
			);
			if (!original) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "Journal not found",
				});
			}
			if (original.status !== "posted") {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Only posted journals can be reversed",
				});
			}
			if (original.version !== record.expectedVersion) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Version mismatch",
				});
			}
			if (original.reversedByJournalId) {
				return errorResult.fail("CONFLICT", {
					publicMessage: "Journal has already been reversed",
				});
			}

			const period = findPeriod(
				state,
				record.organizationId,
				original.periodId,
			);
			if (!period) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "Period not found",
				});
			}
			if (period.status !== "open") {
				return errorResult.fail("CONFLICT", {
					publicMessage: "The request conflicts with current state",
				});
			}

			const now = new Date();
			const reversalCode = `REV-${original.code}`;
			const reversalNormalized = normalize(reversalCode);

			const reversalJournal: Journal = {
				id: randomUUID(),
				organizationId: record.organizationId,
				periodId: original.periodId,
				code: reversalCode,
				normalizedCode: reversalNormalized,
				currencyCode: original.currencyCode,
				description: record.reason,
				status: "posted",
				journalType: "reversal",
				reversalOfJournalId: original.id,
				reversedByJournalId: null,
				version: 1,
				createdBy: record.actorUserId,
				updatedBy: record.actorUserId,
				postedAt: now,
				postedBy: record.actorUserId,
				reversedAt: null,
				reversedBy: null,
				createdAt: now,
				updatedAt: now,
				lines: [],
				postings: [],
			};

			for (const line of original.lines) {
				const reversalLine: JournalLine = {
					id: randomUUID(),
					organizationId: record.organizationId,
					journalId: reversalJournal.id,
					lineNumber: line.lineNumber,
					accountCode: line.accountCode,
					description: `Reversal: ${line.description ?? ""}`,
					ledgerAccountId: line.ledgerAccountId,
					debit: line.credit,
					credit: line.debit,
					createdBy: record.actorUserId,
					createdAt: now,
				};
				reversalJournal.lines.push(reversalLine);

				const posting: LedgerPosting = {
					id: randomUUID(),
					organizationId: record.organizationId,
					journalId: reversalJournal.id,
					journalLineId: reversalLine.id,
					periodId: original.periodId,
					accountCode: reversalLine.accountCode,
					ledgerAccountId: reversalLine.ledgerAccountId,
					debit: reversalLine.debit,
					credit: reversalLine.credit,
					postedAt: now,
					postedBy: record.actorUserId,
				};
				reversalJournal.postings.push(posting);
			}

			state.journals.push(reversalJournal);

			const prevStatus = original.status;
			const prevVersion = original.version;
			original.status = "reversed";
			original.reversedByJournalId = reversalJournal.id;
			original.reversedAt = now;
			original.reversedBy = record.actorUserId;
			original.updatedAt = now;
			original.version += 1;

			const emitResult = await record.effects.emit({
				type: "accounting.journal.reversed.v1",
				organizationId: record.organizationId,
				actorUserId: record.actorUserId,
				correlationId: record.correlationId,
				payload: {
					originalJournalId: original.id,
					reversalJournalId: reversalJournal.id,
				},
			});
			if (!emitResult.ok) {
				original.status = prevStatus;
				original.reversedByJournalId = null;
				original.reversedAt = null;
				original.reversedBy = null;
				original.version = prevVersion;
				const idx = state.journals.indexOf(reversalJournal);
				if (idx >= 0) {
					state.journals.splice(idx, 1);
				}
				return emitResult;
			}

			return errorResult.ok(reversalJournal);
		},

		getById(organizationId, id): Promise<Result<Journal | null>> {
			return resolveOperation(() => {
				const journal = findJournal(state, organizationId, id);
				return errorResult.ok(journal ?? null);
			});
		},

		list(filter): Promise<Result<Journal[]>> {
			return resolveOperation(() => {
				let filtered = state.journals.filter(
					(j) => j.organizationId === filter.organizationId,
				);
				if (filter.status) {
					filtered = filtered.filter((j) => j.status === filter.status);
				}
				if (filter.periodId) {
					filtered = filtered.filter((j) => j.periodId === filter.periodId);
				}
				const start = (filter.page - 1) * filter.pageSize;
				return errorResult.ok(filtered.slice(start, start + filter.pageSize));
			});
		},

		trialBalance(filter): Promise<Result<TrialBalanceRow[]>> {
			return resolveOperation(() => {
				const allPostings = state.journals
					.filter(
						(j) =>
							j.organizationId === filter.organizationId &&
							j.status !== "draft",
					)
					.flatMap((j) => {
						if (filter.periodId && j.periodId !== filter.periodId) {
							return [];
						}
						return j.postings;
					});

				const accountMap = new Map<string, { debit: number; credit: number }>();
				for (const p of allPostings) {
					const entry = accountMap.get(p.accountCode) ?? {
						debit: 0,
						credit: 0,
					};
					entry.debit += Number.parseFloat(p.debit);
					entry.credit += Number.parseFloat(p.credit);
					accountMap.set(p.accountCode, entry);
				}

				const rows: TrialBalanceRow[] = [];
				for (const [accountCode, totals] of accountMap) {
					rows.push({
						accountCode,
						totalDebit: totals.debit.toFixed(2),
						totalCredit: totals.credit.toFixed(2),
						balance: (totals.debit - totals.credit).toFixed(2),
					});
				}
				return errorResult.ok(
					rows.sort((a, b) => a.accountCode.localeCompare(b.accountCode)),
				);
			});
		},

		getLedgerAccountActivity(
			filter,
		): Promise<Result<LedgerAccountActivityRow[]>> {
			return resolveOperation(() =>
				errorResult.ok(buildLedgerAccountActivity(state.journals, filter)),
			);
		},
	};
}
