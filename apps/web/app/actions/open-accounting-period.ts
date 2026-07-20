"use server";

import {
	type AccountingPeriod,
	openAccountingPeriod,
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

export type OpenAccountingPeriodActionState = ActionResult<{
	period: AccountingPeriod;
}> | null;
const schema = z.object({
	code: z.string().trim().min(1).max(64),
	startDate: z.iso.date(),
	endDate: z.iso.date(),
});

export async function openAccountingPeriodAction(
	_prev: OpenAccountingPeriodActionState,
	formData: FormData,
): Promise<OpenAccountingPeriodActionState> {
	return runOperatorPermissionAction({
		path: "openAccountingPeriodAction",
		permission: "accounting.manage",
		safeMessage:
			"Could not open accounting period. Try again or contact an admin.",
		execute: async (session) => {
			const parsed = parseSchema(schema, {
				code: formData.get("code"),
				startDate: formData.get("startDate"),
				endDate: formData.get("endDate"),
			});
			if (!parsed.success)
				return actionFail(
					"VALIDATION_ERROR",
					"Enter valid accounting period dates.",
					parsed.details,
				);
			const mapped = mapPackageResult(
				await openAccountingPeriod(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
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
