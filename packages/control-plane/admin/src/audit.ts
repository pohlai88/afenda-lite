import {
	and,
	count,
	db,
	desc,
	eq,
	gte,
	lte,
	platformRbacAudit,
} from "@afenda/db";

import { fail, failFromUnknown, ok, type Result } from "@afenda/errors/result";

import {
	type DeleteRbacAuditInput,
	deleteRbacAuditInputSchema,
	type ListRbacAuditInput,
	listRbacAuditInputSchema,
	type RbacAuditPage,
	type RbacAuditRow,
	type RecordRbacAuditCommand,
	rbacAuditPageSchema,
	rbacAuditRowSchema,
	recordRbacAuditCommandSchema,
} from "./schemas/audit";

function parseAuditRow(row: {
	id: string;
	action: string;
	actorUserId: string;
	organizationId: string;
	targetType: string | null;
	targetId: string | null;
	roleId: string | null;
	permissionCode: string | null;
	oldValue: unknown;
	newValue: unknown;
	reason: string | null;
	correlationId: string | null;
	ipAddress: string | null;
	userAgent: string | null;
	createdAt: Date;
}): RbacAuditRow {
	return rbacAuditRowSchema.parse({
		id: row.id,
		action: row.action,
		actorUserId: row.actorUserId,
		organizationId: row.organizationId,
		targetType: row.targetType ?? null,
		targetId: row.targetId ?? null,
		roleId: row.roleId ?? null,
		permissionCode: row.permissionCode ?? null,
		oldValue: row.oldValue ?? null,
		newValue: row.newValue ?? null,
		reason: row.reason ?? null,
		correlationId: row.correlationId ?? null,
		ipAddress: row.ipAddress ?? null,
		userAgent: row.userAgent ?? null,
		createdAt: row.createdAt,
	});
}

function buildRbacAuditWhere(command: ListRbacAuditInput) {
	const predicates = [eq(platformRbacAudit.organizationId, command.orgId)];

	if (command.action !== undefined) {
		predicates.push(eq(platformRbacAudit.action, command.action));
	}
	if (command.actorUserId !== undefined) {
		predicates.push(eq(platformRbacAudit.actorUserId, command.actorUserId));
	}
	if (command.targetType !== undefined) {
		predicates.push(eq(platformRbacAudit.targetType, command.targetType));
	}
	if (command.targetId !== undefined) {
		predicates.push(eq(platformRbacAudit.targetId, command.targetId));
	}
	if (command.correlationId !== undefined) {
		predicates.push(eq(platformRbacAudit.correlationId, command.correlationId));
	}
	if (command.from !== undefined) {
		predicates.push(gte(platformRbacAudit.createdAt, new Date(command.from)));
	}
	if (command.to !== undefined) {
		predicates.push(lte(platformRbacAudit.createdAt, new Date(command.to)));
	}

	const where = and(...predicates);
	if (where === undefined) {
		throw new Error("@afenda/admin: rbac audit where clause is required");
	}
	return where;
}

/**
 * Hard-tenancy paginated query of `platform_rbac_audit` for an organization.
 */
export async function listRbacAudit(
	input: unknown,
): Promise<Result<RbacAuditPage>> {
	const parsed = listRbacAuditInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid RBAC audit list input", {
			fieldErrors: parsed.error.flatten().fieldErrors,
		});
	}

	const command = parsed.data;

	try {
		const where = buildRbacAuditWhere(command);
		const offset = (command.page - 1) * command.pageSize;

		const [totalRow] = await db
			.select({ value: count() })
			.from(platformRbacAudit)
			.where(where);

		const rows = await db
			.select()
			.from(platformRbacAudit)
			.where(where)
			.orderBy(desc(platformRbacAudit.createdAt))
			.limit(command.pageSize)
			.offset(offset);

		const total = totalRow?.value ?? 0;
		const page = rbacAuditPageSchema.parse({
			rows: rows.map((row) => parseAuditRow(row)),
			total: Number(total),
			page: command.page,
			pageSize: command.pageSize,
		});

		return ok(page);
	} catch (error) {
		return failFromUnknown(error, "Failed to list RBAC audit rows");
	}
}

/**
 * Insert `platform_rbac_audit` with explicit `organization_id` (never ambient).
 * Callers must already have established session org (ARCH-023).
 */
export async function recordRbacAudit(
	input: unknown,
): Promise<Result<RbacAuditRow>> {
	const parsed = recordRbacAuditCommandSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid RBAC audit write input", {
			fieldErrors: parsed.error.flatten().fieldErrors,
		});
	}

	const command: RecordRbacAuditCommand = parsed.data;

	try {
		const [row] = await db
			.insert(platformRbacAudit)
			.values({
				action: command.action,
				actorUserId: command.actorUserId,
				organizationId: command.orgId,
				correlationId: command.correlationId,
				targetType: command.targetType,
				targetId: command.targetId,
				roleId: command.roleId,
				oldValue: command.oldValue,
				newValue: command.newValue,
				reason: command.reason,
				ipAddress: command.ipAddress,
				userAgent: command.userAgent,
			})
			.returning();

		if (!row) {
			return fail("INTERNAL_ERROR", "recordRbacAudit insert returned no row");
		}

		return ok(parseAuditRow(row));
	} catch (error) {
		return failFromUnknown(error, "Failed to record RBAC audit row");
	}
}

/**
 * Hard-tenancy delete — both `id` and `organization_id` must match.
 * Returns null when no row matches (including wrong-org attempts).
 */
export async function deleteRbacAuditRow(
	input: unknown,
): Promise<Result<RbacAuditRow | null>> {
	const parsed = deleteRbacAuditInputSchema.safeParse(input);
	if (!parsed.success) {
		return fail("BAD_REQUEST", "Invalid RBAC audit delete input", {
			fieldErrors: parsed.error.flatten().fieldErrors,
		});
	}

	const command: DeleteRbacAuditInput = parsed.data;

	try {
		const [row] = await db
			.delete(platformRbacAudit)
			.where(
				and(
					eq(platformRbacAudit.id, command.id),
					eq(platformRbacAudit.organizationId, command.orgId),
				),
			)
			.returning();

		if (!row) {
			return ok(null);
		}
		return ok(parseAuditRow(row));
	} catch (error) {
		return failFromUnknown(error, "Failed to delete RBAC audit row");
	}
}
