import { z } from "zod";

export const payrollRoundingModeSchema = z.enum([
	"half_even",
	"half_up",
	"toward_zero",
]);

export const payrollRoundingPolicySchema = z
	.object({
		scale: z.number().int().min(0).max(12),
		mode: payrollRoundingModeSchema,
	})
	.strict();

export type PayrollRoundingPolicy = z.infer<typeof payrollRoundingPolicySchema>;

export const DEFAULT_PAYROLL_ROUNDING_POLICY: PayrollRoundingPolicy = {
	scale: 2,
	mode: "half_even",
};

export const PAYROLL_CALCULATION_VERSION = "payroll.calc.v1" as const;
