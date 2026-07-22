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
	ACCOUNTING_EVENT_IDS,
	ACCOUNTING_JOURNAL_CREATED_EVENT,
	ACCOUNTING_JOURNAL_POSTED_EVENT,
	ACCOUNTING_JOURNAL_REVERSED_EVENT,
	ACCOUNTING_PERIOD_CLOSED_EVENT,
	AccountingEventSchemas,
	type AccountingEventType,
	type AccountingPayload,
	AllEventSchemas,
	type AllEventType,
	accountingPayloadSchema,
	applicationInstructionPayloadSchema,
	HUMAN_RESOURCES_BENEFIT_ENROLLMENT_CHANGED_EVENT,
	HUMAN_RESOURCES_CAREER_PLAN_ACKNOWLEDGED_EVENT,
	HUMAN_RESOURCES_CERTIFICATION_EXPIRING_EVENT,
	HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT,
	HUMAN_RESOURCES_COMPETENCY_ASSESSED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_CREATED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_CHANGED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_STARTED_EVENT,
	HUMAN_RESOURCES_EVENT_IDS,
	HUMAN_RESOURCES_LEAVE_APPROVED_EVENT,
	HUMAN_RESOURCES_LEAVE_CANCELLED_EVENT,
	HUMAN_RESOURCES_LEAVE_ENTITLEMENT_ADJUSTED_EVENT,
	HUMAN_RESOURCES_LEAVE_REJECTED_EVENT,
	HUMAN_RESOURCES_LEAVE_REQUESTED_EVENT,
	HUMAN_RESOURCES_LEARNING_ASSIGNMENT_CREATED_EVENT,
	HUMAN_RESOURCES_LEARNING_COMPLETION_RECORDED_EVENT,
	HUMAN_RESOURCES_OFFBOARDING_COMPLETED_EVENT,
	HUMAN_RESOURCES_OFFBOARDING_STARTED_EVENT,
	HUMAN_RESOURCES_OFFER_ACCEPTED_EVENT,
	HUMAN_RESOURCES_ONBOARDING_COMPLETED_EVENT,
	HUMAN_RESOURCES_ONBOARDING_STARTED_EVENT,
	HUMAN_RESOURCES_REQUISITION_APPROVED_EVENT,
	HUMAN_RESOURCES_SUCCESSION_CANDIDATE_APPROVED_EVENT,
	HUMAN_RESOURCES_SUCCESSION_READINESS_CHANGED_EVENT,
	HUMAN_RESOURCES_TALENT_POOL_MEMBERSHIP_APPROVED_EVENT,
	HUMAN_RESOURCES_TIMESHEET_APPROVED_EVENT,
	type HumanResourcesEntityPayload,
	HumanResourcesEventSchemas,
	type HumanResourcesEventType,
	humanResourcesEntityPayloadSchema,
	IdentityEventSchemas,
	type IdentityEventType,
	type IdentityOrgRoleAssignedPayload,
	identityOrgRoleAssignedPayloadSchema,
	isKnownEventType,
	type MasterDataEntityPayload,
	MasterDataEventSchemas,
	type MasterDataEventType,
	masterDataEntityPayloadSchema,
	PAYABLES_ALLOCATION_POSTED_EVENT,
	PAYABLES_CREDIT_NOTE_POSTED_EVENT,
	PAYABLES_EVENT_IDS,
	PAYABLES_INVOICE_CANCELLED_EVENT,
	PAYABLES_INVOICE_CREATED_EVENT,
	PAYABLES_INVOICE_MATCHED_EVENT,
	PAYABLES_INVOICE_POSTED_EVENT,
	PAYABLES_PAYMENT_APPLICATION_REVERSED_EVENT,
	PAYMENTS_APPLICATION_INSTRUCTION_APPLIED_EVENT,
	PAYMENTS_APPLICATION_INSTRUCTION_CREATED_EVENT,
	PAYMENTS_APPLICATION_INSTRUCTION_REJECTED_EVENT,
	PAYMENTS_EVENT_IDS,
	PAYMENTS_PAYMENT_CREATED_EVENT,
	PAYMENTS_PAYMENT_POSTED_EVENT,
	PAYMENTS_PAYMENT_REVERSED_EVENT,
	PAYMENTS_REFUND_POSTED_EVENT,
	PAYMENTS_TRANSFER_POSTED_EVENT,
	PAYROLL_EVENT_IDS,
	PAYROLL_PAYMENT_REQUESTED_EVENT,
	PAYROLL_PAYSLIP_PUBLISHED_EVENT,
	PAYROLL_POSTING_REQUESTED_EVENT,
	PAYROLL_RUN_CALCULATED_EVENT,
	PAYROLL_RUN_FINALIZED_EVENT,
	PAYROLL_RUN_REVERSED_EVENT,
	PAYROLL_RUN_STARTED_EVENT,
	PayablesEventSchemas,
	type PayablesEventType,
	type PayablesPayload,
	type PaymentPayload,
	PaymentsEventSchemas,
	type PaymentsEventType,
	type PayrollEntityPayload,
	PayrollEventSchemas,
	type PayrollEventType,
	PlatformEventSchemas,
	type PlatformEventType,
	type PlatformOrganizationDeletedPayload,
	type PurchaseOrderLinePayload,
	type PurchaseOrderPayload,
	PurchasingEventSchemas,
	type PurchasingEventType,
	payablesPayloadSchema,
	paymentPayloadSchema,
	payrollEntityPayloadSchema,
	platformOrganizationDeletedPayloadSchema,
	purchaseOrderPayloadSchema,
	RECEIVABLES_ALLOCATION_POSTED_EVENT,
	RECEIVABLES_ALLOCATION_REVERSED_EVENT,
	RECEIVABLES_CREDIT_NOTE_POSTED_EVENT,
	RECEIVABLES_EVENT_IDS,
	RECEIVABLES_INVOICE_CANCELLED_EVENT,
	RECEIVABLES_INVOICE_CLOSED_EVENT,
	RECEIVABLES_INVOICE_CREATED_EVENT,
	RECEIVABLES_INVOICE_POSTED_EVENT,
	RECEIVABLES_RECEIPT_APPLICATION_POSTED_EVENT,
	RECEIVABLES_RECEIPT_APPLICATION_REVERSED_EVENT,
	ReceivablesEventSchemas,
	type ReceivablesEventType,
	type ReceivablesPayload,
	receivablesPayloadSchema,
	SalesEventSchemas,
	type SalesEventType,
	type SalesOrderLinePayload,
	type SalesOrderPayload,
	salesOrderPayloadSchema,
} from "./schemas/index";
