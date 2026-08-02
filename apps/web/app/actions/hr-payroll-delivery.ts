"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import {
	assembleApprovedPayrollHandoff,
	type PayrollDeliveryRecord,
	queuePayrollDelivery,
} from "@afenda/human-resources";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runHrPayrollDeliveryOperatorPermissionAction as runOperatorPermissionAction } from "@/app/actions/run-hr-operator-permission-action";
import { createHumanResourcesCommandOptions } from "@/lib/erp/human-resources-command-options";
import {
	createProductionPayrollDeliveryPorts,
	publishPayrollDelivery,
	recordPayrollDeliveryFeedback,
	recoverPendingPayrollDeliveries,
} from "@/modules/platform/domain/human-resources-payroll-delivery";
import { parseSchema } from "@/modules/platform/schemas/common";

const isoDateSchema = z.string().date();
const queueSchema = z
	.object({
		employeeId: z.string().uuid(),
		effectiveDate: isoDateSchema,
		periodStart: isoDateSchema,
		periodEnd: isoDateSchema,
		idempotencyKey: z.string().trim().min(1).max(200),
		maxAttempts: z.number().int().min(1).max(10).optional(),
		supersedesDeliveryId: z.string().uuid().optional(),
	})
	.strict()
	.superRefine((value, ctx) => {
		if (value.periodStart > value.periodEnd) {
			ctx.addIssue({
				code: "custom",
				message: "periodStart must be on or before periodEnd",
				path: ["periodStart"],
			});
		}
		if (
			value.effectiveDate < value.periodStart ||
			value.effectiveDate > value.periodEnd
		) {
			ctx.addIssue({
				code: "custom",
				message: "effectiveDate must fall within the delivery period",
				path: ["effectiveDate"],
			});
		}
	});
const correctionSchema = queueSchema.extend({
	supersedesDeliveryId: z.string().uuid(),
});
const deliverySchema = z.object({
	deliveryId: z.string().uuid(),
});
const feedbackSchema = deliverySchema.extend({
	status: z.enum(["acknowledged", "rejected", "correction_required"]),
	reason: z.string().trim().min(1).max(1000).optional(),
});
const recoverySchema = z.object({
	limit: z.number().int().min(1).max(100).default(25),
});

export async function queuePayrollDeliveryAction(input: {
	employeeId: string;
	effectiveDate: string;
	periodStart: string;
	periodEnd: string;
	idempotencyKey: string;
	maxAttempts?: number;
	supersedesDeliveryId?: string;
}): Promise<ActionResult<PayrollDeliveryRecord>> {
	return await runOperatorPermissionAction({
		path: "queuePayrollDeliveryAction",
		permission: "payroll.input.manage",
		safeMessage: "Could not queue the payroll delivery.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(queueSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid payroll delivery.",
				});
			}
			const assembled = await assembleApprovedPayrollHandoff(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					employeeId: parsed.data.employeeId,
					effectiveDate: parsed.data.effectiveDate,
					periodStart: parsed.data.periodStart,
					periodEnd: parsed.data.periodEnd,
				},
				createHumanResourcesCommandOptions(),
			);
			if (!assembled.ok) {
				return assembled;
			}
			if (assembled.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "Approved payroll facts were not found.",
				});
			}
			const result = await queuePayrollDelivery(
				{
					idempotencyKey: parsed.data.idempotencyKey,
					payload: assembled.data,
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					...(parsed.data.maxAttempts === undefined
						? {}
						: { maxAttempts: parsed.data.maxAttempts }),
					...(parsed.data.supersedesDeliveryId === undefined
						? {}
						: { supersedesDeliveryId: parsed.data.supersedesDeliveryId }),
				},
				createProductionPayrollDeliveryPorts(undefined, session.userId),
			);
			return mapPackageResult(result);
		},
	});
}

export async function publishPayrollDeliveryAction(input: {
	deliveryId: string;
}): Promise<ActionResult<PayrollDeliveryRecord>> {
	return await runOperatorPermissionAction({
		path: "publishPayrollDeliveryAction",
		permission: "payroll.input.manage",
		safeMessage: "Could not publish the payroll delivery.",
		execute: async (session) => {
			const parsed = parseSchema(deliverySchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid payroll delivery.",
				});
			}
			return mapPackageResult(
				await publishPayrollDelivery(
					{
						organizationId: session.orgId,
						deliveryId: parsed.data.deliveryId,
						actorUserId: session.userId,
					},
					createProductionPayrollDeliveryPorts(undefined, session.userId),
				),
			);
		},
	});
}

export async function queuePayrollDeliveryCorrectionAction(input: {
	employeeId: string;
	effectiveDate: string;
	periodStart: string;
	periodEnd: string;
	idempotencyKey: string;
	supersedesDeliveryId: string;
	maxAttempts?: number;
}): Promise<ActionResult<PayrollDeliveryRecord>> {
	return await runOperatorPermissionAction({
		path: "queuePayrollDeliveryCorrectionAction",
		permission: "payroll.input.manage",
		safeMessage: "Could not queue the corrected payroll delivery.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(correctionSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid corrected payroll delivery.",
				});
			}
			const assembled = await assembleApprovedPayrollHandoff(
				{
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
					employeeId: parsed.data.employeeId,
					effectiveDate: parsed.data.effectiveDate,
					periodStart: parsed.data.periodStart,
					periodEnd: parsed.data.periodEnd,
				},
				createHumanResourcesCommandOptions(),
			);
			if (!assembled.ok) {
				return assembled;
			}
			if (assembled.data === null) {
				return errorResult.fail("NOT_FOUND", {
					publicMessage: "Approved payroll facts were not found.",
				});
			}
			return mapPackageResult(
				await queuePayrollDelivery(
					{
						idempotencyKey: parsed.data.idempotencyKey,
						payload: assembled.data,
						supersedesDeliveryId: parsed.data.supersedesDeliveryId,
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId,
						...(parsed.data.maxAttempts === undefined
							? {}
							: { maxAttempts: parsed.data.maxAttempts }),
					},
					createProductionPayrollDeliveryPorts(undefined, session.userId),
				),
			);
		},
	});
}

export async function recordPayrollDeliveryFeedbackAction(input: {
	deliveryId: string;
	status: "acknowledged" | "rejected" | "correction_required";
	reason?: string;
}): Promise<ActionResult<PayrollDeliveryRecord>> {
	return await runOperatorPermissionAction({
		path: "recordPayrollDeliveryFeedbackAction",
		permission: "payroll.input.manage",
		safeMessage: "Could not record payroll delivery feedback.",
		execute: async (session) => {
			const parsed = parseSchema(feedbackSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter valid payroll feedback.",
				});
			}
			return mapPackageResult(
				await recordPayrollDeliveryFeedback(
					{
						deliveryId: parsed.data.deliveryId,
						status: parsed.data.status,
						organizationId: session.orgId,
						actorUserId: session.userId,
						...(parsed.data.reason === undefined
							? {}
							: { reason: parsed.data.reason }),
					},
					createProductionPayrollDeliveryPorts(undefined, session.userId),
				),
			);
		},
	});
}

export async function recoverPayrollDeliveriesAction(input?: {
	limit?: number;
}): Promise<ActionResult<{ deliveries: readonly PayrollDeliveryRecord[] }>> {
	return await runOperatorPermissionAction({
		path: "recoverPayrollDeliveriesAction",
		permission: "payroll.input.manage",
		safeMessage: "Could not recover pending payroll deliveries.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(recoverySchema, input ?? {});
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid recovery limit.",
				});
			}
			const result = await recoverPendingPayrollDeliveries({
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
				limit: parsed.data.limit,
			});
			const mapped = mapPackageResult(result);
			return mapped.ok
				? { ok: true, data: { deliveries: mapped.data } }
				: mapped;
		},
	});
}
