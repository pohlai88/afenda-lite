import { fail, ok, type Result } from "@afenda/errors/result";

import type { MasterFailureDetails } from "../../contracts/reasons";
import { lifecycleAlreadyMerged } from "./lifecycle-errors";

export type MergeParticipant = Readonly<{
	id: string;
	organizationId: string;
	mergedIntoId: string | null;
}>;

export function assertDistinctMergeParticipants(
	sourceId: string,
	targetId: string,
): Result<true> {
	if (sourceId === targetId) {
		return fail("BAD_REQUEST", "Source and target records must differ", {
			reason: "MASTER_VALIDATION_FAILED",
		} satisfies MasterFailureDetails);
	}
	return ok(true);
}

export function assertMergeParticipants(
	source: MergeParticipant,
	target: MergeParticipant,
	entityType: string,
): Result<true> {
	if (source.organizationId !== target.organizationId) {
		return fail(
			"BAD_REQUEST",
			"Merge participants must be in one organization",
			{
				reason: "MASTER_CROSS_ORG_REFERENCE",
				entityType,
				sourceId: source.id,
				targetId: target.id,
			} satisfies MasterFailureDetails,
		);
	}
	if (source.mergedIntoId !== null) {
		return lifecycleAlreadyMerged({ entityType, entityId: source.id });
	}
	if (target.mergedIntoId !== null) {
		return lifecycleAlreadyMerged({ entityType, entityId: target.id });
	}
	return ok(true);
}
