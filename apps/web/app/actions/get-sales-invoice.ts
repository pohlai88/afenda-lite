"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { getSalesInvoiceById, type SalesInvoice } from "@afenda/receivables";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createReceivablesCommandOptions } from "@/lib/erp/receivables-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

export interface GetSalesInvoiceActionData {
	invoice: SalesInvoice;
}

const schema = z.string().uuid();

export async function getSalesInvoiceAction(
	invoiceId: string,
): Promise<ActionResult<GetSalesInvoiceActionData>> {
	return await runOperatorPermissionAction({
		path: "getSalesInvoiceAction",
		permission: "receivables.invoice.read",
		safeMessage: "Could not load sales invoice. Try again or contact an admin.",
		execute: async (session) => {
			const parsed = parseSchema(schema, invoiceId);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid sales invoice id.",
				});
			}
			const result = await getSalesInvoiceById(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					id: parsed.data,
				},
				createReceivablesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			if (mapped.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "Sales invoice not found",
				});
			}
			return { ok: true, data: { invoice: mapped.data } };
		},
	});
}
