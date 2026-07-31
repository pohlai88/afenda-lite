"use server";

import { authServer } from "@afenda/auth";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { http } from "@afenda/http";
import { logger } from "@afenda/logger";
import {
	MASTER_SEARCH_ENTITY_VALUES,
	type MasterSearchEntity,
	searchMasterDataDocuments,
} from "@afenda/master-data";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { parseSchema } from "@/modules/platform/schemas/common";

export interface SearchMasterDataHit {
	description: string | null;
	documentId: string;
	entity: string;
	score: number;
	title: string;
}

export interface SearchMasterDataActionData {
	hits: SearchMasterDataHit[];
}

const searchMasterDataQuerySchema = z.object({
	query: z.string().trim().min(1).max(500),
	entity: z.enum(MASTER_SEARCH_ENTITY_VALUES).optional(),
	limit: z.number().int().min(1).max(100).optional(),
});

/**
 * Read-only master-data FTS — never authorizes writes; never mutates masters.
 */
export async function searchMasterDataAction(
	input: unknown,
): Promise<ActionResult<SearchMasterDataActionData>> {
	const correlationId = http.correlation.create();
	const session = await authServer.session.get();

	const parsed = parseSchema(searchMasterDataQuerySchema, input);
	if (!parsed.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Enter a non-empty master-data search query.",
		});
	}

	const permissionDenied = await forbidUnlessPermission(
		session,
		"master_data.read",
	);
	if (permissionDenied) {
		return permissionDenied;
	}

	try {
		const result = await searchMasterDataDocuments(
			{
				organizationId: session.orgId,
				actorUserId: session.userId,
				query: parsed.data.query,
				entity: parsed.data.entity as MasterSearchEntity | undefined,
				limit: parsed.data.limit,
			},
			{ authorization: createMasterDataAuthorizationPort() },
		);
		const mapped = mapPackageResult(result);
		if (!mapped.ok) {
			return mapped;
		}
		return { ok: true, data: { hits: [...mapped.data] } };
	} catch {
		logger.event({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "searchMasterDataAction",
			code: "INTERNAL_ERROR",
		});
		return errorResult.fail("INTERNAL_ERROR", { correlationId });
	}
}
