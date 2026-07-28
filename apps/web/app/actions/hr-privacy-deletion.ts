"use server";

import {
	HUMAN_RESOURCES_RETENTION_CLASSIFICATIONS,
	type HumanResourcesDeletionDecision,
	humanResourcesEmployeeIdSchema,
} from "@afenda/human-resources";
import { z } from "zod";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { runOperatorPermissionAction } from "@/app/actions/run-operator-permission-action";
import {
	evaluateHumanResourcesPrivacyDeletion,
	executeApprovedHumanResourcesPrivacyDeletion,
} from "@/lib/erp/human-resources-privacy-deletion";
import {
	type ActionResult,
	actionFail,
} from "@/modules/platform/schemas/action-result";
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

function invalidDeletionRequest(details: ParseSchemaFailure["details"]) {
	return actionFail(
		"VALIDATION_ERROR",
		"Enter a valid Human Resources privacy deletion request.",
		details,
	);
}

export async function evaluateHumanResourcesPrivacyDeletionAction(
	input: HumanResourcesPrivacyDeletionActionInput,
): Promise<ActionResult<{ decision: HumanResourcesDeletionDecision }>> {
	return runOperatorPermissionAction({
		path: "evaluateHumanResourcesPrivacyDeletionAction",
		permission: "human-resources.privacy.anonymize.evaluate",
		safeMessage: "Could not evaluate the privacy deletion request.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(deletionRequestSchema, input);
			if (!parsed.success) return invalidDeletionRequest(parsed.details);
			const result = await evaluateHumanResourcesPrivacyDeletion({
				...parsed.data,
				organizationId: session.orgId,
				actorUserId: session.userId,
				correlationId,
			});
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
	return runOperatorPermissionAction({
		path: "executeApprovedHumanResourcesPrivacyDeletionAction",
		permission: "human-resources.privacy.anonymize.execute",
		safeMessage: "Could not execute the approved privacy deletion request.",
		execute: async (session, correlationId) => {
			const parsed = parseSchema(deletionRequestSchema, input);
			if (!parsed.success) return invalidDeletionRequest(parsed.details);
			return mapPackageResult(
				await executeApprovedHumanResourcesPrivacyDeletion({
					...parsed.data,
					organizationId: session.orgId,
					actorUserId: session.userId,
					correlationId,
				}),
			);
		},
	});
}
