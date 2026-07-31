"use server";

import { getSession } from "@afenda/auth";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { createCorrelationId } from "@afenda/http";
import {
	createParty,
	type DuplicatePartyWarning,
	findPartyDuplicateWarnings,
	PARTY_KINDS,
	type Party,
} from "@afenda/master-data";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { logProductEvent } from "@/modules/platform/observability/product-log";
import { parseSchema } from "@/modules/platform/schemas/common";

export interface CreatePartyActionData {
	duplicateWarnings: DuplicatePartyWarning[];
	party: Party;
}

/** `null` = form idle (`useActionState`); otherwise API-002 `ActionResult`. */
export type CreatePartyActionState = ActionResult<CreatePartyActionData> | null;

const createPartyFormSchema = z.object({
	code: z.string().trim().min(1).max(64),
	name: z.string().trim().min(1).max(200),
	partyKind: z.enum(PARTY_KINDS),
});

/**
 * Master-data party create — session org/actor stamp + `master_data.manage`.
 * Package owns Zod domain validation; Action stamps tenancy only.
 */
export async function createPartyAction(
	_prev: CreatePartyActionState,
	formData: FormData,
): Promise<CreatePartyActionState> {
	const correlationId = createCorrelationId();
	const session = await getSession();

	const parsed = parseSchema(createPartyFormSchema, {
		code: formData.get("code"),
		name: formData.get("name"),
		partyKind: formData.get("partyKind"),
	});
	if (!parsed.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Enter a valid party code, name, and kind.",
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
		const warningsResult = await findPartyDuplicateWarnings(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				name: parsed.data.name,
			},
			{ authorization: createMasterDataAuthorizationPort() },
		);
		const duplicateWarnings = warningsResult.ok ? warningsResult.data : [];

		const result = await createParty(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
				code: parsed.data.code,
				name: parsed.data.name,
				partyKind: parsed.data.partyKind,
			},
			{ authorization: createMasterDataAuthorizationPort() },
		);
		const mapped = mapPackageResult(result);
		if (!mapped.ok) {
			return mapped;
		}
		revalidatePath("/admin/master-data");
		revalidatePath("/client/master-data");
		return {
			ok: true,
			data: { party: mapped.data, duplicateWarnings },
		};
	} catch {
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "createPartyAction",
			code: "INTERNAL_ERROR",
		});
		return errorResult.fail("INTERNAL_ERROR", { correlationId });
	}
}
