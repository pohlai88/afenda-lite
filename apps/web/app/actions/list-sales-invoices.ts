"use server";

import { listSalesInvoices, type SalesInvoice } from "@afenda/receivables";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createReceivablesCommandOptions } from "@/lib/erp/receivables-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type ListSalesInvoicesActionData = { invoices: SalesInvoice[] };

const schema = z
	.object({
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		status: z.enum(["draft", "posted", "cancelled"]).optional(),
	})
	.optional();

export async function listSalesInvoicesAction(input?: {
	page?: number;
	pageSize?: number;
	status?: SalesInvoice["status"];
}): Promise<ActionResult<ListSalesInvoicesActionData>> {
	return runOperatorPermissionAction({
		path: "listSalesInvoicesAction",
		permission: "receivables.read",
		safeMessage:
			"Could not list sales invoices. Try again or contact an admin.",
		execute: async (session) => {
			const parsed = parseSchema(schema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter valid sales invoice filters.",
					parsed.details,
				);
			}
			const result = await listSalesInvoices(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					...parsed.data,
				},
				createReceivablesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { invoices: mapped.data } };
		},
	});
}
