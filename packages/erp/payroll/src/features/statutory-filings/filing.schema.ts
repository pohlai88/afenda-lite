import { z } from "zod";

import {
	payrollPeriodIdSchema,
	payrollRunIdSchema,
} from "../../kernel/identity/brands";
import {
	payrollEmployeeIdSchema,
	payrollExpectedVersionSchema,
	payrollIdempotencyKeySchema,
	payrollMutationContextSchema,
} from "../../kernel/validation/common.schema";
import {
	PAYROLL_STATUTORY_FILING_KINDS,
	PAYROLL_STATUTORY_FILING_STATUSES,
} from "./contract";

export const payrollStatutoryFilingKindSchema = z.enum(
	PAYROLL_STATUTORY_FILING_KINDS,
);
export const payrollStatutoryFilingStatusSchema = z.enum(
	PAYROLL_STATUTORY_FILING_STATUSES,
);

export const generateStatutoryFilingInputSchema = payrollMutationContextSchema
	.extend({
		idempotencyKey: payrollIdempotencyKeySchema,
		instrumentCode: z.string().trim().min(1).max(64),
		jurisdictionCode: z.string().trim().min(1).max(64),
		periodId: payrollPeriodIdSchema,
		runIds: z.array(payrollRunIdSchema).min(1).max(64),
	})
	.strict();

export const generateAnnualStatementInputSchema = payrollMutationContextSchema
	.extend({
		employeeId: payrollEmployeeIdSchema,
		idempotencyKey: payrollIdempotencyKeySchema,
		instrumentCode: z.string().trim().min(1).max(64),
		jurisdictionCode: z.string().trim().min(1).max(64),
		runIds: z.array(payrollRunIdSchema).min(1).max(64),
		taxYear: z.number().int().min(2000).max(2100),
	})
	.strict();

export const sealFilingEvidenceInputSchema = payrollMutationContextSchema
	.extend({
		expectedVersion: payrollExpectedVersionSchema,
		filingId: z.string().uuid(),
	})
	.strict();

export const listFilingObligationsInputSchema = z
	.object({
		actorUserId: z.string().trim().min(1),
		correlationId: z.string().trim().min(1),
		instrumentCode: z.string().trim().min(1).max(64).optional(),
		jurisdictionCode: z.string().trim().min(1).max(64).optional(),
		organizationId: z.string().trim().min(1),
		runIds: z.array(payrollRunIdSchema).max(64).optional(),
		taxYear: z.number().int().min(2000).max(2100).optional(),
	})
	.strict();
