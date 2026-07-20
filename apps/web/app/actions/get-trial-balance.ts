"use server";

import { getTrialBalance, type TrialBalanceRow } from "@afenda/accounting";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createAccountingCommandOptions } from "@/lib/erp/accounting-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

const schema = z.object({ periodId: z.string().uuid().optional() }).optional();

export async function getTrialBalanceAction(input?: {
	periodId?: string;
}): Promise<ActionResult<{ rows: TrialBalanceRow[] }>> {
	return runOperatorPermissionAction({
		path: "getTrialBalanceAction",
		permission: "accounting.trial_balance.read",
		safeMessage: "Could not load trial balance. Try again or contact an admin.",
		execute: async (session) => {
			const parsed = parseSchema(schema, input);
			if (!parsed.success)
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid accounting period.",
					parsed.details,
				);
			const mapped = mapPackageResult(
				await getTrialBalance(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						...parsed.data,
					},
					createAccountingCommandOptions(),
				),
			);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { rows: mapped.data } };
		},
	});
}
