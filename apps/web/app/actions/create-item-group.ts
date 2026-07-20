"use server";

import { createItemGroup, type ItemGroup } from "@afenda/master-data";
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

export type CreateItemGroupActionData = { itemGroup: ItemGroup };
export type CreateItemGroupActionState =
	ActionResult<CreateItemGroupActionData> | null;

const schema = z.object({
	code: z.string().trim().min(1).max(64),
	name: z.string().trim().min(1).max(200),
});

export async function createItemGroupAction(
	_prev: CreateItemGroupActionState,
	formData: FormData,
): Promise<CreateItemGroupActionState> {
	const parsed = parseSchema(schema, {
		code: formData.get("code"),
		name: formData.get("name"),
	});
	if (!parsed.success) {
		return actionFail(
			"VALIDATION_ERROR",
			"Enter a valid item group code and name.",
			parsed.details,
		);
	}
	return runMemberPermissionAction({
		path: "createItemGroupAction",
		permission: "master_data.manage",
		safeMessage:
			"Could not create item group. Try again or contact an admin.",
		execute: async (session, correlationId) => {
			const result = await createItemGroup(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					code: parsed.data.code,
					name: parsed.data.name,
				},
				{ authorization: createMasterDataAuthorizationPort() },
			);
			const mapped = mapPackageResult(result);
			if (!mapped.ok) {
				return mapped;
			}
			revalidatePath("/admin/master-data");
			revalidatePath("/client/master-data");
			return { ok: true, data: { itemGroup: mapped.data } };
		},
	});
}
