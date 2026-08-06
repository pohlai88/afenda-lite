"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import {
	calculateFinalSettlement,
	finalizeFinalSettlement,
	getFinalSettlementStatement,
	getOwnFinalSettlementStatement,
	initiateFinalSettlement,
	type PayrollFinalSettlement,
	type PayrollFinalSettlementStatement,
	type PayrollFinalSettlementView,
} from "@afenda/payroll";
import { z } from "zod";
import { runMemberPermissionAction } from "@/app/actions/_runtime/run-member-permission-action";
import { runOperatorPermissionAction } from "@/app/actions/_runtime/run-operator-permission-action";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { createPayrollCommandOptions } from "@/lib/erp/payroll-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const moneySchema = z.string().regex(/^-?\d+(\.\d+)?$/);
const employeeIdSchema = z.string().trim().min(1).max(128);
const terminationIdSchema = z.string().trim().min(1).max(128);
const idempotencyKeySchema = z.string().trim().min(1).max(128);

const recoverySchema = z
	.object({
		amount: moneySchema,
		code: z.string().trim().min(1).max(64),
		reason: z.string().trim().min(1).max(512),
	})
	.strict();

const initiateSchema = z
	.object({
		employeeId: employeeIdSchema,
		idempotencyKey: idempotencyKeySchema,
		noticeInLieuAmount: moneySchema.optional(),
		noticePayAmount: moneySchema.optional(),
		originRunId: z.string().uuid().optional(),
		payGroupId: z.string().uuid(),
		periodId: z.string().uuid(),
		recoveries: z.array(recoverySchema).max(32).optional(),
		terminationEffectiveOn: isoDateSchema,
		terminationId: terminationIdSchema,
	})
	.strict();

const calculateSchema = z
	.object({
		clearanceReason: z.string().trim().min(1).max(512).optional(),
		expectedVersion: z.number().int().positive(),
		settlementId: z.string().uuid(),
	})
	.strict();

const finalizeSchema = z
	.object({
		expectedVersion: z.number().int().positive(),
		settlementId: z.string().uuid(),
	})
	.strict();

const statementSchema = z
	.object({
		settlementId: z.string().uuid(),
	})
	.strict();

export async function initiateFinalSettlementAction(input: {
	employeeId: string;
	idempotencyKey: string;
	noticeInLieuAmount?: string;
	noticePayAmount?: string;
	originRunId?: string;
	payGroupId: string;
	periodId: string;
	recoveries?: ReadonlyArray<{
		amount: string;
		code: string;
		reason: string;
	}>;
	terminationEffectiveOn: string;
	terminationId: string;
}): Promise<ActionResult<PayrollFinalSettlement>> {
	return await runOperatorPermissionAction({
		path: "initiateFinalSettlementAction",
		permission: "payroll.run.create",
		safeMessage: "Could not initiate the final settlement.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(initiateSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid final settlement.",
				});
			}
			return mapPackageResult(
				await initiateFinalSettlement(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						employeeId: parsed.data.employeeId,
						idempotencyKey: parsed.data.idempotencyKey,
						payGroupId: parsed.data.payGroupId,
						periodId: parsed.data.periodId,
						terminationEffectiveOn: parsed.data.terminationEffectiveOn,
						terminationId: parsed.data.terminationId,
						...(parsed.data.noticeInLieuAmount === undefined
							? {}
							: { noticeInLieuAmount: parsed.data.noticeInLieuAmount }),
						...(parsed.data.noticePayAmount === undefined
							? {}
							: { noticePayAmount: parsed.data.noticePayAmount }),
						...(parsed.data.originRunId === undefined
							? {}
							: { originRunId: parsed.data.originRunId }),
						...(parsed.data.recoveries === undefined
							? {}
							: { recoveries: parsed.data.recoveries }),
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function calculateFinalSettlementAction(input: {
	clearanceReason?: string;
	expectedVersion: number;
	settlementId: string;
}): Promise<ActionResult<PayrollFinalSettlementView>> {
	return await runOperatorPermissionAction({
		path: "calculateFinalSettlementAction",
		permission: "payroll.run.calculate",
		safeMessage: "Could not calculate the final settlement.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(calculateSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid final-settlement calculation.",
				});
			}
			return mapPackageResult(
				await calculateFinalSettlement(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						expectedVersion: parsed.data.expectedVersion,
						settlementId: parsed.data.settlementId,
						...(parsed.data.clearanceReason === undefined
							? {}
							: { clearanceReason: parsed.data.clearanceReason }),
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function finalizeFinalSettlementAction(input: {
	expectedVersion: number;
	settlementId: string;
}): Promise<ActionResult<PayrollFinalSettlement>> {
	return await runOperatorPermissionAction({
		path: "finalizeFinalSettlementAction",
		permission: "payroll.run.finalize",
		safeMessage: "Could not finalize the final settlement.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(finalizeSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid final-settlement finalize request.",
				});
			}
			return mapPackageResult(
				await finalizeFinalSettlement(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						expectedVersion: parsed.data.expectedVersion,
						settlementId: parsed.data.settlementId,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function getFinalSettlementStatementAction(input: {
	settlementId: string;
}): Promise<ActionResult<PayrollFinalSettlementStatement>> {
	return await runOperatorPermissionAction({
		path: "getFinalSettlementStatementAction",
		permission: "payroll.payslip.read-all",
		safeMessage: "Could not read the final-settlement statement.",
		execute: async (session) => {
			const parsed = parseSchema(statementSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid final-settlement statement request.",
				});
			}
			return mapPackageResult(
				await getFinalSettlementStatement(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						settlementId: parsed.data.settlementId,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function getOwnFinalSettlementStatementAction(input: {
	settlementId: string;
}): Promise<ActionResult<PayrollFinalSettlementStatement>> {
	return await runMemberPermissionAction({
		path: "getOwnFinalSettlementStatementAction",
		permission: "payroll.payslip.read-own",
		safeMessage: "Could not read your final-settlement statement.",
		execute: async (session) => {
			const parsed = parseSchema(statementSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid final-settlement statement request.",
				});
			}
			return mapPackageResult(
				await getOwnFinalSettlementStatement(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						settlementId: parsed.data.settlementId,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}
