"use server";

import { cancelSupplierInvoice, type SupplierInvoice } from "@afenda/payables";
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

export type CancelSupplierInvoiceActionState = ActionResult<{
	invoice: SupplierInvoice;
}> | null;

const schema = z.object({
	invoiceId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
});

export async function cancelSupplierInvoiceAction(
	_prev: CancelSupplierInvoiceActionState,
	formData: FormData,
): Promise<CancelSupplierInvoiceActionState> {
	return runOperatorPermissionAction({
		path: "cancelSupplierInvoiceAction",
		permission: "payables.manage",
		safeMessage:
			"Could not cancel supplier invoice. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(schema, {
				invoiceId: formData.get("invoiceId"),
				expectedVersion: formData.get("expectedVersion"),
			});
			if (!parsed.success)
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid invoice and expected version.",
					parsed.details,
				);
			const mapped = mapPackageResult(
				await cancelSupplierInvoice(
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
