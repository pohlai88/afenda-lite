"use server";

import { requireRole } from "@afenda/auth";
import { createCorrelationId } from "@afenda/http";
import { listParties, type Party } from "@afenda/master-data";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { logProductEvent } from "@/modules/platform/observability/product-log";
import {
	type ActionResult,
	actionFailInternal,
} from "@/modules/platform/schemas/action-result";

export type ListPartiesActionData = {
	parties: Party[];
};

/**
 * Master-data party list — session org stamp + `master_data.read`.
 * Thin adapter; no SQL in the Action.
 */
export async function listPartiesAction(input?: {
	page?: number;
	pageSize?: number;
	status?: Party["status"];
}): Promise<ActionResult<ListPartiesActionData>> {
	const correlationId = createCorrelationId();
	const session = await requireRole("operator");

	const permissionDenied = await forbidUnlessPermission(
		session,
		"master_data.read",
	);
	if (permissionDenied) {
		return permissionDenied;
	}

	try {
		const result = await listParties(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				page: input?.page,
				pageSize: input?.pageSize,
				status: input?.status,
			},
			{ authorization: createMasterDataAuthorizationPort() },
		);
		const mapped = mapPackageResult(result);
		if (!mapped.ok) {
			return mapped;
		}
		return { ok: true, data: { parties: mapped.data } };
	} catch {
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "listPartiesAction",
			code: "INTERNAL_ERROR",
		});
		return actionFailInternal(
			"Could not list parties. Try again or contact an admin.",
			correlationId,
		);
	}
}
