import { ok } from "@afenda/errors/result";
import { describe, expect, it } from "vitest";

import {
	createChartOfAccounts,
	createLedgerAccount,
	createMemoryStore,
	mapAccountRole,
	openAccountingPeriod,
	postFinancialSourceEvent,
	upsertPostingProfile,
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

async function setupSourcePosting() {
	const store = createMemoryStore();
	const options = { store, authorization, effects };

	const coa = await createChartOfAccounts(
		{
			organizationId,
			actorUserId,
			correlationId: "coa",
			code: "MAIN",
			name: "Main Chart",
		},
		options,
	);
	if (!coa.ok) throw new Error(coa.message);

	const arAccount = await createLedgerAccount(
		{
			organizationId,
			actorUserId,
			correlationId: "ar",
			chartOfAccountId: coa.data.id,
			code: "1200",
			name: "Accounts Receivable",
			accountType: "asset",
			normalBalance: "debit",
		},
		options,
	);
	if (!arAccount.ok) throw new Error(arAccount.message);

	const revenueAccount = await createLedgerAccount(
		{
			organizationId,
			actorUserId,
			correlationId: "rev",
			chartOfAccountId: coa.data.id,
			code: "4000",
			name: "Revenue",
			accountType: "revenue",
			normalBalance: "credit",
		},
		options,
	);
	if (!revenueAccount.ok) throw new Error(revenueAccount.message);

	await mapAccountRole(
		{
			organizationId,
			actorUserId,
			correlationId: "map-ar",
			accountRole: "trade_receivable",
			ledgerAccountId: arAccount.data.id,
		},
		options,
	);
	await mapAccountRole(
		{
			organizationId,
			actorUserId,
			correlationId: "map-rev",
			accountRole: "sales_revenue",
			ledgerAccountId: revenueAccount.data.id,
		},
		options,
	);

	await upsertPostingProfile(
		{
			organizationId,
			actorUserId,
			correlationId: "profile",
			code: "SALES-INVOICE-POST",
			eventType: "receivables.invoice.posted.v1",
			versionNumber: 1,
			lines: [
				{ lineNo: 1, side: "debit", accountRole: "trade_receivable" },
				{ lineNo: 2, side: "credit", accountRole: "sales_revenue" },
			],
		},
		options,
	);

	const period = await openAccountingPeriod(
		{
			organizationId,
			actorUserId,
			correlationId: "period",
			code: "2026-07",
			startDate: "2026-07-01",
			endDate: "2026-07-31",
		},
		options,
	);
	if (!period.ok) throw new Error(period.message);

	return { options, period: period.data };
}

describe("accounting source posting idempotency", () => {
	it("creates a journal on first call and returns same journal on duplicate", async () => {
		const { options, period } = await setupSourcePosting();

		const eventInput = {
			organizationId,
			actorUserId,
			correlationId: "inv-post-1",
			sourceModule: "receivables",
			sourceAggregateId: "inv-001",
			sourceEventId: "evt-001",
			sourceEventVersion: 1,
			postingRuleCode: "SALES-INVOICE-POST",
			periodId: period.id,
			currencyCode: "USD",
			description: "Invoice INV-001 posted",
			amountByRole: {
				trade_receivable: "500.00",
				sales_revenue: "500.00",
			},
		};

		const first = await postFinancialSourceEvent(eventInput, options);
		expect(first.ok).toBe(true);
		if (!first.ok) throw new Error(first.message);
		expect(first.data.status).toBe("posted");
		expect(first.data.journalType).toBe("receivables");
		expect(first.data.postings).toHaveLength(2);

		const duplicate = await postFinancialSourceEvent(eventInput, options);
		expect(duplicate.ok).toBe(true);
		if (!duplicate.ok) throw new Error(duplicate.message);
		expect(duplicate.data.id).toBe(first.data.id);
	});

	it("records an exception when posting profile is not found", async () => {
		const { options, period } = await setupSourcePosting();

		const result = await postFinancialSourceEvent(
			{
				organizationId,
				actorUserId,
				correlationId: "missing-profile",
				sourceModule: "payables",
				sourceAggregateId: "bill-001",
				sourceEventId: "evt-002",
				sourceEventVersion: 1,
				postingRuleCode: "NON-EXISTENT-PROFILE",
				periodId: period.id,
				currencyCode: "USD",
				amountByRole: { some_role: "100.00" },
			},
			options,
		);
		expect(result.ok).toBe(false);
	});

	it("records an exception when account role mapping is missing", async () => {
		const { options, period } = await setupSourcePosting();

		await upsertPostingProfile(
			{
				organizationId,
				actorUserId,
				correlationId: "profile-2",
				code: "MISSING-ROLE-TEST",
				eventType: "test.missing.role.v1",
				versionNumber: 1,
				lines: [
					{ lineNo: 1, side: "debit", accountRole: "unmapped_role" },
					{ lineNo: 2, side: "credit", accountRole: "sales_revenue" },
				],
			},
			options,
		);

		const result = await postFinancialSourceEvent(
			{
				organizationId,
				actorUserId,
				correlationId: "missing-role",
				sourceModule: "test",
				sourceAggregateId: "agg-001",
				sourceEventId: "evt-003",
				sourceEventVersion: 1,
				postingRuleCode: "MISSING-ROLE-TEST",
				periodId: period.id,
				currencyCode: "USD",
				amountByRole: {
					unmapped_role: "200.00",
					sales_revenue: "200.00",
				},
			},
			options,
		);
		expect(result.ok).toBe(false);
	});
});
