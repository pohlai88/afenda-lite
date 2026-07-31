import { authServer } from "@afenda/auth";
import {
	type Result as ActionResult,
	errorResult,
	type Result,
} from "@afenda/errors";
import { http } from "@afenda/http";
import { logger } from "@afenda/logger";
import type { PaymentTerm } from "@afenda/master-data";
import {
	activatePaymentTerm,
	inactivePaymentTerm,
	retirePaymentTerm,
} from "@afenda/master-data";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";

import { parseSchema } from "@/modules/platform/schemas/common";

export interface PaymentTermLifecycleActionData {
	paymentTerm: PaymentTerm;
}

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
 * Shared payment-term lifecycle Action runner — package-authorized CAS.
 * Called from thin `"use server"` Action entrypoints (not a Server Action itself).
 */
export async function runPaymentTermLifecycle(
	kind: PaymentTermLifecycleKind,
	formData: FormData,
): Promise<PaymentTermLifecycleActionState> {
	const correlationId = http.correlation.create();
	const session = await authServer.session.get();

	const parsed = parseSchema(paymentTermLifecycleFormSchema, {
		paymentTermId: formData.get("paymentTermId"),
		expectedVersion: formData.get("expectedVersion"),
	});
	if (!parsed.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Provide a valid payment term id and expected version.",
		});
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
		logger.event({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: actionPath,
			code: "INTERNAL_ERROR",
		});
		return errorResult.fail("INTERNAL_ERROR", { correlationId });
	}
}
