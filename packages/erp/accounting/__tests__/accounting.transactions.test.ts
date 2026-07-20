import { fail, ok } from "@afenda/errors/result";
import { describe, expect, it } from "vitest";

import {
	addJournalLine,
	createChartOfAccounts,
	createDraftJournal,
	createLedgerAccount,
	createMemoryStore,
	getJournalById,
	listJournals,
	openAccountingPeriod,
	postJournal,
	reverseJournal,
} from "../src/index";

const organizationId = "f47ac10b-58cc-4372-a567-0e02b2c3d479";
const actorUserId = "a47ac10b-58cc-4372-a567-0e02b2c3d479";
const authorization = {
	async can() {
		return true;
	},
};
const successfulEffects = {
	async emit() {
		return ok(undefined);
	},
};

async function postedJournal() {
	const store = createMemoryStore();
	const options = { store, authorization, effects: successfulEffects };

	const coa = await createChartOfAccounts(
		{
			organizationId,
			actorUserId,
			correlationId: "setup-coa",
			code: "MAIN",
			name: "Main chart",
		},
		options,
	);
	if (!coa.ok) throw new Error(coa.message);
	await createLedgerAccount(
		{
			organizationId,
			actorUserId,
			correlationId: "setup-acct-1",
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
			correlationId: "setup-acct-2",
			chartOfAccountId: coa.data.id,
			code: "2000",
			name: "Liability",
			accountType: "liability",
			normalBalance: "credit",
		},
		options,
	);

	const period = await openAccountingPeriod(
		{
			organizationId,
			actorUserId,
			correlationId: "open-period",
			code: "2026-07",
			startDate: "2026-07-01",
			endDate: "2026-07-31",
		},
		options,
	);
	if (!period.ok) throw new Error(period.message);
	const created = await createDraftJournal(
		{
			organizationId,
			actorUserId,
			correlationId: "create-draft",
			periodId: period.data.id,
			code: "TX-1",
			currencyCode: "USD",
		},
		options,
	);
	if (!created.ok) throw new Error(created.message);
	for (const line of [
		{ accountCode: "1000", debit: "10", credit: "0" },
		{ accountCode: "2000", debit: "0", credit: "10" },
	]) {
		await addJournalLine(
			{
				organizationId,
				actorUserId,
				correlationId: "add-line",
				journalId: created.data.id,
				...line,
			},
			options,
		);
	}
	return { options, journalId: created.data.id };
}

describe("accounting transaction rollback", () => {
	it("rolls back postings when event emission fails", async () => {
		const { options, journalId } = await postedJournal();
		const result = await postJournal(
			{
				organizationId,
				actorUserId,
				correlationId: "post",
				journalId,
				expectedVersion: 1,
			},
			{
				...options,
				effects: {
					async emit() {
						return fail("INTERNAL_ERROR", "outbox failed");
					},
				},
			},
		);
		expect(result.ok).toBe(false);
		const loaded = await getJournalById(
			{ organizationId, actorUserId, journalId },
			options,
		);
		expect(loaded.ok && loaded.data?.status).toBe("draft");
		expect(loaded.ok && loaded.data?.postings).toEqual([]);
	});

	it("rolls back original and reversing journal when reversal event fails", async () => {
		const { options, journalId } = await postedJournal();
		const posted = await postJournal(
			{
				organizationId,
				actorUserId,
				correlationId: "post",
				journalId,
				expectedVersion: 1,
			},
			options,
		);
		if (!posted.ok) throw new Error(posted.message);
		const reversed = await reverseJournal(
			{
				organizationId,
				actorUserId,
				correlationId: "reverse",
				journalId,
				expectedVersion: 2,
				reason: "Correction",
			},
			{
				...options,
				effects: {
					async emit() {
						return fail("INTERNAL_ERROR", "outbox failed");
					},
				},
			},
		);
		expect(reversed.ok).toBe(false);
		const original = await getJournalById(
			{ organizationId, actorUserId, journalId },
			options,
		);
		expect(original.ok && original.data?.status).toBe("posted");
		expect(original.ok && original.data?.reversedByJournalId).toBeNull();
		const journals = await listJournals(
			{ organizationId, actorUserId },
			options,
		);
		expect(journals.ok && journals.data).toHaveLength(1);
	});
});
