"use server";

import { requireRole } from "@afenda/auth";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { createCorrelationId } from "@afenda/http";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import {
	type OrganizationMemberSearchHit,
	searchOrganizationMembers,
} from "@/modules/identity/domain/organization-member-search";
import { searchOrgMembersQuerySchema } from "@/modules/identity/schemas/search-org-members";
import { logProductEvent } from "@/modules/platform/observability/product-log";
import { parseSchema } from "@/modules/platform/schemas/common";

export interface SearchOrgMembersActionData {
	members: OrganizationMemberSearchHit[];
}

/**
 * Operator member FTS — coarse `requireRole('operator')` + Tier-2
 * `org.roles.manage`. Always scopes to `session.orgId`.
 */
export async function searchOrgMembersAction(
	input: unknown,
): Promise<ActionResult<SearchOrgMembersActionData>> {
	const correlationId = createCorrelationId();
	const session = await requireRole("operator");

	const parsed = parseSchema(searchOrgMembersQuerySchema, input);
	if (!parsed.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Enter a non-empty search query.",
		});
	}

	const permissionDenied = await forbidUnlessPermission(
		session,
		"org.roles.manage",
	);
	if (permissionDenied) {
		return permissionDenied;
	}

	try {
		const result = await searchOrganizationMembers(
			session.orgId,
			parsed.data.query,
			parsed.data.limit,
		);
		const mapped = mapPackageResult(result);
		if (!mapped.ok) {
			return mapped;
		}
		return { ok: true, data: { members: mapped.data } };
	} catch {
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "searchOrgMembersAction",
			code: "INTERNAL_ERROR",
		});
		return errorResult.fail("INTERNAL_ERROR", { correlationId });
	}
}
