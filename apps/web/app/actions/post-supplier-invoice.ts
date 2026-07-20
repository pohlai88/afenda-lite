"use server";

import { postSupplierInvoice, type SupplierInvoice } from "@afenda/payables";
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

export type PostSupplierInvoiceActionState = ActionResult<{
	invoice: SupplierInvoice;
}> | null;

const schema = z.object({
	invoiceId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
});

export async function postSupplierInvoiceAction(
	_prev: PostSupplierInvoiceActionState,
	formData: FormData,
): Promise<PostSupplierInvoiceActionState> {
	return runOperatorPermissionAction({
		path: "postSupplierInvoiceAction",
		permission: "payables.manage",
		safeMessage:
			"Could not post supplier invoice. Try again or contact an admin.",
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
				await postSupplierInvoice(
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
