"use server";

import {
	MEMBER_INVITE_AUDIT_ACTION,
	recordRbacAudit,
} from "@afenda/admin/audit";
import {
	buildJoinUrl,
	canInviteMember,
	inviteOrgMember,
	requireRole,
} from "@afenda/auth";
import { createCorrelationId } from "@afenda/http";
import { revalidatePath } from "next/cache";
import { forbidUnlessPermission } from "@/app/actions/permission-gate";
import { inviteOrgMemberCommandSchema } from "@/modules/identity/schemas/invite-org-member";
import { readRequestAttribution } from "@/modules/platform/domain/request-attribution";
import { logProductEvent } from "@/modules/platform/observability/product-log";
import {
	type ActionResult,
	actionFail,
	actionFailInternal,
	actionOk,
} from "@/modules/platform/schemas/action-result";
import { parseSchema } from "@/modules/platform/schemas/common";

export type InviteOrgMemberActionData = {
	email: string;
	auditId: string;
	/** Relative `/join?invitationId=…` when Neon returned an invitation id. */
	joinUrl: string | null;
};

/** `null` = form idle (`useActionState`); otherwise API-002 `ActionResult`. */
export type InviteOrgMemberActionState =
	ActionResult<InviteOrgMemberActionData> | null;

/**
 * Operator invite adapter — coarse `requireRole('operator')` +
 * `canInviteMember` + Tier-2 `clients.invite` via `hasPermission`.
 *
 * Neon Auth invite is cross-system (no shared DB transaction with
 * `platform_rbac_audit`). Durable privileged attribution is closed by writing
 * the org-scoped audit row **before** calling Neon — invite never runs without
 * actor·org·time·correlation on disk (ARCH-023 · GUIDE-018 I5.1 / I5.3).
 */
export async function inviteOrgMemberAction(
	_prev: InviteOrgMemberActionState,
	formData: FormData,
): Promise<InviteOrgMemberActionState> {
	const correlationId = createCorrelationId();
	const session = await requireRole("operator");

	const parsed = parseSchema(inviteOrgMemberCommandSchema, {
		email: formData.get("email"),
		role: formData.get("role"),
	});
	if (!parsed.success) {
		return actionFail(
			"VALIDATION_ERROR",
			"Enter a valid email and membership role.",
			parsed.details,
		);
	}

	if (!canInviteMember(session.role, parsed.data.role)) {
		return actionFail("FORBIDDEN", "You cannot invite that membership role.");
	}

	const permissionDenied = await forbidUnlessPermission(
		session,
		"clients.invite",
	);
	if (permissionDenied) {
		return permissionDenied;
	}

	let auditId: string;
	try {
		const attribution = await readRequestAttribution();
		const audit = await recordRbacAudit({
			orgId: session.orgId,
			action: MEMBER_INVITE_AUDIT_ACTION,
			actorUserId: session.userId,
			correlationId,
			targetType: "membership",
			targetId: parsed.data.email,
			newValue: {
				email: parsed.data.email,
				role: parsed.data.role,
				stage: "requested",
			},
			ipAddress: attribution.ipAddress,
			userAgent: attribution.userAgent,
		});
		if (!audit.ok) {
			throw new Error(audit.message);
		}
		auditId = audit.data.id;
	} catch {
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "inviteOrgMemberAction.audit",
			code: "INTERNAL_ERROR",
		});
		return actionFailInternal(
			"Invitation could not be audited. It was not sent. Try again or contact an admin.",
			correlationId,
		);
	}

	const invited = await inviteOrgMember({
		email: parsed.data.email,
		orgId: session.orgId,
		role: parsed.data.role,
	});
	if (!invited.ok) {
		logProductEvent({
			level: "error",
			event: "action.internal_error",
			correlationId,
			orgId: session.orgId,
			actorUserId: session.userId,
			path: "inviteOrgMemberAction",
			code: invited.code,
		});
		if (
			invited.code === "INTERNAL_ERROR" ||
			invited.code === "SERVICE_UNAVAILABLE"
		) {
			return actionFailInternal(
				"Invitation could not be sent. Try again or contact an admin.",
				correlationId,
			);
		}
		return actionFail(invited.code, invited.message, invited.details);
	}
	const invitationId = invited.data.invitationId;

	logProductEvent({
		level: "info",
		event: "member.invite",
		correlationId,
		orgId: session.orgId,
		actorUserId: session.userId,
		path: "inviteOrgMemberAction",
	});

	revalidatePath("/admin");

	return actionOk({
		email: parsed.data.email,
		auditId,
		joinUrl: invitationId ? buildJoinUrl({ invitationId }) : null,
	});
}
