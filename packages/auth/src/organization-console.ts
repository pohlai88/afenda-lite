import { getNeonAuth } from "./neon-auth";
import {
	type MemberOrganization,
	normalizeMemberOrganizations,
	persistActiveOrganization as persistActiveOrganizationWithClient,
} from "./organization-membership";

export type { MemberOrganization };

export type CreateOrganizationInput = {
	name: string;
	slug: string;
};

export type CreatedOrganization = {
	id: string;
	slug: string;
	name: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function neonErrorMessage(error: unknown, fallback: string): string {
	if (
		isRecord(error) &&
		typeof error.message === "string" &&
		error.message.trim().length > 0
	) {
		return error.message.trim();
	}
	return fallback;
}

/**
 * Pull `{ id, slug, name }` from Neon `organization.create` JSON without inventing ids.
 */
export function parseCreatedOrganization(
	data: unknown,
): CreatedOrganization | null {
	if (!isRecord(data)) {
		return null;
	}

	const nestedCandidate = isRecord(data.organization)
		? data.organization
		: isRecord(data.data)
			? data.data
			: data;

	if (
		typeof nestedCandidate.id !== "string" ||
		nestedCandidate.id.trim().length === 0 ||
		typeof nestedCandidate.slug !== "string" ||
		nestedCandidate.slug.trim().length === 0 ||
		typeof nestedCandidate.name !== "string" ||
		nestedCandidate.name.trim().length === 0
	) {
		return null;
	}

	return {
		id: nestedCandidate.id.trim(),
		slug: nestedCandidate.slug.trim(),
		name: nestedCandidate.name.trim(),
	};
}

/**
 * List organizations for the active Neon Auth session.
 * Neon Auth SDK ownership stays in this package.
 */
export async function listMemberOrganizations(): Promise<MemberOrganization[]> {
	const auth = getNeonAuth();
	const { data, error } = await auth.organization.list();
	if (error) {
		throw new Error(
			`@afenda/auth: ${neonErrorMessage(error, "organization list failed")}`,
		);
	}
	return normalizeMemberOrganizations(data);
}

/**
 * Create an organization via Neon Auth for the active session user.
 * Caller supplies name + slug; Neon returns the organization id.
 */
export async function createOrganization(
	input: CreateOrganizationInput,
): Promise<CreatedOrganization> {
	const name = input.name.trim();
	const slug = input.slug.trim();
	if (name.length === 0) {
		throw new Error(
			"@afenda/auth: createOrganization requires a non-empty name",
		);
	}
	if (slug.length === 0) {
		throw new Error(
			"@afenda/auth: createOrganization requires a non-empty slug",
		);
	}

	const auth = getNeonAuth();
	const { data, error } = await auth.organization.create({ name, slug });
	if (error) {
		throw new Error(
			`@afenda/auth: ${neonErrorMessage(error, "organization create failed")}`,
		);
	}

	const created = parseCreatedOrganization(data);
	if (!created) {
		throw new Error(
			"@afenda/auth: organization create returned no usable organization id",
		);
	}
	return created;
}

/**
 * Persist `session.activeOrganizationId` for the current Neon Auth session.
 * Cookie writes — call only from a Route Handler or Server Action, never RSC.
 * Wraps Neon `organization.setActive` without exposing the Auth client.
 */
export async function persistActiveOrganization(
	organizationId: string,
): Promise<void> {
	const trimmed = organizationId.trim();
	if (trimmed.length === 0) {
		throw new Error(
			"@afenda/auth: persistActiveOrganization requires a non-empty organizationId",
		);
	}

	const auth = getNeonAuth();
	const persisted = await persistActiveOrganizationWithClient(auth, trimmed);
	if (!persisted) {
		throw new Error(
			"@afenda/auth: failed to persist active organization on session",
		);
	}
}

/**
 * Hard-delete an organization via Neon Auth (`organization.delete`).
 * Removes members and invitations for that org — not a local soft-active flag.
 * Caller must already be permitted (Neon enforces owner/delete capability).
 */
export async function deleteOrganization(
	organizationId: string,
): Promise<void> {
	const trimmed = organizationId.trim();
	if (trimmed.length === 0) {
		throw new Error(
			"@afenda/auth: deleteOrganization requires a non-empty organizationId",
		);
	}

	const auth = getNeonAuth();
	const memberships = await listMemberOrganizations();
	const isMember = memberships.some((row) => row.id === trimmed);
	if (!isMember) {
		throw new Error(
			"@afenda/auth: deleteOrganization refuses organization outside session memberships",
		);
	}

	const { error } = await auth.organization.delete({
		organizationId: trimmed,
	});
	if (error) {
		throw new Error(
			`@afenda/auth: ${neonErrorMessage(error, "organization delete failed")}`,
		);
	}
}
