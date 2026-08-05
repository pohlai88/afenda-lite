"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import {
	applyRetroToPeriod,
	calculateRetroDifference,
	listRetroItems,
	queueRetroItem,
} from "@afenda/payroll";
import { z } from "zod";
import { runOperatorPermissionAction } from "@/app/actions/_runtime/run-operator-permission-action";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { createPayrollCommandOptions } from "@/lib/erp/payroll-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

const uuidSchema = z.string().uuid();
const decimalStringSchema = z.string().regex(/^-?\d+(\.\d+)?$/);
const idempotencyKeySchema = z.string().trim().min(1).max(128);
const retroStatusSchema = z.enum([
	"pending",
	"calculating",
	"calculated",
	"applied",
	"cancelled",
]);

const baseCompensationCorrectionSchema = z
	.object({
		amount: decimalStringSchema,
		kind: z.literal("base_compensation"),
	})
	.strict();

const variableInputCorrectionSchema = z
	.object({
		amount: decimalStringSchema,
		currencyCode: z.string().trim().length(3),
		earningRuleCode: z.string().trim().min(1).max(64),
		earningRuleId: z.string().trim().min(1).max(128),
		earningRuleVersion: z.string().trim().min(1).max(64),
		kind: z.literal("variable_input"),
		sourceId: z.string().trim().min(1).max(128),
		sourceType: z.string().trim().min(1).max(64),
	})
	.strict();

const retroCorrectionSchema = z.discriminatedUnion("kind", [
	baseCompensationCorrectionSchema,
	variableInputCorrectionSchema,
]);

const queueRetroItemSchema = z
	.object({
		correction: retroCorrectionSchema,
		employeeId: z.string().trim().min(1).max(128),
		idempotencyKey: idempotencyKeySchema,
		originPeriodId: uuidSchema,
		reason: z.string().trim().min(1).max(512),
	})
	.strict();

const calculateRetroDifferenceSchema = z
	.object({
		originRunId: uuidSchema,
		retroItemId: uuidSchema,
	})
	.strict();

const applyRetroToPeriodSchema = z
	.object({
		retroItemId: uuidSchema,
		targetPeriodId: uuidSchema,
		targetRunId: uuidSchema,
	})
	.strict();

const listRetroItemsSchema = z
	.object({
		employeeId: z.string().trim().min(1).max(128).optional(),
		originPeriodId: uuidSchema.optional(),
		status: retroStatusSchema.optional(),
		targetRunId: uuidSchema.optional(),
	})
	.strict();

export async function queueRetroItemAction(input: {
	correction:
		| { amount: string; kind: "base_compensation" }
		| {
				amount: string;
				currencyCode: string;
				earningRuleCode: string;
				earningRuleId: string;
				earningRuleVersion: string;
				kind: "variable_input";
				sourceId: string;
				sourceType: string;
		  };
	employeeId: string;
	idempotencyKey: string;
	originPeriodId: string;
	reason: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "queueRetroItemAction",
		permission: "payroll.input.manage",
		safeMessage: "Could not queue the retro item.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(queueRetroItemSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid retro item.",
				});
			}
			return mapPackageResult(
				await queueRetroItem(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						correction: parsed.data.correction,
						employeeId: parsed.data.employeeId,
						idempotencyKey: parsed.data.idempotencyKey,
						originPeriodId: parsed.data.originPeriodId,
						reason: parsed.data.reason,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function calculateRetroDifferenceAction(input: {
	originRunId: string;
	retroItemId: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "calculateRetroDifferenceAction",
		permission: "payroll.run.review",
		safeMessage: "Could not calculate the retro difference.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(calculateRetroDifferenceSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid retro difference calculation request.",
				});
			}
			return mapPackageResult(
				await calculateRetroDifference(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						originRunId: parsed.data.originRunId,
						retroItemId: parsed.data.retroItemId,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function applyRetroToPeriodAction(input: {
	retroItemId: string;
	targetPeriodId: string;
	targetRunId: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "applyRetroToPeriodAction",
		permission: "payroll.input.manage",
		safeMessage: "Could not apply the retro item to the period.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(applyRetroToPeriodSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid retro apply request.",
				});
			}
			return mapPackageResult(
				await applyRetroToPeriod(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						retroItemId: parsed.data.retroItemId,
						targetPeriodId: parsed.data.targetPeriodId,
						targetRunId: parsed.data.targetRunId,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function listRetroItemsAction(input: {
	employeeId?: string;
	originPeriodId?: string;
	status?: "pending" | "calculating" | "calculated" | "applied" | "cancelled";
	targetRunId?: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "listRetroItemsAction",
		permission: "payroll.run.review",
		safeMessage: "Could not list retro items.",
		execute: async (session) => {
			const parsed = parseSchema(listRetroItemsSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter valid retro item list filters.",
				});
			}
			return mapPackageResult(
				await listRetroItems(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						...(parsed.data.employeeId === undefined
							? {}
							: { employeeId: parsed.data.employeeId }),
						...(parsed.data.originPeriodId === undefined
							? {}
							: { originPeriodId: parsed.data.originPeriodId }),
						...(parsed.data.status === undefined
							? {}
							: { status: parsed.data.status }),
						...(parsed.data.targetRunId === undefined
							? {}
							: { targetRunId: parsed.data.targetRunId }),
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}
