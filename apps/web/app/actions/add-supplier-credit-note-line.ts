"use server";

import {
	addSupplierCreditNoteLine,
	type SupplierInvoiceLine,
} from "@afenda/payables";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createPayablesCommandOptions } from "@/lib/erp/payables-command-options";
import { revalidatePayablesPaths } from "@/lib/erp/revalidate-payables-paths";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type AddSupplierCreditNoteLineActionState = ActionResult<{
	line: SupplierInvoiceLine;
}> | null;

const schema = z.object({
	creditNoteId: z.string().uuid(),
	itemId: z.string().uuid(),
	description: z.string().trim().min(1).max(512),
	quantity: z.coerce.number().positive(),
	unitPrice: z.coerce.number().positive(),
});

export async function addSupplierCreditNoteLineAction(
	_prev: AddSupplierCreditNoteLineActionState,
	formData: FormData,
): Promise<AddSupplierCreditNoteLineActionState> {
	return runOperatorPermissionAction({
		path: "addSupplierCreditNoteLineAction",
		permission: "payables.manage",
		safeMessage:
			"Could not add supplier credit note line. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(schema, {
				creditNoteId: formData.get("creditNoteId"),
				itemId: formData.get("itemId"),
				description: formData.get("description"),
				quantity: formData.get("quantity"),
				unitPrice: formData.get("unitPrice"),
			});
			if (!parsed.success)
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid credit note, item, description, quantity, and unit price.",
					parsed.details,
				);
			const mapped = mapPackageResult(
				await addSupplierCreditNoteLine(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						...parsed.data,
					},
					createPayablesCommandOptions(session.userId),
				),
			);
			if (!mapped.ok) return mapped;
			revalidatePayablesPaths();
			return { ok: true, data: { line: mapped.data } };
		},
	});
}
