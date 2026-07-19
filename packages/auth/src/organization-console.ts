import { fail, ok, type Result } from "@afenda/errors/result";

import { failFromNeonOrgProbe } from "./auth-failure";
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
 * Returns `@afenda/errors` `Result` — web/admin map to `ActionResult` / product copy.
 */
export async function listMemberOrganizations(): Promise<
	Result<MemberOrganization[]>
> {
	const auth = getNeonAuth();
	const { data, error } = await auth.organization.list();
	if (error) {
		return failFromNeonOrgProbe(error, "Failed to list organizations");
	}
	return ok(normalizeMemberOrganizations(data));
}

/**
 * Create an organization via Neon Auth for the active session user.
 * Caller supplies name + slug; Neon returns the organization id.
 */
export async function createOrganization(
	input: CreateOrganizationInput,
): Promise<Result<CreatedOrganization>> {
	const name = input.name.trim();
	const slug = input.slug.trim();
	if (name.length === 0) {
		return fail("BAD_REQUEST", "Organization name is required");
	}
	if (slug.length === 0) {
		return fail("BAD_REQUEST", "Organization slug is required");
	}

	const auth = getNeonAuth();
	const { data, error } = await auth.organization.create({ name, slug });
	if (error) {
		return failFromNeonOrgProbe(error, "Failed to create organization");
	}

	const created = parseCreatedOrganization(data);
	if (!created) {
		return fail(
			"INTERNAL_ERROR",
			"Organization create returned no usable organization id",
		);
	}
	return ok(created);
}

/**
 * Persist `session.activeOrganizationId` for the current Neon Auth session.
 * Cookie writes — call only from a Route Handler or Server Action, never RSC.
 * Wraps Neon `organization.setActive` without exposing the Auth client.
 */
export async function persistActiveOrganization(
	organizationId: string,
): Promise<Result<void>> {
	const trimmed = organizationId.trim();
	if (trimmed.length === 0) {
		return fail("BAD_REQUEST", "Active organization id is required");
	}

	const auth = getNeonAuth();
	const persisted = await persistActiveOrganizationWithClient(auth, trimmed);
	if (!persisted) {
		return fail(
			"INTERNAL_ERROR",
			"Failed to persist active organization on session",
		);
	}
	return ok(undefined);
}

/**
 * Hard-delete an organization via Neon Auth (`organization.delete`).
 * Removes members and invitations for that org — not a local soft-active flag.
 * Caller must already be permitted (Neon enforces owner/delete capability).
 */
export async function deleteOrganization(
	organizationId: string,
): Promise<Result<void>> {
	const trimmed = organizationId.trim();
	if (trimmed.length === 0) {
		return fail("BAD_REQUEST", "Organization id is required");
	}

	const memberships = await listMemberOrganizations();
	if (!memberships.ok) {
		return memberships;
	}
	const isMember = memberships.data.some((row) => row.id === trimmed);
	if (!isMember) {
		return fail("FORBIDDEN", "Organization is not in the session memberships");
	}

	const auth = getNeonAuth();
	const { error } = await auth.organization.delete({
		organizationId: trimmed,
	});
	if (error) {
		return failFromNeonOrgProbe(error, "Failed to delete organization");
	}
	return ok(undefined);
}
