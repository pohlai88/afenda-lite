"use server";

import { requireRole } from "@afenda/auth";
import { createCorrelationId } from "@afenda/http";
import { type ItemTemplate, listItemTemplates } from "@afenda/master-data";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { logProductEvent } from "@/modules/platform/observability/product-log";
import {
	type ActionResult,
	actionFailInternal,
} from "@/modules/platform/schemas/action-result";

export type ListItemTemplatesActionData = {
	templates: ItemTemplate[];
};

/** List item templates — `master_data.read`. */
export async function listItemTemplatesAction(): Promise<
	ActionResult<ListItemTemplatesActionData>
> {
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
		const result = await listItemTemplates(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				pageSize: 50,
			},
			{ authorization: createMasterDataAuthorizationPort() },
		);
		const mapped = mapPackageResult(result);
		if (!mapped.ok) {
			return mapped;
		}
		return { ok: true, data: { templates: mapped.data } };
	} catch {
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "listItemTemplatesAction",
			code: "INTERNAL_ERROR",
		});
		return actionFailInternal(
			"Could not list item templates. Try again or contact an admin.",
			correlationId,
		);
	}
}
