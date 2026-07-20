"use server";

import { getSession } from "@afenda/auth";
import { createCorrelationId } from "@afenda/http";
import {
	addItemTemplateAttribute,
	ITEM_TEMPLATE_ATTRIBUTE_VALUE_KINDS,
	type ItemTemplateAttribute,
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

export type AddItemTemplateAttributeActionData = {
	attribute: ItemTemplateAttribute;
};

export type AddItemTemplateAttributeActionState =
	ActionResult<AddItemTemplateAttributeActionData> | null;

const addItemTemplateAttributeFormSchema = z.object({
	templateId: z.string().uuid(),
	code: z.string().trim().min(1).max(64),
	name: z.string().trim().min(1).max(200),
	valueKind: z.enum(ITEM_TEMPLATE_ATTRIBUTE_VALUE_KINDS),
});

/** Add attribute to a draft template — `master_data.manage`. */
export async function addItemTemplateAttributeAction(
	_prev: AddItemTemplateAttributeActionState,
	formData: FormData,
): Promise<AddItemTemplateAttributeActionState> {
	const correlationId = createCorrelationId();
	const session = await getSession();

	const parsed = parseSchema(addItemTemplateAttributeFormSchema, {
		templateId: formData.get("templateId"),
		code: formData.get("code"),
		name: formData.get("name"),
		valueKind: formData.get("valueKind"),
	});
	if (!parsed.success) {
		return actionFail(
			"VALIDATION_ERROR",
			"Enter a valid template, attribute code, name, and value kind.",
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
		const result = await addItemTemplateAttribute(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
				templateId: parsed.data.templateId,
				code: parsed.data.code,
				name: parsed.data.name,
				valueKind: parsed.data.valueKind,
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
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "addItemTemplateAttributeAction",
			code: "INTERNAL_ERROR",
		});
		return actionFailInternal(
			"Could not add template attribute. Try again or contact an admin.",
			correlationId,
		);
	}
}
