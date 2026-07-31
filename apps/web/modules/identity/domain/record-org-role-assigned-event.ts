/**
 * Identity adapter — org role assign → `@afenda/events` outbox → IN_APP inbox handler.
 */

import {
	errorIngress,
	errorResult,
	errorWire,
	type Result,
} from "@afenda/errors";

import {
	type DomainEvent,
	type EventDispatchSummary,
	events,
} from "@afenda/events";
import { identityOrgRoleAssignedPayloadSchema } from "@afenda/events/schemas";

import { recordOrgRoleAssignedNotification } from "./record-org-role-assigned-notification";

export interface RecordOrgRoleAssignedEventInput {
	actorUserId: string;
	assignmentId: string;
	correlationId: string;
	organizationId: string;
	reactivated: boolean;
	roleId: string;
	/** Recipient — the member who received the role. */
	userId: string;
}

export interface RecordOrgRoleAssignedEventData {
	dispatch: EventDispatchSummary;
	event: DomainEvent;
	notificationId: string | null;
}

/**
 * Publish `identity.org_role.assigned` and dispatch the IN_APP notification handler.
 * Call after `assignOrgRoleWithAudit` succeeds.
 */
export async function recordOrgRoleAssignedEvent(
	input: RecordOrgRoleAssignedEventInput,
): Promise<Result<RecordOrgRoleAssignedEventData>> {
	const published = await events.publisher.create().publish({
		type: "identity.org_role.assigned",
		sourceModule: "identity",
		organizationId: input.organizationId,
		actorUserId: input.actorUserId,
		correlationId: input.correlationId,
		payload: {
			roleId: input.roleId,
			assignmentId: input.assignmentId,
			recipientUserId: input.userId,
			reactivated: input.reactivated,
		},
	});

	if (!published.ok) {
		return published;
	}

	let notificationId: string | null = null;

	const dispatch = await events.dispatcher
		.create({
			handlers: {
				"identity.org_role.assigned": async (event) => {
					const parsed = identityOrgRoleAssignedPayloadSchema.safeParse(
						event.payload,
					);
					if (!parsed.success) {
						throw errorIngress.code("INTERNAL_ERROR", {
							operation: "identity.role-assigned.payload",
						});
					}

					const notification = await recordOrgRoleAssignedNotification({
						organizationId: event.organizationId,
						userId: parsed.data.recipientUserId,
						roleId: parsed.data.roleId,
						assignmentId: parsed.data.assignmentId,
						eventId: event.id,
						actorUserId: event.actorUserId,
						reactivated: parsed.data.reactivated,
					});

					if (!notification.ok) {
						throw errorWire.deserialize(errorWire.serialize(notification));
					}
					notificationId = notification.data.id;
				},
			},
		})
		.dispatchPending({
			organizationId: input.organizationId,
		});

	if (!dispatch.ok) {
		return dispatch;
	}

	if (dispatch.data.failed > 0) {
		return errorResult.fail("INTERNAL_ERROR");
	}

	const processed = dispatch.data.events.find(
		(row) => row.id === published.data.id && row.status === "processed",
	);

	return errorResult.ok({
		event: processed ?? published.data,
		dispatch: dispatch.data,
		notificationId,
	});
}
