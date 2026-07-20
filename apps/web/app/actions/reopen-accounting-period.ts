"use server";

import {
	type AccountingPeriod,
	reopenAccountingPeriod,
} from "@afenda/accounting";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createAccountingCommandOptions } from "@/lib/erp/accounting-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type ReopenAccountingPeriodActionState = ActionResult<{
	period: AccountingPeriod;
}> | null;
const schema = z.object({
	periodId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
	reason: z.string().trim().min(1).max(500),
});

export async function reopenAccountingPeriodAction(
	_prev: ReopenAccountingPeriodActionState,
	formData: FormData,
): Promise<ReopenAccountingPeriodActionState> {
	return runOperatorPermissionAction({
		path: "reopenAccountingPeriodAction",
		permission: "accounting.period.reopen",
		safeMessage:
			"Could not reopen accounting period. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(schema, {
				periodId: formData.get("periodId"),
				expectedVersion: formData.get("expectedVersion"),
				reason: formData.get("reason"),
			});
			if (!parsed.success)
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid period, version, and reason.",
					parsed.details,
				);
			const mapped = mapPackageResult(
				await reopenAccountingPeriod(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						...parsed.data,
					},
					createAccountingCommandOptions(),
				),
			);
			if (!mapped.ok) return mapped;
			revalidatePath("/admin/accounting");
			revalidatePath("/client/accounting");
			return { ok: true, data: { period: mapped.data } };
		},
	});
}
