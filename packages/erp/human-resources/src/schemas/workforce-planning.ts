import { z } from "zod";
import {
	humanResourcesDepartmentIdSchema,
	humanResourcesHeadcountPlanIdSchema,
	humanResourcesHeadcountPlanLineIdSchema,
	humanResourcesHeadcountReservationIdSchema,
	humanResourcesJobIdSchema,
	humanResourcesPositionIdSchema,
	humanResourcesRequisitionIdSchema,
} from "../brands";
import {
	headcountEmploymentTypeSchema,
	headcountPlanStatusSchema,
} from "../shared/workforce-planning-status";
import {
	humanResourcesExpectedVersionSchema,
	humanResourcesIdempotencyKeySchema,
	humanResourcesMutationContextSchema,
	isoDateSchema,
} from "./common";

const headcountFteSchema = z
	.string()
	.regex(/^\d+(\.\d{1,4})?$/)
	.refine((value) => Number(value) >= 0, "FTE cannot be negative");

export const createHeadcountPlanInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			code: z.string().trim().min(1).max(64),
			title: z.string().trim().min(1).max(200),
			planningScopeKey: z.string().trim().min(1).max(128),
			periodStart: isoDateSchema,
			periodEnd: isoDateSchema,
			costEnvelopeAmount: z.string().trim().optional(),
			costEnvelopeCurrencyCode: z.string().trim().length(3).optional(),
		})
		.strict();

export const updateHeadcountPlanInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			planId: humanResourcesHeadcountPlanIdSchema,
			title: z.string().trim().min(1).max(200).optional(),
			costEnvelopeAmount: z.string().trim().nullable().optional(),
			costEnvelopeCurrencyCode: z
				.string()
				.trim()
				.length(3)
				.nullable()
				.optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const addHeadcountPlanLineInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			planId: humanResourcesHeadcountPlanIdSchema,
			departmentId: humanResourcesDepartmentIdSchema.optional(),
			jobId: humanResourcesJobIdSchema.optional(),
			positionId: humanResourcesPositionIdSchema.optional(),
			locationCode: z.string().trim().max(64).optional(),
			employmentType: headcountEmploymentTypeSchema.optional(),
			plannedFte: headcountFteSchema,
			plannedHeadcount: z.number().int().nonnegative(),
			costEnvelopeAmount: z.string().trim().optional(),
			costEnvelopeCurrencyCode: z.string().trim().length(3).optional(),
		})
		.strict();

export const updateHeadcountPlanLineInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			planLineId: humanResourcesHeadcountPlanLineIdSchema,
			departmentId: humanResourcesDepartmentIdSchema.nullable().optional(),
			jobId: humanResourcesJobIdSchema.nullable().optional(),
			positionId: humanResourcesPositionIdSchema.nullable().optional(),
			locationCode: z.string().trim().max(64).nullable().optional(),
			employmentType: headcountEmploymentTypeSchema.nullable().optional(),
			plannedFte: headcountFteSchema.optional(),
			plannedHeadcount: z.number().int().nonnegative().optional(),
			costEnvelopeAmount: z.string().trim().nullable().optional(),
			costEnvelopeCurrencyCode: z
				.string()
				.trim()
				.length(3)
				.nullable()
				.optional(),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const removeHeadcountPlanLineInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			planLineId: humanResourcesHeadcountPlanLineIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const headcountPlanStatusTransitionInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			planId: humanResourcesHeadcountPlanIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
			rejectionReason: z.string().trim().max(500).optional(),
		})
		.strict();

export const supersedeHeadcountPlanInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			planId: humanResourcesHeadcountPlanIdSchema,
			idempotencyKey: humanResourcesIdempotencyKeySchema,
			code: z.string().trim().min(1).max(64),
			title: z.string().trim().min(1).max(200),
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const reserveHeadcountInputSchema = humanResourcesMutationContextSchema
	.extend({
		idempotencyKey: humanResourcesIdempotencyKeySchema,
		planLineId: humanResourcesHeadcountPlanLineIdSchema,
		requisitionId: humanResourcesRequisitionIdSchema,
		reservedFte: headcountFteSchema,
		reservedHeadcount: z.number().int().nonnegative(),
	})
	.strict();

export const releaseHeadcountReservationInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			reservationId: humanResourcesHeadcountReservationIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const consumeHeadcountReservationInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			reservationId: humanResourcesHeadcountReservationIdSchema,
			expectedVersion: humanResourcesExpectedVersionSchema,
		})
		.strict();

export const getHeadcountPlanByIdInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			planId: humanResourcesHeadcountPlanIdSchema,
		})
		.strict();

export const listHeadcountPlansInputSchema = humanResourcesMutationContextSchema
	.extend({
		page: z.number().int().positive().optional(),
		pageSize: z.number().int().positive().max(100).optional(),
		status: headcountPlanStatusSchema.optional(),
		planningScopeKey: z.string().trim().optional(),
	})
	.strict();

export const getApprovedHeadcountPlanInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			planningScopeKey: z.string().trim().min(1).max(128),
			periodStart: isoDateSchema,
			periodEnd: isoDateSchema,
		})
		.strict();

export const getHeadcountAvailabilityInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			planLineId: humanResourcesHeadcountPlanLineIdSchema,
		})
		.strict();

export const listHeadcountReservationsInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			page: z.number().int().positive().optional(),
			pageSize: z.number().int().positive().max(100).optional(),
			planId: humanResourcesHeadcountPlanIdSchema.optional(),
			requisitionId: humanResourcesRequisitionIdSchema.optional(),
		})
		.strict();

export const getRecruitmentHeadcountHandoffInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			requisitionId: humanResourcesRequisitionIdSchema,
		})
		.strict();

export const getWorkforcePlanVarianceInputSchema =
	humanResourcesMutationContextSchema
		.extend({
			planId: humanResourcesHeadcountPlanIdSchema,
		})
		.strict();
