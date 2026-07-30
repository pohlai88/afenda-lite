import { z } from "zod";
import { MAX_AUDIT_CURSOR_LENGTH } from "./cursor";
import { validateAuditJsonValue } from "./json-policy";
import { AUDIT_ACTIONS, AUDIT_EVENT_OUTCOMES } from "./types";

export const DEFAULT_AUDIT_PAGE = 1 as const;
export const DEFAULT_AUDIT_PAGE_SIZE = 50 as const;
export const MAX_AUDIT_PAGE_SIZE = 100 as const;
export const MAX_AUDIT_EXPORT_ROWS = 10_000 as const;
export const MAX_AUDIT_IDENTIFIER_LENGTH = 128 as const;
export const MAX_AUDIT_PRINCIPAL_ID_LENGTH = 256 as const;
export const MAX_AUDIT_IP_ADDRESS_LENGTH = 128 as const;
export const MAX_AUDIT_USER_AGENT_LENGTH = 512 as const;
export const MAX_AUDIT_CHANGES = 256 as const;

export const auditActionSchema = z.enum(AUDIT_ACTIONS);
export const auditEventOutcomeSchema = z.enum(AUDIT_EVENT_OUTCOMES);

const auditJsonValueSchema = z.unknown().superRefine((value, ctx) => {
	const validated = validateAuditJsonValue(value);
	if (!validated.ok) {
		ctx.addIssue({
			code: "custom",
			message: validated.message,
			path: validated.path,
		});
	}
});

export const changeSchema = z
	.object({
		field: z.string().trim().min(1).max(MAX_AUDIT_IDENTIFIER_LENGTH),
		oldValue: auditJsonValueSchema,
		newValue: auditJsonValueSchema,
	})
	.strict();

const auditChangesSchema = z
	.array(changeSchema)
	.max(MAX_AUDIT_CHANGES)
	.superRefine((value, ctx) => {
		const validated = validateAuditJsonValue(value);
		if (!validated.ok) {
			ctx.addIssue({
				code: "custom",
				message: validated.message,
				path: validated.path,
			});
		}
	});

const auditIdentifierSchema = z
	.string()
	.trim()
	.min(1)
	.max(MAX_AUDIT_IDENTIFIER_LENGTH);
const auditPrincipalIdSchema = z
	.string()
	.trim()
	.min(1)
	.max(MAX_AUDIT_PRINCIPAL_ID_LENGTH);
const auditInstantSchema = z
	.union([z.date(), z.string().datetime()])
	.transform((value) => (value instanceof Date ? value : new Date(value)));

export const auditEventContextSchema = z
	.object({
		version: z.literal(1),
		outcome: auditEventOutcomeSchema,
		source: auditIdentifierSchema,
		occurredAt: auditInstantSchema.nullable(),
		causationId: auditPrincipalIdSchema.nullable(),
		reasonCode: auditIdentifierSchema.nullable(),
	})
	.strict();

const auditEventContextInputSchema = z
	.object({
		version: z.literal(1),
		outcome: auditEventOutcomeSchema,
		source: auditIdentifierSchema,
		occurredAt: auditInstantSchema.nullable().optional(),
		causationId: auditPrincipalIdSchema.nullable().optional(),
		reasonCode: auditIdentifierSchema.nullable().optional(),
	})
	.strict();
const jsonObjectSchema = z
	.custom<Record<string, unknown>>(
		(value) =>
			typeof value === "object" && value !== null && !Array.isArray(value),
		{ message: "Expected an audit JSON object" },
	)
	.superRefine((value, ctx) => {
		const validated = validateAuditJsonValue(value);
		if (!validated.ok) {
			ctx.addIssue({
				code: "custom",
				message: validated.message,
				path: validated.path,
			});
		}
	});

export const auditEntrySchema = z.object({
	id: auditPrincipalIdSchema,
	organizationId: auditPrincipalIdSchema,
	actorUserId: auditPrincipalIdSchema,
	correlationId: auditPrincipalIdSchema,
	module: auditIdentifierSchema,
	entity: auditIdentifierSchema,
	entityId: auditPrincipalIdSchema,
	action: auditActionSchema,
	changes: auditChangesSchema,
	oldValue: jsonObjectSchema.nullable(),
	newValue: jsonObjectSchema.nullable(),
	metadata: jsonObjectSchema.nullable(),
	eventContext: auditEventContextSchema.nullable(),
	ipAddress: z.string().max(MAX_AUDIT_IP_ADDRESS_LENGTH).nullable(),
	userAgent: z.string().max(MAX_AUDIT_USER_AGENT_LENGTH).nullable(),
	createdAt: auditInstantSchema,
});

export type ParsedAuditEntry = z.infer<typeof auditEntrySchema>;

const auditFilterBaseSchema = z
	.object({
		organizationId: auditPrincipalIdSchema,
		module: auditIdentifierSchema.optional(),
		entity: auditIdentifierSchema.optional(),
		entityId: auditPrincipalIdSchema.optional(),
		actorUserId: auditPrincipalIdSchema.optional(),
		action: auditActionSchema.optional(),
		correlationId: auditPrincipalIdSchema.optional(),
		from: auditInstantSchema.optional(),
		to: auditInstantSchema.optional(),
	})
	.strict()
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

export const auditCursorQueryInputSchema = auditFilterBaseSchema
	.extend({
		cursor: z.string().min(1).max(MAX_AUDIT_CURSOR_LENGTH).optional(),
		pageSize: z.number().int().min(1).max(MAX_AUDIT_PAGE_SIZE).optional(),
	})
	.transform((value) => ({
		...value,
		pageSize: value.pageSize ?? DEFAULT_AUDIT_PAGE_SIZE,
	}));

export type ParsedAuditCursorQueryInput = z.infer<
	typeof auditCursorQueryInputSchema
>;

export const auditExportOptionsSchema = auditFilterBaseSchema.extend({
	format: z.enum(["json", "csv"]),
});

export type ParsedAuditExportOptions = z.infer<typeof auditExportOptionsSchema>;

export const auditDetailedExportOptionsSchema = auditExportOptionsSchema.extend(
	{
		cursor: z.string().min(1).max(MAX_AUDIT_CURSOR_LENGTH).optional(),
	},
);

export type ParsedAuditDetailedExportOptions = z.infer<
	typeof auditDetailedExportOptionsSchema
>;

export const auditPurgeOptionsSchema = z
	.object({
		organizationId: auditPrincipalIdSchema,
		olderThan: auditInstantSchema,
	})
	.strict();

export type ParsedAuditPurgeOptions = z.infer<typeof auditPurgeOptionsSchema>;

export const recordAuditCommandSchema = z
	.object({
		organizationId: auditPrincipalIdSchema,
		actorUserId: auditPrincipalIdSchema,
		correlationId: auditPrincipalIdSchema,
		module: auditIdentifierSchema,
		entity: auditIdentifierSchema,
		entityId: auditPrincipalIdSchema,
		action: auditActionSchema,
		changes: auditChangesSchema.optional(),
		oldValue: jsonObjectSchema.nullable().optional(),
		newValue: jsonObjectSchema.nullable().optional(),
		metadata: jsonObjectSchema.nullable().optional(),
		eventContext: auditEventContextInputSchema.optional(),
		ipAddress: z
			.string()
			.trim()
			.min(1)
			.max(MAX_AUDIT_IP_ADDRESS_LENGTH)
			.nullable()
			.optional(),
		userAgent: z
			.string()
			.trim()
			.min(1)
			.max(MAX_AUDIT_USER_AGENT_LENGTH)
			.nullable()
			.optional(),
	})
	.strict();

export type RecordAuditCommand = z.infer<typeof recordAuditCommandSchema>;

export const auditPageSchema = z.object({
	entries: z.array(auditEntrySchema),
	total: z.number().int().min(0),
	page: z.number().int().min(1),
	pageSize: z.number().int().min(1).max(MAX_AUDIT_PAGE_SIZE),
});

export type AuditPage = z.infer<typeof auditPageSchema>;

export const auditCursorPageSchema = z.object({
	entries: z.array(auditEntrySchema),
	nextCursor: z.string().max(MAX_AUDIT_CURSOR_LENGTH).nullable(),
	pageSize: z.number().int().min(1).max(MAX_AUDIT_PAGE_SIZE),
});

export type AuditCursorPage = z.infer<typeof auditCursorPageSchema>;
