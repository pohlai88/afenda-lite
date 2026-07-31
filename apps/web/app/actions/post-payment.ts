"use server";

import { randomUUID } from "node:crypto";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { type Payment, postPayment } from "@afenda/payments";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { applyPaymentInstructionsAfterPost } from "@/lib/erp/payments-application-orchestrator";
import { createPaymentsCommandOptions } from "@/lib/erp/payments-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

export type PostPaymentActionState = ActionResult<{ payment: Payment }> | null;

const schema = z.object({
	paymentId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
});

export async function postPaymentAction(
	_prev: PostPaymentActionState,
	formData: FormData,
): Promise<PostPaymentActionState> {
	return await runOperatorPermissionAction({
		path: "postPaymentAction",
		permission: "payments.payment.post",
		safeMessage: "Could not post payment. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(schema, {
				paymentId: formData.get("paymentId"),
				expectedVersion: formData.get("expectedVersion"),
			});
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid payment and expected version.",
				});
			}
			const mapped = mapPackageResult(
				await postPayment(
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
			const applications = await applyPaymentInstructionsAfterPost({
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
				payment: mapped.data,
			});
			if (!applications.ok) {
				return mapPackageResult(applications);
			}
			revalidatePath("/admin/payments");
			revalidatePath("/client/payments");
			return { ok: true, data: { payment: mapped.data } };
		},
	});
}
