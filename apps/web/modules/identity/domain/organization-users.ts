/**
 * Identity — organization users port (ARCH-007/009).
 * Neon Auth membership via `@afenda/auth`; no SQL, Request, or UI.
 */

import { findOrgMember, listOrgMembers, type OrgMember } from "@afenda/auth";

export type OrganizationUser = {
	userId: string;
	email: string;
	name: string;
	neonRole: OrgMember["role"];
};

function toOrganizationUser(member: OrgMember): OrganizationUser {
	return {
		userId: member.userId,
		email: member.email,
		name: member.name,
		neonRole: member.role,
	};
}

function compareOrganizationUsers(
	left: OrganizationUser,
	right: OrganizationUser,
): number {
	const byName = left.name.localeCompare(right.name, undefined, {
		sensitivity: "base",
	});
	if (byName !== 0) {
		return byName;
	}
	const byEmail = left.email.localeCompare(right.email);
	if (byEmail !== 0) {
		return byEmail;
	}
	return left.userId.localeCompare(right.userId);
}

/** Sorted Neon Auth members for the explicit org. */
export async function listOrganizationUsers(
	orgId: string,
): Promise<OrganizationUser[]> {
	const members = await listOrgMembers(orgId);
	const users = members.map(toOrganizationUser);
	return [...users].sort(compareOrganizationUsers);
}

/** Exact membership lookup; null when the user is not in the org. */
export async function getOrganizationUser(
	orgId: string,
	userId: string,
): Promise<OrganizationUser | null> {
	const member = await findOrgMember(orgId, userId);
	return member ? toOrganizationUser(member) : null;
}
