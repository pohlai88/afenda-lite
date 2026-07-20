"use server";

import { postSupplierInvoice } from "@afenda/payables";

import {
	runVersionedSupplierInvoiceMutation,
	type VersionedSupplierInvoiceActionState,
} from "@/app/actions/run-versioned-supplier-invoice-mutation";

export type PostSupplierInvoiceActionState =
	VersionedSupplierInvoiceActionState;

export async function postSupplierInvoiceAction(
	_prev: PostSupplierInvoiceActionState,
	formData: FormData,
): Promise<PostSupplierInvoiceActionState> {
	return runVersionedSupplierInvoiceMutation({
		path: "postSupplierInvoiceAction",
		permission: "payables.manage",
		safeMessage:
			"Could not post supplier invoice. Try again or contact an admin.",
		mutate: postSupplierInvoice,
		formData,
	});
}
