"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import {
	expirePayrollRetention,
	liftPayrollRestriction,
	projectPayrollFields,
	recordPayrollRetentionEvidence,
	respondToPayrollSubjectAccess,
	restrictPayrollSubject,
} from "@afenda/payroll";
import { z } from "zod";
import { runMemberPermissionAction } from "@/app/actions/_runtime/run-member-permission-action";
import { runOperatorPermissionAction } from "@/app/actions/_runtime/run-operator-permission-action";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { createPayrollCommandOptions } from "@/lib/erp/payroll-command-options";
import { parseSchema } from "@/modules/platform/schemas/common";

const retentionClassificationSchema = z.enum([
	"compensation",
	"statutory_identifiers",
	"payslip",
	"statutory_results",
	"reconciliation",
]);

const restrictPayrollSubjectSchema = z
	.object({
		classifications: z.array(retentionClassificationSchema).min(1),
		employeeId: z.string().trim().min(1).max(128),
		legalBasis: z.string().trim().min(1).max(128).optional(),
		requestedAt: z.string().trim().min(1).max(64).optional(),
		restrictionReference: z.string().trim().min(1).max(128),
	})
	.strict();

const liftPayrollRestrictionSchema = z
	.object({
		liftedAt: z.string().trim().min(1).max(64).optional(),
		reason: z.string().trim().min(1).max(512),
		restrictionId: z.string().trim().min(1).max(128),
	})
	.strict();

const recordPayrollRetentionEvidenceSchema = z
	.object({
		classifications: z.array(retentionClassificationSchema).min(1),
		clockStartedAt: z.string().trim().min(1).max(64),
		employeeId: z.string().trim().min(1).max(128),
		legalBasis: z.string().trim().min(1).max(128),
		minimumRetentionMonths: z.number().int().positive().max(600),
		requestedAt: z.string().trim().min(1).max(64).optional(),
	})
	.strict();

const expirePayrollRetentionSchema = z
	.object({
		evidenceId: z.string().trim().min(1).max(128),
		expiredAt: z.string().trim().min(1).max(64).optional(),
	})
	.strict();

const projectPayrollFieldsSchema = z
	.object({
		employeeId: z.string().trim().min(1).max(128),
		runId: z.string().uuid(),
	})
	.strict();

const respondToPayrollSubjectAccessSchema = z
	.object({
		employeeId: z.string().trim().min(1).max(128),
		legalBasis: z.string().trim().min(1).max(128).optional(),
		requestedAt: z.string().trim().min(1).max(64).optional(),
		runId: z.string().uuid(),
	})
	.strict();

export async function restrictPayrollSubjectAction(input: {
	classifications: ReadonlyArray<
		| "compensation"
		| "statutory_identifiers"
		| "payslip"
		| "statutory_results"
		| "reconciliation"
	>;
	employeeId: string;
	legalBasis?: string;
	requestedAt?: string;
	restrictionReference: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "restrictPayrollSubjectAction",
		permission: "payroll.payslip.read-all",
		safeMessage: "Could not restrict the payroll subject.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(restrictPayrollSubjectSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid payroll subject restriction.",
				});
			}
			return mapPackageResult(
				await restrictPayrollSubject(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						classifications: parsed.data.classifications,
						employeeId: parsed.data.employeeId,
						restrictionReference: parsed.data.restrictionReference,
						...(parsed.data.legalBasis === undefined
							? {}
							: { legalBasis: parsed.data.legalBasis }),
						...(parsed.data.requestedAt === undefined
							? {}
							: { requestedAt: parsed.data.requestedAt }),
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function liftPayrollRestrictionAction(input: {
	liftedAt?: string;
	reason: string;
	restrictionId: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "liftPayrollRestrictionAction",
		permission: "payroll.payslip.read-all",
		safeMessage: "Could not lift the payroll restriction.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(liftPayrollRestrictionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid payroll restriction lift request.",
				});
			}
			return mapPackageResult(
				await liftPayrollRestriction(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						reason: parsed.data.reason,
						restrictionId: parsed.data.restrictionId,
						...(parsed.data.liftedAt === undefined
							? {}
							: { liftedAt: parsed.data.liftedAt }),
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function recordPayrollRetentionEvidenceAction(input: {
	classifications: ReadonlyArray<
		| "compensation"
		| "statutory_identifiers"
		| "payslip"
		| "statutory_results"
		| "reconciliation"
	>;
	clockStartedAt: string;
	employeeId: string;
	legalBasis: string;
	minimumRetentionMonths: number;
	requestedAt?: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "recordPayrollRetentionEvidenceAction",
		permission: "payroll.payslip.read-all",
		safeMessage: "Could not record payroll retention evidence.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(recordPayrollRetentionEvidenceSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter valid payroll retention evidence.",
				});
			}
			return mapPackageResult(
				await recordPayrollRetentionEvidence(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						classifications: parsed.data.classifications,
						clockStartedAt: parsed.data.clockStartedAt,
						employeeId: parsed.data.employeeId,
						legalBasis: parsed.data.legalBasis,
						minimumRetentionMonths: parsed.data.minimumRetentionMonths,
						...(parsed.data.requestedAt === undefined
							? {}
							: { requestedAt: parsed.data.requestedAt }),
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function expirePayrollRetentionAction(input: {
	evidenceId: string;
	expiredAt?: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "expirePayrollRetentionAction",
		permission: "payroll.payslip.read-all",
		safeMessage: "Could not expire the payroll retention record.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(expirePayrollRetentionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid payroll retention expiry request.",
				});
			}
			return mapPackageResult(
				await expirePayrollRetention(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						evidenceId: parsed.data.evidenceId,
						...(parsed.data.expiredAt === undefined
							? {}
							: { expiredAt: parsed.data.expiredAt }),
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function projectPayrollFieldsAction(input: {
	employeeId: string;
	runId: string;
}): Promise<ActionResult<unknown>> {
	return await runOperatorPermissionAction({
		path: "projectPayrollFieldsAction",
		permission: "payroll.payslip.read-all",
		safeMessage: "Could not project payroll fields.",
		execute: async (session) => {
			const parsed = parseSchema(projectPayrollFieldsSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid payroll field projection request.",
				});
			}
			return mapPackageResult(
				await projectPayrollFields(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						employeeId: parsed.data.employeeId,
						runId: parsed.data.runId,
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}

export async function respondToPayrollSubjectAccessAction(input: {
	employeeId: string;
	legalBasis?: string;
	requestedAt?: string;
	runId: string;
}): Promise<ActionResult<unknown>> {
	return await runMemberPermissionAction({
		path: "respondToPayrollSubjectAccessAction",
		permission: "payroll.payslip.read-own",
		safeMessage: "Could not respond to the payroll subject access request.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(respondToPayrollSubjectAccessSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid subject access request.",
				});
			}
			return mapPackageResult(
				await respondToPayrollSubjectAccess(
					{
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						employeeId: parsed.data.employeeId,
						runId: parsed.data.runId,
						...(parsed.data.legalBasis === undefined
							? {}
							: { legalBasis: parsed.data.legalBasis }),
						...(parsed.data.requestedAt === undefined
							? {}
							: { requestedAt: parsed.data.requestedAt }),
					},
					createPayrollCommandOptions(),
				),
			);
		},
	});
}
