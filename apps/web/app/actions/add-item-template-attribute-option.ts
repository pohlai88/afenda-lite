"use server";

import { getSession } from "@afenda/auth";
import { createCorrelationId } from "@afenda/http";
import {
	addItemTemplateAttributeOption,
	type ItemTemplateAttributeOption,
} from "@afenda/master-data";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { logProductEvent } from "@/modules/platform/observability/product-log";
import {
	type ActionResult,
	actionFail,
	actionFailInternal,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type AddItemTemplateAttributeOptionActionData = {
	option: ItemTemplateAttributeOption;
};

export type AddItemTemplateAttributeOptionActionState =
	ActionResult<AddItemTemplateAttributeOptionActionData> | null;

const addOptionFormSchema = z.object({
	attributeId: z.string().uuid(),
	code: z.string().trim().min(1).max(64),
	label: z.string().trim().min(1).max(200),
});

/** Add closed option to a draft template attribute — `master_data.manage`. */
export async function addItemTemplateAttributeOptionAction(
	_prev: AddItemTemplateAttributeOptionActionState,
	formData: FormData,
): Promise<AddItemTemplateAttributeOptionActionState> {
	const correlationId = createCorrelationId();
	const session = await getSession();

	const parsed = parseSchema(addOptionFormSchema, {
		attributeId: formData.get("attributeId"),
		code: formData.get("code"),
		label: formData.get("label"),
	});
	if (!parsed.success) {
		return actionFail(
			"VALIDATION_ERROR",
			"Enter a valid attribute, option code, and label.",
			parsed.details,
		);
	}

	const permissionDenied = await forbidUnlessPermission(
		session,
		"master_data.manage",
	);
	if (permissionDenied) {
		return permissionDenied;
	}

	try {
		const result = await addItemTemplateAttributeOption(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
				attributeId: parsed.data.attributeId,
				code: parsed.data.code,
				label: parsed.data.label,
			},
			{ authorization: createMasterDataAuthorizationPort() },
		);
		const mapped = mapPackageResult(result);
		if (!mapped.ok) {
			return mapped;
		}
		revalidatePath("/admin/master-data");
		revalidatePath("/client/master-data");
		return { ok: true, data: { option: mapped.data } };
	} catch {
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "addItemTemplateAttributeOptionAction",
			code: "INTERNAL_ERROR",
		});
		return actionFailInternal(
			"Could not add attribute option. Try again or contact an admin.",
			correlationId,
		);
	}
}
