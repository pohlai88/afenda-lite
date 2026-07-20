"use server";

import { createItem, ITEM_TYPES, type Item } from "@afenda/master-data";
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

export type CreateItemActionData = { item: Item };
export type CreateItemActionState = ActionResult<CreateItemActionData> | null;

const schema = z.object({
	code: z.string().trim().min(1).max(64),
	name: z.string().trim().min(1).max(200),
	itemType: z.enum(ITEM_TYPES),
	baseUomId: z.string().uuid(),
	itemGroupId: z.string().uuid(),
});

export async function createItemAction(
	_prev: CreateItemActionState,
	formData: FormData,
): Promise<CreateItemActionState> {
	const parsed = parseSchema(schema, {
		code: formData.get("code"),
		name: formData.get("name"),
		itemType: formData.get("itemType"),
		baseUomId: formData.get("baseUomId"),
		itemGroupId: formData.get("itemGroupId"),
	});
	if (!parsed.success) {
		return actionFail(
			"VALIDATION_ERROR",
			"Enter a valid item code, name, type, UoM, and group.",
			parsed.details,
		);
	}
	return runMemberPermissionAction({
		path: "createItemAction",
		permission: "master_data.manage",
		safeMessage: "Could not create item. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const result = await createItem(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					code: parsed.data.code,
					name: parsed.data.name,
					itemType: parsed.data.itemType,
					baseUomId: parsed.data.baseUomId,
					itemGroupId: parsed.data.itemGroupId,
				},
				{ authorization: createMasterDataAuthorizationPort() },
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			revalidatePath("/admin/master-data");
			revalidatePath("/client/master-data");
			return { ok: true, data: { item: mapped.data } };
		},
	});
}
