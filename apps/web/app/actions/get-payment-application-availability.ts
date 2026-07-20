"use server";

import {
	getPaymentApplicationAvailability,
	type PaymentApplicationAvailability,
} from "@afenda/payments";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createPaymentsCommandOptions } from "@/lib/erp/payments-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
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
	return runOperatorPermissionAction({
		path: "getPaymentApplicationAvailabilityAction",
		permission: "payments.availability.read",
		safeMessage:
			"Could not load payment application availability. Try again or contact an admin.",
		execute: async (session) => {
			const parsed = parseSchema(schema, {
				paymentId: formData.get("paymentId"),
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid payment id.",
					parsed.details,
				);
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
			if (!mapped.ok) return mapped;
			return { ok: true, data: { availability: mapped.data } };
		},
	});
}
