import { errorResult, type Result } from "@afenda/errors";

import { failFromNeonOrgProbe } from "./auth-failure";
import { getNeonAuth } from "./neon-auth";
import {
	type NeonCreatedOrganization,
	normalizeNeonCreatedOrganization,
} from "./neon-normalization";
import {
	type MemberOrganization,
	normalizeMemberOrganizations,
	persistActiveOrganization as persistActiveOrganizationWithClient,
} from "./organization-membership";

export type { MemberOrganization } from "./organization-membership";

export interface CreateOrganizationInput {
	name: string;
	slug: string;
}

export type CreatedOrganization = NeonCreatedOrganization;

/**
 * Pull `{ id, slug, name }` from Neon `organization.create` JSON without inventing ids.
 */
export function parseCreatedOrganization(
	data: unknown,
): CreatedOrganization | null {
	return normalizeNeonCreatedOrganization(data);
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
	return errorResult.ok(normalizeMemberOrganizations(data));
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
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Organization name is required",
		});
	}
	if (slug.length === 0) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Organization slug is required",
		});
	}

	const auth = getNeonAuth();
	const { data, error } = await auth.organization.create({ name, slug });
	if (error) {
		return failFromNeonOrgProbe(error, "Failed to create organization");
	}

	const created = parseCreatedOrganization(data);
	if (!created) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok(created);
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
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Active organization id is required",
		});
	}

	const auth = getNeonAuth();
	const persisted = await persistActiveOrganizationWithClient(auth, trimmed);
	if (!persisted) {
		return errorResult.fail("INTERNAL_ERROR");
	}
	return errorResult.ok(undefined);
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
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Organization id is required",
		});
	}

	const memberships = await listMemberOrganizations();
	if (!memberships.ok) {
		return memberships;
	}
	const isMember = memberships.data.some((row) => row.id === trimmed);
	if (!isMember) {
		return errorResult.fail("FORBIDDEN");
	}

	const auth = getNeonAuth();
	const { error } = await auth.organization.delete({
		organizationId: trimmed,
	});
	if (error) {
		return failFromNeonOrgProbe(error, "Failed to delete organization");
	}
	return errorResult.ok(undefined);
}
