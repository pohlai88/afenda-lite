"use server";

import { admin, type ProvisionOrganizationResult } from "@afenda/admin";
import { authServer } from "@afenda/auth";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { http } from "@afenda/http";
import { logger } from "@afenda/logger";
import { revalidatePath } from "next/cache";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type ProvisionOrganizationActionData = ProvisionOrganizationResult;

/** `null` = form idle (`useActionState`); otherwise API-002 `ActionResult`. */
export type ProvisionOrganizationActionState =
	ActionResult<ProvisionOrganizationActionData> | null;

/**
 * Operator org-console provision — create → set active → invite first admin
 * via `@afenda/admin` `admin.organizations.provision`. Package owns Neon Auth gates;
 * adapter maps `Result` → `ActionResult` honestly (incl. partial-failure
 * disposition details).
 */
export async function provisionOrganizationAction(
	_prev: ProvisionOrganizationActionState,
	formData: FormData,
): Promise<ProvisionOrganizationActionState> {
	const correlationId = http.correlation.create();
	const session = await authServer.session.requireRole("operator");

	const parsed = parseSchema(admin.schemas.organizations.provisionInput, {
		name: formData.get("name"),
		slug: formData.get("slug"),
		adminEmail: formData.get("adminEmail"),
		adminRole: formData.get("adminRole"),
	});
	if (!parsed.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage:
				"Enter a valid organization name, slug, admin email, and role.",
		});
	}

	let result: Awaited<ReturnType<typeof admin.organizations.provision>>;
	try {
		result = await admin.organizations.provision(parsed.data);
	} catch {
		logger.event({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "provisionOrganizationAction",
			code: "INTERNAL_ERROR",
		});
		return errorResult.fail("INTERNAL_ERROR", { correlationId });
	}

	if (!result.ok) {
		return mapPackageResult(result);
	}

	logger.event({
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
