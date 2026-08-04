"use server";

import { type Result as ActionResult, errorResult } from "@afenda/errors";
import {
	HUMAN_RESOURCES_RETENTION_CLASSIFICATIONS,
	type HumanResourcesDeletionDecision,
	humanResourcesEmployeeIdSchema,
	recordHrPrivacyOperation,
} from "@afenda/human-resources";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { runHrPrivacyOperatorPermissionAction as runOperatorPermissionAction } from "@/app/actions/_runtime/run-hr-operator-permission-action";
import {
	evaluateHumanResourcesPrivacyDeletion,
	executeApprovedHumanResourcesPrivacyDeletion,
} from "@/lib/erp/human-resources-privacy-deletion";
import {
	classifyHrFailure,
	createProductionHrObservabilityPorts,
} from "@/modules/platform/observability/human-resources-observability";
import {
	type ParseSchemaFailure,
	parseSchema,
} from "@/modules/platform/schemas/common";

const deletionRequestSchema = z
	.object({
		subjectEmployeeId: humanResourcesEmployeeIdSchema,
		requestedAt: z.iso.datetime({ offset: true }),
		legalBasis: z.string().trim().min(1).max(200),
		classifications: z
			.array(
				z
					.object({
						classification: z.enum(HUMAN_RESOURCES_RETENTION_CLASSIFICATIONS),
						retentionEndsAt: z.iso.datetime({ offset: true }).nullable(),
					})
					.strict(),
			)
			.min(1)
			.max(HUMAN_RESOURCES_RETENTION_CLASSIFICATIONS.length),
	})
	.strict();

export type HumanResourcesPrivacyDeletionActionInput = z.input<
	typeof deletionRequestSchema
>;

function invalidDeletionRequest(_details: ParseSchemaFailure["details"]) {
	return errorResult.fail("VALIDATION_ERROR", {
		publicMessage: "Enter a valid Human Resources privacy deletion request.",
	});
}

export async function evaluateHumanResourcesPrivacyDeletionAction(
	input: HumanResourcesPrivacyDeletionActionInput,
): Promise<ActionResult<{ decision: HumanResourcesDeletionDecision }>> {
	return await runOperatorPermissionAction({
		path: "evaluateHumanResourcesPrivacyDeletionAction",
		permission: "human-resources.privacy.anonymize.evaluate",
		safeMessage: "Could not evaluate the privacy deletion request.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(deletionRequestSchema, input);
			if (!parsed.success) {
				await recordHrPrivacyOperation(
					{
						operation: "erase",
						outcome: "failure",
						failureReason: "validation",
					},
					createProductionHrObservabilityPorts(),
				);
				return invalidDeletionRequest(parsed.details);
			}
			const result = await evaluateHumanResourcesPrivacyDeletion({
				...parsed.data,
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
			});
			await recordHrPrivacyOperation(
				result.ok
					? { operation: "erase", outcome: "success" }
					: {
							operation: "erase",
							outcome: "failure",
							failureReason: classifyHrFailure(result.code),
						},
				createProductionHrObservabilityPorts(),
			);
			const mapped = mapPackageResult(result);
			return mapped.ok ? { ok: true, data: { decision: mapped.data } } : mapped;
		},
	});
}

export async function executeApprovedHumanResourcesPrivacyDeletionAction(
	input: HumanResourcesPrivacyDeletionActionInput,
): Promise<
	ActionResult<{
		decision: HumanResourcesDeletionDecision;
		affectedRecordCount: number;
		executionReference: string;
	}>
> {
	return await runOperatorPermissionAction({
		path: "executeApprovedHumanResourcesPrivacyDeletionAction",
		permission: "human-resources.privacy.anonymize.execute",
		safeMessage: "Could not execute the approved privacy deletion request.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(deletionRequestSchema, input);
			if (!parsed.success) {
				await recordHrPrivacyOperation(
					{
						operation: "erase",
						outcome: "failure",
						failureReason: "validation",
					},
					createProductionHrObservabilityPorts(),
				);
				return invalidDeletionRequest(parsed.details);
			}
			const result = await executeApprovedHumanResourcesPrivacyDeletion({
				...parsed.data,
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
			});
			await recordHrPrivacyOperation(
				result.ok
					? { operation: "erase", outcome: "success" }
					: {
							operation: "erase",
							outcome: "failure",
							failureReason: classifyHrFailure(result.code),
						},
				createProductionHrObservabilityPorts(),
			);
			return mapPackageResult(result);
		},
	});
}
