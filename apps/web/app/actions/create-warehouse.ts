"use server";

import {
	createWarehouse,
	type Warehouse,
	WAREHOUSE_LOCATION_TYPES,
} from "@afenda/master-data";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runMemberPermissionAction } from "@/app/actions/run-member-permission-action";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type CreateWarehouseActionData = { warehouse: Warehouse };
export type CreateWarehouseActionState =
	ActionResult<CreateWarehouseActionData> | null;

const schema = z.object({
	code: z.string().trim().min(1).max(64),
	name: z.string().trim().min(1).max(200),
	locationType: z.enum(WAREHOUSE_LOCATION_TYPES),
});

export async function createWarehouseAction(
	_prev: CreateWarehouseActionState,
	formData: FormData,
): Promise<CreateWarehouseActionState> {
	const parsed = parseSchema(schema, {
		code: formData.get("code"),
		name: formData.get("name"),
		locationType: formData.get("locationType"),
	});
	if (!parsed.success) {
		return actionFail(
			"VALIDATION_ERROR",
			"Enter a valid warehouse code, name, and location type.",
			parsed.details,
		);
	}
	return runMemberPermissionAction({
		path: "createWarehouseAction",
		permission: "master_data.manage",
		safeMessage:
			"Could not create warehouse. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const result = await createWarehouse(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					code: parsed.data.code,
					name: parsed.data.name,
					locationType: parsed.data.locationType,
				},
				{ authorization: createMasterDataAuthorizationPort() },
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			revalidatePath("/admin/master-data");
			revalidatePath("/client/master-data");
			return { ok: true, data: { warehouse: mapped.data } };
		},
	});
}
