"use server";

import {
	getOrganizationUsageMetrics,
	type OrganizationUsageMetrics,
	usagePeriodSchema,
} from "@afenda/admin/usage";
import { requireRole } from "@afenda/auth";
import { createCorrelationId } from "@afenda/http";
import { z } from "zod";
import { mapPackageResult } from "@/app/actions/map-package-result";
import { logProductEvent } from "@/modules/platform/observability/product-log";
import {
	type ActionResult,
	actionFail,
	actionFailInternal,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type GetOrganizationUsageActionData = OrganizationUsageMetrics;

/** `null` = form idle (`useActionState`); otherwise API-002 `ActionResult`. */
export type GetOrganizationUsageActionState =
	ActionResult<GetOrganizationUsageActionData> | null;

const usagePeriodFormSchema = z.object({
	period: usagePeriodSchema,
});

/**
 * Operator org-console usage refresh — active session org only.
 * `orgId` is stamped from session (never client-trusted). Metrics via
 * `@afenda/admin/usage` `getOrganizationUsageMetrics`.
 */
export async function getOrganizationUsageAction(
	_prev: GetOrganizationUsageActionState,
	formData: FormData,
): Promise<GetOrganizationUsageActionState> {
	const correlationId = createCorrelationId();
	const session = await requireRole("operator");

	const parsed = parseSchema(usagePeriodFormSchema, {
		period: formData.get("period"),
	});
	if (!parsed.success) {
		return actionFail(
			"VALIDATION_ERROR",
			"Enter a valid usage period (YYYY-MM).",
			parsed.details,
		);
	}

	let result: Awaited<ReturnType<typeof getOrganizationUsageMetrics>>;
	try {
		result = await getOrganizationUsageMetrics({
			orgId: session.orgId,
			period: parsed.data.period,
		});
	} catch {
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "getOrganizationUsageAction",
			code: "INTERNAL_ERROR",
		});
		return actionFailInternal(
			"Usage metrics could not be loaded. Try again or contact an admin.",
			correlationId,
		);
	}

	return mapPackageResult(result);
}
