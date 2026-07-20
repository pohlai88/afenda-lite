import { z } from "zod";

import { AUDIT_ACTIONS } from "./types";

export const DEFAULT_AUDIT_PAGE = 1 as const;
export const DEFAULT_AUDIT_PAGE_SIZE = 50 as const;
export const MAX_AUDIT_PAGE_SIZE = 100 as const;
export const MAX_AUDIT_EXPORT_ROWS = 10_000 as const;
export const MAX_AUDIT_IP_ADDRESS_LENGTH = 128 as const;
export const MAX_AUDIT_USER_AGENT_LENGTH = 512 as const;

export const auditActionSchema = z.enum(AUDIT_ACTIONS);

export const changeSchema = z.object({
	field: z.string().min(1),
	oldValue: z.unknown(),
	newValue: z.unknown(),
});

const jsonObjectSchema = z.record(z.string(), z.unknown());

export const auditEntrySchema = z.object({
	id: z.string().min(1),
	organizationId: z.string().min(1),
	actorUserId: z.string().min(1),
	correlationId: z.string().min(1),
	module: z.string().min(1),
	entity: z.string().min(1),
	entityId: z.string().min(1),
	action: auditActionSchema,
	changes: z.array(changeSchema),
	oldValue: jsonObjectSchema.nullable(),
	newValue: jsonObjectSchema.nullable(),
	metadata: jsonObjectSchema.nullable(),
	ipAddress: z.string().nullable(),
	userAgent: z.string().nullable(),
	createdAt: z
		.union([z.string().datetime(), z.date()])
		.transform((value) => (value instanceof Date ? value : new Date(value))),
});

export type ParsedAuditEntry = z.infer<typeof auditEntrySchema>;

const auditFilterBaseSchema = z
	.object({
		organizationId: z.string().trim().min(1),
		module: z.string().trim().min(1).optional(),
		entity: z.string().trim().min(1).optional(),
		entityId: z.string().trim().min(1).optional(),
		actorUserId: z.string().trim().min(1).optional(),
		action: auditActionSchema.optional(),
		correlationId: z.string().trim().min(1).optional(),
		from: z.coerce.date().optional(),
		to: z.coerce.date().optional(),
	})
	.superRefine((value, ctx) => {
		if (
			value.from !== undefined &&
			value.to !== undefined &&
			value.from.getTime() > value.to.getTime()
		) {
			ctx.addIssue({
				code: "custom",
				message: "from must be less than or equal to to",
				path: ["from"],
			});
		}
	});

export const auditQueryOptionsSchema = auditFilterBaseSchema
	.extend({
		page: z.number().int().min(1).optional(),
		pageSize: z.number().int().min(1).max(MAX_AUDIT_PAGE_SIZE).optional(),
	})
	.transform((value) => ({
		...value,
		page: value.page ?? DEFAULT_AUDIT_PAGE,
		pageSize: value.pageSize ?? DEFAULT_AUDIT_PAGE_SIZE,
	}));

export type ParsedAuditQueryOptions = z.infer<typeof auditQueryOptionsSchema>;

export const auditExportOptionsSchema = auditFilterBaseSchema.extend({
	format: z.enum(["json", "csv"]),
});

export type ParsedAuditExportOptions = z.infer<typeof auditExportOptionsSchema>;

export const auditPurgeOptionsSchema = z.object({
	organizationId: z.string().trim().min(1),
	olderThan: z.coerce.date(),
});

export type ParsedAuditPurgeOptions = z.infer<typeof auditPurgeOptionsSchema>;

export const recordAuditCommandSchema = z.object({
	organizationId: z.string().trim().min(1),
	actorUserId: z.string().trim().min(1),
	correlationId: z.string().trim().min(1),
	module: z.string().trim().min(1),
	entity: z.string().trim().min(1),
	entityId: z.string().trim().min(1),
	action: auditActionSchema,
	oldValue: jsonObjectSchema.nullable().optional(),
	newValue: jsonObjectSchema.nullable().optional(),
	metadata: jsonObjectSchema.optional(),
	ipAddress: z
		.string()
		.trim()
		.min(1)
		.max(MAX_AUDIT_IP_ADDRESS_LENGTH)
		.optional(),
	userAgent: z
		.string()
		.trim()
		.min(1)
		.max(MAX_AUDIT_USER_AGENT_LENGTH)
		.optional(),
});

export type RecordAuditCommand = z.infer<typeof recordAuditCommandSchema>;

export const auditPageSchema = z.object({
	entries: z.array(auditEntrySchema),
	total: z.number().int().min(0),
	page: z.number().int().min(1),
	pageSize: z.number().int().min(1).max(MAX_AUDIT_PAGE_SIZE),
});

export type AuditPage = z.infer<typeof auditPageSchema>;
