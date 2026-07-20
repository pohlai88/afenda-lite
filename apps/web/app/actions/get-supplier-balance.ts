"use server";

import { getSupplierBalance, type SupplierBalance } from "@afenda/payables";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createPayablesCommandOptions } from "@/lib/erp/payables-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

const schema = z.object({
	supplierId: z.string().uuid(),
	currencyCode: z.string().trim().length(3).optional(),
});

export async function getSupplierBalanceAction(input: {
	supplierId: string;
	currencyCode?: string;
}): Promise<ActionResult<{ balances: SupplierBalance[] }>> {
	return runOperatorPermissionAction({
		path: "getSupplierBalanceAction",
		permission: "payables.read",
		safeMessage:
			"Could not load supplier balance. Try again or contact an admin.",
		execute: async (session) => {
			const parsed = parseSchema(schema, input);
			if (!parsed.success)
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid supplier and optional currency.",
					parsed.details,
				);
			const mapped = mapPackageResult(
				await getSupplierBalance(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						...parsed.data,
					},
					createPayablesCommandOptions(),
				),
			);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { balances: mapped.data } };
		},
	});
}
