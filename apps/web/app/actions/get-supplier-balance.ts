"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { getSupplierBalance, type SupplierBalance } from "@afenda/payables";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/_runtime/run-operator-permission-action";
import { createPayablesCommandOptions } from "@/lib/erp/payables-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

const schema = z.object({
	supplierId: z.string().uuid(),
	currencyCode: z.string().trim().length(3).optional(),
});

export async function getSupplierBalanceAction(input: {
	supplierId: string;
	currencyCode?: string;
}): Promise<ActionResult<{ balances: SupplierBalance[] }>> {
	return await runOperatorPermissionAction({
		path: "getSupplierBalanceAction",
		permission: "payables.read",
		safeMessage:
			"Could not load supplier balance. Try again or contact an admin.",
		execute: async (session) => {
			const parsed = parseSchema(schema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid supplier and optional currency.",
				});
			}
			const mapped = mapPackageResult(
				await getSupplierBalance(
					{
						...parsed.data,
						organizationId: session.orgId,
						actorUserId: session.userId,
					},
					createPayablesCommandOptions(session.userId),
				),
			);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { balances: mapped.data } };
		},
	});
}
