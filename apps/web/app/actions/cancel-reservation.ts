"use server";

import { randomUUID } from "node:crypto";
import { cancelReservation, type StockReservation } from "@afenda/inventory";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { revalidateInventoryPaths } from "@/app/actions/revalidate-inventory-paths";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createInventoryCommandOptions } from "@/lib/erp/inventory-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type CancelReservationActionData = {
	reservation: StockReservation;
};

export type CancelReservationActionState =
	ActionResult<CancelReservationActionData> | null;

const cancelReservationFormSchema = z.object({
	reservationId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
	idempotencyKey: z
		.string()
		.trim()
		.min(1)
		.max(128)
		.optional()
		.transform((value) => value ?? `cancel-rsv:${randomUUID()}`),
});

/**
 * Cancel active stock reservation — `inventory.reservation.release` permission.
 */
export async function cancelReservationAction(
	_prev: CancelReservationActionState,
	formData: FormData,
): Promise<CancelReservationActionState> {
	return runOperatorPermissionAction({
		path: "cancelReservationAction",
		permission: "inventory.reservation.release",
		safeMessage: "Could not cancel reservation. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(cancelReservationFormSchema, {
				reservationId: formData.get("reservationId"),
				expectedVersion: formData.get("expectedVersion"),
				idempotencyKey: formData.get("idempotencyKey") ?? undefined,
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid reservation, expected version, and idempotency key.",
					parsed.details,
				);
			}

			const result = await cancelReservation(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					reservationId: parsed.data.reservationId,
					expectedVersion: parsed.data.expectedVersion,
					idempotencyKey: parsed.data.idempotencyKey,
				},
				createInventoryCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			revalidateInventoryPaths();
			return { ok: true, data: { reservation: mapped.data } };
		},
	});
}
