import { errorResult, type Result } from "@afenda/errors";

import type { SupplierBalance } from "../../kernel/contracts/domain";
import {
	type MemoryPayablesState,
	resolveResult,
} from "../../kernel/memory/state";
import { decimal, format } from "../../kernel/money";
import type { PayablesSupplierBalanceStore } from "./supplier-balance.store";

export function createMemorySupplierBalanceMethods(
	state: MemoryPayablesState,
): PayablesSupplierBalanceStore {
	return {
		getBalance(
			organizationId: string,
			supplierId: string,
			currencyCode?: string,
		): Promise<Result<SupplierBalance[]>> {
			return resolveResult(
				errorResult.ok(
					[...state.balances.values()]
						.filter((row) => row.organizationId === organizationId)
						.filter((row) => row.supplierId === supplierId)
						.filter(
							(row) =>
								currencyCode === undefined ||
								row.currencyCode === currencyCode,
						)
						.map((row) => {
							const documents = [...state.invoices.values()].filter(
								(document) =>
									document.organizationId === row.organizationId &&
									document.supplierId === row.supplierId &&
									document.currencyCode === row.currencyCode &&
									document.status === "posted",
							);
							const invoicedAmount = documents
								.filter((document) => document.documentType === "invoice")
								.reduce(
									(total, document) => total + decimal(document.totalAmount),
									0n,
								);
							const creditedAmount = documents
								.filter((document) => document.documentType === "credit_note")
								.reduce(
									(total, document) => total + decimal(document.totalAmount),
									0n,
								);
							const paidAmount = [...state.allocations.values()]
								.filter(
									(allocation) =>
										allocation.organizationId === row.organizationId &&
										allocation.supplierId === row.supplierId &&
										allocation.status === "active" &&
										allocation.paymentId !== null,
								)
								.reduce(
									(total, allocation) => total + decimal(allocation.amount),
									0n,
								);
							return {
								...row,
								asOf: new Date(),
								creditedAmount: format(creditedAmount),
								invoicedAmount: format(invoicedAmount),
								outstandingAmount: row.openBalance,
								paidAmount: format(paidAmount),
							};
						}),
				),
			);
		},
	};
}
