import { env } from "@afenda/env";
import type { NeonAuth } from "@neondatabase/auth/next/server";
import {
	type NeonMemberOrganization,
	normalizeNeonMemberOrganizations,
} from "./neon-normalization";

export type MemberOrganization = NeonMemberOrganization;

/**
 * Normalize Neon `organization.list()` payload into membership rows.
 * Invalid rows are dropped — never invent an organization id.
 */
export function normalizeMemberOrganizations(
	data: unknown,
): MemberOrganization[] {
	return normalizeNeonMemberOrganizations(data);
}

/**
 * N8 ladder (ARCH-023 R2 / sole·allowlisted):
 * 1. `PORTAL_ORGANIZATION_ID` match among memberships
 * 2. else `PORTAL_ORG_SLUG` match among memberships
 * 3. else sole membership
 * 4. else null (fail closed — never first-of-many, never create)
 */
export function selectResolvableOrganizationId(
	organizations: readonly MemberOrganization[],
): string | null {
	const allowlisted =
		(env.PORTAL_ORGANIZATION_ID
			? organizations.find(
					(organization) => organization.id === env.PORTAL_ORGANIZATION_ID,
				)
			: undefined) ??
		(env.PORTAL_ORG_SLUG
			? organizations.find(
					(organization) => organization.slug === env.PORTAL_ORG_SLUG,
				)
			: undefined);

	const selected =
		allowlisted ?? (organizations.length === 1 ? organizations[0] : undefined);

	return selected?.id ?? null;
}

/** List memberships and apply the N8 resolve ladder (no cookie writes). */
export async function resolveMemberOrganizationId(
	auth: NeonAuth,
): Promise<string | null> {
	const { data, error } = await auth.organization.list();
	if (error) {
		return null;
	}
	return selectResolvableOrganizationId(normalizeMemberOrganizations(data));
}

/**
 * Persist `session.activeOrganizationId` via Neon Auth.
 * Cookie writes — call only from a Route Handler or Server Action, never RSC.
 */
export async function persistActiveOrganization(
	auth: NeonAuth,
	organizationId: string,
): Promise<boolean> {
	const { error } = await auth.organization.setActive({ organizationId });
	return !error;
}
