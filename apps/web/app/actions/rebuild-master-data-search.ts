"use server";

import { getSession } from "@afenda/auth";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { createCorrelationId } from "@afenda/http";
import {
	MASTER_SEARCH_ENTITY_VALUES,
	type RebuildMasterDataSearchResult,
	rebuildMasterDataSearchIndex,
} from "@afenda/master-data";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { logProductEvent } from "@/modules/platform/observability/product-log";
import { parseSchema } from "@/modules/platform/schemas/common";

export type RebuildMasterDataSearchActionData = RebuildMasterDataSearchResult;

const rebuildFormSchema = z.object({
	entity: z.enum(MASTER_SEARCH_ENTITY_VALUES).optional(),
});

/**
 * Rebuild derived master-data search docs from SSOT — `master_data.manage`.
 */
export async function rebuildMasterDataSearchAction(
	input?: unknown,
): Promise<ActionResult<RebuildMasterDataSearchActionData>> {
	const correlationId = createCorrelationId();
	const session = await getSession();

	const parsed = parseSchema(rebuildFormSchema, input ?? {});
	if (!parsed.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Enter a valid master-data search entity filter.",
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
		const result = await rebuildMasterDataSearchIndex(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				entity: parsed.data.entity,
			},
			{ authorization: createMasterDataAuthorizationPort() },
		);
		return mapPackageResult(result);
	} catch {
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "rebuildMasterDataSearchAction",
			code: "INTERNAL_ERROR",
		});
		return errorResult.fail("INTERNAL_ERROR", { correlationId });
	}
}
