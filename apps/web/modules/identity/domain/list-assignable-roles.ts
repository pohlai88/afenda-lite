import { and, db, eq, isNull, platformRole } from "@afenda/db";
import { errorIngress } from "@afenda/errors";

export type AssignableRole = typeof platformRole.$inferSelect;

/**
 * Identity — roles that may be assigned in an organization (GUIDE-018 I3.1).
 *
 * Catalog = active system templates (`organization_id` NULL by design) ∪
 * active custom roles with an explicit organization predicate. Not R1 soft
 * tenancy: templates are intentionally NULL-org (ARCH-023 · platform schema).
 */
export async function listAssignableRoles(
	orgId: string,
): Promise<AssignableRole[]> {
	const trimmed = orgId.trim();
	if (trimmed.length === 0) {
		throw errorIngress.code("BAD_REQUEST", {
			operation: "identity.roles.list",
			publicMessage: "Organization is required",
		});
	}

	const [templates, orgRoles] = await Promise.all([
		db
			.select()
			.from(platformRole)
			.where(
				and(
					eq(platformRole.isSystemTemplate, true),
					eq(platformRole.active, true),
					isNull(platformRole.organizationId),
				),
			),
		db
			.select()
			.from(platformRole)
			.where(
				and(
					eq(platformRole.organizationId, trimmed),
					eq(platformRole.active, true),
				),
			),
	]);

	const byId = new Map<string, AssignableRole>();
	for (const role of templates) {
		byId.set(role.id, role);
	}
	for (const role of orgRoles) {
		byId.set(role.id, role);
	}

	return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}
