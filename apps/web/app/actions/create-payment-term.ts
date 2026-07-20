"use server";

import { createPaymentTerm, type PaymentTerm } from "@afenda/master-data";
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

	return runMemberPermissionAction({
		path: "createPaymentTermAction",
		permission: "master_data.manage",
		safeMessage:
			"Could not create payment term. Try again or contact an admin.",
		execute: async (session, correlationId) => {
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
		},
	});
}
