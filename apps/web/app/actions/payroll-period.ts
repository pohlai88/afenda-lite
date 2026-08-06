"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import {
	closePayrollPeriod,
	createPayrollPeriod,
	getPayrollPeriod,
	listPayrollPeriods,
	lockPayrollPeriodInputs,
	updatePayrollPeriod,
} from "@afenda/payroll";
import { z } from "zod";
import { runOperatorPermissionAction } from "@/app/actions/_runtime/run-operator-permission-action";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { createPayrollCommandOptions } from "@/lib/erp/payroll-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

const uuidSchema = z.string().uuid();
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const idempotencyKeySchema = z.string().trim().min(1).max(128);
const expectedVersionSchema = z.number().int().positive();
const periodStatusSchema = z.enum(["open", "inputs_locked", "closed"]);

const createPeriodSchema = z
	.object({
		cutoffDate: isoDateSchema,
		idempotencyKey: idempotencyKeySchema,
		payGroupId: uuidSchema,
		periodEnd: isoDateSchema,
		periodStart: isoDateSchema,
	})
	.strict()
	.refine((value) => value.periodEnd >= value.periodStart, {
		message: "periodEnd must be on or after periodStart",
	});

const updatePeriodSchema = z
	.object({
		cutoffDate: isoDateSchema.optional(),
		expectedVersion: expectedVersionSchema,
		periodId: uuidSchema,
	})
	.strict();

const periodIdVersionSchema = z
	.object({
		expectedVersion: expectedVersionSchema,
		periodId: uuidSchema,
	})
	.strict();

const getPeriodSchema = z
	.object({
		periodId: uuidSchema,
	})
	.strict();

const listPeriodsSchema = z
	.object({
		payGroupId: uuidSchema,
		status: periodStatusSchema.optional(),
	})
	.strict();

export async function createPayrollPeriodAction(input: {
	cutoffDate: string;
	idempotencyKey: string;
	payGroupId: string;
	periodEnd: string;
	periodStart: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "createPayrollPeriodAction",
		permission: "payroll.setup.manage",
		safeMessage: "Could not create the payroll period.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(createPeriodSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid payroll period.",
				});
			}
			return mapPackageResult(
				await createPayrollPeriod(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						cutoffDate: parsed.data.cutoffDate,
						idempotencyKey: parsed.data.idempotencyKey,
						payGroupId: parsed.data.payGroupId,
						periodEnd: parsed.data.periodEnd,
						periodStart: parsed.data.periodStart,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function updatePayrollPeriodAction(input: {
	cutoffDate?: string;
	expectedVersion: number;
	periodId: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "updatePayrollPeriodAction",
		permission: "payroll.setup.manage",
		safeMessage: "Could not update the payroll period.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(updatePeriodSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid payroll period update.",
				});
			}
			return mapPackageResult(
				await updatePayrollPeriod(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						expectedVersion: parsed.data.expectedVersion,
						periodId: parsed.data.periodId,
						...(parsed.data.cutoffDate === undefined
							? {}
							: { cutoffDate: parsed.data.cutoffDate }),
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function lockPayrollPeriodInputsAction(input: {
	expectedVersion: number;
	periodId: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "lockPayrollPeriodInputsAction",
		permission: "payroll.setup.manage",
		safeMessage: "Could not lock payroll period inputs.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(periodIdVersionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid period lock request.",
				});
			}
			return mapPackageResult(
				await lockPayrollPeriodInputs(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						expectedVersion: parsed.data.expectedVersion,
						periodId: parsed.data.periodId,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function closePayrollPeriodAction(input: {
	expectedVersion: number;
	periodId: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "closePayrollPeriodAction",
		permission: "payroll.setup.manage",
		safeMessage: "Could not close the payroll period.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(periodIdVersionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid period close request.",
				});
			}
			return mapPackageResult(
				await closePayrollPeriod(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						expectedVersion: parsed.data.expectedVersion,
						periodId: parsed.data.periodId,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function getPayrollPeriodAction(input: {
	periodId: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "getPayrollPeriodAction",
		permission: "payroll.setup.manage",
		safeMessage: "Could not read the payroll period.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(getPeriodSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid payroll period lookup.",
				});
			}
			return mapPackageResult(
				await getPayrollPeriod(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						periodId: parsed.data.periodId,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function listPayrollPeriodsAction(input: {
	payGroupId: string;
	status?: "open" | "inputs_locked" | "closed";
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "listPayrollPeriodsAction",
		permission: "payroll.setup.manage",
		safeMessage: "Could not list payroll periods.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(listPeriodsSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter valid payroll period list filters.",
				});
			}
			return mapPackageResult(
				await listPayrollPeriods(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						payGroupId: parsed.data.payGroupId,
						...(parsed.data.status === undefined
							? {}
							: { status: parsed.data.status }),
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}
