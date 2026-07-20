import { fail, ok, type Result } from "@afenda/errors/result";
import { randomUUID } from "node:crypto";
import type {
	AccountRoleMapping,
	AccountType,
	AccountingEffects,
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

function normalize(code: string): string {
	return code.toUpperCase().replace(/[\s-]+/g, "");
}

export function createMemoryStore(): AccountingStore {
	const periods: AccountingPeriod[] = [];
	const journals: Journal[] = [];
	const chartOfAccounts: ChartOfAccounts[] = [];
	const ledgerAccounts: LedgerAccount[] = [];
	const accountRoleMappings: AccountRoleMapping[] = [];
	const postingProfiles: PostingProfile[] = [];
	const sourcePostingLinks: SourcePostingLink[] = [];
	const postingExceptions: PostingException[] = [];

	function findPeriod(organizationId: string, periodId: string): AccountingPeriod | undefined {
		return periods.find((p) => p.organizationId === organizationId && p.id === periodId);
	}

	function findJournal(organizationId: string, journalId: string): Journal | undefined {
		return journals.find((j) => j.organizationId === organizationId && j.id === journalId);
	}

	const store: AccountingStore = {
		async createDraft(record): Promise<Result<Journal>> {
			const existing = journals.find(
				(j) =>
					j.organizationId === record.organizationId &&
					j.normalizedCode === record.normalizedCode,
			);
			if (existing) {
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
			journals.push(journal);
			return ok(journal);
		},

		async addLine(record): Promise<Result<JournalLine>> {
			const journal = findJournal(record.organizationId, record.journalId);
			if (!journal) return fail("NOT_FOUND", "Journal not found");
			if (journal.status !== "draft") return fail("CONFLICT", "Journal is not in draft status");
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
			return ok(line);
		},

		async post(record): Promise<Result<Journal>> {
			const journal = findJournal(record.organizationId, record.journalId);
			if (!journal) return fail("NOT_FOUND", "Journal not found");
			if (journal.status !== "draft") return fail("CONFLICT", "Journal is not in draft status");
			if (journal.version !== record.expectedVersion)
				return fail("CONFLICT", "Version mismatch");
			if (journal.lines.length === 0) return fail("VALIDATION_ERROR", "Journal has no lines");

			const period = findPeriod(record.organizationId, journal.periodId);
			if (!period) return fail("NOT_FOUND", "Period not found");
			if (period.status !== "open")
				return fail("CONFLICT", `Cannot post to period with status '${period.status}'`);

			let totalDebit = 0;
			let totalCredit = 0;
			for (const line of journal.lines) {
				totalDebit += Number.parseFloat(line.debit);
				totalCredit += Number.parseFloat(line.credit);
			}
			if (Math.abs(totalDebit - totalCredit) > 0.001)
				return fail("VALIDATION_ERROR", "Journal does not balance: debits must equal credits");

			const now = new Date();
			const prevStatus = journal.status;
			const prevVersion = journal.version;

			journal.status = "posted";
			journal.postedAt = now;
			journal.postedBy = record.actorUserId;
			journal.updatedBy = record.actorUserId;
			journal.updatedAt = now;
			journal.version += 1;

			const newPostings: LedgerPosting[] = [];
			for (const line of journal.lines) {
				const posting: LedgerPosting = {
					id: randomUUID(),
					organizationId: record.organizationId,
					journalId: journal.id,
					journalLineId: line.id,
					periodId: journal.periodId,
					accountCode: line.accountCode,
					ledgerAccountId: line.ledgerAccountId,
					debit: line.debit,
					credit: line.credit,
					postedAt: now,
					postedBy: record.actorUserId,
				};
				newPostings.push(posting);
				journal.postings.push(posting);
			}

			const emitResult = await record.effects.emit({
				type: "accounting.journal.posted.v1",
				organizationId: record.organizationId,
				actorUserId: record.actorUserId,
				correlationId: record.correlationId,
				payload: { journalId: journal.id, code: journal.code },
			});
			if (!emitResult.ok) {
				journal.status = prevStatus;
				journal.postedAt = null;
				journal.postedBy = null;
				journal.version = prevVersion;
				for (const p of newPostings) {
					const idx = journal.postings.indexOf(p);
					if (idx >= 0) journal.postings.splice(idx, 1);
				}
				return emitResult;
			}

			return ok(journal);
		},

		async reverse(record): Promise<Result<Journal>> {
			const original = findJournal(record.organizationId, record.journalId);
			if (!original) return fail("NOT_FOUND", "Journal not found");
			if (original.status !== "posted")
				return fail("CONFLICT", "Only posted journals can be reversed");
			if (original.version !== record.expectedVersion)
				return fail("CONFLICT", "Version mismatch");
			if (original.reversedByJournalId)
				return fail("CONFLICT", "Journal has already been reversed");

			const period = findPeriod(record.organizationId, original.periodId);
			if (!period) return fail("NOT_FOUND", "Period not found");
			if (period.status !== "open")
				return fail("CONFLICT", `Cannot reverse in period with status '${period.status}'`);

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

			journals.push(reversalJournal);

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
				const idx = journals.indexOf(reversalJournal);
				if (idx >= 0) journals.splice(idx, 1);
				return emitResult;
			}

			return ok(reversalJournal);
		},

		async openPeriod(record): Promise<Result<AccountingPeriod>> {
			const existing = periods.find(
				(p) =>
					p.organizationId === record.organizationId &&
					p.normalizedCode === record.normalizedCode,
			);
			if (existing) return fail("CONFLICT", "Period code already exists");

			const now = new Date();
			const period: AccountingPeriod = {
				id: randomUUID(),
				organizationId: record.organizationId,
				code: record.code,
				normalizedCode: record.normalizedCode,
				startDate: record.startDate,
				endDate: record.endDate,
				status: "open",
				softClosed: false,
				softClosedAt: null,
				softClosedBy: null,
				reopenReason: null,
				reopenedAt: null,
				reopenedBy: null,
				closeReason: null,
				version: 1,
				openedBy: record.actorUserId,
				closedBy: null,
				closedAt: null,
				createdAt: now,
				updatedAt: now,
			};
			periods.push(period);
			return ok(period);
		},

		async softClosePeriod(record): Promise<Result<AccountingPeriod>> {
			const period = findPeriod(record.organizationId, record.periodId);
			if (!period) return fail("NOT_FOUND", "Period not found");
			if (period.status !== "open")
				return fail("CONFLICT", "Only open periods can be soft-closed");
			if (period.version !== record.expectedVersion)
				return fail("CONFLICT", "Version mismatch");

			const now = new Date();
			period.status = "soft_closed";
			period.softClosed = true;
			period.softClosedAt = now;
			period.softClosedBy = record.actorUserId;
			period.updatedAt = now;
			period.version += 1;
			return ok(period);
		},

		async closePeriod(record): Promise<Result<AccountingPeriod>> {
			const period = findPeriod(record.organizationId, record.periodId);
			if (!period) return fail("NOT_FOUND", "Period not found");
			if (period.status !== "soft_closed")
				return fail("CONFLICT", "Only soft-closed periods can be closed");
			if (period.version !== record.expectedVersion)
				return fail("CONFLICT", "Version mismatch");

			const now = new Date();
			period.status = "closed";
			period.closeReason = record.closeReason;
			period.closedBy = record.actorUserId;
			period.closedAt = now;
			period.updatedAt = now;
			period.version += 1;
			return ok(period);
		},

		async reopenPeriod(record): Promise<Result<AccountingPeriod>> {
			const period = findPeriod(record.organizationId, record.periodId);
			if (!period) return fail("NOT_FOUND", "Period not found");
			if (period.status !== "soft_closed" && period.status !== "closed")
				return fail("CONFLICT", "Only soft-closed or closed periods can be reopened");
			if (period.version !== record.expectedVersion)
				return fail("CONFLICT", "Version mismatch");

			const now = new Date();
			period.status = "open";
			period.softClosed = false;
			period.reopenReason = record.reason;
			period.reopenedAt = now;
			period.reopenedBy = record.actorUserId;
			period.updatedAt = now;
			period.version += 1;
			return ok(period);
		},

		async getById(organizationId, id): Promise<Result<Journal | null>> {
			const journal = findJournal(organizationId, id);
			return ok(journal ?? null);
		},

		async list(filter): Promise<Result<Journal[]>> {
			let filtered = journals.filter((j) => j.organizationId === filter.organizationId);
			if (filter.status) filtered = filtered.filter((j) => j.status === filter.status);
			if (filter.periodId) filtered = filtered.filter((j) => j.periodId === filter.periodId);
			const start = (filter.page - 1) * filter.pageSize;
			return ok(filtered.slice(start, start + filter.pageSize));
		},

		async trialBalance(filter): Promise<Result<TrialBalanceRow[]>> {
			const allPostings = journals
				.filter((j) => j.organizationId === filter.organizationId && j.status !== "draft")
				.flatMap((j) => {
					if (filter.periodId && j.periodId !== filter.periodId) return [];
					return j.postings;
				});

			const accountMap = new Map<string, { debit: number; credit: number }>();
			for (const p of allPostings) {
				const entry = accountMap.get(p.accountCode) ?? { debit: 0, credit: 0 };
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
			return ok(rows.sort((a, b) => a.accountCode.localeCompare(b.accountCode)));
		},

		async createChartOfAccounts(record): Promise<Result<ChartOfAccounts>> {
			const existing = chartOfAccounts.find(
				(c) =>
					c.organizationId === record.organizationId &&
					c.code.toUpperCase() === record.code.toUpperCase(),
			);
			if (existing) return fail("CONFLICT", "Chart of accounts code already exists");

			const now = new Date();
			const coa: ChartOfAccounts = {
				id: randomUUID(),
				organizationId: record.organizationId,
				code: record.code,
				name: record.name,
				status: "active",
				version: 1,
				createdBy: record.actorUserId,
				updatedBy: record.actorUserId,
				createdAt: now,
				updatedAt: now,
			};
			chartOfAccounts.push(coa);
			return ok(coa);
		},

		async createLedgerAccount(record): Promise<Result<LedgerAccount>> {
			const existing = ledgerAccounts.find(
				(a) =>
					a.organizationId === record.organizationId &&
					a.normalizedCode === record.normalizedCode,
			);
			if (existing) return fail("CONFLICT", "Ledger account code already exists");

			const now = new Date();
			const account: LedgerAccount = {
				id: randomUUID(),
				organizationId: record.organizationId,
				chartOfAccountId: record.chartOfAccountId,
				code: record.code,
				normalizedCode: record.normalizedCode,
				name: record.name,
				accountType: record.accountType,
				normalBalance: record.normalBalance,
				isControl: record.isControl,
				status: "active",
				version: 1,
				createdBy: record.actorUserId,
				updatedBy: record.actorUserId,
				createdAt: now,
				updatedAt: now,
			};
			ledgerAccounts.push(account);
			return ok(account);
		},

		async updateLedgerAccount(record): Promise<Result<LedgerAccount>> {
			const account = ledgerAccounts.find(
				(a) => a.organizationId === record.organizationId && a.id === record.id,
			);
			if (!account) return fail("NOT_FOUND", "Ledger account not found");
			if (account.version !== record.expectedVersion)
				return fail("CONFLICT", "Version mismatch");

			account.name = record.name;
			account.accountType = record.accountType;
			account.normalBalance = record.normalBalance;
			account.isControl = record.isControl;
			account.updatedBy = record.actorUserId;
			account.updatedAt = new Date();
			account.version += 1;
			return ok(account);
		},

		async deactivateLedgerAccount(record): Promise<Result<LedgerAccount>> {
			const account = ledgerAccounts.find(
				(a) => a.organizationId === record.organizationId && a.id === record.id,
			);
			if (!account) return fail("NOT_FOUND", "Ledger account not found");
			if (account.version !== record.expectedVersion)
				return fail("CONFLICT", "Version mismatch");
			if (account.status === "inactive")
				return fail("CONFLICT", "Ledger account is already inactive");

			account.status = "inactive";
			account.updatedBy = record.actorUserId;
			account.updatedAt = new Date();
			account.version += 1;
			return ok(account);
		},

		async listLedgerAccounts(filter): Promise<Result<LedgerAccount[]>> {
			let filtered = ledgerAccounts.filter(
				(a) => a.organizationId === filter.organizationId,
			);
			if (filter.chartOfAccountId)
				filtered = filtered.filter((a) => a.chartOfAccountId === filter.chartOfAccountId);
			if (filter.status) filtered = filtered.filter((a) => a.status === filter.status);
			return ok(filtered);
		},

		async resolveLedgerAccountByCode(organizationId, normalizedCode): Promise<Result<LedgerAccount | null>> {
			const account = ledgerAccounts.find(
				(a) =>
					a.organizationId === organizationId &&
					a.normalizedCode === normalizedCode,
			);
			return ok(account ?? null);
		},

		async mapAccountRole(record): Promise<Result<AccountRoleMapping>> {
			const existing = accountRoleMappings.find(
				(m) =>
					m.organizationId === record.organizationId &&
					m.accountRole === record.accountRole,
			);
			const now = new Date();
			if (existing) {
				existing.ledgerAccountId = record.ledgerAccountId;
				existing.updatedBy = record.actorUserId;
				existing.updatedAt = now;
				existing.version += 1;
				return ok(existing);
			}

			const mapping: AccountRoleMapping = {
				id: randomUUID(),
				organizationId: record.organizationId,
				accountRole: record.accountRole,
				ledgerAccountId: record.ledgerAccountId,
				version: 1,
				createdBy: record.actorUserId,
				updatedBy: record.actorUserId,
				createdAt: now,
				updatedAt: now,
			};
			accountRoleMappings.push(mapping);
			return ok(mapping);
		},

		async resolveAccountRole(organizationId, accountRole): Promise<Result<AccountRoleMapping | null>> {
			const mapping = accountRoleMappings.find(
				(m) => m.organizationId === organizationId && m.accountRole === accountRole,
			);
			return ok(mapping ?? null);
		},

		async upsertPostingProfile(record): Promise<Result<PostingProfile>> {
			const existing = postingProfiles.find(
				(p) =>
					p.organizationId === record.organizationId &&
					p.code === record.code &&
					p.versionNumber === record.versionNumber,
			);

			const now = new Date();
			const profileLines: PostingProfileLine[] = record.lines.map((l) => ({
				id: randomUUID(),
				lineNo: l.lineNo,
				side: l.side,
				accountRole: l.accountRole,
			}));

			if (existing) {
				existing.eventType = record.eventType;
				existing.status = "active";
				existing.lines = profileLines;
				existing.updatedBy = record.actorUserId;
				existing.updatedAt = now;
				existing.version += 1;
				return ok(existing);
			}

			const profile: PostingProfile = {
				id: randomUUID(),
				organizationId: record.organizationId,
				code: record.code,
				eventType: record.eventType,
				versionNumber: record.versionNumber,
				status: "active",
				version: 1,
				lines: profileLines,
				createdBy: record.actorUserId,
				updatedBy: record.actorUserId,
				createdAt: now,
				updatedAt: now,
			};
			postingProfiles.push(profile);
			return ok(profile);
		},

		async getActivePostingProfile(organizationId, code): Promise<Result<PostingProfile | null>> {
			const active = postingProfiles
				.filter(
					(p) =>
						p.organizationId === organizationId &&
						p.code === code &&
						p.status === "active",
				)
				.sort((a, b) => b.versionNumber - a.versionNumber);
			return ok(active[0] ?? null);
		},

		async findSourcePostingLink(record): Promise<Result<SourcePostingLink | null>> {
			const link = sourcePostingLinks.find(
				(l) =>
					l.organizationId === record.organizationId &&
					l.sourceModule === record.sourceModule &&
					l.sourceAggregateId === record.sourceAggregateId &&
					l.sourceEventId === record.sourceEventId &&
					l.sourceEventVersion === record.sourceEventVersion &&
					l.postingRuleVersion === record.postingRuleVersion,
			);
			return ok(link ?? null);
		},

		async createSourcePostingLink(record): Promise<Result<SourcePostingLink>> {
			const now = new Date();
			const link: SourcePostingLink = {
				id: randomUUID(),
				organizationId: record.organizationId,
				sourceModule: record.sourceModule,
				sourceAggregateId: record.sourceAggregateId,
				sourceEventId: record.sourceEventId,
				sourceEventVersion: record.sourceEventVersion,
				postingRuleId: record.postingRuleId,
				postingRuleVersion: record.postingRuleVersion,
				journalId: record.journalId,
				causationId: record.causationId,
				createdBy: record.actorUserId,
				createdAt: now,
			};
			sourcePostingLinks.push(link);
			return ok(link);
		},

		async createPostingException(record): Promise<Result<PostingException>> {
			const now = new Date();
			const exception: PostingException = {
				id: randomUUID(),
				organizationId: record.organizationId,
				sourceModule: record.sourceModule,
				sourceAggregateId: record.sourceAggregateId,
				sourceEventId: record.sourceEventId,
				sourceEventVersion: record.sourceEventVersion,
				postingRuleCode: record.postingRuleCode,
				reasonCode: record.reasonCode,
				message: record.message,
				status: "open",
				resolutionNote: null,
				resolvedBy: null,
				resolvedAt: null,
				payload: record.payload,
				version: 1,
				createdBy: record.actorUserId,
				updatedBy: record.actorUserId,
				createdAt: now,
				updatedAt: now,
			};
			postingExceptions.push(exception);
			return ok(exception);
		},

		async listPostingExceptions(filter): Promise<Result<PostingException[]>> {
			let filtered = postingExceptions.filter(
				(e) => e.organizationId === filter.organizationId,
			);
			if (filter.status) filtered = filtered.filter((e) => e.status === filter.status);
			return ok(filtered);
		},

		async resolvePostingException(record): Promise<Result<PostingException>> {
			const exception = postingExceptions.find(
				(e) => e.organizationId === record.organizationId && e.id === record.id,
			);
			if (!exception) return fail("NOT_FOUND", "Posting exception not found");
			if (exception.version !== record.expectedVersion)
				return fail("CONFLICT", "Version mismatch");
			if (exception.status === "resolved")
				return fail("CONFLICT", "Exception is already resolved");

			exception.status = "resolved";
			exception.resolutionNote = record.resolutionNote;
			exception.resolvedBy = record.actorUserId;
			exception.resolvedAt = new Date();
			exception.updatedBy = record.actorUserId;
			exception.updatedAt = new Date();
			exception.version += 1;
			return ok(exception);
		},

		async getSourcePostingTrace(filter): Promise<Result<SourcePostingTrace[]>> {
			let links = sourcePostingLinks.filter(
				(l) => l.organizationId === filter.organizationId,
			);
			if (filter.journalId) links = links.filter((l) => l.journalId === filter.journalId);
			if (filter.sourceModule)
				links = links.filter((l) => l.sourceModule === filter.sourceModule);
			if (filter.sourceAggregateId)
				links = links.filter((l) => l.sourceAggregateId === filter.sourceAggregateId);
			if (filter.sourceEventId)
				links = links.filter((l) => l.sourceEventId === filter.sourceEventId);

			const traces: SourcePostingTrace[] = [];
			for (const link of links) {
				const journal = findJournal(filter.organizationId, link.journalId);
				if (journal) traces.push({ link, journal });
			}
			return ok(traces);
		},

		async getLedgerAccountActivity(filter): Promise<Result<LedgerAccountActivityRow[]>> {
			const rows: LedgerAccountActivityRow[] = [];
			for (const journal of journals) {
				if (journal.organizationId !== filter.organizationId) continue;
				if (journal.status === "draft") continue;
				if (filter.periodId && journal.periodId !== filter.periodId) continue;

				for (const posting of journal.postings) {
					if (filter.accountCode && posting.accountCode !== filter.accountCode) continue;
					rows.push({
						journalId: journal.id,
						journalCode: journal.code,
						periodId: journal.periodId,
						accountCode: posting.accountCode,
						debit: posting.debit,
						credit: posting.credit,
						postedAt: posting.postedAt,
					});
				}
			}
			return ok(rows);
		},
	};

	return store;
}
