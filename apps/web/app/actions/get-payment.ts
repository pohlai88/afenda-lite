"use server";

import { getPaymentById, type Payment } from "@afenda/payments";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createPaymentsCommandOptions } from "@/lib/erp/payments-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export async function getPaymentAction(
	paymentId: string,
): Promise<ActionResult<{ payment: Payment }>> {
	return runOperatorPermissionAction({
		path: "getPaymentAction",
		permission: "payments.read",
		safeMessage: "Could not load payment. Try again or contact an admin.",
		execute: async (session) => {
			const parsed = parseSchema(z.string().uuid(), paymentId);
			if (!parsed.success)
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid payment id.",
					parsed.details,
				);
			const mapped = mapPackageResult(
				await getPaymentById(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						id: parsed.data,
					},
					createPaymentsCommandOptions(),
				),
			);
			if (!mapped.ok) return mapped;
			if (mapped.data === null)
				return actionFail("NOT_FOUND", "Payment not found");
			return { ok: true, data: { payment: mapped.data } };
		},
	});
}
