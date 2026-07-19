/**
 * Identity adapter — org role assign → `@afenda/events` outbox → IN_APP inbox handler.
 */

import { fail, ok, type Result } from "@afenda/errors/result";
import {
	createEventDispatcher,
	createEventPublisher,
	type DomainEvent,
	type EventDispatchSummary,
	identityOrgRoleAssignedPayloadSchema,
} from "@afenda/events";

import { recordOrgRoleAssignedNotification } from "./record-org-role-assigned-notification";

export type RecordOrgRoleAssignedEventInput = {
	organizationId: string;
	/** Recipient — the member who received the role. */
	userId: string;
	roleId: string;
	assignmentId: string;
	actorUserId: string;
	correlationId: string;
	reactivated: boolean;
};

export type RecordOrgRoleAssignedEventData = {
	event: DomainEvent;
	dispatch: EventDispatchSummary;
	notificationId: string | null;
};

/**
 * Publish `identity.org_role.assigned` and dispatch the IN_APP notification handler.
 * Call after `assignOrgRoleWithAudit` succeeds.
 */
export async function recordOrgRoleAssignedEvent(
	input: RecordOrgRoleAssignedEventInput,
): Promise<Result<RecordOrgRoleAssignedEventData>> {
	const published = await createEventPublisher().publish({
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

	const dispatch = await createEventDispatcher({
		handlers: {
			"identity.org_role.assigned": async (event) => {
				const parsed = identityOrgRoleAssignedPayloadSchema.safeParse(
					event.payload,
				);
				if (!parsed.success) {
					throw new Error(
						"identity.org_role.assigned payload missing required fields",
					);
				}

				const notification = await recordOrgRoleAssignedNotification({
					organizationId: event.organizationId,
					userId: parsed.data.recipientUserId,
					roleId: parsed.data.roleId,
					assignmentId: parsed.data.assignmentId,
					actorUserId: event.actorUserId,
					reactivated: parsed.data.reactivated,
				});

				if (!notification.ok) {
					throw new Error(notification.message);
				}
				notificationId = notification.data.id;
			},
		},
	}).dispatchPending({
		organizationId: input.organizationId,
	});

	if (!dispatch.ok) {
		return dispatch;
	}

	if (dispatch.data.failed > 0) {
		const failed = dispatch.data.events.find((row) => row.status === "failed");
		return fail(
			"INTERNAL_ERROR",
			failed?.lastError ?? "Domain event handler failed",
		);
	}

	const processed = dispatch.data.events.find(
		(row) => row.id === published.data.id && row.status === "processed",
	);

	return ok({
		event: processed ?? published.data,
		dispatch: dispatch.data,
		notificationId,
	});
}
