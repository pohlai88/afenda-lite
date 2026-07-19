/**
 * Identity adapter — org role assign → `@afenda/notifications` IN_APP inbox.
 */

import type { Result } from "@afenda/errors/result";
import {
	createNotificationRecorder,
	type Notification,
	type RecordNotificationCommand,
} from "@afenda/notifications";

export type RecordOrgRoleAssignedNotificationInput = {
	organizationId: string;
	/** Recipient — the member who received the role. */
	userId: string;
	roleId: string;
	assignmentId: string;
	actorUserId: string;
	reactivated: boolean;
};

const ROLE_ASSIGNED_NOTIFICATION = {
	type: "SUCCESS",
	priority: "MEDIUM",
	channel: "IN_APP",
	module: "identity",
	actionUrl: "/admin",
} as const satisfies Pick<
	RecordNotificationCommand,
	"type" | "priority" | "channel" | "module" | "actionUrl"
>;

/**
 * Record an in-app notification for the member who was assigned a role.
 * Call after `assignOrgRoleWithAudit` succeeds.
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

	return createNotificationRecorder().record({
		organizationId: input.organizationId,
		userId: input.userId,
		type: ROLE_ASSIGNED_NOTIFICATION.type,
		priority: ROLE_ASSIGNED_NOTIFICATION.priority,
		channel: ROLE_ASSIGNED_NOTIFICATION.channel,
		title,
		body,
		module: ROLE_ASSIGNED_NOTIFICATION.module,
		actionUrl: ROLE_ASSIGNED_NOTIFICATION.actionUrl,
		metadata: {
			roleId: input.roleId,
			assignmentId: input.assignmentId,
			actorUserId: input.actorUserId,
			reactivated: input.reactivated,
		},
	});
}
