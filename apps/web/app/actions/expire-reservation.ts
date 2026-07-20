"use server";

import { randomUUID } from "node:crypto";
import { expireReservation, type StockReservation } from "@afenda/inventory";
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

export type ExpireReservationActionData = {
	reservation: StockReservation;
};

export type ExpireReservationActionState =
	ActionResult<ExpireReservationActionData> | null;

const expireReservationFormSchema = z.object({
	reservationId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
	idempotencyKey: z
		.string()
		.trim()
		.min(1)
		.max(128)
		.optional()
		.transform((value) => value ?? `expire:${randomUUID()}`),
});

/**
 * Expire active stock reservation — `inventory.reservation.release` permission.
 */
export async function expireReservationAction(
	_prev: ExpireReservationActionState,
	formData: FormData,
): Promise<ExpireReservationActionState> {
	return runOperatorPermissionAction({
		path: "expireReservationAction",
		permission: "inventory.reservation.release",
		safeMessage: "Could not expire reservation. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(expireReservationFormSchema, {
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

			const result = await expireReservation(
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
