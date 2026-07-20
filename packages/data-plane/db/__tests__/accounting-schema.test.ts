import { getTableColumns } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import {
	accountingPeriod,
	journal,
	journalLine,
	ledgerPosting,
} from "../src/schema/accounting";

describe("@afenda/db accounting schema", () => {
	it("defines four hard-tenant accounting tables", () => {
		for (const table of [
			journal,
			journalLine,
			ledgerPosting,
			accountingPeriod,
		]) {
			const columns = getTableColumns(table);
			expect(columns.organizationId.name).toBe("organization_id");
			expect(columns.organizationId.notNull).toBe(true);
		}
	});

	it("defines journal lifecycle and period linkage", () => {
		const columns = getTableColumns(journal);

		expect(columns.code.notNull).toBe(true);
		expect(columns.normalizedCode.notNull).toBe(true);
		expect(columns.status.default).toBe("draft");
		expect(columns.periodId.notNull).toBe(false);
		expect(columns.currencyCode.notNull).toBe(true);
		expect(columns.description.notNull).toBe(false);
		expect(columns.postedAt.notNull).toBe(false);
		expect(columns.postedBy.notNull).toBe(false);
		expect(columns.reversedAt.notNull).toBe(false);
		expect(columns.reversedBy.notNull).toBe(false);
	});

	it("defines journal lines with explicit debit and credit amounts", () => {
		const columns = getTableColumns(journalLine);

		expect(columns.journalId.notNull).toBe(true);
		expect(columns.lineNo.notNull).toBe(true);
		expect(columns.accountCode.notNull).toBe(true);
		expect(columns.accountName.notNull).toBe(false);
		expect(columns.debitAmount.notNull).toBe(true);
		expect(columns.creditAmount.notNull).toBe(true);
	});

	it("defines immutable posting coordinates and period lifecycle", () => {
		const postingColumns = getTableColumns(ledgerPosting);
		const periodColumns = getTableColumns(accountingPeriod);

		expect(postingColumns.journalId.notNull).toBe(true);
		expect(postingColumns.journalLineId.notNull).toBe(true);
		expect(postingColumns.accountCode.notNull).toBe(true);
		expect(postingColumns.debitAmount.notNull).toBe(true);
		expect(postingColumns.creditAmount.notNull).toBe(true);
		expect(postingColumns.postedAt.notNull).toBe(true);
		expect(postingColumns.periodId.notNull).toBe(false);

		expect(periodColumns.code.notNull).toBe(true);
		expect(periodColumns.name.notNull).toBe(true);
		expect(periodColumns.status.default).toBe("open");
		expect(periodColumns.startsOn.notNull).toBe(true);
		expect(periodColumns.endsOn.notNull).toBe(true);
		expect(periodColumns.closedAt.notNull).toBe(false);
		expect(periodColumns.closedBy.notNull).toBe(false);
	});
});
