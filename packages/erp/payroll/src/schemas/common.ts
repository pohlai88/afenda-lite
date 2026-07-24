import { z } from "zod";

export const payrollOrganizationIdSchema = z.string().trim().min(1);
export const payrollActorUserIdSchema = z.string().trim().min(1);
export const payrollCorrelationIdSchema = z.string().trim().min(1).max(128);
export const payrollIdempotencyKeySchema = z.string().trim().min(1).max(128);
export const payrollExpectedVersionSchema = z.number().int().positive();

export const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const isoDateTimeSchema = z.string().datetime({ offset: true });

export const payrollDecimalStringSchema = z
	.string()
	.regex(/^-?\d+(\.\d+)?$/);

export const payrollEmployeeIdSchema = z.string().trim().min(1).max(128);

export const payrollMutationContextSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		actorUserId: payrollActorUserIdSchema,
		correlationId: payrollCorrelationIdSchema,
	})
	.strict();

export type PayrollMutationContext = z.infer<
	typeof payrollMutationContextSchema
>;

/** Alias retained for existing consumers — prefer `payrollMutationContextSchema`. */
export const payrollTenantContextSchema = payrollMutationContextSchema;
export type PayrollTenantContext = PayrollMutationContext;
