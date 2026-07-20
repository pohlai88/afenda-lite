"use server";

import { type CustomerBalance, getCustomerBalance } from "@afenda/receivables";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createReceivablesCommandOptions } from "@/lib/erp/receivables-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type GetCustomerBalanceActionData = { balances: CustomerBalance[] };

const schema = z.object({
	customerId: z.string().uuid(),
	currencyCode: z.string().trim().length(3).optional(),
});

export async function getCustomerBalanceAction(input: {
	customerId: string;
	currencyCode?: string;
}): Promise<ActionResult<GetCustomerBalanceActionData>> {
	return runOperatorPermissionAction({
		path: "getCustomerBalanceAction",
		permission: "receivables.read",
		safeMessage:
			"Could not load customer balance. Try again or contact an admin.",
		execute: async (session) => {
			const parsed = parseSchema(schema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid customer and optional currency.",
					parsed.details,
				);
			}
			const result = await getCustomerBalance(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					...parsed.data,
				},
				createReceivablesCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { balances: mapped.data } };
		},
	});
}
