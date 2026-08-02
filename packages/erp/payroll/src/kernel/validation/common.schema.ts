import { z } from "zod";
import {
	PAYROLL_MONEY_INTEGER_DIGITS,
	PAYROLL_MONEY_PRECISION,
	PAYROLL_MONEY_SCALE,
} from "../money/money-policy";

export const payrollJsonObjectSchema = z.record(z.string(), z.json());
export type PayrollJsonObject = z.infer<typeof payrollJsonObjectSchema>;

export const payrollOrganizationIdSchema = z.string().trim().min(1);
export const payrollActorUserIdSchema = z.string().trim().min(1);
export const payrollCorrelationIdSchema = z.string().trim().min(1).max(128);
export const payrollIdempotencyKeySchema = z.string().trim().min(1).max(128);
export const payrollExpectedVersionSchema = z.number().int().positive();

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function isCalendarDate(value: string): boolean {
	const match = ISO_DATE_PATTERN.exec(value);
	if (match === null) {
		return false;
	}
	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const candidate = new Date(Date.UTC(year, month - 1, day));
	return (
		candidate.getUTCFullYear() === year &&
		candidate.getUTCMonth() === month - 1 &&
		candidate.getUTCDate() === day
	);
}

export const isoDateSchema = z.string().refine(isCalendarDate, {
	message: "Expected a valid ISO calendar date (YYYY-MM-DD)",
});
export const isoDateTimeSchema = z.string().datetime({ offset: true });

const PAYROLL_DECIMAL_PATTERN = /^-?\d+(\.\d+)?$/;
const LEADING_DECIMAL_ZERO_PATTERN = /^0+/;

export const payrollDecimalStringSchema = z
	.string()
	.regex(PAYROLL_DECIMAL_PATTERN)
	.superRefine((value, context) => {
		const unsigned = value.startsWith("-") ? value.slice(1) : value;
		const [integerPart = "0", fractionalPart = ""] = unsigned.split(".");
		const significantInteger =
			integerPart.replace(LEADING_DECIMAL_ZERO_PATTERN, "") || "0";
		if (significantInteger.length > PAYROLL_MONEY_INTEGER_DIGITS) {
			context.addIssue({
				code: "custom",
				message: `Payroll decimal exceeds numeric(${PAYROLL_MONEY_PRECISION},${PAYROLL_MONEY_SCALE}) integer precision`,
			});
		}
		if (fractionalPart.length > PAYROLL_MONEY_SCALE) {
			context.addIssue({
				code: "custom",
				message: `Payroll decimal exceeds numeric(${PAYROLL_MONEY_PRECISION},${PAYROLL_MONEY_SCALE}) fractional precision`,
			});
		}
	});

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
