import { getNeonAuth } from "./neon-auth";
import type { NeonOrgRole } from "./roles";
import { getSession } from "./session";

const PAGE_SIZE = 100;
const MAX_PAGES = 50;

/** Minimal org member row — never expose Neon Auth response envelopes. */
export type OrgMember = {
	userId: string;
	email: string;
	name: string;
	role: NeonOrgRole;
};

const NEON_ORG_ROLES = new Set<NeonOrgRole>(["owner", "admin", "member"]);

function isNeonOrgRole(value: unknown): value is NeonOrgRole {
	return typeof value === "string" && NEON_ORG_ROLES.has(value as NeonOrgRole);
}

function normalizeEmail(email: unknown): string | null {
	if (typeof email !== "string") {
		return null;
	}
	const normalized = email.trim().toLowerCase();
	return normalized.length > 0 ? normalized : null;
}

function normalizeName(name: unknown, email: string): string {
	if (typeof name === "string") {
		const trimmed = name.trim();
		if (trimmed.length > 0) {
			return trimmed;
		}
	}
	return email;
}

function memberFromUnknown(row: unknown): OrgMember | null {
	if (typeof row !== "object" || row === null) {
		return null;
	}

	const record = row as Record<string, unknown>;
	const user =
		typeof record.user === "object" && record.user !== null
			? (record.user as Record<string, unknown>)
			: null;

	const userId =
		(typeof record.userId === "string" && record.userId.trim()) ||
		(user && typeof user.id === "string" && user.id.trim()) ||
		null;

	if (!userId) {
		return null;
	}

	const email =
		normalizeEmail(user?.email) ??
		normalizeEmail(record.email) ??
		null;
	if (!email) {
		return null;
	}

	if (!isNeonOrgRole(record.role)) {
		return null;
	}

	return {
		userId,
		email,
		name: normalizeName(user?.name ?? record.name, email),
		role: record.role,
	};
}

/**
 * Normalize Neon `organization.listMembers` payload into minimal member rows.
 * Accepts `{ members: [...] }` envelopes or raw arrays. Invalid rows are dropped.
 */
export function normalizeOrgMembers(data: unknown): OrgMember[] {
	const rows = Array.isArray(data)
		? data
		: typeof data === "object" &&
				data !== null &&
				"members" in data &&
				Array.isArray((data as { members: unknown }).members)
			? (data as { members: unknown[] }).members
			: null;

	if (!rows) {
		return [];
	}

	const byUserId = new Map<string, OrgMember>();
	for (const row of rows) {
		const member = memberFromUnknown(row);
		if (member) {
			byUserId.set(member.userId, member);
		}
	}
	return [...byUserId.values()];
}

function assertActiveSessionOrg(organizationId: string, sessionOrgId: string) {
	if (sessionOrgId !== organizationId) {
		throw new Error(
			"@afenda/auth: listOrgMembers refuses organization other than the active session org",
		);
	}
}

async function fetchOrgMemberPage(
	organizationId: string,
	offset: number,
): Promise<{ members: OrgMember[]; total: number | null }> {
	const auth = getNeonAuth();
	const { data, error } = await auth.organization.listMembers({
		query: {
			organizationId,
			limit: PAGE_SIZE,
			offset,
		},
	});

	if (error) {
		throw new Error("@afenda/auth: organization listMembers failed");
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
	let offset = 0;

	for (let page = 0; page < MAX_PAGES; page += 1) {
		const { members, total } = await fetchOrgMemberPage(
			organizationId,
			offset,
		);

		for (const member of members) {
			byUserId.set(member.userId, member);
		}

		offset += PAGE_SIZE;
		const exhaustedByCount = members.length < PAGE_SIZE;
		const exhaustedByTotal = total !== null && byUserId.size >= total;
		if (exhaustedByCount || exhaustedByTotal || members.length === 0) {
			break;
		}
	}

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
			organizationId,
			limit: PAGE_SIZE,
			offset: 0,
			filterField: "userId",
			filterValue: trimmedUserId,
			filterOperator: "eq",
		},
	});

	if (error) {
		throw new Error("@afenda/auth: organization listMembers failed");
	}

	const members = normalizeOrgMembers(data);
	return members.find((member) => member.userId === trimmedUserId) ?? null;
}
