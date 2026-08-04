"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import {
	type ReceivingDiscrepancy,
	resolveReceivingDiscrepancy,
} from "@afenda/receiving";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/_runtime/run-operator-permission-action";
import { createReceivingCommandOptions } from "@/lib/erp/receiving-command-options";
import { revalidateReceivingPaths } from "@/lib/erp/receiving-revalidate";
import { parseSchema } from "@/modules/platform/schemas/common";

export interface ResolveReceivingDiscrepancyActionData {
	discrepancy: ReceivingDiscrepancy;
}
export type ResolveReceivingDiscrepancyActionState =
	ActionResult<ResolveReceivingDiscrepancyActionData> | null;

const resolveReceivingDiscrepancyFormSchema = z.object({
	receiptId: z.string().uuid(),
	discrepancyId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
	resolution: z.string().trim().min(1).max(2000),
});

export async function resolveReceivingDiscrepancyAction(
	_prev: ResolveReceivingDiscrepancyActionState,
	formData: FormData,
): Promise<ResolveReceivingDiscrepancyActionState> {
	return await runOperatorPermissionAction({
		path: "resolveReceivingDiscrepancyAction",
		permission: "receiving.discrepancy.resolve",
		safeMessage:
			"Could not resolve receiving discrepancy. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(resolveReceivingDiscrepancyFormSchema, {
				receiptId: formData.get("receiptId"),
				discrepancyId: formData.get("discrepancyId"),
				expectedVersion: formData.get("expectedVersion"),
				resolution: formData.get("resolution"),
			});
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid discrepancy, version, and resolution.",
				});
			}
			const result = await resolveReceivingDiscrepancy(
				{
					...parsed.data,
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: `disc-resolve:${correlationId}:${parsed.data.discrepancyId}`,
				},
				createReceivingCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			revalidateReceivingPaths();
			return { ok: true, data: { discrepancy: mapped.data } };
		},
	});
}
