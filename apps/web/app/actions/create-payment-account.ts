"use server";

import { randomUUID } from "node:crypto";
import { createPaymentAccount, type PaymentAccount } from "@afenda/payments";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createPaymentsCommandOptions } from "@/lib/erp/payments-command-options";
import { type ActionResult, actionFail } from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type CreatePaymentAccountActionState = ActionResult<{ account: PaymentAccount }> | null;

const schema = z.object({
	code: z.string().trim().min(1).max(64),
	name: z.string().trim().min(1).max(128),
	kind: z.enum(["bank", "cash", "gateway", "clearing"]),
	currencyCode: z.string().trim().length(3),
});

export async function createPaymentAccountAction(
	_prev: CreatePaymentAccountActionState,
	formData: FormData,
): Promise<CreatePaymentAccountActionState> {
	return runOperatorPermissionAction({
		path: "createPaymentAccountAction",
		permission: "payments.account.manage",
		safeMessage: "Could not create payment account. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(schema, {
				code: formData.get("code"),
				name: formData.get("name"),
				kind: formData.get("kind"),
				currencyCode: formData.get("currencyCode"),
			});
			if (!parsed.success) return actionFail("VALIDATION_ERROR", "Enter valid payment account details.", parsed.details);
			const mapped = mapPackageResult(await createPaymentAccount({
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
				idempotencyKey: randomUUID(),
				...parsed.data,
			}, createPaymentsCommandOptions()));
			if (!mapped.ok) return mapped;
			revalidatePath("/admin/payments");
			revalidatePath("/client/payments");
			return { ok: true, data: { account: mapped.data } };
		},
	});
}
