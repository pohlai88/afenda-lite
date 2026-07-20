"use server";

import { listSupplierInvoices, type SupplierInvoice } from "@afenda/payables";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createPayablesCommandOptions } from "@/lib/erp/payables-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

const schema = z
	.object({
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		status: z.enum(["draft", "matched", "posted", "cancelled"]).optional(),
	})
	.optional();

export async function listSupplierInvoicesAction(input?: {
	page?: number;
	pageSize?: number;
	status?: SupplierInvoice["status"];
}): Promise<ActionResult<{ invoices: SupplierInvoice[] }>> {
	return runOperatorPermissionAction({
		path: "listSupplierInvoicesAction",
		permission: "payables.read",
		safeMessage:
			"Could not list supplier invoices. Try again or contact an admin.",
		execute: async (session) => {
			const parsed = parseSchema(schema, input);
			if (!parsed.success)
				return actionFail(
					"VALIDATION_ERROR",
					"Enter valid supplier invoice filters.",
					parsed.details,
				);
			const mapped = mapPackageResult(
				await listSupplierInvoices(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						...parsed.data,
					},
					createPayablesCommandOptions(),
				),
			);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { invoices: mapped.data } };
		},
	});
}
