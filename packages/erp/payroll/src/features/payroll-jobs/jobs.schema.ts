import { z } from "zod";
import { payrollMutationContextSchema } from "../../kernel/validation/common.schema";
import { DEFAULT_PAYROLL_JOB_CHUNK_SIZE } from "./retry";

export const enqueuePayrollCalculationJobInputSchema =
	payrollMutationContextSchema.extend({
		chunkSize: z
			.number()
			.int()
			.positive()
			.max(DEFAULT_PAYROLL_JOB_CHUNK_SIZE * 10)
			.optional(),
		employeeIds: z.array(z.string().min(1)).min(1).optional(),
		idempotencyKey: z.string().min(1),
		runId: z.string().uuid(),
	});

export const claimDuePayrollJobWorkInputSchema =
	payrollMutationContextSchema.extend({
		leaseDurationMs: z
			.number()
			.int()
			.min(1000)
			.max(15 * 60 * 1000)
			.optional(),
		limit: z.number().int().min(1).max(100).optional(),
		workerId: z.string().min(1),
	});

export const executePayrollJobWorkInputSchema =
	payrollMutationContextSchema.extend({
		workItemId: z.string().uuid(),
		workerId: z.string().min(1),
	});

export const replayPayrollDeadLetterInputSchema =
	payrollMutationContextSchema.extend({
		deadLetterId: z.string().uuid(),
		idempotencyKey: z.string().min(1),
	});

export const getPayrollJobInputSchema = payrollMutationContextSchema
	.pick({ organizationId: true, actorUserId: true })
	.extend({
		jobId: z.string().uuid(),
	});

export const listPayrollDeadLettersInputSchema = payrollMutationContextSchema
	.pick({ organizationId: true, actorUserId: true })
	.extend({
		jobId: z.string().uuid().optional(),
	});
