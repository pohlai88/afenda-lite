"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import {
	getPaymentApplicationAvailability,
	type PaymentApplicationAvailability,
} from "@afenda/payments";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/_runtime/run-operator-permission-action";
import { createPaymentsCommandOptions } from "@/lib/erp/payments-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

export type GetPaymentApplicationAvailabilityActionState = ActionResult<{
	availability: PaymentApplicationAvailability;
}> | null;

const schema = z.object({
	paymentId: z.string().uuid(),
});

export async function getPaymentApplicationAvailabilityAction(
	_prev: GetPaymentApplicationAvailabilityActionState,
	formData: FormData,
): Promise<GetPaymentApplicationAvailabilityActionState> {
	return await runOperatorPermissionAction({
		path: "getPaymentApplicationAvailabilityAction",
		permission: "payments.availability.read",
		safeMessage:
			"Could not load payment application availability. Try again or contact an admin.",
		execute: async (session) => {
			const parsed = parseSchema(schema, {
				paymentId: formData.get("paymentId"),
			});
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid payment id.",
				});
			}
			const mapped = mapPackageResult(
				await getPaymentApplicationAvailability(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						paymentId: parsed.data.paymentId,
					},
					createPaymentsCommandOptions(),
				),
			);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { availability: mapped.data } };
		},
	});
}
