"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { getSupplierInvoiceById, type SupplierInvoice } from "@afenda/payables";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createPayablesCommandOptions } from "@/lib/erp/payables-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

export async function getSupplierInvoiceAction(
	invoiceId: string,
): Promise<ActionResult<{ invoice: SupplierInvoice }>> {
	return await runOperatorPermissionAction({
		path: "getSupplierInvoiceAction",
		permission: "payables.read",
		safeMessage:
			"Could not load supplier invoice. Try again or contact an admin.",
		execute: async (session) => {
			const parsed = parseSchema(z.string().uuid(), invoiceId);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid supplier invoice id.",
				});
			}
			const mapped = mapPackageResult(
				await getSupplierInvoiceById(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						id: parsed.data,
					},
					createPayablesCommandOptions(session.userId),
				),
			);
			if (!mapped.ok) {
				return mapped;
			}
			if (mapped.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "Supplier invoice not found",
				});
			}
			return { ok: true, data: { invoice: mapped.data } };
		},
	});
}
