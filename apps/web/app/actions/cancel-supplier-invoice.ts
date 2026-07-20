"use server";

import { cancelSupplierInvoice } from "@afenda/payables";

import {
	runVersionedSupplierInvoiceMutation,
	type VersionedSupplierInvoiceActionState,
} from "@/app/actions/run-versioned-supplier-invoice-mutation";

export type CancelSupplierInvoiceActionState =
	VersionedSupplierInvoiceActionState;

export async function cancelSupplierInvoiceAction(
	_prev: CancelSupplierInvoiceActionState,
	formData: FormData,
): Promise<CancelSupplierInvoiceActionState> {
	return runVersionedSupplierInvoiceMutation({
		path: "cancelSupplierInvoiceAction",
		permission: "payables.manage",
		safeMessage:
			"Could not cancel supplier invoice. Try again or contact an admin.",
		mutate: cancelSupplierInvoice,
		formData,
	});
}
