/**
 * Identity adapter — org role assign → `@afenda/notifications` IN_APP inbox.
 */

import type { Result } from "@afenda/errors";
import { type Notification, notifications } from "@afenda/notifications";

export interface RecordOrgRoleAssignedNotificationInput {
	actorUserId: string;
	assignmentId: string;
	eventId: string;
	organizationId: string;
	reactivated: boolean;
	roleId: string;
	/** Recipient — the member who received the role. */
	userId: string;
}

const ROLE_ASSIGNED_NOTIFICATION = {
	type: notifications.vocabulary.type.success,
	priority: notifications.vocabulary.priority.medium,
	channel: notifications.vocabulary.channel.inApp,
	module: "identity",
	actionUrl: "/admin",
} as const;

/**
 * Record an in-app notification for the member who was assigned a role.
 * Invoked by the `identity.org_role.assigned` event handler
 * (`recordOrgRoleAssignedEvent`) — not from Server Actions directly.
 */
export async function recordOrgRoleAssignedNotification(
	input: RecordOrgRoleAssignedNotificationInput,
): Promise<Result<Notification>> {
	const title = input.reactivated
		? "Organization role reactivated"
		: "Organization role assigned";
	const body = input.reactivated
		? "An organization role assignment was reactivated for your account."
		: "You were assigned an organization role.";

	return await notifications.record({
		organizationId: input.organizationId,
		userId: input.userId,
		type: ROLE_ASSIGNED_NOTIFICATION.type,
		priority: ROLE_ASSIGNED_NOTIFICATION.priority,
		channel: ROLE_ASSIGNED_NOTIFICATION.channel,
		title,
		body,
		module: ROLE_ASSIGNED_NOTIFICATION.module,
		deduplicationKey: `event:${input.eventId}`,
		actionUrl: ROLE_ASSIGNED_NOTIFICATION.actionUrl,
		metadata: {
			roleId: input.roleId,
			assignmentId: input.assignmentId,
			actorUserId: input.actorUserId,
			reactivated: input.reactivated,
		},
	});
}
