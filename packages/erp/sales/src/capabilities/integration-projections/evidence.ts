import type { MutationEvidence } from "../../ports";

export function salesEvidence(input: {
	organizationId: string;
	actorUserId: string;
	correlationId: string;
	idempotencyKey: string;
	eventType: string;
	entityType: string;
	code: string;
	action: MutationEvidence["action"];
}): Omit<MutationEvidence, "entityId" | "version"> {
	return input;
}
