"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import {
	enqueuePayrollCalculationJob,
	getPayrollJob,
	listPayrollDeadLetters,
	replayPayrollDeadLetter,
} from "@afenda/payroll";
import { z } from "zod";
import { runOperatorPermissionAction } from "@/app/actions/_runtime/run-operator-permission-action";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { createPayrollCommandOptions } from "@/lib/erp/payroll-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

const uuidSchema = z.string().uuid();

const enqueueJobSchema = z
	.object({
		chunkSize: z.number().int().positive().max(1000).optional(),
		employeeIds: z.array(z.string().min(1)).min(1).optional(),
		idempotencyKey: z.string().min(1),
		runId: uuidSchema,
	})
	.strict();

const getJobSchema = z
	.object({
		jobId: uuidSchema,
	})
	.strict();

const listDeadLettersSchema = z
	.object({
		jobId: uuidSchema.optional(),
	})
	.strict();

const replayDeadLetterSchema = z
	.object({
		deadLetterId: uuidSchema,
		idempotencyKey: z.string().min(1),
	})
	.strict();

export async function enqueuePayrollCalculationJobAction(input: {
	chunkSize?: number;
	employeeIds?: string[];
	idempotencyKey: string;
	runId: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "enqueuePayrollCalculationJobAction",
		permission: "payroll.run.calculate",
		safeMessage: "Could not enqueue the payroll calculation job.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(enqueueJobSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid payroll calculation job request.",
				});
			}
			return mapPackageResult(
				await enqueuePayrollCalculationJob(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						idempotencyKey: parsed.data.idempotencyKey,
						runId: parsed.data.runId,
						...(parsed.data.chunkSize === undefined
							? {}
							: { chunkSize: parsed.data.chunkSize }),
						...(parsed.data.employeeIds === undefined
							? {}
							: { employeeIds: parsed.data.employeeIds }),
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function getPayrollJobAction(input: {
	jobId: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "getPayrollJobAction",
		permission: "payroll.run.review",
		safeMessage: "Could not read the payroll job.",
		execute: async (session) => {
			const parsed = parseSchema(getJobSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid payroll job lookup.",
				});
			}
			return mapPackageResult(
				await getPayrollJob(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						jobId: parsed.data.jobId,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function listPayrollDeadLettersAction(input: {
	jobId?: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "listPayrollDeadLettersAction",
		permission: "payroll.run.review",
		safeMessage: "Could not list payroll dead letters.",
		execute: async (session) => {
			const parsed = parseSchema(listDeadLettersSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter valid payroll dead letter list filters.",
				});
			}
			return mapPackageResult(
				await listPayrollDeadLetters(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						...(parsed.data.jobId === undefined
							? {}
							: { jobId: parsed.data.jobId }),
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function replayPayrollDeadLetterAction(input: {
	deadLetterId: string;
	idempotencyKey: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "replayPayrollDeadLetterAction",
		permission: "payroll.run.calculate",
		safeMessage: "Could not replay the payroll dead letter.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(replayDeadLetterSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid payroll dead letter replay request.",
				});
			}
			return mapPackageResult(
				await replayPayrollDeadLetter(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						deadLetterId: parsed.data.deadLetterId,
						idempotencyKey: parsed.data.idempotencyKey,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}
