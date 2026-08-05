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

export const handoffEmploymentStatusSchema = z.enum([
	"active",
	"notice",
	"terminated",
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

export const handoffStatutoryJurisdictionSchema = z.enum(["MY", "VN"]);

export const handoffTaxResidencySchema = z.enum(["resident", "non_resident"]);

export const handoffMinimumWageZoneSchema = z.enum(["I", "II", "III", "IV"]);

export const handoffStatutoryReliefCodeSchema = z.enum([
	"self",
	"spouse",
	"child",
	"parent",
	"disabled_self",
	"disabled_dependant",
	"life_insurance",
	"medical_insurance",
	"education",
	"approved_donation",
	"pension_contribution",
]);

export const HANDOFF_STATUTORY_RELIEF_DECLARATION_VERSION =
	"hr.statutory-relief.v1" as const;

export const handoffReliefDeclarationSchema = z
	.object({
		amount: handoffMoneyAmountSchema.nullable(),
		currencyCode: z.string().trim().length(3).nullable(),
		dependantReference: z.string().trim().min(1).max(128).nullable(),
		evidenceRef: z.string().trim().min(1).max(256).nullable(),
		reliefCode: handoffStatutoryReliefCodeSchema,
	})
	.strict();

export const handoffStatutoryProfileSchema = z
	.object({
		dependantCount: z.number().int().nonnegative().max(99),
		employeeProvidentFundNumber: z.string().trim().min(1).max(64).nullable(),
		expatriate: z.boolean(),
		jurisdictionCode: handoffStatutoryJurisdictionSchema,
		minimumWageZone: handoffMinimumWageZoneSchema.nullable(),
		nationalityCountryCode: z.string().trim().length(2),
		profileId: z.string().trim().min(1).max(128),
		reliefDeclarations: z.array(handoffReliefDeclarationSchema).max(50),
		reliefDeclarationVersion: z.literal(
			HANDOFF_STATUTORY_RELIEF_DECLARATION_VERSION,
		),
		socialInsuranceBookNumber: z.string().trim().min(1).max(64).nullable(),
		socialSecurityNumber: z.string().trim().min(1).max(64).nullable(),
		sourceVersion: z.number().int().positive(),
		taxFileNumber: z.string().trim().min(1).max(64).nullable(),
		taxResidencyStatus: handoffTaxResidencySchema,
	})
	.strict();

export const handoffPriorEmployerYtdSchema = z
	.object({
		currencyCode: z.string().trim().length(3),
		grossAmount: handoffMoneyAmountSchema,
		jurisdictionCode: handoffStatutoryJurisdictionSchema,
		priorEmployerName: z.string().trim().min(1).max(200).nullable(),
		recordedOn: handoffIsoDateSchema,
		statutoryContributionAmount: handoffMoneyAmountSchema,
		taxWithheldAmount: handoffMoneyAmountSchema,
		taxYear: z.number().int().min(1900).max(9999),
	})
	.strict();

export const handoffLeaveBalanceAtTerminationSchema = z
	.object({
		asOf: handoffIsoDateSchema,
		days: handoffQuantitySchema,
	})
	.strict();

export const handoffSourceVersionSchema = z
	.object({
		compensationVersion: z.number().int().positive().optional(),
		leavePolicyVersion: z.number().int().positive().optional(),
		statutoryProfileVersion: z.number().int().positive().optional(),
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
		employmentStatus: handoffEmploymentStatusSchema.optional(),
		assignment: handoffAssignmentSchema,
		effectiveDate: handoffIsoDateSchema,
		currencyCode: z.string().trim().length(3),
		baseAmount: handoffMoneyAmountSchema,
		decimalScale: z.number().int().min(0).max(4),
		roundingMode: handoffRoundingModeSchema,
		payFrequency: handoffPayFrequencySchema,
		components: z.array(handoffCompensationComponentSchema),
		leaveFacts: z.array(handoffLeaveFactSchema),
		leaveBalanceAtTermination: handoffLeaveBalanceAtTerminationSchema
			.nullable()
			.optional(),
		priorEmployerYtd: z.array(handoffPriorEmployerYtdSchema).max(16).optional(),
		statutoryProfile: handoffStatutoryProfileSchema.nullable().optional(),
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
export type HandoffLeaveBalanceAtTermination = z.infer<
	typeof handoffLeaveBalanceAtTerminationSchema
>;
export type HandoffStatutoryProfile = z.infer<
	typeof handoffStatutoryProfileSchema
>;
export type HandoffPriorEmployerYtd = z.infer<
	typeof handoffPriorEmployerYtdSchema
>;
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
	const [, fractional] = amount.split(".");
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
