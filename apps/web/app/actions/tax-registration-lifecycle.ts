import { getSession } from "@afenda/auth";
import {
	type Result as ActionResult,
	errorResult,
	type Result,
} from "@afenda/errors";
import { createCorrelationId } from "@afenda/http";
import type { TaxRegistrationProjection } from "@afenda/master-data";
import {
	activateTaxRegistration,
	blockTaxRegistration,
	restoreTaxRegistration,
	retireTaxRegistration,
} from "@afenda/master-data";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { logProductEvent } from "@/modules/platform/observability/product-log";

import { parseSchema } from "@/modules/platform/schemas/common";

export interface TaxRegistrationLifecycleActionData {
	taxRegistration: TaxRegistrationProjection;
}

export type TaxRegistrationLifecycleActionState =
	ActionResult<TaxRegistrationLifecycleActionData> | null;

const taxRegistrationLifecycleFormSchema = z.object({
	taxRegistrationId: z.string().uuid(),
	expectedVersion: z.coerce.number().int().positive(),
});

type TaxRegistrationLifecycleCommand = (
	input: unknown,
) => Promise<Result<TaxRegistrationProjection>>;

const LIFECYCLE_COMMANDS = {
	activate: activateTaxRegistration,
	block: blockTaxRegistration,
	retire: retireTaxRegistration,
	restore: restoreTaxRegistration,
} as const satisfies Record<string, TaxRegistrationLifecycleCommand>;

export type TaxRegistrationLifecycleKind = keyof typeof LIFECYCLE_COMMANDS;

/**
 * Shared tax-registration lifecycle Action runner — CAS + `master_data.manage`.
 * Called from thin `"use server"` Action entrypoints (not a Server Action itself).
 */
export async function runTaxRegistrationLifecycle(
	kind: TaxRegistrationLifecycleKind,
	formData: FormData,
): Promise<TaxRegistrationLifecycleActionState> {
	const correlationId = createCorrelationId();
	const session = await getSession();

	const parsed = parseSchema(taxRegistrationLifecycleFormSchema, {
		taxRegistrationId: formData.get("taxRegistrationId"),
		expectedVersion: formData.get("expectedVersion"),
	});
	if (!parsed.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage:
				"Provide a valid tax registration id and expected version.",
		});
	}

	const permissionDenied = await forbidUnlessPermission(
		session,
		"master_data.manage",
	);
	if (permissionDenied) {
		return permissionDenied;
	}

	const command = LIFECYCLE_COMMANDS[kind];
	const actionPath = `${kind}TaxRegistrationAction`;

	try {
		const result = await command(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
				id: parsed.data.taxRegistrationId,
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
		return { ok: true, data: { taxRegistration: mapped.data } };
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
		return errorResult.fail("INTERNAL_ERROR", { correlationId });
	}
}
