import { ok } from "@afenda/errors/result";
import { describe, expect, it } from "vitest";

import {
	addJournalLine,
	closeAccountingPeriod,
	createDraftJournal,
	createMemoryAccountingStore,
	getJournalById,
	getTrialBalance,
	openAccountingPeriod,
	postJournal,
	reverseJournal,
} from "../src/index";

const organizationId = "org-1";
const actorUserId = "user-1";
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
	const store = createMemoryAccountingStore();
	const options = { store, authorization, effects };
	const period = await openAccountingPeriod(
		{
			organizationId,
			actorUserId,
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
			periodId: period.data.id,
			code: "JRN-1",
			description: "Month-end entry",
		},
		options,
	);
	if (!journal.ok) throw new Error(journal.message);
	return { options, period: period.data, journal: journal.data };
}

describe("accounting journal lifecycle", () => {
	it("requires balanced debits and credits and creates ledger postings", async () => {
		const { options, period, journal } = await setup();
		for (const line of [
			{ accountCode: "1000", debit: "100", credit: "0" },
			{ accountCode: "4000", debit: "0", credit: "90" },
		]) {
			const result = await addJournalLine(
				{ organizationId, actorUserId, journalId: journal.id, ...line },
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
				expectedVersion: 3,
			},
			options,
		);
		expect(unbalanced).toMatchObject({ ok: false, code: "CONFLICT" });

		await addJournalLine(
			{
				organizationId,
				actorUserId,
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
				expectedVersion: 4,
			},
			options,
		);
		expect(posted.ok && posted.data.status).toBe("posted");
		expect(posted.ok && posted.data.postings).toHaveLength(3);

		const balance = await getTrialBalance(
			{ organizationId, actorUserId, periodId: period.id },
			options,
		);
		expect(balance.ok && balance.data).toEqual([
			{
				accountCode: "1000",
				totalDebit: "100",
				totalCredit: "0",
				balance: "100",
			},
			{
				accountCode: "4000",
				totalDebit: "0",
				totalCredit: "100",
				balance: "-100",
			},
		]);
	});

	it("rejects posting in a closed period", async () => {
		const { options, period, journal } = await setup();
		await addJournalLine(
			{
				organizationId,
				actorUserId,
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
				journalId: journal.id,
				accountCode: "2000",
				debit: "0",
				credit: "10",
			},
			options,
		);
		const closed = await closeAccountingPeriod(
			{
				organizationId,
				actorUserId,
				periodId: period.id,
				expectedVersion: 1,
			},
			options,
		);
		expect(closed.ok && closed.data.status).toBe("closed");
		const posted = await postJournal(
			{
				organizationId,
				actorUserId,
				correlationId: "closed",
				journalId: journal.id,
				expectedVersion: 3,
			},
			options,
		);
		expect(posted).toMatchObject({ ok: false, code: "CONFLICT" });
	});

	it("reverses with compensating postings while preserving original lines", async () => {
		const { options, journal } = await setup();
		for (const line of [
			{ accountCode: "1000", debit: "25", credit: "0" },
			{ accountCode: "2000", debit: "0", credit: "25" },
		]) {
			await addJournalLine(
				{ organizationId, actorUserId, journalId: journal.id, ...line },
				options,
			);
		}
		const posted = await postJournal(
			{
				organizationId,
				actorUserId,
				correlationId: "post",
				journalId: journal.id,
				expectedVersion: 3,
			},
			options,
		);
		if (!posted.ok) throw new Error(posted.message);
		const reversed = await reverseJournal(
			{
				organizationId,
				actorUserId,
				correlationId: "reverse",
				journalId: journal.id,
				expectedVersion: 4,
				reason: "Correction",
			},
			options,
		);
		expect(reversed.ok && reversed.data.status).toBe("reversed");
		expect(reversed.ok && reversed.data.postings).toHaveLength(4);

		const original = await getJournalById(
			{ organizationId, actorUserId, id: journal.id },
			options,
		);
		expect(original.ok && original.data?.status).toBe("reversed");
		expect(original.ok && original.data?.lines).toEqual(posted.data.lines);
		const mutation = await addJournalLine(
			{
				organizationId,
				actorUserId,
				journalId: journal.id,
				accountCode: "9999",
				debit: "1",
				credit: "0",
			},
			options,
		);
		expect(mutation).toMatchObject({ ok: false, code: "CONFLICT" });
	});
});
