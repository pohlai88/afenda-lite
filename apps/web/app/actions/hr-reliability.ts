"use server";

import { createHash } from "node:crypto";

import { audit as afendaAudit } from "@afenda/audit";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runHrIntegrationOperatorPermissionAction as runOperatorPermissionAction } from "@/app/actions/run-hr-operator-permission-action";
import {
	acknowledgeProductionReliabilityWork,
	checkpointProductionConnectorCursor,
	replayProductionReliabilityDeadLetter,
} from "@/modules/platform/domain/human-resources-reliability-worker";

import { parseSchema } from "@/modules/platform/schemas/common";

const replaySchema = z.object({ deadLetterId: z.string().uuid() }).strict();
const cursorSchema = z
	.object({
		connector: z.string().trim().min(1).max(64),
		stream: z.string().trim().min(1).max(128),
		cursor: z.string().trim().min(1).max(500),
		expectedVersion: z.number().int().positive().nullable(),
	})
	.strict();
const acknowledgementSchema = z
	.object({
		workItemId: z.string().uuid(),
		receiptId: z.string().trim().min(1).max(500),
		expectedVersion: z.number().int().positive(),
		outcome: z.enum(["acknowledged", "rejected"]),
		errorCode: z.string().trim().min(1).max(100).optional(),
		errorMessage: z.string().trim().min(1).max(1000).optional(),
	})
	.strict();

function fingerprint(value: string): string {
	return createHash("sha256").update(value).digest("hex");
}

async function auditReliabilityOperation(input: {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	entity: string;
	entityId: string;
	action: string;
}) {
	return await afendaAudit.recorder().record({
		...input,
		module: "human-resources",
		metadata: { surface: "reliability_operator" },
	});
}

export async function replayHumanResourcesReliabilityDeadLetterAction(input: {
	deadLetterId: string;
}): Promise<ActionResult<{ workItemId: string; status: string }>> {
	return await runOperatorPermissionAction({
		path: "replayHumanResourcesReliabilityDeadLetterAction",
		permission: "human-resources.reliability.operate",
		safeMessage: "Could not replay the reliability dead letter.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(replaySchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid dead-letter id.",
				});
			}
			const result = await replayProductionReliabilityDeadLetter({
				organizationId: session.orgId,
				deadLetterId: parsed.data.deadLetterId,
				correlationId,
				idempotencyKey: `replay:${parsed.data.deadLetterId}:${correlationId}`,
				requestFingerprint: fingerprint(
					`${parsed.data.deadLetterId}:${correlationId}`,
				),
			});
			if (!result.ok) {
				return mapPackageResult(result);
			}
			const audited = await auditReliabilityOperation({
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
				entity: "hr_reliability_dead_letter",
				entityId: parsed.data.deadLetterId,
				action: "REPLAY",
			});
			if (!audited.ok) {
				return mapPackageResult(audited);
			}
			return {
				ok: true,
				data: { workItemId: result.data.id, status: result.data.status },
			};
		},
	});
}

export async function repairHumanResourcesConnectorCursorAction(input: {
	connector: string;
	stream: string;
	cursor: string;
	expectedVersion: number | null;
}): Promise<ActionResult<{ version: number }>> {
	return await runOperatorPermissionAction({
		path: "repairHumanResourcesConnectorCursorAction",
		permission: "human-resources.connector-cursor.manage",
		safeMessage: "Could not repair the connector cursor.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(cursorSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid connector cursor.",
				});
			}
			const result = await checkpointProductionConnectorCursor({
				organizationId: session.orgId,
				...parsed.data,
			});
			if (!result.ok) {
				return mapPackageResult(result);
			}
			const audited = await auditReliabilityOperation({
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
				entity: "hr_connector_cursor",
				entityId: `${parsed.data.connector}:${parsed.data.stream}`,
				action: "REPAIR",
			});
			if (!audited.ok) {
				return mapPackageResult(audited);
			}
			return { ok: true, data: { version: result.data.version } };
		},
	});
}

export async function acknowledgeHumanResourcesReliabilityWorkAction(input: {
	workItemId: string;
	receiptId: string;
	expectedVersion: number;
	outcome: "acknowledged" | "rejected";
	errorCode?: string;
	errorMessage?: string;
}): Promise<ActionResult<{ status: string }>> {
	return await runOperatorPermissionAction({
		path: "acknowledgeHumanResourcesReliabilityWorkAction",
		permission: "human-resources.reliability.operate",
		safeMessage: "Could not acknowledge reliability work.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(acknowledgementSchema, input);
			if (!parsed.success) {
				return errorResult.fail("VALIDATION_ERROR", {
					publicMessage: "Enter a valid acknowledgement.",
				});
			}
			const result = await acknowledgeProductionReliabilityWork({
				organizationId: session.orgId,
				workItemId: parsed.data.workItemId,
				receiptId: parsed.data.receiptId,
				expectedVersion: parsed.data.expectedVersion,
				outcome: parsed.data.outcome,
				...(parsed.data.errorCode === undefined
					? {}
					: { errorCode: parsed.data.errorCode }),
				...(parsed.data.errorMessage === undefined
					? {}
					: { errorMessage: parsed.data.errorMessage }),
			});
			if (!result.ok) {
				return mapPackageResult(result);
			}
			const audited = await auditReliabilityOperation({
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
				entity: "hr_reliability_work_item",
				entityId: parsed.data.workItemId,
				action:
					parsed.data.outcome === "acknowledged" ? "ACKNOWLEDGE" : "REJECT",
			});
			if (!audited.ok) {
				return mapPackageResult(audited);
			}
			return { ok: true, data: { status: result.data.status } };
		},
	});
}
