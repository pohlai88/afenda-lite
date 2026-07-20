"use server";

import {
	type ProofOfDelivery,
	recordProofOfDelivery,
} from "@afenda/fulfillment";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createFulfillmentCommandOptions } from "@/lib/erp/fulfillment-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type RecordProofOfDeliveryActionData = {
	proofOfDelivery: ProofOfDelivery;
};
export type RecordProofOfDeliveryActionState =
	ActionResult<RecordProofOfDeliveryActionData> | null;

const recordProofOfDeliveryFormSchema = z.object({
	deliveryId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
	receivedByName: z.string().trim().min(1).max(300),
	notes: z
		.string()
		.trim()
		.max(2000)
		.optional()
		.transform((value) => (value === "" ? undefined : value)),
	recordedAt: z
		.union([z.coerce.date(), z.literal("")])
		.optional()
		.transform((value) =>
			value === undefined || value === "" ? undefined : value,
		),
});

export async function recordProofOfDeliveryAction(
	_prev: RecordProofOfDeliveryActionState,
	formData: FormData,
): Promise<RecordProofOfDeliveryActionState> {
	return runOperatorPermissionAction({
		path: "recordProofOfDeliveryAction",
		permission: "fulfillment.manage",
		safeMessage:
			"Could not record proof of delivery. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(recordProofOfDeliveryFormSchema, {
				deliveryId: formData.get("deliveryId"),
				expectedVersion: formData.get("expectedVersion"),
				receivedByName: formData.get("receivedByName"),
				notes: formData.get("notes") ?? undefined,
				recordedAt: formData.get("recordedAt") ?? undefined,
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid delivery, version, recipient, and recorded time.",
					parsed.details,
				);
			}
			const result = await recordProofOfDelivery(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					...parsed.data,
				},
				createFulfillmentCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) return mapped;
			revalidatePath("/admin/fulfillment");
			revalidatePath("/client/fulfillment");
			return { ok: true, data: { proofOfDelivery: mapped.data } };
		},
	});
}
