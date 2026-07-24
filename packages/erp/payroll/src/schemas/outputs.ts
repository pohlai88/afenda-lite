import { z } from "zod";

import {
	payrollEmployeeAssignmentIdSchema,
	payrollResultLineIdSchema,
	payrollRunEmployeeIdSchema,
	payrollRunIdSchema,
} from "../brands";
import {
	payrollActorUserIdSchema,
	payrollCorrelationIdSchema,
	payrollDecimalStringSchema,
	payrollEmployeeIdSchema,
	payrollOrganizationIdSchema,
} from "./common";

export {
	calculatePayrollRunInputSchema,
	createPayrollRunInputSchema,
} from "./runs";

export const payrollRunEmployeeStatusSchema = z.enum(["calculated", "failed"]);

export const payrollResultLineKindSchema = z.enum([
	"earning",
	"pre_tax_deduction",
	"employee_statutory",
	"post_tax_deduction",
	"employer_contribution",
]);

export const payrollResultLineRuleKindSchema = z.enum([
	"earning",
	"deduction",
	"statutory",
	"none",
]);

export const payrollRunEmployeeRecordSchema = z.object({
	id: payrollRunEmployeeIdSchema,
	organizationId: payrollOrganizationIdSchema,
	runId: payrollRunIdSchema,
	employeeId: payrollEmployeeIdSchema,
	assignmentId: payrollEmployeeAssignmentIdSchema.nullable(),
	currencyCode: z.string().trim().length(3),
	gross: payrollDecimalStringSchema,
	employeeDeductions: payrollDecimalStringSchema,
	employeeStatutory: payrollDecimalStringSchema,
	employerCost: payrollDecimalStringSchema,
	net: payrollDecimalStringSchema,
	snapshotJson: z.record(z.string(), z.unknown()),
	snapshotHash: z.string().trim().min(1).max(256),
	calculationVersion: z.string().trim().min(1).max(64),
	status: payrollRunEmployeeStatusSchema,
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});

export const payrollResultLineRecordSchema = z.object({
	id: payrollResultLineIdSchema,
	organizationId: payrollOrganizationIdSchema,
	runId: payrollRunIdSchema,
	runEmployeeId: payrollRunEmployeeIdSchema,
	employeeId: payrollEmployeeIdSchema,
	lineKind: payrollResultLineKindSchema,
	code: z.string().trim().min(1).max(64),
	ruleCode: z.string().trim().min(1).max(64),
	ruleVersion: z.string().trim().min(1).max(64),
	ruleKind: payrollResultLineRuleKindSchema,
	amount: payrollDecimalStringSchema,
	currencyCode: z.string().trim().length(3),
	sourceType: z.string().trim().min(1).max(64).nullable(),
	sourceId: z.string().trim().min(1).max(128).nullable(),
	sequence: z.number().int().nonnegative(),
	traceRef: z.string().trim().min(1).max(256),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});

export const payrollRunEmployeeCreateRecordSchema = z
	.object({
		id: payrollRunEmployeeIdSchema,
		employeeId: payrollEmployeeIdSchema,
		assignmentId: payrollEmployeeAssignmentIdSchema.nullable(),
		currencyCode: z.string().trim().length(3),
		gross: payrollDecimalStringSchema,
		employeeDeductions: payrollDecimalStringSchema,
		employeeStatutory: payrollDecimalStringSchema,
		employerCost: payrollDecimalStringSchema,
		net: payrollDecimalStringSchema,
		snapshotJson: z.record(z.string(), z.unknown()),
		snapshotHash: z.string().trim().min(1).max(256),
		calculationVersion: z.string().trim().min(1).max(64),
		status: payrollRunEmployeeStatusSchema,
	})
	.strict();

export const payrollResultLineCreateRecordSchema = z
	.object({
		id: payrollResultLineIdSchema,
		runEmployeeId: payrollRunEmployeeIdSchema,
		employeeId: payrollEmployeeIdSchema,
		lineKind: payrollResultLineKindSchema,
		code: z.string().trim().min(1).max(64),
		ruleCode: z.string().trim().min(1).max(64),
		ruleVersion: z.string().trim().min(1).max(64),
		ruleKind: payrollResultLineRuleKindSchema,
		amount: payrollDecimalStringSchema,
		currencyCode: z.string().trim().length(3),
		sourceType: z.string().trim().min(1).max(64).nullable(),
		sourceId: z.string().trim().min(1).max(128).nullable(),
		sequence: z.number().int().nonnegative(),
		traceRef: z.string().trim().min(1).max(256),
	})
	.strict();

export const replaceRunCalculationOutputsInputSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		runId: payrollRunIdSchema,
		runEmployees: z.array(payrollRunEmployeeCreateRecordSchema),
		resultLines: z.array(payrollResultLineCreateRecordSchema),
		actorUserId: payrollActorUserIdSchema,
		correlationId: payrollCorrelationIdSchema,
	})
	.strict();
