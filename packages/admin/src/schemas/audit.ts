import { z } from "zod";

export const DEFAULT_RBAC_AUDIT_PAGE = 1 as const;
export const DEFAULT_RBAC_AUDIT_PAGE_SIZE = 50 as const;
export const MAX_RBAC_AUDIT_PAGE_SIZE = 100 as const;

/** Audit action stamped when an operator invitation succeeds (GUIDE-018 I2.3). */
export const MEMBER_INVITE_AUDIT_ACTION = "member.invite" as const;

/** Audit actions for platform role assignment mutations (GUIDE-018 I3.1). */
export const ROLE_ASSIGN_AUDIT_ACTION = "role.assign" as const;
export const ROLE_REVOKE_AUDIT_ACTION = "role.revoke" as const;

export const listRbacAuditInputSchema = z
	.object({
		orgId: z.string().trim().min(1),
		action: z.string().trim().min(1).optional(),
		actorUserId: z.string().trim().min(1).optional(),
		targetType: z.string().trim().min(1).optional(),
		targetId: z.string().trim().min(1).optional(),
		correlationId: z.string().trim().min(1).optional(),
		from: z.string().datetime().optional(),
		to: z.string().datetime().optional(),
		page: z.number().int().min(1).optional(),
		pageSize: z.number().int().min(1).max(MAX_RBAC_AUDIT_PAGE_SIZE).optional(),
	})
	.superRefine((value, ctx) => {
		if (
			value.from !== undefined &&
			value.to !== undefined &&
			value.from > value.to
		) {
			ctx.addIssue({
				code: "custom",
				message: "from must be less than or equal to to",
				path: ["from"],
			});
		}
	})
	.transform((value) => ({
		...value,
		page: value.page ?? DEFAULT_RBAC_AUDIT_PAGE,
		pageSize: value.pageSize ?? DEFAULT_RBAC_AUDIT_PAGE_SIZE,
	}));

export type ListRbacAuditInput = z.infer<typeof listRbacAuditInputSchema>;

/** Max stored lengths — callers should truncate before write. */
export const MAX_RBAC_AUDIT_IP_ADDRESS_LENGTH = 128 as const;
export const MAX_RBAC_AUDIT_USER_AGENT_LENGTH = 512 as const;

export const rbacAuditRowSchema = z.object({
	id: z.string().min(1),
	action: z.string().min(1),
	actorUserId: z.string().min(1),
	organizationId: z.string().min(1),
	targetType: z.string().nullable().optional(),
	targetId: z.string().nullable().optional(),
	roleId: z.string().nullable().optional(),
	permissionCode: z.string().nullable().optional(),
	oldValue: z.unknown().nullable().optional(),
	newValue: z.unknown().nullable().optional(),
	reason: z.string().nullable().optional(),
	correlationId: z.string().nullable().optional(),
	ipAddress: z.string().nullable().optional(),
	userAgent: z.string().nullable().optional(),
	createdAt: z.union([z.string().datetime(), z.date()]),
});

export type RbacAuditRow = z.infer<typeof rbacAuditRowSchema>;

export const rbacAuditPageSchema = z.object({
	rows: z.array(rbacAuditRowSchema),
	total: z.number().int().min(0),
	page: z.number().int().min(1),
	pageSize: z.number().int().min(1).max(MAX_RBAC_AUDIT_PAGE_SIZE),
});

export type RbacAuditPage = z.infer<typeof rbacAuditPageSchema>;

const jsonObjectSchema = z.record(z.string(), z.unknown());

export const recordRbacAuditCommandSchema = z.object({
	orgId: z.string().trim().min(1),
	action: z.string().trim().min(1),
	actorUserId: z.string().trim().min(1),
	/** API-007 — required on new privileged writes. */
	correlationId: z.string().trim().min(1),
	targetType: z.string().trim().min(1).optional(),
	targetId: z.string().trim().min(1).optional(),
	roleId: z.string().trim().min(1).optional(),
	oldValue: jsonObjectSchema.optional(),
	newValue: jsonObjectSchema.optional(),
	reason: z.string().trim().min(1).optional(),
	ipAddress: z
		.string()
		.trim()
		.min(1)
		.max(MAX_RBAC_AUDIT_IP_ADDRESS_LENGTH)
		.optional(),
	userAgent: z
		.string()
		.trim()
		.min(1)
		.max(MAX_RBAC_AUDIT_USER_AGENT_LENGTH)
		.optional(),
});

export type RecordRbacAuditCommand = z.infer<
	typeof recordRbacAuditCommandSchema
>;

export const deleteRbacAuditInputSchema = z.object({
	id: z.string().trim().min(1),
	orgId: z.string().trim().min(1),
});

export type DeleteRbacAuditInput = z.infer<typeof deleteRbacAuditInputSchema>;
