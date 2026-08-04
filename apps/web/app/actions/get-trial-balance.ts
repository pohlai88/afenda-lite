"use server";

import { getTrialBalance, type TrialBalanceRow } from "@afenda/accounting";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createAccountingCommandOptions } from "@/lib/erp/accounting-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

const schema = z.object({ periodId: z.string().uuid().optional() }).optional();

export async function getTrialBalanceAction(input?: {
	periodId?: string;
}): Promise<ActionResult<{ rows: TrialBalanceRow[] }>> {
	return await runOperatorPermissionAction({
		path: "getTrialBalanceAction",
		permission: "accounting.trial_balance.read",
		safeMessage: "Could not load trial balance. Try again or contact an admin.",
		execute: async (session) => {
			const parsed = parseSchema(schema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid accounting period.",
				});
			}
			const mapped = mapPackageResult(
				await getTrialBalance(
					{
						...parsed.data,
						organizationId: session.orgId,
						actorUserId: session.userId,
					},
					createAccountingCommandOptions(),
				),
			);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { rows: mapped.data } };
		},
	});
}
