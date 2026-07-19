"use server";

import { requireRole } from "@afenda/auth";
import { createCorrelationId } from "@afenda/http";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import {
	type OrganizationMemberSearchHit,
	searchOrganizationMembers,
} from "@/modules/identity/domain/organization-member-search";
import { searchOrgMembersQuerySchema } from "@/modules/identity/schemas/search-org-members";
import { logProductEvent } from "@/modules/platform/observability/product-log";
import {
	type ActionResult,
	actionFail,
	actionFailInternal,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type SearchOrgMembersActionData = {
	members: OrganizationMemberSearchHit[];
};

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
		return actionFail(
			"VALIDATION_ERROR",
			"Enter a non-empty search query.",
			parsed.details,
		);
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
		return actionFailInternal(
			"Could not search organization members. Try again or contact an admin.",
			correlationId,
		);
	}
}
