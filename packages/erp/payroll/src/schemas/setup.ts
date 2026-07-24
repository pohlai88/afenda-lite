import { z } from "zod";

import {
	payrollCalendarIdSchema,
	payrollDeductionRuleIdSchema,
	payrollEarningRuleIdSchema,
	payrollPayGroupIdSchema,
	payrollPeriodIdSchema,
	payrollStatutoryRuleIdSchema,
} from "../brands";
import {
	isoDateSchema,
	payrollActorUserIdSchema,
	payrollCorrelationIdSchema,
	payrollDecimalStringSchema,
	payrollExpectedVersionSchema,
	payrollIdempotencyKeySchema,
	payrollMutationContextSchema,
	payrollOrganizationIdSchema,
} from "./common";

export const payrollCalendarStatusSchema = z.enum(["active", "archived"]);
export const payrollPayGroupStatusSchema = z.enum(["active", "archived"]);
export const payrollPeriodStatusSchema = z.enum(["open", "closed"]);
export const payrollRuleTypeSchema = z.enum(["fixed", "rate"]);
export const payrollRuleStatusSchema = z.enum([
	"active",
	"superseded",
	"archived",
]);

export const payrollDeductionTaxTimingSchema = z.enum(["pre_tax", "post_tax"]);

export { payrollDecimalStringSchema } from "./common";

export const payrollCalendarRecordSchema = z.object({
	id: payrollCalendarIdSchema,
	organizationId: payrollOrganizationIdSchema,
	code: z.string().trim().min(1).max(64),
	name: z.string().trim().min(1).max(256),
	timezone: z.string().trim().min(1).max(64),
	status: payrollCalendarStatusSchema,
	effectiveFrom: isoDateSchema,
	effectiveTo: isoDateSchema.nullable(),
	version: z.number().int().positive(),
	createdBy: payrollActorUserIdSchema,
	updatedBy: payrollActorUserIdSchema,
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});

export const payrollPayGroupRecordSchema = z.object({
	id: payrollPayGroupIdSchema,
	organizationId: payrollOrganizationIdSchema,
	calendarId: payrollCalendarIdSchema,
	code: z.string().trim().min(1).max(64),
	name: z.string().trim().min(1).max(256),
	currencyCode: z.string().trim().length(3),
	status: payrollPayGroupStatusSchema,
	version: z.number().int().positive(),
	createdBy: payrollActorUserIdSchema,
	updatedBy: payrollActorUserIdSchema,
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});

export const payrollPeriodRecordSchema = z.object({
	id: payrollPeriodIdSchema,
	organizationId: payrollOrganizationIdSchema,
	payGroupId: payrollPayGroupIdSchema,
	periodStart: isoDateSchema,
	periodEnd: isoDateSchema,
	cutoffDate: isoDateSchema,
	status: payrollPeriodStatusSchema,
	version: z.number().int().positive(),
	createdBy: payrollActorUserIdSchema,
	updatedBy: payrollActorUserIdSchema,
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});

export const payrollEarningRuleRecordSchema = z.object({
	id: payrollEarningRuleIdSchema,
	organizationId: payrollOrganizationIdSchema,
	payGroupId: payrollPayGroupIdSchema,
	code: z.string().trim().min(1).max(64),
	name: z.string().trim().min(1).max(256),
	ruleType: payrollRuleTypeSchema,
	amount: payrollDecimalStringSchema.nullable(),
	rate: payrollDecimalStringSchema.nullable(),
	currencyCode: z.string().trim().length(3),
	ruleVersion: z.string().trim().min(1).max(64),
	status: payrollRuleStatusSchema,
	effectiveFrom: isoDateSchema,
	effectiveTo: isoDateSchema.nullable(),
	version: z.number().int().positive(),
	createdBy: payrollActorUserIdSchema,
	updatedBy: payrollActorUserIdSchema,
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});

export const payrollDeductionRuleRecordSchema =
	payrollEarningRuleRecordSchema.extend({
		id: payrollDeductionRuleIdSchema,
		taxTiming: payrollDeductionTaxTimingSchema,
	});

export const payrollStatutoryRuleRecordSchema = z.object({
	id: payrollStatutoryRuleIdSchema,
	organizationId: payrollOrganizationIdSchema,
	payGroupId: payrollPayGroupIdSchema,
	code: z.string().trim().min(1).max(64),
	name: z.string().trim().min(1).max(256),
	jurisdictionCode: z.string().trim().min(1).max(64),
	configJson: z.record(z.string(), z.unknown()),
	ruleVersion: z.string().trim().min(1).max(64),
	status: payrollRuleStatusSchema,
	effectiveFrom: isoDateSchema,
	effectiveTo: isoDateSchema.nullable(),
	version: z.number().int().positive(),
	createdBy: payrollActorUserIdSchema,
	updatedBy: payrollActorUserIdSchema,
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});

export const payrollCalendarCreateRecordSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		code: z.string().trim().min(1).max(64),
		name: z.string().trim().min(1).max(256),
		timezone: z.string().trim().min(1).max(64),
		effectiveFrom: isoDateSchema,
		effectiveTo: isoDateSchema.nullable(),
		idempotencyKey: payrollIdempotencyKeySchema,
		createRequestFingerprint: z.string().trim().min(1).max(256),
		createdBy: payrollActorUserIdSchema,
		correlationId: payrollCorrelationIdSchema,
	})
	.strict();

export const payrollPayGroupCreateRecordSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		calendarId: payrollCalendarIdSchema,
		code: z.string().trim().min(1).max(64),
		name: z.string().trim().min(1).max(256),
		currencyCode: z.string().trim().length(3),
		idempotencyKey: payrollIdempotencyKeySchema,
		createRequestFingerprint: z.string().trim().min(1).max(256),
		createdBy: payrollActorUserIdSchema,
		correlationId: payrollCorrelationIdSchema,
	})
	.strict();

export const payrollPeriodCreateRecordSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		payGroupId: payrollPayGroupIdSchema,
		periodStart: isoDateSchema,
		periodEnd: isoDateSchema,
		cutoffDate: isoDateSchema,
		idempotencyKey: payrollIdempotencyKeySchema,
		createRequestFingerprint: z.string().trim().min(1).max(256),
		createdBy: payrollActorUserIdSchema,
		correlationId: payrollCorrelationIdSchema,
	})
	.strict()
	.refine((value) => value.periodEnd >= value.periodStart, {
		message: "periodEnd must be on or after periodStart",
	});

export const payrollEarningRuleCreateRecordSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		payGroupId: payrollPayGroupIdSchema,
		code: z.string().trim().min(1).max(64),
		name: z.string().trim().min(1).max(256),
		ruleType: payrollRuleTypeSchema,
		amount: payrollDecimalStringSchema.nullable(),
		rate: payrollDecimalStringSchema.nullable(),
		currencyCode: z.string().trim().length(3),
		ruleVersion: z.string().trim().min(1).max(64),
		effectiveFrom: isoDateSchema,
		effectiveTo: isoDateSchema.nullable(),
		idempotencyKey: payrollIdempotencyKeySchema,
		createRequestFingerprint: z.string().trim().min(1).max(256),
		createdBy: payrollActorUserIdSchema,
		correlationId: payrollCorrelationIdSchema,
	})
	.strict()
	.refine(
		(value) =>
			(value.ruleType === "fixed" && value.amount !== null) ||
			(value.ruleType === "rate" && value.rate !== null),
		{ message: "fixed rules require amount; rate rules require rate" },
	);

export const payrollDeductionRuleCreateRecordSchema =
	payrollEarningRuleCreateRecordSchema.extend({
		taxTiming: payrollDeductionTaxTimingSchema,
	});

export const payrollStatutoryRuleCreateRecordSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		payGroupId: payrollPayGroupIdSchema,
		code: z.string().trim().min(1).max(64),
		name: z.string().trim().min(1).max(256),
		jurisdictionCode: z.string().trim().min(1).max(64),
		configJson: z.record(z.string(), z.unknown()).default({}),
		ruleVersion: z.string().trim().min(1).max(64),
		effectiveFrom: isoDateSchema,
		effectiveTo: isoDateSchema.nullable(),
		idempotencyKey: payrollIdempotencyKeySchema,
		createRequestFingerprint: z.string().trim().min(1).max(256),
		createdBy: payrollActorUserIdSchema,
		correlationId: payrollCorrelationIdSchema,
	})
	.strict();

export const payrollCalendarUpdateInputSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		calendarId: payrollCalendarIdSchema,
		name: z.string().trim().min(1).max(256).optional(),
		timezone: z.string().trim().min(1).max(64).optional(),
		effectiveTo: isoDateSchema.nullable().optional(),
		expectedVersion: payrollExpectedVersionSchema,
		actorUserId: payrollActorUserIdSchema,
		correlationId: payrollCorrelationIdSchema,
	})
	.strict();

export const createPayrollCalendarInputSchema = payrollMutationContextSchema
	.extend({
		code: z.string().trim().min(1).max(64),
		name: z.string().trim().min(1).max(256),
		timezone: z.string().trim().min(1).max(64),
		effectiveFrom: isoDateSchema,
		effectiveTo: isoDateSchema.nullable().optional(),
		idempotencyKey: payrollIdempotencyKeySchema,
	})
	.strict();

export const updatePayrollCalendarInputSchema =
	payrollCalendarUpdateInputSchema;

export const archivePayrollCalendarInputSchema = payrollMutationContextSchema
	.extend({
		calendarId: payrollCalendarIdSchema,
		expectedVersion: payrollExpectedVersionSchema,
	})
	.strict();

export const getPayrollCalendarInputSchema = payrollMutationContextSchema
	.extend({
		calendarId: payrollCalendarIdSchema,
	})
	.strict();

export const listPayrollCalendarsInputSchema = payrollMutationContextSchema
	.extend({
		status: payrollCalendarStatusSchema.optional(),
	})
	.strict();

export const createPayrollPayGroupInputSchema = payrollMutationContextSchema
	.extend({
		calendarId: payrollCalendarIdSchema,
		code: z.string().trim().min(1).max(64),
		name: z.string().trim().min(1).max(256),
		currencyCode: z.string().trim().length(3),
		idempotencyKey: payrollIdempotencyKeySchema,
	})
	.strict();

export const updatePayrollPayGroupInputSchema = payrollMutationContextSchema
	.extend({
		payGroupId: payrollPayGroupIdSchema,
		name: z.string().trim().min(1).max(256).optional(),
		currencyCode: z.string().trim().length(3).optional(),
		expectedVersion: payrollExpectedVersionSchema,
	})
	.strict();

export const archivePayrollPayGroupInputSchema = payrollMutationContextSchema
	.extend({
		payGroupId: payrollPayGroupIdSchema,
		expectedVersion: payrollExpectedVersionSchema,
	})
	.strict();

export const getPayrollPayGroupInputSchema = payrollMutationContextSchema
	.extend({
		payGroupId: payrollPayGroupIdSchema,
	})
	.strict();

export const listPayrollPayGroupsInputSchema = payrollMutationContextSchema
	.extend({
		status: payrollPayGroupStatusSchema.optional(),
	})
	.strict();

export const createPayrollPeriodInputSchema = payrollMutationContextSchema
	.extend({
		payGroupId: payrollPayGroupIdSchema,
		periodStart: isoDateSchema,
		periodEnd: isoDateSchema,
		cutoffDate: isoDateSchema,
		idempotencyKey: payrollIdempotencyKeySchema,
	})
	.strict()
	.refine((value) => value.periodEnd >= value.periodStart, {
		message: "periodEnd must be on or after periodStart",
	});

export const updatePayrollPeriodInputSchema = payrollMutationContextSchema
	.extend({
		periodId: payrollPeriodIdSchema,
		cutoffDate: isoDateSchema.optional(),
		expectedVersion: payrollExpectedVersionSchema,
	})
	.strict();

export const closePayrollPeriodInputSchema = payrollMutationContextSchema
	.extend({
		periodId: payrollPeriodIdSchema,
		expectedVersion: payrollExpectedVersionSchema,
	})
	.strict();

export const getPayrollPeriodInputSchema = payrollMutationContextSchema
	.extend({
		periodId: payrollPeriodIdSchema,
	})
	.strict();

export const listPayrollPeriodsInputSchema = payrollMutationContextSchema
	.extend({
		payGroupId: payrollPayGroupIdSchema,
		status: payrollPeriodStatusSchema.optional(),
	})
	.strict();

const payrollAmountRateRuleFieldsSchema = z
	.object({
		name: z.string().trim().min(1).max(256).optional(),
		amount: payrollDecimalStringSchema.nullable().optional(),
		rate: payrollDecimalStringSchema.nullable().optional(),
		effectiveTo: isoDateSchema.nullable().optional(),
		expectedVersion: payrollExpectedVersionSchema,
	})
	.strict();

export const createPayrollEarningRuleInputSchema = payrollMutationContextSchema
	.extend({
		payGroupId: payrollPayGroupIdSchema,
		code: z.string().trim().min(1).max(64),
		name: z.string().trim().min(1).max(256),
		ruleType: payrollRuleTypeSchema,
		amount: payrollDecimalStringSchema.nullable(),
		rate: payrollDecimalStringSchema.nullable(),
		currencyCode: z.string().trim().length(3),
		ruleVersion: z.string().trim().min(1).max(64),
		effectiveFrom: isoDateSchema,
		effectiveTo: isoDateSchema.nullable().optional(),
		idempotencyKey: payrollIdempotencyKeySchema,
	})
	.strict()
	.refine(
		(value) =>
			(value.ruleType === "fixed" && value.amount !== null) ||
			(value.ruleType === "rate" && value.rate !== null),
		{ message: "fixed rules require amount; rate rules require rate" },
	);

export const updatePayrollEarningRuleInputSchema =
	payrollMutationContextSchema
		.extend({
			ruleId: payrollEarningRuleIdSchema,
			...payrollAmountRateRuleFieldsSchema.shape,
		})
		.strict();

export const archivePayrollEarningRuleInputSchema =
	payrollMutationContextSchema
		.extend({
			ruleId: payrollEarningRuleIdSchema,
			expectedVersion: payrollExpectedVersionSchema,
		})
		.strict();

export const supersedePayrollEarningRuleInputSchema =
	payrollMutationContextSchema
		.extend({
			ruleId: payrollEarningRuleIdSchema,
			name: z.string().trim().min(1).max(256).optional(),
			ruleType: payrollRuleTypeSchema.optional(),
			amount: payrollDecimalStringSchema.nullable().optional(),
			rate: payrollDecimalStringSchema.nullable().optional(),
			currencyCode: z.string().trim().length(3).optional(),
			ruleVersion: z.string().trim().min(1).max(64),
			effectiveFrom: isoDateSchema,
			effectiveTo: isoDateSchema.nullable().optional(),
			expectedVersion: payrollExpectedVersionSchema,
			idempotencyKey: payrollIdempotencyKeySchema,
		})
		.strict();

export const getPayrollEarningRuleInputSchema = payrollMutationContextSchema
	.extend({
		ruleId: payrollEarningRuleIdSchema,
	})
	.strict();

export const createPayrollDeductionRuleInputSchema =
	createPayrollEarningRuleInputSchema.extend({
		taxTiming: payrollDeductionTaxTimingSchema,
	});

export const updatePayrollDeductionRuleInputSchema =
	payrollMutationContextSchema
		.extend({
			ruleId: payrollDeductionRuleIdSchema,
			...payrollAmountRateRuleFieldsSchema.shape,
			taxTiming: payrollDeductionTaxTimingSchema.optional(),
		})
		.strict();

export const archivePayrollDeductionRuleInputSchema =
	payrollMutationContextSchema
		.extend({
			ruleId: payrollDeductionRuleIdSchema,
			expectedVersion: payrollExpectedVersionSchema,
		})
		.strict();

export const supersedePayrollDeductionRuleInputSchema =
	payrollMutationContextSchema
		.extend({
			ruleId: payrollDeductionRuleIdSchema,
			name: z.string().trim().min(1).max(256).optional(),
			ruleType: payrollRuleTypeSchema.optional(),
			amount: payrollDecimalStringSchema.nullable().optional(),
			rate: payrollDecimalStringSchema.nullable().optional(),
			currencyCode: z.string().trim().length(3).optional(),
			taxTiming: payrollDeductionTaxTimingSchema.optional(),
			ruleVersion: z.string().trim().min(1).max(64),
			effectiveFrom: isoDateSchema,
			effectiveTo: isoDateSchema.nullable().optional(),
			expectedVersion: payrollExpectedVersionSchema,
			idempotencyKey: payrollIdempotencyKeySchema,
		})
		.strict();

export const getPayrollDeductionRuleInputSchema = payrollMutationContextSchema
	.extend({
		ruleId: payrollDeductionRuleIdSchema,
	})
	.strict();

export const createPayrollStatutoryRuleInputSchema =
	payrollMutationContextSchema
		.extend({
			payGroupId: payrollPayGroupIdSchema,
			code: z.string().trim().min(1).max(64),
			name: z.string().trim().min(1).max(256),
			jurisdictionCode: z.string().trim().min(1).max(64),
			configJson: z.record(z.string(), z.unknown()).default({}),
			ruleVersion: z.string().trim().min(1).max(64),
			effectiveFrom: isoDateSchema,
			effectiveTo: isoDateSchema.nullable().optional(),
			idempotencyKey: payrollIdempotencyKeySchema,
		})
		.strict();

export const updatePayrollStatutoryRuleInputSchema =
	payrollMutationContextSchema
		.extend({
			ruleId: payrollStatutoryRuleIdSchema,
			name: z.string().trim().min(1).max(256).optional(),
			jurisdictionCode: z.string().trim().min(1).max(64).optional(),
			configJson: z.record(z.string(), z.unknown()).optional(),
			effectiveTo: isoDateSchema.nullable().optional(),
			expectedVersion: payrollExpectedVersionSchema,
		})
		.strict();

export const archivePayrollStatutoryRuleInputSchema =
	payrollMutationContextSchema
		.extend({
			ruleId: payrollStatutoryRuleIdSchema,
			expectedVersion: payrollExpectedVersionSchema,
		})
		.strict();

export const supersedePayrollStatutoryRuleInputSchema =
	payrollMutationContextSchema
		.extend({
			ruleId: payrollStatutoryRuleIdSchema,
			name: z.string().trim().min(1).max(256).optional(),
			jurisdictionCode: z.string().trim().min(1).max(64).optional(),
			configJson: z.record(z.string(), z.unknown()).optional(),
			ruleVersion: z.string().trim().min(1).max(64),
			effectiveFrom: isoDateSchema,
			effectiveTo: isoDateSchema.nullable().optional(),
			expectedVersion: payrollExpectedVersionSchema,
			idempotencyKey: payrollIdempotencyKeySchema,
		})
		.strict();

export const getPayrollStatutoryRuleInputSchema = payrollMutationContextSchema
	.extend({
		ruleId: payrollStatutoryRuleIdSchema,
	})
	.strict();

export const payrollPayGroupUpdateInputSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		payGroupId: payrollPayGroupIdSchema,
		name: z.string().trim().min(1).max(256).optional(),
		currencyCode: z.string().trim().length(3).optional(),
		expectedVersion: payrollExpectedVersionSchema,
		actorUserId: payrollActorUserIdSchema,
		correlationId: payrollCorrelationIdSchema,
	})
	.strict();

export const payrollPayGroupArchiveInputSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		payGroupId: payrollPayGroupIdSchema,
		expectedVersion: payrollExpectedVersionSchema,
		actorUserId: payrollActorUserIdSchema,
		correlationId: payrollCorrelationIdSchema,
	})
	.strict();

export const payrollCalendarArchiveInputSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		calendarId: payrollCalendarIdSchema,
		expectedVersion: payrollExpectedVersionSchema,
		actorUserId: payrollActorUserIdSchema,
		correlationId: payrollCorrelationIdSchema,
	})
	.strict();

export const payrollPeriodUpdateInputSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		periodId: payrollPeriodIdSchema,
		cutoffDate: isoDateSchema.optional(),
		expectedVersion: payrollExpectedVersionSchema,
		actorUserId: payrollActorUserIdSchema,
		correlationId: payrollCorrelationIdSchema,
	})
	.strict();

export const payrollPeriodCloseInputSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		periodId: payrollPeriodIdSchema,
		expectedVersion: payrollExpectedVersionSchema,
		actorUserId: payrollActorUserIdSchema,
		correlationId: payrollCorrelationIdSchema,
	})
	.strict();

export const payrollEarningRuleUpdateInputSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		ruleId: payrollEarningRuleIdSchema,
		name: z.string().trim().min(1).max(256).optional(),
		amount: payrollDecimalStringSchema.nullable().optional(),
		rate: payrollDecimalStringSchema.nullable().optional(),
		effectiveTo: isoDateSchema.nullable().optional(),
		expectedVersion: payrollExpectedVersionSchema,
		actorUserId: payrollActorUserIdSchema,
		correlationId: payrollCorrelationIdSchema,
	})
	.strict();

export const payrollEarningRuleArchiveInputSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		ruleId: payrollEarningRuleIdSchema,
		expectedVersion: payrollExpectedVersionSchema,
		actorUserId: payrollActorUserIdSchema,
		correlationId: payrollCorrelationIdSchema,
	})
	.strict();

export const payrollEarningRuleSupersedeRecordSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		ruleId: payrollEarningRuleIdSchema,
		name: z.string().trim().min(1).max(256).optional(),
		ruleType: payrollRuleTypeSchema.optional(),
		amount: payrollDecimalStringSchema.nullable().optional(),
		rate: payrollDecimalStringSchema.nullable().optional(),
		currencyCode: z.string().trim().length(3).optional(),
		ruleVersion: z.string().trim().min(1).max(64),
		effectiveFrom: isoDateSchema,
		effectiveTo: isoDateSchema.nullable().optional(),
		expectedVersion: payrollExpectedVersionSchema,
		idempotencyKey: payrollIdempotencyKeySchema,
		createRequestFingerprint: z.string().trim().min(1).max(256),
		createdBy: payrollActorUserIdSchema,
		correlationId: payrollCorrelationIdSchema,
	})
	.strict();

export const payrollDeductionRuleUpdateInputSchema =
	payrollEarningRuleUpdateInputSchema.extend({
		ruleId: payrollDeductionRuleIdSchema,
		taxTiming: payrollDeductionTaxTimingSchema.optional(),
	});

export const payrollDeductionRuleArchiveInputSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		ruleId: payrollDeductionRuleIdSchema,
		expectedVersion: payrollExpectedVersionSchema,
		actorUserId: payrollActorUserIdSchema,
		correlationId: payrollCorrelationIdSchema,
	})
	.strict();

export const payrollDeductionRuleSupersedeRecordSchema =
	payrollEarningRuleSupersedeRecordSchema.extend({
		ruleId: payrollDeductionRuleIdSchema,
		taxTiming: payrollDeductionTaxTimingSchema.optional(),
	});

export const payrollStatutoryRuleUpdateInputSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		ruleId: payrollStatutoryRuleIdSchema,
		name: z.string().trim().min(1).max(256).optional(),
		jurisdictionCode: z.string().trim().min(1).max(64).optional(),
		configJson: z.record(z.string(), z.unknown()).optional(),
		effectiveTo: isoDateSchema.nullable().optional(),
		expectedVersion: payrollExpectedVersionSchema,
		actorUserId: payrollActorUserIdSchema,
		correlationId: payrollCorrelationIdSchema,
	})
	.strict();

export const payrollStatutoryRuleArchiveInputSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		ruleId: payrollStatutoryRuleIdSchema,
		expectedVersion: payrollExpectedVersionSchema,
		actorUserId: payrollActorUserIdSchema,
		correlationId: payrollCorrelationIdSchema,
	})
	.strict();

export const payrollStatutoryRuleSupersedeRecordSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		ruleId: payrollStatutoryRuleIdSchema,
		name: z.string().trim().min(1).max(256).optional(),
		jurisdictionCode: z.string().trim().min(1).max(64).optional(),
		configJson: z.record(z.string(), z.unknown()).optional(),
		ruleVersion: z.string().trim().min(1).max(64),
		effectiveFrom: isoDateSchema,
		effectiveTo: isoDateSchema.nullable().optional(),
		expectedVersion: payrollExpectedVersionSchema,
		idempotencyKey: payrollIdempotencyKeySchema,
		createRequestFingerprint: z.string().trim().min(1).max(256),
		createdBy: payrollActorUserIdSchema,
		correlationId: payrollCorrelationIdSchema,
	})
	.strict();
