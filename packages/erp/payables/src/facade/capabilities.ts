import type { Result } from "@afenda/errors";

import { resolvePayablesEffects } from "../composition/effects";
import { resolvePayablesStore } from "../composition/store/resolve-store";
import {
	type AllocationOperationDeps,
	applySupplierCreditOperation,
	applySupplierPaymentOperation,
	reverseSupplierPaymentApplicationOperation,
} from "../features/allocations/allocations.operations";
import {
	addSupplierCreditNoteLineOperation,
	type CreditNoteOperationDeps,
	createDraftSupplierCreditNoteOperation,
	issueSupplierCreditNoteOperation,
	postSupplierCreditNoteOperation,
} from "../features/credit-notes/credit-notes.operations";
import {
	addSupplierInvoiceLineOperation,
	cancelSupplierInvoiceOperation,
	createDraftSupplierInvoiceOperation,
	getSupplierInvoiceByIdOperation,
	type InvoiceLifecycleOperationDeps,
	listSupplierInvoicesOperation,
	matchSupplierInvoiceOperation,
	postSupplierInvoiceOperation,
} from "../features/invoice-lifecycle/invoice-lifecycle.operations";
import {
	getSupplierBalanceOperation,
	type SupplierBalanceOperationDeps,
} from "../features/supplier-balance/supplier-balance.operations";
import type {
	SupplierAllocation,
	SupplierBalance,
	SupplierInvoice,
	SupplierInvoiceLine,
} from "../kernel/contracts/domain";
import type { PayablesCommandOptions } from "./contracts";

function invoiceDeps(
	options: PayablesCommandOptions,
): InvoiceLifecycleOperationDeps {
	return {
		authorization: options.authorization,
		effects: resolvePayablesEffects(options.effects),
		goodsReceiptMatch: options.goodsReceiptMatch,
		purchaseOrderMatch: options.purchaseOrderMatch,
		store: resolvePayablesStore(options.store),
	};
}

function creditDeps(options: PayablesCommandOptions): CreditNoteOperationDeps {
	return {
		authorization: options.authorization,
		effects: resolvePayablesEffects(options.effects),
		store: resolvePayablesStore(options.store),
	};
}

function allocationDeps(
	options: PayablesCommandOptions,
): AllocationOperationDeps {
	const store = resolvePayablesStore(options.store);
	return {
		authorization: options.authorization,
		effects: resolvePayablesEffects(options.effects),
		getInvoiceById: store.getById,
		postedPayment: options.postedPayment,
		store,
	};
}

function balanceDeps(
	options: PayablesCommandOptions,
): SupplierBalanceOperationDeps {
	return {
		authorization: options.authorization,
		store: resolvePayablesStore(options.store),
	};
}

export function createDraftSupplierInvoice(
	input: unknown,
	options: PayablesCommandOptions = {},
): Promise<Result<SupplierInvoice>> {
	return createDraftSupplierInvoiceOperation(input, invoiceDeps(options));
}

export function addSupplierInvoiceLine(
	input: unknown,
	options: PayablesCommandOptions = {},
): Promise<Result<SupplierInvoiceLine>> {
	return addSupplierInvoiceLineOperation(input, invoiceDeps(options));
}

export function matchSupplierInvoice(
	input: unknown,
	options: PayablesCommandOptions = {},
): Promise<Result<SupplierInvoice>> {
	return matchSupplierInvoiceOperation(input, invoiceDeps(options));
}

export function postSupplierInvoice(
	input: unknown,
	options: PayablesCommandOptions = {},
): Promise<Result<SupplierInvoice>> {
	return postSupplierInvoiceOperation(input, invoiceDeps(options));
}

export function cancelSupplierInvoice(
	input: unknown,
	options: PayablesCommandOptions = {},
): Promise<Result<SupplierInvoice>> {
	return cancelSupplierInvoiceOperation(input, invoiceDeps(options));
}

export function getSupplierInvoiceById(
	input: unknown,
	options: PayablesCommandOptions = {},
): Promise<Result<SupplierInvoice | null>> {
	return getSupplierInvoiceByIdOperation(input, invoiceDeps(options));
}

export function listSupplierInvoices(
	input: unknown,
	options: PayablesCommandOptions = {},
): Promise<Result<SupplierInvoice[]>> {
	return listSupplierInvoicesOperation(input, invoiceDeps(options));
}

export function issueSupplierCreditNote(
	input: unknown,
	options: PayablesCommandOptions = {},
): Promise<Result<SupplierInvoice>> {
	return issueSupplierCreditNoteOperation(input, creditDeps(options));
}

export function createDraftSupplierCreditNote(
	input: unknown,
	options: PayablesCommandOptions = {},
): Promise<Result<SupplierInvoice>> {
	return createDraftSupplierCreditNoteOperation(input, creditDeps(options));
}

export function addSupplierCreditNoteLine(
	input: unknown,
	options: PayablesCommandOptions = {},
): Promise<Result<SupplierInvoiceLine>> {
	return addSupplierCreditNoteLineOperation(input, creditDeps(options));
}

export function postSupplierCreditNote(
	input: unknown,
	options: PayablesCommandOptions = {},
): Promise<Result<SupplierInvoice>> {
	return postSupplierCreditNoteOperation(input, creditDeps(options));
}

export function applySupplierPayment(
	input: unknown,
	options: PayablesCommandOptions = {},
): Promise<Result<SupplierAllocation>> {
	return applySupplierPaymentOperation(input, allocationDeps(options));
}

export function applySupplierCredit(
	input: unknown,
	options: PayablesCommandOptions = {},
): Promise<Result<SupplierAllocation>> {
	return applySupplierCreditOperation(input, allocationDeps(options));
}

export function reverseSupplierPaymentApplication(
	input: unknown,
	options: PayablesCommandOptions = {},
): Promise<Result<SupplierAllocation[]>> {
	return reverseSupplierPaymentApplicationOperation(
		input,
		allocationDeps(options),
	);
}

export function getSupplierBalance(
	input: unknown,
	options: PayablesCommandOptions = {},
): Promise<Result<SupplierBalance[]>> {
	return getSupplierBalanceOperation(input, balanceDeps(options));
}
