"use server";

import { getSession } from "@afenda/auth";
import { createCorrelationId } from "@afenda/http";
import { listWarehouses, type Warehouse } from "@afenda/master-data";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { logProductEvent } from "@/modules/platform/observability/product-log";
import {
	type ActionResult,
	actionFailInternal,
} from "@/modules/platform/schemas/action-result";

export type ListWarehousesActionData = {
	warehouses: Warehouse[];
};

/**
 * Master-data warehouse list — session org stamp + `master_data.read`.
 */
export async function listWarehousesAction(input?: {
	page?: number;
	pageSize?: number;
	status?: Warehouse["status"];
}): Promise<ActionResult<ListWarehousesActionData>> {
	const correlationId = createCorrelationId();
	const session = await getSession();

	const permissionDenied = await forbidUnlessPermission(
		session,
		"master_data.read",
	);
	if (permissionDenied) {
		return permissionDenied;
	}

	try {
		const result = await listWarehouses(
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
		return { ok: true, data: { warehouses: mapped.data } };
	} catch {
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "listWarehousesAction",
			code: "INTERNAL_ERROR",
		});
		return actionFailInternal(
			"Could not list warehouses. Try again or contact an admin.",
			correlationId,
		);
	}
}
