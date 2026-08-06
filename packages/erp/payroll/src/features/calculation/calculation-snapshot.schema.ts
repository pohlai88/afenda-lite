import {
	handoffApprovalEvidenceSchema,
	handoffCompensationComponentKindSchema,
	handoffLeaveFactSchema,
	handoffOvertimeFactSchema,
	handoffPriorEmployerYtdSchema,
	handoffSourceVersionSchema,
	handoffStatutoryProfileSchema,
	handoffTimeFactsSchema,
} from "@afenda/events/schemas";
import { z } from "zod";

import {
	PAYROLL_CALCULATION_VERSION,
	payrollRoundingPolicySchema,
} from "../../kernel/money/rounding-policy";
import {
	payrollDecimalStringSchema,
	payrollEmployeeIdSchema,
	payrollJsonObjectSchema,
	payrollOrganizationIdSchema,
} from "../../kernel/validation/common.schema";
import type { PayrollEmployeeCalcSnapshot } from "./calculation.types";

/**
 * Re-admission schema for a persisted `payroll_run_employee.snapshot_json`.
 *
 * The calculation pipeline is a pure function of this snapshot, so a sealed
 * period can only be recomputed under its own pinned rule versions by reading
 * the snapshot back. Strict object shapes are deliberate: an unrecognised
 * snapshot must fail closed rather than be recomputed under assumptions.
 */

const currencyCodeSchema = z.string().trim().length(3);
const ruleVersionSchema = z.string().trim().min(1).max(64);
const ruleCodeSchema = z.string().trim().min(1).max(64);
const identifierSchema = z.string().trim().min(1).max(128);

const calcEarningRuleSnapshotSchema = z
	.object({
		amount: payrollDecimalStringSchema.nullable(),
		code: ruleCodeSchema,
		currencyCode: currencyCodeSchema,
		id: identifierSchema,
		name: z.string().trim().min(1).max(256),
		rate: payrollDecimalStringSchema.nullable(),
		recordVersion: z.number().int().positive(),
		ruleType: z.enum(["fixed", "rate"]),
		ruleVersion: ruleVersionSchema,
	})
	.strict();

const calcDeductionRuleSnapshotSchema = calcEarningRuleSnapshotSchema
	.extend({
		taxTiming: z.enum(["pre_tax", "post_tax"]),
	})
	.strict();

const calcStatutoryRuleSnapshotSchema = z
	.object({
		code: ruleCodeSchema,
		configJson: payrollJsonObjectSchema,
		id: identifierSchema,
		jurisdictionCode: z.string().trim().min(1).max(16),
		name: z.string().trim().min(1).max(256),
		recordVersion: z.number().int().positive(),
		ruleVersion: ruleVersionSchema,
	})
	.strict();

const calcRecurringEarningSnapshotSchema = z
	.object({
		amount: payrollDecimalStringSchema,
		currencyCode: currencyCodeSchema,
		earningRuleCode: ruleCodeSchema,
		earningRuleId: identifierSchema,
		earningRuleVersion: ruleVersionSchema,
		id: identifierSchema,
	})
	.strict();

const calcRecurringDeductionSnapshotSchema = z
	.object({
		amount: payrollDecimalStringSchema,
		currencyCode: currencyCodeSchema,
		deductionRuleCode: ruleCodeSchema,
		deductionRuleId: identifierSchema,
		deductionRuleVersion: ruleVersionSchema,
		id: identifierSchema,
	})
	.strict();

export const payrollCalcVariableInputSnapshotSchema = z
	.object({
		amount: payrollDecimalStringSchema,
		currencyCode: currencyCodeSchema,
		earningRuleCode: ruleCodeSchema,
		earningRuleId: identifierSchema,
		earningRuleVersion: ruleVersionSchema,
		id: identifierSchema,
		sourceId: identifierSchema,
		sourceType: z.string().trim().min(1).max(64),
	})
	.strict();

const calcApprovedComponentSchema = z
	.object({
		amount: payrollDecimalStringSchema,
		code: ruleCodeSchema,
		currencyCode: currencyCodeSchema,
		decimalScale: z.number().int().nonnegative(),
		kind: handoffCompensationComponentKindSchema,
		sourceId: identifierSchema,
		sourceType: z.string().trim().min(1).max(64),
		sourceVersion: z.number().int().positive(),
	})
	.strict();

const calcEmployeeFactsSchema = z
	.object({
		baseCompensation: payrollDecimalStringSchema,
		currencyCode: currencyCodeSchema,
		employeeId: payrollEmployeeIdSchema,
		employmentStatus: z.enum(["active", "notice", "terminated"]),
		recurringAllowances: z.array(
			z
				.object({ amount: payrollDecimalStringSchema, code: ruleCodeSchema })
				.strict(),
		),
		recurringDeductions: z.array(
			z
				.object({ amount: payrollDecimalStringSchema, code: ruleCodeSchema })
				.strict(),
		),
	})
	.strict();

export const payrollEmployeeCalcSnapshotSchema = z
	.object({
		approvedWorkFacts: z
			.object({
				approvalEvidence: handoffApprovalEvidenceSchema,
				components: z.array(calcApprovedComponentSchema),
				leaveFacts: z.array(handoffLeaveFactSchema),
				overtimeFacts: z.array(handoffOvertimeFactSchema),
				sourceVersion: handoffSourceVersionSchema,
				timeFacts: handoffTimeFactsSchema.nullable(),
			})
			.strict(),
		assignmentId: identifierSchema,
		calculationVersion: z.literal(PAYROLL_CALCULATION_VERSION),
		currencyCode: currencyCodeSchema,
		deductionRules: z.array(calcDeductionRuleSnapshotSchema),
		earningRules: z.array(calcEarningRuleSnapshotSchema),
		eligibility: z
			.object({
				eligible: z.boolean(),
				reason: z.string().trim().min(1).max(512).nullable(),
			})
			.strict(),
		employee: calcEmployeeFactsSchema,
		employeeId: payrollEmployeeIdSchema,
		organizationId: payrollOrganizationIdSchema,
		payGroupId: identifierSchema,
		periodCadence: z
			.object({
				periodOrdinal: z.number().int().min(1).max(366),
				periodsPerYear: z.number().int().min(1).max(366),
			})
			.strict()
			.optional(),
		periodId: identifierSchema,
		recurringDeductions: z.array(calcRecurringDeductionSnapshotSchema),
		recurringEarnings: z.array(calcRecurringEarningSnapshotSchema),
		priorEmployerYtd: z.array(handoffPriorEmployerYtdSchema).optional(),
		roundingPolicy: payrollRoundingPolicySchema,
		statutoryProfile: handoffStatutoryProfileSchema.nullable().optional(),
		statutoryRules: z.array(calcStatutoryRuleSnapshotSchema),
		variableInputs: z.array(payrollCalcVariableInputSnapshotSchema),
		yearToDate: z
			.object({
				currencyCode: currencyCodeSchema,
				employeeStatutory: payrollDecimalStringSchema,
				employerStatutory: payrollDecimalStringSchema,
				gross: payrollDecimalStringSchema,
				taxWithheld: payrollDecimalStringSchema,
				taxYear: z.number().int().min(1900).max(9999),
				taxableBase: payrollDecimalStringSchema,
			})
			.strict()
			.optional(),
	})
	.strict();

export type PayrollEmployeeCalcSnapshotInput = z.infer<
	typeof payrollEmployeeCalcSnapshotSchema
>;

/**
 * Compile-time proof that the re-admission schema still projects the exact
 * snapshot the pure calculation pipeline consumes.
 */
type PayrollEmployeeCalcSnapshotParity =
	PayrollEmployeeCalcSnapshotInput extends PayrollEmployeeCalcSnapshot
		? true
		: never;

/** Fails the build if the re-admission schema drifts from the pipeline input. */
export const PAYROLL_CALC_SNAPSHOT_SCHEMA_PARITY: PayrollEmployeeCalcSnapshotParity = true;
