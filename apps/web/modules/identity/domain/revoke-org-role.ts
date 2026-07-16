import { and, db, eq, platformRoleAssignment } from "@afenda/db";

export {
	parseRevokeOrgRoleCommand,
	type RevokeOrgRoleCommand,
	revokeOrgRoleCommandSchema,
} from "@/modules/identity/schemas/revoke-org-role";

export type RevokeOrgRoleInput = {
	orgId: string;
	assignmentId: string;
};

export type RevokeOrgRoleOk = {
	ok: true;
	assignment: typeof platformRoleAssignment.$inferSelect;
};

export type RevokeOrgRoleErr = {
	ok: false;
	code: "NOT_FOUND";
	message: string;
};

export type RevokeOrgRoleResult = RevokeOrgRoleOk | RevokeOrgRoleErr;

function requireTrimmed(value: string, field: string, context: string): string {
	const trimmed = value.trim();
	if (trimmed.length === 0) {
		throw new Error(`${context} requires non-empty ${field}`);
	}
	return trimmed;
}

/**
 * Identity — soft-revoke a platform role assignment under hard org stamp
 * (GUIDE-018 I3.1 · ARCH-023). Requires `id` and `organization_id` match;
 * already-inactive or wrong-org → NOT_FOUND honesty.
 */
export async function revokeOrgRole(
	input: RevokeOrgRoleInput,
): Promise<RevokeOrgRoleResult> {
	const orgId = requireTrimmed(input.orgId, "orgId", "revokeOrgRole");
	const assignmentId = requireTrimmed(
		input.assignmentId,
		"assignmentId",
		"revokeOrgRole",
	);

	const [revoked] = await db
		.update(platformRoleAssignment)
		.set({
			active: false,
			updatedAt: new Date(),
		})
		.where(
			and(
				eq(platformRoleAssignment.id, assignmentId),
				eq(platformRoleAssignment.organizationId, orgId),
				eq(platformRoleAssignment.active, true),
			),
		)
		.returning();

	if (!revoked) {
		return {
			ok: false,
			code: "NOT_FOUND",
			message: "Active assignment not found for this organization.",
		};
	}

	return { ok: true, assignment: revoked };
}
