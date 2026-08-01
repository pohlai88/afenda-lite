import { z } from "zod";

import {
	EVENT_LIFECYCLE_POLICY,
	eventDefinition,
	isRegisteredEventType,
} from "./semantic-registry";
import { EVENT_SOURCE_MODULES, EVENT_STATUSES } from "./types";

export const DEFAULT_EVENT_PAGE = 1 as const;
export const DEFAULT_EVENT_PAGE_SIZE = 50 as const;
export const MAX_EVENT_PAGE_SIZE = 100 as const;
export const DEFAULT_DISPATCH_LIMIT = EVENT_LIFECYCLE_POLICY.defaultClaimLimit;
export const MAX_DISPATCH_LIMIT = EVENT_LIFECYCLE_POLICY.maxClaimLimit;

export const eventSourceModuleSchema = z.enum(EVENT_SOURCE_MODULES);
export const eventStatusSchema = z.enum(EVENT_STATUSES);

const jsonObjectSchema = z.record(z.string(), z.unknown());

export const domainEventSchema = z
	.object({
		id: z.string().min(1),
		type: z.string().min(1),
		sourceModule: eventSourceModuleSchema,
		deduplicationKey: z.string().trim().min(1).max(255).nullable().optional(),
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
	})
	.superRefine((value, ctx) => {
		if (!isRegisteredEventType(value.type)) {
			ctx.addIssue({
				code: "custom",
				message: "Unknown event type",
				path: ["type"],
			});
			return;
		}
		const definition = eventDefinition(value.type);
		if (definition.sourceModule !== value.sourceModule) {
			ctx.addIssue({
				code: "custom",
				message: "Event source module does not match canonical registry",
				path: ["sourceModule"],
			});
		}
		if (!definition.schema.safeParse(value.payload).success) {
			ctx.addIssue({
				code: "custom",
				message: "Invalid event payload for type",
				path: ["payload"],
			});
		}
	});

export type ParsedDomainEvent = z.infer<typeof domainEventSchema>;

export const publishEventCommandSchema = z
	.object({
		type: z.string().trim().min(1),
		sourceModule: eventSourceModuleSchema,
		deduplicationKey: z.string().trim().min(1).max(255).optional(),
		organizationId: z.string().trim().min(1),
		actorUserId: z.string().trim().min(1),
		correlationId: z.string().trim().min(1),
		causationId: z.string().trim().min(1).optional(),
		payload: jsonObjectSchema,
		metadata: jsonObjectSchema.optional(),
	})
	.superRefine((value, ctx) => {
		if (!isRegisteredEventType(value.type)) {
			ctx.addIssue({
				code: "custom",
				message: `Unknown event type: ${value.type}`,
				path: ["type"],
			});
			return;
		}
		if (eventDefinition(value.type).sourceModule !== value.sourceModule) {
			ctx.addIssue({
				code: "custom",
				message: "Event source module does not match canonical registry",
				path: ["sourceModule"],
			});
		}
		const payloadResult = eventDefinition(value.type).schema.safeParse(
			value.payload,
		);
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
		id: z.string().trim().min(1).optional(),
		type: z.string().trim().min(1).optional(),
		sourceModule: eventSourceModuleSchema.optional(),
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
		organizationId: z.string().trim().min(1),
		limit: z
			.number()
			.int()
			.min(1)
			.max(EVENT_LIFECYCLE_POLICY.maxClaimLimit)
			.optional(),
	})
	.transform((value) => ({
		organizationId: value.organizationId,
		limit: value.limit ?? EVENT_LIFECYCLE_POLICY.defaultClaimLimit,
	}));

export type ParsedEventDispatchOptions = z.infer<
	typeof eventDispatchOptionsSchema
>;

export const eventPurgeOptionsSchema = z.object({
	organizationId: z.string().trim().min(1),
	olderThan: z.coerce.date(),
});

export type ParsedEventPurgeOptions = z.infer<typeof eventPurgeOptionsSchema>;

export const eventRetryOptionsSchema = z.object({
	organizationId: z.string().trim().min(1),
	id: z.string().trim().min(1),
});

export type ParsedEventRetryOptions = z.infer<typeof eventRetryOptionsSchema>;

export const eventReplayOptionsSchema = eventRetryOptionsSchema.extend({
	confirmation: z.literal("REPLAY_PROCESSED_EVENT"),
});

export type ParsedEventReplayOptions = z.infer<typeof eventReplayOptionsSchema>;

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
	type ApprovedPayrollHandoff,
	accountingPayloadSchema,
	applicationInstructionPayloadSchema,
	approvedPayrollHandoffSchema,
	CORPORATE_ADMINISTRATION_EVENT_IDS,
	CORPORATE_ADMINISTRATION_LEGAL_COMPANY_ACTIVITY_REGISTERED_EVENT,
	CORPORATE_ADMINISTRATION_LEGAL_COMPANY_DRAFT_REGISTERED_EVENT,
	CORPORATE_ADMINISTRATION_LEGAL_COMPANY_FINANCIAL_YEAR_SET_EVENT,
	CORPORATE_ADMINISTRATION_LEGAL_COMPANY_IDENTIFIER_REGISTERED_EVENT,
	CORPORATE_ADMINISTRATION_LEGAL_COMPANY_JURISDICTION_PROFILE_SET_EVENT,
	CORPORATE_ADMINISTRATION_LEGAL_COMPANY_LEGAL_FORM_CHANGED_EVENT,
	CORPORATE_ADMINISTRATION_LEGAL_COMPANY_NAME_ADDED_EVENT,
	CORPORATE_ADMINISTRATION_LEGAL_COMPANY_NAME_SUPERSEDED_EVENT,
	CORPORATE_ADMINISTRATION_LEGAL_COMPANY_PROFILE_UPDATED_EVENT,
	CORPORATE_ADMINISTRATION_LEGAL_ESTABLISHMENT_REGISTERED_EVENT,
	CORPORATE_ADMINISTRATION_LEGAL_ESTABLISHMENT_STATUS_CHANGED_EVENT,
	CORPORATE_ADMINISTRATION_LEGAL_ESTABLISHMENT_UPDATED_EVENT,
	CORPORATE_ADMINISTRATION_PREMISE_ENDED_EVENT,
	CORPORATE_ADMINISTRATION_PREMISE_REGISTERED_EVENT,
	CORPORATE_ADMINISTRATION_REGISTERED_ADDRESS_SET_EVENT,
	CorporateAdministrationEventSchemas,
	type CorporateAdministrationEventType,
	type CorporateAdministrationLegalCompanyActivityRegisteredPayload,
	type CorporateAdministrationLegalCompanyDraftRegisteredPayload,
	type CorporateAdministrationLegalCompanyFinancialYearSetPayload,
	type CorporateAdministrationLegalCompanyIdentifierRegisteredPayload,
	type CorporateAdministrationLegalCompanyJurisdictionProfileSetPayload,
	type CorporateAdministrationLegalCompanyLegalFormChangedPayload,
	type CorporateAdministrationLegalCompanyNameAddedPayload,
	type CorporateAdministrationLegalCompanyNameSupersededPayload,
	type CorporateAdministrationLegalCompanyPayload,
	type CorporateAdministrationLegalCompanyProfileUpdatedPayload,
	type CorporateAdministrationLegalEstablishmentRegisteredPayload,
	type CorporateAdministrationLegalEstablishmentStatusChangedPayload,
	type CorporateAdministrationLegalEstablishmentUpdatedPayload,
	type CorporateAdministrationPremiseEndedPayload,
	type CorporateAdministrationPremiseRegisteredPayload,
	type CorporateAdministrationRegisteredAddressSetPayload,
	corporateAdministrationLegalCompanyActivityRegisteredPayloadSchema,
	corporateAdministrationLegalCompanyDraftRegisteredPayloadSchema,
	corporateAdministrationLegalCompanyFinancialYearSetPayloadSchema,
	corporateAdministrationLegalCompanyIdentifierRegisteredPayloadSchema,
	corporateAdministrationLegalCompanyJurisdictionProfileSetPayloadSchema,
	corporateAdministrationLegalCompanyLegalFormChangedPayloadSchema,
	corporateAdministrationLegalCompanyNameAddedPayloadSchema,
	corporateAdministrationLegalCompanyNameSupersededPayloadSchema,
	corporateAdministrationLegalCompanyPayloadSchema,
	corporateAdministrationLegalCompanyProfileUpdatedPayloadSchema,
	corporateAdministrationLegalEstablishmentRegisteredPayloadSchema,
	corporateAdministrationLegalEstablishmentStatusChangedPayloadSchema,
	corporateAdministrationLegalEstablishmentUpdatedPayloadSchema,
	corporateAdministrationPremiseEndedPayloadSchema,
	corporateAdministrationPremiseRegisteredPayloadSchema,
	corporateAdministrationRegisteredAddressSetPayloadSchema,
	deriveHandoffDecimalScale,
	HANDOFF_PAYROLL_CONTRACT_VERSION,
	HUMAN_RESOURCES_ASSIGNMENT_CREATED_EVENT,
	HUMAN_RESOURCES_ASSIGNMENT_ENDED_EVENT,
	HUMAN_RESOURCES_BENEFIT_ENROLLMENT_CHANGED_EVENT,
	HUMAN_RESOURCES_CAREER_PLAN_ACKNOWLEDGED_EVENT,
	HUMAN_RESOURCES_CERTIFICATION_EXPIRING_EVENT,
	HUMAN_RESOURCES_CERTIFICATION_RENEWED_EVENT,
	HUMAN_RESOURCES_COMPENSATION_CHANGED_EVENT,
	HUMAN_RESOURCES_COMPETENCY_ASSESSED_EVENT,
	HUMAN_RESOURCES_COMPETENCY_ASSESSMENT_EXPIRED_EVENT,
	HUMAN_RESOURCES_DEPARTMENT_ACTIVATED_EVENT,
	HUMAN_RESOURCES_DEPARTMENT_ARCHIVED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_CREATED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_TERMINATED_EVENT,
	HUMAN_RESOURCES_EMPLOYEE_TRANSFERRED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_CHANGED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_CONTRACT_CHANGED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_CONTRACT_CREATED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_CONTRACT_SUPERSEDED_EVENT,
	HUMAN_RESOURCES_EMPLOYMENT_STARTED_EVENT,
	HUMAN_RESOURCES_EVENT_IDS,
	HUMAN_RESOURCES_HEADCOUNT_PLAN_APPROVED_EVENT,
	HUMAN_RESOURCES_HEADCOUNT_RESERVATION_CONSUMED_EVENT,
	HUMAN_RESOURCES_HEADCOUNT_RESERVATION_RELEASED_EVENT,
	HUMAN_RESOURCES_HEADCOUNT_RESERVED_EVENT,
	HUMAN_RESOURCES_HIRE_FROM_ACCEPTED_OFFER_COMPLETED_EVENT,
	HUMAN_RESOURCES_JOB_ACTIVATED_EVENT,
	HUMAN_RESOURCES_JOB_ARCHIVED_EVENT,
	HUMAN_RESOURCES_LEARNING_ASSIGNMENT_CREATED_EVENT,
	HUMAN_RESOURCES_LEARNING_COMPLETION_RECORDED_EVENT,
	HUMAN_RESOURCES_LEAVE_APPROVED_EVENT,
	HUMAN_RESOURCES_LEAVE_CANCELLED_EVENT,
	HUMAN_RESOURCES_LEAVE_ENTITLEMENT_ADJUSTED_EVENT,
	HUMAN_RESOURCES_LEAVE_REJECTED_EVENT,
	HUMAN_RESOURCES_LEAVE_REQUESTED_EVENT,
	HUMAN_RESOURCES_OFFBOARDING_COMPLETED_EVENT,
	HUMAN_RESOURCES_OFFBOARDING_STARTED_EVENT,
	HUMAN_RESOURCES_OFFER_ACCEPTED_EVENT,
	HUMAN_RESOURCES_ONBOARDING_COMPLETED_EVENT,
	HUMAN_RESOURCES_ONBOARDING_STARTED_EVENT,
	HUMAN_RESOURCES_POSITION_ACTIVATED_EVENT,
	HUMAN_RESOURCES_POSITION_CLOSED_EVENT,
	HUMAN_RESOURCES_POSITION_FROZEN_EVENT,
	HUMAN_RESOURCES_REPORTING_LINE_ASSIGNED_EVENT,
	HUMAN_RESOURCES_REPORTING_LINE_CLOSED_EVENT,
	HUMAN_RESOURCES_REPORTING_LINE_REPLACED_EVENT,
	HUMAN_RESOURCES_REQUISITION_APPROVED_EVENT,
	HUMAN_RESOURCES_SUCCESSION_CANDIDATE_APPROVED_EVENT,
	HUMAN_RESOURCES_SUCCESSION_READINESS_CHANGED_EVENT,
	HUMAN_RESOURCES_TALENT_POOL_MEMBERSHIP_APPROVED_EVENT,
	HUMAN_RESOURCES_TIME_PAYROLL_HANDOFF_READY_EVENT,
	HUMAN_RESOURCES_TIME_TIMESHEET_APPROVAL_STEP_RECORDED_EVENT,
	HUMAN_RESOURCES_TIMESHEET_APPROVED_EVENT,
	type HumanResourcesEntityPayload,
	HumanResourcesEventSchemas,
	type HumanResourcesEventType,
	handoffDecimalScaleMatchesAmount,
	handoffMoneyAmountSchema,
	humanResourcesEntityPayloadSchema,
	IDENTITY_HUMAN_RESOURCES_LIFECYCLE_FACT_RECORDED_EVENT,
	IdentityEventSchemas,
	type IdentityEventType,
	type IdentityHumanResourcesLifecycleFactPayload,
	type IdentityOrgRoleAssignedPayload,
	identityHumanResourcesLifecycleFactPayloadSchema,
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
	PAYROLL_PAYMENT_CORRECTION_REQUESTED_EVENT,
	PAYROLL_PAYMENT_REQUESTED_EVENT,
	PAYROLL_PAYSLIP_PUBLISHED_EVENT,
	PAYROLL_POSTING_CORRECTION_REQUESTED_EVENT,
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
	PLATFORM_HUMAN_RESOURCES_ACCOUNTING_PROVISIONING_FACT_RECORDED_EVENT,
	PLATFORM_HUMAN_RESOURCES_PAYROLL_DELIVERY_REQUESTED_EVENT,
	PLATFORM_HUMAN_RESOURCES_RELIABILITY_WORK_REQUESTED_EVENT,
	PLATFORM_HUMAN_RESOURCES_REPORTING_FACT_RECORDED_EVENT,
	PLATFORM_HUMAN_RESOURCES_WORKFLOW_FACT_RECORDED_EVENT,
	PlatformEventSchemas,
	type PlatformEventType,
	type PlatformHumanResourcesAccountingProvisioningFactPayload,
	type PlatformHumanResourcesPayrollDeliveryRequestedPayload,
	type PlatformHumanResourcesReliabilityWorkRequestedPayload,
	type PlatformHumanResourcesReportingFactPayload,
	type PlatformHumanResourcesWorkflowFactPayload,
	type PlatformOrganizationDeletedPayload,
	type PurchaseOrderLinePayload,
	type PurchaseOrderPayload,
	PurchasingEventSchemas,
	type PurchasingEventType,
	payablesPayloadSchema,
	paymentPayloadSchema,
	payrollEntityPayloadSchema,
	payrollPaymentCorrectionRequestedPayloadSchema,
	payrollPostingCorrectionRequestedPayloadSchema,
	platformHumanResourcesAccountingProvisioningFactPayloadSchema,
	platformHumanResourcesPayrollDeliveryRequestedPayloadSchema,
	platformHumanResourcesReliabilityWorkRequestedPayloadSchema,
	platformHumanResourcesReportingFactPayloadSchema,
	platformHumanResourcesWorkflowFactPayloadSchema,
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
