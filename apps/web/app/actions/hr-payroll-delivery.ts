"use server";

import {
	type ApprovedPayrollHandoff,
	approvedPayrollHandoffSchema,
} from "@afenda/events/schemas";
import {
	type PayrollDeliveryRecord,
	queuePayrollDelivery,
} from "@afenda/human-resources";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runHrPayrollDeliveryOperatorPermissionAction as runOperatorPermissionAction } from "@/app/actions/run-hr-operator-permission-action";
import {
	createProductionPayrollDeliveryPorts,
	publishPayrollDelivery,
	recordPayrollDeliveryFeedback,
	recoverPendingPayrollDeliveries,
} from "@/modules/platform/domain/human-resources-payroll-delivery";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

const queueSchema = z.object({
	idempotencyKey: z.string().trim().min(1).max(200),
	payload: approvedPayrollHandoffSchema,
	maxAttempts: z.number().int().min(1).max(10).optional(),
	supersedesDeliveryId: z.string().uuid().optional(),
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
	idempotencyKey: string;
	payload: ApprovedPayrollHandoff;
	maxAttempts?: number;
	supersedesDeliveryId?: string;
}): Promise<ActionResult<PayrollDeliveryRecord>> {
	return runOperatorPermissionAction({
		path: "queuePayrollDeliveryAction",
		permission: "payroll.input.manage",
		safeMessage: "Could not queue the payroll delivery.",
		execute: async (session) => {
			const parsed = parseSchema(queueSchema, input);
			if (!parsed.success)
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid payroll delivery.",
					parsed.details,
				);
			const result = await queuePayrollDelivery(
				{
					idempotencyKey: parsed.data.idempotencyKey,
					payload: parsed.data.payload,
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId: parsed.data.payload.approvalEvidence.correlationId,
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
	return runOperatorPermissionAction({
		path: "publishPayrollDeliveryAction",
		permission: "payroll.input.manage",
		safeMessage: "Could not publish the payroll delivery.",
		execute: async (session) => {
			const parsed = parseSchema(deliverySchema, input);
			if (!parsed.success)
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid payroll delivery.",
					parsed.details,
				);
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
	idempotencyKey: string;
	payload: ApprovedPayrollHandoff;
	supersedesDeliveryId: string;
	maxAttempts?: number;
}): Promise<ActionResult<PayrollDeliveryRecord>> {
	return runOperatorPermissionAction({
		path: "queuePayrollDeliveryCorrectionAction",
		permission: "payroll.input.manage",
		safeMessage: "Could not queue the corrected payroll delivery.",
		execute: async (session) => {
			const parsed = parseSchema(correctionSchema, input);
			if (!parsed.success)
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid corrected payroll delivery.",
					parsed.details,
				);
			return mapPackageResult(
				await queuePayrollDelivery(
					{
						idempotencyKey: parsed.data.idempotencyKey,
						payload: parsed.data.payload,
						supersedesDeliveryId: parsed.data.supersedesDeliveryId,
						organizationId: session.orgId,
						actorUserId: session.userId,
						correlationId: parsed.data.payload.approvalEvidence.correlationId,
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
	return runOperatorPermissionAction({
		path: "recordPayrollDeliveryFeedbackAction",
		permission: "payroll.input.manage",
		safeMessage: "Could not record payroll delivery feedback.",
		execute: async (session) => {
			const parsed = parseSchema(feedbackSchema, input);
			if (!parsed.success)
				return actionFail(
					"VALIDATION_ERROR",
					"Enter valid payroll feedback.",
					parsed.details,
				);
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
	return runOperatorPermissionAction({
		path: "recoverPayrollDeliveriesAction",
		permission: "payroll.input.manage",
		safeMessage: "Could not recover pending payroll deliveries.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(recoverySchema, input ?? {});
			if (!parsed.success)
				return actionFail(
					"VALIDATION_ERROR",
					"Enter a valid recovery limit.",
					parsed.details,
				);
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
