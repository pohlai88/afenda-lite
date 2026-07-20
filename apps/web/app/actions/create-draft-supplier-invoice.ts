"use server";

import {
	createDraftSupplierInvoice,
	type SupplierInvoice,
} from "@afenda/payables";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createPayablesCommandOptions } from "@/lib/erp/payables-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type CreateDraftSupplierInvoiceActionState = ActionResult<{
	invoice: SupplierInvoice;
}> | null;

const schema = z.object({
	code: z.string().trim().min(1).max(64),
	supplierId: z.string().uuid(),
	supplierCode: z.string().trim().min(1).max(64),
	supplierName: z.string().trim().min(1).max(256),
	currencyCode: z.string().trim().length(3),
});

export async function createDraftSupplierInvoiceAction(
	_prev: CreateDraftSupplierInvoiceActionState,
	formData: FormData,
): Promise<CreateDraftSupplierInvoiceActionState> {
	return runOperatorPermissionAction({
		path: "createDraftSupplierInvoiceAction",
		permission: "payables.manage",
		safeMessage:
			"Could not create supplier invoice. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(schema, {
				code: formData.get("code"),
				supplierId: formData.get("supplierId"),
				supplierCode: formData.get("supplierCode"),
				supplierName: formData.get("supplierName"),
				currencyCode: formData.get("currencyCode"),
			});
			if (!parsed.success)
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid invoice, supplier, and currency.",
					parsed.details,
				);
			const mapped = mapPackageResult(
				await createDraftSupplierInvoice(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						...parsed.data,
					},
					createPayablesCommandOptions(),
				),
			);
			if (!mapped.ok) return mapped;
			revalidatePath("/admin/payables");
			revalidatePath("/client/payables");
			return { ok: true, data: { invoice: mapped.data } };
		},
	});
}
