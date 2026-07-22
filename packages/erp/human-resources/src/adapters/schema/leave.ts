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
	})
	.strict();

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
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

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
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

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
			delta: leaveQuantitySchema,
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
			managerEmployeeId: humanResourcesEmployeeIdSchema.optional(),
			note: z.string().trim().max(2000).nullable().optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const rejectLeaveRequestInputSchema = humanResourcesMutationContextSchema
	.extend({
		requestId: humanResourcesLeaveRequestIdSchema,
		managerEmployeeId: humanResourcesEmployeeIdSchema.optional(),
		note: z.string().trim().max(2000).nullable().optional(),
		expectedVersion: humanResourcesExpectedVersionSchema,
	})
	.strict();

export const returnLeaveRequestInputSchema = humanResourcesMutationContextSchema
	.extend({
		requestId: humanResourcesLeaveRequestIdSchema,
		managerEmployeeId: humanResourcesEmployeeIdSchema.optional(),
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
			managerEmployeeId: humanResourcesEmployeeIdSchema,
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
		})
		.strict();

export const listTeamCalendarLeaveRequestsInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			managerEmployeeId: humanResourcesEmployeeIdSchema,
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
