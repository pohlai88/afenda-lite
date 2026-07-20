import { fail, ok } from "@afenda/errors/result";
import { describe, expect, it } from "vitest";

import {
	addJournalLine,
	createDraftJournal,
	createMemoryAccountingStore,
	getJournalById,
	listJournals,
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
const successfulEffects = {
	async emit() {
		return ok(undefined);
	},
};

async function postedJournal() {
	const store = createMemoryAccountingStore();
	const options = { store, authorization, effects: successfulEffects };
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
	const created = await createDraftJournal(
		{
			organizationId,
			actorUserId,
			periodId: period.data.id,
			code: "TX-1",
		},
		options,
	);
	if (!created.ok) throw new Error(created.message);
	for (const line of [
		{ accountCode: "1000", debit: "10", credit: "0" },
		{ accountCode: "2000", debit: "0", credit: "10" },
	]) {
		await addJournalLine(
			{ organizationId, actorUserId, journalId: created.data.id, ...line },
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
				expectedVersion: 3,
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
			{ organizationId, actorUserId, id: journalId },
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
				journalId,
				expectedVersion: 4,
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
			{ organizationId, actorUserId, id: journalId },
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
