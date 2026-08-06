"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import {
	calculatePayrollRun,
	createPayrollRun,
	finalizePayrollRun,
	getPayrollRun,
	listPayrollExceptionsForRun,
	recordPayrollException,
	reversePayrollRun,
} from "@afenda/payroll";
import { z } from "zod";
import { runOperatorPermissionAction } from "@/app/actions/_runtime/run-operator-permission-action";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { createPayrollCommandOptions } from "@/lib/erp/payroll-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

const uuidSchema = z.string().uuid();
const idempotencyKeySchema = z.string().trim().min(1).max(128);
const expectedVersionSchema = z.number().int().positive();
const runTypeSchema = z.enum(["regular", "off_cycle", "adjustment"]);
const reversalReasonCodeSchema = z.enum([
	"calculation_correction",
	"employee_data_correction",
	"statutory_correction",
	"payment_correction",
	"accounting_correction",
	"operational_correction",
]);

const createRunSchema = z
	.object({
		idempotencyKey: idempotencyKeySchema,
		payGroupId: uuidSchema,
		periodId: uuidSchema,
		runType: runTypeSchema,
		sequence: z.number().int().positive().optional(),
	})
	.strict();

const runIdVersionSchema = z
	.object({
		expectedVersion: expectedVersionSchema,
		runId: uuidSchema,
	})
	.strict();

const getRunSchema = z
	.object({
		runId: uuidSchema,
	})
	.strict();

const reverseRunSchema = z
	.object({
		expectedVersion: expectedVersionSchema,
		idempotencyKey: idempotencyKeySchema,
		reason: z.string().trim().min(1).max(512),
		reasonCode: reversalReasonCodeSchema,
		runId: uuidSchema,
	})
	.strict();

const exceptionSeveritySchema = z.enum(["blocking", "warning"]);

const recordExceptionSchema = z
	.object({
		employeeRef: z.string().trim().min(1).max(128).nullable().optional(),
		exceptionCode: z.string().trim().min(1).max(64),
		message: z.string().trim().min(1).max(2048),
		runId: uuidSchema,
		severity: exceptionSeveritySchema,
	})
	.strict();

export async function createPayrollRunAction(input: {
	idempotencyKey: string;
	payGroupId: string;
	periodId: string;
	runType: "regular" | "off_cycle" | "adjustment";
	sequence?: number;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "createPayrollRunAction",
		permission: "payroll.run.create",
		safeMessage: "Could not create the payroll run.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createRunSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid payroll run.",
				});
			}
			return mapPackageResult(
				await createPayrollRun(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						idempotencyKey: parsed.data.idempotencyKey,
						payGroupId: parsed.data.payGroupId,
						periodId: parsed.data.periodId,
						runType: parsed.data.runType,
						...(parsed.data.sequence === undefined
							? {}
							: { sequence: parsed.data.sequence }),
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function calculatePayrollRunAction(input: {
	expectedVersion: number;
	runId: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "calculatePayrollRunAction",
		permission: "payroll.run.calculate",
		safeMessage: "Could not calculate the payroll run.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(runIdVersionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid payroll-run calculation.",
				});
			}
			return mapPackageResult(
				await calculatePayrollRun(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						expectedVersion: parsed.data.expectedVersion,
						runId: parsed.data.runId,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function finalizePayrollRunAction(input: {
	expectedVersion: number;
	runId: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "finalizePayrollRunAction",
		permission: "payroll.run.finalize",
		safeMessage: "Could not finalize the payroll run.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(runIdVersionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid payroll-run finalize request.",
				});
			}
			return mapPackageResult(
				await finalizePayrollRun(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						expectedVersion: parsed.data.expectedVersion,
						runId: parsed.data.runId,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function reversePayrollRunAction(input: {
	expectedVersion: number;
	idempotencyKey: string;
	reason: string;
	reasonCode:
		| "calculation_correction"
		| "employee_data_correction"
		| "statutory_correction"
		| "payment_correction"
		| "accounting_correction"
		| "operational_correction";
	runId: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "reversePayrollRunAction",
		permission: "payroll.run.reverse",
		safeMessage: "Could not reverse the payroll run.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(reverseRunSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid payroll-run reversal.",
				});
			}
			return mapPackageResult(
				await reversePayrollRun(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						expectedVersion: parsed.data.expectedVersion,
						idempotencyKey: parsed.data.idempotencyKey,
						reason: parsed.data.reason,
						reasonCode: parsed.data.reasonCode,
						runId: parsed.data.runId,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function getPayrollRunAction(input: {
	runId: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "getPayrollRunAction",
		permission: "payroll.run.review",
		safeMessage: "Could not read the payroll run.",
		execute: async (session) => {
			const parsed = parseSchema(getRunSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid payroll-run lookup.",
				});
			}
			return mapPackageResult(
				await getPayrollRun(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						runId: parsed.data.runId,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function recordPayrollExceptionAction(input: {
	employeeRef?: string | null;
	exceptionCode: string;
	message: string;
	runId: string;
	severity: "blocking" | "warning";
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "recordPayrollExceptionAction",
		permission: "payroll.run.calculate",
		safeMessage: "Could not record the payroll exception.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(recordExceptionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid payroll exception.",
				});
			}
			return mapPackageResult(
				await recordPayrollException(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						exceptionCode: parsed.data.exceptionCode,
						message: parsed.data.message,
						runId: parsed.data.runId,
						severity: parsed.data.severity,
						employeeRef:
							parsed.data.employeeRef === undefined
								? null
								: parsed.data.employeeRef,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function listPayrollExceptionsForRunAction(input: {
	runId: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "listPayrollExceptionsForRunAction",
		permission: "payroll.run.review",
		safeMessage: "Could not list payroll exceptions.",
		execute: async (session) => {
			const parsed = parseSchema(getRunSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid payroll-exception list request.",
				});
			}
			return mapPackageResult(
				await listPayrollExceptionsForRun(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						runId: parsed.data.runId,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}
