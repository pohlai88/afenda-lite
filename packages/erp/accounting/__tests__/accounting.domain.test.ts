import { ok } from "@afenda/errors/result";
import { describe, expect, it } from "vitest";

import {
	addJournalLine,
	closeAccountingPeriod,
	createChartOfAccounts,
	createDraftJournal,
	createLedgerAccount,
	createMemoryStore,
	getJournalById,
	getTrialBalance,
	openAccountingPeriod,
	postJournal,
	reverseJournal,
	softCloseAccountingPeriod,
} from "../src/index";

const organizationId = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
const actorUserId = "a47ac10b-58cc-4372-a567-0e02b2c3d479";
const authorization = {
	async can() {
		return true;
	},
};
const effects = {
	async emit() {
		return ok(undefined);
	},
};

async function setup() {
	const store = createMemoryStore();
	const options = { store, authorization, effects };

	const coa = await createChartOfAccounts(
		{
			organizationId,
			actorUserId,
			correlationId: "setup-coa",
			code: "MAIN",
			name: "Main Chart",
		},
		options,
	);
	if (!coa.ok) throw new Error(coa.message);

	await createLedgerAccount(
		{
			organizationId,
			actorUserId,
			correlationId: "setup-1000",
			chartOfAccountId: coa.data.id,
			code: "1000",
			name: "Cash",
			accountType: "asset",
			normalBalance: "debit",
		},
		options,
	);
	await createLedgerAccount(
		{
			organizationId,
			actorUserId,
			correlationId: "setup-2000",
			chartOfAccountId: coa.data.id,
			code: "2000",
			name: "Accounts Payable",
			accountType: "liability",
			normalBalance: "credit",
		},
		options,
	);
	await createLedgerAccount(
		{
			organizationId,
			actorUserId,
			correlationId: "setup-4000",
			chartOfAccountId: coa.data.id,
			code: "4000",
			name: "Revenue",
			accountType: "revenue",
			normalBalance: "credit",
		},
		options,
	);

	const period = await openAccountingPeriod(
		{
			organizationId,
			actorUserId,
			correlationId: "setup-period",
			code: "2026-07",
			startDate: "2026-07-01",
			endDate: "2026-07-31",
		},
		options,
	);
	if (!period.ok) throw new Error(period.message);
	const journal = await createDraftJournal(
		{
			organizationId,
			actorUserId,
			correlationId: "setup-journal",
			periodId: period.data.id,
			code: "JRN-1",
			currencyCode: "USD",
			description: "Month-end entry",
		},
		options,
	);
	if (!journal.ok) throw new Error(journal.message);
	return { options, period: period.data, journal: journal.data, coa: coa.data };
}

describe("accounting journal lifecycle", () => {
	it("requires balanced debits and credits and creates ledger postings", async () => {
		const { options, period, journal } = await setup();
		for (const line of [
			{ accountCode: "1000", debit: "100", credit: "0" },
			{ accountCode: "4000", debit: "0", credit: "90" },
		]) {
			const result = await addJournalLine(
				{
					organizationId,
					actorUserId,
					correlationId: "add-line",
					journalId: journal.id,
					...line,
				},
				options,
			);
			expect(result.ok).toBe(true);
		}
		const unbalanced = await postJournal(
			{
				organizationId,
				actorUserId,
				correlationId: "post-unbalanced",
				journalId: journal.id,
				expectedVersion: 1,
			},
			options,
		);
		expect(unbalanced).toMatchObject({ ok: false });

		await addJournalLine(
			{
				organizationId,
				actorUserId,
				correlationId: "add-line-3",
				journalId: journal.id,
				accountCode: "4000",
				debit: "0",
				credit: "10",
			},
			options,
		);
		const posted = await postJournal(
			{
				organizationId,
				actorUserId,
				correlationId: "post-balanced",
				journalId: journal.id,
				expectedVersion: 1,
			},
			options,
		);
		expect(posted.ok).toBe(true);
		if (!posted.ok) throw new Error("unexpected");
		expect(posted.data.status).toBe("posted");
		expect(posted.data.postings).toHaveLength(3);

		const balance = await getTrialBalance(
			{ organizationId, actorUserId, periodId: period.id },
			options,
		);
		expect(balance.ok).toBe(true);
		if (!balance.ok) throw new Error("unexpected");
		expect(balance.data).toEqual([
			{
				accountCode: "1000",
				totalDebit: "100.00",
				totalCredit: "0.00",
				balance: "100.00",
			},
			{
				accountCode: "4000",
				totalDebit: "0.00",
				totalCredit: "100.00",
				balance: "-100.00",
			},
		]);
	});

	it("rejects posting in a closed period", async () => {
		const { options, period, journal } = await setup();
		await addJournalLine(
			{
				organizationId,
				actorUserId,
				correlationId: "add-line",
				journalId: journal.id,
				accountCode: "1000",
				debit: "10",
				credit: "0",
			},
			options,
		);
		await addJournalLine(
			{
				organizationId,
				actorUserId,
				correlationId: "add-line-2",
				journalId: journal.id,
				accountCode: "2000",
				debit: "0",
				credit: "10",
			},
			options,
		);

		const softClosed = await softCloseAccountingPeriod(
			{
				organizationId,
				actorUserId,
				correlationId: "soft-close",
				periodId: period.id,
				expectedVersion: 1,
			},
			options,
		);
		expect(softClosed.ok).toBe(true);

		const closed = await closeAccountingPeriod(
			{
				organizationId,
				actorUserId,
				correlationId: "close",
				periodId: period.id,
				expectedVersion: 2,
			},
			options,
		);
		expect(closed.ok).toBe(true);
		if (!closed.ok) throw new Error("unexpected");
		expect(closed.data.status).toBe("closed");

		const posted = await postJournal(
			{
				organizationId,
				actorUserId,
				correlationId: "closed",
				journalId: journal.id,
				expectedVersion: 1,
			},
			options,
		);
		expect(posted).toMatchObject({ ok: false });
	});

	it("reverses with a new linked reversal journal preserving original lines", async () => {
		const { options, journal } = await setup();
		for (const line of [
			{ accountCode: "1000", debit: "25", credit: "0" },
			{ accountCode: "2000", debit: "0", credit: "25" },
		]) {
			await addJournalLine(
				{
					organizationId,
					actorUserId,
					correlationId: "add-line",
					journalId: journal.id,
					...line,
				},
				options,
			);
		}
		const posted = await postJournal(
			{
				organizationId,
				actorUserId,
				correlationId: "post",
				journalId: journal.id,
				expectedVersion: 1,
			},
			options,
		);
		if (!posted.ok) throw new Error(posted.message);

		const reversalResult = await reverseJournal(
			{
				organizationId,
				actorUserId,
				correlationId: "reverse",
				journalId: journal.id,
				expectedVersion: 2,
				reason: "Correction",
			},
			options,
		);
		expect(reversalResult.ok).toBe(true);
		if (!reversalResult.ok) throw new Error("unexpected");

		const reversalJournal = reversalResult.data;
		expect(reversalJournal.status).toBe("posted");
		expect(reversalJournal.journalType).toBe("reversal");
		expect(reversalJournal.reversalOfJournalId).toBe(journal.id);
		expect(reversalJournal.lines).toHaveLength(2);
		expect(reversalJournal.postings).toHaveLength(2);

		const original = await getJournalById(
			{ organizationId, actorUserId, journalId: journal.id },
			options,
		);
		expect(original.ok).toBe(true);
		if (!original.ok) throw new Error("unexpected");
		expect(original.data?.status).toBe("reversed");
		expect(original.data?.reversedByJournalId).toBe(reversalJournal.id);
		expect(original.data?.lines).toHaveLength(2);

		const mutation = await addJournalLine(
			{
				organizationId,
				actorUserId,
				correlationId: "after-reverse",
				journalId: journal.id,
				accountCode: "9999",
				debit: "1",
				credit: "0",
			},
			options,
		);
		expect(mutation).toMatchObject({ ok: false });
	});
});
