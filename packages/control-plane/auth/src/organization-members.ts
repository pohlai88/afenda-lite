import { forbidden, serviceUnavailable } from "@afenda/errors";

import { getNeonAuth } from "./neon-auth";
import type { NeonOrgRole } from "./roles";
import { getSession } from "./session";

const PAGE_SIZE = 100;
const MAX_PAGES = 50;

/** Minimal org member row — never expose Neon Auth response envelopes. */
export interface OrgMember {
	email: string;
	name: string;
	role: NeonOrgRole;
	userId: string;
}

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
		normalizeEmail(user?.email) ?? normalizeEmail(record.email) ?? null;
	if (!email) {
		return null;
	}

	if (!isNeonOrgRole(record.role)) {
		return null;
	}

	return {
		email,
		name: normalizeName(user?.name ?? record.name, email),
		role: record.role,
		userId,
	};
}

/**
 * Normalize Neon `organization.listMembers` payload into minimal member rows.
 * Accepts `{ members: [...] }` envelopes or raw arrays. Invalid rows are dropped.
 */
export function normalizeOrgMembers(data: unknown): OrgMember[] {
	let rows: unknown[] | null = null;
	if (Array.isArray(data)) {
		rows = data;
	} else if (
		typeof data === "object" &&
		data !== null &&
		"members" in data &&
		Array.isArray((data as { members: unknown }).members)
	) {
		rows = (data as { members: unknown[] }).members;
	}

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
		throw forbidden("Organization is not in the active session");
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
		throw serviceUnavailable("neon-auth");
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
		throw serviceUnavailable("neon-auth");
	}

	const members = normalizeOrgMembers(data);
	return members.find((member) => member.userId === trimmedUserId) ?? null;
}
