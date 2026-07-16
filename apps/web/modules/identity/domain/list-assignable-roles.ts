import { and, db, eq, isNull, platformRole, withOrg } from "@afenda/db";

export type AssignableRole = typeof platformRole.$inferSelect;

/**
 * Identity — roles that may be assigned in an organization (GUIDE-018 I3.1).
 *
 * Catalog = active system templates (`organization_id` NULL by design) ∪
 * org-scoped custom roles via hard `withOrg`. Not R1 soft tenancy: templates
 * are intentionally NULL-org (ARCH-023 · platform schema).
 */
export async function listAssignableRoles(
	orgId: string,
): Promise<AssignableRole[]> {
	const trimmed = orgId.trim();
	if (trimmed.length === 0) {
		throw new Error("listAssignableRoles requires non-empty orgId");
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
		withOrg(platformRole, trimmed),
	]);

	const orgActive = orgRoles.filter((role) => role.active);
	const byId = new Map<string, AssignableRole>();
	for (const role of templates) {
		byId.set(role.id, role);
	}
	for (const role of orgActive) {
		byId.set(role.id, role);
	}

	return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}
