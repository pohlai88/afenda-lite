import { z } from "zod";

export const HANDOFF_PAYROLL_CONTRACT_VERSION =
	"hr.payroll-handoff.v1" as const;

export const handoffMoneyAmountSchema = z.string().regex(/^\d+(\.\d{1,4})?$/);

export const handoffQuantitySchema = z.string().regex(/^\d+(\.\d+)?$/);

export const handoffRoundingModeSchema = z.enum([
	"half_even",
	"half_up",
	"toward_zero",
]);

export const handoffPayFrequencySchema = z.enum([
	"weekly",
	"biweekly",
	"semimonthly",
	"monthly",
	"annual",
]);

export const handoffLeaveUnitSchema = z.enum(["days", "hours"]);

export const handoffOvertimeTypeSchema = z.enum([
	"weekday_overtime",
	"rest_day_overtime",
	"public_holiday_overtime",
	"night_overtime",
	"call_back",
	"emergency_overtime",
]);

export const handoffCompensationComponentKindSchema = z.enum([
	"base",
	"benefit_employee_contribution",
	"benefit_employer_contribution",
]);

export const handoffIsoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const handoffAssignmentSchema = z
	.object({
		assignmentId: z.string().trim().min(1).max(128),
		positionId: z.string().trim().min(1).max(128).optional(),
		departmentId: z.string().trim().min(1).max(128).nullable().optional(),
		locationKey: z.string().trim().min(1).max(128).nullable().optional(),
		legalEntityKey: z.string().trim().min(1).max(128).nullable().optional(),
	})
	.strict();

export const handoffCompensationComponentSchema = z
	.object({
		code: z.string().trim().min(1).max(64),
		kind: handoffCompensationComponentKindSchema,
		amount: handoffMoneyAmountSchema,
		currencyCode: z.string().trim().length(3),
		decimalScale: z.number().int().min(0).max(4),
		sourceType: z.string().trim().min(1).max(64),
		sourceId: z.string().trim().min(1).max(128),
		sourceVersion: z.number().int().positive(),
	})
	.strict();

export const handoffLeaveFactSegmentSchema = z
	.object({
		date: handoffIsoDateSchema,
		quantity: handoffQuantitySchema,
		dayPortion: z.string().trim().min(1).max(32),
	})
	.strict();

export const handoffLeaveFactSchema = z
	.object({
		requestId: z.string().trim().min(1).max(128),
		policyId: z.string().trim().min(1).max(128),
		policyVersion: z.number().int().positive(),
		paid: z.boolean(),
		unit: handoffLeaveUnitSchema,
		startDate: handoffIsoDateSchema,
		endDate: handoffIsoDateSchema,
		quantity: handoffQuantitySchema,
		segments: z.array(handoffLeaveFactSegmentSchema),
		approvedAt: z.string().datetime({ offset: true }),
		correlationId: z.string().trim().min(1).max(128),
	})
	.strict();

export const handoffTimeFactsSchema = z
	.object({
		timesheetId: z.string().trim().min(1).max(128),
		periodStart: handoffIsoDateSchema,
		periodEnd: handoffIsoDateSchema,
		regularMinutes: z.number().int().nonnegative(),
		publicHolidayMinutes: z.number().int().nonnegative(),
		restDayMinutes: z.number().int().nonnegative(),
		nightMinutes: z.number().int().nonnegative(),
		unpaidMinutes: z.number().int().nonnegative(),
		paidLeaveMinutes: z.number().int().nonnegative(),
		unpaidLeaveMinutes: z.number().int().nonnegative(),
		timesheetVersion: z.number().int().positive(),
		approvedAt: z.string().datetime({ offset: true }),
		approvalReference: z.string().trim().min(1).max(128),
	})
	.strict();

export const handoffOvertimeFactSchema = z
	.object({
		overtimeType: handoffOvertimeTypeSchema,
		approvedMinutes: z.number().int().nonnegative(),
		payrollApprovedMinutes: z
			.number()
			.int()
			.nonnegative()
			.nullable()
			.optional(),
		timesheetId: z.string().trim().min(1).max(128),
		sourceVersion: z.number().int().positive(),
	})
	.strict();

export const handoffSourceVersionSchema = z
	.object({
		compensationVersion: z.number().int().positive().optional(),
		leavePolicyVersion: z.number().int().positive().optional(),
		timesheetVersion: z.number().int().positive().optional(),
	})
	.strict();

export const handoffApprovalEvidenceSchema = z
	.object({
		approvedAt: z.string().datetime({ offset: true }),
		approvedBy: z.string().trim().min(1).max(128).optional(),
		correlationId: z.string().trim().min(1).max(128),
		approvalReference: z.string().trim().min(1).max(128).optional(),
	})
	.strict();

export const approvedPayrollHandoffSchema = z
	.object({
		contractVersion: z.literal(HANDOFF_PAYROLL_CONTRACT_VERSION),
		organizationId: z.string().trim().min(1),
		employeeId: z.string().trim().min(1).max(128),
		employmentId: z.string().trim().min(1).max(128),
		assignment: handoffAssignmentSchema,
		effectiveDate: handoffIsoDateSchema,
		currencyCode: z.string().trim().length(3),
		baseAmount: handoffMoneyAmountSchema,
		decimalScale: z.number().int().min(0).max(4),
		roundingMode: handoffRoundingModeSchema,
		payFrequency: handoffPayFrequencySchema,
		components: z.array(handoffCompensationComponentSchema),
		leaveFacts: z.array(handoffLeaveFactSchema),
		timeFacts: handoffTimeFactsSchema.nullable(),
		overtimeFacts: z.array(handoffOvertimeFactSchema),
		sourceVersion: handoffSourceVersionSchema,
		approvalEvidence: handoffApprovalEvidenceSchema,
	})
	.strict()
	.superRefine((value, ctx) => {
		if (
			!handoffDecimalScaleMatchesAmount(value.baseAmount, value.decimalScale)
		) {
			ctx.addIssue({
				code: "custom",
				message: "decimalScale must match baseAmount fractional digits",
				path: ["decimalScale"],
			});
		}
		for (const [index, component] of value.components.entries()) {
			if (
				!handoffDecimalScaleMatchesAmount(
					component.amount,
					component.decimalScale,
				)
			) {
				ctx.addIssue({
					code: "custom",
					message: "decimalScale must match component amount fractional digits",
					path: ["components", index, "decimalScale"],
				});
			}
		}
	});

export type HandoffMoneyAmount = z.infer<typeof handoffMoneyAmountSchema>;
export type HandoffRoundingMode = z.infer<typeof handoffRoundingModeSchema>;
export type HandoffPayFrequency = z.infer<typeof handoffPayFrequencySchema>;
export type HandoffAssignment = z.infer<typeof handoffAssignmentSchema>;
export type HandoffCompensationComponent = z.infer<
	typeof handoffCompensationComponentSchema
>;
export type HandoffLeaveFact = z.infer<typeof handoffLeaveFactSchema>;
export type HandoffTimeFacts = z.infer<typeof handoffTimeFactsSchema>;
export type HandoffOvertimeFact = z.infer<typeof handoffOvertimeFactSchema>;
export type HandoffSourceVersion = z.infer<typeof handoffSourceVersionSchema>;
export type HandoffApprovalEvidence = z.infer<
	typeof handoffApprovalEvidenceSchema
>;
export type ApprovedPayrollHandoff = z.infer<
	typeof approvedPayrollHandoffSchema
>;

export const DEFAULT_HANDOFF_ROUNDING_MODE: HandoffRoundingMode = "half_even";

/** Fractional digit count for a handoff money amount (0–4). */
export function deriveHandoffDecimalScale(amount: string): number {
	const fractional = amount.split(".")[1];
	if (!fractional) {
		return 0;
	}
	return fractional.length;
}

export function handoffDecimalScaleMatchesAmount(
	amount: string,
	decimalScale: number,
): boolean {
	return deriveHandoffDecimalScale(amount) === decimalScale;
}
