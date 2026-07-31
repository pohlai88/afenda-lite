import type { NeonOrgRole } from "./roles";

export interface NeonCreatedOrganization {
	id: string;
	name: string;
	slug: string;
}

export interface NeonMemberOrganization {
	id: string;
	slug: string;
}

export interface NeonOrgMember {
	email: string;
	name: string;
	role: NeonOrgRole;
	userId: string;
}

const NEON_ORG_ROLES = new Set<NeonOrgRole>(["owner", "admin", "member"]);

function isRecord(value: unknown): value is Record<PropertyKey, unknown> {
	return typeof value === "object" && value !== null;
}

function readString(value: unknown, key: PropertyKey): string {
	if (!isRecord(value)) {
		return "";
	}
	try {
		const property = Reflect.get(value, key);
		return typeof property === "string" ? property.trim() : "";
	} catch {
		return "";
	}
}

export function normalizeNeonEmail(value: unknown): string | null {
	if (typeof value !== "string") {
		return null;
	}
	const normalized = value.trim().toLowerCase();
	return normalized.length > 0 ? normalized : null;
}

export function probeNeonError(error: unknown): string {
	if (error instanceof Error && error.message.trim().length > 0) {
		return error.message.trim();
	}
	return readString(error, "message");
}

export function normalizeNeonInvitationId(data: unknown): string | null {
	if (!isRecord(data)) {
		return null;
	}
	const directId = readString(data, "id");
	if (directId.length > 0) {
		return directId;
	}
	const invitationId = readString(data, "invitationId");
	if (invitationId.length > 0) {
		return invitationId;
	}
	for (const key of ["invitation", "data"] as const) {
		const nested = Reflect.get(data, key);
		if (isRecord(nested)) {
			const normalized = normalizeNeonInvitationId(nested);
			if (normalized !== null) {
				return normalized;
			}
		}
	}
	return null;
}

export function normalizeNeonCreatedOrganization(
	data: unknown,
): NeonCreatedOrganization | null {
	if (!isRecord(data)) {
		return null;
	}
	const organization = Reflect.get(data, "organization");
	const nestedData = Reflect.get(data, "data");
	let candidate = data;
	if (isRecord(organization)) {
		candidate = organization;
	} else if (isRecord(nestedData)) {
		candidate = nestedData;
	}
	const id = readString(candidate, "id");
	const name = readString(candidate, "name");
	const slug = readString(candidate, "slug");
	return id && name && slug ? { id, name, slug } : null;
}

export function normalizeNeonMemberOrganizations(
	data: unknown,
): NeonMemberOrganization[] {
	if (!Array.isArray(data)) {
		return [];
	}
	const organizations: NeonMemberOrganization[] = [];
	for (const candidate of data) {
		const id = readString(candidate, "id");
		const slug = readString(candidate, "slug");
		if (id.length > 0 && slug.length > 0) {
			organizations.push({ id, slug });
		}
	}
	return organizations;
}

function normalizeNeonOrgRole(value: unknown): NeonOrgRole | null {
	return typeof value === "string" && NEON_ORG_ROLES.has(value as NeonOrgRole)
		? (value as NeonOrgRole)
		: null;
}

function normalizeNeonMember(row: unknown): NeonOrgMember | null {
	if (!isRecord(row)) {
		return null;
	}
	const userValue = Reflect.get(row, "user");
	const user = isRecord(userValue) ? userValue : null;
	const userId = readString(row, "userId") || readString(user, "id");
	const email =
		normalizeNeonEmail(user === null ? null : Reflect.get(user, "email")) ??
		normalizeNeonEmail(Reflect.get(row, "email"));
	const role = normalizeNeonOrgRole(Reflect.get(row, "role"));
	if (!userId || email === null || role === null) {
		return null;
	}
	const name = readString(user, "name") || readString(row, "name") || email;
	return { email, name, role, userId };
}

export function normalizeNeonOrgMembers(data: unknown): NeonOrgMember[] {
	const members = isRecord(data) ? Reflect.get(data, "members") : null;
	let rows: unknown[] = [];
	if (Array.isArray(data)) {
		rows = data;
	} else if (Array.isArray(members)) {
		rows = members;
	}
	const byUserId = new Map<string, NeonOrgMember>();
	for (const row of rows) {
		const member = normalizeNeonMember(row);
		if (member !== null) {
			byUserId.set(member.userId, member);
		}
	}
	return [...byUserId.values()];
}
