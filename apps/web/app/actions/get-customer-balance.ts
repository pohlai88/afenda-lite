"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { type CustomerBalance, getCustomerBalance } from "@afenda/receivables";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/_runtime/run-operator-permission-action";
import { createReceivablesCommandOptions } from "@/lib/erp/receivables-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

export interface GetCustomerBalanceActionData {
	balances: CustomerBalance[];
}

const schema = z.object({
	customerId: z.string().uuid(),
	currencyCode: z.string().trim().length(3).optional(),
});

export async function getCustomerBalanceAction(input: {
	customerId: string;
	currencyCode?: string;
}): Promise<ActionResult<GetCustomerBalanceActionData>> {
	return await runOperatorPermissionAction({
		path: "getCustomerBalanceAction",
		permission: "receivables.balance.read",
		safeMessage:
			"Could not load customer balance. Try again or contact an admin.",
		execute: async (session) => {
			const parsed = parseSchema(schema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid customer and optional currency.",
				});
			}
			const result = await getCustomerBalance(
				{
					...parsed.data,
					organizationId: session.orgId,
					actorUserId: session.userId,
				},
				createReceivablesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { balances: mapped.data } };
		},
	});
}
