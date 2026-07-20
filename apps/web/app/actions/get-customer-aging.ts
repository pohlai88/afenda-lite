"use server";

import { getCustomerAging, type CustomerAging } from "@afenda/receivables";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createReceivablesCommandOptions } from "@/lib/erp/receivables-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type GetCustomerAgingActionData = { aging: CustomerAging };

const schema = z.object({
	customerId: z.string().uuid(),
	currencyCode: z.string().trim().length(3),
	asOfDate: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function getCustomerAgingAction(input: {
	customerId: string;
	currencyCode: string;
	asOfDate: string;
}): Promise<ActionResult<GetCustomerAgingActionData>> {
	return runOperatorPermissionAction({
		path: "getCustomerAgingAction",
		permission: "receivables.aging.read",
		safeMessage:
			"Could not load customer aging. Try again or contact an admin.",
		execute: async (session) => {
			const parsed = parseSchema(schema, input);
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid customer, currency, and as-of date.",
					parsed.details,
				);
			}
			const mapped = mapPackageResult(
				await getCustomerAging(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						...parsed.data,
					},
					createReceivablesCommandOptions(),
				),
			);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { aging: mapped.data } };
		},
	});
}
