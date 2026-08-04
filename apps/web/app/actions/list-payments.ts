"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { listPayments, type Payment } from "@afenda/payments";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/_runtime/run-operator-permission-action";
import { createPaymentsCommandOptions } from "@/lib/erp/payments-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

const schema = z
	.object({
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		status: z.enum(["draft", "posted", "reversed"]).optional(),
		direction: z
			.enum(["receipt", "disbursement", "refund", "transfer"])
			.optional(),
	})
	.optional();

export async function listPaymentsAction(input?: {
	page?: number;
	pageSize?: number;
	status?: Payment["status"];
	direction?: Payment["direction"];
}): Promise<ActionResult<{ payments: Payment[] }>> {
	return await runOperatorPermissionAction({
		path: "listPaymentsAction",
		permission: "payments.payment.read",
		safeMessage: "Could not list payments. Try again or contact an admin.",
		execute: async (session) => {
			const parsed = parseSchema(schema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter valid payment filters.",
				});
			}
			const mapped = mapPackageResult(
				await listPayments(
					{
						...parsed.data,
						organizationId: session.orgId,
						actorUserId: session.userId,
					},
					createPaymentsCommandOptions(),
				),
			);
			if (!mapped.ok) {
				return mapped;
			}
			return { ok: true, data: { payments: mapped.data } };
		},
	});
}
