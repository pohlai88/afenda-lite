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
 *
 * **Writes stay allowed while a restriction is active — deliberate.** HR's
 * restriction doctrine (A3/C7) suppresses disclosure and blocks
 * anonymization: `exportHumanResourcesSubjectData` and
 * `anonymizeHumanResourcesSubject` are the only operations in
 * `features/privacy/operations.ts` that consult `evaluateRestriction`, and no
 * HR write command anywhere in the package does. Statutory capture mirrors that
 * HR-wide posture rather than inventing a feature-local rule: a restricted
 * subject's statutory facts can still be corrected (and the correction is
 * audited), they simply cannot be read back until the restriction is lifted
 * through the audited `liftEmployeeDataRestriction` command. Changing this is a
 * package-wide doctrine change, not a statutory-profile change.
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
