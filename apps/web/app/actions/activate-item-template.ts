"use server";

import { authServer } from "@afenda/auth";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { http } from "@afenda/http";
import { logger } from "@afenda/logger";
import { activateItemTemplate, type ItemTemplate } from "@afenda/master-data";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { parseSchema } from "@/modules/platform/schemas/common";

export interface ActivateItemTemplateActionData {
	template: ItemTemplate;
}

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

/** Activate a draft template; package authorization owns the permission. */
export async function activateItemTemplateAction(
	_prev: ActivateItemTemplateActionState,
	formData: FormData,
): Promise<ActivateItemTemplateActionState> {
	const correlationId = http.correlation.create();
	const session = await authServer.session.get();

	const parsed = parseSchema(activateItemTemplateFormSchema, {
		id: formData.get("id"),
		expectedVersion: formData.get("expectedVersion"),
	});
	if (!parsed.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Select a valid draft template to activate.",
		});
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
		logger.event({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "activateItemTemplateAction",
			code: "INTERNAL_ERROR",
		});
		return errorResult.fail("INTERNAL_ERROR", { correlationId });
	}
}
