"use server";

import { createDraftPayment, type Payment } from "@afenda/payments";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createPaymentsCommandOptions } from "@/lib/erp/payments-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type CreateDraftPaymentActionState = ActionResult<{
	payment: Payment;
}> | null;

const optionalUuid = z.preprocess(
	(value) => (value === "" ? undefined : value),
	z.string().uuid().optional(),
);
const optionalReference = z.preprocess(
	(value) => (value === "" ? undefined : value),
	z.string().trim().min(1).max(256).optional(),
);
const schema = z.object({
	code: z.string().trim().min(1).max(64),
	direction: z.enum(["receipt", "disbursement", "transfer"]),
	counterpartyId: optionalUuid,
	currencyCode: z.string().trim().length(3),
	amount: z.coerce.number().positive(),
	reference: optionalReference,
});

export async function createDraftPaymentAction(
	_prev: CreateDraftPaymentActionState,
	formData: FormData,
): Promise<CreateDraftPaymentActionState> {
	return runOperatorPermissionAction({
		path: "createDraftPaymentAction",
		permission: "payments.manage",
		safeMessage: "Could not create payment. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(schema, {
				code: formData.get("code"),
				direction: formData.get("direction"),
				counterpartyId: formData.get("counterpartyId"),
				currencyCode: formData.get("currencyCode"),
				amount: formData.get("amount"),
				reference: formData.get("reference"),
			});
			if (!parsed.success)
				return actionFail(
					"VALIDATION_ERROR",
					"Enter valid payment details.",
					parsed.details,
				);
			const mapped = mapPackageResult(
				await createDraftPayment(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						...parsed.data,
					},
					createPaymentsCommandOptions(),
				),
			);
			if (!mapped.ok) return mapped;
			revalidatePath("/admin/payments");
			revalidatePath("/client/payments");
			return { ok: true, data: { payment: mapped.data } };
		},
	});
}
