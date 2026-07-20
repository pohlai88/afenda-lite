"use server";

import { getSession } from "@afenda/auth";
import { createCorrelationId } from "@afenda/http";
import {
	MASTER_SEARCH_ENTITY_VALUES,
	type MasterSearchEntity,
	searchMasterDataDocuments,
} from "@afenda/master-data";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import { createMasterDataAuthorizationPort } from "@/lib/erp/master-data-authorization-port";
import { logProductEvent } from "@/modules/platform/observability/product-log";
import {
	type ActionResult,
	actionFail,
	actionFailInternal,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type SearchMasterDataHit = {
	documentId: string;
	entity: string;
	title: string;
	description: string | null;
	score: number;
};

export type SearchMasterDataActionData = {
	hits: SearchMasterDataHit[];
};

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
	const correlationId = createCorrelationId();
	const session = await getSession();

	const parsed = parseSchema(searchMasterDataQuerySchema, input);
	if (!parsed.success) {
		return actionFail(
			"VALIDATION_ERROR",
			"Enter a non-empty master-data search query.",
			parsed.details,
		);
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
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "searchMasterDataAction",
			code: "INTERNAL_ERROR",
		});
		return actionFailInternal(
			"Could not search master data. Try again or contact an admin.",
			correlationId,
		);
	}
}
