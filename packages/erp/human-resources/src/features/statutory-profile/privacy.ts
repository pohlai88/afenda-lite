import { errorResult, type Result } from "@afenda/errors";
import {
	type HumanResourcesCommandOptions,
	requirePrivacyPort,
} from "../../kernel/execution/command-options";
import {
	HUMAN_RESOURCES_ERROR_CONFLICT,
	humanResourcesErrorDetails,
} from "../../kernel/execution/error-codes";
import type { HumanResourcesEmployeeId } from "../../kernel/identity/brands";

/**
 * D7 restriction enforcement for statutory reads.
 *
 * This seam is fail-closed: without a composed privacy capability the statutory
 * profile is never disclosed, so a misconfigured composition root cannot leak
 * restricted statutory identifiers.
 */
export async function isStatutorySubjectRestricted(
	input: {
		actorUserId: string;
		correlationId: string;
		employeeId: HumanResourcesEmployeeId;
		organizationId: string;
	},
	options: HumanResourcesCommandOptions,
): Promise<Result<boolean>> {
	const privacy = requirePrivacyPort(options);
	if (!privacy.ok) {
		return privacy;
	}
	const evaluation = await privacy.data.evaluateRestriction({
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		subjectEmployeeId: input.employeeId,
		requestedAt: new Date().toISOString(),
		legalBasis: "statutory_profile_read",
	});
	if (!evaluation.ok) {
		return evaluation;
	}
	return errorResult.ok(evaluation.data.restricted);
}

export function statutorySubjectRestrictedFailure(): Result<never> {
	return errorResult.fail("CONFLICT", {
		publicMessage:
			"This subject's statutory data is restricted and cannot be disclosed.",
		internalContext: humanResourcesErrorDetails(HUMAN_RESOURCES_ERROR_CONFLICT),
	});
}
