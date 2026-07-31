import { errorResult, type Result } from "@afenda/errors";
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
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Source and target records must differ",
		});
	}
	return errorResult.ok(true);
}

export function assertMergeParticipants(
	source: MergeParticipant,
	target: MergeParticipant,
	entityType: string,
): Result<true> {
	if (source.organizationId !== target.organizationId) {
		return errorResult.fail("BAD_REQUEST", {
			publicMessage: "Merge participants must be in one organization",
		});
	}
	if (source.mergedIntoId !== null) {
		return lifecycleAlreadyMerged({ entityType, entityId: source.id });
	}
	if (target.mergedIntoId !== null) {
		return lifecycleAlreadyMerged({ entityType, entityId: target.id });
	}
	return errorResult.ok(true);
}
