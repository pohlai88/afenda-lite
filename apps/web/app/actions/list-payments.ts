"use server";

import { listPayments, type Payment } from "@afenda/payments";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createPaymentsCommandOptions } from "@/lib/erp/payments-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
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
	return runOperatorPermissionAction({
		path: "listPaymentsAction",
		permission: "payments.read",
		safeMessage: "Could not list payments. Try again or contact an admin.",
		execute: async (session) => {
			const parsed = parseSchema(schema, input);
			if (!parsed.success)
				return actionFail(
					"VALIDATION_ERROR",
					"Enter valid payment filters.",
					parsed.details,
				);
			const mapped = mapPackageResult(
				await listPayments(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						...parsed.data,
					},
					createPaymentsCommandOptions(),
				),
			);
			if (!mapped.ok) return mapped;
			return { ok: true, data: { payments: mapped.data } };
		},
	});
}
