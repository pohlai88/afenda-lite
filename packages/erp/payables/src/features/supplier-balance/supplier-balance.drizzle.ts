import { database as afendaDatabase } from "@afenda/db";
import {
	errorIngress,
	errorProject,
	errorResult,
	type Result,
} from "@afenda/errors";

import type { SupplierBalance } from "../../kernel/contracts/domain";
import type { PayablesSupplierBalanceStore } from "./supplier-balance.store";

function failFromPersistence(error: unknown, _fallbackMessage: string) {
	return errorProject.result(
		errorIngress.postgres(error, { operation: "persistence.postgres" }),
	);
}

interface SupplierBalanceSqlRow {
	credited_amount: string;
	currency_code: string;
	invoiced_amount: string;
	open_balance: string;
	organization_id: string;
	paid_amount: string;
	supplier_id: string;
	updated_at: Date;
}

export const drizzleSupplierBalanceMethods: PayablesSupplierBalanceStore = {
	async getBalance(
		organizationId: string,
		supplierId: string,
		currencyCode?: string,
	): Promise<Result<SupplierBalance[]>> {
		try {
			const [rows] = await afendaDatabase.transaction((sql) => [
				sql`
				SELECT balance.organization_id, balance.supplier_party_id AS supplier_id,
					balance.currency_code, balance.open_balance, balance.updated_at,
					(SELECT COALESCE(SUM(line.line_amount::numeric), 0)::text
						FROM supplier_invoice invoice
						JOIN supplier_invoice_line line ON line.invoice_id = invoice.id
						WHERE invoice.organization_id = balance.organization_id
							AND line.organization_id = balance.organization_id
							AND invoice.supplier_party_id = balance.supplier_party_id
							AND invoice.currency_code = balance.currency_code
							AND invoice.status = 'posted') AS invoiced_amount,
						(SELECT COALESCE(SUM(credit.amount::numeric), 0)::text
							FROM supplier_credit_note credit
							WHERE credit.organization_id = balance.organization_id
								AND credit.supplier_party_id = balance.supplier_party_id
								AND credit.currency_code = balance.currency_code
								AND credit.status = 'posted') AS credited_amount,
						(SELECT COALESCE(SUM(allocation.amount::numeric), 0)::text
							FROM supplier_allocation allocation
							WHERE allocation.organization_id = balance.organization_id
								AND allocation.supplier_party_id = balance.supplier_party_id
								AND allocation.status = 'active' AND allocation.payment_id IS NOT NULL) AS paid_amount
					FROM supplier_balance_projection balance
					WHERE balance.organization_id = ${organizationId}
						AND balance.supplier_party_id = ${supplierId}
						AND (${currencyCode ?? null}::text IS NULL OR balance.currency_code = ${currencyCode ?? null})
					ORDER BY balance.currency_code ASC
				`,
			]);
			return errorResult.ok(
				rows.map((row: SupplierBalanceSqlRow) => ({
					asOf: new Date(),
					creditedAmount: row.credited_amount,
					currencyCode: row.currency_code,
					invoicedAmount: row.invoiced_amount,
					openBalance: row.open_balance,
					organizationId: row.organization_id,
					outstandingAmount: row.open_balance,
					paidAmount: row.paid_amount,
					supplierId: row.supplier_id,
					updatedAt: row.updated_at,
				})),
			);
		} catch (error) {
			return failFromPersistence(error, "Failed to load supplier balance");
		}
	},
};
