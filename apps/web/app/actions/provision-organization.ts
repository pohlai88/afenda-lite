"use server";

import {
	type ProvisionOrganizationResult,
	provisionOrganization,
	provisionOrganizationInputSchema,
} from "@afenda/admin";
import { requireRole } from "@afenda/auth";
import { createCorrelationId } from "@afenda/http";
import { revalidatePath } from "next/cache";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { logProductEvent } from "@/modules/platform/observability/product-log";
import {
	type ActionResult,
	actionFail,
	actionFailInternal,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type ProvisionOrganizationActionData = ProvisionOrganizationResult;

/** `null` = form idle (`useActionState`); otherwise API-002 `ActionResult`. */
export type ProvisionOrganizationActionState =
	ActionResult<ProvisionOrganizationActionData> | null;

/**
 * Operator org-console provision — create → set active → invite first admin
 * via `@afenda/admin` `provisionOrganization`. Package owns Neon Auth gates;
 * adapter maps `Result` → `ActionResult` honestly (incl. partial-failure
 * disposition details).
 */
export async function provisionOrganizationAction(
	_prev: ProvisionOrganizationActionState,
	formData: FormData,
): Promise<ProvisionOrganizationActionState> {
	const correlationId = createCorrelationId();
	const session = await requireRole("operator");

	const parsed = parseSchema(provisionOrganizationInputSchema, {
		name: formData.get("name"),
		slug: formData.get("slug"),
		adminEmail: formData.get("adminEmail"),
		adminRole: formData.get("adminRole"),
	});
	if (!parsed.success) {
		return actionFail(
			"VALIDATION_ERROR",
			"Enter a valid organization name, slug, admin email, and role.",
			parsed.details,
		);
	}

	let result: Awaited<ReturnType<typeof provisionOrganization>>;
	try {
		result = await provisionOrganization(parsed.data);
	} catch {
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "provisionOrganizationAction",
			code: "INTERNAL_ERROR",
		});
		return actionFailInternal(
			"Organization provision failed. Try again or contact an admin.",
			correlationId,
		);
	}

	if (!result.ok) {
		return mapPackageResult(result);
	}

	logProductEvent({
		level: "info",
		event: "organization.provision",
		correlationId,
		orgId: result.data.organization.id,
		actorUserId: session.userId,
		path: "provisionOrganizationAction",
	});

	revalidatePath("/admin");

	return mapPackageResult(result);
}
