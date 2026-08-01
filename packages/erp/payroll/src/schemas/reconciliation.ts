import { z } from "zod";
import { payrollReconciliationIdSchema, payrollRunIdSchema } from "../brands";
import {
	payrollActorUserIdSchema,
	payrollCorrelationIdSchema,
	payrollDecimalStringSchema,
	payrollIdempotencyKeySchema,
	payrollOrganizationIdSchema,
} from "./common";

export const payrollReconciliationKindSchema = z.enum([
	"payment",
	"accounting",
]);
export const payrollReconciliationStatusSchema = z.enum([
	"matched",
	"discrepant",
	"resolved",
]);
export const payrollReconciliationRecordSchema = z.object({
	id: payrollReconciliationIdSchema,
	organizationId: payrollOrganizationIdSchema,
	runId: payrollRunIdSchema,
	kind: payrollReconciliationKindSchema,
	downstreamReference: z.string().trim().min(1).max(256),
	expectedAmount: payrollDecimalStringSchema,
	actualAmount: payrollDecimalStringSchema,
	toleranceAmount: payrollDecimalStringSchema,
	currencyCode: z.string().trim().length(3),
	status: payrollReconciliationStatusSchema,
	resolutionNote: z.string().trim().min(1).max(2048).nullable(),
	resolvedBy: payrollActorUserIdSchema.nullable(),
	resolvedAt: z.coerce.date().nullable(),
	version: z.number().int().positive(),
	createdBy: payrollActorUserIdSchema,
	updatedBy: payrollActorUserIdSchema,
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});
export const payrollReconciliationCreateRecordSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		runId: payrollRunIdSchema,
		kind: payrollReconciliationKindSchema,
		downstreamReference: z.string().trim().min(1).max(256),
		expectedAmount: payrollDecimalStringSchema,
		actualAmount: payrollDecimalStringSchema,
		toleranceAmount: payrollDecimalStringSchema,
		currencyCode: z.string().trim().length(3),
		status: z.enum(["matched", "discrepant"]),
		idempotencyKey: payrollIdempotencyKeySchema,
		createRequestFingerprint: z.string().trim().min(1).max(256),
		createdBy: payrollActorUserIdSchema,
		correlationId: payrollCorrelationIdSchema,
	})
	.strict();
export const recordPayrollReconciliationInputSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		runId: payrollRunIdSchema,
		kind: payrollReconciliationKindSchema,
		downstreamReference: z.string().trim().min(1).max(256),
		actualAmount: payrollDecimalStringSchema,
		currencyCode: z.string().trim().length(3),
		idempotencyKey: payrollIdempotencyKeySchema,
		actorUserId: payrollActorUserIdSchema,
		correlationId: payrollCorrelationIdSchema,
	})
	.strict();
export const resolvePayrollReconciliationInputSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		reconciliationId: payrollReconciliationIdSchema,
		resolutionNote: z.string().trim().min(1).max(2048),
		expectedVersion: z.number().int().positive(),
		actorUserId: payrollActorUserIdSchema,
		correlationId: payrollCorrelationIdSchema,
	})
	.strict();
export const listPayrollReconciliationsForRunInputSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		runId: payrollRunIdSchema,
		actorUserId: payrollActorUserIdSchema,
	})
	.strict();
