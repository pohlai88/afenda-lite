"use server";

import { releaseReservation, type StockMovement } from "@afenda/inventory";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import { createInventoryCommandOptions } from "@/lib/erp/inventory-command-options";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type ReleaseReservationActionData = {
	movement: StockMovement;
};

export type ReleaseReservationActionState =
	ActionResult<ReleaseReservationActionData> | null;

const releaseReservationFormSchema = z.object({
	code: z.string().trim().min(1).max(64),
	reservationId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
});

/**
 * Release active stock reservation — `inventory.manage`.
 */
export async function releaseReservationAction(
	_prev: ReleaseReservationActionState,
	formData: FormData,
): Promise<ReleaseReservationActionState> {
	return runOperatorPermissionAction({
		path: "releaseReservationAction",
		permission: "inventory.manage",
		safeMessage:
			"Could not release reservation. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(releaseReservationFormSchema, {
				code: formData.get("code"),
				reservationId: formData.get("reservationId"),
				expectedVersion: formData.get("expectedVersion"),
			});
			if (!parsed.success) {
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid release code, reservation, and expected version.",
					parsed.details,
				);
			}

			const result = await releaseReservation(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					code: parsed.data.code,
					reservationId: parsed.data.reservationId,
					expectedVersion: parsed.data.expectedVersion,
				},
				createInventoryCommandOptions(),
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			revalidatePath("/admin/inventory");
			revalidatePath("/client/inventory");
			return { ok: true, data: { movement: mapped.data } };
		},
	});
}
