import { z } from "zod";

import {
	payrollExceptionIdSchema,
	payrollPayGroupIdSchema,
	payrollPeriodIdSchema,
	payrollRunIdSchema,
} from "../brands";
import {
	isoDateTimeSchema,
	payrollActorUserIdSchema,
	payrollCorrelationIdSchema,
	payrollExpectedVersionSchema,
	payrollIdempotencyKeySchema,
	payrollOrganizationIdSchema,
} from "./common";

export const payrollRunTypeSchema = z.enum([
	"regular",
	"off_cycle",
	"adjustment",
]);
export const payrollRunStatusSchema = z.enum([
	"draft",
	"calculating",
	"calculated",
	"failed",
	"finalized",
	"reversed",
]);
export const payrollExceptionSeveritySchema = z.enum(["blocking", "warning"]);

export const payrollRoundingPolicySchema = z.record(z.string(), z.unknown());

export const payrollRunRecordSchema = z.object({
	id: payrollRunIdSchema,
	organizationId: payrollOrganizationIdSchema,
	payGroupId: payrollPayGroupIdSchema,
	periodId: payrollPeriodIdSchema,
	runType: payrollRunTypeSchema,
	sequence: z.number().int().positive(),
	status: payrollRunStatusSchema,
	finalizedAt: isoDateTimeSchema.nullable(),
	finalizedBy: payrollActorUserIdSchema.nullable(),
	calculationSnapshotHash: z.string().trim().min(1).max(256).nullable(),
	calculationVersion: z.string().trim().min(1).max(64).nullable(),
	roundingPolicyJson: payrollRoundingPolicySchema.nullable(),
	version: z.number().int().positive(),
	createdBy: payrollActorUserIdSchema,
	updatedBy: payrollActorUserIdSchema,
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});

export const payrollExceptionRecordSchema = z.object({
	id: payrollExceptionIdSchema,
	organizationId: payrollOrganizationIdSchema,
	runId: payrollRunIdSchema,
	severity: payrollExceptionSeveritySchema,
	exceptionCode: z.string().trim().min(1).max(64),
	message: z.string().trim().min(1).max(2048),
	employeeRef: z.string().trim().min(1).max(128).nullable(),
	createdBy: payrollActorUserIdSchema,
	createdAt: z.coerce.date(),
});

export const payrollRunCreateRecordSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		payGroupId: payrollPayGroupIdSchema,
		periodId: payrollPeriodIdSchema,
		runType: payrollRunTypeSchema,
		sequence: z.number().int().positive().default(1),
		idempotencyKey: payrollIdempotencyKeySchema,
		createRequestFingerprint: z.string().trim().min(1).max(256),
		createdBy: payrollActorUserIdSchema,
		correlationId: payrollCorrelationIdSchema,
	})
	.strict();

export const payrollRunUpdateInputSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		runId: payrollRunIdSchema,
		status: payrollRunStatusSchema.optional(),
		calculationSnapshotHash: z.string().trim().min(1).max(256).nullable().optional(),
		calculationVersion: z.string().trim().min(1).max(64).nullable().optional(),
		roundingPolicyJson: payrollRoundingPolicySchema.nullable().optional(),
		finalizedAt: isoDateTimeSchema.nullable().optional(),
		finalizedBy: payrollActorUserIdSchema.nullable().optional(),
		expectedVersion: payrollExpectedVersionSchema,
		actorUserId: payrollActorUserIdSchema,
		correlationId: payrollCorrelationIdSchema,
	})
	.strict();

export const payrollExceptionCreateRecordSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		runId: payrollRunIdSchema,
		severity: payrollExceptionSeveritySchema,
		exceptionCode: z.string().trim().min(1).max(64),
		message: z.string().trim().min(1).max(2048),
		employeeRef: z.string().trim().min(1).max(128).nullable(),
		createdBy: payrollActorUserIdSchema,
		correlationId: payrollCorrelationIdSchema,
	})
	.strict();

export const createPayrollRunInputSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		payGroupId: payrollPayGroupIdSchema,
		periodId: payrollPeriodIdSchema,
		runType: payrollRunTypeSchema,
		sequence: z.number().int().positive().default(1),
		idempotencyKey: payrollIdempotencyKeySchema,
		actorUserId: payrollActorUserIdSchema,
		correlationId: payrollCorrelationIdSchema,
	})
	.strict();

export const getPayrollRunInputSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		runId: payrollRunIdSchema,
		actorUserId: payrollActorUserIdSchema,
	})
	.strict();

export const calculatePayrollRunInputSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		runId: payrollRunIdSchema,
		expectedVersion: payrollExpectedVersionSchema,
		actorUserId: payrollActorUserIdSchema,
		correlationId: payrollCorrelationIdSchema,
	})
	.strict();

export const finalizePayrollRunInputSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		runId: payrollRunIdSchema,
		expectedVersion: payrollExpectedVersionSchema,
		actorUserId: payrollActorUserIdSchema,
		correlationId: payrollCorrelationIdSchema,
	})
	.strict();

export const reversePayrollRunInputSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		runId: payrollRunIdSchema,
		expectedVersion: payrollExpectedVersionSchema,
		reason: z.string().trim().min(1).max(512),
		actorUserId: payrollActorUserIdSchema,
		correlationId: payrollCorrelationIdSchema,
	})
	.strict();

export const recordPayrollExceptionInputSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		runId: payrollRunIdSchema,
		severity: payrollExceptionSeveritySchema,
		exceptionCode: z.string().trim().min(1).max(64),
		message: z.string().trim().min(1).max(2048),
		employeeRef: z.string().trim().min(1).max(128).nullable().default(null),
		actorUserId: payrollActorUserIdSchema,
		correlationId: payrollCorrelationIdSchema,
	})
	.strict();

export const listPayrollExceptionsForRunInputSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		runId: payrollRunIdSchema,
		actorUserId: payrollActorUserIdSchema,
	})
	.strict();
