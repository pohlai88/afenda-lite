"use server";

import { randomUUID } from "node:crypto";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { releaseReservation, type StockReservation } from "@afenda/inventory";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { revalidateInventoryPaths } from "@/app/actions/revalidate-inventory-paths";
import { runOperatorPermissionAction } from "@/app/actions/_runtime/run-operator-permission-action";
import { createInventoryCommandOptions } from "@/lib/erp/inventory-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

export interface ReleaseReservationActionData {
	reservation: StockReservation;
}

export type ReleaseReservationActionState =
	ActionResult<ReleaseReservationActionData> | null;

const releaseReservationFormSchema = z.object({
	reservationId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
	idempotencyKey: z
		.string()
		.trim()
		.min(1)
		.max(128)
		.optional()
		.transform((value) => value ?? `release:${randomUUID()}`),
});

/**
 * Release active stock reservation — `inventory.reservation.release`.
 */
export async function releaseReservationAction(
	_prev: ReleaseReservationActionState,
	formData: FormData,
): Promise<ReleaseReservationActionState> {
	return await runOperatorPermissionAction({
		path: "releaseReservationAction",
		permission: "inventory.reservation.release",
		safeMessage:
			"Could not release reservation. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(releaseReservationFormSchema, {
				reservationId: formData.get("reservationId"),
				expectedVersion: formData.get("expectedVersion"),
				idempotencyKey: formData.get("idempotencyKey") ?? undefined,
			});
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage:
						"Enter a valid reservation, expected version, and idempotency key.",
				});
			}

			const result = await releaseReservation(
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
