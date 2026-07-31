import { errorIngress } from "@afenda/errors";

import { getNeonAuth } from "./neon-auth";
import {
	type NeonOrgMember,
	normalizeNeonOrgMembers,
} from "./neon-normalization";
import { getSession } from "./session";

const PAGE_SIZE = 100;
const MAX_PAGES = 50;

/** Minimal org member row — never expose Neon Auth response envelopes. */
export type OrgMember = NeonOrgMember;

/**
 * Normalize Neon `organization.listMembers` payload into minimal member rows.
 * Accepts `{ members: [...] }` envelopes or raw arrays. Invalid rows are dropped.
 */
export function normalizeOrgMembers(data: unknown): OrgMember[] {
	return normalizeNeonOrgMembers(data);
}

function assertActiveSessionOrg(organizationId: string, sessionOrgId: string) {
	if (sessionOrgId !== organizationId) {
		throw errorIngress.code("FORBIDDEN", {
			operation: "auth.organization-members",
		});
	}
}

async function fetchOrgMemberPage(
	organizationId: string,
	offset: number,
): Promise<{ members: OrgMember[]; total: number | null }> {
	const auth = getNeonAuth();
	const { data, error } = await auth.organization.listMembers({
		query: {
			limit: PAGE_SIZE,
			offset,
			organizationId,
		},
	});

	if (error) {
		throw errorIngress.code("SERVICE_UNAVAILABLE", {
			operation: "auth.organization-members",
		});
	}

	const members = normalizeOrgMembers(data);
	const total =
		typeof data === "object" &&
		data !== null &&
		"total" in data &&
		typeof (data as { total: unknown }).total === "number"
			? (data as { total: number }).total
			: null;

	return { members, total };
}

async function collectOrgMemberPages(
	organizationId: string,
	byUserId: Map<string, OrgMember>,
	offset = 0,
	page = 0,
): Promise<void> {
	if (page >= MAX_PAGES) {
		return;
	}

	const { members, total } = await fetchOrgMemberPage(organizationId, offset);
	for (const member of members) {
		byUserId.set(member.userId, member);
	}

	const exhaustedByCount = members.length < PAGE_SIZE;
	const exhaustedByTotal = total !== null && byUserId.size >= total;
	if (exhaustedByCount || exhaustedByTotal || members.length === 0) {
		return;
	}

	return collectOrgMemberPages(
		organizationId,
		byUserId,
		offset + PAGE_SIZE,
		page + 1,
	);
}

/**
 * List active Neon Auth organization members for the session org.
 * Paginates until exhausted. Caller must pass the active session org.
 */
export async function listOrgMembers(
	organizationId: string,
): Promise<OrgMember[]> {
	const session = await getSession();
	assertActiveSessionOrg(organizationId, session.orgId);

	const byUserId = new Map<string, OrgMember>();
	await collectOrgMemberPages(organizationId, byUserId);

	return [...byUserId.values()];
}

/**
 * Exact membership lookup for the session org. Returns null when the user
 * is not a member of `organizationId`.
 */
export async function findOrgMember(
	organizationId: string,
	userId: string,
): Promise<OrgMember | null> {
	const trimmedUserId = userId.trim();
	if (trimmedUserId.length === 0) {
		return null;
	}

	const session = await getSession();
	assertActiveSessionOrg(organizationId, session.orgId);

	const auth = getNeonAuth();
	const { data, error } = await auth.organization.listMembers({
		query: {
			filterField: "userId",
			filterOperator: "eq",
			filterValue: trimmedUserId,
			limit: PAGE_SIZE,
			offset: 0,
			organizationId,
		},
	});

	if (error) {
		throw errorIngress.code("SERVICE_UNAVAILABLE", {
			operation: "auth.organization-members",
		});
	}

	const members = normalizeOrgMembers(data);
	return members.find((member) => member.userId === trimmedUserId) ?? null;
}
