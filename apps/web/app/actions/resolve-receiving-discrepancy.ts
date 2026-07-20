"use server";

import {
	type ReceivingDiscrepancy,
	resolveReceivingDiscrepancy,
} from "@afenda/receiving";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createReceivingCommandOptions } from "@/lib/erp/receiving-command-options";
import { revalidateReceivingPaths } from "@/lib/erp/receiving-revalidate";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type ResolveReceivingDiscrepancyActionData = {
	discrepancy: ReceivingDiscrepancy;
};
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
	return runOperatorPermissionAction({
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
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid discrepancy, version, and resolution.",
					parsed.details,
				);
			}
			const result = await resolveReceivingDiscrepancy(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: `disc-resolve:${correlationId}:${parsed.data.discrepancyId}`,
					...parsed.data,
				},
				createReceivingCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			revalidateReceivingPaths();
			return { ok: true, data: { discrepancy: mapped.data } };
		},
	});
}
