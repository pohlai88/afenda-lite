"use server";

import { requireRole } from "@afenda/auth";
import { createCorrelationId } from "@afenda/http";
import { listPaymentTerms, type PaymentTerm } from "@afenda/master-data";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { logProductEvent } from "@/modules/platform/observability/product-log";
import {
	type ActionResult,
	actionFailInternal,
} from "@/modules/platform/schemas/action-result";

export type ListPaymentTermsActionData = {
	paymentTerms: PaymentTerm[];
};

/**
 * Master-data payment term list — session org stamp + `master_data.read`.
 */
export async function listPaymentTermsAction(input?: {
	page?: number;
	pageSize?: number;
	status?: PaymentTerm["status"];
}): Promise<ActionResult<ListPaymentTermsActionData>> {
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
		const result = await listPaymentTerms(
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
		return { ok: true, data: { paymentTerms: mapped.data } };
	} catch {
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "listPaymentTermsAction",
			code: "INTERNAL_ERROR",
		});
		return actionFailInternal(
			"Could not list payment terms. Try again or contact an admin.",
			correlationId,
		);
	}
}
