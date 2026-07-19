"use server";

import {
	type DeletedOrganization,
	deleteOrganization,
	deleteOrganizationInputSchema,
} from "@afenda/admin";
import { requireRole } from "@afenda/auth";
import { revalidatePath } from "next/cache";

import { mapPackageResult } from "@/app/actions/map-package-result";
import { createCorrelationId } from "@/modules/platform/observability/correlation";
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

	logProductEvent({
		level: "info",
		event: "organization.delete",
		correlationId,
		orgId: result.data.orgId,
		actorUserId: session.userId,
		path: "deleteOrganizationAction",
	});

	revalidatePath("/admin");

	return mapPackageResult(result);
}
