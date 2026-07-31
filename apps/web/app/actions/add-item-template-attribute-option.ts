"use server";

import { authServer } from "@afenda/auth";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { http } from "@afenda/http";
import { logger } from "@afenda/logger";
import {
	addItemTemplateAttributeOption,
	type ItemTemplateAttributeOption,
} from "@afenda/master-data";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { parseSchema } from "@/modules/platform/schemas/common";

export interface AddItemTemplateAttributeOptionActionData {
	option: ItemTemplateAttributeOption;
}

export type AddItemTemplateAttributeOptionActionState =
	ActionResult<AddItemTemplateAttributeOptionActionData> | null;

const addOptionFormSchema = z.object({
	attributeId: z.string().uuid(),
	code: z.string().trim().min(1).max(64),
	label: z.string().trim().min(1).max(200),
});

/** Add a closed option — `master_data.item_template_option_manage`. */
export async function addItemTemplateAttributeOptionAction(
	_prev: AddItemTemplateAttributeOptionActionState,
	formData: FormData,
): Promise<AddItemTemplateAttributeOptionActionState> {
	const correlationId = http.correlation.create();
	const session = await authServer.session.get();

	const parsed = parseSchema(addOptionFormSchema, {
		attributeId: formData.get("attributeId"),
		code: formData.get("code"),
		label: formData.get("label"),
	});
	if (!parsed.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Enter a valid attribute, option code, and label.",
		});
	}

	const permissionDenied = await forbidUnlessPermission(
		session,
		"master_data.item_template_option_manage",
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
		logger.event({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "addItemTemplateAttributeOptionAction",
			code: "INTERNAL_ERROR",
		});
		return errorResult.fail("INTERNAL_ERROR", { correlationId });
	}
}
