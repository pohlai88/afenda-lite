"use server";

import { requireRole } from "@afenda/auth";
import { createCorrelationId } from "@afenda/http";
import { createPaymentTerm, type PaymentTerm } from "@afenda/master-data";
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

export type CreatePaymentTermActionData = {
	paymentTerm: PaymentTerm;
};

/** `null` = form idle (`useActionState`); otherwise API-002 `ActionResult`. */
export type CreatePaymentTermActionState =
	ActionResult<CreatePaymentTermActionData> | null;

const createPaymentTermFormSchema = z.object({
	code: z.string().trim().min(1).max(64),
	name: z.string().trim().min(1).max(200),
	netDays: z.coerce.number().int().min(0),
});

/**
 * Master-data payment term create — session org/actor stamp + `master_data.manage`.
 */
export async function createPaymentTermAction(
	_prev: CreatePaymentTermActionState,
	formData: FormData,
): Promise<CreatePaymentTermActionState> {
	const correlationId = createCorrelationId();
	const session = await requireRole("operator");

	const parsed = parseSchema(createPaymentTermFormSchema, {
		code: formData.get("code"),
		name: formData.get("name"),
		netDays: formData.get("netDays"),
	});
	if (!parsed.success) {
		return actionFail(
			"VALIDATION_ERROR",
			"Enter a valid payment term code, name, and net days.",
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
		const result = await createPaymentTerm(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
				code: parsed.data.code,
				name: parsed.data.name,
				netDays: parsed.data.netDays,
			},
			{ authorization: createMasterDataAuthorizationPort() },
		);
		const mapped = mapPackageResult(result);
		if (!mapped.ok) {
			return mapped;
		}
		revalidatePath("/admin/master-data");
		revalidatePath("/client/master-data");
		return { ok: true, data: { paymentTerm: mapped.data } };
	} catch {
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "createPaymentTermAction",
			code: "INTERNAL_ERROR",
		});
		return actionFailInternal(
			"Could not create payment term. Try again or contact an admin.",
			correlationId,
		);
	}
}
