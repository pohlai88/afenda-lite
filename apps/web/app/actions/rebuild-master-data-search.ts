"use server";

import { authServer } from "@afenda/auth";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { http } from "@afenda/http";
import { logger } from "@afenda/logger";
import {
	MASTER_SEARCH_ENTITY_VALUES,
	type RebuildMasterDataSearchResult,
	rebuildMasterDataSearchIndex,
} from "@afenda/master-data";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { parseSchema } from "@/modules/platform/schemas/common";

export type RebuildMasterDataSearchActionData = RebuildMasterDataSearchResult;

const rebuildFormSchema = z.object({
	entity: z.enum(MASTER_SEARCH_ENTITY_VALUES).optional(),
});

/**
 * Rebuild derived master-data search docs through package authorization.
 */
export async function rebuildMasterDataSearchAction(
	input?: unknown,
): Promise<ActionResult<RebuildMasterDataSearchActionData>> {
	const correlationId = http.correlation.create();
	const session = await authServer.session.get();

	const parsed = parseSchema(rebuildFormSchema, input ?? {});
	if (!parsed.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Enter a valid master-data search entity filter.",
		});
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
		logger.event({
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
