import { randomUUID } from "node:crypto";

import { fail, ok, type Result } from "@afenda/errors/result";

import type {
	AccountingPeriod,
	AccountingStore,
	Journal,
	JournalLine,
	LedgerPosting,
	TrialBalanceRow,
} from "./model";

const SCALE = 1_000_000n;

function decimal(value: string): bigint {
	const [whole = "0", fraction = ""] = value.split(".");
	return BigInt(whole) * SCALE + BigInt(fraction.padEnd(6, "0").slice(0, 6));
}

function formatted(value: bigint): string {
	const negative = value < 0n;
	const absolute = negative ? -value : value;
	const whole = absolute / SCALE;
	const fraction = (absolute % SCALE)
		.toString()
		.padStart(6, "0")
		.replace(/0+$/, "");
	const result =
		fraction.length === 0 ? whole.toString() : `${whole}.${fraction}`;
	return negative ? `-${result}` : result;
}

function clonePeriod(period: AccountingPeriod): AccountingPeriod {
	return { ...period };
}

function cloneJournal(journal: Journal): Journal {
	return {
		...journal,
		lines: journal.lines.map((line) => ({ ...line })),
		postings: journal.postings.map((posting) => ({ ...posting })),
	};
}

function eventPayload(
	journal: Journal,
	actorUserId: string,
	correlationId: string,
): Record<string, unknown> {
	return {
		organizationId: journal.organizationId,
		entityId: journal.id,
		periodId: journal.periodId,
		code: journal.code,
		reversalOfJournalId: journal.reversalOfJournalId,
		lines: journal.lines.map((line) => ({
			accountCode: line.accountCode,
			debit: line.debit,
			credit: line.credit,
		})),
		actorId: actorUserId,
		correlationId,
	};
}

export class MemoryAccountingStore implements AccountingStore {
	private readonly periods = new Map<string, AccountingPeriod>();
	private readonly journals = new Map<string, Journal>();

	private period(
		organizationId: string,
		periodId: string,
	): Result<AccountingPeriod> {
		const found = this.periods.get(periodId);
		return found === undefined || found.organizationId !== organizationId
			? fail("NOT_FOUND", "Accounting period not found")
			: ok(found);
	}

	private journal(organizationId: string, journalId: string): Result<Journal> {
		const found = this.journals.get(journalId);
		return found === undefined || found.organizationId !== organizationId
			? fail("NOT_FOUND", "Journal not found")
			: ok(found);
	}

	private codeAvailable(
		organizationId: string,
		normalizedCode: string,
	): boolean {
		for (const row of this.journals.values()) {
			if (
				row.organizationId === organizationId &&
				row.normalizedCode === normalizedCode
			) {
				return false;
			}
		}
		return true;
	}

	async openPeriod(
		record: Parameters<AccountingStore["openPeriod"]>[0],
	): Promise<Result<AccountingPeriod>> {
		for (const period of this.periods.values()) {
			if (period.organizationId !== record.organizationId) continue;
			if (period.normalizedCode === record.normalizedCode) {
				return fail("CONFLICT", "Accounting period code already exists");
			}
			if (
				record.startDate <= period.endDate &&
				record.endDate >= period.startDate
			) {
				return fail("CONFLICT", "Accounting periods cannot overlap");
			}
		}
		const now = new Date();
		const period: AccountingPeriod = {
			id: randomUUID(),
			organizationId: record.organizationId,
			code: record.code,
			normalizedCode: record.normalizedCode,
			startDate: record.startDate,
			endDate: record.endDate,
			status: "open",
			version: 1,
			openedBy: record.actorUserId,
			closedBy: null,
			closedAt: null,
			createdAt: now,
			updatedAt: now,
		};
		this.periods.set(period.id, period);
		return ok(clonePeriod(period));
	}

	async closePeriod(
		record: Parameters<AccountingStore["closePeriod"]>[0],
	): Promise<Result<AccountingPeriod>> {
		const found = this.period(record.organizationId, record.periodId);
		if (!found.ok) return found;
		if (found.data.status !== "open") {
			return fail("CONFLICT", "Only an open accounting period can be closed");
		}
		if (found.data.version !== record.expectedVersion) {
			return fail("CONFLICT", "Accounting period version conflict");
		}
		const now = new Date();
		found.data.status = "closed";
		found.data.version += 1;
		found.data.closedBy = record.actorUserId;
		found.data.closedAt = now;
		found.data.updatedAt = now;
		return ok(clonePeriod(found.data));
	}

	async createDraft(
		record: Parameters<AccountingStore["createDraft"]>[0],
	): Promise<Result<Journal>> {
		const period = this.period(record.organizationId, record.periodId);
		if (!period.ok) return period;
		if (!this.codeAvailable(record.organizationId, record.normalizedCode)) {
			return fail("CONFLICT", "Journal code already exists");
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
		this.journals.set(journal.id, journal);
		return ok(cloneJournal(journal));
	}

	async addLine(
		record: Parameters<AccountingStore["addLine"]>[0],
	): Promise<Result<JournalLine>> {
		const found = this.journal(record.organizationId, record.journalId);
		if (!found.ok) return found;
		if (found.data.status !== "draft") {
			return fail("CONFLICT", "Journal lines are immutable after posting");
		}
		const line: JournalLine = {
			id: randomUUID(),
			organizationId: record.organizationId,
			journalId: record.journalId,
			lineNumber: found.data.lines.length + 1,
			accountCode: record.accountCode,
			description: record.description,
			debit: record.debit,
			credit: record.credit,
			createdBy: record.actorUserId,
			createdAt: new Date(),
		};
		found.data.lines.push(line);
		found.data.version += 1;
		found.data.updatedBy = record.actorUserId;
		found.data.updatedAt = line.createdAt;
		return ok({ ...line });
	}

	async post(
		record: Parameters<AccountingStore["post"]>[0],
	): Promise<Result<Journal>> {
		const found = this.journal(record.organizationId, record.journalId);
		if (!found.ok) return found;
		const journal = found.data;
		if (journal.status !== "draft") {
			return fail("CONFLICT", "Only a draft journal can be posted");
		}
		if (journal.version !== record.expectedVersion) {
			return fail("CONFLICT", "Journal version conflict");
		}
		const period = this.period(record.organizationId, journal.periodId);
		if (!period.ok) return period;
		if (period.data.status !== "open") {
			return fail("CONFLICT", "Closed accounting period rejects posting");
		}
		if (journal.lines.length < 2) {
			return fail("CONFLICT", "A journal requires at least two lines");
		}
		const totals = journal.lines.reduce(
			(value, line) => ({
				debit: value.debit + decimal(line.debit),
				credit: value.credit + decimal(line.credit),
			}),
			{ debit: 0n, credit: 0n },
		);
		if (totals.debit === 0n || totals.debit !== totals.credit) {
			return fail("CONFLICT", "Journal debits and credits must balance");
		}
		const previous = cloneJournal(journal);
		const now = new Date();
		journal.postings = journal.lines.map((line) => ({
			id: randomUUID(),
			organizationId: journal.organizationId,
			journalId: journal.id,
			journalLineId: line.id,
			periodId: journal.periodId,
			accountCode: line.accountCode,
			debit: line.debit,
			credit: line.credit,
			postedAt: now,
			postedBy: record.actorUserId,
		}));
		journal.status = "posted";
		journal.version += 1;
		journal.postedAt = now;
		journal.postedBy = record.actorUserId;
		journal.updatedAt = now;
		journal.updatedBy = record.actorUserId;
		const emitted = await record.effects.emit({
			type: "accounting.journal.posted.v1",
			organizationId: journal.organizationId,
			actorUserId: record.actorUserId,
			correlationId: record.correlationId,
			payload: eventPayload(journal, record.actorUserId, record.correlationId),
		});
		if (!emitted.ok) {
			this.journals.set(journal.id, previous);
			return emitted;
		}
		return ok(cloneJournal(journal));
	}

	async reverse(
		record: Parameters<AccountingStore["reverse"]>[0],
	): Promise<Result<Journal>> {
		const found = this.journal(record.organizationId, record.journalId);
		if (!found.ok) return found;
		const original = found.data;
		if (original.status !== "posted") {
			return fail("CONFLICT", "Only a posted journal can be reversed");
		}
		if (original.version !== record.expectedVersion) {
			return fail("CONFLICT", "Journal version conflict");
		}
		const period = this.period(record.organizationId, original.periodId);
		if (!period.ok) return period;
		if (period.data.status !== "open") {
			return fail("CONFLICT", "Closed accounting period rejects posting");
		}
		const previous = cloneJournal(original);
		const now = new Date();
		const reversalPostings = original.lines.map(
			(line): LedgerPosting => ({
				id: randomUUID(),
				organizationId: original.organizationId,
				journalId: original.id,
				journalLineId: line.id,
				periodId: original.periodId,
				accountCode: line.accountCode,
				debit: line.credit,
				credit: line.debit,
				postedAt: now,
				postedBy: record.actorUserId,
			}),
		);
		original.postings.push(...reversalPostings);
		original.status = "reversed";
		original.reversedAt = now;
		original.reversedBy = record.actorUserId;
		original.updatedAt = now;
		original.updatedBy = record.actorUserId;
		original.version += 1;
		const emitted = await record.effects.emit({
			type: "accounting.journal.reversed.v1",
			organizationId: original.organizationId,
			actorUserId: record.actorUserId,
			correlationId: record.correlationId,
			payload: {
				...eventPayload(original, record.actorUserId, record.correlationId),
				reversalPostingIds: reversalPostings.map((posting) => posting.id),
				reason: record.reason,
			},
		});
		if (!emitted.ok) {
			this.journals.set(original.id, previous);
			return emitted;
		}
		return ok(cloneJournal(original));
	}

	async getById(
		organizationId: string,
		id: string,
	): Promise<Result<Journal | null>> {
		const found = this.journals.get(id);
		return ok(
			found !== undefined && found.organizationId === organizationId
				? cloneJournal(found)
				: null,
		);
	}

	async list(
		filter: Parameters<AccountingStore["list"]>[0],
	): Promise<Result<Journal[]>> {
		const start = (filter.page - 1) * filter.pageSize;
		return ok(
			[...this.journals.values()]
				.filter((row) => row.organizationId === filter.organizationId)
				.filter(
					(row) => filter.status === undefined || row.status === filter.status,
				)
				.filter(
					(row) =>
						filter.periodId === undefined || row.periodId === filter.periodId,
				)
				.sort(
					(left, right) => right.updatedAt.getTime() - left.updatedAt.getTime(),
				)
				.slice(start, start + filter.pageSize)
				.map(cloneJournal),
		);
	}

	async trialBalance(
		filter: Parameters<AccountingStore["trialBalance"]>[0],
	): Promise<Result<TrialBalanceRow[]>> {
		const totals = new Map<string, { debit: bigint; credit: bigint }>();
		for (const journal of this.journals.values()) {
			if (journal.organizationId !== filter.organizationId) continue;
			if (filter.periodId !== undefined && journal.periodId !== filter.periodId)
				continue;
			for (const posting of journal.postings) {
				const current = totals.get(posting.accountCode) ?? {
					debit: 0n,
					credit: 0n,
				};
				current.debit += decimal(posting.debit);
				current.credit += decimal(posting.credit);
				totals.set(posting.accountCode, current);
			}
		}
		return ok(
			[...totals.entries()]
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([accountCode, total]) => ({
					accountCode,
					totalDebit: formatted(total.debit),
					totalCredit: formatted(total.credit),
					balance: formatted(total.debit - total.credit),
				})),
		);
	}
}

export function createMemoryAccountingStore(): MemoryAccountingStore {
	return new MemoryAccountingStore();
}
