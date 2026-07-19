/**
 * Platform adapter — org hard-delete → `@afenda/events` outbox
 * (`platform.organization.deleted`). Does not write audit (sole writer stays
 * `@afenda/audit` via `recordOrganizationDeletedAudit`).
 */

import type { Result } from "@afenda/errors/result";
import { createEventPublisher, type DomainEvent } from "@afenda/events";

export type RecordOrganizationDeletedEventInput = {
	organizationId: string;
	deletedByUserId: string;
	correlationId: string;
};

/**
 * Append `platform.organization.deleted` after Neon delete succeeds.
 * Correlation with the general activity audit uses the same `correlationId`.
 */
export async function recordOrganizationDeletedEvent(
	input: RecordOrganizationDeletedEventInput,
): Promise<Result<DomainEvent>> {
	return createEventPublisher().publish({
		type: "platform.organization.deleted",
		sourceModule: "platform",
		organizationId: input.organizationId,
		actorUserId: input.deletedByUserId,
		correlationId: input.correlationId,
		payload: {
			organizationId: input.organizationId,
			deletedByUserId: input.deletedByUserId,
		},
	});
}
