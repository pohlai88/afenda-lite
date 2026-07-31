"use server";

import { authServer } from "@afenda/auth";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { http } from "@afenda/http";
import { logger } from "@afenda/logger";
import {
	listTaxRegistrations,
	type TaxRegistrationProjection,
} from "@afenda/master-data";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";

export interface ListTaxRegistrationsActionData {
	taxRegistrations: TaxRegistrationProjection[];
}

/**
 * Master-data tax registration list — session org stamp + `master_data.read`.
 */
export async function listTaxRegistrationsAction(input?: {
	page?: number;
	pageSize?: number;
	status?: TaxRegistrationProjection["status"];
	partyId?: string;
}): Promise<ActionResult<ListTaxRegistrationsActionData>> {
	const correlationId = http.correlation.create();
	const session = await authServer.session.get();

	const permissionDenied = await forbidUnlessPermission(
		session,
		"master_data.read",
	);
	if (permissionDenied) {
		return permissionDenied;
	}

	try {
		const result = await listTaxRegistrations(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				page: input?.page,
				pageSize: input?.pageSize,
				status: input?.status,
				partyId: input?.partyId,
			},
			{ authorization: createMasterDataAuthorizationPort() },
		);
		const mapped = mapPackageResult(result);
		if (!mapped.ok) {
			return mapped;
		}
		return { ok: true, data: { taxRegistrations: mapped.data } };
	} catch {
		logger.event({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "listTaxRegistrationsAction",
			code: "INTERNAL_ERROR",
		});
		return errorResult.fail("INTERNAL_ERROR", { correlationId });
	}
}
