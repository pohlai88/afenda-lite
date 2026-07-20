"use server";

import { getSession } from "@afenda/auth";
import { createCorrelationId } from "@afenda/http";
import { activateItemTemplate, type ItemTemplate } from "@afenda/master-data";
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

export type ActivateItemTemplateActionData = {
	template: ItemTemplate;
};

export type ActivateItemTemplateActionState =
	ActionResult<ActivateItemTemplateActionData> | null;

const activateItemTemplateFormSchema = z.object({
	id: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
});

/** Form-action entry (no useActionState prev). */
export async function activateItemTemplateFormAction(
	formData: FormData,
): Promise<void> {
	await activateItemTemplateAction(null, formData);
}

/** Activate draft template (freezes attribute set) — `master_data.manage`. */
export async function activateItemTemplateAction(
	_prev: ActivateItemTemplateActionState,
	formData: FormData,
): Promise<ActivateItemTemplateActionState> {
	const correlationId = createCorrelationId();
	const session = await getSession();

	const parsed = parseSchema(activateItemTemplateFormSchema, {
		id: formData.get("id"),
		expectedVersion: formData.get("expectedVersion"),
	});
	if (!parsed.success) {
		return actionFail(
			"VALIDATION_ERROR",
			"Select a valid draft template to activate.",
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
		const result = await activateItemTemplate(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
				id: parsed.data.id,
				expectedVersion: parsed.data.expectedVersion,
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
			path: "activateItemTemplateAction",
			code: "INTERNAL_ERROR",
		});
		return actionFailInternal(
			"Could not activate item template. Try again or contact an admin.",
			correlationId,
		);
	}
}
