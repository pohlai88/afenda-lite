"use server";

import { authServer } from "@afenda/auth";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { http } from "@afenda/http";
import { logger } from "@afenda/logger";
import {
	addItemTemplateAttribute,
	type ItemTemplateAttribute,
} from "@afenda/master-data";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { ITEM_TEMPLATE_ATTRIBUTE_FORM_DATA_TYPES } from "@/lib/erp/master-data-item-template-ui-policy";
import { parseSchema } from "@/modules/platform/schemas/common";

export interface AddItemTemplateAttributeActionData {
	attribute: ItemTemplateAttribute;
}

export type AddItemTemplateAttributeActionState =
	ActionResult<AddItemTemplateAttributeActionData> | null;

const addItemTemplateAttributeFormSchema = z.object({
	templateId: z.string().uuid(),
	code: z.string().trim().min(1).max(64),
	name: z.string().trim().min(1).max(200),
	dataType: z.enum(ITEM_TEMPLATE_ATTRIBUTE_FORM_DATA_TYPES),
});

/** Add a variant-defining attribute to a draft template. */
export async function addItemTemplateAttributeAction(
	_prev: AddItemTemplateAttributeActionState,
	formData: FormData,
): Promise<AddItemTemplateAttributeActionState> {
	const correlationId = http.correlation.create();
	const session = await authServer.session.get();

	const parsed = parseSchema(addItemTemplateAttributeFormSchema, {
		templateId: formData.get("templateId"),
		code: formData.get("code"),
		name: formData.get("name"),
		dataType: formData.get("dataType"),
	});
	if (!parsed.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage:
				"Enter a valid template, attribute code, name, and value kind.",
		});
	}

	const permissionDenied = await forbidUnlessPermission(
		session,
		"master_data.item_variant_defining_attribute_manage",
	);
	if (permissionDenied) {
		return permissionDenied;
	}

	try {
		const result = await addItemTemplateAttribute(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
				templateId: parsed.data.templateId,
				code: parsed.data.code,
				name: parsed.data.name,
				dataType: parsed.data.dataType,
			},
			{ authorization: createMasterDataAuthorizationPort() },
		);
		const mapped = mapPackageResult(result);
		if (!mapped.ok) {
			return mapped;
		}
		revalidatePath("/admin/master-data");
		revalidatePath("/client/master-data");
		return { ok: true, data: { attribute: mapped.data } };
	} catch {
		logger.event({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "addItemTemplateAttributeAction",
			code: "INTERNAL_ERROR",
		});
		return errorResult.fail("INTERNAL_ERROR", { correlationId });
	}
}
