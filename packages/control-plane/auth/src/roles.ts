import type { Role } from "./role";

/**
 * Coarse shell role hierarchy (ARCH-026).
 * `admin` satisfies `operator`; `client` is exclusive.
 */
export function roleSatisfies(actual: Role, required: Role): boolean {
	switch (required) {
		case "admin":
			return actual === "admin";
		case "operator":
			return actual === "operator" || actual === "admin";
		case "client":
			return actual === "client";
		default: {
			const _exhaustive: never = required;
			throw new Error(`@afenda/auth: unhandled role: ${_exhaustive}`);
		}
	}
}

/** Neon Auth org membership roles (identity signals — not ARCH-023 codes). */
export type NeonOrgRole = "owner" | "admin" | "member";

const NEON_ORG_ROLE_TO_SESSION = {
	owner: "admin",
	admin: "operator",
	member: "client",
} as const satisfies Record<NeonOrgRole, Role>;

const SESSION_ROLE_TO_NEON = {
	admin: "owner",
	operator: "admin",
	client: "member",
} as const satisfies Record<Role, NeonOrgRole>;

/** Neon Auth membership role → Afenda shell Role. */
export function toSessionRole(neonRole: string): Role {
	if (Object.hasOwn(NEON_ORG_ROLE_TO_SESSION, neonRole)) {
		return NEON_ORG_ROLE_TO_SESSION[neonRole as NeonOrgRole];
	}
	throw new Error(`@afenda/auth: unhandled Neon org role: ${neonRole}`);
}

/** Afenda shell Role → Neon Auth membership role. */
export function toNeonOrgRole(role: Role): NeonOrgRole {
	return SESSION_ROLE_TO_NEON[role];
}

/**
 * Coarse invite privilege (ARCH-026 membership invites).
 * Operators may invite clients only; admin may invite any membership role.
 * Not a substitute for ARCH-023 `clients.invite` (I1.3 uses session signal).
 */
export function canInviteMember(inviter: Role, invitee: Role): boolean {
	if (invitee === "client") {
		return roleSatisfies(inviter, "operator");
	}
	return inviter === "admin";
}

/** Membership roles the inviter may select in the operator invite UI. */
export function inviteableRolesFor(inviter: Role): Role[] {
	if (inviter === "admin") {
		return ["client", "operator", "admin"];
	}
	if (inviter === "operator") {
		return ["client"];
	}
	return [];
}
