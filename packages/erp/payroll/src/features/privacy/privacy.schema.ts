import { z } from "zod";
import { payrollRunIdSchema } from "../../kernel/identity/brands";
import {
	payrollActorUserIdSchema,
	payrollCorrelationIdSchema,
	payrollEmployeeIdSchema,
	payrollOrganizationIdSchema,
} from "../../kernel/validation/common.schema";
import { PAYROLL_RETENTION_CLASSIFICATIONS } from "./contract";

const payrollRetentionClassificationSchema = z.enum(
	PAYROLL_RETENTION_CLASSIFICATIONS,
);

export const projectPayrollFieldsInputSchema = z
	.object({
		actorUserId: payrollActorUserIdSchema,
		employeeId: payrollEmployeeIdSchema,
		organizationId: payrollOrganizationIdSchema,
		runId: payrollRunIdSchema,
	})
	.strict();

export const restrictPayrollSubjectInputSchema = z
	.object({
		actorUserId: payrollActorUserIdSchema,
		classifications: z.array(payrollRetentionClassificationSchema).min(1),
		correlationId: payrollCorrelationIdSchema,
		employeeId: payrollEmployeeIdSchema,
		legalBasis: z.string().trim().min(1).max(128).optional(),
		organizationId: payrollOrganizationIdSchema,
		requestedAt: z.string().trim().min(1).max(64).optional(),
		restrictionReference: z.string().trim().min(1).max(128),
	})
	.strict();

export const liftPayrollRestrictionInputSchema = z
	.object({
		actorUserId: payrollActorUserIdSchema,
		correlationId: payrollCorrelationIdSchema,
		liftedAt: z.string().trim().min(1).max(64).optional(),
		organizationId: payrollOrganizationIdSchema,
		reason: z.string().trim().min(1).max(512),
		restrictionId: z.string().trim().min(1).max(128),
	})
	.strict();

export const recordPayrollRetentionEvidenceInputSchema = z
	.object({
		actorUserId: payrollActorUserIdSchema,
		classifications: z.array(payrollRetentionClassificationSchema).min(1),
		clockStartedAt: z.string().trim().min(1).max(64),
		correlationId: payrollCorrelationIdSchema,
		employeeId: payrollEmployeeIdSchema,
		legalBasis: z.string().trim().min(1).max(128),
		minimumRetentionMonths: z.number().int().positive().max(600),
		organizationId: payrollOrganizationIdSchema,
		requestedAt: z.string().trim().min(1).max(64).optional(),
	})
	.strict();

export const expirePayrollRetentionInputSchema = z
	.object({
		actorUserId: payrollActorUserIdSchema,
		correlationId: payrollCorrelationIdSchema,
		evidenceId: z.string().trim().min(1).max(128),
		expiredAt: z.string().trim().min(1).max(64).optional(),
		organizationId: payrollOrganizationIdSchema,
	})
	.strict();

export const respondToPayrollSubjectAccessInputSchema = z
	.object({
		actorUserId: payrollActorUserIdSchema,
		correlationId: payrollCorrelationIdSchema,
		employeeId: payrollEmployeeIdSchema,
		legalBasis: z.string().trim().min(1).max(128).optional(),
		organizationId: payrollOrganizationIdSchema,
		requestedAt: z.string().trim().min(1).max(64).optional(),
		runId: payrollRunIdSchema,
	})
	.strict();
