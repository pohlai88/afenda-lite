import { errorResult, type Result } from "@afenda/errors";

/**
 * CA-PD-008: approval execution belongs to the platform approval capability.
 * CA-PQ-001 (unresolved): the canonical error code for an unavailable
 * required approval verifier has not been formally decided. SERVICE_UNAVAILABLE
 * is used here as the safest fail-closed choice — a required dependency is
 * absent — but this is provisional pending that decision, not an approved
 * answer to CA-PQ-001.
 */
export interface CorporateAdministrationApprovalPort {
	verify: (input: {
		organizationId: string;
		actorUserId: string;
		operation: string;
		subjectId: string;
	}) => Promise<boolean>;
}

/**
 * Fails closed with no mutation, no audit success record, and no event when
 * no approval verifier is configured — never silently degrades an
 * approval-required operation to permission-only execution.
 */
export async function requireCorporateAdministrationApproval(
	approval: CorporateAdministrationApprovalPort | undefined,
	input: {
		organizationId: string;
		actorUserId: string;
		operation: string;
		subjectId: string;
	},
): Promise<Result<void>> {
	if (approval === undefined) {
		return errorResult.fail("SERVICE_UNAVAILABLE");
	}
	if (!(await approval.verify(input))) {
		return errorResult.fail("FORBIDDEN");
	}
	return errorResult.ok(undefined);
}
