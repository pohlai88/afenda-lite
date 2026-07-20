import { expectedOpenBalance } from "./invoice";
import { add, decimal, format } from "./shared/money";
import type { CustomerBalance } from "./types";

export type ReceivablesReconcileFacts = {
	invoices: Array<{
		id: string;
		customerId: string;
		currencyCode: string;
		totalAmount: string;
		status: string;
	}>;
	credits: Array<{
		id: string;
		customerId: string;
		currencyCode: string;
		amount: string;
		status: string;
	}>;
	allocations: Array<{
		id: string;
		customerId: string;
		invoiceId: string;
		amount: string;
		status: string;
	}>;
	balances: CustomerBalance[];
};

export type ReceivablesReconcileResult =
	| { ok: true }
	| { ok: false; findings: string[] };

/**
 * Offline consistency check:
 * posted invoices − posted credits − active applications = projection open balance
 * (per organization, customer, currency).
 */
export function reconcileReceivables(
	facts: ReceivablesReconcileFacts,
): ReceivablesReconcileResult {
	const findings: string[] = [];
	const keys = new Set<string>();

	for (const invoice of facts.invoices) {
		keys.add(`${invoice.customerId}:${invoice.currencyCode}`);
	}
	for (const credit of facts.credits) {
		keys.add(`${credit.customerId}:${credit.currencyCode}`);
	}
	for (const allocation of facts.allocations) {
		keys.add(
			`${allocation.customerId}:${facts.invoices.find((invoice) => invoice.id === allocation.invoiceId)?.currencyCode ?? ""}`,
		);
	}
	for (const balance of facts.balances) {
		keys.add(`${balance.customerId}:${balance.currencyCode}`);
	}

	for (const key of keys) {
		const [customerId = "", currencyCode = ""] = key.split(":");
		if (customerId.length === 0 || currencyCode.length === 0) continue;

		const invoiceTotal = facts.invoices
			.filter(
				(row) =>
					row.customerId === customerId &&
					row.currencyCode === currencyCode &&
					(row.status === "posted" || row.status === "closed"),
			)
			.reduce((sum, row) => add(sum, row.totalAmount), "0");
		const creditTotal = facts.credits
			.filter(
				(row) =>
					row.customerId === customerId &&
					row.currencyCode === currencyCode &&
					row.status === "posted",
			)
			.reduce((sum, row) => add(sum, row.amount), "0");
		const allocationTotal = facts.allocations
			.filter((row) => {
				if (row.customerId !== customerId || row.status !== "active") {
					return false;
				}
				const invoice = facts.invoices.find(
					(item) => item.id === row.invoiceId,
				);
				return invoice?.currencyCode === currencyCode;
			})
			.reduce((sum, row) => add(sum, row.amount), "0");
		const expected = expectedOpenBalance({
			postedInvoiceTotal: invoiceTotal,
			postedCreditTotal: creditTotal,
			activeAllocationTotal: allocationTotal,
		});
		const projected =
			facts.balances.find(
				(row) =>
					row.customerId === customerId && row.currencyCode === currencyCode,
			)?.openBalance ?? "0";
		if (decimal(expected) !== decimal(projected)) {
			findings.push(
				`Projection drift for ${customerId}/${currencyCode}: expected=${format(decimal(expected))} projected=${projected}`,
			);
		}
	}

	return findings.length === 0 ? { ok: true } : { ok: false, findings };
}
