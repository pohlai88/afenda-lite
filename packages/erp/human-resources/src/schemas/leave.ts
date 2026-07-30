import { z } from "zod";
import {
	humanResourcesEmployeeIdSchema,
	humanResourcesEmploymentIdSchema,
	humanResourcesLeaveEntitlementIdSchema,
	humanResourcesLeavePolicyIdSchema,
	humanResourcesLeaveRequestIdSchema,
} from "../brands";
import { employmentStatusSchema } from "../shared/employment-status";
import {
	dayPortionSchema,
	leavePolicyAccrualBasisSchema,
	leavePolicyAccrualFrequencySchema,
	leavePolicyEntitlementExpiryRuleSchema,
	leavePolicyStatusSchema,
	leaveRequestStatusSchema,
	leaveTypeSchema,
	leaveUnitSchema,
} from "../shared/leave-status";
import {
	humanResourcesExpectedVersionSchema,
	humanResourcesIdempotencyKeySchema,
	humanResourcesMutationContextSchema,
	isoDateSchema,
} from "./common";

const leaveQuantitySchema = z
	.string()
	.trim()
	.regex(/^\d+(\.\d+)?$/);

const signedLeaveQuantitySchema = z
	.string()
	.trim()
	.regex(/^-?\d+(\.\d+)?$/)
	.refine((value) => {
		const normalized = value.startsWith("-") ? value.slice(1) : value;
		return normalized !== "0" && normalized !== "0.0";
	}, "Adjustment delta must be non-zero");

const leavePolicyBalanceRuleFields = {
	accrualBasis: leavePolicyAccrualBasisSchema.optional(),
	accrualFrequency: leavePolicyAccrualFrequencySchema.nullable().optional(),
	accrualQuantityPerPeriod: leaveQuantitySchema.nullable().optional(),
	carryForwardEnabled: z.boolean().optional(),
	carryForwardMaxQuantity: leaveQuantitySchema.nullable().optional(),
	entitlementExpiryRule: leavePolicyEntitlementExpiryRuleSchema.optional(),
	entitlementExpiryDays: z.number().int().nonnegative().nullable().optional(),
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: The refinement intentionally accumulates all independent balance-rule issues in one parse.
function refineLeavePolicyBalanceRules(
	data: {
		accrualBasis?: "none" | "periodic" | "anniversary" | undefined;
		accrualFrequency?: "monthly" | "annual" | null | undefined;
		accrualQuantityPerPeriod?: string | null | undefined;
		carryForwardEnabled?: boolean | undefined;
		carryForwardMaxQuantity?: string | null | undefined;
		entitlementExpiryRule?:
			| "none"
			| "period_end"
			| "days_after_period_end"
			| undefined;
		entitlementExpiryDays?: number | null | undefined;
	},
	ctx: z.RefinementCtx,
): void {
	const accrualBasis = data.accrualBasis ?? "none";
	const carryForwardEnabled = data.carryForwardEnabled ?? false;
	const entitlementExpiryRule = data.entitlementExpiryRule ?? "none";

	if (accrualBasis === "none") {
		if (data.accrualFrequency !== undefined && data.accrualFrequency !== null) {
			ctx.addIssue({
				code: "custom",
				message: "Accrual frequency must be null when accrual basis is none",
				path: ["accrualFrequency"],
			});
		}
		if (
			data.accrualQuantityPerPeriod !== undefined &&
			data.accrualQuantityPerPeriod !== null
		) {
			ctx.addIssue({
				code: "custom",
				message: "Accrual quantity must be null when accrual basis is none",
				path: ["accrualQuantityPerPeriod"],
			});
		}
	} else {
		if (data.accrualFrequency === undefined || data.accrualFrequency === null) {
			ctx.addIssue({
				code: "custom",
				message: "Accrual frequency is required when accrual basis is set",
				path: ["accrualFrequency"],
			});
		}
		if (
			data.accrualQuantityPerPeriod === undefined ||
			data.accrualQuantityPerPeriod === null
		) {
			ctx.addIssue({
				code: "custom",
				message: "Accrual quantity is required when accrual basis is set",
				path: ["accrualQuantityPerPeriod"],
			});
		}
	}

	if (
		!carryForwardEnabled &&
		data.carryForwardMaxQuantity !== undefined &&
		data.carryForwardMaxQuantity !== null
	) {
		ctx.addIssue({
			code: "custom",
			message:
				"Carry-forward max quantity must be null when carry-forward is disabled",
			path: ["carryForwardMaxQuantity"],
		});
	}

	if (entitlementExpiryRule === "days_after_period_end") {
		if (
			data.entitlementExpiryDays === undefined ||
			data.entitlementExpiryDays === null
		) {
			ctx.addIssue({
				code: "custom",
				message:
					"Entitlement expiry days are required for days_after_period_end rule",
				path: ["entitlementExpiryDays"],
			});
		}
	} else if (
		data.entitlementExpiryDays !== undefined &&
		data.entitlementExpiryDays !== null
	) {
		ctx.addIssue({
			code: "custom",
			message:
				"Entitlement expiry days must be null unless using days_after_period_end rule",
			path: ["entitlementExpiryDays"],
		});
	}
}

export const createLeavePolicyInputSchema = humanResourcesMutationContextSchema
	.extend({
		code: z.string().trim().min(1).max(50),
		name: z.string().trim().min(1).max(200),
		leaveType: leaveTypeSchema,
		unit: leaveUnitSchema,
		paid: z.boolean(),
		sensitive: z.boolean().optional(),
		allowsNegativeBalance: z.boolean().optional(),
		allowSelfApproval: z.boolean().optional(),
		allowsPartialDay: z.boolean().optional(),
		effectiveFrom: isoDateSchema,
		effectiveTo: isoDateSchema.nullable().optional(),
		minTenureDays: z.number().int().nonnegative().nullable().optional(),
		allowedEmploymentStatuses: z.array(employmentStatusSchema).min(1),
		...leavePolicyBalanceRuleFields,
	})
	.strict()
	.superRefine(refineLeavePolicyBalanceRules);

export const updateLeavePolicyInputSchema = humanResourcesMutationContextSchema
	.extend({
		policyId: humanResourcesLeavePolicyIdSchema,
		name: z.string().trim().min(1).max(200).optional(),
		paid: z.boolean().optional(),
		sensitive: z.boolean().optional(),
		allowsNegativeBalance: z.boolean().optional(),
		allowSelfApproval: z.boolean().optional(),
		allowsPartialDay: z.boolean().optional(),
		effectiveTo: isoDateSchema.nullable().optional(),
		minTenureDays: z.number().int().nonnegative().nullable().optional(),
		allowedEmploymentStatuses: z
			.array(employmentStatusSchema)
			.min(1)
			.optional(),
		...leavePolicyBalanceRuleFields,
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict()
	.superRefine((data, ctx) => {
		const hasBalanceRuleField =
			data.accrualBasis !== undefined ||
			data.accrualFrequency !== undefined ||
			data.accrualQuantityPerPeriod !== undefined ||
			data.carryForwardEnabled !== undefined ||
			data.carryForwardMaxQuantity !== undefined ||
			data.entitlementExpiryRule !== undefined ||
			data.entitlementExpiryDays !== undefined;
		if (hasBalanceRuleField) {
			refineLeavePolicyBalanceRules(data, ctx);
		}
	});

export const publishLeavePolicyInputSchema = humanResourcesMutationContextSchema
	.extend({
		policyId: humanResourcesLeavePolicyIdSchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export const supersedeLeavePolicyInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			policyId: humanResourcesLeavePolicyIdSchema,
			code: z.string().trim().min(1).max(50),
			name: z.string().trim().min(1).max(200),
			leaveType: leaveTypeSchema,
			unit: leaveUnitSchema,
			paid: z.boolean(),
			sensitive: z.boolean().optional(),
			allowsNegativeBalance: z.boolean().optional(),
			allowSelfApproval: z.boolean().optional(),
			allowsPartialDay: z.boolean().optional(),
			effectiveFrom: isoDateSchema,
			effectiveTo: isoDateSchema.nullable().optional(),
			minTenureDays: z.number().int().nonnegative().nullable().optional(),
			allowedEmploymentStatuses: z.array(employmentStatusSchema).min(1),
			...leavePolicyBalanceRuleFields,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict()
		.superRefine(refineLeavePolicyBalanceRules);

export const archiveLeavePolicyInputSchema = humanResourcesMutationContextSchema
	.extend({
		policyId: humanResourcesLeavePolicyIdSchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export const getLeavePolicyInputSchema = humanResourcesMutationContextSchema
	.extend({
		policyId: humanResourcesLeavePolicyIdSchema,
	})
	.strict();

export const listLeavePoliciesInputSchema = humanResourcesMutationContextSchema
	.extend({
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		status: leavePolicyStatusSchema.optional(),
	})
	.strict();

export const grantLeaveEntitlementInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
			employmentId: humanResourcesEmploymentIdSchema,
			policyId: humanResourcesLeavePolicyIdSchema,
			periodStart: isoDateSchema,
			periodEnd: isoDateSchema,
			openingQuantity: leaveQuantitySchema,
			idempotencyKey: humanResourcesIdempotencyKeySchema,
		})
		.strict();

export const accrueLeaveEntitlementInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			entitlementId: humanResourcesLeaveEntitlementIdSchema,
			quantity: leaveQuantitySchema.refine(
				(value) => Number(value) > 0,
				"Accrual quantity must be greater than zero",
			),
			accrualPeriodStart: isoDateSchema,
			accrualPeriodEnd: isoDateSchema,
			reason: z.string().trim().min(1).max(500),
			idempotencyKey: humanResourcesIdempotencyKeySchema,
		})
		.strict()
		.refine((value) => value.accrualPeriodEnd >= value.accrualPeriodStart, {
			message: "Accrual period end must not precede its start",
			path: ["accrualPeriodEnd"],
		});

export const carryForwardLeaveEntitlementInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			entitlementId: humanResourcesLeaveEntitlementIdSchema,
			newPeriodStart: isoDateSchema,
			newPeriodEnd: isoDateSchema,
			carriedQuantity: leaveQuantitySchema,
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const expireLeaveEntitlementInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			entitlementId: humanResourcesLeaveEntitlementIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const adjustLeaveEntitlementInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			entitlementId: humanResourcesLeaveEntitlementIdSchema,
			delta: signedLeaveQuantitySchema,
			reason: z.string().trim().min(1).max(500),
			idempotencyKey: humanResourcesIdempotencyKeySchema,
		})
		.strict();

export const getLeaveEntitlementInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			entitlementId: humanResourcesLeaveEntitlementIdSchema,
		})
		.strict();

export const listLeaveEntitlementsInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
			employeeId: humanResourcesEmployeeIdSchema.optional(),
			employmentId: humanResourcesEmploymentIdSchema.optional(),
			policyId: humanResourcesLeavePolicyIdSchema.optional(),
		})
		.strict();

export const getLeaveBalanceInputSchema = humanResourcesMutationContextSchema
	.extend({
		entitlementId: humanResourcesLeaveEntitlementIdSchema,
	})
	.strict();

export const createDraftLeaveRequestInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			employeeId: humanResourcesEmployeeIdSchema,
			entitlementId: humanResourcesLeaveEntitlementIdSchema,
			startDate: isoDateSchema,
			endDate: isoDateSchema,
			requestedQuantity: leaveQuantitySchema,
			dayPortion: dayPortionSchema.optional(),
			isBackdated: z.boolean().optional(),
			backdateJustification: z.string().trim().max(2000).nullable().optional(),
			idempotencyKey: humanResourcesIdempotencyKeySchema,
		})
		.strict();

export const submitLeaveRequestInputSchema = humanResourcesMutationContextSchema
	.extend({
		requestId: humanResourcesLeaveRequestIdSchema,
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export const approveLeaveRequestInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			requestId: humanResourcesLeaveRequestIdSchema,
			note: z.string().trim().max(2000).nullable().optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const rejectLeaveRequestInputSchema = humanResourcesMutationContextSchema
	.extend({
		requestId: humanResourcesLeaveRequestIdSchema,
		note: z.string().trim().max(2000).nullable().optional(),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export const returnLeaveRequestInputSchema = humanResourcesMutationContextSchema
	.extend({
		requestId: humanResourcesLeaveRequestIdSchema,
		note: z.string().trim().max(2000).nullable().optional(),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export const withdrawLeaveRequestInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			requestId: humanResourcesLeaveRequestIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const cancelApprovedLeaveRequestInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			requestId: humanResourcesLeaveRequestIdSchema,
			note: z.string().trim().max(2000).nullable().optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const amendLeaveRequestInputSchema = humanResourcesMutationContextSchema
	.extend({
		requestId: humanResourcesLeaveRequestIdSchema,
		startDate: isoDateSchema,
		endDate: isoDateSchema,
		requestedQuantity: leaveQuantitySchema,
		dayPortion: dayPortionSchema.optional(),
		isBackdated: z.boolean().optional(),
		backdateJustification: z.string().trim().max(2000).nullable().optional(),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export const getLeaveRequestInputSchema = humanResourcesMutationContextSchema
	.extend({
		requestId: humanResourcesLeaveRequestIdSchema,
	})
	.strict();

export const listLeaveRequestsInputSchema = humanResourcesMutationContextSchema
	.extend({
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		employeeId: humanResourcesEmployeeIdSchema.optional(),
		status: leaveRequestStatusSchema.optional(),
	})
	.strict();

export const listPendingApprovalLeaveRequestsInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
		})
		.strict();

export const listTeamCalendarLeaveRequestsInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			rangeStart: isoDateSchema,
			rangeEnd: isoDateSchema,
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
		})
		.strict();

export const getApprovedLeaveHandoffInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			requestId: humanResourcesLeaveRequestIdSchema,
		})
		.strict();

export const resolveApplicableLeavePolicyInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			policyCode: z.string().trim().min(1).max(50),
			employeeId: humanResourcesEmployeeIdSchema,
			employmentId: humanResourcesEmploymentIdSchema,
			asOfDate: isoDateSchema,
		})
		.strict();
