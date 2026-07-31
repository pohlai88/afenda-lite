"use server";

import { randomUUID } from "node:crypto";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import {
	addPaymentApplicationInstruction,
	type PaymentApplicationInstruction,
} from "@afenda/payments";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createPaymentsCommandOptions } from "@/lib/erp/payments-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

export type AddPaymentApplicationInstructionActionState = ActionResult<{
	instruction: PaymentApplicationInstruction;
}> | null;

const schema = z.object({
	paymentId: z.string().uuid(),
	targetModule: z.enum(["receivables", "payables"]),
	targetDocumentType: z.enum(["customer_invoice", "supplier_invoice"]),
	targetDocumentId: z.string().uuid(),
	intendedAmount: z.coerce.number().positive(),
	currencyCode: z.string().trim().length(3),
});

export async function addPaymentApplicationInstructionAction(
	_prev: AddPaymentApplicationInstructionActionState,
	formData: FormData,
): Promise<AddPaymentApplicationInstructionActionState> {
	return await runOperatorPermissionAction({
		path: "addPaymentApplicationInstructionAction",
		permission: "payments.application_instruction.manage",
		safeMessage:
			"Could not add payment application instruction. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(schema, {
				paymentId: formData.get("paymentId"),
				targetModule: formData.get("targetModule"),
				targetDocumentType: formData.get("targetDocumentType"),
				targetDocumentId: formData.get("targetDocumentId"),
				intendedAmount: formData.get("intendedAmount"),
				currencyCode: formData.get("currencyCode"),
			});
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid payment application instruction.",
				});
			}
			const mapped = mapPackageResult(
				await addPaymentApplicationInstruction(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						idempotencyKey: randomUUID(),
						...parsed.data,
					},
					createPaymentsCommandOptions(),
				),
			);
			if (!mapped.ok) {
				return mapped;
			}
			revalidatePath("/admin/payments");
			revalidatePath("/client/payments");
			return { ok: true, data: { instruction: mapped.data } };
		},
	});
}
