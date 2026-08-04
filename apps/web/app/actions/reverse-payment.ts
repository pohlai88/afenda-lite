"use server";

import { randomUUID } from "node:crypto";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { type Payment, reversePayment } from "@afenda/payments";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { reversePaymentApplications } from "@/lib/erp/payments-application-orchestrator";
import { createPaymentsCommandOptions } from "@/lib/erp/payments-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

export type ReversePaymentActionState = ActionResult<{
	payment: Payment;
}> | null;

const schema = z.object({
	paymentId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
	reason: z.string().trim().min(1).max(512),
});

export async function reversePaymentAction(
	_prev: ReversePaymentActionState,
	formData: FormData,
): Promise<ReversePaymentActionState> {
	return await runOperatorPermissionAction({
		path: "reversePaymentAction",
		permission: "payments.payment.reverse",
		safeMessage: "Could not reverse payment. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(schema, {
				paymentId: formData.get("paymentId"),
				expectedVersion: formData.get("expectedVersion"),
				reason: formData.get("reason"),
			});
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage:
						"Enter a valid payment, expected version, and reversal reason.",
				});
			}
			const mapped = mapPackageResult(
				await reversePayment(
					{
						...parsed.data,
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						idempotencyKey: randomUUID(),
					},
					createPaymentsCommandOptions(),
				),
			);
			if (!mapped.ok) {
				return mapped;
			}
			const applications = await reversePaymentApplications({
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
				paymentId: mapped.data.id,
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
