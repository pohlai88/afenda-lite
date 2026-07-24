import { z } from "zod";

import {
	payrollRunEmployeeIdSchema,
	payrollRunIdSchema,
	payrollStatutoryResultIdSchema,
} from "../brands";
import {
	payrollActorUserIdSchema,
	payrollCorrelationIdSchema,
	payrollDecimalStringSchema,
	payrollEmployeeIdSchema,
	payrollOrganizationIdSchema,
} from "./common";

export const payrollStatutoryResultRecordSchema = z.object({
	id: payrollStatutoryResultIdSchema,
	organizationId: payrollOrganizationIdSchema,
	runId: payrollRunIdSchema,
	runEmployeeId: payrollRunEmployeeIdSchema,
	employeeId: payrollEmployeeIdSchema,
	jurisdictionCode: z.string().trim().min(1).max(64),
	ruleCode: z.string().trim().min(1).max(64),
	ruleVersion: z.string().trim().min(1).max(64),
	calculatorId: z.string().trim().min(1).max(64),
	baseAmount: payrollDecimalStringSchema,
	employeeAmount: payrollDecimalStringSchema,
	employerAmount: payrollDecimalStringSchema,
	currencyCode: z.string().trim().length(3),
	configSnapshotJson: z.record(z.string(), z.unknown()),
	createdAt: z.coerce.date(),
	updatedAt: z.coerce.date(),
});

export const payrollStatutoryResultCreateRecordSchema = z
	.object({
		id: payrollStatutoryResultIdSchema,
		runEmployeeId: payrollRunEmployeeIdSchema,
		employeeId: payrollEmployeeIdSchema,
		jurisdictionCode: z.string().trim().min(1).max(64),
		ruleCode: z.string().trim().min(1).max(64),
		ruleVersion: z.string().trim().min(1).max(64),
		calculatorId: z.string().trim().min(1).max(64),
		baseAmount: payrollDecimalStringSchema,
		employeeAmount: payrollDecimalStringSchema,
		employerAmount: payrollDecimalStringSchema,
		currencyCode: z.string().trim().length(3),
		configSnapshotJson: z.record(z.string(), z.unknown()),
	})
	.strict();

export const replaceStatutoryResultsForRunInputSchema = z
	.object({
		organizationId: payrollOrganizationIdSchema,
		runId: payrollRunIdSchema,
		results: z.array(payrollStatutoryResultCreateRecordSchema),
		actorUserId: payrollActorUserIdSchema,
		correlationId: payrollCorrelationIdSchema,
	})
	.strict();
