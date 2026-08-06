"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import {
	listPayrollReconciliationsForRun,
	recordPayrollReconciliation,
	resolvePayrollReconciliation,
} from "@afenda/payroll";
import { z } from "zod";
import { runOperatorPermissionAction } from "@/app/actions/_runtime/run-operator-permission-action";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { createPayrollCommandOptions } from "@/lib/erp/payroll-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

const uuidSchema = z.string().uuid();
const idempotencyKeySchema = z.string().trim().min(1).max(128);
const decimalStringSchema = z.string().regex(/^-?\d+(\.\d+)?$/);
const reconciliationKindSchema = z.enum(["payment", "accounting"]);

const recordSchema = z
	.object({
		actualAmount: decimalStringSchema,
		currencyCode: z.string().trim().length(3),
		downstreamReference: z.string().trim().min(1).max(256),
		idempotencyKey: idempotencyKeySchema,
		kind: reconciliationKindSchema,
		runId: uuidSchema,
	})
	.strict();

const resolveSchema = z
	.object({
		expectedVersion: z.number().int().positive(),
		reconciliationId: uuidSchema,
		resolutionNote: z.string().trim().min(1).max(2048),
	})
	.strict();

const listSchema = z
	.object({
		runId: uuidSchema,
	})
	.strict();

export async function recordPayrollReconciliationAction(input: {
	actualAmount: string;
	currencyCode: string;
	downstreamReference: string;
	idempotencyKey: string;
	kind: "payment" | "accounting";
	runId: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "recordPayrollReconciliationAction",
		permission: "payroll.reconciliation.manage",
		safeMessage: "Could not record the payroll reconciliation.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(recordSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid payroll reconciliation.",
				});
			}
			return mapPackageResult(
				await recordPayrollReconciliation(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						actualAmount: parsed.data.actualAmount,
						currencyCode: parsed.data.currencyCode,
						downstreamReference: parsed.data.downstreamReference,
						idempotencyKey: parsed.data.idempotencyKey,
						kind: parsed.data.kind,
						runId: parsed.data.runId,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function resolvePayrollReconciliationAction(input: {
	expectedVersion: number;
	reconciliationId: string;
	resolutionNote: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "resolvePayrollReconciliationAction",
		permission: "payroll.reconciliation.manage",
		safeMessage: "Could not resolve the payroll reconciliation.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(resolveSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid reconciliation resolution.",
				});
			}
			return mapPackageResult(
				await resolvePayrollReconciliation(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						expectedVersion: parsed.data.expectedVersion,
						reconciliationId: parsed.data.reconciliationId,
						resolutionNote: parsed.data.resolutionNote,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function listPayrollReconciliationsForRunAction(input: {
	runId: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "listPayrollReconciliationsForRunAction",
		permission: "payroll.reconciliation.manage",
		safeMessage: "Could not list payroll reconciliations.",
		execute: async (session) => {
			const parsed = parseSchema(listSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid reconciliation list request.",
				});
			}
			return mapPackageResult(
				await listPayrollReconciliationsForRun(
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
