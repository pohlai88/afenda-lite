"use server";

import { admin, type OrganizationUsageMetrics } from "@afenda/admin";
import { authServer } from "@afenda/auth";
import { type Result as ActionResult, errorResult } from "@afenda/errors";
import { http } from "@afenda/http";
import { logger } from "@afenda/logger";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type GetOrganizationUsageActionData = OrganizationUsageMetrics;

/** `null` = form idle (`useActionState`); otherwise API-002 `ActionResult`. */
export type GetOrganizationUsageActionState =
	ActionResult<GetOrganizationUsageActionData> | null;

const usagePeriodFormSchema = z.object({
	period: admin.schemas.usage.period,
});

/**
 * Operator org-console usage refresh — active session org only.
 * `orgId` is stamped from session (never client-trusted). Metrics via
 * `@afenda/admin` `admin.usage.get` (counts + operational bands).
 */
export async function getOrganizationUsageAction(
	_prev: GetOrganizationUsageActionState,
	formData: FormData,
): Promise<GetOrganizationUsageActionState> {
	const correlationId = http.correlation.create();
	const session = await authServer.session.requireRole("operator");

	const parsed = parseSchema(usagePeriodFormSchema, {
		period: formData.get("period"),
	});
	if (!parsed.success) {
		return errorResult.fail("VALIDATION_ERROR", {
			publicMessage: "Enter a valid usage period (YYYY-MM).",
		});
	}

	let result: Awaited<ReturnType<typeof admin.usage.get>>;
	try {
		result = await admin.usage.get({
			orgId: session.orgId,
			period: parsed.data.period,
		});
	} catch {
		logger.event({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "getOrganizationUsageAction",
			code: "INTERNAL_ERROR",
		});
		return errorResult.fail("INTERNAL_ERROR", { correlationId });
	}

	return mapPackageResult(result);
}
