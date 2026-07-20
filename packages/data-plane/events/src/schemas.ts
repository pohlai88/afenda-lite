import { z } from "zod";

import { AllEventSchemas, isKnownEventType } from "./schemas/index";
import { EVENT_SOURCE_MODULES, EVENT_STATUSES } from "./types";

export const DEFAULT_EVENT_PAGE = 1 as const;
export const DEFAULT_EVENT_PAGE_SIZE = 50 as const;
export const MAX_EVENT_PAGE_SIZE = 100 as const;
export const DEFAULT_DISPATCH_LIMIT = 50 as const;
export const MAX_DISPATCH_LIMIT = 200 as const;

export const eventSourceModuleSchema = z.enum(EVENT_SOURCE_MODULES);
export const eventStatusSchema = z.enum(EVENT_STATUSES);

const jsonObjectSchema = z.record(z.string(), z.unknown());

export const domainEventSchema = z.object({
	id: z.string().min(1),
	type: z.string().min(1),
	sourceModule: eventSourceModuleSchema,
	occurredAt: z
		.union([z.string().datetime(), z.date()])
		.transform((value) => (value instanceof Date ? value : new Date(value))),
	correlationId: z.string().min(1),
	causationId: z.string().min(1).nullable(),
	organizationId: z.string().min(1),
	actorUserId: z.string().min(1),
	payload: jsonObjectSchema,
	metadata: jsonObjectSchema.nullable(),
	status: eventStatusSchema,
	attempts: z.number().int().min(0),
	lastError: z.string().nullable(),
	processedAt: z
		.union([z.string().datetime(), z.date()])
		.nullable()
		.transform((value) => {
			if (value === null) {
				return null;
			}
			return value instanceof Date ? value : new Date(value);
		}),
});

export type ParsedDomainEvent = z.infer<typeof domainEventSchema>;

export const publishEventCommandSchema = z
	.object({
		type: z.string().trim().min(1),
		sourceModule: eventSourceModuleSchema,
		organizationId: z.string().trim().min(1),
		actorUserId: z.string().trim().min(1),
		correlationId: z.string().trim().min(1),
		causationId: z.string().trim().min(1).optional(),
		payload: jsonObjectSchema,
		metadata: jsonObjectSchema.optional(),
	})
	.superRefine((value, ctx) => {
		if (!isKnownEventType(value.type)) {
			ctx.addIssue({
				code: "custom",
				message: `Unknown event type: ${value.type}`,
				path: ["type"],
			});
			return;
		}
		const payloadResult = AllEventSchemas[value.type].safeParse(value.payload);
		if (!payloadResult.success) {
			ctx.addIssue({
				code: "custom",
				message: "Invalid event payload for type",
				path: ["payload"],
			});
		}
	});

export type PublishEventCommand = z.infer<typeof publishEventCommandSchema>;

const eventFilterBaseSchema = z
	.object({
		organizationId: z.string().trim().min(1),
		type: z.string().trim().min(1).optional(),
		status: eventStatusSchema.optional(),
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

export const eventQueryOptionsSchema = eventFilterBaseSchema
	.extend({
		page: z.number().int().min(1).optional(),
		pageSize: z.number().int().min(1).max(MAX_EVENT_PAGE_SIZE).optional(),
	})
	.transform((value) => ({
		...value,
		page: value.page ?? DEFAULT_EVENT_PAGE,
		pageSize: value.pageSize ?? DEFAULT_EVENT_PAGE_SIZE,
	}));

export type ParsedEventQueryOptions = z.infer<typeof eventQueryOptionsSchema>;

export const eventPageSchema = z.object({
	entries: z.array(domainEventSchema),
	total: z.number().int().min(0),
	page: z.number().int().min(1),
	pageSize: z.number().int().min(1),
});

export type EventPage = z.infer<typeof eventPageSchema>;

export const eventDispatchOptionsSchema = z
	.object({
		organizationId: z.string().trim().min(1).optional(),
		limit: z.number().int().min(1).max(MAX_DISPATCH_LIMIT).optional(),
	})
	.transform((value) => ({
		organizationId: value.organizationId,
		limit: value.limit ?? DEFAULT_DISPATCH_LIMIT,
	}));

export type ParsedEventDispatchOptions = z.infer<
	typeof eventDispatchOptionsSchema
>;

export const eventPurgeOptionsSchema = z.object({
	organizationId: z.string().trim().min(1),
	olderThan: z.coerce.date(),
});

export type ParsedEventPurgeOptions = z.infer<typeof eventPurgeOptionsSchema>;

export {
	AllEventSchemas,
	type AllEventType,
	IdentityEventSchemas,
	type IdentityEventType,
	type IdentityOrgRoleAssignedPayload,
	identityOrgRoleAssignedPayloadSchema,
	isKnownEventType,
	type MasterDataEntityPayload,
	MasterDataEventSchemas,
	type MasterDataEventType,
	masterDataEntityPayloadSchema,
	PlatformEventSchemas,
	type PlatformEventType,
	type PlatformOrganizationDeletedPayload,
	type PurchaseOrderLinePayload,
	type PurchaseOrderPayload,
	PurchasingEventSchemas,
	type PurchasingEventType,
	platformOrganizationDeletedPayloadSchema,
	purchaseOrderPayloadSchema,
	SalesEventSchemas,
	type SalesEventType,
	type SalesOrderLinePayload,
	type SalesOrderPayload,
	salesOrderPayloadSchema,
} from "./schemas/index";
