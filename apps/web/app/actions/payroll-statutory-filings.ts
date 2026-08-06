"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import {
	generateAnnualStatement,
	generateStatutoryFiling,
	listFilingObligations,
	sealFilingEvidence,
} from "@afenda/payroll";
import { z } from "zod";
import { runOperatorPermissionAction } from "@/app/actions/_runtime/run-operator-permission-action";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { createPayrollCommandOptions } from "@/lib/erp/payroll-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

const uuidSchema = z.string().uuid();
const idempotencyKeySchema = z.string().trim().min(1).max(128);
const expectedVersionSchema = z.number().int().positive();

const generateStatutoryFilingSchema = z
	.object({
		idempotencyKey: idempotencyKeySchema,
		instrumentCode: z.string().trim().min(1).max(64),
		jurisdictionCode: z.string().trim().min(1).max(64),
		periodId: uuidSchema,
		runIds: z.array(uuidSchema).min(1).max(64),
	})
	.strict();

const generateAnnualStatementSchema = z
	.object({
		employeeId: z.string().trim().min(1).max(128),
		idempotencyKey: idempotencyKeySchema,
		instrumentCode: z.string().trim().min(1).max(64),
		jurisdictionCode: z.string().trim().min(1).max(64),
		runIds: z.array(uuidSchema).min(1).max(64),
		taxYear: z.number().int().min(2000).max(2100),
	})
	.strict();

const sealFilingEvidenceSchema = z
	.object({
		expectedVersion: expectedVersionSchema,
		filingId: uuidSchema,
	})
	.strict();

const listFilingObligationsSchema = z
	.object({
		instrumentCode: z.string().trim().min(1).max(64).optional(),
		jurisdictionCode: z.string().trim().min(1).max(64).optional(),
		runIds: z.array(uuidSchema).max(64).optional(),
		taxYear: z.number().int().min(2000).max(2100).optional(),
	})
	.strict();

export async function generateStatutoryFilingAction(input: {
	idempotencyKey: string;
	instrumentCode: string;
	jurisdictionCode: string;
	periodId: string;
	runIds: string[];
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "generateStatutoryFilingAction",
		permission: "payroll.run.review",
		safeMessage: "Could not generate the statutory filing.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(generateStatutoryFilingSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid statutory filing request.",
				});
			}
			return mapPackageResult(
				await generateStatutoryFiling(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						idempotencyKey: parsed.data.idempotencyKey,
						instrumentCode: parsed.data.instrumentCode,
						jurisdictionCode: parsed.data.jurisdictionCode,
						periodId: parsed.data.periodId,
						runIds: parsed.data.runIds,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function generateAnnualStatementAction(input: {
	employeeId: string;
	idempotencyKey: string;
	instrumentCode: string;
	jurisdictionCode: string;
	runIds: string[];
	taxYear: number;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "generateAnnualStatementAction",
		permission: "payroll.run.review",
		safeMessage: "Could not generate the annual statement.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(generateAnnualStatementSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid annual statement request.",
				});
			}
			return mapPackageResult(
				await generateAnnualStatement(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						employeeId: parsed.data.employeeId,
						idempotencyKey: parsed.data.idempotencyKey,
						instrumentCode: parsed.data.instrumentCode,
						jurisdictionCode: parsed.data.jurisdictionCode,
						runIds: parsed.data.runIds,
						taxYear: parsed.data.taxYear,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function listFilingObligationsAction(input: {
	instrumentCode?: string;
	jurisdictionCode?: string;
	runIds?: string[];
	taxYear?: number;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "listFilingObligationsAction",
		permission: "payroll.run.review",
		safeMessage: "Could not list filing obligations.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(listFilingObligationsSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter valid filing obligation list filters.",
				});
			}
			return mapPackageResult(
				await listFilingObligations(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						...(parsed.data.instrumentCode === undefined
							? {}
							: { instrumentCode: parsed.data.instrumentCode }),
						...(parsed.data.jurisdictionCode === undefined
							? {}
							: { jurisdictionCode: parsed.data.jurisdictionCode }),
						...(parsed.data.runIds === undefined
							? {}
							: { runIds: parsed.data.runIds }),
						...(parsed.data.taxYear === undefined
							? {}
							: { taxYear: parsed.data.taxYear }),
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function sealFilingEvidenceAction(input: {
	expectedVersion: number;
	filingId: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "sealFilingEvidenceAction",
		permission: "payroll.run.finalize",
		safeMessage: "Could not seal the filing evidence.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(sealFilingEvidenceSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid filing evidence seal request.",
				});
			}
			return mapPackageResult(
				await sealFilingEvidence(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						expectedVersion: parsed.data.expectedVersion,
						filingId: parsed.data.filingId,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}
