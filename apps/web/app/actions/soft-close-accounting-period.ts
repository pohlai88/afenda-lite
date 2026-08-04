"use server";

import {
	type AccountingPeriod,
	softCloseAccountingPeriod,
} from "@afenda/accounting";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/_runtime/run-operator-permission-action";
import { createAccountingCommandOptions } from "@/lib/erp/accounting-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

export type SoftCloseAccountingPeriodActionState = ActionResult<{
	period: AccountingPeriod;
}> | null;
const schema = z.object({
	periodId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
});

export async function softCloseAccountingPeriodAction(
	_prev: SoftCloseAccountingPeriodActionState,
	formData: FormData,
): Promise<SoftCloseAccountingPeriodActionState> {
	return await runOperatorPermissionAction({
		path: "softCloseAccountingPeriodAction",
		permission: "accounting.period.soft_close",
		safeMessage:
			"Could not soft-close accounting period. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(schema, {
				periodId: formData.get("periodId"),
				expectedVersion: formData.get("expectedVersion"),
			});
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid period and version.",
				});
			}
			const mapped = mapPackageResult(
				await softCloseAccountingPeriod(
					{
						...parsed.data,
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
					},
					createAccountingCommandOptions(),
				),
			);
			if (!mapped.ok) {
				return mapped;
			}
			revalidatePath("/admin/accounting");
			revalidatePath("/client/accounting");
			return { ok: true, data: { period: mapped.data } };
		},
	});
}
