"use server";

import {
	type ReceivingDiscrepancy,
	recordReceivingDiscrepancy,
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

export type RecordReceivingDiscrepancyActionData = {
	discrepancy: ReceivingDiscrepancy;
};
export type RecordReceivingDiscrepancyActionState =
	ActionResult<RecordReceivingDiscrepancyActionData> | null;

const optionalUuid = z
	.union([z.string().uuid(), z.literal("")])
	.optional()
	.transform((value) =>
		value === undefined || value === "" ? undefined : value,
	);

const recordReceivingDiscrepancyFormSchema = z.object({
	receiptId: z.string().uuid(),
	receiptLineId: optionalUuid,
	discrepancyType: z.enum([
		"short_quantity",
		"excess_quantity",
		"damaged",
		"quality_failure",
		"wrong_item",
		"wrong_uom",
		"documentation",
		"temperature",
		"other",
	]),
	quantity: z.coerce.number().positive(),
	notes: z
		.string()
		.trim()
		.max(2000)
		.optional()
		.transform((value) => (value === "" ? undefined : value)),
});

export async function recordReceivingDiscrepancyAction(
	_prev: RecordReceivingDiscrepancyActionState,
	formData: FormData,
): Promise<RecordReceivingDiscrepancyActionState> {
	return runOperatorPermissionAction({
		path: "recordReceivingDiscrepancyAction",
		permission: "receiving.discrepancy.record",
		safeMessage:
			"Could not record receiving discrepancy. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(recordReceivingDiscrepancyFormSchema, {
				receiptId: formData.get("receiptId"),
				receiptLineId: formData.get("receiptLineId") ?? undefined,
				discrepancyType: formData.get("discrepancyType"),
				quantity: formData.get("quantity"),
				notes: formData.get("notes") ?? undefined,
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid receipt, discrepancy type, and positive quantity.",
					parsed.details,
				);
			}
			const result = await recordReceivingDiscrepancy(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					idempotencyKey: `disc:${correlationId}:${parsed.data.receiptId}:${parsed.data.discrepancyType}`,
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
