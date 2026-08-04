"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { type CustomerAging, getCustomerAging } from "@afenda/receivables";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/_runtime/run-operator-permission-action";
import { createReceivablesCommandOptions } from "@/lib/erp/receivables-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

export interface GetCustomerAgingActionData {
	aging: CustomerAging;
}

const schema = z.object({
	customerId: z.string().uuid(),
	currencyCode: z.string().trim().length(3),
	asOfDate: z
		.string()
		.trim()
		.regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function getCustomerAgingAction(input: {
	customerId: string;
	currencyCode: string;
	asOfDate: string;
}): Promise<ActionResult<GetCustomerAgingActionData>> {
	return await runOperatorPermissionAction({
		path: "getCustomerAgingAction",
		permission: "receivables.aging.read",
		safeMessage:
			"Could not load customer aging. Try again or contact an admin.",
		execute: async (session) => {
			const parsed = parseSchema(schema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid customer, currency, and as-of date.",
				});
			}
			const mapped = mapPackageResult(
				await getCustomerAging(
					{
						...parsed.data,
						organizationId: session.orgId,
						actorUserId: session.userId,
					},
					createReceivablesCommandOptions(),
				),
			);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { aging: mapped.data } };
		},
	});
}
