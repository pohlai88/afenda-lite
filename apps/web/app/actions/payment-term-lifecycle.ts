import { requireRole } from "@afenda/auth";
import type { Result } from "@afenda/errors/result";
import { createCorrelationId } from "@afenda/http";
import type { PaymentTerm } from "@afenda/master-data";
import {
	activatePaymentTerm,
	inactivePaymentTerm,
	retirePaymentTerm,
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

export type PaymentTermLifecycleActionData = {
	paymentTerm: PaymentTerm;
};

export type PaymentTermLifecycleActionState =
	ActionResult<PaymentTermLifecycleActionData> | null;

const paymentTermLifecycleFormSchema = z.object({
	paymentTermId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
});

type PaymentTermLifecycleCommand = (
	input: unknown,
) => Promise<Result<PaymentTerm>>;

const LIFECYCLE_COMMANDS = {
	activate: activatePaymentTerm,
	inactive: inactivePaymentTerm,
	retire: retirePaymentTerm,
} as const satisfies Record<string, PaymentTermLifecycleCommand>;

export type PaymentTermLifecycleKind = keyof typeof LIFECYCLE_COMMANDS;

/**
 * Shared payment-term lifecycle Action runner — CAS + `master_data.manage`.
 * Called from thin `"use server"` Action entrypoints (not a Server Action itself).
 */
export async function runPaymentTermLifecycle(
	kind: PaymentTermLifecycleKind,
	formData: FormData,
): Promise<PaymentTermLifecycleActionState> {
	const correlationId = createCorrelationId();
	const session = await requireRole("operator");

	const parsed = parseSchema(paymentTermLifecycleFormSchema, {
		paymentTermId: formData.get("paymentTermId"),
		expectedVersion: formData.get("expectedVersion"),
	});
	if (!parsed.success) {
		return actionFail(
			"VALIDATION_ERROR",
			"Provide a valid payment term id and expected version.",
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

	const command = LIFECYCLE_COMMANDS[kind];
	const actionPath = `${kind}PaymentTermAction`;

	try {
		const result = await command(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
				id: parsed.data.paymentTermId,
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
		return { ok: true, data: { paymentTerm: mapped.data } };
	} catch {
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: actionPath,
			code: "INTERNAL_ERROR",
		});
		return actionFailInternal(
			`Could not ${kind} payment term. Try again or contact an admin.`,
			correlationId,
		);
	}
}
