"use server";

import { getSession } from "@afenda/auth";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { createCorrelationId } from "@afenda/http";
import { createItemTemplate, type ItemTemplate } from "@afenda/master-data";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { logProductEvent } from "@/modules/platform/observability/product-log";
import { parseSchema } from "@/modules/platform/schemas/common";

export interface CreateItemTemplateActionData {
	template: ItemTemplate;
}

export type CreateItemTemplateActionState =
	ActionResult<CreateItemTemplateActionData> | null;

const createItemTemplateFormSchema = z.object({
	code: z.string().trim().min(1).max(64),
	name: z.string().trim().min(1).max(200),
});

/** Item template create — session org stamp + `master_data.manage`. */
export async function createItemTemplateAction(
	_prev: CreateItemTemplateActionState,
	formData: FormData,
): Promise<CreateItemTemplateActionState> {
	const correlationId = createCorrelationId();
	const session = await getSession();

	const parsed = parseSchema(createItemTemplateFormSchema, {
		code: formData.get("code"),
		name: formData.get("name"),
	});
	if (!parsed.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Enter a valid template code and name.",
		});
	}

	const permissionDenied = await forbidUnlessPermission(
		session,
		"master_data.manage",
	);
	if (permissionDenied) {
		return permissionDenied;
	}

	try {
		const result = await createItemTemplate(
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
		return { ok: true, data: { template: mapped.data } };
	} catch {
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "createItemTemplateAction",
			code: "INTERNAL_ERROR",
		});
		return errorResult.fail("INTERNAL_ERROR", { correlationId });
	}
}
