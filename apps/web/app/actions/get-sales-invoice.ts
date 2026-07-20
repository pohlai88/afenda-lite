"use server";

import { getSalesInvoiceById, type SalesInvoice } from "@afenda/receivables";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createReceivablesCommandOptions } from "@/lib/erp/receivables-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type GetSalesInvoiceActionData = { invoice: SalesInvoice };

const schema = z.string().uuid();

export async function getSalesInvoiceAction(
	invoiceId: string,
): Promise<ActionResult<GetSalesInvoiceActionData>> {
	return runOperatorPermissionAction({
		path: "getSalesInvoiceAction",
		permission: "receivables.read",
		safeMessage: "Could not load sales invoice. Try again or contact an admin.",
		execute: async (session) => {
			const parsed = parseSchema(schema, invoiceId);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid sales invoice id.",
					parsed.details,
				);
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
			if (!mapped.ok) return mapped;
			if (mapped.data === null) {
				return actionFail("NOT_FOUND", "Sales invoice not found");
			}
			return { ok: true, data: { invoice: mapped.data } };
		},
	});
}
