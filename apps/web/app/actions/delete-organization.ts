"use server";

import {
	type DeletedOrganization,
	deleteOrganization,
	deleteOrganizationInputSchema,
} from "@afenda/admin";
import { requireRole } from "@afenda/auth";
import { createCorrelationId } from "@afenda/http";
import { revalidatePath } from "next/cache";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { recordOrganizationDeletedAudit } from "@/modules/platform/domain/record-organization-deleted-audit";
import { logProductEvent } from "@/modules/platform/observability/product-log";
import {
	type ActionResult,
	actionFail,
	actionFailInternal,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type DeleteOrganizationActionData = DeletedOrganization;

/** `null` = form idle (`useActionState`); otherwise API-002 `ActionResult`. */
export type DeleteOrganizationActionState =
	ActionResult<DeleteOrganizationActionData> | null;

/**
 * Operator org-console hard-delete — Neon Auth `organization.delete` via
 * `@afenda/admin` `deleteOrganization`. Permanent removal only (never a soft
 * archive). Package enforces session membership / owner; adapter maps
 * `Result` → `ActionResult` honestly.
 *
 * General activity trail after Neon success:
 * `recordOrganizationDeletedAudit` → `@afenda/audit` → `platform_audit_log`.
 * Does not use `@afenda/admin/audit` (RBAC SSOT stays separate).
 */
export async function deleteOrganizationAction(
	_prev: DeleteOrganizationActionState,
	formData: FormData,
): Promise<DeleteOrganizationActionState> {
	const correlationId = createCorrelationId();
	const session = await requireRole("operator");

	const parsed = parseSchema(deleteOrganizationInputSchema, {
		orgId: formData.get("orgId"),
	});
	if (!parsed.success) {
		return actionFail(
			"VALIDATION_ERROR",
			"Select a valid organization to delete.",
			parsed.details,
		);
	}

	let result: Awaited<ReturnType<typeof deleteOrganization>>;
	try {
		result = await deleteOrganization(parsed.data);
	} catch {
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "deleteOrganizationAction",
			code: "INTERNAL_ERROR",
		});
		return actionFailInternal(
			"Organization delete failed. Try again or contact an admin.",
			correlationId,
		);
	}

	if (!result.ok) {
		return mapPackageResult(result);
	}

	const deletedOrgId = result.data.orgId;
	const auditFailure = await writeOrganizationDeleteAudit({
		organizationId: deletedOrgId,
		actorUserId: session.userId,
		correlationId,
	});
	if (auditFailure) {
		return auditFailure;
	}

	logProductEvent({
		level: "info",
		event: "organization.delete",
		correlationId,
		orgId: deletedOrgId,
		actorUserId: session.userId,
		path: "deleteOrganizationAction",
	});

	revalidatePath("/admin");

	return mapPackageResult(result);
}

async function writeOrganizationDeleteAudit(input: {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
}): Promise<ActionResult<never> | null> {
	const { organizationId, actorUserId, correlationId } = input;

	try {
		const audit = await recordOrganizationDeletedAudit({
			organizationId,
			actorUserId,
			correlationId,
		});
		if (audit.ok) {
			return null;
		}
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: organizationId,
			actorUserId,
			path: "deleteOrganizationAction.audit",
			code: audit.code,
		});
	} catch {
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: organizationId,
			actorUserId,
			path: "deleteOrganizationAction.audit",
			code: "INTERNAL_ERROR",
		});
	}

	return actionFailInternal(
		"Organization was deleted, but the activity audit could not be written. Contact an admin with this correlation id.",
		correlationId,
	);
}
